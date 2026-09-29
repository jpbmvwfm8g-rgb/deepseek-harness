#!/usr/bin/env node
/**
 * Terminal front end for Million-Dollar Year.
 * Usage: node src/cli.js [--seed <integer>]
 */
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { ASSETS, CONFIG, advanceMonth, buy, netWorth, newGame, result, sell } from './game.js';

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (r) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`;

function status(state) {
  const lines = [`Month ${state.month}/${CONFIG.months}   Net worth ${money(netWorth(state))}   Goal ${money(CONFIG.goal)}`, `  cash ${money(state.cash)}`];
  for (const [key, value] of Object.entries(state.holdings)) lines.push(`  ${key.padEnd(10)} ${money(value).padStart(12)}  (${ASSETS[key].label})`);
  return lines.join('\n');
}

const HELP = `Commands:
  status                 show your portfolio
  buy <asset> <amount>   invest cash ("all" spends everything)
  sell <asset> <amount>  cash out ("all" sells the whole holding)
  next                   end the month
  help | quit
Assets: ${Object.keys(ASSETS).join(', ')}`;

function amountFor(state, verb, asset, raw) {
  if (raw === 'all') return verb === 'buy' ? state.cash : state.holdings[asset];
  return Number(raw.replace(/[$,]/g, ''));
}

/**
 * Runs one command line against the game.
 * @param {object} state Game state.
 * @param {string} line User input.
 * @returns {string|null} Text to print, or null to quit.
 */
export function execute(state, line) {
  const [cmd = '', asset, raw] = line.trim().toLowerCase().split(/\s+/);
  switch (cmd) {
    case '':
      return '';
    case 'help':
      return HELP;
    case 'status':
      return status(state);
    case 'quit':
    case 'exit':
      return null;
    case 'buy':
    case 'sell': {
      if (!asset || !raw) return `Usage: ${cmd} <asset> <amount>`;
      (cmd === 'buy' ? buy : sell)(state, asset, amountFor(state, cmd, asset, raw));
      return status(state);
    }
    case 'next': {
      const s = advanceMonth(state);
      const moves = Object.entries(s.returns).map(([k, r]) => `${k} ${pct(r)}`).join(', ');
      const out = [`Month ${s.month} results: ${moves}`];
      if (s.event) out.push(`Event: ${s.event.text}`);
      if (state.over) {
        const r = result(state);
        out.push(`\nFinal net worth ${money(r.netWorth)} - ${r.title}${r.won ? ' - YOU WIN!' : ''}`);
      } else out.push(status(state));
      return out.join('\n');
    }
    default:
      return `Unknown command "${cmd}". Type "help".`;
  }
}

async function main() {
  const i = process.argv.indexOf('--seed');
  const state = i > -1 ? newGame(Number.parseInt(process.argv[i + 1], 10)) : newGame();
  const rl = createInterface({ input: stdin, output: stdout });
  console.log(`Million-Dollar Year (seed ${state.seed}). Turn ${money(CONFIG.startingCash)} into ${money(CONFIG.goal)} in ${CONFIG.months} months.\n${HELP}\n${status(state)}`);
  rl.setPrompt('> ');
  rl.prompt();
  for await (const line of rl) {
    try {
      const out = execute(state, line);
      if (out === null) break;
      if (out) console.log(out);
    } catch (err) {
      console.log(`! ${err.message}`);
    }
    if (state.over) break;
    rl.prompt();
  }
  rl.close();
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
