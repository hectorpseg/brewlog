import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { getCoffee, listBrews, listCuppings, recordRecentView } from "@/lib/db/queries";
import { deleteCoffee, deleteCupping, updateCupping } from "@/app/actions";
import { CoffeeEditor } from "@/components/coffee-editor";
import { BackLink } from "@/components/back-link";
import { CuppingForm, type CuppingRow } from "@/components/cupping-editor";
import { CollectionAction, EntityDisclosure } from "@/components/entity-card";
import { DeleteButton } from "@/components/delete-button";
import { CopySummaryButton } from "@/components/copy-summary";
import { BrewHistoryRow } from "@/components/brew-history-row";
import { EmptyState } from "@/components/states";
import { formatCuppingSummary } from "@/lib/domain/cupping-summary";
import { pouredTotalG } from "@/lib/domain/brew-water";
import { coffeeDetailLine, coffeeMetaLine } from "@/lib/domain/coffee-meta";
import { describeDeletion } from "@/lib/domain/deletion";
import { formatBrewDate, formatReceived } from "@/lib/domain/brew-date";
import { getT, getLocale } from "@/lib/i18n/server";

export default async function CoffeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const locale = await getLocale();
  const user = await requireUser(`/coffees/${id}`);
  const coffee = await getCoffee(id).catch(() => null);
  if (!coffee) notFound();
  // independent reads, one round trip instead of two sequential ones
  const [brews, cuppings] = await Promise.all([
    listBrews(id).catch(() => []),
    listCuppings(id).catch(() => []),
    recordRecentView("coffee", id),
  ]);
  const noted = brews.filter((b: { observations?: unknown }) => {
    const o = b.observations;
    return Array.isArray(o) ? o.length > 0 : o != null;
  }).length;
  // Deletion copy comes from the canonical domain composer: zero-count
  // fragments never render, and the wording stays in the dictionaries.
  const del = describeDeletion("coffee", { brews: brews.length, observations: noted }, t);
  const remove = deleteCoffee.bind(null, id);
  const cuppingDel = {
    title: t("delete.cupping.title"),
    confirm: t("coffee.cuppings.delete"),
    body: t("delete.cupping.body"),
  };
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/coffees" label={t("nav.coffees")} />
        <h1 className="font-display text-2xl leading-snug text-ink">{coffee.name}</h1>
        <p className="tnum mt-1 text-xs text-ink2">
          {coffeeMetaLine(coffee, t)}
        </p>
        {coffeeDetailLine(coffee) ? (
          <p className="mt-0.5 text-[11px] text-ink3">
            {coffeeDetailLine(coffee)}
          </p>
        ) : null}
        <p className="tnum mt-0.5 text-[11px] text-ink3">
          ~{coffee.remaining_weight_g ?? "?"} g {t("coffee.remainingMany")} · {t("coffee.receivedPrefix")} {formatReceived(coffee.received_date, locale)}
        </p>
        <CoffeeEditor
          userId={user.id}
          coffee={coffee}
          brewAgainHref={brews.length > 0 ? `/brews/new?coffee=${id}&copy=1` : `/brews/new?coffee=${id}`}
        />
      </div>
      <div>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-lg">
            <span className="border-b border-line pb-1 font-display">{t("nav.brews")} ({brews.length})</span>
          </summary>
          {brews.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title={t("coffee.brews.emptyTitle")}
                body={t("coffee.brews.emptyBody")}
                actionHref={`/brews/new?coffee=${id}`}
                actionLabel={t("brews.empty.action")}
              />
            </div>
          ) : (
            <>
              <ul className="mt-2 flex flex-col gap-2">
                {brews.map((b: {
                  id: string; dose_g: number; water_g: number; temp_c: number | null;
                  grind_clicks: number | null; total_time_sec: number | null;
                  brewed_at: string | null; created_at: string; session_id: string | null;
                  session: { title: string } | null; observations: unknown;
                  pours?: { amount_g?: unknown }[] | null;
                }) => (
                  <li key={b.id}><BrewHistoryRow brew={{ ...b, poured_total_g: pouredTotalG(b.pours ?? null) }} /></li>
                ))}
              </ul>
              <div className="mt-3">
                <CollectionAction href={`/brews/new?coffee=${id}&copy=1`}>{t("brews.empty.action")}</CollectionAction>
              </div>
            </>
          )}
        </details>
      </div>
      <div>
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-lg">
            <span className="border-b border-line pb-1 font-display">{t("nav.cuppings")} ({cuppings.length})</span>
          </summary>
          <p className="mt-1 text-sm text-ink2">
            {t("coffee.taste.before")}{coffee.name}{t("coffee.taste.after")}
          </p>
          {cuppings.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title={t("coffee.cuppings.emptyTitle")}
                body={`${t("coffee.taste.before")}${coffee.name}${t("coffee.taste.afterShort")}`}
                actionHref={`/cuppings/new?coffee=${id}`}
                actionLabel={t("coffee.cuppings.add")}
              />
            </div>
          ) : (
            <>
              <ul className="mt-2 flex flex-col gap-2">
              {(cuppings as CuppingRow[]).map((c) => {
                const edit = updateCupping.bind(null, c.id, id);
                const removeCupping = deleteCupping.bind(null, c.id, id);
                return (
                  <li key={c.id}>
                    <EntityDisclosure
                      summary={
                        <>
                          <span className="font-medium">
                            {c.dose_g ?? "?"} g / {c.water_g ?? "?"} g
                          </span>
                          <span className="shrink-0 text-xs text-ink3">{formatBrewDate(c.cupped_at, locale)}</span>
                        </>
                      }
                    >
                      <CuppingForm action={edit} cupping={{ ...c, coffee_id: id }} submitLabel={t("coffee.cuppings.save")} idPrefix={`cup-${c.id}`} />
                      <CopySummaryButton
                        text={formatCuppingSummary({ cupping: c as Record<string, unknown>, coffeeName: coffee.name })}
                      />
                      <DeleteButton
                        label={t("coffee.cuppings.delete")}
                        title={cuppingDel.title}
                        body={cuppingDel.body}
                        confirmLabel={cuppingDel.confirm}
                        action={removeCupping}
                      />
                    </EntityDisclosure>
                  </li>
                );
              })}
              </ul>
              <div className="mt-3">
                <CollectionAction href={`/cuppings/new?coffee=${id}`}>{t("coffee.cuppings.add")}</CollectionAction>
              </div>
            </>
          )}
        </details>
      </div>
      <DeleteButton
        label={t("coffee.delete")}
        title={del.title}
        body={del.body}
        confirmLabel={del.confirm}
        action={remove}
      />
    </div>
  );
}
