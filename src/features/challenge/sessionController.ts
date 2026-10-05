import {
  createMovementState,
  defaultJumpingJackConfig,
  processPoseFrame as reducePoseFrame,
  type MovementEvent,
  type MovementState,
  type PoseFrame,
} from '../../domain/movement';
import {
  canProcessPoseFrames,
  createChallengeAccessState,
  reduceChallengeAccess,
  type CameraAvailability,
  type ChallengeAccessState,
} from './accessState';
import type {
  ApplyOccurrenceEventResult,
  OpenOccurrenceResult,
} from './sessionRegistry';
import type {
  CreateWakeUpSessionInput,
  FallbackReason,
  WakeUpSession,
  WakeUpSessionEffect,
  WakeUpSessionEvent,
} from './session';

export interface WakeUpSessionRepositoryPort {
  openOccurrence(
    input: CreateWakeUpSessionInput,
  ): Promise<OpenOccurrenceResult>;
  applyEvent(
    occurrenceId: string,
    event: WakeUpSessionEvent,
  ): Promise<ApplyOccurrenceEventResult>;
}

export type ChallengeSessionControllerDependencies = {
  repository: WakeUpSessionRepositoryPort;
  now: () => string;
};

export type ChallengeSessionSnapshot = {
  session: WakeUpSession;
  access: ChallengeAccessState;
  movement: MovementState;
};

export type ChallengeFrameResult = {
  snapshot: ChallengeSessionSnapshot;
  frameDisposition: 'blocked' | 'processed';
  movementEvent: MovementEvent | null;
  sessionDisposition: 'applied' | 'duplicate' | 'ignored' | null;
  effects: WakeUpSessionEffect[];
};

function movementStateForSession(session: WakeUpSession): MovementState {
  return {
    ...createMovementState(),
    phase:
      session.challenge.status === 'completed' ? 'completed' : 'seekingClosed',
    reps: session.repCount,
  };
}

function accessStateForSession(
  session: WakeUpSession,
  camera: CameraAvailability,
): ChallengeAccessState {
  const initial = createChallengeAccessState(camera);
  return session.challenge.status === 'fallback'
    ? reduceChallengeAccess(initial, { type: 'use-fallback' })
    : initial;
}

export class ChallengeSessionController {
  private operationQueue: Promise<void> = Promise.resolve();
  private session: WakeUpSession;
  private access: ChallengeAccessState;
  private movement: MovementState;

  private constructor(
    private readonly dependencies: ChallengeSessionControllerDependencies,
    session: WakeUpSession,
    camera: CameraAvailability,
  ) {
    this.session = session;
    this.access = accessStateForSession(session, camera);
    this.movement = movementStateForSession(session);
  }

  static async open(
    dependencies: ChallengeSessionControllerDependencies,
    input: CreateWakeUpSessionInput,
    camera: CameraAvailability = 'not-connected',
  ): Promise<ChallengeSessionController> {
    const opened = await dependencies.repository.openOccurrence(input);
    return new ChallengeSessionController(dependencies, opened.session, camera);
  }

  get snapshot(): ChallengeSessionSnapshot {
    return {
      session: this.session,
      access: this.access,
      movement: this.movement,
    };
  }

  setCameraAvailability(camera: CameraAvailability): void {
    this.access = reduceChallengeAccess(this.access, {
      type: 'camera-status-changed',
      camera,
    });
  }

  retryCamera(): void {
    this.access = reduceChallengeAccess(this.access, { type: 'retry-camera' });
  }

  async processPoseFrame(frame: PoseFrame): Promise<ChallengeFrameResult> {
    return this.enqueueOperation(async () => {
      if (
        this.session.challenge.status !== 'active' ||
        !canProcessPoseFrames(this.access)
      ) {
        return {
          snapshot: this.snapshot,
          frameDisposition: 'blocked',
          movementEvent: null,
          sessionDisposition: null,
          effects: [],
        };
      }

      const movementUpdate = reducePoseFrame(this.movement, frame, {
        ...defaultJumpingJackConfig,
        targetReps: this.session.targetReps,
      });
      let sessionUpdate: ApplyOccurrenceEventResult | null = null;

      if (movementUpdate.event === 'repCompleted') {
        sessionUpdate = await this.persist({
          type: 'rep-progressed',
          repCount: movementUpdate.state.reps,
          at: this.dependencies.now(),
        });
      } else if (movementUpdate.event === 'challengeCompleted') {
        sessionUpdate = await this.persist({
          type: 'movement-completed',
          at: this.dependencies.now(),
        });
      }

      this.movement = movementUpdate.state;
      return {
        snapshot: this.snapshot,
        frameDisposition: 'processed',
        movementEvent: movementUpdate.event,
        sessionDisposition: sessionUpdate?.disposition ?? null,
        effects: sessionUpdate?.effects ?? [],
      };
    });
  }

  async useFallback(
    reason: FallbackReason,
  ): Promise<ApplyOccurrenceEventResult> {
    return this.enqueueOperation(async () => {
      const update = await this.persist({
        type: 'fallback-used',
        reason,
        at: this.dependencies.now(),
      });
      if (update.session.challenge.status === 'fallback') {
        this.access = reduceChallengeAccess(this.access, {
          type: 'use-fallback',
        });
      }
      return update;
    });
  }

  async abandon(): Promise<ApplyOccurrenceEventResult> {
    return this.enqueueOperation(() =>
      this.persist({ type: 'abandoned', at: this.dependencies.now() }),
    );
  }

  async confirmSystemAlarmStopped(
    source: 'system-control' | 'challenge-request',
  ): Promise<ApplyOccurrenceEventResult> {
    return this.enqueueOperation(() =>
      this.persist({
        type: 'system-alarm-stopped',
        source,
        at: this.dependencies.now(),
      }),
    );
  }

  private async persist(
    event: WakeUpSessionEvent,
  ): Promise<ApplyOccurrenceEventResult> {
    const update = await this.dependencies.repository.applyEvent(
      this.session.occurrenceId,
      event,
    );
    this.session = update.session;
    return update;
  }

  private enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
