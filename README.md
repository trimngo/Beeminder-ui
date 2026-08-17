# Bee Today

A mobile-first, installable Beeminder focus dashboard for GitHub Pages. It supports keyword/tag filtering, saved views, hiding goals completed today, urgency sorting, offline caching, and optional direct Beeminder API connection.

The app icon is an SVG rather than a binary PNG, so the entire project can be reviewed and submitted through text-only patch systems.

Filters support multiple required terms and exclusions. For example, `#work -#red -done:today` shows work-tagged commitments while excluding red-tagged commitments and anything completed today. Tap a visible hashtag to add it to the current filter, then save the view for later.

Each commitment starts with its Beeminder slug and description. Its read-only status reports whether the API returned a datapoint dated today; it is not a checkbox and cannot create or modify Beeminder data.

JavaScript and CSS URLs are versioned together with the service-worker cache. This prevents an installed copy from combining new HTML with an older, incompatible script after a deployment.

The footer displays the running version and checks `version.json` without using the browser cache. It reports whether the app is current, offline, or ready to reload into a newer deployment.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. On iOS, deploy to GitHub Pages, open in Safari, and choose **Share → Add to Home Screen**.

## Deploy

Enable GitHub Pages for the repository branch and root directory. All paths are relative, so project pages and custom domains are supported.
