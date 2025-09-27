export enum WorkloadState {
  /**
   * Workload is blocked, not yet ready to be started
   */
  Blocked = 'blocked',

  /**
   * Workload is waiting to be started
   */
  Ready = 'ready',

  /**
   * Workload is starting
   */
  Starting = 'starting',

  /**
   * Workload is running
   */
  Running = 'running',

  /**
   * Workload successfully ended
   */
  Succeeded = 'succeeded',

  /**
   * Workload failed
   */
  Failed = 'failed',

  /**
   * Workload is canceling
   */
  Canceling = 'canceling',

  /**
   * Workload was canceled
   */
  Canceled = 'canceled',
}

// Utils
export function isWorkloadWaiting(state: WorkloadState) {
  return [WorkloadState.Blocked, WorkloadState.Ready].includes(state);
}

export function isWorkloadActive(state: WorkloadState) {
  return [WorkloadState.Starting, WorkloadState.Running, WorkloadState.Canceling].includes(state);
}

export function isWorkloadCompleted(state: WorkloadState) {
  return [WorkloadState.Succeeded, WorkloadState.Failed].includes(state);
}
