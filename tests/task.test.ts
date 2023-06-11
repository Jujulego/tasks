import crypto from 'node:crypto';

import { TaskCompletedEvent, TaskStatusEvent } from '@/src/task';

import { spyLogger, TestTask } from './utils';

// Setup
let task: TestTask;

const completedEventSpy = jest.fn<void, [TaskCompletedEvent]>();
const statusEventSpy = jest.fn<void, [TaskStatusEvent]>();

beforeEach(() => {
  task = new TestTask('test');

  jest.resetAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();

  task.on('completed', completedEventSpy);
  task.on('status', statusEventSpy);
});

// Tests
describe('Task.dependsOn', () => {
  let dep: TestTask;

  beforeEach(() => {
    dep = new TestTask('test2');
  });

  // Cases
  it('should push task to blocked status', () => {
    task.dependsOn(dep);

    expect(task.status).toBe('blocked');
    expect(task.dependencies).toEqual([dep]);
  });

  it('should push task to ready status when dep is done', () => {
    task.dependsOn(dep);
    dep.status = 'done';

    expect(task.status).toBe('ready');
  });

  it('should push task to failed status when dep is failed', () => {
    task.dependsOn(dep);
    dep.status = 'failed';

    expect(task.status).toBe('failed');
  });

  for (const status of ['running', 'done', 'failed'] as const) {
    it(`should throw if task is ${status}`, () => {
      task.status = status;

      expect(() => task.dependsOn(dep))
        .toThrow(`Cannot add a dependency to a ${status} task`);
    });
  }
});

describe('Task.complexity', () => {
  it('should return 1 when task has no dependency', () => {
    expect(task.complexity()).toBe(1);
  });

  it('should return 2 when task has 1 direct dependency', () => {
    const t2 = new TestTask('t2');
    task.dependsOn(t2);

    expect(task.complexity()).toBe(2);
  });

  it('should return 3 when task has 1 direct dependency and an indirect one', () => {
    const t2 = new TestTask('t2');
    const t3 = new TestTask('t3');

    t2.dependsOn(t3);
    task.dependsOn(t2);

    expect(task.complexity()).toBe(3);
  });

  it('should be correct in this complex case', () => {
    const t2 = new TestTask('t2'); // => 6
    const t3 = new TestTask('t3'); // => 3
    const t4 = new TestTask('t4'); // => 2
    const t5 = new TestTask('t5'); // => 1

    task.dependsOn(t2);
    task.dependsOn(t3);
    t2.dependsOn(t3);
    t2.dependsOn(t4);
    t3.dependsOn(t4);
    t4.dependsOn(t5);

    expect(task.complexity()).toBe(10);
    expect(t2.complexity()).toBe(6);
    expect(t3.complexity()).toBe(3);
    expect(t4.complexity()).toBe(2);
    expect(t5.complexity()).toBe(1);
  });
});

describe('Task.start', () => {
  it('should call inner _start method', () => {
    task.start();

    expect(task._start).toHaveBeenCalled();
    expect(task.status).toBe('running');
    expect(spyLogger.verbose).toHaveBeenCalledWith('Running test');
  });

  for (const status of ['blocked', 'running', 'done', 'failed'] as const) {
    it(`should throw if task is ${status}`, () => {
      task.status = status;

      expect(() => task.start())
        .toThrow(`Cannot start a ${status} task`);
    });
  }
});

describe('Task.stop', () => {
  it('should call inner _stop method', () => {
    task.status = 'running';
    task.stop();

    expect(task._stop).toHaveBeenCalled();
    expect(spyLogger.verbose).toHaveBeenCalledWith('Stopping test');
  });

  for (const status of ['blocked', 'ready', 'done', 'failed'] as const) {
    it(`should do nothing if task is ${status}`, () => {
      task.status = status;
      task.stop();

      expect(task._stop).not.toHaveBeenCalled();
      expect(spyLogger.verbose).not.toHaveBeenCalled();
    });
  }
});

describe('Task.id', () => {
  it('should be a random uuid', () => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('000000000000-0000-0000-0000-00000000');

    const task = new TestTask('test');

    expect(task.id).toBe('000000000000-0000-0000-0000-00000000');
    expect(crypto.randomUUID).toHaveBeenCalled();
  });

  it('should be given id', () => {
    jest.spyOn(crypto, 'randomUUID');

    const task = new TestTask('test', { id: 'test' });

    expect(task.id).toBe('test');
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });
});

describe('Task.completed', () => {
  for (const status of ['blocked', 'ready', 'running'] as const) {
    it(`should be false for ${status}`, () => {
      task.status = status;

      expect(task.completed).toBe(false);
    });
  }

  for (const status of ['done', 'failed'] as const) {
    it(`should be true for ${status}`, () => {
      task.status = status;

      expect(task.completed).toBe(true);
    });
  }
});

describe('Task.duration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('should be at 0 if not started', () => {
    expect(task.duration).toBe(0);
  });

  it('should be at spent time since start', () => {
    task.start();

    jest.advanceTimersByTime(500);
    expect(task.duration).toBe(500);

    jest.advanceTimersByTime(500);
    expect(task.duration).toBe(1000);
  });

  it('should store duration at done time', () => {
    task.start();

    // "wait" and complete
    jest.advanceTimersByTime(500);
    task.status = 'done';

    expect(task.duration).toBe(500);

    // "wait" again
    jest.advanceTimersByTime(500);
    expect(task.duration).toBe(500);
  });

  it('should store duration at failed time', () => {
    task.start();

    // "wait" and complete
    jest.advanceTimersByTime(500);
    task.status = 'failed';

    expect(task.duration).toBe(500);

    // "wait" again
    jest.advanceTimersByTime(500);
    expect(task.duration).toBe(500);
  });
});

describe('Task.status', () => {
  it('should be ready on initialization', () => {
    expect(task.status).toBe('ready');
  });

  for (const status of ['blocked', 'running'] as const) {
    it(`should emit and log status change (ready => ${status})`, () => {
      task.status = status;

      expect(task.status).toBe(status);
      expect(spyLogger.debug).toHaveBeenCalledWith(`test is ${status}`);
      expect(statusEventSpy).toHaveBeenCalledWith({ previous: 'ready', status });

      expect(completedEventSpy).not.toHaveBeenCalled();
    });
  }

  for (const status of ['done', 'failed'] as const) {
    it(`should emit and log status change (running => ${status})`, () => {
      // Start task to store current date then "wait" for 1s
      jest.useFakeTimers();

      task.start();
      jest.advanceTimersByTime(1000);

      // Set completed status
      task.status = status;

      expect(task.status).toBe(status);
      expect(spyLogger.debug).toHaveBeenCalledWith(`test is ${status}`);
      expect(statusEventSpy).toHaveBeenCalledWith({ previous: 'running', status });

      expect(completedEventSpy).toHaveBeenCalledWith({ status, duration: 1000 });
    });

    it(`should emit completed with 0 duration (ready => ${status})`, () => {
      // Start task to store current date then "wait" for 1s
      jest.useFakeTimers();

      jest.advanceTimersByTime(1000);
      task.status = status;

      expect(completedEventSpy).toHaveBeenCalledWith({ status, duration: 0 });
    });
  }

  it('should not emit no effective change', () => {
    task.status = 'ready';

    expect(task.status).toBe('ready');
    expect(spyLogger.debug).not.toHaveBeenCalled();
    expect(statusEventSpy).not.toHaveBeenCalled();
  });
});

describe('Task.summary', () => {
  let dep: TestTask;

  beforeEach(() => {
    dep = new TestTask('test2');
  });

  // Tests
  it('should return a summary of the task', () => {
    expect(task.summary).toEqual({
      id: task.id,
      name: 'test',
      context: {},
      status: 'ready',
      completed: false,
      duration: 0,
      isGroup: false,
      dependenciesIds: [],
    });
  });

  it('should return a summary of the task with dependencies', () => {
    task.dependsOn(dep);

    expect(task.summary).toEqual({
      id: task.id,
      name: 'test',
      context: {},
      status: 'blocked',
      completed: false,
      duration: 0,
      isGroup: false,
      dependenciesIds: [dep.id],
    });
  });
});
