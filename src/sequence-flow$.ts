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
      let outcome = WorkloadState.Succeeded;
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

        if (outcome === WorkloadState.Succeeded) {
          scheduler.register(workload);

          const finalState = await waitFor$(pipe$(workload.state$, filter$(isWorkloadEnded)));

          if (finalState !== WorkloadState.Succeeded) {
            outcome = WorkloadState.Failed;
          }
        } else {
          workload.cancel();
        }
      }

      setState(outcome);
    }
  });
}

export type SequenceFlowProps =
  Omit<WorkflowProps, 'label' | 'weight' | 'onOrchestrate' | 'onCancel'>
  & Partial<Pick<WorkflowProps, 'label'>>;
