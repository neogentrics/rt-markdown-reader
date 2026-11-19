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

## Parts to share, not rewrite

| Part | Where it is now |
|---|---|
| App Link | `src/main/app-link.js` in Reader, copied into each app for now |
| Natural voices, audio export, pronunciation | Reader: `voices.js`, `supertonic.js`, `pronounce.js`, `renderer/m4b.js` |
| Dictation and speech to text | Reader: `whisper.js`, `dictation.js` |
| AI services, including local models | Reader: `ai-providers.js` |
| Themes and fonts | Reader, and `src/shared/themes.js` in Story Tracker |
| Book layouts, EPUB | Story Tracker |

## Still to add: finding apps that are installed

App Link today only sees an app while it's running. The owner wants the apps to detect each other when they're installed, and to see what each other is doing when they're running. These are additions to protocol version 1, which an app that doesn't know them ignores. They aren't built yet.

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

Planned, not built. Every app in the suite shows the same small indicator, so the owner can see what is linked at a glance. It was his idea (2026-11-18), and it is the Apps panel from "Still to add" above with a place to see it.

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

**Rules.**

- Finding an app never links it. *Link* asks for the same one-time approval as in [app-link.md](app-link.md).
- No constant checking. The panel looks when it opens, when the app starts, and when *Refresh* is pressed.
- An app counts as installed only if its `installed/<id>.json` exists and the `launch` path in it still exists. That guards against an uninstall that left the file behind.
- An app counts as running if its presence file is there and answers `hello`.
- Only linked apps are asked for `status`, and a locked project says nothing about itself.
- The shared list is kept in this repo's docs and copied into each app. A new app appears in every app's panel by an ordinary update.
- Wording stays the same in every app. Don't invent your own labels.

**Order.** RT Story Tracker builds the shared parts first, in its v3.8 (the installed list, the panel and the shared list). RT Author Desk builds the icon early, since adding it later costs more. RT Markdown Reader follows in its v3.13, together with a toolbar the owner can tidy. RT Press and RT Audio Studio get it when they are built.
