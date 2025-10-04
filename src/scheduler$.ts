import { filter$, once$, pipe$, reduce$ } from 'kyrielle';
import { cpus } from 'node:os';
import { isWorkloadEnded, WorkloadState } from './enums/workload-state.js';
import type { Workload$ } from './workload$.js';

// Constants
export const DEFAULT_STRENGTH = Math.max(cpus().length - 1, 1);

/**
 * Creates a workload scheduler.
 *
 * @since 3.0.0
 */
export function scheduler$(props: SchedulerProps): Scheduler$ {
  const { strength = DEFAULT_STRENGTH } = props;
  const running = new Set<Workload$>();
  const queue: Workload$[] = [];

  async function schedule() {
    let runningWeight = pipe$(running, reduce$((w: number, t) => w + t.weight, 0));

    while (runningWeight < strength) {
      const workload = queue.pop();

      if (!workload) {
        break;
      }

      if (workload.state() !== WorkloadState.Ready || workload.weight + runningWeight > strength) {
        queue.push(workload);
        break;
      }

      // Schedule new workloads once this one ends
      const isEnded$ = pipe$(workload.state$, filter$(isWorkloadEnded));

      once$(isEnded$, () => {
        running.delete(workload);
        void schedule();
      });

      // Start workload
      await workload.start();
      running.add(workload);
      runningWeight += workload.weight;
    }
  }

  return {
    strength,

    register(workload: Workload$) {
      queue.unshift(workload);

      // Schedule new workloads once this one is ready
      const isReady$ = pipe$(
        workload.state$,
        filter$((state) => state === WorkloadState.Ready)
      );

      once$(isReady$, () => void schedule());
    },
  };
}

// Types
export interface SchedulerProps {
  /**
   * Scheduler's total strength, limits the total weight of running workloads.
   * Defaults to cpu count
   */
  strength?: number;
}

export interface Scheduler$ {
  /**
   * Scheduler's total strength, limits the total weight of running workloads.
   */
  strength: number;

  /**
   * Register workload
   */
  register(this: void, workload: Workload$): void;
}
