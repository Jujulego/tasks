import { Task } from '../src';
import { TestGroupTask, TestTask } from './utils';

// Setup
let group: TestGroupTask;

const taskAddedEventSpy = jest.fn<void, [Task]>();
const taskStartedEventSpy = jest.fn<void, [Task]>();
const taskCompletedEventSpy = jest.fn<void, [Task]>();

beforeEach(() => {
  group = new TestGroupTask('test');

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
    expect(task.context.groupTask).toBe(group);

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
