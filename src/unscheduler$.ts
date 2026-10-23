import { filter$, is$, once$, pick$, pipe$ } from 'kyrielle';
import { registry$, type Registry$ } from './bases/registry$.js';
import { isWorkloadWaiting, WorkloadState } from './enums/workload-state.js';
import type { Workload$ } from './workload$.js';

/**
 * Starts workloads as soon as they are ready.
 *
 * @since 3.0.0
 */
export function unscheduler$(): Registry$ {
  const registry = registry$();

  pipe$(
    pick$(registry.events$, 'added'),
    filter$((wkl) => isWorkloadWaiting(wkl.state()))
  ).subscribe((workload: Workload$) => {
    const isReady = pipe$(workload.state$, is$(WorkloadState.Ready));
    once$(isReady, () => void workload.start(registry));
  });

  return registry;
}