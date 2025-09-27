import { type Observable, type Ref, var$, waitFor$ } from 'kyrielle';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PassThrough, type Readable } from 'node:stream';
import { WorkloadState } from './workload$.js';
import { type Job$, job$, type JobProps } from './job$.js';

/**
 * Creates a job spawning a process in a shell.
 *
 * @since 3.0.0
 */
export function spawn$(cmd: string, args: readonly string[], props: SpawnProps = {}): SpawnJob$ {
  const { id, cwd = process.cwd(), env, ...rest } = props;
  const closed$ = var$();
  const exitCode$ = var$<number>();
  const stdout = new PassThrough({ allowHalfOpen: false });
  const stderr = new PassThrough({ allowHalfOpen: false });

  const job = job$({
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

      spawned.once('spawn', () => setState(WorkloadState.Running));
      spawned.once('error', () => setState(WorkloadState.Failed));
      spawned.once('close', (code) => {
        if (code === 0) {
          setState(WorkloadState.Succeeded);
        } else {
          setState(WorkloadState.Failed);
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

  const spawned = Object.assign(job, {
    exitCode$,
    stderr,
    stdout,
  });

  Object.defineProperty(spawned, 'exitCode', {
    enumerable: true,
    configurable: true,
    get: () => exitCode$.defer() ?? null,
  });

  return spawned as unknown as SpawnJob$;
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

export interface SpawnJob$ extends Job$ {
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

export interface SpawnProps extends Omit<JobProps, 'onStart' | 'onCancel'> {
  /**
   * Directory where to run the command
   */
  readonly cwd?: string;

  /**
   * Environment variables. Will be merged with `process.env`.
   */
  readonly env?: Record<string, string>;
}
