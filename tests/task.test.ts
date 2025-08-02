import type { TaskEventCompleted, TaskEventStatus } from '@/src/task.js';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spyLogger, TestTask } from './utils.js';

// Setup
let task: TestTask;

const completedEventSpy = vi.fn<(event: TaskEventCompleted) => void>();
const statusEventSpy = vi.fn<(event: TaskEventStatus) => void>();

beforeEach(() => {
  task = new TestTask('test');

  vi.clearAllMocks();
  vi.useRealTimers();

  task.events$.on('completed', completedEventSpy);
  task.events$.on('status', statusEventSpy);
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
    dep.setStatus('done');

    expect(task.status).toBe('ready');
  });

  it('should push task to failed status when dep is failed', () => {
    task.dependsOn(dep);
    dep.setStatus('failed');

    expect(task.status).toBe('failed');
  });

  it.each(['running', 'done', 'failed'] as const)('should throw if task is %s', (status) => {
    task.setStatus(status);

    expect(() => task.dependsOn(dep))
      .toThrow(`Cannot add a dependency to a ${status} task`);
  });
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
  it('should call inner onStart method', async () => {
    await task.start();

    expect(task.onStart).toHaveBeenCalled();
    expect(task.status).toBe('starting');
    expect(spyLogger.verbose).toHaveBeenCalledWith('starting test');
  });

  it.each(['blocked', 'starting', 'running', 'done', 'failed'] as const)('should throw if task is %s', async (status) => {
    task.setStatus(status);

    await expect(task.start()).rejects.toThrow(`Cannot start a ${status} task`);
  });
});

describe('Task.stop', () => {
  it('should call inner onStop method', async () => {
    task.setStatus('running');
    await task.stop();

    expect(task.onStop).toHaveBeenCalled();
    expect(spyLogger.verbose).toHaveBeenCalledWith('stopping test');
  });

  it.each(['blocked', 'ready', 'done', 'failed'] as const)('should do nothing if task is %s', async (status) => {
    task.setStatus(status);
    await task.stop();

    expect(task.onStop).not.toHaveBeenCalled();
    expect(spyLogger.verbose).not.toHaveBeenCalled();
  });
});

describe('Task.id', () => {
  it('should be a random uuid', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('000000000000-0000-0000-0000-00000000');

    const task = new TestTask('test');

    expect(task.id).toBe('000000000000-0000-0000-0000-00000000');
    expect(crypto.randomUUID).toHaveBeenCalled();
  });

  it('should be given id', () => {
    vi.spyOn(crypto, 'randomUUID');

    const task = new TestTask('test', { id: 'test' });

    expect(task.id).toBe('test');
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });
});

describe('Task.completed', () => {
  it.each(['blocked', 'ready', 'running'] as const)('should be false for %s', (status) => {
    task.setStatus(status);

    expect(task.completed).toBe(false);
  });

  it.each(['done', 'failed'] as const)('should be true for %s', (status) => {
    task.setStatus(status);

    expect(task.completed).toBe(true);
  });
});

describe('Task.duration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should be at 0 if not started', () => {
    expect(task.duration).toBe(0);
  });

  it('should be at spent time since start', async () => {
    await task.start();

    vi.advanceTimersByTime(500);
    expect(task.duration).toBe(500);

    vi.advanceTimersByTime(500);
    expect(task.duration).toBe(1000);
  });

  it('should store duration at done time', async () => {
    await task.start();

    // "wait" and complete
    vi.advanceTimersByTime(500);
    task.setStatus('done');

    expect(task.duration).toBe(500);

    // "wait" again
    vi.advanceTimersByTime(500);
    expect(task.duration).toBe(500);
  });

  it('should store duration at failed time', async () => {
    await task.start();

    // "wait" and complete
    vi.advanceTimersByTime(500);
    task.setStatus('failed');

    expect(task.duration).toBe(500);

    // "wait" again
    vi.advanceTimersByTime(500);
    expect(task.duration).toBe(500);
  });
});

describe('Task.status', () => {
  it('should be ready on initialization', () => {
    expect(task.status).toBe('ready');
  });

  it.each(['blocked', 'running'] as const)('should emit and log status change (ready => %s)', (status) => {
    task.setStatus(status);

    expect(task.status).toBe(status);
    expect(spyLogger.debug).toHaveBeenCalledWith(`test status changed to ${status} (was ready)`);
    expect(statusEventSpy).toHaveBeenCalledWith({ previous: 'ready', status });

    expect(completedEventSpy).not.toHaveBeenCalled();
  });

  it.each(['done', 'failed'] as const)('should emit and log status change (starting => %s)', async (status) => {
    // Start task to store current date then "wait" for 1s
    vi.useFakeTimers();

    await task.start();
    vi.advanceTimersByTime(1000);

    // Set completed status
    task.setStatus(status);

    expect(task.status).toBe(status);
    expect(spyLogger.debug).toHaveBeenCalledWith(`test status changed to ${status} (was starting)`);
    expect(statusEventSpy).toHaveBeenCalledWith({ previous: 'starting', status });

    expect(completedEventSpy).toHaveBeenCalledWith({ status, duration: 1000 });
  });

  it.each(['done', 'failed'] as const)('should emit completed with 0 duration (ready => %s)', (status) => {
    // Start task to store current date then "wait" for 1s
    vi.useFakeTimers();

    vi.advanceTimersByTime(1000);
    task.setStatus(status);

    expect(completedEventSpy).toHaveBeenCalledWith({ status, duration: 0 });
  });

  it('should not emit no effective change', () => {
    task.setStatus('ready');

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
