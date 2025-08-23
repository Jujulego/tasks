import { execFile } from 'node:child_process';
import { task$ } from './task$.js';
import { TaskState } from './task-state.js';

/**
 * Creates a task spawning a process in a shell.
 * @since 3.0.0
 */
export function spawn$(cmd: string, args: readonly string[]) {
  return task$({
    onStart({ signal, setState }) {
      // TODO: escape args & pass them as string, to resolve DEP0190
      const process = execFile(cmd, args, {
        shell: true,
        windowsHide: true,
        killSignal: 'SIGTERM',
        signal,
      });

      process.once('spawn', () => setState(TaskState.Running));
      process.once('error', () => setState(TaskState.Failed));
      process.once('close', (code) => {
        if (code === 0) {
          setState(TaskState.Succeeded);
        } else {
          setState(TaskState.Failed);
        }
      });
    }
  });
}
