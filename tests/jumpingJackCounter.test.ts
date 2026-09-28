import {
  classifyPose,
  createMovementState,
  processPoseFrame,
  type MovementEvent,
  type MovementState,
  type PoseFrame,
} from '../src/domain/movement';
import {
  closedPose,
  frame,
  lowConfidence,
  openExitJitterPose,
  openPose,
  partialPose,
} from './fixtures/poseFrames';

function processSequence(
  frames: PoseFrame[],
  initialState = createMovementState(),
) {
  const events: MovementEvent[] = [];
  const state = frames.reduce<MovementState>((current, poseFrame) => {
    const update = processPoseFrame(current, poseFrame);
    events.push(update.event);
    return update.state;
  }, initialState);
  return { state, events };
}

function stablePoseFrames(startMs: number, pose: typeof closedPose) {
  return [frame(startMs, pose), frame(startMs + 250, pose)];
}

function fullRepFrames(startMs: number) {
  return [
    ...stablePoseFrames(startMs, openPose),
    ...stablePoseFrames(startMs + 500, closedPose),
  ];
}

describe('jumping-jack pose classification', () => {
  it('classifies closed and open landmarks relative to body size', () => {
    expect(classifyPose(closedPose, 'unknown')).toBe('closed');
    expect(classifyPose(openPose, 'unknown')).toBe('open');
    expect(classifyPose(partialPose, 'unknown')).toBe('transition');
  });

  it('uses exit thresholds to avoid dropping an open pose from minor jitter', () => {
    expect(classifyPose(openExitJitterPose, 'unknown')).toBe('transition');
    expect(classifyPose(openExitJitterPose, 'open')).toBe('open');
  });

  it('rejects landmarks with low confidence', () => {
    expect(classifyPose(lowConfidence(openPose), 'unknown')).toBe('unknown');
  });

  it('rejects malformed coordinates instead of treating them as movement', () => {
    const malformed = {
      ...openPose,
      leftAnkle: { ...openPose.leftAnkle, x: Number.NaN },
    };
    expect(classifyPose(malformed, 'unknown')).toBe('unknown');
  });
});

describe('jumping-jack state machine', () => {
  it('counts five closed-open-closed cycles and completes exactly once', () => {
    const frames = [...stablePoseFrames(0, closedPose)];
    for (let rep = 0; rep < 5; rep += 1) {
      frames.push(...fullRepFrames(500 + rep * 1_000));
    }

    const result = processSequence(frames);
    expect(result.state).toMatchObject({ reps: 5, phase: 'completed' });
    expect(
      result.events.filter((event) => event === 'repCompleted'),
    ).toHaveLength(4);
    expect(
      result.events.filter((event) => event === 'challengeCompleted'),
    ).toHaveLength(1);

    const afterCompletion = processSequence(
      [
        ...stablePoseFrames(5_500, openPose),
        ...stablePoseFrames(6_000, closedPose),
      ],
      result.state,
    );
    expect(afterCompletion.state.reps).toBe(5);
    expect(afterCompletion.events).not.toContain('challengeCompleted');
  });

  it('does not count partial movement, repeated open frames, or standing still', () => {
    const result = processSequence([
      ...stablePoseFrames(0, closedPose),
      ...stablePoseFrames(500, partialPose),
      ...stablePoseFrames(1_000, closedPose),
      ...stablePoseFrames(1_500, openPose),
      ...stablePoseFrames(2_000, openPose),
      ...stablePoseFrames(2_500, closedPose),
      ...stablePoseFrames(3_000, closedPose),
    ]);

    expect(result.state.reps).toBe(1);
    expect(
      result.events.filter((event) => event === 'repCompleted'),
    ).toHaveLength(1);
  });

  it('requires a fresh closed start after tracking is lost mid-rep', () => {
    const beforeLoss = processSequence([
      ...stablePoseFrames(0, closedPose),
      ...stablePoseFrames(500, openPose),
    ]);
    expect(beforeLoss.state.phase).toBe('open');

    const result = processSequence(
      [
        frame(1_000, null),
        ...stablePoseFrames(1_250, closedPose),
        ...stablePoseFrames(1_750, openPose),
        ...stablePoseFrames(2_250, closedPose),
      ],
      beforeLoss.state,
    );

    expect(result.events).toContain('trackingLost');
    expect(result.state.reps).toBe(1);
  });

  it('preserves completed reps but resets an unfinished cycle on low confidence', () => {
    const completedRep = processSequence([
      ...stablePoseFrames(0, closedPose),
      ...fullRepFrames(500),
      ...stablePoseFrames(1_500, openPose),
    ]);
    expect(completedRep.state).toMatchObject({ reps: 1, phase: 'open' });

    const afterLoss = processSequence(
      [
        frame(2_000, lowConfidence(closedPose)),
        ...stablePoseFrames(2_250, closedPose),
      ],
      completedRep.state,
    );
    expect(afterLoss.state).toMatchObject({ reps: 1, phase: 'ready' });
  });

  it('ignores duplicate and out-of-order timestamps', () => {
    const started = processSequence(stablePoseFrames(100, closedPose));
    const result = processSequence(
      [frame(351, openPose), frame(351, openPose), frame(350, openPose)],
      started.state,
    );

    expect(result.state.phase).toBe('ready');
    expect(result.events).toEqual(['none', 'ignoredFrame', 'ignoredFrame']);
  });

  it('resets an unfinished cycle after a stale frame gap', () => {
    const opened = processSequence([
      ...stablePoseFrames(0, closedPose),
      ...stablePoseFrames(500, openPose),
    ]);
    const result = processSequence(
      stablePoseFrames(2_000, closedPose),
      opened.state,
    );

    expect(result.state).toMatchObject({ reps: 0, phase: 'ready' });
    expect(result.events).not.toContain('repCompleted');
  });
});
