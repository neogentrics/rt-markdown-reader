# The Recon Towers apps

How the apps fit together, so each one can be planned and built on its own and still work as one suite. App Link's rules are in [app-link.md](app-link.md). This page says who does what, and what's still to add.

| App | App Link id | Its job | State |
|---|---|---|---|
| RT Markdown Reader | `rt-markdown-reader` | Read, edit, listen to and publish documents | Released |
| RT Story Tracker | `rt-story-tracker` | Write the book, and keep the story bible | Released |
| RT Author Desk | `rt-author-desk` | The business of being an author: catalog, accounts, launches, royalties | Being planned |
| RT Press | `rt-press` | Designed print interiors and cover wraps | Being planned |
| RT Audio Studio | `rt-audio-studio` | Audiobooks and podcasts, recorded and finished here | Being planned, the slow one |

## What every app promises

- Runs on Windows, Mac and Linux, on your own computer, with no account, no ads and nothing else to install.
- Works fully with no internet, except what you send out yourself.
- AI is an add-on, never the point. It's off until you turn it on, works with your own choice of service including a local model, and the app is complete without it.
- Does the job in our own way. Never a copy of another company's product.
- Your data stays yours: encrypted where it's private, and there's always a way to get it out.
- Installers, self-update, tests on all three systems, a README with pictures, a roadmap page and a Bench page.
- Feature releases are 3.7, 3.8 and so on, or the same pattern from the app's own first version. A new major number is only for something big.

## Who owns what

One thing has one home, and the others ask for it over App Link instead of keeping their own copy.

| Thing | Home | Others use it for |
|---|---|---|
| Manuscripts, chapters, characters, lore, timelines | Story Tracker | Press lays them out; Audio Studio records them |
| Word counts, writing progress, draft status | Story Tracker | Author Desk shows them |
| Dictionary and pronunciation of invented words | Story Tracker | Reader's voices and Audio Studio use them, so a name is taught once |
| Published editions, ISBNs, prices, store links, royalties, accounts, launch plans | Author Desk | Story Tracker's catalog shows the published facts |
| Sending to blogs, Discord, wikis and Notion | Reader | Other apps hand it a document, and don't each build this again |
| Interior design, covers, finished print files | Press | Author Desk records what was made |
| Audio masters and podcast episodes | Audio Studio | Author Desk records what was made |

Story Tracker already has book layouts (trim sizes, mirrored margins, front and back matter) and a store-ready EPUB. Press starts from that work and goes further, instead of building it twice. Which app keeps which export is for the two apps' plans to settle, with the owner.

Which app owns which *feature* is in [app-features.md](app-features.md).

## Parts to share, not rewrite

| Part | Where it is now |
|---|---|
| App Link | `src/main/app-link.js` in Reader, copied into each app for now |
| Natural voices (the engine) | **Shared:** `read-aloud/` in `recon-core`. Reader takes it in at a pinned tag, into `src/main/core/read-aloud/` (`scripts/core-sync.mjs`, `core.lock`; `test/core.test.mjs` fails if a copy is changed here) |
| Read-aloud screens, audio export, pronunciation list | Reader: `renderer/read-ui.js`, `renderer/audio-ui.js`, `renderer/m4b.js`, `pronounce.js` |
| Dictation and speech to text | Reader: `whisper.js`, `dictation.js` |
| AI services, including local models | Reader: `ai-providers.js` |
| Themes, looks and fonts | **Shared:** `theme/` in `recon-theme`. Reader takes it in at a pinned tag, into `src/renderer/shared/theme/` (`scripts/theme-sync.mjs`, `theme.lock`; `test/theme.test.mjs` fails if a copy is changed here). Story Tracker has its own `src/shared/themes.js` today |
| Book layouts, EPUB | Story Tracker |

## Still to add: finding apps that are installed

App Link by itself only sees an app while it's running. The owner wants the apps to detect each other when they're installed, and to see what each other is doing when they're running. These are additions to protocol version 1, which an app that doesn't know them ignores. The installed list, the Apps panel and `status` are built in RT Story Tracker and in RT Markdown Reader 3.14 (not yet released); the rules every app follows are in [app-link.md](app-link.md).

**Installed list.** On first run and after each update, an app writes `installed/<id>.json` in the App Link folder, and removes it when it's uninstalled:

```json
{ "id": "rt-press", "name": "RT Press", "version": "1.0.0", "launch": "<path to start it>", "protocol": 1 }
```

**Apps panel.** Every app gets the same panel: which Recon Towers apps are on this computer, whether each is running, and whether it's linked. It offers to link one that's found, and to open one that's installed but closed. Finding an app never links it: you still approve a link once, as now.

**What it's doing.** A linked, running app can answer a new `status` request with a short line, such as what's open and whether a long job is running. Only linked apps can ask, a locked project says nothing about itself, and the answer holds no document text.

**Asking for facts.** A linked app can ask another for the things it owns in the table above, such as a book's word count, with a request named for the fact. Each kind of fact is added to [app-link.md](app-link.md) when the first app needs it.

**Same computer first.** All of this is for apps on one computer. Between computers, each app keeps its own sync.

## Research clips

Recon Browser lets an author clip text from a web page and send it to the apps that can use it. It goes over App Link, like any other document, so there is no second protocol, no shared drop folder and no extra address to register. This is planned, not built.

**How it travels.** Recon Browser is an App Link app (id `recon-browser`). It sends `open_document` with `kind: "research"`, once the person has approved the link. The clip is Markdown text with its details at the top, so any app can read it:

```
---
source_url: https://example.com/page
source_title: The page's title
source_author: Optional byline
source_date: Optional date the page was published
accessed: 2026-11-18
category: lore | character | setting | historical | science | general
tags: [research, web-clip]
---
# Title of the clip

The clipped text, as Markdown.

> Source: [The page's title](https://example.com/page), by the author (accessed 2026-11-18)
```

These fields are optional, and an app that doesn't know them ignores them.

**Who takes it.**

| App | What it does with a clip |
|---|---|
| RT Story Tracker | Shows its "which project, and as what" window. Until Research records exist (v3.12) the clip waits in the project's inbox, and then it becomes a Research record with the source line as its citation. |
| RT Markdown Reader | Opens it as a normal document. Later, the source details could become a citation entry, since Reader already reads BibTeX and CSL JSON. |
| Others | Don't need to accept it. |

**Rules for every app that receives one.**

- Nothing is stored until the person chooses where it goes.
- A locked project holds the clip until it's unlocked, and never writes it to an unencrypted file.
- Clip text goes through the same cleaning as any document before it's shown.
- Never fetch a picture from a clip's web address when it arrives, because that would tell the site it was read. Pictures come only if the person agrees, and then as `attachments`.
- The usual App Link limits apply: 20 waiting, and 8 MB for each.
- A name taken from outside, such as an `id`, is never used as a file name unless it's checked first.

The first idea for this, from the Recon Browser side, used an `rtstory://` link and a shared inbox folder. It's kept as a reference, but the rules above replace its transport.

## Apps status in every app

Built in RT Story Tracker, and in RT Markdown Reader from 3.14 (not yet released). Every app in the suite shows the same small indicator, so the owner can see what is linked at a glance. It was his idea (2026-11-18), and it is the Apps panel from "Still to add" above with a place to see it.

**Where.** A small icon at the right end of the toolbar, or the app's nearest equivalent, with a coloured dot and the name *Recon Towers apps* on hover and for screen readers. Clicking it opens the panel. The icon only summarises: the panel carries the words, so colour is never the only signal.

| Dot | Means |
|---|---|
| Green | At least one other app is linked |
| Amber | Other apps were found, but none is linked |
| Grey | No other app was found |
| Off | App Link is off. The panel says so and offers to turn it on. |

**The panel.** It lists every app in the suite, from one shared list (id, name and a short line), with one of these states and its button:

| State | Button |
|---|---|
| Linked | Open |
| Found, not linked | Link |
| Installed, not running | Open |
| Not installed | Get it (opens that app's page on the Recon Towers store) |

**The shared list.** Each app keeps a copy (`src/main/suite-apps.js` in Reader, `src/shared/suite-apps.js` in Story Tracker). A new app is one more row. Pages that don't exist yet open the store's list of projects.

| App Link id | Name | The short line | “Get it” opens |
|---|---|---|---|
| `rt-markdown-reader` | RT Markdown Reader | Read, edit, listen to and publish documents | https://recontowers.com/projects/ |
| `rt-story-tracker` | RT Story Tracker | Write the book, and keep the story bible | https://recontowers.com/projects/storytracker/ |
| `rt-author-desk` | RT Author Desk | Catalog, accounts, launches and royalties | https://recontowers.com/projects/ |
| `rt-press` | RT Press | Designed print interiors and cover wraps | https://recontowers.com/projects/ |
| `rt-audio-studio` | RT Audio Studio | Audiobooks and podcasts | https://recontowers.com/projects/ |
| `recon-browser` | Recon Browser | A browser for research, which sends clips to your story | https://recontowers.com/projects/ |

**Rules.**

- Finding an app never links it. *Link* asks for the same one-time approval as in [app-link.md](app-link.md).
- No constant checking. The panel looks when it opens, when the app starts, and when *Refresh* is pressed.
- An app counts as installed only if its `installed/<id>.json` exists and the `launch` path in it still exists. That guards against an uninstall that left the file behind.
- An app counts as running if its presence file is there and answers `hello`.
- Only linked apps are asked for `status`, and a locked project says nothing about itself.
- The shared list is kept in this repo's docs and copied into each app. A new app appears in every app's panel by an ordinary update.
- Wording stays the same in every app. Don't invent your own labels.

**Order.** RT Story Tracker builds the shared parts first, in its v3.8 (the installed list, the panel and the shared list). RT Author Desk builds the icon early, since adding it later costs more. RT Markdown Reader follows in its v3.14, together with a toolbar the owner can tidy. RT Press and RT Audio Studio get it when they are built.

## Updates and compatibility

Built in RT Story Tracker and in RT Markdown Reader 3.14; the site doesn't publish the versions file yet, so no app shows a newer version today. It goes with the apps status panel above, and it was the owner's idea (2026-11-18): the panel should tell him when a suite app has a newer version.

**What decides whether two apps link.** Their App Link version and the kinds of document each says it accepts (`hello` already returns both), never the app's own version number. Two apps on different releases link fine if the protocol matches. Most releases don't touch App Link, so they must never break a link.

**The one case that blocks.** If the protocols aren't compatible, or a security fix raised the minimum protocol an app will accept, the older app shows **Needs an update to link** in the panel, and no link is made. Nothing else blocks.

**The nudge.** When an installed app has a newer release, the panel shows **Update available** with both numbers (for example, "you have 3.7.1, the latest is 3.9.0"). The button depends on the app: *Open to update* for apps that update themselves (the Windows installer and the Linux AppImage), and *Download* for the rest (Mac, `.deb`, portable). It never stops a link that would otherwise work.

**Where "latest" comes from.** Not GitHub: some of the apps are in private repos, and GitHub limits anonymous checks. The Recon Towers store site already follows each app's releases, so it publishes one small file of latest versions, planned at `https://recontowers.com/apps/versions.json`:

```
{ "apps": { "rt-markdown-reader": { "version": "3.11.0", "released": "2026-11-18", "url": "https://recontowers.com/apps/rt-markdown-reader/" } } }
```

- An app reads it only when the panel opens or the app starts, and keeps the answer for a day.
- It asks for the file and sends nothing about the person: no ids, no list of what's installed.
- If it can't be reached, the panel says **Couldn't check for updates** and carries on. Being offline never blocks anything.
- Until the site publishes the file, an app treats it as not available.

**Wording** stays the same in every app: *Update available*, *Needs an update to link*, *Couldn't check for updates*.

## Look and feel in every app

Every app should feel like the same family. RT Markdown Reader is the reference, because it's the furthest along: where this page says what to do, Reader already does it, and an app should copy its wording and layout rather than invent its own. Where an app has no use for something, build the small version or leave it out and say so in its roadmap. This was written on 2026-11-19, after RT Story Tracker's menus and theme button were found to look unfinished next to Reader's.

**Menus.** File, Edit, View and Help, plus others as the app needs them. Keep each menu short: Reader's tests cap File at 20 items, and commands that aren't used often go in a submenu (for example *File → This Document*). Every command can also be run by name from the command palette (`Ctrl+K`, then `>`), and shortcuts can be changed.

**The Help menu.** In this order: *Help Center* (`F1`), *Tutorial*, *Check for Updates…*, then *About <App name> <version>*.

**Help Center.** A home page with the tutorial, quick links and common questions, then numbered guides that can be searched. A guide can have a button that jumps straight to the setting it explains. Guides are plain Markdown files in a `help` folder, so each app's guides read like the others.

**Tutorial.** A hands-on tour with a practice item, offered the first time the app opens. It can be skipped, resumed, and replayed from *Help*. People who update from an older version get it too, because the app checks whether it was finished.

**About window.** The icon, the app's name and its version (marked *portable* if it is). Four links with a line of explanation each: *Website* (the app's page on recontowers.com), *What's new in this version* (the release notes), *Report a problem or suggest a feature* (the repo's issues), and *Source code*. A line with the Electron, Chromium and Node versions and the operating system, and a *Copy details* button, so a bug report can include them. At the bottom: "© <year> Recon Towers. All rights reserved.", with links to the *License* and the *Open-source notices*.

**Preferences.** One window (`Ctrl+,`) holds every setting, in sections. A setting that's moved there stays reachable by name from the command palette. This is what keeps the menus short.

**Themes and fonts.** The full rules (the ten themes, the colour tokens, the Solid, Metallic and Glass looks, and contrast) are in [app-theming.md](app-theming.md). In short: the shared themes (Paper, Sepia, Night, Mist, Forest, Dusk, High Contrast, Blue, Red and Yellow), *Follow System*, the *Solid*, *Metallic* and *Glass* looks (the page and editor stay flat in all three), the *Colour-safe* option for colour blindness, *Customize Theme* for your own colours, and the shared choice of fonts. The theme button is visible on the main screen, not buried. A test measures the contrast of every theme.

**The toolbar.** Icon buttons, each with a name that shows on hover and is read out by screen readers. Only the commonly used ones are there, and the rest are in the menus. Reader 3.14 (not yet released) makes the toolbar adjustable (*Customize Toolbar…*: hide, reorder, shrink, names beside icons; buttons that don't fit move into *More*), and the other apps copy that. The apps status icon sits at the right end.

**Updates.** Where the system allows it, the app updates itself: a message says "Version X is ready to install" with a *Restart to update* button. Where it can't (Mac, the `.deb`, the portable build), the message links to the download.

**Accessibility.** Every button has a name, every theme meets WCAG AA contrast, Windows high contrast works, and everything can be done from the keyboard. This is checked automatically in the tests, not by eye.

**Languages.** All the app's own words live in one table per feature, with Spanish, French and German and right-to-left layouts supported. Product names are marked so they aren't translated.

**Wording.** Plain, short, and the same everywhere: *Open*, *Save*, *Restart to update*, *Check for Updates…*. If Reader already has a label for it, use that one.

## What each app can do over App Link (kept in step)

One table, so no app promises a button that the other end can't answer. The owner's main session keeps it. When an app gains or loses a capability, its session tells the main session in its report, and the table is updated the same day and sent to every app's session. Last checked against the code on 2026-11-27.

| App | Version | Sends | Receives and does something with | Not yet |
|---|---|---|---|---|
| RT Markdown Reader | 3.13.0 | Documents, with their pictures, to RT Story Tracker (*Send to StoryTracker*, with or without a link) | Any document (`markdown`, `text`) with its pictures. It takes `kind` and ignores it | Research clips are not its job; it just opens them |
| RT Story Tracker | 3.10.0 | Documents to RT Markdown Reader | Documents with a `kind`: `chapter`, `record`, `page`, `note` and `research`. A research clip goes into its Research book through the inbox | |
| Recon Browser | 1.10.0 | Research clips (`open_document` with `kind: "research"`), built by `src/main/clip-builder.js` and sent by `src/main/app-link.js` | Documents (`markdown`, `text`) | Sends no other kind |
| RT Author Desk | 1.2.0 | Nothing yet | Nothing yet | It finds installed apps (`src/main/installed.js`); no document exchange is built |
| RT Press | 0.1.0-alpha.0 (pre-release, 2026-11-23) | Nothing yet | Nothing yet | No App Link code yet. The app itself has a working window for import, set, check and preview. The `kinds` proposal is in its roadmap (v1.7), waiting for the owner |
| RT Audio Studio | 0.0.0 | Nothing yet | Nothing yet | Design only; building is paused |

## Apps say what they do with each kind

Today `hello` returns `accepts`, and in every app it reads `['markdown', 'text']`. That is the *format* of a document. It does not say which *kinds* an app does anything with, so Recon Browser can find RT Story Tracker and still not know whether a research clip will be handled.

**The proposal (needs the owner's yes before any app is changed):**

- `hello` also returns `kinds`: the values of `kind` the app does something useful with, for example `["chapter", "record", "page", "note", "research"]` for RT Story Tracker. An app that ignores `kind`, such as RT Markdown Reader, returns `[]`. A missing `kinds` means the app is older: treat it as `[]`.
- A sender only offers a kind-specific action when the other app's `kinds` lists it. Otherwise the button is greyed out and says why ("RT Story Tracker 3.10 or later is needed", or "Not supported by this app yet"), instead of sending something that will be ignored.
- It is an addition to protocol v1, so older apps keep working: they just don't announce anything. It goes in `app-link.md` when it is agreed.
- Each app lists its own `kinds` in its README and keeps a test that `hello` and the table agree.

## Writing patterns in every app that edits text

Raised by the owner on 2026-11-27. **Not scheduled: no session starts on it until the owner says go.** Each app's session adds it to its own roadmap, where it fits. It is an important feature.

**What it is.** A *Writing patterns* check in every app where a person writes or edits text. It finds the patterns that make writing sound machine-made or careless, so the person can correct, edit or keep each one. The owner's reason: someone weak at grammar may use AI to fix their writing, and AI leaves habits behind: the same words and phrases again and again, stock phrases, writing that is too even and too tidy. People should be able to see those and make the text sound like themselves.

**Two layers.**

1. **A local check, no AI.** It runs on the computer, offline and free, and every flag says why ("used 6 times in this chapter"). It finds repeated words and phrases within a stretch of text, repeated sentence openings, very even sentence lengths, stock phrases and constructions that AI overuses, and the person's own banned phrases. This does most of the work, and it is built first.
2. **An optional AI pass,** for what rules can't see. It works with the person's own choice of service, including a local model, and is off until turned on, like every other AI feature in the suite.

**The person's own list.** A list of phrases the person never wants to see ("he reached for his sword with two fingers"), kept per folder or project, like the pronunciation list in RT Markdown Reader. It is also counted across a whole book or series, so a habit that appears forty times is visible. The list can be exported as a "never write these" block to paste into an AI session, so the same list fixes the text and stops the habit at the source.

**Rules for every app.**

- Flags show as marks the person accepts, rejects or ignores, never applied automatically. Ignoring one remembers it.
- Each rule can be turned off, and the starter list of patterns is editable.
- The banned-phrase list is kept once for all apps, in the shared per-user App Link folder, like the shared themes, so a phrase added in one app is flagged in the others.
- The app doesn't promise to get past AI detectors. Detectors are unreliable and change, so the claim would not hold. The check is for repeats, stock phrases and sounding like the person, which also lowers the tells.
- Words stay on the computer. Nothing is sent anywhere unless the person turns on the AI pass.

**Which apps.** RT Markdown Reader and RT Story Tracker first; RT Author Desk (blurbs and promo copy) and RT Audio Studio (scripts) next. RT Press needs a small version: the back-cover blurb it sets (v1.3) is the first thing a reader sees, and Press plans AI-drafted blurbs, so the check runs on the blurb text and on any draft before it is shown, using the shared engine and the shared banned-phrase list. Recon Browser has no use for it.

**Where it fits in Reader.** After the look update and v3.14, as its own feature release (v3.15), not 4.0. Grammar checking in the style of Word's Editor (passive voice, grammar) is a separate gap; check what the app does today before promising it.

**One shared engine** (the rules, the starter list and the tests), taken in the same way as the shared themes file, is the likely way to keep every app identical. Not decided.
