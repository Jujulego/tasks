import { is$, once$, pipe$ } from 'kyrielle';
import { WorkloadState } from '../enums/workload-state.js';
import type { Workload$, WorkloadScheduler } from '../workload$.js';

export function unscheduler$(): WorkloadScheduler {
  const scheduler: WorkloadScheduler = {
    register(workload: Workload$) {
      const isReady = pipe$(workload.state$, is$(WorkloadState.Ready));
      once$(isReady, () => void workload.start(scheduler));
    },
  };

  return scheduler;
}