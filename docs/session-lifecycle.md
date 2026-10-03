# Wake-up session lifecycle

The wake-up session model keeps the movement challenge and the iPhone system alarm as independent state dimensions. It is a pure TypeScript contract for future persistence and native callbacks; it does not open, stop, or observe an AlarmKit alarm.

## Identity and duplicate callbacks

Each native alarm delivery must provide a stable occurrence ID. Opening the same occurrence more than once returns the original session, even if a callback is replayed after app launch or supplies a newly generated session ID. Different occurrences of the same repeating alarm create different sessions.

An occurrence ID cannot be shared across alarms, and a session ID cannot be reused for another occurrence. Collections with duplicate session or occurrence IDs are rejected instead of guessed or silently repaired.

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

- Persist session records and occurrence identity through a versioned repository.
- Map real AlarmKit delivery and stop callbacks to stable occurrence IDs and confirmed system state.
- Map the jumping-jack counter's completion event to `movement-completed` exactly once.
- Connect the challenge fallback UI to a persisted fallback outcome.
- Reconcile unfinished sessions after launch, termination, duplicate callbacks, or native state changes.
- Verify every transition on a signed iPhone build while locked, backgrounded, and terminated.
