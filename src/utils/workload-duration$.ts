import { type Observable, type Unsubscribable, type Var, var$ } from 'kyrielle';
import { isWorkloadEnded, WorkloadState } from '../enums/workload-state.js';

export function workloadDuration$(state: Observable<WorkloadState>): Var<WorkloadDuration> {
  const duration = var$<WorkloadDuration>({
    start: null,
    end: null,
    seconds: () => 0,
  });

  let sub: Unsubscribable;

  state.subscribe({
    start(subscription) {
      sub = subscription;
    },
    next(state) {
      if (state === WorkloadState.Starting) {
        const start = performance.now();

        duration.mutate({
          start,
          end: null,
          seconds: () => (performance.now() - start) / 1000
        });
      } else if (isWorkloadEnded(state)) {
        const start = duration.defer().start ?? performance.now();
        const end = performance.now();

        duration.mutate({
          start,
          end,
          seconds: () => (end - start) / 1000
        });
        sub.unsubscribe();
      }
    }
  });

  return duration;
}

// Type
export interface WorkloadDuration {
  /**
   * Start time, in milliseconds
   */
  start: number | null;

  /**
   * End time, in milliseconds
   */
  end: number | null;

  /**
   * Duration, in seconds
   */
  seconds(this: void): number;
}