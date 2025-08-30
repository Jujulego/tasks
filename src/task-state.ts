// Enum
export enum TaskState {
  /**
   * Task is blocked, not yet ready to be started
   */
  Blocked = 'blocked',

  /**
   * Task is waiting to be started
   */
  Ready = 'ready',

  /**
   * Task is starting
   */
  Starting = 'starting',

  /**
   * Task is running
   */
  Running = 'running',

  /**
   * Task successfully ended
   */
  Succeeded = 'succeeded',

  /**
   * Task failed
   */
  Failed = 'failed',

  /**
   * Task is canceling
   */
  Canceling = 'canceling',

  /**
   * Task was canceled
   */
  Canceled = 'canceled',
}

// Utils
export function isTaskWaiting(state: TaskState) {
  return [TaskState.Blocked, TaskState.Ready].includes(state);
}

export function isTaskActive(state: TaskState) {
  return [TaskState.Starting, TaskState.Running, TaskState.Canceling].includes(state);
}

export function isTaskCompleted(state: TaskState) {
  return [TaskState.Succeeded, TaskState.Failed].includes(state);
}
