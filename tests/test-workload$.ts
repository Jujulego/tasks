import { WorkloadState } from '@/src/enums/workload-state.js';
import { workload$ } from '@/src/workload$.js';
import { vi } from 'vitest';

export function testWorkload$(props: TestWorkloadProps) {
  const workload = workload$({
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

export interface TestWorkloadProps {
  readonly label: string;
  readonly wait: number;
  readonly outcome: WorkloadState.Succeeded | WorkloadState.Failed;
}