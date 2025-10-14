import { filter$, is$, once$, pick$, pipe$, reduce$ } from 'kyrielle';
import { cpus } from 'node:os';
import { registry$, type Registry$ } from './bases/registry$.js';
import { isWorkloadEnded, isWorkloadWaiting, WorkloadState } from './enums/workload-state.js';
import type { Workload$ } from './workload$.js';

// Constants
export const DEFAULT_STRENGTH = Math.max(cpus().length - 1, 1);

/**
 * Creates a workload scheduler.
 *
 * @since 3.0.0
 */
export function scheduler$(props: SchedulerProps = {}): Scheduler$ {
  const { strength = DEFAULT_STRENGTH } = props;

  const registry = registry$();

  const running = new Set<Workload$>();
  const queue: Workload$[] = [];
  let dirty = false;

  function schedule() {
    if (dirty) return;
    dirty = true;

    let runningWeight = pipe$(running, reduce$((w: number, t) => w + t.weight, 0));

    for (const workload of queue) {
      if (workload.state() !== WorkloadState.Ready) {
        continue;
      }

      if (runningWeight + workload.weight > strength) {
        break;
      }

      // Start workload
      workload.start(registry);

      running.add(workload);
      runningWeight += workload.weight;

      // Schedule new workloads once this one ends
      const isEnded$ = pipe$(workload.state$, filter$(isWorkloadEnded));

      once$(isEnded$, () => {
        running.delete(workload);
        runningWeight -= workload.weight;

        schedule();
      });
    }

    dirty = false;
  }

  pipe$(
    pick$(registry.events$, 'added'),
    filter$((wkl) => isWorkloadWaiting(wkl.state()))
  ).subscribe((workload) => {
    queue.push(workload);

    // Schedule new workloads once this one is ready
    const isReady$ = pipe$(workload.state$, is$(WorkloadState.Ready));
    once$(isReady$, () => schedule());
  });
  
  return {
    ...registry,
    strength,
  };
}

// Types
export interface SchedulerProps {
  /**
   * Scheduler's total strength, limits the total weight of running workloads.
   * Defaults to cpu count
   */
  readonly strength?: number;
}

export interface Scheduler$ extends Registry$ {
  /**
   * Scheduler's total strength, limits the total weight of running workloads.
   */
  readonly strength: number;
}
