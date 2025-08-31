import { type Observable, pipe$, type Ref, store$, var$ } from 'kyrielle';
import { randomUUID } from 'node:crypto';

export function depnode$({ id, completed$ }: DepNodeProps): DepNode {
  const dependencies: DepNode[] = [];

  return {
    id: id ?? randomUUID(),
    completed$: pipe$(completed$, store$(var$<boolean>())),
    dependencies,

    dependsOn(node: DepNode) {
      dependencies.push(node);
    },
  };
}

export interface DepNodeProps {
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
  readonly completed$: Observable<boolean>;
}

export interface DepNode {
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
  readonly dependencies: readonly DepNode[];

  /**
   * Adds a dependency to this node.
   */
  dependsOn(this: void, node: DepNode): void;
}