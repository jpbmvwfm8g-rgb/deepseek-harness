# Handoff: Million-Dollar Year

Status: playable and tested. `cd arqs && npm test` passes 10 tests.

## What exists
A terminal investing game. The engine (`src/game.js`) is pure and seeded, so a given seed and action sequence always gives the same outcome. The CLI (`src/cli.js`) is a thin readline loop over it. See `README.md` for commands and layout.

## Rules as implemented
- 12 months; start $50,000 cash; +$10,000 income and -$4,000 expenses per month.
- Win at net worth >= $1,000,000 (`result()` also assigns a title by tier).
- Each month every asset gets a normal random return (`mean`, `sd` in `ASSETS`); `startup` also has a 6% chance of a 4x jackpot. Returns are floored at -95%.
- 40% chance per month of one event (bonus, medical bill, crash, bull run, rent rise). Events add cash or extra returns.

## Known limits and ideas
- Balance is untuned: reaching $1M mostly requires a startup jackpot. Adjust `CONFIG` and `ASSETS` in `src/game.js`.
- No save/load, leverage, taxes, or price display beyond monthly returns.
- This was written from scratch in this repo. An earlier "v1.3" zip on the owner's machine was never available here, so it may differ from that version.

## Next steps
1. Playtest across seeds and tune `CONFIG`/`ASSETS` so wins are rare but reachable.
2. Add a `results` summary (best/worst asset, event log) at game end.
3. Consider a browser front end reusing `src/game.js` unchanged.
