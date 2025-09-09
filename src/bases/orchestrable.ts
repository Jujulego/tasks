import type { Observable, Ref } from 'kyrielle';

export interface Orchestrable {
  /**
   * Reference indicating when task is completed.
   * Contains true when successful, and false on failure.
   */
  readonly completed$: Ref<boolean | undefined> & Observable<boolean>;

  /**
   * Starts the task.
   */
  start(): Promise<void>;

  /**
   * Cancels the task.
   */
  cancel(): Promise<void>;
}