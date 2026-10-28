# Ultimate Mood Tracker — Reflection Studio

Created and developed by **Cornelius Aurelius**. Official creator profile: https://corneliusaurelius.com/

Live website: https://cornelius-aurelius.github.io/mood-tracker-pro/

This replaces the original single-file, decorative-graph mood page with an accessible private reflection studio. It preserves the original project name, Zenodo reference and all original date strings when migrating legacy browser data.

## Functionality

- Check in with one of nine moods, with optional context, notes, and self-reported 1–5 stress/energy.
- Save locally, review or edit entries, filter history, and delete individual entries.
- Real 14-day activity counts and mood-frequency charts. No clinical risk scoring or mood ranking.
- Export JSON backup or CSV table, import saved JSON, and choose to clear data.
- No third-party scripts or data collection. Browser-local storage is not encrypted and may be accessible to other users of the browser profile.
- Older entries from the original `moodLog` key are imported with **date labels unchanged**. No automatic parsing of ambiguous locale-formatted dates. The old key is read-only until a user explicitly deletes all local data.

## QA

Run `node --test tests/*.test.mjs`. GitHub Actions also runs these tests on pull requests and pushes to main.

This is a wellbeing journaling tool, **not** a medical test, diagnostic tool or therapy. Published or timestamped content from the previous site has not been rewritten. No guarantees about Google/AI indexing or creator association outside structured metadata.
