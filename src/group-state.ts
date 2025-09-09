// Enum
export enum GroupState {
  /**
   * Group is blocked, not yet ready to be started
   */
  Blocked = 'blocked',

  /**
   * Group is waiting to be started
   */
  Ready = 'ready',

  /**
   * Group is running
   */
  Running = 'running',

  /**
   * Group successfully ended
   */
  Succeeded = 'succeeded',

  /**
   * Group failed
   */
  Failed = 'failed',

  /**
   * Group is canceling
   */
  Canceling = 'canceling',

  /**
   * Group was canceled
   */
  Canceled = 'canceled',
}

// Utils
export function isGroupWaiting(state: GroupState) {
  return [GroupState.Blocked, GroupState.Ready].includes(state);
}

export function isGroupActive(state: GroupState) {
  return [GroupState.Running, GroupState.Canceling].includes(state);
}

export function isGroupCompleted(state: GroupState) {
  return [GroupState.Succeeded, GroupState.Failed].includes(state);
}
