# Who owns which feature

One place to see which app a feature belongs to, so the same feature isn't built twice and no app is made redundant by another. It is part of [app-suite.md](app-suite.md), and it sits beside the data table "Who owns what" there: that table says where *things* live, this one says where *features* live.

First version, 2026-11-27. It was made by searching every app's `ROADMAP.md` for the features that more than one app mentions, so it is a first pass: each app's session is asked to confirm or correct its own rows. The owner's main session keeps it, and it is updated whenever a session reports a feature.

**The rule.** One feature has one home. The other apps either hand the work to the home app over App Link, or take in one shared module. An app doesn't build its own copy. Where an app needs a small different version, its roadmap says why.

## The map

| Feature | Home | Who else wants it | How it is shared today | Status |
|---|---|---|---|---|
| Themes and looks | The shared themes file (`neogentrics/recon-theme`) | Every app | One shared file | Decided; files move in after Reader 3.13.x |
| Sending to WordPress, Ghost, Discord, wikis and Notion | The shared code module (`recon-core`); Reader has it today | Story Tracker (v3.25), Audio Studio | Reader sends today; the code moves into the module so each app publishes on its own | Decided 2026-11-27; waits for the module |
| Writing patterns (repeats, stock phrases, banned phrases) | One shared engine and one shared banned-phrase list | Reader, Story Tracker, Author Desk (blurbs, book descriptions in the Listing kit, promo copy), Audio Studio, and the blurb in Press | Planned, not built | Not scheduled |
| Read aloud with natural voices | RT Markdown Reader (built, 3.2 to 3.12) | Story Tracker (v3.12: matches Reader's read aloud with Reader's offline voices); Audio Studio (v1.13 plans a voice edition with a different, local model); Recon Browser has its own read aloud | Story Tracker plans to reuse Reader's voices; whether that is shared code or a copy is not decided | **Overlap to settle** |
| Dictation (Whisper) | RT Markdown Reader (built) | Story Tracker (v3.22, "Hear it and say it", reusing Reader's offline speech to text); Audio Studio's "hours of speech" builds on Reader's | Both plan to reuse Reader's Whisper; shared code or a copy is not decided | **Overlap to settle** |
| Your own AI service (Claude, ChatGPT, Gemini, Mistral, OpenRouter, Ollama and LM Studio), with a model per task | RT Markdown Reader (built, 3.3) | Story Tracker, Author Desk, Audio Studio, Recon Browser (Ollama) | Story Tracker (v3.17), Author Desk (v1.8), Press (v1.8: picture descriptions, blurb drafts, explain a check) and Audio Studio all say they will follow Reader's service list, with each app's own account and key; the browser has an Ollama bridge | **Settle how the code is shared: Reader's, or one shared module** |
| Citations and bibliography (BibTeX, Zotero) | RT Markdown Reader (built) | Story Tracker (planned) | Each plans its own | **Overlap to settle** |
| EPUB for stores | RT Story Tracker (built: store-ready EPUB) | Press v1.6 plans an EPUB "built from the same export code as RT Story Tracker, not a second copy", so it consumes a shared EPUB, Word and plain-PDF package that Story Tracker has not extracted yet; Reader exports an EPUB of a document | Each has its own today | **Overlap to settle**; see what Press adds below |
| Print-ready PDF and covers | RT Press (Typst) | Story Tracker also keeps its own plain print PDF (its decision 25, Chromium engine); Reader has a PDF designer for documents (a different job); Author Desk only checks that the cover is ready | Two homes by decision | **Two print PDF engines to settle** |
| Published facts: editions, ISBNs, prices, store links, release dates | RT Author Desk (already so in "Who owns what") | Story Tracker's catalog shows them | Hand-off | Fine |
| A book's blurb and description | Three places hold a description today: Story Tracker's book details, Author Desk's Listing kit (planned v1.5, not built; one description per book plus a version per store) and Press's back-cover blurb. Proposal: Author Desk owns the store listing text; Press keeps the back-cover blurb as its own text, because cover copy is shorter, differently shaped and must exist without Author Desk, and offers "Use the listing description", asking for the book's own description (not a store version) over App Link | Needs the unbuilt "asking for facts" addition to App Link. The Writing patterns check runs on whichever text appears. Until the Listing kit exists, Press keeps a temporary field | **To settle** |
| Sales reports, royalties and pricing | RT Author Desk | Nobody else | Only Author Desk plans these | Fine |
| Covers | RT Press makes them | Author Desk records a cover status (set by hand, or told by Press over App Link) and checks a release date has a final cover; it makes none | Hand-off | Fine |
| Dictionary of invented words, and how to say them | RT Story Tracker (the home in "Who owns what"); its Dictionaries feature is planned (v3.15), not built. Built now: a personal spell-check dictionary, and App Link's `get_fact` can already be asked for dictionary pronunciations | Reader has its own pronunciation list (built, 3.5); Audio Studio reads the dictionary | Two lists exist | **Reader's list can move to read Story Tracker's only after v3.15** |
| Spell check and a personal dictionary | RT Story Tracker (built) | Reader has spell check in its editor | Separate | Fine |
| App Link, the apps status icon, update messages, Help Center, tutorial, command palette | Reader is the reference; each app has its own | Every app | Each builds the same thing by Reader's pattern | Same shape in every app; candidates for shared code |
| Storage rules: permanent IDs and change log | Story Tracker's design | Author Desk (shares it) | Shared in design | Fine |
| The lock, recovery key and trusted computer | Story Tracker's design | Author Desk (shares it) | Shared in design | Fine |
| Sync between computers | RT Markdown Reader | Author Desk ("as in Reader", v1.10); Audio Studio and Recon Browser each plan their own | Each plans its own | Candidates for shared code |
| Backups and Trash | Each app's own | Author Desk has its own (built in 1.0.0) | Own | Fine |
| Whole-book hand-off from Story Tracker to Press (an `.rtbook`) | Story Tracker sends it | Press receives it | Nobody lists the contract | The contract is not written down |
| Typesetting, printer rule checks (KDP and others), trim, spine and cover-wrap sizing, ISBN barcode, book themes (the printed page, separate from the window themes), bundled fonts | RT Press | Story Tracker also bundles page fonts | Press-only, apart from fonts | Fine |
| Exporting and importing document formats (Word, PDF, Markdown, HTML, RTF, EPUB, OpenDocument, Scrivener) | Both Reader (conversions) and Story Tracker (built) do many of the same | Press v1.0 imports Word, Markdown and EPUB, and v1.6 exports Word, Markdown, HTML and plain text, which Story Tracker already builds (Press says it will share the code) | Each has its own | **Overlap to settle** |
| Book layouts (trim sizes, mirrored margins, front and back matter) | Story Tracker (built; its roadmap says to share them with Reader's v4.0) | Press does print files; Reader v4.0 plans book projects | Not decided | **Overlap to settle** |
| Smart search, check links, the Look choice and Metallic, Customize Theme and theme packs, add-ons, adjustable toolbar, Help Center guides, pictures and tables on the page, code signing | Reader (built or planned) | Story Tracker plans each "in Reader's way" (v3.11 to v3.21) | Copied by plan | Candidates for shared code |
| Sync of one file between Story Tracker and Reader | Not decided | Story Tracker v3.20, needs App Link v2; its own v3.19 sync between computers | Planned | To settle with App Link v2 |
| Import from Notion | Reader (built, 3.8: bring a Notion page in) | Story Tracker v3.18 plans its own import and an optional Keep a Notion copy; Author Desk imports Notion data from CSV | Each plans its own | Import only; sending stays Reader's |

## Where the overlaps are

These are the rows marked in bold. They are not mistakes yet; each one is a choice the owner makes, because each one decides whether an app is a copy of another.

1. **Read aloud, dictation, your own AI service, citations.** All four are built in Reader, and other apps plan their own. Story Tracker's roadmap says its read aloud, dictation and AI service reuse Reader's voices, Whisper and service list. The open question is how: either the other apps ask Reader over App Link, or a small shared module (the same way the themes will be shared) holds the code once.
2. **EPUB.** Three apps export EPUBs: Reader (documents), Story Tracker (store-ready, built) and Press (store-ready, planned). The likely split: Story Tracker owns the manuscript EPUB because it is already built, and Press owns print files and covers. Press's planned EPUB row is the one that duplicates.
3. **Pronunciation.** Reader's list and Story Tracker's dictionary should be one list, with Story Tracker as its home. That waits for Story Tracker's Dictionaries (v3.15, not built).
4. **Formats and book layouts.** Reader and Story Tracker both convert many document formats, and book layouts are in Story Tracker with a plan to share them with Reader's v4.0 while Press also does print files. Who owns which is not settled.

## Decisions (the owner, 2026-11-27)

1. **Every app works on its own.** Someone may install only Press, or only Story Tracker, and not Reader. So an app never needs another app to do a job it advertises. Where a feature is shared, it is shared as **one code module** that each app that needs it takes in (the same way the shared themes will be), not by asking Reader. When apps are linked, hand-offs over App Link are a bonus, and Reader is a good reason to install more of the suite, but not a requirement.
2. **So the shared code module is the answer** for read aloud, dictation, your own AI service, citations, document formats and the other overlaps in the table. It will live in a private repo like `neogentrics/recon-theme`. It is not created yet; nothing moves into it until the owner says go.
3. **Exports are built into every app that uses them.** Someone with only Press, or only Story Tracker, gets the export features in that app. When all the apps are used together, **Press can export every file type**, because it is the app used just before uploading to a store or site.
4. **The blurb: Press waits.** Press gets no temporary field. It waits until Author Desk's Listing kit exists, and then asks for the book's description over App Link. Author Desk must have the Listing kit by the time Press reaches the back-cover blurb, so the two roadmaps need matching version targets.
5. **Recon Browser and Audio Studio are on hold.** Their rows in this table stay as they are until the owner starts building them.
6. **The shared code module exists (2026-11-27).** The private repo `neogentrics/recon-core` was created, README only. Read aloud is the first piece: it moves out of Reader after Reader's look update merges, and Story Tracker 3.12 takes it in from there. Apps take the code in by a pinned-tag copy script with a lock file and a drift test, like the themes.
7. **Publishing joins the shared module (2026-11-27).** Sending to blogs, wikis and Discord is not Reader-only: it moves into `recon-core` so Story Tracker (v3.25) and any other app can publish without Reader. Reported by the Story Tracker session as the owner's answer ("join"). Nothing is built until the module has its first piece, read aloud.

Still to settle: which print PDF engine the shared package uses (Story Tracker's Chromium or Press's Typst), and who owns book layouts. Neither blocks anything today.

## Next

- The three active sessions (Story Tracker, Author Desk, Press) update their own roadmaps and notes to match these decisions. Documentation only; nothing is built.
- When the owner says go, the shared code module repo is created and the first pieces are chosen.

## What Press's EPUB adds (Press's own reading, may be stale)

Press read Story Tracker's code as of 3.7 on 6 November. It says Story Tracker's EPUB check only runs in its tests, and in the app a book check only warns, while Press would run EPUBCheck before saving; Story Tracker's EPUB ignores layout settings and embeds no fonts, while Press would carry the print book design (fonts, drop caps, ornaments, part art) into the ebook; and Press's EPUB works for authors who do not use Story Tracker. Everything else is the same engine. Press also says the owner chose on 6 November that Press makes every export for authors who do not use the other apps. These are Press's statements, not checked here, and the choice is the owner's.

## Shared storage

Press copied Story Tracker's encrypted storage once. That is another candidate for shared code.
