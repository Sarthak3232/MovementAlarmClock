import { ChallengeSessionController } from '../src/features/challenge';
import type { PoseFrame } from '../src/domain/movement';
import { WakeUpSessionRepository, type SessionStore } from '../src/storage';
import { closedPose, frame, openPose } from './fixtures/poseFrames';

class MemorySessionStore implements SessionStore {
  constructor(public value: string | null = null) {}

  async read() {
    return this.value;
  }

  async write(value: string) {
    this.value = value;
  }

  async clear() {
    this.value = null;
  }
}

function occurrence(id = 'session-1') {
  return {
    id,
    alarmId: 'alarm-1',
    occurrenceId: 'occurrence-1',
    startedAt: '2026-10-05T14:00:00.000Z',
    systemAlarmStatus: 'ringing' as const,
  };
}

function clock() {
  let elapsedSeconds = 1;
  return () => {
    const value = new Date(
      Date.parse('2026-10-05T14:00:00.000Z') + elapsedSeconds * 1_000,
    ).toISOString();
    elapsedSeconds += 1;
    return value;
  };
}

function stablePoseFrames(
  startMs: number,
  pose: typeof closedPose,
): PoseFrame[] {
  return [frame(startMs, pose), frame(startMs + 250, pose)];
}

function fiveRepFrames(): PoseFrame[] {
  const frames = [...stablePoseFrames(0, closedPose)];
  for (let rep = 0; rep < 5; rep += 1) {
    const startMs = 500 + rep * 1_000;
    frames.push(
      ...stablePoseFrames(startMs, openPose),
      ...stablePoseFrames(startMs + 500, closedPose),
    );
  }
  return frames;
}

describe('persisted challenge session controller', () => {
  it('blocks pose frames until an injected camera adapter reports ready', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    const controller = await ChallengeSessionController.open(
      { repository, now: clock() },
      occurrence(),
    );

    const blocked = await controller.processPoseFrame(frame(0, closedPose));
    expect(blocked).toMatchObject({
      frameDisposition: 'blocked',
      movementEvent: null,
      effects: [],
    });
    expect(controller.snapshot.session.repCount).toBe(0);
  });

  it('serializes injected pose frames and persists five-rep completion', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    const controller = await ChallengeSessionController.open(
      { repository, now: clock() },
      occurrence(),
      'ready',
    );

    const results = await Promise.all(
      fiveRepFrames().map((poseFrame) =>
        controller.processPoseFrame(poseFrame),
      ),
    );
    const completion = results.find(
      ({ movementEvent }) => movementEvent === 'challengeCompleted',
    );

    expect(completion).toMatchObject({
      sessionDisposition: 'applied',
      effects: ['request-system-alarm-stop'],
      snapshot: {
        session: {
          repCount: 5,
          challenge: { status: 'completed' },
          systemAlarm: { status: 'ringing' },
        },
      },
    });

    const reloaded = await ChallengeSessionController.open(
      { repository: new WakeUpSessionRepository(store), now: clock() },
      occurrence('discarded-replay-id'),
      'ready',
    );
    expect(reloaded.snapshot).toMatchObject({
      session: {
        id: 'session-1',
        repCount: 5,
        challenge: { status: 'completed' },
        systemAlarm: { status: 'ringing' },
      },
      movement: { reps: 5, phase: 'completed' },
    });

    await reloaded.confirmSystemAlarmStopped('challenge-request');
    expect(reloaded.snapshot.session).toMatchObject({
      challenge: { status: 'completed' },
      systemAlarm: {
        status: 'stopped',
        stopSource: 'challenge-request',
      },
    });
  });

  it('persists fallback separately and rejects later pose processing', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    const controller = await ChallengeSessionController.open(
      { repository, now: clock() },
      occurrence(),
      'permission-denied',
    );

    const fallback = await controller.useFallback('camera-denied');
    expect(fallback).toMatchObject({
      disposition: 'applied',
      effects: [],
      session: {
        repCount: 0,
        challenge: {
          status: 'fallback',
          fallbackReason: 'camera-denied',
        },
        systemAlarm: { status: 'ringing' },
      },
    });
    expect(controller.snapshot.access.mode).toBe('fallback');

    controller.setCameraAvailability('ready');
    const blocked = await controller.processPoseFrame(frame(0, closedPose));
    expect(blocked.frameDisposition).toBe('blocked');

    const restored = await ChallengeSessionController.open(
      { repository: new WakeUpSessionRepository(store), now: clock() },
      occurrence('discarded-replay-id'),
      'ready',
    );
    expect(restored.snapshot.access.mode).toBe('fallback');
    expect(restored.snapshot.session.challenge.status).toBe('fallback');
  });
});
