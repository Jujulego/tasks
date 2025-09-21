import { type Observable, pipe$, type Ref, store$, type Subscribable, var$ } from 'kyrielle';
import { randomUUID } from 'node:crypto';

/**
 * Dependency graph nodes
 */
export function dependency$({ id, completed$ }: DependencyProps): Dependency$ {
  const dependencies: Dependency$[] = [];

  return {
    id: id ?? randomUUID(),
    completed$: pipe$(completed$, store$(var$<boolean>())),
    dependencies,

    dependsOn(node: Dependency$) {
      dependencies.push(node);
    },
  };
}

export interface DependencyProps {
  /**
   * Uniquely identifies the node.
   *
   * One will be generated when if missing.
   */
  readonly id?: string;

  /**
   * Reference indicating when node is completed.
   * Must contain true when successful, and false on failure.
   */
  readonly completed$: Subscribable<boolean>;
}

export interface Dependency$ {
  /**
   * Uniquely identifies the node.
   */
  readonly id: string;

  /**
   * Reference indicating when node is completed.
   * Contains true when successful, and false on failure.
   */
  readonly completed$: Ref<boolean | undefined> & Observable<boolean>;

  /**
   * Dependencies of the current node.
   */
  readonly dependencies: readonly Dependency$[];

  /**
   * Adds a dependency to this node.
   */
  dependsOn(this: void, node: Dependency$): void;
}