// Enum
export enum TaskState {
  /**
   * Task is created, not yet given to a task manager
   */
  Created = 'created',

  /**
   * Task is blocked by one of its dependencies
   */
  Blocked = 'blocked',

  /**
   * Task is waiting to be started
   */
  Queued = 'queued',

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
   * Task was canceled
   */
  Canceled = 'canceled',
}

// Utils
export function isTaskWaiting(state: TaskState) {
  return [TaskState.Created, TaskState.Blocked, TaskState.Queued].includes(state);
}

export function isTaskActive(state: TaskState) {
  return [TaskState.Starting, TaskState.Running].includes(state);
}

export function isTaskCompleted(state: TaskState) {
  return [TaskState.Succeeded, TaskState.Failed].includes(state);
}
