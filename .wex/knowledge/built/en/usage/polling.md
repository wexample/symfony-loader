What a page reads again on a clock goes through one service, `PollingService` (`app.services.polling`), registered with every app: a page of figures that moves while it is read, a run that goes on until it is done.

## Polling is chosen, never fallen back on

Live updates (`LiveUpdatesService`, Mercure) and polling are two designs, chosen where a page is designed: live where the server publishes what changes and a connection held open is worth it, polling where it does not — an app without Mercure, figures read once a minute. Nothing switches from one to the other by itself. A component says which it does: a live source, or a poll — with its interval.

## What every poll does alike

```ts
const handle = app.services.polling.start({
  owner: this,                 // stopped with it: stopOwner(this)
  key: 'analytics-now',        // owners reading the same source share one reading
  intervalMs: 60_000,
  read: () => fetchFigures(),  // its answer handed to every owner…
  onResult: (figures) => this.show(figures),
  until: (figures) => figures.done, // …and the poll stops once it is the last one waited for
  immediate: false,            // read at once rather than after a first interval
});

handle.refresh(); // read now, the clock starting again from there
handle.stop();    // this owner stops; the poll with it when it was the last
```

- **Owned**: a poll belongs to its owner and stops with it.
- **Shared**: owners giving the same `key` read the source once between them, each told; the interval is the shortest asked.
- **Only when seen**: a hidden page, or a connection down (`ConnectionStatusService`), is not read; the reading missed is done at once when the page is seen again or the connection is back.
- **Patient when failing**: a reading that throws doubles the wait before the next, up to eight times the interval; one that succeeds brings the interval back.
- **Finite**: `until` ends a poll once what it waited for came.

In a vue component, the design system's `PollingVueMixin` gives `this.poll({ … })`, the component its owner; a chart takes `poll` in seconds (symfony-charts-ds); an entity collection its `getPollingIntervalMs()` (symfony-design-system). They all go through this service.

## Tests

`tests/js/PollingService.test.ts` runs on node alone (22.18 and up, which strips the types): `node --test 'tests/js/*.test.ts'`. `tests/js/hooks.mjs` resolves the imports as the bundler does and stands an empty class in for the app, the service handed a fake one.
