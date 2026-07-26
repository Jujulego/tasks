import { filter$, is$, type Multiplexer, multiplexer$, once$, pipe$, type Source, source$ } from 'kyrielle';
import { isWorkloadEnded, WorkloadState } from '../enums/workload-state.js';
import { dependenciesOf } from '../utils/dependencies-of.js';
import { isJob$ } from '../utils/predicates.js';
import type { Workload$ } from '../workload$.js';

/**
 * Creates a workload registry.
 *
 * @since 3.0.0
 */
export function registry$(): Registry$ {
  const workloads: Workload$[] = [];
  const events$ = multiplexer$({
    added: source$<Workload$>(),
    started: source$<Workload$>(),
    ended: source$<Workload$>(),
  });

  function _register(workload: Workload$) {
    workloads.push(workload);

    once$(
      pipe$(workload.state$, is$(WorkloadState.Running)),
      () => events$.emit('started', workload)
    );

    once$(
      pipe$(workload.state$, filter$(isWorkloadEnded)),
      () => events$.emit('ended', workload)
    );

    events$.emit('added', workload);
  }

  return {
    events$,

    register(workload: Workload$) {
      _register(workload);

      if (isJob$(workload)) {
        for (const dep of dependenciesOf(workload)) {
          _register(dep);
        }
      }
    },
    workloads: () => workloads,
  };
}

// Types
export interface Registry$ {
  readonly events$: Multiplexer<{
    'added': Source<Workload$>,
    'started': Source<Workload$>,
    'ended': Source<Workload$>,
  }>;

  /**
   * Registers a new workload and its dependencies.
   */
  register(this: void, workload: Workload$): void;

  /**
   * Returns registered workloads
   */
  workloads(this: void): readonly Workload$[];
}
