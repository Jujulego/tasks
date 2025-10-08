import { job$, type Job$, type JobProps } from './job$.js';
import { type Workload$, type WorkloadOnStartProps } from './workload$.js';

/**
 * Creates an orchestrated group of workloads.
 *
 * @since 3.0.0
 */
export function group$<S extends WorkloadScheduler>(props: GroupProps<S>): Group$<S> {
  const { scheduler, onOrchestrate, ...rest } = props;

  // Bases
  const job = job$({
    ...rest,
    onStart({ setState, signal }): void {
      void onOrchestrate({
        signal,
        setState,
        register(workload: Workload$) {
          scheduler.register(workload);
        },
      });
    }
  });

  return {
    ...job,
    scheduler,
  };
}

// Types
export interface WorkloadScheduler {
  /**
   * Registers a workload to be started as soon as possible.
   */
  register(workload: Workload$): void;
}

export interface GroupProps<S extends WorkloadScheduler> extends Omit<JobProps, 'onStart'> {
  /**
   * Uniquely identifies the group.
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * Scheduler used to start workloads.
   */
  readonly scheduler: S;

  /**
   * Group's orchestration weight. A group with a high weight need many resources, independently of its members.
   * Defaults to 0.
   */
  readonly weight?: number;

  /**
   * Callback used to register each task in the order they should start.
   */
  readonly onOrchestrate: (this: void, props: GroupOnOrchestrateProps) => Promise<void>;

  /**
   * Callback used to cancel or interrupt the group's orchestration.
   */
  readonly onCancel?: (this: void) => Promise<void> | void;
}

export interface GroupOnOrchestrateProps extends WorkloadOnStartProps {
  /**
   * Triggered when group is canceled
   */
  readonly signal: AbortSignal;

  /**
   * Registers a workload to be started as soon as possible.
   */
  register(this: void, workload: Workload$): void;
}

export interface Group$<S extends WorkloadScheduler> extends Job$ {
  /**
   * Scheduler used to start workloads.
   */
  readonly scheduler: S;
}
