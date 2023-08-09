import { vi } from 'vitest';

import { GroupTask } from '@/src/group-task';
import { ILogger } from '@/src/logger';
import { Task, TaskOptions, TaskStatus } from '@/src/task';

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
export const spyLogger: ILogger = {
  debug: vi.fn(),
  verbose: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Utils
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
