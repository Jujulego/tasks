import { Task, TaskSummary } from './task.js';
import { GroupTask } from './group-task.js';

// Utils
export function* _plan(task: Task, marks: Set<Task>): Generator<TaskSummary, void, undefined> {
  // Ensure task is treated only once
  if (marks.has(task)) return;
  marks.add(task);

  // Handle dependencies
  for (const dep of task.dependencies) {
    yield* _plan(dep, marks);
  }

  // Handle task it self
  yield task.summary;

  // Handle group's children
  if (task instanceof GroupTask) {
    for (const child of task.tasks) {
      yield* _plan(child, marks);
    }
  }
}

export function* plan(tasks: Task | Iterable<Task>): Generator<TaskSummary, void, undefined> {
  if (tasks instanceof Task) {
    tasks = [tasks];
  }

  // Recursively pass on all tasks
  const marks = new Set<Task>();

  for (const task of tasks) {
    yield* _plan(task, marks);
  }
}
