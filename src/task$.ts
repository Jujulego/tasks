import { filter$, map$, type Observable, once$, pipe$, type Ref, var$ } from 'kyrielle';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { type DepNode, depnode$ } from './bases/depnode$.js';
import { isTaskActive, isTaskCompleted, isTaskWaiting, TaskState } from './task-state.js';

/**
 * Wraps task managing logic.
 * @since 3.0.0
 */
export function task$(props: TaskProps): Task$ {
  const { id = randomUUID(), weight, onStart, onCancel } = props;

  const controller = new AbortController();
  const state$ = var$(TaskState.Ready);

  const node = depnode$({
    id,
    completed$: pipe$(state$,
      filter$(isTaskCompleted),
      map$((state) => state === TaskState.Succeeded)
    ),
  });

  function recomputeState() {
    assert(isTaskWaiting(state$.defer()), 'recomputeState called on non waiting task');

    if (node.dependencies.every((dep) => dep.completed$.defer())) {
      state$.mutate(TaskState.Ready);
    } else {
      state$.mutate(TaskState.Blocked);
    }
  }

  return {
    ...node,
    state$,
    weight: weight ?? 1,

    dependsOn(dep: DepNode) {
      if (!isTaskWaiting(state$.defer())) {
        throw new Error(`Cannot add dependency to task in "${state$.defer()}" state.`);
      }

      node.dependsOn(dep);

      if (!dep.completed$.defer()) {
        state$.mutate(TaskState.Blocked);
      }

      // Track dependency state
      once$(dep.completed$, recomputeState);
    },

    async start(): Promise<void> {
      if (state$.defer() !== TaskState.Ready) {
        throw new Error(`Task in "${state$.defer()}" state cannot be started.`);
      }

      const signal = controller.signal;

      try {
        state$.mutate(TaskState.Starting);
        await onStart({
          signal,
          setState(state: TaskState.Running | TaskState.Succeeded | TaskState.Failed) {
            if (!signal.aborted && isTaskActive(state$.defer())) {
              state$.mutate(state);
            }
          }
        });
      } catch (err) {
        if (!signal.aborted) {
          state$.mutate(TaskState.Failed);
          throw err;
        }
      }
    },

    async cancel(): Promise<void> {
      try {
        state$.mutate(TaskState.Canceling);
        controller.abort(new TaskCancel());

        if (onCancel) {
          await onCancel();
        }
      } finally {
        state$.mutate(TaskState.Canceled);
      }
    },

    get state() {
      return state$.defer();
    },
  };
}

// Errors
/**
 * Thrown when task is canceled.
 */
export class TaskCancel extends Error {
  name = 'TaskCancel';

  constructor() {
    super('Task canceled.');
  }
}

// Types
export interface TaskProps {
  /**
   * Uniquely identifies the task.
   *
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * "Cost" to run the task, used to limit the number of parallel tasks by the task manager.
   *
   * Defaults to 1.
   */
  readonly weight?: number;

  /**
   * Callback used to start the task. it should yield next states as the task proceed
   */
  onStart(this: void, props: TaskOnStartProps): Promise<void> | void;

  /**
   * Callback use to cancel or interrupt the task.
   */
  readonly onCancel?: (this: void) => Promise<void> | void;
}

export interface TaskOnStartProps {
  /**
   * Triggered when task is canceled
   */
  readonly signal: AbortSignal;

  /**
   * Updates current task state
   */
  setState(this: void, state: TaskState.Running | TaskState.Succeeded | TaskState.Failed): void;
}

export interface Task$ extends DepNode {
  /**
   * Uniquely identifies the task.
   */
  readonly id: string;

  /**
   * Current state of the task.
   */
  readonly state: TaskState;

  /**
   * "Cost" to run the task, used to limit the number of parallel tasks by the task manager.
   */
  readonly weight: number;

  /**
   * Reference on current state of the task.
   */
  readonly state$: Ref<TaskState> & Observable<TaskState>;

  /**
   * Starts the task, throws if the task is not yet ready.
   */
  start(this: void): Promise<void>;

  /**
   * Cancels the task.
   */
  cancel(this: void): Promise<void>;
}
