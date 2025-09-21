import { type Observable, type Ref, var$ } from 'kyrielle';
import { randomUUID } from 'node:crypto';

/**
 * Wraps job status logic.
 *
 * @since 3.0.0
 */
export function job$(props: JobProps): Job$ {
  const { id = randomUUID(), weight, onStart, onCancel } = props;

  const controller = new AbortController();
  const state$ = var$(JobState.Ready);

  return {
    id,
    state$,
    weight: weight ?? 1,

    block(): void {
      const state = state$.defer();

      switch (state) {
        case JobState.Blocked:
          return;

        case JobState.Ready:
          state$.mutate(JobState.Blocked);
          return;

        default:
          throw new Error(`Job in "${state}" state cannot be blocked.`);
      }
    },

    unblock(): void {
      const state = state$.defer();

      switch (state) {
        case JobState.Ready:
          return;

        case JobState.Blocked:
          state$.mutate(JobState.Ready);
          return;

        default:
          throw new Error(`Job in "${state}" state cannot be unblocked.`);
      }
    },

    async start(): Promise<void> {
      if (state$.defer() !== JobState.Ready) {
        throw new Error(`Job in "${state$.defer()}" state cannot be started.`);
      }

      const signal = controller.signal;

      try {
        state$.mutate(JobState.Starting);
        await onStart({
          signal,
          setState(state: JobState.Running | JobState.Succeeded | JobState.Failed) {
            if (!signal.aborted && isJobActive(state$.defer())) {
              state$.mutate(state);
            }
          }
        });
      } catch (err) {
        if (!signal.aborted) {
          state$.mutate(JobState.Failed);
          throw err;
        }
      }
    },

    async cancel(): Promise<void> {
      try {
        state$.mutate(JobState.Canceling);
        controller.abort(new JobCancel());

        if (onCancel) {
          await onCancel();
        }
      } finally {
        state$.mutate(JobState.Canceled);
      }
    },

    get state() {
      return state$.defer();
    },
  };
}

// Errors
/**
 * Thrown when job is canceled.
 */
export class JobCancel extends Error {
  name = 'JobCancel';

  constructor() {
    super('Job canceled.');
  }
}

// Types
export interface JobProps {
  /**
   * Uniquely identifies the job.
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * Job's weight. A job with a high weight need many resources.
   * Defaults to 1.
   */
  readonly weight?: number;

  /**
   * Callback used to start the job. it should yield next states as the job proceed
   */
  onStart(this: void, props: JobOnStartProps): Promise<void> | void;

  /**
   * Callback use to cancel or interrupt the job.
   */
  readonly onCancel?: (this: void) => Promise<void> | void;
}

export interface JobOnStartProps {
  /**
   * Triggered when job is canceled
   */
  readonly signal: AbortSignal;

  /**
   * Updates current job state
   */
  setState(this: void, state: JobState.Running | JobState.Succeeded | JobState.Failed): void;
}

export interface Job$ {
  /**
   * Uniquely identifies the job.
   */
  readonly id: string;

  /**
   * Current state of the job.
   */
  readonly state: JobState;

  /**
   * Job's weight. A job with a high weight need many resources.
   */
  readonly weight: number;

  /**
   * Reference on current state of the job.
   */
  readonly state$: Ref<JobState> & Observable<JobState>;

  /**
   * Blocks the job. A blocked job cannot be started.
   */
  block(this: void): void;

  /**
   * Unblocks the job.
   */
  unblock(this: void): void;

  /**
   * Starts the job.
   */
  start(this: void): Promise<void>;

  /**
   * Cancels the job.
   */
  cancel(this: void): Promise<void>;
}

// Enum
export enum JobState {
  /**
   * Job is blocked, not yet ready to be started
   */
  Blocked = 'blocked',

  /**
   * Job is waiting to be started
   */
  Ready = 'ready',

  /**
   * Job is starting
   */
  Starting = 'starting',

  /**
   * Job is running
   */
  Running = 'running',

  /**
   * Job successfully ended
   */
  Succeeded = 'succeeded',

  /**
   * Job failed
   */
  Failed = 'failed',

  /**
   * Job is canceling
   */
  Canceling = 'canceling',

  /**
   * Job was canceled
   */
  Canceled = 'canceled',
}

// Utils
export function isJobWaiting(state: JobState) {
  return [JobState.Blocked, JobState.Ready].includes(state);
}

export function isJobActive(state: JobState) {
  return [JobState.Starting, JobState.Running, JobState.Canceling].includes(state);
}

export function isJobCompleted(state: JobState) {
  return [JobState.Succeeded, JobState.Failed].includes(state);
}
