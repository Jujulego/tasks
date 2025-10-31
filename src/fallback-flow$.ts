import { filter$, pipe$, waitFor$ } from 'kyrielle';
import { isWorkloadEnded, WorkloadState } from './enums/workload-state.js';
import { workflow$, type WorkflowProps } from './workflow$.js';

/**
 * Creates a workflow running all it's tasks in sequence, until one succeeds.
 * Only fails if all added workloads failed.
 *
 * @since 3.0.0
 */
export function fallbackFlow$(props: FallbackFlowProps = {}) {
  return workflow$({
    label: 'Fallback flow',
    type: 'workflow.fallback',
    ...props,
    weight: 0,
    async onOrchestrate(workloads, { scheduler, setState, signal }) {
      let output = WorkloadState.Failed;
      setState(WorkloadState.Running);

      signal.addEventListener('abort', () => {
        for (const wkl of workloads) {
          wkl.cancel();
        }
      }, { once: true });

      for (const workload of workloads) {
        if (signal.aborted) {
          break;
        }

        if (output === WorkloadState.Failed) {
          scheduler.register(workload);

          const outcome = await waitFor$(pipe$(workload.state$, filter$(isWorkloadEnded)));

          if (outcome === WorkloadState.Succeeded) {
            output = WorkloadState.Succeeded;
          }
        } else {
          workload.cancel();
        }
      }

      setState(output);
    }
  });
}

export type FallbackFlowProps =
  Omit<WorkflowProps, 'label' | 'weight' | 'onOrchestrate' | 'onCancel'>
  & Partial<Pick<WorkflowProps, 'label'>>;
