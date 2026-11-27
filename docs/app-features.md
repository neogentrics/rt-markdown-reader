# Who owns which feature

One place to see which app a feature belongs to, so the same feature isn't built twice and no app is made redundant by another. It is part of [app-suite.md](app-suite.md), and it sits beside the data table "Who owns what" there: that table says where *things* live, this one says where *features* live.

First version, 2026-11-27. It was made by searching every app's `ROADMAP.md` for the features that more than one app mentions, so it is a first pass: each app's session is asked to confirm or correct its own rows. The owner's main session keeps it, and it is updated whenever a session reports a feature.

**The rule.** One feature has one home. The other apps either hand the work to the home app over App Link, or take in one shared module. An app doesn't build its own copy. Where an app needs a small different version, its roadmap says why.

## The map

| Feature | Home | Who else wants it | How it is shared today | Status |
|---|---|---|---|---|
| Themes and looks | The shared themes file (`neogentrics/recon-theme`) | Every app | One shared file | Decided; files move in after Reader 3.13.x |
| Sending to WordPress, Ghost, Discord, wikis and Notion | RT Markdown Reader | Story Tracker, Audio Studio | They hand it the chapter or notes over App Link | Working as designed |
| Writing patterns (repeats, stock phrases, banned phrases) | One shared engine and one shared banned-phrase list | Reader, Story Tracker, Author Desk (blurbs, book descriptions in the Listing kit, promo copy), Audio Studio, and the blurb in Press | Planned, not built | Not scheduled |
| Read aloud with natural voices | RT Markdown Reader (built, 3.2 to 3.12) | Story Tracker (v3.12: matches Reader's read aloud with Reader's offline voices); Audio Studio (v1.13 plans a voice edition with a different, local model); Recon Browser has its own read aloud | Story Tracker plans to reuse Reader's voices; whether that is shared code or a copy is not decided | **Overlap to settle** |
| Dictation (Whisper) | RT Markdown Reader (built) | Story Tracker (v3.22, "Hear it and say it", reusing Reader's offline speech to text); Audio Studio's "hours of speech" builds on Reader's | Both plan to reuse Reader's Whisper; shared code or a copy is not decided | **Overlap to settle** |
| Your own AI service (Claude, ChatGPT, Gemini, Mistral, OpenRouter, Ollama and LM Studio), with a model per task | RT Markdown Reader (built, 3.3) | Story Tracker, Author Desk, Audio Studio, Recon Browser (Ollama) | Story Tracker (v3.17), Author Desk (v1.8) and Audio Studio all say they will follow Reader's service list, with each app's own account and key; the browser has an Ollama bridge | **Settle how the code is shared: Reader's, or one shared module** |
| Citations and bibliography (BibTeX, Zotero) | RT Markdown Reader (built) | Story Tracker (planned) | Each plans its own | **Overlap to settle** |
| EPUB for stores | RT Story Tracker (built: store-ready EPUB, checked) | Press plans its own store-ready EPUB with EPUBCheck; Reader exports an EPUB of a document | Each has its own | **Overlap to settle** |
| Print-ready PDF and covers | RT Press | Reader has a PDF designer for documents (a different job); Author Desk only checks that the cover is ready | Hand-offs | Fine, if Reader's stays for ordinary documents |
| Published facts: editions, ISBNs, prices, store links, release dates | RT Author Desk (already so in "Who owns what") | Story Tracker's catalog shows them | Hand-off | Fine |
| A book's blurb, as its description | RT Author Desk's Listing kit (planned v1.5, not built): one description per book, plus a version per store | Press sets the back-cover blurb and plans its own drafts | Not decided; proposal: Press asks for the book's own description over App Link, not a store version. A short print blurb may need a second field, the owner's call. Until the Listing kit exists, Press keeps a temporary field | **To settle** |
| Sales reports, royalties and pricing | RT Author Desk | Nobody else | Only Author Desk plans these | Fine |
| Covers | RT Press makes them | Author Desk records a cover status (set by hand, or told by Press over App Link) and checks a release date has a final cover; it makes none | Hand-off | Fine |
| Dictionary of invented words, and how to say them | RT Story Tracker (the home in "Who owns what"); its Dictionaries feature is planned (v3.15), not built. Built now: a personal spell-check dictionary, and App Link's `get_fact` can already be asked for dictionary pronunciations | Reader has its own pronunciation list (built, 3.5); Audio Studio reads the dictionary | Two lists exist | **Reader's list can move to read Story Tracker's only after v3.15** |
| Spell check and a personal dictionary | RT Story Tracker (built) | Reader has spell check in its editor | Separate | Fine |
| App Link, the apps status icon, update messages, Help Center, tutorial, command palette | Reader is the reference; each app has its own | Every app | Each builds the same thing by Reader's pattern | Same shape in every app; candidates for shared code |
| Storage rules: permanent IDs and change log | Story Tracker's design | Author Desk (shares it) | Shared in design | Fine |
| The lock, recovery key and trusted computer | Story Tracker's design | Author Desk (shares it) | Shared in design | Fine |
| Sync between computers | RT Markdown Reader | Author Desk ("as in Reader", v1.10); Audio Studio and Recon Browser each plan their own | Each plans its own | Candidates for shared code |
| Backups and Trash | Each app's own | Author Desk has its own (built in 1.0.0) | Own | Fine |
| Exporting and importing document formats (Word, PDF, Markdown, HTML, RTF, EPUB, OpenDocument, Scrivener) | Both Reader (conversions) and Story Tracker (built) do many of the same | Press imports Word, Markdown and EPUB | Each has its own | **Overlap to settle** |
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

## Next

- Each app's session confirms its rows and adds any feature this survey missed.
- The owner decides the three overlaps above. Until then nothing is built for any of them.
- If the answer to the first overlap is "shared module", it goes in a private repo like `recon-theme`, taken in the same way (a script at a pinned tag, with a lock file and a test that fails on drift).
