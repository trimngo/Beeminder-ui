# Bee Today

A mobile-first, installable Beeminder focus dashboard for GitHub Pages. It supports keyword/tag filtering, saved views, hiding goals completed today, urgency sorting, offline caching, and optional direct Beeminder API connection.

The app icon is an SVG rather than a binary PNG, so the entire project can be reviewed and submitted through text-only patch systems.

Filters support multiple required terms and exclusions. For example, `#work -#red -done:today` shows work-tagged commitments while excluding red-tagged commitments and anything completed today. Tap a visible hashtag to add it to the current filter, then save the view for later.

Each commitment starts with its Beeminder slug and description. Its read-only status reports whether the API returned a datapoint dated today; it is not a checkbox and cannot create or modify Beeminder data.

The app loads goals and recent datapoints through Beeminder’s user-associations response. A goal counts as done today when a returned datapoint’s `daystamp` matches today in the Beeminder account’s timezone, rather than the browser’s timezone.

Production deployments never fall back to sample commitments: signed-out users see a Beeminder sign-in prompt. Sample data is available only when the app is served from `localhost` or `127.0.0.1` for local UI testing.

The Timeline tab shows every commitment as a compact column and days as vertical rows. It plots historical datapoints and the next estimated deadline from each goal’s safety buffer; its rotated commitment header remains frozen while the day rows scroll.

The look-ahead control expands future rows to 7, 14, 30, or 60 days and remembers the selection. Historical green squares are buttons: tapping one opens the entry value and its Beeminder note, including multiple entries on the same day.

Future markers repeat through the whole selected range. The projection starts at the current safety buffer, then assumes one `quantum` of data is entered on each deadline and derives the conservative repeat cadence from the goal’s `rate` and `runits`. Derail datapoints are rendered as red × buttons and retain their value/note details.

Authentication is shared by the entire app. When signed out, both tabs stay available but neither mode renders commitments; a single universal sign-in panel opens the connection dialog. Local sample fixtures are always marked with a prominent test-data banner.

Goal cards render Beeminder’s `title` as the description and `fineprint` separately, preserving fine-print line breaks. Connected users can edit and save `title` through Beeminder’s documented goal-update endpoint. The API reference does not list `fineprint` as an update parameter, so the app intentionally presents it as read-only rather than risking a misleading local-only edit.

Connected data refreshes automatically on launch, whenever the app returns to the foreground, after a restored page or network reconnection, and every five minutes while the app is visible. API requests bypass browser caches; when a refresh cannot complete, the status explicitly says that saved data is being shown instead of silently presenting it as current.

The **Copy today’s update** button refreshes Beeminder first, then copies a numbered accountability update containing each completed goal’s slug, description, and all log messages entered today. Entries without a comment are identified as having no log message.

JavaScript and CSS URLs are versioned together with the service-worker cache. This prevents an installed copy from combining new HTML with an older, incompatible script after a deployment.

The footer displays the running version and checks `version.json` without using the browser cache. It reports whether the app is current, offline, or ready to reload into a newer deployment.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. On iOS, deploy to GitHub Pages, open in Safari, and choose **Share → Add to Home Screen**.

## Deploy

Enable GitHub Pages for the repository branch and root directory. All paths are relative, so project pages and custom domains are supported.
