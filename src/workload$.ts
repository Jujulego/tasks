import { type Observable, type Ref, var$ } from 'kyrielle';
import { randomUUID } from 'node:crypto';
import { isWorkloadActive, isWorkloadEnded, isWorkloadWaiting, WorkloadState } from './enums/workload-state.js';
import { unscheduler$ } from './unscheduler$.js';

/**
 * Wraps workload status logic.
 *
 * @since 3.0.0
 */
export function workload$(props: WorkloadProps): Workload$ {
  const { id = randomUUID(), label, type, weight, onStart } = props;

  const controller = new AbortController();
  const error$ = var$<Error>();
  const state$ = var$(WorkloadState.Ready);

  return {
    id,
    label,
    type,
    state$,
    error$,
    state: state$.defer,
    error: error$.defer,
    weight: weight ?? 1,

    block(): void {
      const state = state$.defer();

      if (state === WorkloadState.Ready) {
        state$.mutate(WorkloadState.Blocked);
      } else if (state !== WorkloadState.Blocked) {
        throw new Error(`Workload in "${state}" state cannot be blocked.`);
      }
    },

    unblock(): void {
      const state = state$.defer();

      if (state === WorkloadState.Blocked) {
        state$.mutate(WorkloadState.Ready);
      } else if (state !== WorkloadState.Ready) {
        throw new Error(`Workload in "${state}" state cannot be unblocked.`);
      }
    },

    start(scheduler: WorkloadScheduler = unscheduler$()): void {
      if (state$.defer() !== WorkloadState.Ready) {
        throw new Error(`Workload in "${state$.defer()}" state cannot be started.`);
      }

      const signal = controller.signal;

      void (async () => {
        try {
          state$.mutate(WorkloadState.Starting);
          await onStart({
            scheduler,
            signal,
            setState(state: WorkloadState.Running | WorkloadState.Succeeded | WorkloadState.Failed | WorkloadState.Canceled) {
              if (!signal.aborted) {
                if (isWorkloadActive(state$.defer())) {
                  state$.mutate(state);
                }
              } else if (isWorkloadEnded(state)) {
                state$.mutate(WorkloadState.Canceled);
              }
            }
          });
        } catch (err) {
          if (!(err instanceof WorkloadCancel)) {
            error$.mutate(err as Error);
          }

          if (signal.aborted) {
            state$.mutate(WorkloadState.Canceled);
          } else {
            state$.mutate(WorkloadState.Failed);
          }
        }
      })();
    },

    cancel(): void {
      if (isWorkloadWaiting(state$.defer())) {
        state$.mutate(WorkloadState.Canceled);
      } else if (isWorkloadActive(state$.defer())) {
        state$.mutate(WorkloadState.Canceling);
        controller.abort(new WorkloadCancel());
      }
    },
  };
}

// Errors
/**
 * Thrown when workload is canceled.
 */
export class WorkloadCancel extends Error {
  name = 'WorkloadCancel';

  constructor() {
    super('Workload canceled.');
  }
}

// Types
export interface WorkloadProps {
  /**
   * Uniquely identifies the workload.
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * Friendly name for the workload
   */
  readonly label: string;

  /**
   * Type of workload
   */
  readonly type: string;

  /**
   * Workload's weight. A workload with a high weight need many resources.
   * Defaults to 1.
   */
  readonly weight?: number;

  /**
   * Callback used to start the workload. it should yield next states as the workload proceed
   */
  onStart(this: void, props: WorkloadOnStartProps): Promise<void> | void;
}

export interface WorkloadOnStartProps {
  /**
   * Scheduler used to start the workload
   */
  readonly scheduler: WorkloadScheduler;

  /**
   * Triggered when workload is canceled
   */
  readonly signal: AbortSignal;

  /**
   * Updates current workload state
   */
  setState(this: void, state: WorkloadState.Running | WorkloadState.Succeeded | WorkloadState.Failed | WorkloadState.Canceled): void;
}

export interface WorkloadScheduler {
  /**
   * Registers a workload to be started as soon as possible.
   */
  register(workload: Workload$): void;
}

export interface Workload$ {
  /**
   * Uniquely identifies the workload.
   */
  readonly id: string;

  /**
   * Friendly name of the workload
   */
  readonly label: string;

  /**
   * Type of workload
   */
  readonly type: string;

  /**
   * Workload's weight. A workload with a high weight need many resources.
   */
  readonly weight: number;

  /**
   * Reference on current state of the workload.
   */
  readonly state$: Ref<WorkloadState> & Observable<WorkloadState>;

  /**
   * Reference on error emitted by `onStart` callback.
   */
  readonly error$: Ref<Error | undefined> & Observable<Error>;

  /**
   * Blocks the workload. A blocked workload cannot be started.
   */
  block(this: void): void;

  /**
   * Unblocks the workload.
   */
  unblock(this: void): void;

  /**
   * Starts the workload.
   */
  start(this: void): void;

  /**
   * Starts the workload.
   * @internal
   */
  start(this: void, scheduler: WorkloadScheduler): void;

  /**
   * Cancels the workload.
   */
  cancel(this: void): void;

  /**
   * Returns current state of the workload.
   */
  state(this: void): WorkloadState;

  /**
   * Returns error emitted by `onStart` callback, if any.
   */
  error(this: void): Error | undefined;
}
