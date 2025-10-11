import { type Dependency, type Dependency$, dependency$ } from '@/src/dependency$.js';
import { job$, type Workload$, workload$, WorkloadState } from '@/src/index.js';
import { var$ } from 'kyrielle';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@/src/dependency$.js');
vi.mock('@/src/workload$.js');

// Setup
const node = {
  id: 'mocked-dependency-id',
  completed$: var$(false),
  dependsOn: vi.fn(),
  dependencies: [] as Dependency[],
} satisfies Dependency$;

const workload = {
  id: 'mocked-workload-id',
  weight: 1,
  completed$: var$(false),
  state$: var$<WorkloadState>(WorkloadState.Ready),
  block: vi.fn(),
  unblock: vi.fn(),
  start: vi.fn(),
  cancel: vi.fn(),
  completed: () => false,
  state: vi.fn(() => WorkloadState.Ready),
} satisfies Workload$;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(dependency$).mockReturnValue(node);
  vi.mocked(workload$).mockReturnValue(workload);
});

// Tests
describe('job$', () => {
  it('should create a job using both workload$ & dependency$', () => {
    const onStart = vi.fn();
    const job = job$({ onStart });

    expect(workload$).toHaveBeenCalledWith({ onStart });
    expect(dependency$).toHaveBeenCalledWith(expect.objectContaining({
      id: workload.id,
      completed$: expect.anything(),
    }));

    expect(job.id).toBe(workload.id);
    expect(job.cancel).toBe(workload.cancel);
    expect(job.dependencies).toBe(node.dependencies);
    expect(job.start).toBe(workload.start);
    expect(job.state).toBe(workload.state);
    expect(job.weight).toBe(1);
  });

  it('should pass given props to workload$', () => {
    const onStart = vi.fn();
    job$({ id: 'life', weight: 2, onStart });

    expect(workload$).toHaveBeenCalledWith({ id: 'life', weight: 2, onStart });
  });

  describe('dependsOn', () => {
    it('should add dependency and change workload state to blocked', () => {
      const dep = { completed$: var$(false) };
      const job = job$({ onStart: vi.fn() });

      job.dependsOn(dep);

      expect(node.dependsOn).toHaveBeenCalledWith(dep);
      expect(workload.block).toHaveBeenCalled();
    });

    it('should add the completed dependency and keep workload state', () => {
      const dep = { completed$: var$(true) };
      const job = job$({ onStart: vi.fn() });

      job.dependsOn(dep);

      expect(node.dependsOn).toHaveBeenCalledWith(dep);
      expect(workload.block).not.toHaveBeenCalled();
    });

    it('should unblock workload upon dependency completion', () => {
      const dep = { completed$: var$(false) };
      const job = job$({ onStart: vi.fn() });

      job.dependsOn(dep);

      expect(node.dependsOn).toHaveBeenCalledWith(dep);
      expect(workload.block).toHaveBeenCalled();

      dep.completed$.mutate(true);

      expect(workload.unblock).toHaveBeenCalled();
    });

    it('should not unblock workload upon dependency completion, if it was manually blocked', () => {
      const dep = { completed$: var$(false) };
      const job = job$({ onStart: vi.fn() });

      job.dependsOn(dep);
      job.block();

      expect(node.dependsOn).toHaveBeenCalledWith(dep);
      expect(workload.block).toHaveBeenCalled();

      dep.completed$.mutate(true);

      expect(workload.unblock).not.toHaveBeenCalled();
    });

    it('should throw if workload is not waiting', async () => {
      const dep = { completed$: var$(false) };
      const job = job$({ onStart: vi.fn() });

      workload.state$.mutate(WorkloadState.Running);
      workload.state.mockReturnValue(WorkloadState.Running);

      expect(() => job.dependsOn(dep)).toThrow(new Error('Cannot add dependency to job in "running" state.'));

      expect(node.dependsOn).not.toHaveBeenCalled();
      expect(workload.block).not.toHaveBeenCalled();
    });
  });

  describe('block', () => {
    it('should block workload', () => {
      const job = job$({ onStart: vi.fn() });
      job.block();

      expect(workload.block).toHaveBeenCalled();
    });
  });

  describe('unblock', () => {
    it('should unblock workload', () => {
      const job = job$({ onStart: vi.fn() });
      job.unblock();

      expect(workload.unblock).toHaveBeenCalled();
    });

    it('should not unblock workload, if it has uncompleted dependencies', () => {
      const job = job$({ onStart: vi.fn() });

      node.dependencies.push({ completed$: var$(false) });

      job.unblock();

      expect(workload.unblock).not.toHaveBeenCalled();
    });
  });
});
