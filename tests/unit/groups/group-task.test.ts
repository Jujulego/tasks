import { TaskManager } from '@/src/task-manager.js';
import type { Task } from '@/src/task.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spyLogger, TestGroupTask, TestTask } from '../../utils.js';

// Setup
let group: TestGroupTask;
let manager: TaskManager;

const taskAddedEventSpy = vi.fn<(task: Task) => void>();
const taskStartedEventSpy = vi.fn<(task: Task) => void>();
const taskCompletedEventSpy = vi.fn<(task: Task) => void>();

beforeEach(() => {
  group = new TestGroupTask('test');
  manager = new TaskManager({ jobs: 1, logger: spyLogger });

  vi.clearAllMocks();

  group.events$.on('task.added', taskAddedEventSpy);
  group.events$.on('task.started', taskStartedEventSpy);
  group.events$.on('task.completed', taskCompletedEventSpy);
});

// Tests
describe('GroupTask.add', () => {
  it('should add task to the group', () => {
    const task = new TestTask('test-1');
    group.add(task);
    
    expect(group.tasks).toContain(task);
    expect(task.group).toBe(group);

    expect(taskAddedEventSpy).toHaveBeenCalledWith(task);
  });

  it('should emit task.started when a task is started', () => {
    const task = new TestTask('test-1');
    group.add(task);

    task.setStatus('running');

    expect(group.status).toBe('running');
    expect(taskStartedEventSpy).toHaveBeenCalledWith(task);
  });

  it('should emit task.completed when a task is completed', () => {
    const task = new TestTask('test-1');
    group.add(task);

    task.events$.emit('completed', { status: 'done', duration: 1000 });

    expect(taskCompletedEventSpy).toHaveBeenCalledWith(task);
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

    vi.mocked(group.onOrchestrate).mockImplementation(async function* () {
      yield task;
    });

    // Start group
    manager.add(group);

    vi.spyOn(manager, 'add');
    vi.spyOn(group, 'add');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(group.onOrchestrate).toHaveBeenCalled();
    expect(group.add).toHaveBeenCalledWith(task);
    expect(manager.add).toHaveBeenCalledWith(task);
  });

  it('should throw if called directly, without a manager', async () => {
    await expect(group.start()).rejects.toThrow('A GroupTask must be started using a TaskManager');

    expect(group.onOrchestrate).not.toHaveBeenCalled();
  });

  it('should stop itself if orchestrate fails', async () => {
    // Mock orchestrate
    // eslint-disable-next-line require-yield
    vi.mocked(group.onOrchestrate).mockImplementation(async function* () {
      throw new Error('Failed !');
    });

    // Start group
    manager.add(group);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(group.status).toBe('failed');
    expect(group.onStop).toHaveBeenCalled();

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

  for (const status of ['blocked', 'ready', 'starting', 'running', 'done', 'failed'] as const) {
    it(`should return 1 for ${status} and 0 for other statuses`, () => {
      task.setStatus(status);

      expect(group.stats).toEqual({
        blocked: 0,
        ready: 0,
        starting: 0,
        running: 0,
        done: 0,
        failed: 0,
        [status]: 1,
      });
    });
  }
});

describe('GroupTask.summary', () => {
  it('should return task summary', () => {
    expect(group.summary).toEqual({
      id: group.id,
      name: 'test',
      context: {},
      status: 'ready',
      completed: false,
      duration: 0,
      isGroup: true,
      dependenciesIds: [],
    });
  });
});
