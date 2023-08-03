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
  _start = jest.fn();
  _stop = jest.fn();

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
  _orchestrate = jest.fn();
  _stop = jest.fn();
}

// Logger
export const spyLogger: ILogger = {
  debug: jest.fn(),
  verbose: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Utils
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
