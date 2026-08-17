# Bee Today

A mobile-first, installable Beeminder focus dashboard for GitHub Pages. It supports keyword/tag filtering, saved views, hiding goals completed today, urgency sorting, offline caching, and optional direct Beeminder API connection.

The app icon is an SVG rather than a binary PNG, so the entire project can be reviewed and submitted through text-only patch systems.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. On iOS, deploy to GitHub Pages, open in Safari, and choose **Share → Add to Home Screen**.

## Deploy

Enable GitHub Pages for the repository branch and root directory. All paths are relative, so project pages and custom domains are supported.
