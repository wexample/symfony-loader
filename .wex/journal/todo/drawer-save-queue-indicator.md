# Save-queue indicator ("Saving… / All changes saved")

Opened: 2026-10-09
Updated: 2026-10-09
Author: agent:archeology-drawers

## Read this first — status of this todo

> **This is a proposal for discussion, not an order to code.** It comes from the 2026-10 "bottom of the drawers" archaeology pass. Read it, then discuss it with the owner: every design choice below is to be challenged and validated **before** any code is written. Do not start implementing on your own.
>
> - **Before anything else**: `/home/weeger/Desktop/WIP/WEB/WEXAMPLE/PACKAGES/PHP/.wex/local/package-agent-intro.md` — where you stand in the suite, what a package must look like, how to work, and how to judge a drawer todo.
> - Context: `/home/weeger/Desktop/WIP/WEB/WEXAMPLE/NETWORK/local/network/.wex/knowledge/readme/archeology/index.md.j2`, `sources.md.j2`, and the drawers page linked below.
> - Safety: `NETWORK/local/network` runs on production data — read its code only, never run anything against it. Anonymize anything taken from it. Never copy secrets found in its history.

Drawers page: `/home/weeger/Desktop/WIP/WEB/WEXAMPLE/NETWORK/local/network/.wex/knowledge/readme/archeology/drawers-bundles-components.md.j2`, section "Save-queue indicator (`AjaxQueue`)".

## What it is

In 2019 network had a tiny queue of pending AJAX saves wired to a status line:
- While at least one request was in flight, the line said "sending…" in orange at 80 % opacity.
- When the queue emptied, it turned green ("saved") and faded to transparent over 4 s.

The spreadsheet-like table editor used it for its per-cell autosave. The class itself was generic. It is the familiar "Saving… / All changes saved" feedback of online editors. Nothing like it exists in `symfony-loader` or `symfony-design-system` today (no pending-request tracking, no `beforeunload` guard).

## Sources

```bash
cd /home/weeger/Desktop/WIP/WEB/WEXAMPLE/NETWORK/archeo/repo.git
B=project/src/Wex/BaseBundle/Resources
git show f6932874e:$B/js/class/AjaxQueue.js        # append/remove, status switch, counter
git show f6932874e:$B/js/class/AjaxQueueItem.js    # wraps success, numbers items
git show f6932874e:$B/js/components/table_editable/TableEditableAjaxQueue.js
git show f6932874e:$B/css/components/_table_editable.scss   # .table-editable-ajax-info.sending / .complete
```

Translation keys used: `ajax_queue.info_box.sending` and `ajax_queue.info_box.complete`.

## What to recover

- The behaviour: a count of pending writes, a status that switches on the first write and the last completion, and a delayed fade.
- Each item's id doubles as the temporary id of a row being created (`SENDING-<n>`).

Missing in 2019, to add: an error state (a TODO in the code), a retry action, a timeout, and a warning when leaving the page while writes are pending.

## Proposed modern shape (suggestion)

- A loader service, for example `PendingWritesService`: `track(promise, {scope})`, a status per scope (`idle | saving | saved | error`), events, and a `beforeunload` guard while anything is pending.
- A small DS component (for example `save-status`) bound to a scope. It can sit in a toolbar or above a grid or form.
- Consumers: the editable grid (`symfony-design-system` todo `drawer-editable-grid.md`), inline fields, autosave forms.

## Open questions

1. Is it a loader service plus a DS component, or a DS component only?
2. Should the global request layer feed it automatically for non-GET requests, or should callers opt in?
3. Wording and the fade timing (4 s in 2019).
