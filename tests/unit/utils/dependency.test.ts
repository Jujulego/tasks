import type { Registry$ } from '@/src/bases/registry$.js';
import { dependency$ } from '@/src/dependency$.js';
import { job$ } from '@/src/job$.js';
import { allDependencies$, recursiveRegister } from '@/src/utils/dependency.js';
import { collect$, pipe$, var$ } from 'kyrielle';
import { describe, expect, it, vi } from 'vitest';

describe('allDependencies$', () => {
  it('should return iterator on all node\'s dependencies', () => {
    const nodeA = dependency$({ completed$: var$(false) });
    const nodeB = dependency$({ completed$: var$(false) });
    const nodeC = dependency$({ completed$: var$(false) });
    const root = dependency$({ completed$: var$(false) });

    nodeC.dependsOn(nodeA);
    nodeC.dependsOn(nodeB);

    root.dependsOn(nodeA);
    root.dependsOn(nodeC);

    const result = pipe$(allDependencies$(root), collect$());

    expect(result).toHaveLength(3);
    expect(result).toContain(nodeA);
    expect(result).toContain(nodeB);
    expect(result).toContain(nodeC);
  });
});

describe('recursiveRegister', () => {
  it('should register workload and all its dependencies', () => {
    const nodeA = job$({ onStart: vi.fn() });
    const nodeB = job$({ onStart: vi.fn() });
    const nodeC = job$({ onStart: vi.fn() });
    const root = job$({ onStart: vi.fn() });

    nodeC.dependsOn(nodeA);
    nodeC.dependsOn(nodeB);

    root.dependsOn(nodeA);
    root.dependsOn(nodeC);

    const register = vi.fn();

    recursiveRegister({ register } as unknown as Registry$, root);

    expect(register).toHaveBeenCalledTimes(4);
    expect(register).toHaveBeenCalledWith(root);
    expect(register).toHaveBeenCalledWith(nodeA);
    expect(register).toHaveBeenCalledWith(nodeB);
    expect(register).toHaveBeenCalledWith(nodeC);
  });
});