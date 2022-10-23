import { SequenceGroup, TaskManager } from '../src';
import { flushPromises, spyLogger, TestTask } from './utils';

// Setup
let manager: TaskManager;
let group: SequenceGroup;
let tasks: TestTask[];

beforeEach(() => {
  manager = new TaskManager({ jobs: 8, logger: spyLogger });
  group = new SequenceGroup('test', {}, { logger: spyLogger });
  tasks = [
    new TestTask('task-0'),
    new TestTask('task-1'),
    new TestTask('task-2'),
  ];
});

// Tests
describe('SequenceGroup.start', () => {
  it('should add all task in sequence', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);

    jest.spyOn(manager, 'add');
    await flushPromises();

    // should have added first
    expect(manager.add).toHaveBeenCalledTimes(1);
    expect(manager.add).toHaveBeenCalledWith(tasks[0]);

    // complete first
    tasks[0].status = 'done';
    await flushPromises();

    // should have added second
    expect(manager.add).toHaveBeenCalledTimes(2);
    expect(manager.add).toHaveBeenCalledWith(tasks[1]);
  });

  it('should be done if all task are done', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    tasks[0].status = 'done';
    await flushPromises();

    tasks[1].status = 'done';
    await flushPromises();

    tasks[2].status = 'done';
    await flushPromises();

    expect(group.status).toBe('done');
  });

  it('should be failed if one task is failed and do not start next tasks', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);

    jest.spyOn(manager, 'add');
    await flushPromises();

    tasks[0].status = 'failed';
    await flushPromises();

    expect(group.status).toBe('failed');
    expect(manager.add).not.toHaveBeenCalledWith(tasks[1]);
    expect(manager.add).not.toHaveBeenCalledWith(tasks[2]);
  });
});

describe('SequenceGroup.stop', () => {
  it('should stop running tasks and end group (task done)', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    group.stop();
    await flushPromises();

    expect(tasks[0]._stop).toHaveBeenCalled();
    tasks[0].status = 'done';
    await flushPromises();

    expect(group.status).toBe('failed');
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
    tasks[0].status = 'failed';
    await flushPromises();

    expect(group.status).toBe('failed');
  });
});
