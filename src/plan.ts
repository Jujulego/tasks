import { AnyTask, AnyTaskSummary, Task } from './task';
import { GroupTask } from './group-task';

// Utils
export function* _plan(task: AnyTask, marks: Set<AnyTask>): Generator<AnyTaskSummary, void, undefined> {
  // Ensure task is treated only once
  if (marks.has(task)) return;
  marks.add(task);

  // Handle dependencies
  for (const dep of task.dependencies) {
    yield* _plan(dep, marks);
  }

  // Handle group's children
  if (task instanceof GroupTask) {
    for (const child of task.tasks) {
      yield* _plan(child, marks);
    }
  }

  // Handle task it self
  yield task.summary;
}

export function* plan(tasks: AnyTask | Iterable<AnyTask>): Generator<AnyTaskSummary, void, undefined> {
  if (tasks instanceof Task) {
    tasks = [tasks];
  }

  // Recursively pass on all tasks
  const marks = new Set<AnyTask>();

  for (const task of tasks) {
    yield* _plan(task, marks);
  }
}
