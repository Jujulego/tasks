import os from 'node:os';

import { Task, TaskManager } from '../src';
import { spyLogger, TestTask } from './utils';

// Setup
let tasks: TestTask[];
let manager: TaskManager;

const addedEventSpy = jest.fn<void, [Task]>();
const startedEventSpy = jest.fn<void, [Task]>();
const completedEventSpy = jest.fn<void, [Task]>();

beforeEach(() => {
  tasks = [
    new TestTask('test-0'),
    new TestTask('test-1'),
    new TestTask('test-2'),
  ];

  manager = new TaskManager({ jobs: 1, logger: spyLogger });

  jest.resetAllMocks();
  jest.restoreAllMocks();

  manager.subscribe('added', addedEventSpy);
  manager.subscribe('started', startedEventSpy);
  manager.subscribe('completed', completedEventSpy);
});

// Tests
describe('TaskManager.add', () => {
  it('should store task and start it', () => {
    manager.add(tasks[0]);

    expect(manager.tasks).toContain(tasks[0]);
    expect(tasks[0].status).toBe('running');

    expect(startedEventSpy).toHaveBeenCalledWith(
      tasks[0],
      { key: 'started', origin: manager },
    );

    expect(addedEventSpy).toHaveBeenCalledWith(
      tasks[0],
      { key: 'added', origin: manager },
    );
  });

  it('should only start #jobs tasks a the same time (here 1)', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    expect(tasks[0].status).toBe('running');
    expect(tasks[1].status).toBe('ready');
    expect(tasks[2].status).toBe('ready');
  });

  it('should store task and all it\'s dependencies and start the dependency', () => {
    tasks[1].dependsOn(tasks[2]);
    manager.add(tasks[1]);

    expect(manager.tasks).toContain(tasks[1]);
    expect(manager.tasks).toContain(tasks[2]);

    expect(tasks[1].status).toBe('blocked');
    expect(tasks[2].status).toBe('running');
  });

  it('should start next task when current is done', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    tasks[0].status = 'done';

    expect(tasks[0].status).toBe('done');
    expect(tasks[1].status).toBe('running');
    expect(tasks[2].status).toBe('ready');

    expect(completedEventSpy).toHaveBeenCalledWith(
      tasks[0],
      { key: 'completed', origin: manager }
    );
  });

  it('should start next task when current is failed', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    tasks[0].status = 'failed';

    expect(tasks[0].status).toBe('failed');
    expect(tasks[1].status).toBe('running');
    expect(tasks[2].status).toBe('ready');

    expect(completedEventSpy).toHaveBeenCalledWith(
      tasks[0],
      { key: 'completed', origin: manager }
    );
  });
});

describe('TaskManager.jobs', () => {
  it('should be 1 as defined in options', () => {
    expect(manager.jobs).toBe(1);
  });

  it('should be the number of cpus by default', () => {
    jest.spyOn(os, 'cpus').mockReturnValue([{}, {}, {}] as os.CpuInfo[]);
    const mng = new TaskManager({ logger: spyLogger });

    expect(mng.jobs).toBe(3);
    expect(os.cpus).toHaveBeenCalled();
  });

  it('should start tasks if more jobs are available', () => {
    manager.add(tasks[0]);
    manager.add(tasks[1]);
    manager.add(tasks[2]);

    manager.jobs = 2;

    expect(tasks[0].status).toBe('running');
    expect(tasks[1].status).toBe('running');
    expect(tasks[2].status).toBe('ready');
  });
});
