# Local scheduling policy

This policy defines the behavior the native alarm adapter must preserve before recurring alarms can be enabled. The pure TypeScript implementation in `src/features/alarms/schedulePolicy.ts` is a reference calculator and test oracle; it does not schedule an iPhone alarm.

## Recurring alarms

- A saved hour and minute are **device-local wall-clock values**, not a fixed UTC instant.
- Weekdays are evaluated in the device's current IANA time zone. Monday is `1` and Sunday is `7`.
- After the device time zone changes, native/local reconciliation must cancel or replace future native schedules so the alarm follows the same wall-clock time in the new zone.
- During a spring-forward gap, a nonexistent selected time resolves to the first valid local minute after the gap. For example, `02:30` resolves to `03:00` when the clock jumps from `01:59` to `03:00`.
- During a fall-back overlap, an ambiguous selected time fires only at its first occurrence. The repeated wall-clock minute must not create a second occurrence.
- Occurrence calculations are strictly after the comparison instant. Once the first occurrence of an ambiguous time has passed, the second copy is skipped.

The app should explain a gap adjustment when a user selects a time that will not exist on the next matching date. A later UI pass can add that preview once alarms can actually be scheduled.

## One-time alarms

An empty weekday selection currently means “Once,” but the stored record does not yet include a target date. Until the native scheduling contract defines and persists that date, these records must remain visibly unscheduled. Do not infer successful delivery from the wall-clock fields alone.

## Reconciliation requirements

On app launch, resume, and a significant device time or time-zone change, the future native adapter must:

1. Read the current device time zone.
2. Compare stored records with actual AlarmKit state.
3. Recompute the next occurrence using this policy.
4. Cancel stale native identifiers before creating replacements.
5. Persist an enabled state only after native scheduling succeeds.
6. Treat system dismissal and movement-challenge completion as separate events.

The adapter must make callbacks idempotent so a time-zone change, app resume, or duplicate native callback cannot create duplicate schedules or challenge sessions.

## Validation status

Deterministic tests cover ordinary local times, weekday rollover across a DST boundary, a Pacific spring-forward gap, the first occurrence of a Pacific fall-back overlap, suppression of the repeated occurrence, invalid inputs, and recalculation in a different IANA time zone.

Still required on a Mac and physical iPhone:

- Confirm AlarmKit can represent or be reconciled to this policy.
- Observe behavior after automatic and manual time-zone changes.
- Observe spring-forward and fall-back behavior using controlled device settings where practical.
- Verify background/terminated delivery and stale-schedule cleanup.
- Record device model, iOS version, build SHA, expected result, actual result, and pass/fail.
