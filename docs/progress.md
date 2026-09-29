# Implementation progress

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
- Expo dependency compatibility: the online lookup timed out through the environment proxy; `EXPO_OFFLINE=1 npx expo install --check` passed against bundled SDK compatibility data and reported that offline validation is limited. CI must run the regular online check.
- iOS JavaScript export: passed (1,108 modules). This is not a native build or device test.

The Day 4 implementation is present and repository/store recreation tests demonstrate reload behavior. The roadmap milestone remains **in progress** until an iOS simulator or physical-iPhone run confirms that a saved alarm survives an actual app restart. There was no prior persisted schema to migrate; version 1 is the baseline, and unknown versions are rejected rather than guessed.

### Boundaries and next run

- The repository is not yet connected to the alarm-list/editor placeholders. No record is scheduled with iOS, and a persisted record is not evidence that an alarm will ring.
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

- Launch shows "No alarms yet" and explains that alarms do not ring.
- Explore alarm setup opens the editor; Save is disabled; no alarm is scheduled.
- Back navigation returns to the alarm list.
- Challenge preview shows 0/5 and says detection is not connected.
- Settings explains on-device processing and system stop limitations.
- Large text and VoiceOver can access the route links and screen content.

Do not attempt overnight reliance testing: there is no alarm implementation yet.
