import { Task, TaskManager } from '../src';
import { spyLogger, TestGroupTask, TestTask } from './utils';

// Setup
let group: TestGroupTask;
let manager: TaskManager;

const taskAddedEventSpy = jest.fn<void, [Task]>();
const taskStartedEventSpy = jest.fn<void, [Task]>();
const taskCompletedEventSpy = jest.fn<void, [Task]>();

beforeEach(() => {
  group = new TestGroupTask('test');
  manager = new TaskManager({ jobs: 1, logger: spyLogger });

  jest.resetAllMocks();
  jest.restoreAllMocks();

  group.subscribe('task.added', taskAddedEventSpy);
  group.subscribe('task.started', taskStartedEventSpy);
  group.subscribe('task.completed', taskCompletedEventSpy);
});

// Tests
describe('GroupTask.add', () => {
  it('should add task to the group', () => {
    const task = new TestTask('test-1');
    group.add(task);
    
    expect(group.tasks).toContain(task);
    expect(task.group).toBe(group);

    expect(taskAddedEventSpy).toHaveBeenCalledWith(task, {
      key: 'task.added',
      origin: group,
    });
  });

  it('should emit task.started when a task is started', () => {
    const task = new TestTask('test-1');
    group.add(task);

    task.status = 'running';

    expect(taskStartedEventSpy).toHaveBeenCalledWith(task, {
      key: 'task.started',
      origin: group,
    });
  });

  it('should emit task.completed when a task is completed', () => {
    const task = new TestTask('test-1');
    group.add(task);

    task.emit('completed', { status: 'done', duration: 1000 });

    expect(taskCompletedEventSpy).toHaveBeenCalledWith(task, {
      key: 'task.completed',
      origin: group,
    });
  });

  it('should throw if task is already within a other group', () => {
    const otherGroup = new TestGroupTask('other');

    const task = new TestTask('test-1');
    otherGroup.add(task);

    expect(() => group.add(task))
      .toThrow('Cannot add task test-1 to group test, it\'s already in group other');
  });
});

describe('GroupTask.start', () => {
  it('should call orchestrate and start yielded task', async () => {
    // Mock orchestrate
    const task = new TestTask('test-1');

    group._orchestrate.mockImplementation(async function* () {
      yield task;
    });

    // Start group
    manager.add(group);

    jest.spyOn(manager, 'add');
    jest.spyOn(group, 'add');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(group._orchestrate).toHaveBeenCalled();
    expect(group.add).toHaveBeenCalledWith(task);
    expect(manager.add).toHaveBeenCalledWith(task);
  });

  it('should throw if called directly, without a manager', () => {
    expect(() => group.start()).toThrow('A GroupTask must be started using a TaskManager');

    expect(group._orchestrate).not.toHaveBeenCalled();
  });

  it('should stop itself if orchestrate fails', async () => {
    // Mock orchestrate
    // eslint-disable-next-line require-yield
    group._orchestrate.mockImplementation(async function* () {
      throw new Error('Failed !');
    });

    // Start group
    manager.add(group);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(group.status).toBe('failed');
    expect(group._stop).toHaveBeenCalled();

    expect(spyLogger.error).toHaveBeenCalledWith(
      'An error happened in group test. Stopping it',
      new Error('Failed !')
    );
  });
});

describe('GroupTask.stats', () => {
  let task: TestTask;
  
  beforeEach(() => {
    task = new TestTask('test-1');
    group.add(task);
  });

  for (const status of ['blocked', 'ready', 'running', 'done', 'failed'] as const) {
    it(`should return 1 for ${status} and 0 for other statuses`, () => {
      task.status = status;

      expect(group.stats).toEqual({
        blocked: 0,
        ready: 0,
        running: 0,
        done: 0,
        failed: 0,
        [status]: 1,
      });
    });
  }
});
