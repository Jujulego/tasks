import { filter$, type Multiplexer, multiplexer$, once$, pipe$, reduce$, type Source, source$ } from 'kyrielle';
import { cpus } from 'node:os';
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

  const events$ = multiplexer$({
    added: source$<Workload$>(),
    started: source$<Workload$>(),
    ended: source$<Workload$>(),
  });

  const running = new Set<Workload$>();
  const queue: Workload$[] = [];
  let dirty = false;

  async function schedule() {
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
      await workload.start();
      events$.emit('started', workload);

      running.add(workload);
      runningWeight += workload.weight;

      // Schedule new workloads once this one ends
      const isEnded$ = pipe$(workload.state$, filter$(isWorkloadEnded));

      once$(isEnded$, () => {
        events$.emit('ended', workload);

        running.delete(workload);
        runningWeight -= workload.weight;

        void schedule();
      });
    }

    dirty = false;
  }

  return {
    events$,
    strength,

    register(workload: Workload$) {
      if (!isWorkloadWaiting(workload.state())) {
        throw new Error(`Cannot schedule a workload in ${workload.state()} state`);
      }

      queue.push(workload);
      events$.emit('added', workload);

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
  readonly strength?: number;
}

export interface Scheduler$ {
  /**
   * Scheduler's total strength, limits the total weight of running workloads.
   */
  readonly strength: number;

  /**
   * Scheduler's events
   */
  readonly events$: Multiplexer<{
    'added': Source<Workload$>,
    'started': Source<Workload$>,
    'ended': Source<Workload$>,
  }>;

  /**
   * Registers a workload to be started as soon as possible.
   */
  register(this: void, workload: Workload$): void;
}
