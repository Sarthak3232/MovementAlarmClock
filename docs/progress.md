# Implementation progress

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

### Next run

1. Read this log, the README, and open PRs. Resolve pending CI/review on the existing foundation PR before overlapping changes.
2. Verify the app shell launches using the smoke procedure below when a Mac/iOS runtime is available.
3. Begin Day 2: investigate the native AlarmKit adapter and its supported iOS target. Record a precise build/device blocker if unavailable. Keep system stop separate from movement completion.
4. Independent pure TypeScript movement logic is available if native work is blocked; do not claim native feasibility from mocked tests.

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
