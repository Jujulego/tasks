import { logger$ } from '@jujulego/logger';
import { vi } from 'vitest';

import { GroupTask } from '@/src/group-task.js';
import { Task, TaskOptions, TaskStatus } from '@/src/task.js';

// Classes
export class TestTask extends Task {
  // Constructor
  constructor(readonly name: string, opts: TaskOptions = {}) {
    super({}, { logger: spyLogger, ...opts });
  }

  // Methods
  emit = this._taskEvents.emit;
  _start = vi.fn();
  _stop = vi.fn();

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
  _orchestrate = vi.fn();
  _stop = vi.fn();
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
