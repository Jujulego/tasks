import { isWorkloadWaiting } from './enums/workload-state.js';
import { job$, type Job$, type JobProps } from './job$.js';
import { assert } from './utils/assert.js';
import { type Workload$, type WorkloadOnStartProps } from './workload$.js';

/**
 * Creates an orchestrated group of workloads.
 *
 * @since 3.0.0
 */
export function workflow$(props: WorkflowProps): Workflow$ {
  const { onOrchestrate, onCancel, ...rest } = props;
  const workloads: Workload$[] = [];

  // Bases
  const job = job$({
    ...rest,
    onStart: (props) => onOrchestrate(workloads, props),
    onCancel: () => onCancel?.(workloads),
  });

  return {
    ...job,
    workloads: () => workloads,
    push: (...workloads) => {
      assert(isWorkloadWaiting(job.state()), `Cannot add a workload to a workflow in ${job.state()} state`);

      for (const workload of workloads) {
        assert(isWorkloadWaiting(workload.state()), `Cannot add a workload in ${workload.state()} state to a workflow`);

        // Mark workload
        const marked = workload as Marked;

        if (!marked[WORKFLOW_ID]) {
          Object.defineProperty(marked, WORKFLOW_ID, {
            enumerable: true,
            writable: false,
            value: job.id,
          });
        }

        if (marked[WORKFLOW_ID] !== job.id) {
          throw new Error(`Cannot add workload to workflow, it is already member of ${marked[WORKFLOW_ID]}`);
        }
      }

      workloads.push(...workloads);
    },
  };
}

// Utils
const WORKFLOW_ID = Symbol.for('@jujulego/tasks:workflow-id');

// Types
interface Marked {
  [WORKFLOW_ID]?: string;
}

export interface WorkflowProps extends Omit<JobProps, 'onStart' | 'onCancel'> {
  /**
   * Uniquely identifies the workflow.
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * Workflow's orchestration weight. A workflow with a high weight need many resources, independently of its workloads.
   * Defaults to 1.
   */
  readonly weight?: number;

  /**
   * Callback used to register each task in the order they should start.
   */
  readonly onOrchestrate: (this: void, workloads: readonly Workload$[], props: WorkloadOnStartProps) => Promise<void> | void;

  /**
   * Callback used to cancel or interrupt the workflow's orchestration and workloads.
   */
  readonly onCancel?: (this: void, workloads: readonly Workload$[]) => Promise<void> | void;
}

export interface Workflow$ extends Job$ {
  /**
   * Workloads contained in group.
   */
  workloads(this: void): readonly Workload$[];

  /**
   * Push some workloads to the workflow.
   */
  push(this: void, ...workloads: Workload$[]): void;
}
