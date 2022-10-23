import { ParallelGroup, TaskManager } from '../src';
import { flushPromises, spyLogger, TestTask } from './utils';

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

    jest.spyOn(manager, 'add');
    await flushPromises();

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

    tasks[0].status = 'done';
    tasks[1].status = 'done';
    tasks[2].status = 'done';

    expect(group.status).toBe('done');
  });

  it('should be failed if one task is failed', async () => {
    group.add(tasks[0]);
    group.add(tasks[1]);
    group.add(tasks[2]);

    manager.add(group);
    await flushPromises();

    tasks[0].status = 'done';
    tasks[1].status = 'done';
    tasks[2].status = 'failed';

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
