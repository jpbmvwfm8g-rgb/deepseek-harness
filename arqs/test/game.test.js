import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, gaussian } from '../src/rng.js';
import { CONFIG, advanceMonth, buy, netWorth, newGame, result, sell } from '../src/game.js';
import { execute } from '../src/cli.js';

test('rng is deterministic per seed and stays in [0, 1)', () => {
  const a = createRng(7);
  const b = createRng(7);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(createRng(1)(), createRng(2)());
});

test('gaussian has roughly zero mean and unit variance', () => {
  const rng = createRng(3);
  const xs = Array.from({ length: 20000 }, () => gaussian(rng));
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
  assert.ok(Math.abs(mean) < 0.05);
  assert.ok(Math.abs(variance - 1) < 0.05);
});

test('new game starts with the configured cash and no holdings', () => {
  const g = newGame(1);
  assert.equal(g.cash, CONFIG.startingCash);
  assert.equal(netWorth(g), CONFIG.startingCash);
  assert.equal(g.month, 1);
});

test('buy and sell move money and preserve net worth', () => {
  const g = newGame(1);
  buy(g, 'index', 10_000);
  assert.equal(g.cash, CONFIG.startingCash - 10_000);
  assert.equal(g.holdings.index, 10_000);
  sell(g, 'index', 4_000);
  assert.equal(g.holdings.index, 6_000);
  assert.equal(netWorth(g), CONFIG.startingCash);
});

test('invalid trades are rejected', () => {
  const g = newGame(1);
  assert.throws(() => buy(g, 'gold', 1), /Unknown asset/);
  assert.throws(() => buy(g, 'index', -5), /positive/);
  assert.throws(() => buy(g, 'index', Number.NaN), /positive/);
  assert.throws(() => buy(g, 'index', CONFIG.startingCash + 1), /Not enough cash/);
  assert.throws(() => sell(g, 'index', 1), /only hold/);
});

test('savings-only run grows steadily and ends after 12 months', () => {
  const g = newGame(1);
  buy(g, 'savings', g.cash);
  let last = netWorth(g);
  for (let m = 1; m <= CONFIG.months; m++) {
    const s = advanceMonth(g);
    assert.equal(s.month, m);
    assert.ok(g.cash >= 0);
    if (!s.event) assert.ok(netWorth(g) > last);
    last = netWorth(g);
  }
  assert.ok(g.over);
  assert.throws(() => advanceMonth(g), /over/);
  assert.throws(() => buy(g, 'index', 1), /over/);
});

test('same seed and same actions give the same outcome', () => {
  const play = () => {
    const g = newGame(42);
    buy(g, 'crypto', 20_000);
    buy(g, 'startup', 20_000);
    while (!g.over) advanceMonth(g);
    return netWorth(g);
  };
  assert.equal(play(), play());
});

test('holdings never drop below zero and returns are floored', () => {
  for (let seed = 0; seed < 200; seed++) {
    const g = newGame(seed);
    buy(g, 'crypto', g.cash);
    while (!g.over) {
      const s = advanceMonth(g);
      for (const r of Object.values(s.returns)) assert.ok(r >= -0.95);
      assert.ok(g.holdings.crypto >= 0);
    }
  }
});

test('result tiers reflect net worth', () => {
  const g = newGame(1);
  g.over = true;
  g.cash = CONFIG.goal;
  assert.deepEqual(result(g), { won: true, netWorth: CONFIG.goal, title: 'Millionaire' });
  g.cash = 10;
  assert.equal(result(g).won, false);
  assert.equal(result(g).title, 'Back to the drawing board');
});

test('cli commands drive the game and report errors', () => {
  const g = newGame(5);
  assert.match(execute(g, 'help'), /Commands/);
  assert.match(execute(g, 'buy index 1,000'), /index/);
  assert.equal(g.holdings.index, 1000);
  execute(g, 'sell index all');
  assert.equal(g.holdings.index, 0);
  assert.match(execute(g, 'next'), /Month 1 results/);
  assert.match(execute(g, 'buy'), /Usage/);
  assert.match(execute(g, 'dance'), /Unknown command/);
  assert.equal(execute(g, 'quit'), null);
  for (let i = 0; i < CONFIG.months; i++) if (!g.over) execute(g, 'next');
  assert.ok(g.over);
});
