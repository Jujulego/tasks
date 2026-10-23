import { job$ } from '@/src/job$.js';
import { dependenciesOf } from '@/src/utils/dependencies-of.js';
import { workload$ } from '@/src/workload$.js';
import { collect$, pipe$ } from 'kyrielle';
import { describe, expect, it, vi } from 'vitest';

describe('allDependencies$', () => {
  it('should return iterator on all node\'s dependencies', () => {
    const nodeA = workload$({ label: 'nodeA', type: 'test', onStart: vi.fn() });
    const nodeB = workload$({ label: 'nodeB', type: 'test', onStart: vi.fn() });
    const nodeC = job$({ label: 'nodeC', onStart: vi.fn() });
    const root = job$({ label: 'root', onStart: vi.fn() });

    nodeC.dependsOn(nodeA);
    nodeC.dependsOn(nodeB);

    root.dependsOn(nodeA);
    root.dependsOn(nodeC);

    const result = pipe$(dependenciesOf(root), collect$());

    expect(result).toHaveLength(3);
    expect(result).toContain(nodeA);
    expect(result).toContain(nodeB);
    expect(result).toContain(nodeC);
  });
});
