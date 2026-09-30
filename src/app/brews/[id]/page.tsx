import Link from "next/link";
import { GitCompare, Plus, Share2 } from "lucide-react";
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
import { SectionNav } from "@/components/section-nav";
import { formatRatio } from "@/lib/domain/ratio";
import { formatDuration } from "@/lib/domain/brew-time";
import { formatBrewDate } from "@/lib/domain/brew-date";
import { brewFinalScore, formatBrewScore } from "@/lib/domain/brew-score";
import { eyPercent, pouredTotalG, actualWaterG, retainedG } from "@/lib/domain/brew-water";
import { formatBrewSummary } from "@/lib/domain/brew-summary";
import { toShareCardData } from "@/lib/domain/share-card";
import { brewLifecycle, brewWarningKeys, BREW_LIFECYCLE_KEY } from "@/lib/domain/brew-status";
import { describeDeletion } from "@/lib/domain/deletion";
import { getT, getLocale } from "@/lib/i18n/server";

export default async function BrewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const locale = await getLocale();
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
  const warnings = brewWarningKeys(brew).map((k) => t(k));
  // Deletion copy comes from the canonical domain composer: zero-count
  // fragments never render, and the wording stays in the dictionaries.
  const del = describeDeletion("brew", {
    observations: obs ? 1 : 0,
    tastings: tastings.length,
    pours: pours.length,
  }, t);
  const remove = deleteBrew.bind(null, id);
  const isFavorite = brew.is_favorite === true;
  const favorite = toggleFavorite.bind(null, id, !isFavorite);
  // Same derived score as the list and Best Rated sort: one function, used
  // with the persisted tasting rows (never observation text).
  const score = brewFinalScore(tastings);
  // Extraction metrics reuse the one domain module; missing inputs hide values.
  const poursFacts = pours as { sequence?: unknown; amount_g?: unknown; timing_seconds?: unknown; bloom?: unknown; pattern?: unknown; note?: unknown }[];
  const ey = eyPercent(brew as Record<string, unknown>);
  const retained = retainedG(brew as Record<string, unknown>, poursFacts);
  // ratio reflects actual brew water; planned water stays explicit when pours differ
  const poured = pouredTotalG(poursFacts);
  const actualWater = actualWaterG(brew.water_g, poured);
  const waterDiffers = poured != null && Number(brew.water_g) !== poured;
  // Privacy-safe share snapshot (S8): recipe/result fields only, never notes,
  // observations, tastings detail, sessions, or IDs.
  const shareCard = toShareCardData({
    brew: brew as Record<string, unknown>,
    coffeeName: typeof coffeeName === "string" ? coffeeName : null,
    score,
    pours: poursFacts,
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
        <BackLink href="/brews" label={t("nav.brews")} />
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-2xl leading-snug text-ink">
            {typeof brew.coffee_id === "string" && typeof coffeeName === "string" ? (
              <Link href={`/coffees/${brew.coffee_id}`} className="text-ember no-underline hover:underline focus-visible:underline underline-offset-4">
                {coffeeName}
              </Link>
            ) : (
              coffeeName ?? t("brew.titleFallback")
            )}
          </h1>
          <FavoriteButton isFavorite={isFavorite} toggle={favorite} />
        </div>
        <p className="tnum mt-1 text-xs text-ink2">
          {formatBrewDate(brew.brewed_at ?? brew.created_at, locale)} · {brew.dose_g ?? "?"} g → {actualWater ?? "?"} g
          {waterDiffers ? ` · ${Number(brew.water_g)}${t("brew.pouredLine.suffix")}` : ""}
          {" · "}{formatRatio(Number(brew.dose_g), actualWater ?? NaN)}
        </p>
        <p className="tnum text-[11px] text-ink3">
          {brew.temp_c != null ? `${t("brew.start")} ${brew.temp_c}°C` : "?"} · {brew.grind_clicks ?? "?"} {t("brew.clicks")}
          {brew.filter ? ` · ${brew.filter}` : ""}
          {formatDuration(brew.total_time_sec) ? ` · ${formatDuration(brew.total_time_sec)}` : ""}
          {brew.final_beverage_g ? ` · → ${brew.final_beverage_g} g` : ""}
          {brew.tds_percent != null ? ` · ${t("brew.field.tds")} ${brew.tds_percent}` : ""}
          {ey != null ? ` · ${t("brew.field.ey")} ${ey}` : ""}
          {retained != null ? ` · ${t("brew.field.retention")} ${retained}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink2">
          <span>{t(BREW_LIFECYCLE_KEY[status])}</span>
          {score !== null ? (
            <span className="tnum shrink-0">· {formatBrewScore(score)}</span>
          ) : null}
          {warnings.length > 0 ? (
            <span className="min-w-0 text-ink3 line-clamp-1">· {warnings.join(" · ")}</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-ink2">
          {brewSession ? (
            <>
              {t("brew.session")} ·{" "}
              <Link href={`/sessions/${brewSession.id}`} className="font-medium text-ember underline underline-offset-4 hover:no-underline">
                {brewSession.title}
              </Link>
            </>
          ) : (
            t("brew.warning.noSession")
          )}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <CopySummaryButton text={summary} />
        </div>
      </div>
      <div>
        <SectionNav items={[
          { id: "sec-recipe", label: t("brew.section.recipe") },
          { id: "sec-equipment", label: t("brew.section.equipment") },
          { id: "sec-pours", label: t("brew.section.pours") },
          { id: "sec-expected", label: t("brew.section.expected") },
          { id: "sec-result", label: t("brew.section.result") },
          { id: "sec-tasting", label: t("brew.section.tasting") },
        ]} />
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
      <div className="flex flex-col gap-1.5">
        <Link
          href={`/brews/new?brew=${id}&copy=1`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-ember px-4 py-2 text-sm font-medium text-white transition-transform duration-150 active:scale-[0.95]"
        >
          <Plus size={16} aria-hidden /> {t("brew.action.newFromThis")}
        </Link>
        <Link
          href={`/brews/compare?a=${brew.id}`}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-line bg-card px-4 py-2 text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
        >
          <GitCompare size={16} aria-hidden /> {t("brew.compare")}
        </Link>
        <details className="rounded-[10px] border border-line bg-card">
          <summary className="flex min-h-11 cursor-pointer items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-transform duration-150 active:scale-[0.98]">
            <Share2 size={16} aria-hidden /> {t("brew.share")}
          </summary>
          <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
            <ShareCardPreview card={shareCard} />
            <ShareCardButtons card={shareCard} />
          </div>
        </details>
      </div>
      <DeleteButton
        label={t("brew.delete.label")}
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
      <BackToTop />
    </div>
  );
}
