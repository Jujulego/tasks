import { is$, once$, pipe$ } from 'kyrielle';
import { isWorkloadWaiting, WorkloadState } from './enums/workload-state.js';
import type { Workload$, WorkloadScheduler } from './workload$.js';

/**
 * Starts workloads as soon as they are ready.
 *
 * @since 3.0.0
 */
export function unscheduler$(): WorkloadScheduler {
  const scheduler: WorkloadScheduler = {
    register(workload: Workload$) {
      if (!isWorkloadWaiting(workload.state())) {
        throw new Error(`Cannot schedule a workload in ${workload.state()} state`);
      }

      const isReady = pipe$(workload.state$, is$(WorkloadState.Ready));
      once$(isReady, () => void workload.start(scheduler));
    },
  };

  return scheduler;
}