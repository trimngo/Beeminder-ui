# Agent environment notes

## Browser screenshots

This Ubuntu container's `chromium-browser` apt package is only a Snap launcher and
does not provide a working browser when snapd is unavailable. Do not treat the
presence or absence of `command -v chromium-browser` as proof that screenshots
cannot be taken.

If no usable browser is already installed, install Playwright's self-contained
Chromium build and its system dependencies:

```sh
npx -y playwright@1.55.0 install --with-deps chromium
```

Then capture screenshots with the same pinned Playwright version, for example:

```sh
npx -y playwright@1.55.0 screenshot --browser=chromium --viewport-size="390,844" http://127.0.0.1:8000 output.png
```

Install the browser rather than reporting a missing-browser environment
limitation when network access and package installation are available.
