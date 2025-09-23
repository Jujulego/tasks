import { filter$, map$, once$, pipe$, var$ } from 'kyrielle';
import { dependency$, type Dependency$ } from './dependency$.js';
import { isJobWaiting, job$, type Job$, type JobProps, JobState } from './job$.js';

/**
 * A step is a job that can be part of a greater process. It can be and have dependencies
 * and will blocked by its unsuccessful dependency.
 *
 * @since 3.0.0
 */
export function step$(props: StepProps): Step$ {
  // Bases
  const job = job$(props);
  const node = dependency$({
    id: job.id,
    completed$: pipe$(job.state$,
      map$((state) => state === JobState.Succeeded)
    ),
  });

  // Block management
  const selfBlock$ = var$(false);

  function updateBlock() {
    if (!isJobWaiting(job.state())) {
      throw new Error(`updateBlock called on a "${job.state()}" step.`);
    }

    const selfBlock = selfBlock$.defer();
    const depsBlock = node.dependencies.some((dep) => !dep.completed$.defer());

    if (!selfBlock && !depsBlock) {
      job.unblock();
    } else {
      job.block();
    }
  }

  // Build object
  return {
    ...job,
    ...node,

    dependsOn(dependency: Dependency$) {
      if (!isJobWaiting(job.state())) {
        throw new Error(`Cannot add dependency to step in "${job.state()}" state.`);
      }

      node.dependsOn(dependency);

      if (!dependency.completed$.defer()) {
        job.block();
      }

      // Track dependency state
      const isCompleted$ = pipe$(
        dependency.completed$,
        filter$((isCompleted) => isCompleted),
      );

      once$(isCompleted$, updateBlock);
    },

    block() {
      selfBlock$.mutate(true);
      updateBlock();
    },

    unblock() {
      selfBlock$.mutate(false);
      updateBlock();
    }
  };
}

// Types
export type StepProps = JobProps;
export type Step$ = Dependency$ & Job$;