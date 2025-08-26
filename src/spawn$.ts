import { type Observable, type Ref, var$, waitFor$ } from 'kyrielle';
import { execFile } from 'node:child_process';
import stream from 'node:stream';
import { type Task$, task$, type TaskProps } from './task$.js';
import { TaskState } from './task-state.js';

/**
 * Creates a task spawning a process in a shell.
 * @since 3.0.0
 */
export function spawn$(cmd: string, args: readonly string[], { cwd, env, ...rest }: SpawnTaskProps): SpawnTask$ {
  const closed$ = var$();
  const exitCode$ = var$<number>();
  const stdout = new stream.Duplex({ allowHalfOpen: false });
  const stderr = new stream.Duplex({ allowHalfOpen: false });

  const task = task$({
    ...rest,
    onStart({ signal, setState }) {
      // TODO: escape args & pass them as string, to resolve DEP0190
      const spawned = execFile(cmd, args, {
        shell: true,
        windowsHide: true,
        signal,
        killSignal: 'SIGTERM',
        cwd: cwd ?? process.cwd(),
        env: { ...process.env, ...env },
      });

      spawned.once('spawn', () => setState(TaskState.Running));
      spawned.once('error', () => setState(TaskState.Failed));
      spawned.once('close', (code) => {
        if (code === 0) {
          setState(TaskState.Succeeded);
        } else {
          setState(TaskState.Failed);
        }

        if (code !== null) {
          exitCode$.mutate(code);
        }

        closed$.mutate(true);
      });

      spawned.stdout!.pipe(stdout);
      spawned.stderr!.pipe(stderr);
    },
    async onCancel() {
      await waitFor$(closed$);
    }
  });

  return {
    ...task,
    exitCode$,

    get exitCode() {
      return this.exitCode$.defer() ?? null;
    },
    get stderr() {
      return stderr;
    },
    get stdout() {
      return stdout;
    }
  };
}

export interface SpawnTask$ extends Task$ {
  /**
   * Spawned process stdout stream.
   */
  readonly stdout: stream.Readable;

  /**
   * Spawned process stderr stream.
   */
  readonly stderr: stream.Readable;

  /**
   * Spawned process exit code.
   */
  readonly exitCode: number | null;

  /**
   * Reference on spawned process exit code.
   */
  readonly exitCode$: Ref<number | undefined> & Observable<number>;
}

export interface SpawnTaskProps extends Omit<TaskProps, 'onStart' | 'onCancel'> {
  /**
   * Directory where to run the command
   */
  readonly cwd?: string;

  /**
   * Environment variables. Will be merged with `process.env`.
   */
  readonly env?: Record<string, string>;
}