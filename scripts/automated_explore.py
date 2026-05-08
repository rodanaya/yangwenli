"""
automated_explore.py — 12-hour autonomous navigation harness for rubli.xyz.

Run with:
    python scripts/automated_explore.py --hours 12 --base https://rubli.xyz \
        --out data/explore_runs/$(date +%Y%m%d_%H%M%S)

What it does
------------
- Picks a route from a curated list (weighted toward Atlas + Thread surfaces)
- Visits it, waits a random duration (5–90s), takes a few random actions:
    * left-click a random visible button/link/SVG body
    * scroll a random direction by a random amount
    * hover a random element
    * press a random key (Esc, Tab, ArrowDown, etc.)
    * occasionally type into a search box
- Logs every action + the resulting URL + timing to a JSONL stream
- Logs console messages (level=error, warning) to a separate stream
- Logs network failures (status >= 400) to a separate stream
- Detects "stuck" states (same URL + no DOM change + no nav for 2 min) and
  attempts recovery (Esc, then back, then reload, then full restart)
- Snapshots a screenshot every 10 minutes + on every detected error
- Restarts the browser every 100 iterations to avoid memory creep
- Writes an hourly summary to <out>/hourly_<HH>.md and a final 12h
  summary to <out>/SUMMARY.md

The output directory contains:
    actions.jsonl       — one line per action, with timing + URL + result
    console.jsonl       — browser console messages (level >= warning)
    network.jsonl       — failed network requests (status >= 400 or timeout)
    stuck.jsonl         — detected stuck states + recovery actions
    screenshots/        — periodic + error screenshots
    hourly_NN.md        — human-readable hourly summary
    SUMMARY.md          — final 12h report (top errors, stuck routes, etc.)

This script is designed to run unattended. It does NOT log any auth state,
does NOT submit forms, does NOT click anything that looks like a money
button. It treats the whole browse as exploratory + read-only.

Limitations
-----------
- The Chrome MCP extension can't be driven from this script — uses a
  vanilla Playwright browser, so it doesn't share the user's Chrome
  session. That's fine for an autonomous explore: it logs in nothing,
  hits public surfaces, leaves no state.
- Doesn't try every action permutation — it samples randomly, which is
  the point (catches surprising bugs, not exhaustive coverage).

Designed to be killed at any time. State is flushed every action.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import random
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext, Response
except ImportError:
    sys.stderr.write(
        "ERROR: playwright not installed. Run:\n"
        "    pip install playwright\n"
        "    python -m playwright install chromium\n"
    )
    sys.exit(1)


# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────

# Curated routes — weights are RELATIVE click probability. Higher weight =
# more visits. Atlas is weighted high because that's the surface under
# active rebuild. Tools and one-shot pages get lower weight.
ROUTES: list[tuple[str, int]] = [
    # Atlas / spatial surfaces — the focus of the rebuild
    ("/atlas", 8),
    ("/atlas?lens=sectors", 6),
    ("/atlas?lens=patterns", 4),
    ("/atlas?lens=categories", 4),
    ("/atlas?lens=sexenios", 3),
    ("/atlas?z1=true&lens=sectors", 6),
    ("/atlas?floor=high", 2),
    ("/atlas?floor=critical", 2),
    ("/atlas?year=2019", 3),
    ("/atlas?year=2024&lens=sectors", 3),

    # Top-level tools
    ("/dashboard", 4),
    ("/aria", 5),
    ("/cases", 4),
    ("/methodology", 2),

    # Sector / category exploration
    ("/sectors", 4),
    ("/sectors?view=categories", 3),
    ("/sectors/salud", 3),
    ("/sectors/educacion", 2),
    ("/sectors/infraestructura", 2),
    ("/sectors/energia", 2),

    # Institution profiles (mix of T1, mid, small)
    ("/institutions", 4),
    ("/institutions/251", 3),    # IMSS (huge)
    ("/institutions/228", 2),    # ISSSTE
    ("/institutions/399", 2),    # SSa
    ("/institutions/1", 2),      # small port authority
    ("/institutions/3744", 2),   # INSABI
    ("/institutions/3780", 1),

    # Vendor profiles + Red Thread
    ("/vendors/29277", 3),       # Grupo Farmacos (T1)
    ("/vendors/4325", 3),        # Vitalmex (T1, 0 contracts)
    ("/vendors/12345", 2),
    ("/thread/29277", 4),
    ("/thread/4325", 4),
    ("/thread/12345", 2),

    # Stories
    ("/stories/era-of-risk", 3),
    ("/stories/institutional-capture", 3),
    ("/stories/the-pharmaceutical-cartel", 2),
    ("/stories/la-estafa-maestra", 2),
    ("/stories/the-covid-year", 2),

    # Investigation / cases
    ("/cases/imss-ghost-company-network", 2),
    ("/cases/segalmex", 2),
    ("/cases/odebrecht", 2),

    # Catch-all + spatial-nav rebuild
    ("/explore", 8),  # bumped weight: this is the surface under active iteration
    ("/explore/legacy", 1),
    ("/networks", 2),
    ("/captura", 2),
    ("/intersection", 2),
    ("/administrations", 2),
    ("/journalists", 1),
]


# Locale toggles to randomly switch
LOCALES = ["es", "en"]

# Keys that occasionally make sense to press
KEYS = ["Escape", "Escape", "Escape", "Tab", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "End", "Home", "PageDown", "PageUp"]

# Search-box queries to type occasionally
SEARCH_QUERIES = [
    "imss", "edenred", "toka", "vitalmex", "segalmex", "pemex",
    "cfe", "issste", "construcción", "medicamentos", "covid",
]


# ────────────────────────────────────────────────────────────────────────────
# State + logging
# ────────────────────────────────────────────────────────────────────────────

class RunState:
    """Holds open file handles, counters, and runtime metadata."""

    def __init__(self, out_dir: Path):
        self.out_dir = out_dir
        self.out_dir.mkdir(parents=True, exist_ok=True)
        (self.out_dir / "screenshots").mkdir(exist_ok=True)
        self.actions_f = (self.out_dir / "actions.jsonl").open("a", encoding="utf-8")
        self.console_f = (self.out_dir / "console.jsonl").open("a", encoding="utf-8")
        self.network_f = (self.out_dir / "network.jsonl").open("a", encoding="utf-8")
        self.stuck_f = (self.out_dir / "stuck.jsonl").open("a", encoding="utf-8")
        self.iter = 0
        self.started_at = datetime.now(timezone.utc)
        self.last_url: str | None = None
        self.last_url_changed_at = time.time()
        self.last_dom_hash: str | None = None
        self.last_dom_hash_at = time.time()
        self.console_errors: Counter[str] = Counter()
        self.network_failures: Counter[str] = Counter()
        self.route_visits: Counter[str] = Counter()
        self.route_errors: Counter[str] = Counter()
        self.stuck_count = 0
        self.recoveries: Counter[str] = Counter()

    def log_action(self, **kw: Any) -> None:
        kw.setdefault("ts", datetime.now(timezone.utc).isoformat())
        kw.setdefault("iter", self.iter)
        self.actions_f.write(json.dumps(kw, ensure_ascii=False) + "\n")
        self.actions_f.flush()

    def log_console(self, **kw: Any) -> None:
        kw.setdefault("ts", datetime.now(timezone.utc).isoformat())
        self.console_f.write(json.dumps(kw, ensure_ascii=False) + "\n")
        self.console_f.flush()

    def log_network(self, **kw: Any) -> None:
        kw.setdefault("ts", datetime.now(timezone.utc).isoformat())
        self.network_f.write(json.dumps(kw, ensure_ascii=False) + "\n")
        self.network_f.flush()

    def log_stuck(self, **kw: Any) -> None:
        kw.setdefault("ts", datetime.now(timezone.utc).isoformat())
        kw.setdefault("iter", self.iter)
        self.stuck_f.write(json.dumps(kw, ensure_ascii=False) + "\n")
        self.stuck_f.flush()

    def close(self) -> None:
        self.actions_f.close()
        self.console_f.close()
        self.network_f.close()
        self.stuck_f.close()


# ────────────────────────────────────────────────────────────────────────────
# Browser setup + listeners
# ────────────────────────────────────────────────────────────────────────────

async def setup_listeners(page: Page, state: RunState) -> None:
    """Wire console + network listeners into the run state."""

    def on_console(msg: Any) -> None:
        try:
            level = msg.type
            text = msg.text or ""
            if level in ("error", "warning"):
                state.log_console(level=level, text=text[:600], url=page.url)
                key = f"{level}:{text[:120]}"
                state.console_errors[key] += 1
        except Exception:
            pass

    def on_pageerror(err: Any) -> None:
        try:
            state.log_console(level="pageerror", text=str(err)[:800], url=page.url)
            state.console_errors[f"pageerror:{str(err)[:120]}"] += 1
        except Exception:
            pass

    async def on_response(resp: Response) -> None:
        try:
            status = resp.status
            url = resp.url
            if status >= 400:
                state.log_network(status=status, url=url, page=page.url)
                state.network_failures[f"{status}:{url[:120]}"] += 1
        except Exception:
            pass

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("response", lambda r: asyncio.create_task(on_response(r)))


async def reset_locale(page: Page, locale: str) -> None:
    """Set i18nextLng in localStorage so the next page load reflects locale."""
    try:
        await page.evaluate(f"localStorage.setItem('i18nextLng', '{locale}')")
    except Exception:
        pass


async def hash_dom(page: Page) -> str:
    """Stable hash of the visible DOM text — used to detect 'stuck' state."""
    try:
        text: str = await page.evaluate("() => document.body && document.body.innerText.slice(0, 5000)")
        return hashlib.md5((text or "").encode("utf-8")).hexdigest()
    except Exception:
        return ""


# ────────────────────────────────────────────────────────────────────────────
# Random behaviors
# ────────────────────────────────────────────────────────────────────────────

async def behavior_click_random(page: Page, state: RunState) -> str:
    """Click a random visible interactive element — link, button, or SVG body."""
    elements = await page.query_selector_all(
        "a[href], button, [role='link'], [role='button'], svg circle[role='button'], svg circle[aria-label]"
    )
    elements = [e for e in elements if await e.is_visible()]
    if not elements:
        return "no_elements"
    el = random.choice(elements)
    try:
        await el.click(timeout=2000)
        return "clicked"
    except Exception as e:
        return f"click_failed:{type(e).__name__}"


async def behavior_scroll(page: Page, _state: RunState) -> str:
    direction = random.choice(["up", "down", "down", "down", "left", "right"])
    delta = random.randint(120, 720)
    try:
        if direction == "down":
            await page.mouse.wheel(0, delta)
        elif direction == "up":
            await page.mouse.wheel(0, -delta)
        elif direction == "left":
            await page.mouse.wheel(-delta, 0)
        else:
            await page.mouse.wheel(delta, 0)
        return f"scroll_{direction}_{delta}"
    except Exception as e:
        return f"scroll_failed:{type(e).__name__}"


async def behavior_hover(page: Page, _state: RunState) -> str:
    elements = await page.query_selector_all(
        "svg circle, [data-vendor-id], [aria-label*='cluster'], a[href], button"
    )
    elements = [e for e in elements if await e.is_visible()]
    if not elements:
        return "no_elements"
    el = random.choice(elements)
    try:
        await el.hover(timeout=2000)
        return "hovered"
    except Exception as e:
        return f"hover_failed:{type(e).__name__}"


async def behavior_press_key(page: Page, _state: RunState) -> str:
    key = random.choice(KEYS)
    try:
        await page.keyboard.press(key)
        return f"pressed_{key}"
    except Exception as e:
        return f"key_failed:{type(e).__name__}"


async def behavior_type_search(page: Page, _state: RunState) -> str:
    inputs = await page.query_selector_all(
        "input[type='search'], input[placeholder*='Buscar'], input[placeholder*='Search']"
    )
    inputs = [i for i in inputs if await i.is_visible()]
    if not inputs:
        return "no_search_box"
    el = random.choice(inputs)
    q = random.choice(SEARCH_QUERIES)
    try:
        await el.fill("")
        await el.type(q, delay=40)
        await asyncio.sleep(random.uniform(1, 3))
        await page.keyboard.press("Escape")
        return f"typed:{q}"
    except Exception as e:
        return f"type_failed:{type(e).__name__}"


BEHAVIORS = [
    (behavior_click_random, 5),
    (behavior_scroll, 4),
    (behavior_hover, 3),
    (behavior_press_key, 1),
    (behavior_type_search, 1),
]


def pick_behavior() -> Any:
    population = [b for b, _ in BEHAVIORS]
    weights = [w for _, w in BEHAVIORS]
    return random.choices(population, weights=weights, k=1)[0]


def pick_route() -> str:
    population = [r for r, _ in ROUTES]
    weights = [w for _, w in ROUTES]
    return random.choices(population, weights=weights, k=1)[0]


# ────────────────────────────────────────────────────────────────────────────
# Stuck detection + recovery
# ────────────────────────────────────────────────────────────────────────────

STUCK_URL_THRESHOLD_S = 120  # 2 min on same URL with no dom change → stuck
STUCK_DOM_THRESHOLD_S = 60


async def detect_stuck(page: Page, state: RunState) -> bool:
    """Return True if the page hasn't changed for too long."""
    cur_url = page.url
    cur_hash = await hash_dom(page)

    now = time.time()
    if cur_url == state.last_url:
        if now - state.last_url_changed_at > STUCK_URL_THRESHOLD_S:
            if cur_hash == state.last_dom_hash and now - state.last_dom_hash_at > STUCK_DOM_THRESHOLD_S:
                return True
    else:
        state.last_url = cur_url
        state.last_url_changed_at = now

    if cur_hash != state.last_dom_hash:
        state.last_dom_hash = cur_hash
        state.last_dom_hash_at = now

    return False


async def attempt_recovery(page: Page, state: RunState, screenshot_path: Path | None = None) -> str:
    """Try to unstick the page. Returns recovery action taken."""
    state.stuck_count += 1
    if screenshot_path is None:
        screenshot_path = state.out_dir / "screenshots" / f"stuck_{state.iter}.png"
    try:
        await page.screenshot(path=str(screenshot_path))
    except Exception:
        pass

    state.log_stuck(url=page.url, screenshot=str(screenshot_path))

    # Step 1: Esc
    try:
        await page.keyboard.press("Escape")
        await asyncio.sleep(2)
        state.recoveries["escape"] += 1
        return "escape"
    except Exception:
        pass

    # Step 2: back
    try:
        await page.go_back(wait_until="domcontentloaded", timeout=10_000)
        await asyncio.sleep(2)
        state.recoveries["go_back"] += 1
        return "go_back"
    except Exception:
        pass

    # Step 3: reload
    try:
        await page.reload(wait_until="domcontentloaded", timeout=15_000)
        await asyncio.sleep(2)
        state.recoveries["reload"] += 1
        return "reload"
    except Exception:
        pass

    state.recoveries["failed"] += 1
    return "failed"


# ────────────────────────────────────────────────────────────────────────────
# Main loop
# ────────────────────────────────────────────────────────────────────────────

async def run_one_iteration(page: Page, state: RunState, base: str) -> None:
    """One iteration: pick route, navigate, take random actions, log."""
    state.iter += 1
    route = pick_route()
    url = base.rstrip("/") + route
    state.route_visits[route] += 1

    # Random locale for ~20% of visits
    if random.random() < 0.2:
        locale = random.choice(LOCALES)
        await reset_locale(page, locale)

    nav_started = time.time()
    nav_ok = False
    nav_err: str | None = None
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        nav_ok = True
    except Exception as e:
        nav_err = type(e).__name__ + ":" + str(e)[:120]
        state.route_errors[route] += 1

    nav_duration_ms = int((time.time() - nav_started) * 1000)
    state.log_action(
        kind="navigate",
        url=url,
        ok=nav_ok,
        err=nav_err,
        duration_ms=nav_duration_ms,
    )

    if not nav_ok:
        await asyncio.sleep(random.uniform(2, 6))
        return

    # Page-level dwell + interaction loop
    dwell_s = random.uniform(5, 90)
    interactions = random.randint(1, 6)
    interaction_delay = dwell_s / max(interactions, 1)

    for _ in range(interactions):
        await asyncio.sleep(random.uniform(interaction_delay * 0.5, interaction_delay * 1.5))
        if await detect_stuck(page, state):
            recovery = await attempt_recovery(page, state)
            state.log_action(kind="stuck_recovery", recovery=recovery, url=page.url)
            break
        behavior = pick_behavior()
        b_started = time.time()
        try:
            result = await behavior(page, state)
        except Exception as e:
            result = f"behavior_threw:{type(e).__name__}:{str(e)[:80]}"
        state.log_action(
            kind="behavior",
            behavior=behavior.__name__,
            result=result,
            duration_ms=int((time.time() - b_started) * 1000),
            url=page.url,
        )

    # Periodic snapshot every 10 iterations
    if state.iter % 10 == 0:
        try:
            shot = state.out_dir / "screenshots" / f"iter_{state.iter:05d}.png"
            await page.screenshot(path=str(shot))
        except Exception:
            pass


async def write_hourly_summary(state: RunState, hour: int) -> None:
    """Render an hourly markdown summary."""
    elapsed = (datetime.now(timezone.utc) - state.started_at).total_seconds() / 3600
    summary = state.out_dir / f"hourly_{hour:02d}.md"
    top_console = state.console_errors.most_common(20)
    top_network = state.network_failures.most_common(20)
    top_routes = state.route_visits.most_common(15)
    top_errors = state.route_errors.most_common(10)
    body = [
        f"# Hour {hour} summary — {elapsed:.1f}h elapsed",
        "",
        f"- iterations: {state.iter}",
        f"- stuck count: {state.stuck_count}",
        f"- recoveries: {dict(state.recoveries)}",
        "",
        "## Top console errors",
        *(f"- ({n}) {k}" for k, n in top_console),
        "",
        "## Top network failures (status >= 400)",
        *(f"- ({n}) {k}" for k, n in top_network),
        "",
        "## Top routes visited",
        *(f"- ({n}) {k}" for k, n in top_routes),
        "",
        "## Routes with nav errors",
        *(f"- ({n}) {k}" for k, n in top_errors),
        "",
    ]
    summary.write_text("\n".join(body), encoding="utf-8")


async def write_final_summary(state: RunState) -> None:
    final = state.out_dir / "SUMMARY.md"
    elapsed = (datetime.now(timezone.utc) - state.started_at).total_seconds() / 3600
    top_console = state.console_errors.most_common(50)
    top_network = state.network_failures.most_common(50)
    top_routes = state.route_visits.most_common(30)
    top_errors = state.route_errors.most_common(20)
    body = [
        f"# RUBLI 12-hour automated explore — final report",
        "",
        f"- started: {state.started_at.isoformat()}",
        f"- elapsed: {elapsed:.2f} hours",
        f"- total iterations: {state.iter}",
        f"- total stuck events: {state.stuck_count}",
        f"- recovery actions: {dict(state.recoveries)}",
        f"- distinct console error patterns: {len(state.console_errors)}",
        f"- distinct network failure patterns: {len(state.network_failures)}",
        "",
        "## Top 50 console errors",
        *(f"- ({n}) {k}" for k, n in top_console),
        "",
        "## Top 50 network failures (HTTP >= 400)",
        *(f"- ({n}) {k}" for k, n in top_network),
        "",
        "## Routes by visit count (top 30)",
        *(f"- ({n}) {k}" for k, n in top_routes),
        "",
        "## Routes with nav errors (top 20)",
        *(f"- ({n}) {k}" for k, n in top_errors),
        "",
        "## Where to look next",
        "",
        "1. The top console errors above tell you what's broken at the renderer.",
        "2. The network failures tell you which endpoints are 4xx/5xx and how often.",
        "3. The routes-with-errors tell you which surfaces failed to even load.",
        "4. Stuck events with screenshots in screenshots/stuck_*.png show where the",
        "   harness couldn't make progress — those are dead ends or modal traps.",
    ]
    final.write_text("\n".join(body), encoding="utf-8")


async def main_async(args: argparse.Namespace) -> None:
    out_dir = Path(args.out)
    state = RunState(out_dir)
    end_at = time.time() + args.hours * 3600

    print(f"Starting 12h explore. Output: {out_dir}")
    print(f"Will end at {datetime.fromtimestamp(end_at).isoformat()}")
    sys.stdout.flush()

    last_hour_written = -1
    iterations_since_browser_restart = 0
    BROWSER_RESTART_EVERY = 100

    async with async_playwright() as p:
        # Outer loop: restart browser every BROWSER_RESTART_EVERY iters to
        # avoid memory creep over 12 hours.
        while time.time() < end_at:
            browser: Browser = await p.chromium.launch(
                headless=args.headless,
                args=["--disable-blink-features=AutomationControlled"],
            )
            context: BrowserContext = await browser.new_context(
                viewport={"width": 1700, "height": 950},
                ignore_https_errors=True,
            )
            page = await context.new_page()
            await setup_listeners(page, state)

            try:
                while iterations_since_browser_restart < BROWSER_RESTART_EVERY and time.time() < end_at:
                    try:
                        await run_one_iteration(page, state, args.base)
                    except Exception as e:
                        state.log_action(
                            kind="iteration_threw",
                            err=f"{type(e).__name__}:{str(e)[:200]}",
                            url=getattr(page, "url", "?"),
                        )
                        # Recover or fall through to outer restart
                        try:
                            await page.goto(args.base, wait_until="domcontentloaded", timeout=15_000)
                        except Exception:
                            break

                    iterations_since_browser_restart += 1

                    # Hourly summary
                    elapsed_h = int((time.time() - state.started_at.timestamp()) // 3600) + 1
                    if elapsed_h != last_hour_written:
                        await write_hourly_summary(state, elapsed_h)
                        last_hour_written = elapsed_h

            finally:
                try:
                    await context.close()
                except Exception:
                    pass
                try:
                    await browser.close()
                except Exception:
                    pass
                iterations_since_browser_restart = 0

    await write_final_summary(state)
    state.close()
    print(f"Done. Final report: {out_dir / 'SUMMARY.md'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="12-hour autonomous navigation harness for rubli.xyz")
    parser.add_argument("--hours", type=float, default=12.0, help="Total run duration (hours)")
    parser.add_argument("--base", default="https://rubli.xyz", help="Base URL")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--headless", action="store_true", default=True, help="Headless mode (default true)")
    parser.add_argument("--headed", dest="headless", action="store_false", help="Run with visible browser")
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
