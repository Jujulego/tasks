import { GroupTask } from '@/src/groups/group-task.js';
import { Task, TaskOptions, TaskStatus } from '@/src/task.js';
import { logger$ } from '@kyrielle/logger';
import { vi } from 'vitest';

// Classes
export class TestTask extends Task {
  // Constructor
  constructor(readonly name: string, opts: TaskOptions = {}) {
    super({}, { logger: spyLogger, ...opts });
  }

  // Methods
  readonly onStart = vi.fn();
  readonly onStop = vi.fn();

  setStatus(status: TaskStatus) {
    super.setStatus(status);
  }
}

export class TestGroupTask extends GroupTask {
  // Constructor
  constructor(name: string, opts: TaskOptions = {}) {
    super(name, {}, { logger: spyLogger, ...opts });
  }

  // Methods
  readonly onOrchestrate = vi.fn();
  readonly onStop = vi.fn();
}

// Logger
export const spyLogger = logger$();
vi.spyOn(spyLogger, 'debug');
vi.spyOn(spyLogger, 'verbose');
vi.spyOn(spyLogger, 'info');
vi.spyOn(spyLogger, 'warning');
vi.spyOn(spyLogger, 'error');

// Utils
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
