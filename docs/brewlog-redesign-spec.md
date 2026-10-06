No code changed. Implement this inside the current shell. Do not add a design system, a motion library, or a second component set.
Overrides. This is a phone journal, not a marketing page. Ignore the taste skill's variance-8 layouts, Framer Motion, Phosphor migration, glass, bento, and looping motion. Keep Lucide, max-w-md, min-h-dvh, 44px targets, and the existing 150ms active:scale. Fraunces stays, but only for coffee names and the ratio. Headings stay text-2xl.
Primitives
Change tokens in globals.css. Do not add a theme file.
--color-paper / --color-card / --color-ink / --color-ink2 / --color-ink3 / --color-line / --color-ember
/* drop --color-info-soft and any green-700 */
--font-display: Fraunces
--font-text: "Source Sans 3", system-ui, sans-serif  /* next/font, 400 and 600, latin */
--radius: 10px          /* fields, rows, buttons */
/* pills stay rounded-full */
--dur: 150ms
- Surface. Paper is the page. A bordered card is only a tappable row or a writable group. Sections are separated by space and a top rule, not a card.
- Type. Name and ratio: Fraunces. Everything else: text face. Grams, time, ratio: .tnum. Three ink levels only.
- Accent. Ember is Log, the active pill, focus, favorite, and field error. Nowhere else. Saved is ink text, not a new color. Error is ember text plus Retry.
- Stage. One <details> pattern in section-nav.tsx, used by both brew forms. Summary is the section name plus one fact line. Closed by default except the working section. Empty sections still show the summary. Do not render an open blank form.
- Measure. One line: 18 g → 300 g · 1:16.7. Ratio, when it is the hero, is text-3xl Fraunces. Do not go larger.
- Action. Reuse Button and CollectionAction. Label every action except Plus, Close, and Search. min-h-11. Primary is filled ember. Secondary is a line button or a text button. Never icon-only Copy or Brew-again.
- States. Reuse EmptyState, ErrorState, and the existing skeletons. First-use empty and no-matches stay different. A failed refresh keeps the last rows and shows ErrorState. Do not swap a populated list for a skeleton.
Bottom navigation
Problem. Five peers in one bar. Log reads as another tab.
Moment. Thumb reach, any authenticated screen, often one-handed.
Hierarchy. Log is the action. The other four are places.
Visible. Brews, Coffees, Cuppings, Log, More. Current tab is aria-current, ink, semibold.
Hidden. Nothing. Sessions, Compare, and Account stay under More.
Primary. Log → /brews/new. Ember, labeled with the existing string, min-h-11.
Secondary. The four links. No extra header Log on /brews.
Mobile. Stay in the bar. Do not add a FAB. Give Log mx-1 so it is not flush against Cuppings. Safe-area padding stays. Do not cover it with a second fixed bar.
States. Hidden on public paths, as now. Pending navigation does not disable the bar.
Reuse. bottom-nav.tsx, PRIMARY_TABS. No new destinations.
List chrome
Applies to brews, coffees, cuppings, and sessions. Change list-controls.tsx only.
Visible. Search field. Placeholder is the hint. The visible uppercase label becomes sr-only.
Collapsed. Sort and filters inside one closed disclosure, summary Filter, plus a count when any filter or non-default sort is on. Active pills stay optimistic and URL-backed.
Behavior. While isPending, dim the current rows (opacity-60, aria-busy). Do not mount the skeleton over existing rows. Skeleton is only for a list that has never rendered.
Reuse. ListSearchBox, ListSortPills, BrewFilterBar, FilterChips, NoListMatches, listHref. Do not change param names.
List cards
Problem. Four cramped lines plus a footer rule. Icon-only actions.
Moment. Scan yesterday's brew or pick a coffee with wet hands.
Hierarchy. Name, then the measure, then one meta line.
Visible. Brew: coffee name, date, dose → water · ratio, then temp, grind, filter, lifecycle, score if finite. Coffee: name, remaining grams, received date. Cupping: coffee name, dose/water, date. Chevron means open.
Hidden. Warnings beyond one truncated clause. Session title. Notes.
Primary. The row opens the record. Stretched link stays. Actions sit at z-10.
Secondary. Brew: labeled Favorite and Continue, on the name row, not a footer. Coffee: labeled Brew again, min-h-11. Cupping: none.
Mobile. One column, gap-2, px-3 py-2, rounded-[10px] border border-line bg-card, active:scale-[0.99]. No hover-only control.
States. Pending row dims. Favorite pending disables the heart only.
Reuse. BrewCard, CoffeeCard, CuppingCard. Do not fold them into one generic card.
/brews
Problem. Search, sort, filters, and recently viewed push the first brew below the fold. Compare is a stray link at the bottom.
Moment. Open the journal and either continue or find a brew.
Hierarchy. Title, optional last-brew continue, search, list.
Visible. Title Brews. If sort is newest and a row exists, a secondary Continue to /brews/new?brew={id}&copy=1. Search. Then cards. Recently viewed is one horizontal line under the title, only when non-empty.
Collapsed. Filter disclosure. Compare is a text button in the header when rows.length >= 2, linking to the existing ?a=&b= of the first two rows. No selection mode.
Primary. The bar's Log. Do not add another ember Log here.
Secondary. Continue, Compare, Favorite.
Mobile. First card must start within the initial viewport when there is no recently-viewed strip. pb-24 stays so the bar does not cover the last row.
States. First use: existing EmptyState plus Log. No matches: NoListMatches, echo the query, clear filters. Unreachable: ErrorState, retry reloads the same URL. Show more stays a line button. Do not blank rows on filter change.
Reuse. brews/page.tsx, RecentlyViewed, BrewList.
/brews/new
Problem. Continue is a card, then the entire sheet is open. Title is hardcoded English. Local draft has no visible recovery cue.
Moment. Kettle is on. Set the variable and start.
Hierarchy. Continue, if offered. Then coffee, dose, water, ratio. Then grind, temp, time.
Visible. Translated title. If latestBrew exists and this is not already a copy: one text line Last brew · {name} · {ratio} and a primary Continue. The fresh form remains underneath, so starting over is scrolling, not a second equal button. Open stage: Recipe. Fields: coffee, selected-beans switch, dose, water, grind, temp, brew time, date. Ratio hero updates once both numbers parse. Session select stays in Recipe when sessions exist. Save at the end.
Collapsed. Equipment, Pours, Expected, Result, Tasting. Summaries: No equipment, No pours, No expectation, No result, Not tasted, or the copied fact if this is a copy. Copy tint (bg-paper until dirty) stays.
Primary. Save, labeled, enabled while submitting only as busy. Continue is primary only on the teaser, not inside the form.
Secondary. Section nav jumps. It does not open every section.
Mobile. One column. Dose and water stay a two-column pair. Date and time stay full width. No fixed save bar.
States. Over-remaining warning stays inline under the ratio. Field errors on blur and submit, first invalid focused. Submit failure stays inline, form values kept. Reload within 4 hours restores the local draft. Show one line Draft restored when onRestored fires. No save badge, because there is no server row. No coffees: coffee select empty state links to /coffees/new. Do not invent a coffee.
Reuse. BrewForm, formInitKey, PourEditor, TastingEditor. Do not merge this file with BrewEditor.
/brews/id
Problem. Opening a brew opens the editor. The page header and the recipe inputs repeat the same numbers.
Moment. Recall the recipe, then taste. Edit is the exception.
Hierarchy. Entry header is the record. Stages are the rest. Tasting is the work when the brew is already brewed.
Visible. Back. Coffee name, linked. Date and measure line. Ratio at text-3xl. One meta line: temp, grind, filter, time, yield, TDS, EY, retention — omit any missing value, never print ? in the header. Lifecycle. Score only if brewFinalScore returns a number. Session link or the existing no-session warning. SaveStateBadge on the right of the sticky section nav.
Collapsed. All stages when lifecycle is tasted. Recipe open when in-progress. Tasting open when brewed. Other summaries show the fact, not a blank. Equipment and pours never default open.
Primary. New from this, ember, under the stages. Not in the header.
Secondary. Compare, Share disclosure, Copy summary, Favorite, Delete at the bottom. Delete stays visually separate from New from this.
Mobile. Header is text, not inputs. Section nav stays sticky and short. Badge shares that row. It must not become a second bottom bar. Keyboard must not cover a fixed save control, because save is autosave.
States. Missing brew: notFound, as now. Autosave: editing, saving, saved, local-draft, error-with-retry. Error persists. Saved does not toast. Partial pour or tasting load: show the editor, do not drop the brew. Share failure stays inside the share disclosure.
Reuse. BrewEditor, SectionNav, SaveStateBadge, DeleteButton, ShareCardPreview. Header math stays in the page, using the existing domain helpers.
Brew sections
Same rules in brew-form.tsx and brew-editor.tsx.
Stage	Summary when closed	Open by default	Inside
Recipe	18 g → 300 g · 1:16.7	New brew, and detail if in-progress	Coffee, dose, water, grind, temp, time, date, session
Equipment	Grinder · dripper · filter, or No equipment	Never	Existing fields. No new equipment entity
Pours	{n} pours · {poured} g, or No pours	Never	PourEditor
Result	Yield and TDS if present, else No result	Never	Final beverage, TDS, derived EY and retention, brew notes
Tasting	Tasted or Not tasted	Detail if brewed	Expected textarea first, then disclaimer as plain ink2 text, then TastingEditor
- Remove the standalone Expected card. Keep id="sec-expected" on that textarea so old hashes still land.
- Section nav items: Recipe, Equipment, Pours, Result, Tasting. Drop Expected as its own tab.
- Expected and tasted notes stay separate fields. Do not merge them into one string.
- Required marks stay on coffee, dose, and water for create only.
- Tasting stages stay Hot, Warm, Cold. Do not show three open forms when a stage has no rows. The existing empty line is enough. Add attribute stays a labeled control.
Coffee list
Problem. Same chrome stack as brews, plus a competing ember Add.
Moment. Pick beans or add a bag.
Visible. Title, Add, search, cards.
Collapsed. Sort inside the shared Filter disclosure. Two sorts only: recent, name.
Primary. Add → /coffees/new, header, ember. The bar has no coffee action.
Secondary. Brew again on the card.
Mobile. Add is min-h-11 and does not wrap the title. If the title and button collide, the button keeps its label and the title truncates.
States. First use: EmptyState. No matches: NoListMatches. Unreachable: ErrorState with retry. Dev seed card stays behind ALLOW_DEV_SEED and is not restyled into a feature.
Reuse. coffees/page.tsx, CoffeeList, CollectionAction.
Coffee detail
Problem. The editor is open and the brew history is shut. The thing you came for is hidden.
Moment. See what this coffee is and what you have brewed.
Hierarchy. Name and stock, then brew history, then cuppings. Edit is last.
Visible. Back. Name. Origin, process, remaining, received — one or two meta lines, unknown stays unknown. Brew again. Brew list, open.
Collapsed. Cuppings disclosure, closed unless that is the only content. Edit coffee, closed, containing CoffeeEditor. Delete inside that disclosure, not beside Brew again.
Primary. Brew again. Existing href: copy latest if brews exist, otherwise new with ?coffee=.
Secondary. Add cupping. Open a brew row. Delete.
Mobile. History rows use BrewHistoryRow, not a second card style. No new metrics.
States. No brews: EmptyState inside the open history, action logs this coffee. No cuppings: short empty line inside the disclosure, plus Add cupping. Failed brew list: ErrorState for that block only. The coffee header still renders.
Reuse. CoffeeEditor, EntityDisclosure, BrewHistoryRow, DeleteButton.
Cuppings
Problem. Same list chrome. Otherwise fine.
Moment. Find a cupping or start one. Occasional, which is why it stays a tab and not the bar's action.
Visible. Title, Add, search, cards.
Collapsed. Sort in the shared Filter disclosure.
Primary. Add → /cuppings/new.
Secondary. None on the card. Detail keeps its current editor. Do not restyle the cupping form in this pass.
Mobile. Same row rules as coffee cards.
States. First use, no matches, and unreachable follow the list rules above. A cupping with no coffee name uses the existing fallback string.
Reuse. CuppingCard, CuppingList, CollectionAction.
More
Problem. Three cards for three links. Reads as a menu wearing list chrome.
Moment. Leave the mid-brew loop for sessions, compare, or account.
Visible. Title. Three rows: Sessions, Compare, Account. Icon, label, one-line body. Whole row is the link.
Collapsed. Nothing.
Primary. None. This page has no create action.
Secondary. Each row is the action.
Mobile. divide-y border-line, no card per row, min-h-11, active:scale-[0.99].
States. No empty state. Auth redirect stays.
Reuse. MORE_LINKS. Sessions and compare pages are not redesigned here. When they are touched later, they use this list chrome and these type rules. Compare's hardcoded "Need two brews" becomes ErrorState through the dictionaries.
Do not build
A wizard. A home dashboard. Compare multi-select. A shared mega-form for create and edit. New entities. Dark mode. A wider desktop layout. New icon set. Perpetual animation. A fixed save bar.
Order. Tokens and the tasting-disclaimer color. Stage rules in both brew forms. Detail header and new-brew density. List chrome and cards. Coffee-detail disclosure flip. Nav spacing. Dictionary strings for the new-brew title, draft-restored line, and compare empty state.