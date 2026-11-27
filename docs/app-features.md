# Who owns which feature

One place to see which app a feature belongs to, so the same feature isn't built twice and no app is made redundant by another. It is part of [app-suite.md](app-suite.md), and it sits beside the data table "Who owns what" there: that table says where *things* live, this one says where *features* live.

First version, 2026-11-27. It was made by searching every app's `ROADMAP.md` for the features that more than one app mentions, so it is a first pass: each app's session is asked to confirm or correct its own rows. The owner's main session keeps it, and it is updated whenever a session reports a feature.

**The rule.** One feature has one home. The other apps either hand the work to the home app over App Link, or take in one shared module. An app doesn't build its own copy. Where an app needs a small different version, its roadmap says why.

## The map

| Feature | Home | Who else wants it | How it is shared today | Status |
|---|---|---|---|---|
| Themes and looks | The shared themes file (`neogentrics/recon-theme`) | Every app | One shared file | Decided; files move in after Reader 3.13.x |
| Sending to WordPress, Ghost, Discord, wikis and Notion | RT Markdown Reader | Story Tracker, Audio Studio | They hand it the chapter or notes over App Link | Working as designed |
| Writing patterns (repeats, stock phrases, banned phrases) | One shared engine and one shared banned-phrase list | Reader, Story Tracker, Author Desk, Audio Studio, and the blurb in Press | Planned, not built | Not scheduled |
| Read aloud with natural voices | RT Markdown Reader (built, 3.2 to 3.12) | Story Tracker (v3.12 plans its own); Audio Studio (v1.13 plans a voice edition with a different, local model); Recon Browser has its own read aloud | Each plans its own | **Overlap to settle** |
| Dictation (Whisper) | RT Markdown Reader (built) | Story Tracker (planned); Audio Studio's "hours of speech" builds on Reader's | Each plans its own | **Overlap to settle** |
| Your own AI service (Claude, ChatGPT, Gemini, Mistral, OpenRouter, Ollama and LM Studio), with a model per task | RT Markdown Reader (built, 3.3) | Story Tracker, Author Desk, Audio Studio, Recon Browser (Ollama) | Each plans its own; Audio Studio says "Reader's service list" | **Four copies planned** |
| Citations and bibliography (BibTeX, Zotero) | RT Markdown Reader (built) | Story Tracker (planned) | Each plans its own | **Overlap to settle** |
| EPUB for stores | RT Story Tracker (built: store-ready EPUB, checked) | Press plans its own store-ready EPUB with EPUBCheck; Reader exports an EPUB of a document | Each has its own | **Overlap to settle** |
| Print-ready PDF and covers | RT Press | Reader has a PDF designer for documents (a different job); Author Desk only checks that the cover is ready | Hand-offs | Fine, if Reader's stays for ordinary documents |
| Dictionary of invented words, and how to say them | RT Story Tracker (the home in "Who owns what") | Reader has its own pronunciation list (built, 3.5); Audio Studio reads the dictionary | Two lists exist | **Move Reader's to read Story Tracker's** |
| Spell check and a personal dictionary | RT Story Tracker (built) | Reader has spell check in its editor | Separate | Fine |
| App Link, the apps status icon, update messages, Help Center, tutorial, command palette | Reader is the reference; each app has its own | Every app | Each builds the same thing by Reader's pattern | Same shape in every app; candidates for shared code |
| Storage rules (permanent IDs, change log, backups, sync) | Story Tracker and Author Desk share one design | Reader has its own sync; Audio Studio and Recon Browser each plan sync | Each plans its own | Candidates for shared code |

## Where the overlaps are

These are the rows marked in bold. They are not mistakes yet; each one is a choice the owner makes, because each one decides whether an app is a copy of another.

1. **Read aloud, dictation, your own AI service, citations.** All four are built in Reader, and other apps plan their own. Either the other apps ask Reader over App Link, or a small shared module (the same way the themes will be shared) holds the code once.
2. **EPUB.** Three apps export EPUBs: Reader (documents), Story Tracker (store-ready, built) and Press (store-ready, planned). The likely split: Story Tracker owns the manuscript EPUB because it is already built, and Press owns print files and covers. Press's planned EPUB row is the one that duplicates.
3. **Pronunciation.** Reader's list and Story Tracker's dictionary should be one list, with Story Tracker as its home.

## Next

- Each app's session confirms its rows and adds any feature this survey missed.
- The owner decides the three overlaps above. Until then nothing is built for any of them.
- If the answer to the first overlap is "shared module", it goes in a private repo like `recon-theme`, taken in the same way (a script at a pinned tag, with a lock file and a test that fails on drift).
