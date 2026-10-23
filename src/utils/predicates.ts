import type { Job$ } from '../job$.js';
import type { Workload$ } from '../workload$.js';

export function isJob$(workload: Workload$): workload is Job$ {
  return 'dependencies' in workload && typeof workload.dependencies === 'function';
}