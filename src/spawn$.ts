import { type Observable, type Ref, var$, waitFor$ } from 'kyrielle';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PassThrough, type Readable } from 'node:stream';
import { type Task$, task$, type TaskProps } from './task$.js';
import { TaskState } from './task-state.js';

/**
 * Creates a task spawning a process in a shell.
 * @since 3.0.0
 */
export function spawn$(cmd: string, args: readonly string[], props: SpawnTaskProps = {}): SpawnTask$ {
  const { id, cwd = process.cwd(), env, ...rest } = props;
  const closed$ = var$();
  const exitCode$ = var$<number>();
  const stdout = new PassThrough({ allowHalfOpen: false });
  const stderr = new PassThrough({ allowHalfOpen: false });

  const task = task$({
    ...rest,
    id: id || createSpawnTaskId(cmd, args, cwd),
    onStart({ signal, setState }) {
      // TODO: escape args & pass them as string, to resolve DEP0190
      const spawned = execFile(cmd, args, {
        shell: true,
        windowsHide: true,
        signal,
        killSignal: 'SIGTERM',
        cwd,
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

  const spawned = Object.assign(task, {
    exitCode$,
    stderr,
    stdout,
  });

  Object.defineProperty(spawned, 'exitCode', {
    enumerable: true,
    configurable: true,
    get: () => exitCode$.defer() ?? null,
  });

  return spawned as unknown as SpawnTask$;
}

function createSpawnTaskId(cmd: string, args: readonly string[], cwd: string) {
  const hash = createHash('md5');

  hash.update(cwd);
  hash.update(cmd);

  for (const arg of args) {
    hash.update(arg);
  }

  return hash.digest('hex');
}

export interface SpawnTask$ extends Task$ {
  /**
   * Spawned process stdout stream.
   */
  readonly stdout: Readable;

  /**
   * Spawned process stderr stream.
   */
  readonly stderr: Readable;

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
