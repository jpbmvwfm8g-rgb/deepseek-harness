# Million-Dollar Year (v1.3.0)

A 12-month investing game for the terminal. Start with $50,000 cash, earn $10,000 and spend $4,000 each month, and try to reach a $1,000,000 net worth by the end of month 12.

## Run

```sh
cd arqs
npm start                  # random seed
node src/cli.js --seed 42  # replayable game
npm test                   # node:test, no dependencies (Node 18+)
```

## Commands

`status`, `buy <asset> <amount|all>`, `sell <asset> <amount|all>`, `next` (end the month), `help`, `quit`.

Assets: `savings`, `index`, `realestate`, `crypto`, `startup`.

## Layout

- `src/rng.js`: seeded generator (mulberry32) and normal sampler.
- `src/game.js`: engine with no I/O. `CONFIG`, `ASSETS` and `EVENTS` hold every tunable.
- `src/cli.js`: readline front end; `execute(state, line)` is exported for tests.
- `test/game.test.js`: engine and CLI tests.
