import { ParallelGroup, plan } from '../src';
import { spyLogger, TestTask } from './utils';

// Setup
let tasks: TestTask[];
let group: ParallelGroup;

beforeEach(() => {
  group = new ParallelGroup('test', {}, { logger: spyLogger });
  tasks = [
    new TestTask('task-0'),
    new TestTask('task-1'),
    new TestTask('task-2'),
  ];
});

// Tests
describe('plan', () => {
  it('should return one task summary', () => {
    expect(Array.from(plan(tasks[0]))).toEqual([
      {
        id: tasks[0].id,
        name: 'task-0',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        isGroup: false,
        dependenciesIds: [],
      },
    ]);
  });

  it('should return all tasks summaries', () => {
    expect(Array.from(plan(tasks))).toEqual([
      {
        id: tasks[0].id,
        name: 'task-0',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        isGroup: false,
        dependenciesIds: [],
      },
      {
        id: tasks[1].id,
        name: 'task-1',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        isGroup: false,
        dependenciesIds: [],
      },
      {
        id: tasks[2].id,
        name: 'task-2',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        isGroup: false,
        dependenciesIds: [],
      },
    ]);
  });

  it('should return one task with it\'s dependencies', () => {
    tasks[0].dependsOn(tasks[1]);

    expect(Array.from(plan(tasks[0]))).toEqual([
      {
        id: tasks[1].id,
        name: 'task-1',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        isGroup: false,
        dependenciesIds: [],
      },
      {
        id: tasks[0].id,
        name: 'task-0',
        context: {},
        status: 'blocked',
        completed: false,
        duration: 0,
        isGroup: false,
        dependenciesIds: [tasks[1].id],
      },
    ]);
  });

  it('should return group with it\'s children', () => {
    group.add(tasks[0]);
    group.add(tasks[1]);

    expect(Array.from(plan(group))).toEqual([
      {
        id: group.id,
        name: 'test',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        isGroup: true,
        dependenciesIds: [],
      },
      {
        id: tasks[0].id,
        name: 'task-0',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        groupId: group.id,
        isGroup: false,
        dependenciesIds: [],
      },
      {
        id: tasks[1].id,
        name: 'task-1',
        context: {},
        status: 'ready',
        completed: false,
        duration: 0,
        groupId: group.id,
        isGroup: false,
        dependenciesIds: [],
      },
    ]);
  });
});
