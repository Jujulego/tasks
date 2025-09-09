import { filter$, map$, type Observable, once$, pipe$, type Ref, var$ } from 'kyrielle';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { type Node, node$ } from './bases/node$.js';
import { GroupState, isGroupCompleted, isGroupWaiting } from './group-state.js';

/**
 * Wraps group managing logic
 *
 * @since 3.0.0
 */
export function group$(props: GroupProps): Group$ {
  const { id = randomUUID() } = props;

  const state$ = var$(GroupState.Ready);

  const node = node$({
    id,
    completed$: pipe$(state$,
      filter$(isGroupCompleted),
      map$((state) => state === GroupState.Succeeded)
    ),
  });

  function recomputeState() {
    assert(isGroupWaiting(state$.defer()), 'recomputeState called on non waiting group');

    if (node.dependencies.every((dep) => dep.completed$.defer())) {
      state$.mutate(GroupState.Ready);
    } else {
      state$.mutate(GroupState.Blocked);
    }
  }

  return {
    ...node,
    state$,

    dependsOn(dep: Node) {
      if (!isGroupWaiting(state$.defer())) {
        throw new Error(`Cannot add dependency to group in "${state$.defer()}" state.`);
      }

      node.dependsOn(dep);

      if (!dep.completed$.defer()) {
        state$.mutate(GroupState.Blocked);
      }

      // Track dependency state
      once$(dep.completed$, recomputeState);
    },

    get state() {
      return state$.defer();
    },
  };
}

// Types
export interface GroupProps {
  /**
   * Uniquely identifies the group.
   *
   * One will be generated when if missing.
   */
  readonly id?: string;
}

export interface Group$ extends Node {
  /**
   * Uniquely identifies the group.
   */
  readonly id: string;

  /**
   * Current state of the group.
   */
  readonly state: GroupState;

  /**
   * Reference on current state of the group.
   */
  readonly state$: Ref<GroupState> & Observable<GroupState>;
}