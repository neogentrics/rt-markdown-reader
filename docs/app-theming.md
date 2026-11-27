# Themes and looks in every Recon Towers app

One place that says how themes are supposed to look, so a new app is built to it and nobody has to explain it again. It is part of [app-suite.md](app-suite.md). Last checked against the code on 2026-11-27.

**Copy, don't invent.** RT Markdown Reader is the reference for themes, tokens, contrast and the Settings. Recon Browser's Metallic and Glass finish is the one the owner likes best; Reader's two looks are being brought closer to it in 3.13.x. When that is merged, Reader's files are the reference for both looks, and Recon Browser is moved to the same names.

Reader's files: `src/renderer/styles/theme.css` (themes, tokens, Glass), `src/renderer/styles/metallic.css` (Metallic), `test/colors.test.mjs` (contrast of every panel in every theme), `test/e2e/metallic.e2e.cjs` (contrast of real text over the Metallic gradients, all themes).

## Three layers

1. **Theme**: the colours. Chosen by the person, or *Auto* (follows the system).
2. **Look**: a finish on top of any theme: *Solid*, *Metallic* or *Glass*. It never changes the colours' meaning, only how the app's own chrome is drawn.
3. **Options**: *Colour-safe*, *Page width*, *Typeface*, and *Customize Theme* (the person's own colours and fonts, which work with every look).

All of it is reached from one theme button on the main screen (Theme, Look, Typeface, Page width, then *Customize colours & fonts…*), and again in *Preferences → Appearance* and *View → Look*. Settings keys in Reader: `theme`, `surface` (`solid` | `metallic` | `glass`), `colorSafe`, width and typeface. The look is set on the root element as `data-surface`, the theme as `data-theme`, colour-safe as `data-colors="safe"`.

## The themes

Every app has the same ten, with the same names, plus *Auto*. Where the app is dark or light the name decides, not the app.

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

A component takes its colours from tokens only, never a literal colour that works in one theme. Every theme defines all of them. The names are Reader's:

- Surfaces: `--desk`, `--desk-grain`, `--chrome`, `--chrome-border`, `--page`, `--page-shadow`, and the fills `--desk-fill`, `--toolbar-fill`, `--tabstrip-fill`, `--sidebar-fill`.
- Text: `--text`, `--text-soft`, `--muted`, `--heading`, `--link`, `--on-accent`.
- Accent: `--accent`, `--accent-2`, `--accent-soft`.
- Lines and selection: `--rule`, `--rule-strong`, `--sel`, `--mark`, `--btn-hover`.
- Content: `--code-bg`, `--code-border`, `--inline-code-bg`, `--inline-code-text`, `--table-head`, `--table-stripe`, `--quote-bar`, `--quote-bg`.
- Changes: `--add-fill`, `--del-fill`, `--add-text`, `--del-text` (these switch to colour-blind-safe values with *Colour-safe*).
- Inverse (bars that take the page's opposite colours, such as the read-aloud bar): `--inverse-bg`, `--inverse-fg`.

An app that has no use for a token (a browser has no code blocks) keeps it defined anyway, so a shared part can be copied in without breaking.

## The looks

**Solid.** Matte, flat panels. The default.

**Metallic.** A brushed-metal finish for the app's own chrome (toolbar, tab strip, buttons, sidebar, dialogs, pop-ups, the find bar and the read-aloud bar): a light line along the top edge, a darker band through the middle, a soft light band near the bottom, a dark line at the very bottom, a drop shadow, raised buttons, a glossier main button, and recessed text boxes. How strong each layer is comes from the lightness of the text that sits on that surface, so the same recipe works on dark themes and on light ones. It is being tuned toward Recon Browser's stronger finish (bevel and bar-against-page contrast); the recipe above stays.

**Glass.** Frosted: the panels are translucent over the theme's own colours, with blur and saturation, a light edge, and a soft glow. Not used with *reduced transparency* turned on.

**For every look:**

- Text is always on a surface that meets WCAG AA contrast. This is measured, not assumed: the accessibility checker cannot judge text over a gradient, so each app measures the real text colour against the worst background behind it.
- A look is off for High Contrast, for the system's forced colours, for people who asked for more contrast, and in printing and exports.
- The page the person reads or writes on stays plain enough to read; looks are for the chrome around it.
- Light themes get the same looks as dark ones (do not hard-code white and black layers: derive them from the text colour as Metallic does).

## Contrast

Every theme meets AA, and every theme with every look is measured in the tests, in all three operating systems' CI, not by eye. A new theme, look or colour is not finished until its numbers are in the tests.

## A new app starts here

1. Copy the theme tokens and the ten themes from Reader's `theme.css`, and the Metallic and Glass blocks.
2. Add the theme button and the Appearance section with the same labels.
3. Add the colour tests (panel contrast per theme) and the look test (real text over each look, per theme).
4. Say in the app's roadmap which pieces it left out and why.

## Open decisions for the owner

- **One shared package.** Instead of copying the files into each app, keep one small folder (tokens, themes, looks and the contrast tests) that every app pulls in, so a fix lands everywhere at once. Cheaper over time, more work now.
- **One theme across apps.** When the person changes theme in one app, the others on the same computer could follow, through App Link. Not decided.
