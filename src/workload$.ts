import { isDeferrable, isSubscribable, map$, type Observable, pipe$, type Ref, var$ } from 'kyrielle';
import { randomUUID } from 'node:crypto';
import type { Dependency } from './dependency$.js';
import { isWorkloadActive, WorkloadState } from './enums/workload-state.js';
import { unscheduler$ } from './unscheduler$.js';
import { hasMethod, hasProperty, isNonNullObject } from './utils/predicates.js';

/**
 * Wraps workload status logic.
 *
 * @since 3.0.0
 */
export function workload$(props: WorkloadProps): Workload$ {
  const { id = randomUUID(), weight, onStart, onCancel } = props;

  const controller = new AbortController();
  const state$ = var$(WorkloadState.Ready);
  const completed$ = pipe$(state$,
    map$((state) => state === WorkloadState.Succeeded)
  );

  return {
    id,
    completed$,
    state$,
    completed: completed$.defer,
    state: state$.defer,
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

      try {
        state$.mutate(WorkloadState.Starting);
        void onStart({
          scheduler,
          signal,
          setState(state: WorkloadState.Running | WorkloadState.Succeeded | WorkloadState.Failed) {
            if (!signal.aborted && isWorkloadActive(state$.defer())) {
              state$.mutate(state);
            }
          }
        });
      } catch (err) {
        if (!signal.aborted) {
          state$.mutate(WorkloadState.Failed);
          throw err;
        }
      }
    },

    async cancel(): Promise<void> {
      try {
        if (isWorkloadActive(state$.defer())) {
          state$.mutate(WorkloadState.Canceling);
          controller.abort(new WorkloadCancel());

          if (onCancel) {
            await onCancel();
          }
        }
      } finally {
        state$.mutate(WorkloadState.Canceled);
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
   * Workload's weight. A workload with a high weight need many resources.
   * Defaults to 1.
   */
  readonly weight?: number;

  /**
   * Callback used to start the workload. it should yield next states as the workload proceed
   */
  onStart(this: void, props: WorkloadOnStartProps): Promise<void> | void;

  /**
   * Callback use to cancel or interrupt the workload.
   */
  readonly onCancel?: (this: void) => Promise<void> | void;
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
  setState(this: void, state: WorkloadState.Running | WorkloadState.Succeeded | WorkloadState.Failed): void;
}

export interface WorkloadScheduler {
  /**
   * Registers a workload to be started as soon as possible.
   */
  register(workload: Workload$): void;
}

export interface Workload$ extends Dependency {
  /**
   * Uniquely identifies the workload.
   */
  readonly id: string;

  /**
   * Workload's weight. A workload with a high weight need many resources.
   */
  readonly weight: number;

  /**
   * Reference on current state of the workload.
   */
  readonly state$: Ref<WorkloadState> & Observable<WorkloadState>;

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
  cancel(this: void): Promise<void>;

  /**
   * Returns current state of the workload.
   */
  state(this: void): WorkloadState;

  /**
   * Returns true if the workload is successfully completed
   */
  completed(this: void): boolean;
}

export function isWorkload$<T>(value: T): value is T & Workload$ {
  return isNonNullObject(value)
    && hasProperty(value, 'id', (prop) => typeof prop === 'string')
    && hasProperty(value, 'weight', (prop) => typeof prop === 'number')
    && hasProperty(value, 'state$', (prop) => isSubscribable(prop) && isDeferrable(prop))
    && hasMethod(value, 'block')
    && hasMethod(value, 'unblock')
    && hasMethod(value, 'start')
    && hasMethod(value, 'cancel')
    && hasMethod(value, 'state')
    && hasMethod(value, 'completed');
}