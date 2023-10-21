import { vi } from 'vitest';

import { ParallelGroup } from '@/src/groups/parallel-group.js';
import { TaskManager } from '@/src/task-manager.js';

import { flushPromises, spyLogger, TestTask } from '../utils.js';

// Setup
let manager: TaskManager;
let group: ParallelGroup;
let tasks: TestTask[];

beforeEach(() => {
  manager = new TaskManager({ jobs: 8, logger: spyLogger });
  group = new ParallelGroup('test', {}, { logger: spyLogger });
  tasks = [
    new TestTask('task-0'),
    new TestTask('task-1'),
    new TestTask('task-2'),
  ];
});

// Tests
describe('ParallelGroup.start', () => {
  it('should add all task at once', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);

    vi.spyOn(manager, 'add');
    await flushPromises();

    expect(manager.add).toHaveBeenCalledTimes(3);
    expect(manager.add).toHaveBeenCalledWith(tasks[0]);
    expect(manager.add).toHaveBeenCalledWith(tasks[1]);
    expect(manager.add).toHaveBeenCalledWith(tasks[2]);
  });

  it('should be done if all task are done', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    tasks[0].setStatus('done');
    tasks[1].setStatus('done');
    tasks[2].setStatus('done');

    expect(group.status).toBe('done');
  });

  it('should be failed if one task is failed', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    tasks[0].setStatus('done');
    tasks[1].setStatus('done');
    tasks[2].setStatus('failed');

    expect(group.status).toBe('failed');
  });
});

describe('ParallelGroup.stop', () => {
  it('should stop all tasks', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    group.stop();

    expect(tasks[0]._stop).toHaveBeenCalled();
    expect(tasks[1]._stop).toHaveBeenCalled();
    expect(tasks[2]._stop).toHaveBeenCalled();
  });
});

describe('ParallelGroup.complexity', () => {
  it('should be the maximum child task complexity', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    vi.spyOn(tasks[0], 'complexity').mockReturnValue(5);
    vi.spyOn(tasks[1], 'complexity').mockReturnValue(3);
    vi.spyOn(tasks[2], 'complexity').mockReturnValue(7);

    expect(group.complexity()).toBe(7);
  });

  it('should be the maximum task complexity added to group dependencies', async () => {
    group.add(tasks[0]);

    group.dependsOn(tasks[1]);
    group.dependsOn(tasks[2]);

    vi.spyOn(tasks[0], 'complexity').mockReturnValue(5);
    vi.spyOn(tasks[1], 'complexity').mockReturnValue(3);
    vi.spyOn(tasks[2], 'complexity').mockReturnValue(7);

    expect(group.complexity()).toBe(15);
  });
});
