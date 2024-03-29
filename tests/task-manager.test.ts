import os from 'node:os';
import { vi } from 'vitest';

import { Task } from '@/src/task.js';
import { TaskManager } from '@/src/task-manager.js';

import { spyLogger, TestTask } from './utils.js';

// Setup
let tasks: TestTask[];
let manager: TaskManager;

const addedEventSpy = vi.fn<[Task], void>();
const startedEventSpy = vi.fn<[Task], void>();
const completedEventSpy = vi.fn<[Task], void>();

beforeEach(() => {
  tasks = [
    new TestTask('test-0'),
    new TestTask('test-1'),
    new TestTask('test-2'),
  ];

  manager = new TaskManager({ jobs: 1, logger: spyLogger });

  vi.resetAllMocks();
  vi.restoreAllMocks();

  manager.on('added', addedEventSpy);
  manager.on('started', startedEventSpy);
  manager.on('completed', completedEventSpy);
});

// Tests
describe('TaskManager.add', () => {
  it('should store task and start it', () => {
    manager.add(tasks[0]);

    expect(manager.tasks).toContain(tasks[0]);
    expect(tasks[0].status).toBe('starting');

    expect(startedEventSpy).toHaveBeenCalledWith(tasks[0]);
    expect(addedEventSpy).toHaveBeenCalledWith(tasks[0]);
  });

  it('should only start 1 task a the same time (sum of task weight < jobs options)', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    expect(tasks[0].status).toBe('starting');
    expect(tasks[1].status).toBe('ready');
    expect(tasks[2].status).toBe('ready');
  });

  it('should only start 2 task a the same time (sum of task weight < jobs options)', () => {
    const lightWeight = new TestTask('light weight', { weight: 0 });

    manager.add(lightWeight);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    expect(lightWeight.status).toBe('starting');
    expect(tasks[1].status).toBe('starting');
    expect(tasks[2].status).toBe('ready');
  });

  it('should store task and all it\'s dependencies and start the dependency', () => {
    tasks[1].dependsOn(tasks[2]);
    manager.add(tasks[1]);

    expect(manager.tasks).toContain(tasks[1]);
    expect(manager.tasks).toContain(tasks[2]);

    expect(tasks[1].status).toBe('blocked');
    expect(tasks[2].status).toBe('starting');
  });

  it('should start next task when current is done', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    tasks[0].setStatus('done');

    expect(tasks[0].status).toBe('done');
    expect(tasks[1].status).toBe('starting');
    expect(tasks[2].status).toBe('ready');

    expect(completedEventSpy).toHaveBeenCalledWith(tasks[0]);
  });

  it('should start next task when current is failed', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    tasks[0].setStatus('failed');

    expect(tasks[0].status).toBe('failed');
    expect(tasks[1].status).toBe('starting');
    expect(tasks[2].status).toBe('ready');

    expect(completedEventSpy).toHaveBeenCalledWith(tasks[0]);
  });
});

describe('TaskManager.jobs', () => {
  it('should be 1 as defined in options', () => {
    expect(manager.jobs).toBe(1);
  });

  it('should be the number of cpus by default', () => {
    vi.spyOn(os, 'cpus').mockReturnValue([{}, {}, {}] as os.CpuInfo[]);
    const mng = new TaskManager({ logger: spyLogger });

    expect(mng.jobs).toBe(3);
    expect(os.cpus).toHaveBeenCalled();
  });

  it('should start tasks if more jobs are available', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    manager.jobs = 2;

    expect(tasks[0].status).toBe('starting');
    expect(tasks[1].status).toBe('starting');
    expect(tasks[2].status).toBe('ready');
  });
});
