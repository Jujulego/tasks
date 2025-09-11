import { node$ } from '@/src/bases/node$.js';
import { group$, GroupState, TaskState } from '@/src/index.js';
import { var$ } from 'kyrielle';
import { describe, expect, it } from 'vitest';

describe('group$', () => {
  it('should create a group in ready state, with defaults applied', () => {
    const group = group$({});

    expect(group.id).toBeDefined();
    expect(group.dependencies).toHaveLength(0);
    expect(group.state).toBe(GroupState.Ready);
  });

  it('should apply given id', () => {
    const group = group$({ id: 'life' });

    expect(group.id).toBe('life');
  });

  describe('dependsOn', () => {
    it('should add dependency and change group state to blocked', () => {
      const dep = node$({ completed$: var$() });
      const group = group$({});

      group.dependsOn(dep);

      expect(group.dependencies).toEqual([dep]);
      expect(group.state).toBe(GroupState.Blocked);
    });

    it('should add the successful dependency and keep task state', () => {
      const dep = node$({ completed$: var$(true) });
      const group = group$({});

      group.dependsOn(dep);

      expect(group.dependencies).toEqual([dep]);
      expect(group.state).toBe(GroupState.Ready);
    });

    it('should update task state to ready when dependency succeeds', () => {
      const completed$ = var$<boolean>();
      const dep = node$({ completed$ });
      const group = group$({});

      group.dependsOn(dep);
      completed$.mutate(true);

      expect(group.state).toBe(TaskState.Ready);
    });

    it('should keep task state on blocked when dependency fails', () => {
      const completed$ = var$<boolean>();
      const dep = node$({ completed$ });
      const group = group$({});

      group.dependsOn(dep);
      completed$.mutate(false);

      expect(group.state).toBe(TaskState.Blocked);
    });

    // it('should throw if task is not waiting', async () => {
    //   const dep = node$({ completed$: var$() });
    //   const group = group$({});
    //
    //   await group.start();
    //   expect(() => group.dependsOn(dep)).toThrow(new Error('Cannot add dependency to task in "starting" state.'));
    //
    //   expect(group.dependencies).toHaveLength(0);
    // });
  });
});
