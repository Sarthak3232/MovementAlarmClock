# Wake-up session lifecycle

The wake-up session model keeps the movement challenge and the iPhone system alarm as independent state dimensions. A versioned repository persists that pure TypeScript contract, but neither layer opens, stops, or observes an AlarmKit alarm.

## Identity and duplicate callbacks

Each native alarm delivery must provide a stable occurrence ID. Opening the same occurrence more than once returns the original session, even if a callback is replayed after app launch or supplies a newly generated session ID. Different occurrences of the same repeating alarm create different sessions.

An occurrence ID cannot be shared across alarms, and a session ID cannot be reused for another occurrence. Collections with duplicate session or occurrence IDs are rejected instead of guessed or silently repaired.

## Persistence contract

The wake-up session repository stores a versioned JSON envelope in a dedicated app-document file. Repository recreation reloads the same occurrence identity and outcome, so replaying a callback after a JavaScript or app restart returns the original session. Mutations are serialized to prevent concurrent callbacks from losing a session or event.

Every loaded session is runtime validated, including canonical timestamps, rep bounds, terminal challenge metadata, and independent system-stop metadata. Malformed JSON, unsupported schema versions, invalid state combinations, and duplicate session or occurrence IDs fail without rewriting the source data. Duplicate or ignored events also avoid an unnecessary write.

This contract has only been exercised through the store boundary in automated tests. The app does not yet construct the repository from a native callback, and file survival has not been observed after terminating and reopening an iPhone build.

## Controller boundary

The challenge session controller accepts a repository, canonical wall-clock function, camera availability updates, and normalized pose frames through dependency-injected boundaries. Frames are processed only while the session is active and the injected camera state is `ready`. Raw frames and pose landmarks are never passed to persistence; only rep progress and terminal session events are stored.

Frame operations are serialized before they reach the movement state machine, so rapid callbacks cannot race the rep count. Repository failure leaves the prior movement state intact for an explicit retry. Reopening a persisted completed session restores a completed movement state, while fallback sessions restore fallback access and reject later pose processing.

Five reps persist movement completion and return `request-system-alarm-stop` to the future native adapter. The controller does not execute or confirm that request. Only a separately injected `system-alarm-stopped` callback records a stopped alarm, preserving the platform boundary.

## Independent state

| Event                | Challenge effect                                  | System-alarm effect                               |
| -------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Rep progress         | Raises the monotonic rep count below the target   | None                                              |
| Movement completed   | Records `completed` and the target rep count      | Emits a stop-request effect only if known to ring |
| Fallback used        | Records `fallback` and its reason                 | None                                              |
| Challenge abandoned  | Records `abandoned`                               | None                                              |
| System alarm stopped | None; an active movement challenge remains active | Records confirmed stop time and source            |

Movement completion does not claim that the system alarm stopped. The future native adapter must execute the emitted request and then deliver a separate confirmed stop event. Likewise, a stop through Apple's system controls never creates five reps or a completed challenge.

Challenge outcomes are terminal and mutually exclusive. Replayed terminal events are idempotent, conflicting late events are ignored, repeated rep counts are duplicates, and lower out-of-order counts cannot reduce progress.

## Remaining integration work

- Map real AlarmKit delivery and stop callbacks to stable occurrence IDs and confirmed system state.
- Instantiate the controller from a validated active-occurrence route instead of the current static preview.
- Connect the challenge UI to controller snapshots and persist its fallback selection.
- Reconcile unfinished sessions after launch, termination, duplicate callbacks, or native state changes.
- Verify every transition on a signed iPhone build while locked, backgrounded, and terminated.
