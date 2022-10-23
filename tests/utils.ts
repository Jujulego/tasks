import { GroupTask, ILogger, Task, TaskOptions, TaskStatus } from '../src';

// Classes
export class TestTask extends Task {
  // Constructor
  constructor(readonly name: string, opts: TaskOptions = {}) {
    super({}, { logger: spyLogger, ...opts });
  }

  // Methods
  _start = jest.fn();
  _stop = jest.fn();

  // Properties
  get status() {
    return super.status;
  }

  set status(status: TaskStatus) {
    super.status = status;
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
  warn: jest.fn(),
  error: jest.fn(),
};
