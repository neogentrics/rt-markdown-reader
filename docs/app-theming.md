# Themes and looks in every Recon Towers app

One place that says how themes are supposed to look, so a new app is built to it and nobody has to explain it again. It is part of [app-suite.md](app-suite.md). Last checked against the code on 2026-11-27.

**Copy, don't invent.** RT Markdown Reader is the reference for themes, tokens, contrast and the Settings. Recon Browser's Metallic and Glass finish is the one the owner likes best, and Reader's two looks were brought closer to it in 3.13.1. **Reader's looks are now the reference for both**, and their files are shared with every app through `recon-theme`. Recon Browser is moved to the same names. One difference will show when it moves: Recon Browser's exact shading for Metallic dialogs is readable in Reader's Night, Forest and Dusk themes, but not in the six with light dialogs (Paper, Sepia, Mist, Blue, Red and Yellow), where small text in Preferences fell as low as 3.36:1 (it needs 4.5:1). Light dialogs are gentler in Reader, so Recon Browser's will get softer.

**The shared files** live in the `theme/` folder of `recon-theme`, whose `theme/README.md` says how an app uses them. Reader takes them in at a pinned tag, into `src/renderer/shared/theme/`. **Never edit that copy:** change the files in `recon-theme`, tag them, and run `node scripts/theme-sync.mjs <tag>`.

| Shared file | What's in it |
|---|---|
| `theme.css` | The themes and their tokens, and the shared defaults |
| `glass.css` | Glass |
| `metallic.css` | Metallic |
| `brand.js` | *Customize Theme*: the person's own colours and fonts, and how each look treats them |

In Reader:

| File | What it does |
|---|---|
| `src/renderer/styles/app.css` | Loads them: `theme.css` first, then `glass.css`, then `metallic.css` (with Reader's own stylesheets between and around them) |
| `theme.lock`, `scripts/theme-sync.mjs` | The tag Reader has, with a hash of every file, and the script that takes a tag in |
| `test/theme.test.mjs` | Fails if the copy was edited, is missing a file or has an extra one, or if the app stops loading it |
| `test/colors.test.mjs` | The contrast of every panel in every theme except High Contrast, colour-safe colours, and *Customize Theme* colours |
| `test/surface.test.mjs` | What the two look stylesheets promise that can be checked without a screen: when they step aside, no `!important`, nothing on the editor, every layer worked out from the text's lightness |
| `test/e2e/metallic.e2e.cjs` | The contrast of real text over both Metallic and Glass |

## Three layers

1. **Theme**: the colours. Chosen by the person, or *Auto* (follows the system).
2. **Look**: a finish on top of any theme: *Solid*, *Metallic* or *Glass*. It never changes the colours' meaning, only how the app's own chrome is drawn.
3. **Options**: *Colour-safe*, *Page width*, *Typeface*, and *Customize Theme* (the person's own colours and fonts, which work with every look).

One theme button on the main screen has Theme, Look, Typeface and Page width, then *Customize colours & fonts…*. The same choices are in *Preferences → Appearance* and the *View* menu (*Theme*, *Look*, *Typeface*, *Page Width*). **Colour-safe isn't on the theme button:** it's in *Preferences → Appearance* and the *View* menu.

Settings keys in Reader: `theme` (*Auto* is saved as `system`), `surface` (`solid` | `metallic` | `glass`), `colorSafe`, `pageWidth` and `font`. The page's root element carries:

| Attribute | Value |
|---|---|
| `data-theme` | The theme in use (for *Auto*, the one it resolved to) |
| `data-tone` | `dark` for Night, Forest, Dusk and High Contrast, otherwise `light`. The app sets it from the theme's name. **Glass needs it** (how see-through its dialogs are), and so do the colours for changes |
| `data-surface` | `solid`, `metallic` or `glass` |
| `data-colors` | `safe` with *Colour-safe* on, otherwise `normal` |

## The themes

Every app has the same ten, with the same names, plus *Auto*. Themes any app adds to the shared set (see Decisions) join them. Where the app is dark or light the name decides, not the app.

| Name | `data-theme` | Note |
|---|---|---|
| Paper | `light` | The default light theme |
| Night | `dark` | The default dark theme |
| Sepia | `sepia` | |
| Mist | `mist` | |
| Forest | `forest` | |
| Dusk | `dusk` | |
| Blue | `blue` | Panels run from one colour to another, with contrasting buttons |
| Red | `red` | The same idea, in red |
| Yellow | `yellow` | The same idea, in yellow |
| High Contrast | `contrast` | Flat and plain on purpose: no gradients, no looks |

An app may add its own extra themes (Recon Browser has Cyber Dark and others), but the ten above must all be there. **Gap today:** Recon Browser has its own names and a different set of token names; moving it to the shared ten is queued with its other work, and the owner decides which of its extras stay.

## Tokens: the colour vocabulary

A component takes its colours from tokens only, never a literal colour that works in one theme. Every theme has all of them, but **not all from its own block**: some come from shared defaults (the `:root` rule), with changes for `data-tone="dark"` and `data-colors="safe"`. The colours for changes and the inverse colours come only from those shared rules, and High Contrast takes its flat panel fills from them. Copying just the theme blocks would miss them. The names are Reader's:

- Surfaces: `--desk`, `--desk-grain`, `--chrome`, `--chrome-border`, `--page`, `--page-shadow`, and the fills `--desk-fill`, `--toolbar-fill`, `--tabstrip-fill`, `--sidebar-fill`.
- Glass: `--glass-desk`, the colour that shows through the frosted panels. Sepia, Night, Forest, Dusk, Blue, Red and Yellow set their own; Paper and Mist use the shared default.
- Text: `--text`, `--text-soft`, `--muted`, `--heading`, `--link`, `--on-accent`.
- Accent: `--accent`, `--accent-2`, `--accent-soft`.
- Lines and selection: `--rule`, `--rule-strong`, `--sel`, `--mark`, `--btn-hover`.
- Content: `--code-bg`, `--code-border`, `--inline-code-bg`, `--inline-code-text`, `--table-head`, `--table-stripe`, `--quote-bar`, `--quote-bg`.
- Changes: `--add-fill`, `--del-fill`, `--add-text`, `--del-text` (these switch to colour-blind-safe values with *Colour-safe*).
- Inverse (bars that take the page's opposite colours, such as the read-aloud bar): `--inverse-bg`, `--inverse-fg`.

An app that has no use for a token (a browser has no code blocks) keeps it defined anyway, so a shared part can be copied in without breaking.

## The looks

**Solid.** Matte, flat panels. The default.

**Metallic** (`metallic.css`). A brushed-metal finish for the app's own chrome (toolbar, tab strip, buttons, sidebar, dialogs, pop-ups, the find bar and the read-aloud bar).
- Bars: a light highlight along the top, a darker band through the middle, a soft reflection at the bottom, with a one-pixel light line on top edges and a dark one below.
- Buttons are raised, bevelled plates: a dark edge, a bright top line, a shaded lower lip and a drop shadow. The main button is glossy, and the current tab's accent stripe runs its whole width.
- Dialogs and pop-ups are brushed in five diagonal bands of light and shade.
- Text boxes are recessed: crisp white on a light surface, shaded on a dark one. The search box is set into the find bar.

**Glass** (`glass.css`). Panes of frosted glass over the theme's own colours.
- Bars, dialogs and pop-ups are translucent, with blur and saturation, a white sheen, a bright top line, a pale rim and a deep shadow.
- Every toolbar button is a small pane of its own with a soft edge, and the current tab is a raised one. The main button sits under glass.
- Search boxes glow in the accent colour.
- The page is frosted too, but gets no sheen.
- It also steps aside for people who've asked for **less transparency**.

In both, how strong each layer is comes from the lightness of the text that sits on that surface, so the same recipe works on dark themes and on light ones.

**With *Customize Theme*** (`brand.js`): both looks use the person's button colour on their main buttons. With Metallic, its light and shade follow their colours. With Glass, if they've chosen a panel or background colour, the toolbar, tab strip and sidebar are **not see-through**, so the text stays readable over that colour, but they keep the sheen of glass.

**For every look:**

- Text is always on a surface that meets WCAG AA contrast. This is measured, not assumed: the accessibility checker cannot judge text over a gradient, so each app measures the real text colour against the worst background behind it.
- A look is off for High Contrast, for the system's forced colours, for people who asked for more contrast, and in printing and exports.
- The page the person reads or writes on stays plain enough to read; looks are for the chrome around it.
- Light themes get the same looks as dark ones (do not hard-code white and black layers: derive them from the text colour as Metallic does).

## Contrast

Every theme meets AA, and the tests measure it in all three operating systems' CI, not by eye. A new theme, look or colour is not finished until its numbers are in the tests.

The real-text test (`metallic.e2e.cjs`) runs both Metallic and Glass in the nine themes other than High Contrast, and with two sets of *Customize Theme* colours. It checks that both stay flat for High Contrast, forced colours and a request for more contrast, and that Glass does for less transparency. It measures **chosen controls**, not every screen: the toolbar, title, tabs, sidebar, theme pop-up, read-aloud bar, and the *Reading Aloud* part of Preferences. It finds them by Reader's own page layout, so each app has to adapt that part to its own.

## A new app starts here

1. Take in `recon-theme` at a tag with a copy script and a lock (start from Reader's `scripts/theme-sync.mjs`, the `scripts/core-sync.mjs` it uses, and `test/theme.test.mjs`). Load `theme.css` (all of it: the themes **and** the shared defaults), then the app's own base styles, then `glass.css` and `metallic.css`; set the four attributes above; use the class names listed in `recon-theme`'s `theme/README.md`, since a part with another name gets no finish; and apply custom colours with `brand.js`.
2. Add the theme button and the Appearance section with the same labels.
3. Add the colour tests (panel contrast per theme), the stylesheet tests (`surface.test.mjs`) and the look test (real text over each look, per theme), adapted to the app's own screens.
4. Say in the app's roadmap which pieces it left out and why.

## Decisions (the owner, 2026-11-27, passed on by the app sessions)

The owner chose both of the earlier open questions, in his words: if the themes change, they change in all of the apps, and anytime a theme is added or uploaded, all apps can use it. So:

1. **One shared themes file, not a copy per app.** Tokens, themes, looks and the contrast tests live in one place, and Reader is the reference. An app takes it in through a build step, and a check fails the build if the app's copy differs from the shared one. It lives in the private repo `neogentrics/recon-theme` (created 2026-11-27; see below).
2. **Themes added or uploaded are kept once.** A theme made in *Customize Theme*, or loaded from a file, is stored once in the shared per-user App Link folder, so every app offers it. A theme file is data only, is validated, and is refused if it fails contrast.
3. **Following.** Changing theme, look or colour-safe in one app tells the linked apps on the same computer, and they switch too. Only linked apps are told, no document text travels, and *Preferences → Appearance* can turn it off. This needs a small addition to App Link (a message like `status`) and so a protocol decision. It is not built, and no app should start it before the owner says go.

The shared set is the ten themes above plus themes that apps add to it. RT Author Desk's extras (Slate, Plum, Evergreen and Aero) are being added to the shared set, so every app can use them. Recon Browser's own extras are decided when it moves to the shared themes.

## Still to settle

- **Where the shared file lives: settled.** A private repo, `neogentrics/recon-theme`, created on 2026-11-27 by the owner's say-so. It holds the tokens, the themes, the looks and contrast tests that run on their own (each app also keeps tests that run against its copy), with a version tag per release. Private is enough because it is only for the Recon apps; the apps' own source (some of it public) carries a committed copy anyway. An app takes it in with a script that copies the files at a pinned tag and writes a `theme.lock` (a hash of the copied files); the app commits both, so building the app never needs access to the private repo, and the app's test recomputes the hash and fails if the copy was edited by hand or no longer matches the lock. The first files moved in from Reader 3.13.1, unchanged, as **v0.1.0** (2026-11-27), and Reader takes them back in from there. New apps take the theme from `recon-theme`.
- **The App Link addition for following,** and where in the App Link folder the shared themes are stored. Decided together with the `kinds` change, which is already in RT Story Tracker 3.11.
