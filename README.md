# Bee Today

Bee Today is a small, mobile-first commitment layer on top of **one Beeminder goal**. It keeps multiple scheduled commitments inside the app, asks for an explicit daily status, and syncs one aggregate score to Beeminder.

## Data model

Goal configuration is a versioned JSON document (`{ version: 1, commitments: [...] }`) encoded after the `[bee-commit:v1]` marker in the selected goal's title. A local copy is cached for offline startup. Each commitment has a stable ID, name, repeat weekdays, deadline, strict flag, and (for strict commitments) a random disable secret.

Daily logs are keyed by the original `YYYYMMDD` day and commitment ID. States are `unlogged`, `completed`, `snoozed`, and `missed`. Before the deadline, an absent entry remains unlogged; after it, the effective state is missed. Snoozes are allowed only before the deadline and never for strict commitments.

## Aggregation and sync

The daily datapoint value is `(completed + snoozed) / due`. A missed strict commitment overrides that fraction to `0`. The datapoint comment records schema version, original date, counts for every state, strict-failure status, and each commitment's state so completed and snoozed work remain analytically distinct.

Sync uses Beeminder's `daystamp` to preserve the original day and a stable `requestid` (`bee-commit-v1-YYYYMMDD`) for idempotent create/update retries. Failed requests leave the log in local storage and display a retry state; network failures are never converted into commitment misses.

## API findings and constraints

The official Beeminder API supports creating backdated datapoints with `daystamp`, arbitrary comments, idempotent upserts with `requestid`, and updating an existing datapoint by ID. Goal updates document `title` but do not document `fineprint` as writable. This implementation therefore stores configuration in the goal title and enforces Beeminder's 255-character title limit. That limit is the main current constraint on the number and length of commitments; moving durable configuration to a purpose-built remote store would be required for an unbounded list.

## Accountability edge cases

- A user can still edit data directly in Beeminder, change their device clock, clear local storage before it syncs, or edit/remove the encoded title. This frontend cannot make those paths tamper-proof.
- Strict mode prevents snoozing and locks edits/deletion. Disabling requires the generated secret, but a secret stored in the goal metadata is deterrence rather than cryptographic security.
- A day with no due commitments scores `1`; the UI does not create a datapoint unless the user explicitly saves.
- Logging remains editable throughout the day. The stable request ID updates the same daily datapoint rather than creating duplicates.
- Weekday/deadline evaluation currently follows the device timezone. A future schema can add an explicit timezone without changing existing records.

## Run and test

```sh
node commitments.test.js
python3 -m http.server 8000
```

On localhost the app provides a clearly local sample setup when no credentials are configured.
