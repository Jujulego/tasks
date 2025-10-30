import { WorkloadState } from '@/src/enums/workload-state.js';
import { job$ } from '@/src/job$.js';
import { vi } from 'vitest';
import type { TestWorkloadProps } from './test-workload$.js';

export function testJob$(props: TestWorkloadProps) {
  const workload = job$({
    label: props.label,
    type: 'test',
    onStart: ({ setState, signal }) => {
      const id = setTimeout(() => setState(props.outcome), props.wait);

      signal.addEventListener('abort', () => {
        clearTimeout(id);
        setState(WorkloadState.Canceled);
      }, { once: true });

      setState(WorkloadState.Running);
    },
  });

  vi.spyOn(workload, 'start');

  return workload;
}