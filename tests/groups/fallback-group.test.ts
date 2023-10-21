import { vi } from 'vitest';

import { FallbackGroup } from '@/src/groups/fallback-group.js';
import { TaskManager } from '@/src/task-manager.js';

import { flushPromises, spyLogger, TestTask } from '../utils.js';

// Setup
let manager: TaskManager;
let group: FallbackGroup;
let tasks: TestTask[];

beforeEach(() => {
  manager = new TaskManager({ jobs: 8, logger: spyLogger });
  group = new FallbackGroup('test', {}, { logger: spyLogger });
  tasks = [
    new TestTask('task-0'),
    new TestTask('task-1'),
    new TestTask('task-2'),
  ];
});

// Tests
describe('FallbackGroup.start', () => {
  it('should add all task in sequence', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);

    vi.spyOn(manager, 'add');
    await flushPromises();

    // should have added first
    expect(manager.add).toHaveBeenCalledTimes(1);
    expect(manager.add).toHaveBeenCalledWith(tasks[0]);

    // complete first
    tasks[0].setStatus('failed');
    await flushPromises();

    // should have added second
    expect(manager.add).toHaveBeenCalledTimes(2);
    expect(manager.add).toHaveBeenCalledWith(tasks[1]);
  });

  it('should be done if one task is done and do not start next tasks', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    vi.spyOn(manager, 'add');
    await flushPromises();

    tasks[0].setStatus('failed');
    await flushPromises();

    tasks[1].setStatus('done');
    await flushPromises();

    expect(group.status).toBe('done');
    expect(manager.add).not.toHaveBeenCalledWith(tasks[2]);
  });

  it('should be failed if all tasks are failed', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    vi.spyOn(manager, 'add');
    await flushPromises();

    tasks[0].setStatus('failed');
    await flushPromises();

    tasks[1].setStatus('failed');
    await flushPromises();

    tasks[2].setStatus('failed');
    await flushPromises();

    expect(group.status).toBe('failed');
  });
});

describe('FallbackGroup.stop', () => {
  it('should stop running tasks and end group (task done)', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    group.stop();
    await flushPromises();

    expect(tasks[0]._stop).toHaveBeenCalled();
    tasks[0].setStatus('done');
    await flushPromises();

    expect(group.status).toBe('done');
  });

  it('should stop running tasks and end group (task failed)', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    group.stop();
    await flushPromises();

    expect(tasks[0]._stop).toHaveBeenCalled();
    tasks[0].setStatus('failed');
    await flushPromises();

    expect(group.status).toBe('failed');
  });
});

describe('FallbackGroup.complexity', () => {
  it('should be the 1st task complexity', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    vi.spyOn(tasks[0], 'complexity').mockReturnValue(5);
    vi.spyOn(tasks[1], 'complexity').mockReturnValue(3);
    vi.spyOn(tasks[2], 'complexity').mockReturnValue(7);

    expect(group.complexity()).toBe(5);
  });

  it('should be the 1st task complexity added to group dependencies', async () => {
    group.add(tasks[0]);

    group.dependsOn(tasks[1]);
    group.dependsOn(tasks[2]);

    vi.spyOn(tasks[0], 'complexity').mockReturnValue(5);
    vi.spyOn(tasks[1], 'complexity').mockReturnValue(3);
    vi.spyOn(tasks[2], 'complexity').mockReturnValue(7);

    expect(group.complexity()).toBe(15);
  });
});
