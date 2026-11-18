// The polls of a page, on a fake clock and a fake page: read on the interval,
// once for owners sharing a key, not while hidden — and at once when seen
// again —, longer apart while failing, stopped with their owner or once
// what they waited for came.
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);

const listeners = new Map<string, () => void>();
(globalThis as any).document = { hidden: false };
(globalThis as any).window = globalThis;

const { default: PollingService } = await import('../../assets/js/Services/PollingService.ts');

function service() {
  const app = {
    services: {} as Record<string, unknown>,
    getServiceOrFail: () => ({ listen: (name: string, callback: () => void) => listeners.set(name, callback) }),
  };
  const polling = new PollingService(app as any);
  // Its `app` field, declared bare, is set again — to nothing — once node
  // strips the types: given back here, as the bundler's build keeps it.
  (polling as any).app = app;
  polling.registerHooks().app.hookInit();

  return polling;
}

beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
  (globalThis as any).document.hidden = false;
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('read on the interval, each answer told', async () => {
  const polling = service();
  const answers: number[] = [];
  let count = 0;
  polling.start({ owner: {}, intervalMs: 1000, read: () => ++count, onResult: (n: number) => answers.push(n) });

  mock.timers.tick(1000); await flush();
  mock.timers.tick(1000); await flush();

  assert.deepEqual(answers, [1, 2]);
});

test('one reading for the owners of a key', async () => {
  const polling = service();
  const read = mock.fn(() => 'figures');
  const told: string[] = [];
  polling.start({ owner: {}, key: 'analytics-now', intervalMs: 1000, read, onResult: () => told.push('a') });
  polling.start({ owner: {}, key: 'analytics-now', intervalMs: 1000, read, onResult: () => told.push('b') });

  mock.timers.tick(1000); await flush();

  assert.equal(read.mock.callCount(), 1);
  assert.deepEqual(told, ['a', 'b']);
});

test('not read while hidden, read at once when seen again', async () => {
  const polling = service();
  const read = mock.fn(() => 1);
  polling.start({ owner: {}, intervalMs: 1000, read });
  (globalThis as any).document.hidden = true;

  mock.timers.tick(1000); await flush();
  assert.equal(read.mock.callCount(), 0);

  (globalThis as any).document.hidden = false;
  listeners.get('visibilitychange')!();
  await flush();
  assert.equal(read.mock.callCount(), 1);
});

test('a failing reading waits twice as long', async () => {
  const polling = service();
  const read = mock.fn(() => { throw new Error('down'); });
  mock.method(console, 'warn', () => {});
  polling.start({ owner: {}, intervalMs: 1000, read });

  mock.timers.tick(1000); await flush();
  assert.equal(read.mock.callCount(), 1);
  mock.timers.tick(1000); await flush();
  assert.equal(read.mock.callCount(), 1);
  mock.timers.tick(1000); await flush();
  assert.equal(read.mock.callCount(), 2);
});

test('stopped with its owner, or once what it waited for came', async () => {
  const polling = service();
  const owner = {};
  const read = mock.fn(() => 'running');
  polling.start({ owner, intervalMs: 1000, read });
  polling.stopOwner(owner);
  mock.timers.tick(5000); await flush();
  assert.equal(read.mock.callCount(), 0);

  let state = 'running';
  const until = mock.fn(() => state === 'done');
  const reads = mock.fn(() => state);
  polling.start({ owner: {}, intervalMs: 1000, read: reads, until });
  mock.timers.tick(1000); await flush();
  state = 'done';
  mock.timers.tick(1000); await flush();
  mock.timers.tick(5000); await flush();
  assert.equal(reads.mock.callCount(), 2);
});
