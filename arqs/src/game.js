/**
 * Game engine for Million-Dollar Year. Pure logic with no I/O: the CLI and
 * the tests both drive it through these functions.
 */
import { createRng, gaussian } from './rng.js';

export const CONFIG = Object.freeze({
  months: 12,
  goal: 1_000_000,
  startingCash: 50_000,
  monthlyIncome: 10_000,
  monthlyExpenses: 4_000,
  eventChance: 0.4,
});

/**
 * Monthly return model per asset: `mean` and `sd` describe a normal return;
 * `jackpotChance` / `jackpotMultiplier` add a rare multiplicative windfall.
 */
export const ASSETS = Object.freeze({
  savings: { label: 'High-yield savings', mean: 0.003, sd: 0 },
  index: { label: 'Index fund', mean: 0.008, sd: 0.04 },
  realestate: { label: 'Rental property', mean: 0.01, sd: 0.02 },
  crypto: { label: 'Crypto', mean: 0.03, sd: 0.3 },
  startup: { label: 'Startup equity', mean: 0.02, sd: 0.25, jackpotChance: 0.06, jackpotMultiplier: 4 },
});

const MIN_RETURN = -0.95;

/**
 * Random events. `cash` adds a flat amount; `shocks` maps an asset to an extra
 * return applied that month.
 */
export const EVENTS = Object.freeze([
  { id: 'bonus', text: 'Your boss hands you a surprise bonus.', cash: 5_000 },
  { id: 'medical', text: 'An unexpected medical bill arrives.', cash: -3_000 },
  { id: 'crash', text: 'Markets crash.', shocks: { index: -0.15, crypto: -0.3, startup: -0.1 } },
  { id: 'bull', text: 'A bull run lifts risky assets.', shocks: { index: 0.08, crypto: 0.25, startup: 0.1 } },
  { id: 'housing', text: 'Rents climb in your city.', shocks: { realestate: 0.05 } },
]);

/**
 * Starts a new game.
 * @param {number} [seed] Seed for the game's random events and returns.
 * @returns {object} Game state; pass it to the other functions.
 */
export function newGame(seed = Date.now() % 2 ** 31) {
  return {
    seed,
    rng: createRng(seed),
    month: 1,
    cash: CONFIG.startingCash,
    holdings: Object.fromEntries(Object.keys(ASSETS).map((k) => [k, 0])),
    history: [],
    over: false,
  };
}

/**
 * @param {object} state Game state.
 * @returns {number} Cash plus the value of every holding.
 */
export function netWorth(state) {
  return state.cash + Object.values(state.holdings).reduce((sum, v) => sum + v, 0);
}

function assertActive(state) {
  if (state.over) throw new Error('The game is over.');
}

function assertAsset(asset) {
  if (!Object.hasOwn(ASSETS, asset)) {
    throw new Error(`Unknown asset "${asset}". Choose from: ${Object.keys(ASSETS).join(', ')}.`);
  }
}

function assertAmount(amount) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive number.');
}

/**
 * Moves cash into an asset.
 * @param {object} state Game state.
 * @param {string} asset Key of {@link ASSETS}.
 * @param {number} amount Dollars to invest; must not exceed cash.
 * @returns {object} The same state.
 */
export function buy(state, asset, amount) {
  assertActive(state);
  assertAsset(asset);
  assertAmount(amount);
  if (amount > state.cash + 1e-9) throw new Error('Not enough cash.');
  const spend = Math.min(amount, state.cash);
  state.cash -= spend;
  state.holdings[asset] += spend;
  return state;
}

/**
 * Moves an asset back into cash.
 * @param {object} state Game state.
 * @param {string} asset Key of {@link ASSETS}.
 * @param {number} amount Dollars to sell; must not exceed the holding.
 * @returns {object} The same state.
 */
export function sell(state, asset, amount) {
  assertActive(state);
  assertAsset(asset);
  assertAmount(amount);
  if (amount > state.holdings[asset] + 1e-9) throw new Error(`You only hold ${state.holdings[asset].toFixed(2)} in ${asset}.`);
  const proceeds = Math.min(amount, state.holdings[asset]);
  state.holdings[asset] -= proceeds;
  state.cash += proceeds;
  return state;
}

function monthlyReturn(state, asset) {
  const model = ASSETS[asset];
  let r = model.mean + model.sd * gaussian(state.rng);
  if (model.jackpotChance && state.rng() < model.jackpotChance) {
    r = (1 + r) * model.jackpotMultiplier - 1;
  }
  return Math.max(r, MIN_RETURN);
}

/**
 * Ends the month: applies returns and at most one event, then pays income
 * minus expenses. After month 12 the game ends.
 * @param {object} state Game state.
 * @returns {{month: number, event: object|null, returns: Record<string, number>, netWorth: number}} Summary of the month.
 */
export function advanceMonth(state) {
  assertActive(state);
  const event = state.rng() < CONFIG.eventChance ? EVENTS[Math.floor(state.rng() * EVENTS.length)] : null;
  const returns = {};
  for (const asset of Object.keys(ASSETS)) {
    const r = Math.max(monthlyReturn(state, asset) + (event?.shocks?.[asset] ?? 0), MIN_RETURN);
    returns[asset] = r;
    state.holdings[asset] *= 1 + r;
  }
  state.cash += CONFIG.monthlyIncome - CONFIG.monthlyExpenses + (event?.cash ?? 0);
  const summary = { month: state.month, event, returns, netWorth: netWorth(state) };
  state.history.push(summary);
  if (state.month >= CONFIG.months) state.over = true;
  else state.month += 1;
  return summary;
}

/**
 * @param {object} state Game state.
 * @returns {{won: boolean, netWorth: number, title: string}} Outcome for a finished game.
 */
export function result(state) {
  const worth = netWorth(state);
  const tiers = [
    [CONFIG.goal, 'Millionaire'],
    [500_000, 'High roller'],
    [200_000, 'Solid investor'],
    [CONFIG.startingCash, 'Steady saver'],
    [0, 'Back to the drawing board'],
  ];
  const title = tiers.find(([min]) => worth >= min)[1];
  return { won: worth >= CONFIG.goal, netWorth: worth, title };
}
