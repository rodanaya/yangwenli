# Automated explore harness

12-hour autonomous navigation of `https://rubli.xyz` to surface bugs the
user wouldn't catch in a manual session. The harness picks routes
randomly, varies dwell times, performs random clicks/scrolls/hovers/keys,
detects stuck states, and writes a structured log + hourly summaries +
a final report.

## Quick start

```bash
# Install playwright once
pip install playwright
python -m playwright install chromium

# Linux / macOS / WSL
bash scripts/run_explore.sh

# Windows
scripts\run_explore.bat
```

Both launchers default to:
- 12 hours
- Headless
- Output dir `data/explore_runs/<timestamp>/`
- Log file `data/explore_runs/<timestamp>/run.log`

## What it produces

```
data/explore_runs/<stamp>/
├── actions.jsonl         every navigation + interaction, one per line
├── console.jsonl         console errors + warnings
├── network.jsonl         HTTP failures (status >= 400)
├── stuck.jsonl           detected stuck states + recovery actions
├── run.log               stdout/stderr stream
├── screenshots/
│   ├── iter_00010.png    every 10th iteration
│   └── stuck_NNNN.png    on detected stuck states
├── hourly_01.md          per-hour rollup (top errors, top routes, …)
├── hourly_02.md
├── …
└── SUMMARY.md            final 12h report
```

## Configurable behavior

The route list, weights, and behaviors live in `scripts/automated_explore.py`
near the top. You can:

- Add or remove routes from `ROUTES` (with relative weight)
- Adjust per-iteration dwell time (currently 5–90s)
- Adjust random behavior weights (click 5x, scroll 4x, hover 3x, key 1x, search 1x)
- Tune stuck thresholds (URL+DOM unchanged for 2 min → stuck)
- Tune browser-restart frequency (every 100 iterations to avoid memory creep)

## Limitations

- Uses a fresh Playwright Chromium, not your authenticated browser.
  All routes hit are public; no login required for /atlas, /aria, /cases,
  /sectors, /institutions, /vendors, /thread, /stories, /methodology.
- The script does NOT submit forms, click "send", or interact with anything
  that looks like a transaction button.
- Headless mode is the default. Add `--headed` to watch.
- Roughly 250–400 iterations expected per hour depending on dwell + nav speed.

## Running shorter sanity checks

```bash
# 30-minute smoke test
bash scripts/run_explore.sh --hours 0.5

# 1-hour test with visible browser
bash scripts/run_explore.sh --hours 1 --headed

# Custom base (e.g., local dev)
bash scripts/run_explore.sh --base http://localhost:3009 --hours 0.25
```

## Reading the output

After the run finishes:

1. `SUMMARY.md` — start here. Top console errors, top network failures,
   route visit counts, routes that 4xx/5xx'd, recovery actions taken.
2. `screenshots/stuck_*.png` — every detected dead-end with a screenshot.
3. `actions.jsonl | jq` — full event stream if you need to reproduce a
   specific failure.

## Recommended workflow

1. Launch the harness before going to bed.
2. In the morning, read `SUMMARY.md` + look at `stuck_*.png` screenshots.
3. Hand the file to me and I'll triage findings into Issue #N tickets.
