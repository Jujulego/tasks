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
      setState(WorkloadState.Running);

      for (const workload of workloads) {
        scheduler.register(workload);

        const outcome = await waitFor$(pipe$(workload.state$, filter$(isWorkloadEnded)));
        signal.throwIfAborted();

        if (outcome === WorkloadState.Succeeded) {
          setState(WorkloadState.Succeeded);
          return;
        }
      }

      setState(WorkloadState.Failed);
    },
    async onCancel(workloads) {
      await Promise.all(workloads.map((wkl) => wkl.cancel()));
    }
  });
}

export type FallbackFlowProps =
  Omit<WorkflowProps, 'label' | 'weight' | 'onOrchestrate' | 'onCancel'>
  & Partial<Pick<WorkflowProps, 'label'>>;
