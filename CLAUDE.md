# texasplayoffs.com

UIL football playoff officiating tracker: which TASO chapter worked which game. React + Vite,
deployed to GitHub Pages on every push to `main`. Season data lives in `public/data/<year>.json`.

## Rules for changing data

- **Team names: ask before merging.** Never rename a team, or change a name so it matches another
  team's, unless it is certain or the site owner confirmed it. If there is any doubt about
  whether two names are the same school, list the cases and ask first. Confirmed names go in
  `season/team_names.json`; `scripts/team_names.py` applies them and holds back anything uncertain.
- Chapter assignments and scores come from the owner's records. Don't fill gaps by guessing;
  ask, and leave a game blank if the owner says their records are blank.
- 1A plays weeks 1-4, has an open week 5, and plays its state final in week 6 with everyone else.

## In-season pipeline

`scripts/season.py prefill` pulls brackets (UIL PDFs, else MaxPreps) into
`season/<year>/<year>_season.xlsx`; `build` turns that into `public/data/<year>.json`.
`.github/workflows/season.yml` runs both daily in Nov-Dec, on workbook upload, and on demand.
