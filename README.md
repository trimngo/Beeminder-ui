# Bee Today

A mobile-first, installable Beeminder focus dashboard for GitHub Pages. It supports keyword and three-state tag filtering, urgency sorting, offline caching, and optional direct Beeminder API connection.

The app icon is an SVG rather than a binary PNG, so the entire project can be reviewed and submitted through text-only patch systems.

The filter area lists every tag found in the commitments. Each tag cycles through neutral, required (green check), and excluded (red strike-through), and multiple tag states can be combined. Tag matching is exact and case-insensitive against either JSON metadata tags or unmigrated title hashtags. Keyword search remains available separately.

The **Safe days ≤** filter limits the list to commitments at or below a chosen safety buffer (use `0` for commitments due today). Sorting can put the quickest or longest configured commitments first by minutes per unit; commitments without a time estimate stay at the end in either direction.

Commitments with data entered today always appear in a separate **Done today** section at the bottom of the list. Their cards remain grayed out, while unfinished commitments stay together above them.

The **Stats** tab contains a horizontally scrollable workload chart spanning all available datapoint history and seven predicted days, with at least two historical weeks visible at once. Stacked bars total positive datapoint values multiplied by each commitment's configured minutes per unit and expose their per-commitment components when tapped. Each commitment has one stable color across every historical and predicted stack, and the selected-day detail repeats those colors beside the commitment names. Future stacks use the same road-aware workload projection as the List and Timeline. A labeled Y-axis occupies its own fixed gutter to the left of the scrolling plot instead of covering data, weekday labels and subtle shading identify weekends, and a red vertical line identifies today. Dotted overlays show the rolling seven-day mean and one standard deviation above and below it. Opening the tab scrolls to today; scroll left for older history or right for the forecast.

Each commitment starts with its Beeminder slug and description. Its status reports whether the API returned a datapoint dated today. The **+ Data** action accepts a numeric value and optional comment and records the datapoint directly in Beeminder; credentials and entry data are sent from the browser to Beeminder and are not routed through another server.

Description lines written as Markdown checklist items, such as `- [ ] Draft` or `- [x] Review`, appear as checkboxes directly on the commitment card. Their checked state is stored immediately on the current device and survives reloads or switching away from the app without changing the Beeminder description. Editing the checklist description resets all its saved checks, and a successful datapoint submission clears the checks for that commitment.

Commitments with configured minutes per unit have a calendar action that prepares a timed Google Calendar event. The goal slug becomes the event title, while the full visible commitment description is placed in the event description. Choose its date, start time, and duration in Bee Today, then review and save it in Google Calendar. This uses a normal event-template link: Bee Today receives no calendar access and cannot read, update, confirm, or delete calendar events.

Calendar scheduling assumes working hours from 8:00 AM through 9:00 PM in the Beeminder account’s timezone. During working hours, the dialog proposes the next quarter-hour. Before 8:00 AM it proposes 8:00 AM that day, and when the next available time would be 9:00 PM or later it proposes 8:00 AM the following day.

The compact today-status pill on a commitment card is also its data-history control. Tapping it opens a scrollable, newest-first list of every loaded datapoint with its date, value, and comment, without adding another permanent control or taking space away from the card list.

The app loads goals and recent datapoints through Beeminder’s user-associations response. A goal counts as done today when a returned datapoint’s `daystamp` matches today in the Beeminder account’s timezone, rather than the browser’s timezone.

Production deployments never fall back to sample commitments: signed-out users see a Beeminder sign-in prompt. Sample data is available only when the app is served from `localhost` or `127.0.0.1` for local UI testing.

The Timeline tab shows every commitment as a compact column and days as vertical rows. It plots historical datapoints and the next estimated deadline from each goal’s safety buffer; its rotated commitment header remains frozen while the day rows scroll.

The look-ahead control expands future rows to 7, 14, 30, or 60 days and remembers the selection. Historical green squares are buttons: tapping one opens the entry value and its Beeminder note, including multiple entries on the same day.

Future markers repeat through the whole selected range. The projection starts at the current safety buffer, estimates a typical action from the median positive datapoint value in the last 30 days, and distributes those actions according to the goal’s fractional target rate without rounding every interval down. If there is no recent history, `quantum` is used only as a fallback. Flat-road and negative-rate goals show only their current safety deadline because recurring do-less projections require a different model. These dates remain estimates: road changes, ratchets, weekends, and unusual entry values can change the real deadlines. Derail datapoints are rendered as red × buttons and retain their value/note details.

Authentication is shared by the entire app. When signed out, both tabs stay available but neither mode renders commitments; a single universal sign-in panel opens the connection dialog. Local sample fixtures are always marked with a prominent test-data banner.

Goal cards render Beeminder’s `title` as a multiline description and combine derail count, configured minutes per unit, and safety information into one compact summary row. Fine print is kept off the card and is available through the edit dialog. Connected users can edit and save the title through a multiline description editor and Beeminder’s documented goal-update endpoint. The API reference does not list `fineprint` as an update parameter, so the app intentionally presents it as read-only rather than risking a misleading local-only edit.

The top of the List view shows the estimated time needed to keep currently due commitments safe today. It multiplies each due, unfinished commitment's configured minutes per unit by its daily target when that target exceeds one unit (otherwise one unit); due commitments without a time setting are called out below the total. A compact row above the three summary columns counts down to the 9 PM end of the workday in the connected Beeminder timezone and reports how much time remains beyond (or short of) today’s minimum workload. Its compact 8 AM–9 PM timeline keeps the numeric countdown inside the graph and uses short quarter-hour ticks, longer hourly ticks, a noon label, and a moving red current-time line. Today's minimum workload is stacked against 9 PM in stable per-commitment colors; the two-hour threshold begins a yellow zone, the final extra hour is red, and the required-work interval is dark red. The adjacent lifetime penalty total counts recorded derailments at the app's fixed $5-per-derail estimate.

The same summary bar shows the estimated workload for the commitments currently displayed by the list filters. It totals one daily work block for each visible commitment, including multiple units for targets above one unit per day, and calls out visible commitments that do not yet have a time estimate. For example, setting **Safe days ≤** to `3` shows the estimated work represented by commitments within that safety buffer.

Directly below the summary, a seven-column forecast shows predicted commitment workload from today through the following six days. It downloads Beeminder's `fullroad` commitment path and simulates completing one daily work block on each day where the commitment would otherwise cross that path. This means a goal due today can gain multiple safe days from today's predicted work block instead of automatically being repeated tomorrow. Each day shows both total estimated time and commitment count, since a day with fewer long commitments can have more workload than a day with more short commitments. Select multiple days to show the union of their commitments. Selecting today also retains commitments already completed today as grayed-out cards, even when **Hide done today** is enabled, so planned and completed work can be reviewed together. The List forecast, its day filter, and the Timeline use the same projection.

After a datapoint is accepted, the card is immediately marked complete and displays **Updating safety…** while Bee Today reloads that specific commitment from Beeminder. The refreshed safety-day count then updates the card and future forecast without briefly presenting the cached safety count as current.

Tap any of the three summary totals to open Apple-storage-style segmented bar charts for today’s safety workload, the currently filtered workload, and lifetime penalties. Each segment represents one contributing commitment; tapping a segment or its labeled key shows that commitment’s percentage and amount.

The goal editor also stores optional minutes-per-unit and editable tags in a compact JSON object at the beginning of the Beeminder title, for example `{"m":30,"t":["health"]} Strength training`. Empty properties are omitted, and no prefix is stored when both fields are empty. The parser still accepts the previous `minutes` and `tags` keys, which are rewritten compactly the next time that goal is saved. The JSON is hidden from descriptions in this app. Existing goals are not rewritten in bulk: their time field starts blank, hashtags in the existing title are moved into the initial Tags field, and metadata is added only when that goal is explicitly saved. Fine print is never parsed for tags.

Connected data refreshes automatically on launch, whenever the app returns to the foreground, after a restored page or network reconnection, and every five minutes while the app is visible. API requests bypass browser caches; when a refresh cannot complete, the status explicitly says that saved data is being shown instead of silently presenting it as current.

The compact **Export** button in the Commitments heading opens accountability sharing options. The daily export begins with **Today’s wins**, lists every completed commitment, omits placeholder text for entries without comments, and turns every nonempty line of a multiline comment into its own bullet. The other option copies a numbered list of every commitment with its slug, tag-free description, and target rate normalized to a weekly or multi-week cadence. Keeping the action in the heading preserves vertical space for the goal list.

Each cumulative goal shows its average recorded value per calendar day over the 14-day window ending today, including zero-entry days, as a percentage-of-target progress bar. The exact actual and target daily rates remain beside the percentage. **Lowest compliance** and **Highest compliance** sort by that percentage so differently scaled commitments can be compared fairly. Non-cumulative readings and zero or missing targets are labeled unavailable rather than showing a misleading calculation; negative targets use the inverse comparison direction.

Cards also count explicit `#DERAIL` datapoints across the goal's full history. The paid total assumes a fixed, capped cost of $5 for every derail, so three derails are displayed as `$15 paid`.

JavaScript and CSS URLs are versioned together with the service-worker cache. This prevents an installed copy from combining new HTML with an older, incompatible script after a deployment.

The footer displays the running version and checks `version.json` without using the browser cache. It reports whether the app is current, offline, or ready to reload into a newer deployment.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. On iOS, deploy to GitHub Pages, open in Safari, and choose **Share → Add to Home Screen**.

## Deploy

Enable GitHub Pages for the repository branch and root directory. All paths are relative, so project pages and custom domains are supported.
