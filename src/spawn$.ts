import { type Observable, type Ref, var$, waitFor$ } from 'kyrielle';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PassThrough, type Readable } from 'node:stream';
import { JobState } from './job$.js';
import { type Step$, step$ } from './step$.js';
import { type TaskProps } from './task$.js';

/**
 * Creates a step spawning a process in a shell.
 *
 * @since 3.0.0
 */
export function spawn$(cmd: string, args: readonly string[], props: SpawnProps = {}): SpawnStep$ {
  const { id, cwd = process.cwd(), env, ...rest } = props;
  const closed$ = var$();
  const exitCode$ = var$<number>();
  const stdout = new PassThrough({ allowHalfOpen: false });
  const stderr = new PassThrough({ allowHalfOpen: false });

  const step = step$({
    ...rest,
    id: id || createSpawnId(cmd, args, cwd),
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

      spawned.once('spawn', () => setState(JobState.Running));
      spawned.once('error', () => setState(JobState.Failed));
      spawned.once('close', (code) => {
        if (code === 0) {
          setState(JobState.Succeeded);
        } else {
          setState(JobState.Failed);
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

  const spawned = Object.assign(step, {
    exitCode$,
    stderr,
    stdout,
  });

  Object.defineProperty(spawned, 'exitCode', {
    enumerable: true,
    configurable: true,
    get: () => exitCode$.defer() ?? null,
  });

  return spawned as unknown as SpawnStep$;
}

function createSpawnId(cmd: string, args: readonly string[], cwd: string) {
  const hash = createHash('md5');

  hash.update(cwd);
  hash.update(cmd);

  for (const arg of args) {
    hash.update(arg);
  }

  return hash.digest('hex');
}

export interface SpawnStep$ extends Step$ {
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

export interface SpawnProps extends Omit<TaskProps, 'onStart' | 'onCancel'> {
  /**
   * Directory where to run the command
   */
  readonly cwd?: string;

  /**
   * Environment variables. Will be merged with `process.env`.
   */
  readonly env?: Record<string, string>;
}
