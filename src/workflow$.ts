import { isWorkloadWaiting } from './enums/workload-state.js';
import { job$, type Job$, type JobProps } from './job$.js';
import { assert } from './utils/assert.js';
import { type Workload$, type WorkloadOnStartProps } from './workload$.js';

/**
 * Creates an orchestrated group of workloads.
 *
 * @since 3.0.0
 */
export function workflow$(props: GroupProps): Group$ {
  const { onOrchestrate, ...rest } = props;
  const items: Workload$[] = [];

  // Bases
  const job = job$({
    ...rest,
    onStart: (props) => onOrchestrate(items, props),
  });

  return {
    ...job,
    items: () => items,
    push: (...workloads) => {
      assert(isWorkloadWaiting(job.state()), `Cannot add a workload to a group in ${job.state()} state`);

      for (const workload of workloads) {
        assert(isWorkloadWaiting(workload.state()), `Cannot add a workload in ${workload.state()} state to a group`);

        // Mark workload
        const marked = workload as Marked;

        if (!marked[GROUP_MARK]) {
          Object.defineProperty(marked, GROUP_MARK, {
            enumerable: true,
            writable: false,
            value: job.id,
          });
        }

        if (marked[GROUP_MARK] !== job.id) {
          throw new Error(`Cannot add workflow to group, it is already member of ${marked[GROUP_MARK]}`);
        }
      }

      items.push(...workloads);
    },
  };
}

// Utils
const GROUP_MARK = Symbol.for('@jujulego/tasks:group-mark');

// Types
interface Marked {
  [GROUP_MARK]?: string;
}

export interface GroupProps extends Omit<JobProps, 'onStart'> {
  /**
   * Uniquely identifies the group.
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * Group's orchestration weight. A group with a high weight need many resources, independently of its members.
   * Defaults to 1.
   */
  readonly weight?: number;

  /**
   * Callback used to register each task in the order they should start.
   */
  readonly onOrchestrate: (this: void, items: readonly Workload$[], props: WorkloadOnStartProps) => Promise<void> | void;

  /**
   * Callback used to cancel or interrupt the group's orchestration.
   */
  readonly onCancel?: (this: void) => Promise<void> | void;
}

export interface Group$ extends Job$ {
  /**
   * Items contained in group.
   */
  items(): readonly Workload$[];

  /**
   * Push an item to the group. Throws if group is not waiting.
   */
  push(...workloads: Workload$[]): void;
}
