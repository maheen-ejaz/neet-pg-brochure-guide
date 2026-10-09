# Visual assets

The README cover, GitHub social preview and website Open Graph image share one source:
[`banner.html`](banner.html). It uses the dashboard's Inter / Inter Tight typography, monochrome mark,
neutral canvas, panel borders and an actual app screenshot. The images intentionally say **Draft preview**;
update that copy and regenerate when reviewed guides are published.

| Asset | Purpose | Size |
|---|---|---|
| `banner.png` | README cover | 2560 × 1280 (2×) |
| `social-preview.png` | GitHub repository social preview | 1280 × 640 |
| `../../public/og-image.png` | Website Open Graph / Twitter card | 1200 × 630 |
| `home.png`, `state.png`, `profile.png`, `mcc.png` | Current candidate journey | Desktop screenshots |
| `state-dark.png`, `state-phone.png` | Dark theme and phone layout | App screenshots |
| `review.png` | Local authoring / source review | Dev-only screenshot |

## Regenerate

Use a current local checkout. Screenshots use a fresh browser context and a **synthetic demo profile**;
never capture a candidate's real saved profile. These are manual commands, not a watcher or scheduled job.

Install the optional screenshot tooling without changing the dependency manifest or lockfile:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run build:preview
npm run preview -- --port 5191
```

In a second terminal, start the dev-only review tool:

```bash
npm run dev -- --port 5192
```

In a third terminal, from the repository root:

```bash
node docs/images/shots.mjs
node docs/images/render.mjs
```

The scripts write outputs beside their sources regardless of the shell's working directory.
`PREVIEW_URL` selects the local built-preview URL; `REVIEW_URL` selects the dev-server URL.
Candidate screenshots deliberately use the built preview so development-only navigation is absent. `CHROME` can select an existing compatible
Chromium executable. `PLAYWRIGHT_MODULE` can select the file URL of an already-installed Playwright module.
Both scripts close their browser processes when finished.

Inspect both share sizes and the README cover before committing. Keep share images opaque PNGs below 1 MB.
Avoid facts or state counts in the cover that would become stale as brochures are added.

## Where the images appear

- Website metadata lives in [`../../index.html`](../../index.html); Vite copies `public/og-image.png`
  into the build root. The absolute public URL becomes available after an authorized application release.
- GitHub uses a separately uploaded copy of `social-preview.png` in repository **Settings → General → Social preview**.
  Committing the file alone does not change that setting. [GitHub's upload instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).
- README links point at the committed screenshots. Keep its product screenshots in sync with the UI.
