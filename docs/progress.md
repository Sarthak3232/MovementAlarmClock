# Implementation progress

## 2026-10-04 — Versioned wake-up session persistence

### Scope

- Added strict runtime validation for loaded wake-up sessions, including identity, canonical timestamps, rep bounds, terminal challenge metadata, and independent system-alarm stop metadata.
- Added a version-1 wake-up session repository and dedicated Expo FileSystem store.
- Serialized occurrence creation and event mutations so concurrent callbacks cannot lose records.
- Preserved occurrence deduplication and challenge/system-alarm outcomes across repository recreation while avoiding writes for replayed occurrences and duplicate or ignored events.
- Rejected malformed JSON, unsupported versions, invalid session states, and duplicate session or occurrence IDs without overwriting the stored value.

### Evidence

Local validation on Linux with Node 24.19.0:

- Focused Jest coverage passed for valid/invalid session decoding, repository recreation, replayed callbacks, concurrent occurrence creation, movement completion, later confirmed alarm stop, duplicate-event writes, corrupt storage, unknown schemas, and the Expo file boundary.
- Full static, unit/component, dependency, and iOS JavaScript export results are recorded on the pull request for this change.

The persistence and callback-idempotency portion of roadmap Day 9 now works behind a typed repository boundary. The milestone remains **in progress** because neither the app nor an AlarmKit adapter opens persisted occurrences, and no end-to-end native flow has been observed.

### Boundaries and next run

- Movement completion returns a `request-system-alarm-stop` effect while persisting a completed challenge whose system alarm remains `ringing`; only a later confirmed stop event persists `stopped`.
- The repository uses a separate session file and is not yet instantiated by the current app routes. Automated repository recreation is not evidence of an iPhone app-termination/relaunch result.
- No Xcode build, simulator launch, signing check, physical-iPhone test, AlarmKit callback, native alarm stop, camera trial, raw-frame processing, or movement calibration ran in this environment.
- If native access is still unavailable, the next independent work is to connect challenge recovery and counter events to a persisted session controller through dependency-injected boundaries, without claiming live camera or AlarmKit support.

## 2026-10-03 — Wake-up session lifecycle

### Scope

- Added a typed wake-up session model with independent challenge and system-alarm state.
- Added monotonic rep progress plus terminal `completed`, `fallback`, and `abandoned` challenge outcomes.
- Made movement completion emit a system-stop request effect without claiming the alarm stopped; only a separate confirmation records the system stop and its source.
- Added a pure occurrence registry that reuses one session for replayed callbacks, rejects identity collisions, and updates only the matching occurrence.
- Documented the lifecycle contract and remaining persistence/native adapter work.

### Evidence

Local validation on Linux with Node 24.19.0:

- Focused Jest coverage passed for duplicate occurrence delivery, distinct repeating occurrences, ID collisions, stale/duplicate progress, movement completion, stop requests, confirmed system dismissal, fallback, abandonment, and invalid input.
- Full static, unit/component, dependency, and iOS JavaScript export results are recorded on the pull request for this change.

The independent state-machine and callback-idempotency portion of roadmap Day 9 is implemented. The milestone remains **in progress** because sessions are not persisted, no AlarmKit occurrence opens the app, and no end-to-end native flow has been observed.

### Boundaries and next run

- The occurrence registry is a pure collection operation. Callers must persist its returned records before it can survive app termination.
- A `request-system-alarm-stop` effect is intent, not evidence of a successful stop. The system remains `ringing` until a distinct confirmation event arrives.
- System dismissal never increments reps or changes the challenge outcome. A completed, abandoned, or fallback challenge never overwrites a different terminal outcome.
- No Xcode build, simulator launch, signing check, physical-iPhone test, AlarmKit trial, camera trial, raw-frame processing, or movement calibration ran in this environment.
- If native access is still unavailable, the next independent work is a versioned wake-up-session repository so occurrence deduplication and outcomes survive reload.

## 2026-10-02 — Challenge recovery and accessibility states

### Scope

- Added an explicit camera-access state model for not connected, requesting, ready, permission denied, unavailable, and interrupted conditions.
- Kept movement processing gated to ready camera state in movement mode. Selecting the fallback blocks pose processing and never represents five completed reps.
- Replaced the static challenge card with accessible progress semantics, announced status text, safe framing guidance, permission Settings/retry actions, and a reversible non-camera fallback preview.
- Added component coverage for permission denial, camera failure, interruption, injected progress, fallback boundaries, and direct challenge navigation.

### Evidence

Local validation on Linux with Node 24.19.0:

- Focused state and component tests passed for all modeled recovery paths.
- Full static, unit/component, dependency, and iOS JavaScript export results are recorded on the pull request for this change.

The independent state-model, recovery-copy, and accessibility portion of roadmap Day 10 is implemented. The milestone remains **in progress** because no camera adapter requests permission, produces frames, reports interruptions, or verifies recovery on an iPhone.

### Boundaries and next run

- The default screen remains `not-connected`; denied, unavailable, interrupted, and ready states are dependency-injection seams for the future on-device adapter, not claims of observed camera behavior.
- Choosing the fallback in this preview does not persist a session outcome, stop an iPhone system alarm, or mark movement complete.
- No raw image or camera frame is read, stored, or uploaded.
- No Xcode build, simulator launch, signing check, physical-iPhone test, AlarmKit trial, camera trial, or movement calibration ran in this environment.
- If native access is still unavailable, the next independent work is roadmap Day 9's wake-up-session lifecycle model: idempotent occurrence handling and separate system-dismissal, movement-completion, and fallback outcomes.

## 2026-10-01 — Timezone and daylight-saving policy

### Scope

- Defined recurring alarms as device-local wall-clock schedules whose weekdays are evaluated in the current IANA time zone.
- Added a pure local-date/time resolver that chooses the first occurrence of a repeated fall-back minute and advances a nonexistent spring-forward time to the first valid minute after the gap.
- Added next-occurrence calculation for selected weekdays, including recalculation in a new time zone after travel.
- Documented the native reconciliation contract and the remaining ambiguity for one-time records, which do not yet persist a target date.

### Evidence

Local validation on Linux with Node 24.19.0:

- Focused Jest coverage passed for ordinary local times, the 2026 Pacific spring-forward and fall-back transitions, weekday rollover across a DST boundary, repeated-hour suppression, invalid inputs, and a Pacific-to-Eastern time-zone change.
- Full static, unit/component, dependency, and iOS JavaScript export results are recorded on the pull request for this change.

The independent policy and deterministic-calculation portion of roadmap Day 11 is implemented. The milestone remains **in progress** because the AlarmKit adapter and launch/resume/significant-time-change reconciliation do not exist, and no lifecycle behavior has been exercised on an iPhone.

### Boundaries and next run

- These calculations return reference instants only; they do not schedule, cancel, enable, or deliver an alarm.
- An empty repeat selection is still displayed as “Once,” but the current record has no target date. Such records must stay unscheduled until that contract is implemented rather than guessing from time alone.
- No Xcode build, simulator launch, signing check, physical-iPhone test, AlarmKit trial, camera trial, or movement calibration ran in this environment.
- If native access is still unavailable, the next independent work is roadmap Day 10 recovery/accessibility: model challenge permission/failure states and add an honest fallback UI without claiming live camera support.

## 2026-09-30 — Saved alarm CRUD UI

### Scope

- Added reusable alarm-form rules for names, 24-hour local time input, repeat weekdays, creation, and edits.
- Connected the Expo Router layout to one file-backed alarm repository and added create/edit routes.
- Replaced the placeholder alarm list with persisted empty, loading, error, and saved-alarm states.
- Added create, reload, edit, delete, and invalid-time component coverage through the real repository and a mocked on-device file boundary.
- Kept every saved record disabled and unscheduled. The UI says “Saved only — not scheduled” and does not offer an enable control before native scheduling exists.

### Evidence

Local validation on Linux with Node 24.19.0:

- Prettier, ESLint, and strict TypeScript: passed.
- Jest: 39/39 tests passed across 7 suites, including 9 new alarm-form and CRUD interaction tests.
- `EXPO_OFFLINE=1 npx expo install --check`: passed against bundled compatibility data; offline validation is limited, so PR CI must run the regular online check.
- iOS JavaScript export: passed (1,135 modules). This is not a native build, launch, or device test.

The independent CRUD portion of roadmap Day 5 is implemented. The milestone remains **in progress** because enabling/disabling must reflect real native scheduling and cancellation rather than toggling a local flag. That work remains coupled to roadmap Days 2 and 6.

### Boundaries and next run

- Saving a wake-up plan does not schedule an iPhone alarm. No lock-screen delivery, notification, sound, or background behavior is claimed.
- The file-backed flow has not been launched or reloaded on an iOS simulator or physical iPhone; Day 4's device-restart evidence remains open.
- No Xcode build, simulator launch, signing check, physical-iPhone test, AlarmKit trial, camera trial, or movement calibration ran in this environment.
- If native access is still unavailable, the next independent roadmap work is to define and test timezone/daylight-saving behavior for local schedules before recurring alarms can be enabled.

## 2026-09-29 — Alarm model and local persistence

### Scope

- Merged [PR #2](https://github.com/Sarthak3232/MovementAlarmClock/pull/2) after its exact-head `app-checks` job succeeded; the post-merge `main` check also passed.
- Added a runtime-validated alarm model for local time, repeat weekdays, stable IDs, timestamps, and native scheduling state.
- Enforced that an alarm is enabled exactly when native scheduling succeeded. Unscheduled and failed records cannot carry a native ID, and failures preserve a reason without presenting the alarm as active.
- Added a version-1 repository and Expo FileSystem store in the app document directory. Mutations are serialized to prevent concurrent lost updates; malformed JSON, invalid records, duplicate IDs, and unknown schema versions fail without overwriting the stored value.
- Added reload, upsert, deletion, concurrent-write, corruption, schema-version, scheduling-state, and file-adapter tests.

### Evidence

Local validation on Linux with Node 24.19.0:

- Clean `npm ci`: passed after one transient proxy/cache retry.
- Prettier, ESLint, and strict TypeScript: passed.
- Jest: 30/30 tests passed across 5 suites, including 16 new alarm model, repository, and file-adapter tests.
- Expo dependency compatibility: the initial PR check reported newer SDK 57 patch expectations for Expo, Constants, and Router, so those pins were aligned to the exact versions reported by CI. Local online lookups timed out through the environment proxy; `EXPO_OFFLINE=1 npx expo install --check` passed against bundled SDK compatibility data and reported that offline validation is limited. Follow-up CI runs the authoritative online check.
- iOS JavaScript export: passed (1,108 modules). This is not a native build or device test.

The Day 4 implementation is present and repository/store recreation tests demonstrate reload behavior. The roadmap milestone remains **in progress** until an iOS simulator or physical-iPhone run confirms that a saved alarm survives an actual app restart. There was no prior persisted schema to migrate; version 1 is the baseline, and unknown versions are rejected rather than guessed.

### Boundaries and next run

- The repository was not yet connected to the alarm-list/editor placeholders at this checkpoint. No record was scheduled with iOS, and a persisted record was not evidence that an alarm would ring.
- No Xcode build, simulator launch, signing check, physical-iPhone persistence reload, AlarmKit trial, camera trial, or movement calibration ran in this environment.
- Next unblocked work is roadmap Day 5: connect alarm list/editor CRUD to the repository with visible validation and component tests, while keeping scheduling disabled until the native adapter succeeds.
- Roadmap Days 2 and 3 still require macOS/Xcode and a physical iPhone. Movement completion must remain separate from system alarm dismissal, and camera processing must remain on-device.

## 2026-09-28 — Deterministic jumping-jack logic

### Scope

- Merged [PR #1](https://github.com/Sarthak3232/MovementAlarmClock/pull/1) after the exact head's `app-checks` job succeeded. The merge commit preserves both foundation commits.
- Added a pure TypeScript pose classifier using body-relative arm and foot measurements rather than raw pixel distances.
- Added a stable closed → open → closed state machine with a five-rep target, confidence filtering, entry/exit hysteresis, and one completion event.
- Added deterministic fixtures for full reps, partial movement, repeated poses, threshold jitter, malformed/low-confidence landmarks, missing tracking, stale gaps, and duplicate/out-of-order frames.

### Evidence

Local validation on Linux with Node 24.19.0:

- Prettier, ESLint, and strict TypeScript: passed.
- Jest: 14/14 tests passed, including 10 movement-domain tests and 4 navigation/component tests.
- iOS JavaScript export: passed (1,108 modules). This is not a native build or device test.

The deterministic portion of roadmap Day 7 is complete: the synthetic fixtures cover correct counts and the planned false-positive cases, and completion is emitted once. Real pose landmarks, thresholds, latency, and false positives still need camera integration and physical-iPhone trials before the movement feature can be considered validated.

### Native feasibility gate

Roadmap Day 2 remains blocked in this Linux environment: it has no Xcode 26 toolchain, iOS 26 simulator, physical iPhone, or Apple signing setup, so an AlarmKit module cannot be compiled or its lock-screen lifecycle observed here. Apple's AlarmKit documentation identifies iOS/iPadOS 26 as the platform target, requires per-app authorization and an `NSAlarmKitUsageDescription`, and exposes system alarm lifecycle operations. The device trial must still record scheduling, app launch/custom action behavior, system stop/snooze behavior, background/terminated delivery, and reconciliation after dismissal. Movement completion must remain a separate app event from system alarm dismissal.

### Next run

1. Resolve the movement-counter PR's CI and review state before overlapping work.
2. If macOS/Xcode and a physical iPhone are still unavailable, proceed to the independent alarm data model and typed persistence repository from roadmap Day 4.
3. Do not connect synthetic landmarks to the production challenge UI or claim camera support. Camera adapter selection and threshold calibration remain roadmap Days 3 and 8 device work.

## 2026-09-27 — Day 1 foundation

### Scope

- Expo SDK 57, React Native, strict TypeScript, Expo Router, and development-client configuration.
- Alarm list, new-alarm placeholder, challenge preview, and settings routes.
- Explicit unavailable states: no scheduling, camera access, pose detector, persistence, or real rep counting.
- Navigation/component checks and CI for formatting, lint, type checking, tests, dependency compatibility, and iOS JavaScript export.

### Evidence

Local validation on Linux with Node 24.19.0:

- TypeScript and ESLint: passed.
- Jest: 4/4 navigation/component tests passed, including disabled saving, honest challenge status, and direct challenge navigation.
- Prettier: passed.
- iOS JavaScript export: passed (1,108 modules). This is not native build evidence.
- Expo compatibility check: the online lookup timed out through the environment proxy. `EXPO_OFFLINE=1 npx expo install --check` passed against bundled SDK compatibility data; Expo warns that offline validation is limited. CI retries the regular online command.
- `npm ci` reproducibility and remote CI results are recorded in the PR.

Dependency notes: React DOM, Reanimated, and Worklets are explicitly pinned to Expo's SDK-compatible versions to avoid npm selecting incompatible optional peers. ESLint is pinned to 9.39.5 because Expo's bundled React/import plugins fail with ESLint 10; revisit together with an Expo config upgrade. All direct versions and the full lockfile are committed.

Day 1 is **in progress** until an iOS simulator or physical iPhone launch is observed. JavaScript export and mocked component tests do not prove native compilation or device behavior.

### Device and build blockers

This execution environment is Linux, with no Xcode, iOS simulator, attached iPhone, or Apple signing setup. No native build, installation, physical-device test, or signing check has run. The bundle identifier is an initial project identifier and must be checked against the owner's signing setup before a signed build.

The README's physical-device gates remain open. This scaffold does not implement or make claims about AlarmKit delivery, app termination, system stop behavior, or live camera processing. No release is authorized by these checks.

### Follow-up

The foundation PR merged with successful CI. Native launch verification remains open; use the smoke procedure below when a Mac/iOS runtime is available.

## App-shell smoke procedure (not yet executed)

On a Mac with Xcode configured:

```sh
nvm use
npm ci
npm run ios
```

This generates native folders locally and builds a development client for an iOS simulator. For a physical phone use `npx expo run:ios --device` with the appropriate signing setup. The generated native directories are not source-controlled; custom native code must live in local modules/config plugins when introduced.

Check the following and record the device/simulator model, OS, command, commit SHA, and result here:

- Launch shows "No alarms yet" and explains that saved plans do not ring.
- Add a saved alarm, verify it returns to the list as "Saved only — not scheduled," then edit its name/time and delete it.
- Terminate and relaunch the app after saving a plan; verify the record reloads without being presented as scheduled.
- Back navigation returns to the alarm list without creating an extra record.
- Challenge preview shows 0/5 and says detection is not connected.
- Settings explains on-device processing and system stop limitations.
- Large text and VoiceOver can access the route links and screen content.

Do not attempt overnight reliance testing: there is no alarm implementation yet.
