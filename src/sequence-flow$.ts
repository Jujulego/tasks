import { filter$, pipe$, waitFor$ } from 'kyrielle';
import { isWorkloadEnded, WorkloadState } from './enums/workload-state.js';
import { workflow$, type WorkflowProps } from './workflow$.js';

/**
 * Creates a workflow running all it's tasks in sequence.
 *
 * @since 3.0.0
 */
export function sequenceFlow$(props: SequenceFlowProps = {}) {
  return workflow$({
    label: 'Sequence flow',
    type: 'workflow.sequence',
    ...props,
    weight: 0,
    async onOrchestrate(workloads, { scheduler, setState, signal }) {
      setState(WorkloadState.Running);

      for (const workload of workloads) {
        scheduler.register(workload);

        const outcome = await waitFor$(pipe$(workload.state$, filter$(isWorkloadEnded)));
        signal.throwIfAborted();

        if (outcome !== WorkloadState.Succeeded) {
          setState(WorkloadState.Failed);
          return;
        }
      }

      setState(WorkloadState.Succeeded);
    },
    async onCancel(workloads) {
      await Promise.all(workloads.map((wkl) => wkl.cancel()));
    }
  });
}

export type SequenceFlowProps =
  Omit<WorkflowProps, 'label' | 'weight' | 'onOrchestrate' | 'onCancel'>
  & Partial<Pick<WorkflowProps, 'label'>>;
