import { filter$, once$, pipe$ } from 'kyrielle';
import { isWorkloadEnded, WorkloadState } from './enums/workload-state.js';
import { workflow$, type WorkflowProps } from './workflow$.js';

/**
 * Creates a workflow running all it's tasks in parallel.
 *
 * @since 3.0.0
 */
export function parallelFlow$(props: ParallelFlowProps = {}) {
  return workflow$({
    label: 'Parallel flow',
    type: 'workflow.parallel',
    ...props,
    weight: 0,
    onOrchestrate(workloads, { scheduler, setState, signal }) {
      let outcome: WorkloadState.Succeeded | WorkloadState.Failed = WorkloadState.Succeeded;
      let ended = 0;

      function abort() {
        for (const wkl of workloads) {
          wkl.cancel();
        }
      }

      setState(WorkloadState.Running);
      signal.addEventListener('abort', abort, { once: true });

      for (const workload of workloads) {
        scheduler.register(workload);

        const ended$ = pipe$(workload.state$, filter$(isWorkloadEnded));
        once$(ended$, (state) => {
          ended++;

          if (state !== WorkloadState.Succeeded) {
            outcome = WorkloadState.Failed;
            abort();
          }

          if (ended >= workloads.length) {
            setState(outcome);
          }
        });
      }
    }
  });
}

export type ParallelFlowProps =
  Omit<WorkflowProps, 'label' | 'weight' | 'onOrchestrate' | 'onCancel'>
  & Partial<Pick<WorkflowProps, 'label'>>;
