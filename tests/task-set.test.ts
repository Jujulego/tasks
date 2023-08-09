import { vi } from 'vitest';

import { Task } from '@/src/task';
import { TaskManager } from '@/src/task-manager';
import { TaskSet, TaskSetResults } from '@/src/task-set';

import { spyLogger, TestTask } from './utils';

// Setup
let tasks: TestTask[];
let manager: TaskManager;
let set: TaskSet;

const startedEventSpy = vi.fn<[Task], void>();
const completedEventSpy = vi.fn<[Task], void>();
const finishedEventSpy = vi.fn<[TaskSetResults], void>();

beforeEach(() => {
  tasks = [
    new TestTask('test-0'),
    new TestTask('test-1'),
    new TestTask('test-2'),
  ];

  manager = new TaskManager({ logger: spyLogger });
  set = new TaskSet();

  vi.resetAllMocks();
  vi.restoreAllMocks();

  set.on('started', startedEventSpy);
  set.on('completed', completedEventSpy);
  set.on('finished', finishedEventSpy);
});

// Tests
describe('TaskSet.add', () => {
  it('should store task, but not dispatch it to the manager', () => {
    set.add(tasks[0]);

    expect(set.tasks).toContain(tasks[0]);
    expect(manager.tasks).not.toContain(tasks[0]);
  });

  it('should throw if set has already started', () => {
    set.add(tasks[0]);
    set.start(manager);

    expect(() => set.add(tasks[1])).toThrow('Cannot add a task to a started task set');
  });

  it('should throw if set is already finished', () => {
    set.start(manager);

    expect(() => set.add(tasks[0])).toThrow('Cannot add a task to a finished task set');
  });

  it('should emit a started event when a task starts', () => {
    set.add(tasks[0]);
    set.add(tasks[1]);
    tasks[0].setStatus('running');

    expect(startedEventSpy).toHaveBeenCalledWith(tasks[0]);
  });

  it('should emit a completed event when a task is done', () => {
    set.add(tasks[0]);
    set.add(tasks[1]);
    tasks[0].setStatus('done');

    expect(completedEventSpy).toHaveBeenCalledWith(tasks[0]);
  });

  it('should emit a completed event when a task is failed', () => {
    set.add(tasks[0]);
    set.add(tasks[1]);
    tasks[0].setStatus('failed');

    expect(completedEventSpy).toHaveBeenCalledWith(tasks[0]);
  });

  it('should emit a finished event when all tasks are completed', () => {
    set.add(tasks[0]);
    set.add(tasks[1]);
    tasks[0].setStatus('done');
    tasks[1].setStatus('failed');

    expect(set.status).toBe('finished');
    expect(finishedEventSpy).toHaveBeenCalledWith({ success: 1, failed: 1 });
  });
});

describe('TaskSet.start', () => {
  it('should put set into started status', () => {
    set.add(tasks[0]);
    set.start(manager);

    expect(set.status).toBe('started');
  });

  it('should put set into finished status if set is empty', () => {
    set.start(manager);

    expect(set.status).toBe('finished');
  });

  it('should start tasks by dispatching them to the manager', () => {
    set.add(tasks[0]);
    set.start(manager);

    expect(manager.tasks).toContain(tasks[0]);
  });

  it('should throw if set has already started', () => {
    set.add(tasks[0]);
    set.start(manager);

    expect(() => set.start(manager)).toThrow('Cannot start a started task set');
  });

  it('should throw if set is already finished', () => {
    set.start(manager);

    expect(() => set.start(manager)).toThrow('Cannot start a finished task set');
  });
});

describe('TaskSet.status', () => {
  it('should be created at the beginning', () => {
    expect(set.status).toBe('created');
  });
});

describe('TaskSet.results', () => {
  it('should increment each time a task completes', () => {
    set.add(tasks[0]);
    set.add(tasks[1]);
    set.add(tasks[2]);

    expect(set.results).toEqual({ success: 0, failed: 0 });

    // one task succeed
    tasks[0].setStatus('done');

    expect(set.results).toEqual({ success: 1, failed: 0 });

    // another task fails
    tasks[1].setStatus('failed');

    expect(set.results).toEqual({ success: 1, failed: 1 });

    // a last one task succeed
    tasks[2].setStatus('done');

    expect(set.results).toEqual({ success: 2, failed: 1 });
  });
});
