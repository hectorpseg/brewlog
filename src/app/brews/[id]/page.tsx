import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getBrew, listSessionOptions, listTastings, listPours, recordRecentView } from "@/lib/db/queries";
import { deleteBrew, toggleFavorite } from "@/app/actions";
import { BrewEditor } from "@/components/brew-editor";
import { BackLink } from "@/components/back-link";
import { BackToTop } from "@/components/back-to-top";
import { CopySummaryButton } from "@/components/copy-summary";
import { DeleteButton } from "@/components/delete-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareCardButtons, ShareCardPreview } from "@/components/share-card";
import { SectionHeader } from "@/components/ui/controls";
import { SectionNav } from "@/components/section-nav";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { brewFinalScore, formatBrewScore } from "@/lib/domain/brew-score";
import { formatBrewSummary } from "@/lib/domain/brew-summary";
import { toShareCardData } from "@/lib/domain/share-card";
import { brewLifecycle, brewWarnings, BREW_LIFECYCLE_LABEL } from "@/lib/domain/brew-status";
import { describeDeletion } from "@/lib/domain/deletion";

export default async function BrewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/brews/${id}`);
  const brew = await getBrew(id).catch(() => null);
  if (!brew) notFound();
  // independent reads, one round trip instead of sequential ones
  const [sessions, tastings, pours] = await Promise.all([
    listSessionOptions().catch(() => []),
    listTastings(id).catch(() => []),
    listPours(id).catch(() => []),
    recordRecentView("brew", id),
  ]);
  const obs = Array.isArray(brew.observations) ? brew.observations[0] ?? null : brew.observations ?? null;
  const coffeeName = Array.isArray(brew.coffees) ? brew.coffees[0]?.name : brew.coffees?.name;
  const brewSession = Array.isArray(brew.sessions) ? brew.sessions[0] : brew.sessions;
  const status = brewLifecycle(brew, obs);
  const warnings = brewWarnings(brew);
  const del = describeDeletion("brew", {
    observations: obs ? 1 : 0,
    tastings: tastings.length,
    pours: pours.length,
  });
  const remove = deleteBrew.bind(null, id);
  const isFavorite = brew.is_favorite === true;
  const favorite = toggleFavorite.bind(null, id, !isFavorite);
  // Same derived score as the list and Best Rated sort: one function, used
  // with the persisted tasting rows (never observation text).
  const score = brewFinalScore(tastings);
  // Privacy-safe share snapshot (S8): recipe/result fields only, never notes,
  // observations, tastings detail, sessions, or IDs.
  const shareCard = toShareCardData({
    brew: brew as Record<string, unknown>,
    coffeeName: typeof coffeeName === "string" ? coffeeName : null,
    score,
  });
  const summary = formatBrewSummary({
    brew: brew as Record<string, unknown>,
    coffeeName: typeof coffeeName === "string" ? coffeeName : null,
    sessionTitle: brewSession && typeof brewSession === "object" && "title" in brewSession
      ? String((brewSession as { title: unknown }).title)
      : null,
    observation: obs as Record<string, unknown> | null,
    tastings: tastings as { stage: unknown; attribute: unknown; value: unknown }[],
    pours: pours as { sequence?: unknown; amount_g?: unknown; timing_seconds?: unknown; bloom?: unknown; pattern?: unknown; note?: unknown }[],
  });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/brews" label="Brews" />
        <h1 className="tnum font-display text-3xl leading-none">
          {typeof brew.coffee_id === "string" && typeof coffeeName === "string" ? (
            <Link href={`/coffees/${brew.coffee_id}`} className="font-medium text-ember underline">
              {coffeeName}
            </Link>
          ) : (
            coffeeName ?? "Brew"
          )}
        </h1>
        <p className="mt-1 text-sm text-ink2">
          Brewed {formatBrewDate(brew.brewed_at ?? brew.created_at)} · {brew.dose_g} g / {brew.water_g} g · ratio {formatRatio(Number(brew.dose_g), Number(brew.water_g))} · {brew.temp_c ?? "?"}°C · {brew.grind_clicks ?? "?"} clicks
          {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
          {brew.final_beverage_g ? ` · → ${brew.final_beverage_g} g` : ""}
        </p>
        <p className="mt-2 text-sm text-ink2">
          {BREW_LIFECYCLE_LABEL[status]}
          {warnings.length > 0 ? ` · ${warnings.join(" · ")}` : ""}
          {score !== null ? (
            <span className="ml-1 inline-flex min-h-7 items-center rounded-full bg-ink px-2.5 text-sm font-medium text-white">{formatBrewScore(score)}</span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-ink2">
          Session ·{" "}
          {brewSession ? (
            <Link href={`/sessions/${brewSession.id}`} className="font-medium text-ember underline">
              {brewSession.title}
            </Link>
          ) : (
            "None"
          )}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <CopySummaryButton text={summary} />
          <FavoriteButton brewId={id} isFavorite={isFavorite} toggle={favorite} />
        </div>
      </div>
      <div>
        <SectionNav items={[
          { id: "sec-recipe", label: "Recipe" },
          { id: "sec-equipment", label: "Equipment" },
          { id: "sec-pours", label: "Pours" },
          { id: "sec-expected", label: "Expected" },
          { id: "sec-result", label: "Result" },
          { id: "sec-tasting", label: "Tasting" },
        ]} />
        <SectionHeader>Recipe</SectionHeader>
        <div className="mt-2">
          <BrewEditor
            userId={user.id}
            brew={brew}
            observation={obs}
            tastings={tastings}
            pours={pours}
            sessions={sessions.map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }))}
          />
        </div>
      </div>
      <Link
        href={`/brews/new?coffee=${brew.coffee_id}&copy=1`}
        className="min-h-11 rounded-[10px] bg-ember px-4 py-2 text-center font-medium text-white"
      >
        New from this
      </Link>
      <Link
        href={`/brews/compare?a=${brew.id}`}
        className="min-h-11 rounded-[10px] border border-line bg-card px-4 py-2 text-center font-medium"
      >
        Compare this brew
      </Link>
      <div>
        <SectionHeader>Share</SectionHeader>
        <details className="mt-2 rounded-[10px] border border-line bg-card px-3 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center py-2 font-medium">
            Share this brew
          </summary>
          <div className="flex flex-col gap-3 pb-2">
            <ShareCardPreview card={shareCard} />
            <ShareCardButtons card={shareCard} />
          </div>
        </details>
      </div>
      <DeleteButton
        label="Delete brew"
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
      <BackToTop />
    </div>
  );
}
