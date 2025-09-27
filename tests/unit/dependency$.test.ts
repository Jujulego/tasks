import { dependency$ } from '@/src/index.js';
import { var$ } from 'kyrielle';
import { describe, expect, it } from 'vitest';

describe('dependency$', () => {
  it('should create a dependency node', () => {
    const node = dependency$({ completed$: var$(false) });

    expect(node.id).toBeDefined();
    expect(node.completed$.defer()).toBe(false);
    expect(node.dependencies).toHaveLength(0);
  });

  it('should keep given id', () => {
    const node = dependency$({ id: 'life', completed$: var$(false) });

    expect(node.id).toBe('life');
  });

  describe('dependsOn', () => {
    it('should add dependency', () => {
      const dep = { completed$: var$(true) };
      const node = dependency$({ completed$: var$(true) });

      node.dependsOn(dep);

      expect(node.dependencies).toStrictEqual([dep]);
    });
  });
});
