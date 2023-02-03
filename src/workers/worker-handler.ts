import wt from 'node:worker_threads';

import { EventMessage, ReadyMessage, SuccessMessage, RunMessage, FailureMessage } from './messages';

// Class
export abstract class WorkerHandler {
  // Constructor
  constructor() {
    this._init();
  }

  // Methods
  protected abstract _run(payload: unknown): void | Promise<void>;

  protected _init() {
    if (!wt.parentPort) {
      throw new Error('Should not be running in main thread');
    }

    // Handle incoming messages
    wt.parentPort.on('message', async (msg: RunMessage) => {
      if (msg.type === 'run') {
        try {
          await this._run(msg.payload);

          this._sendMessage({ type: 'success' });
        } catch (error) {
          this._sendMessage({ type: 'failure', error });
        }
      }
    });

    this._sendMessage({ type: 'ready' });
  }

  private _sendMessage(msg: ReadyMessage | EventMessage | SuccessMessage | FailureMessage) {
    if (!wt.parentPort) {
      throw new Error('Should not be running in main thread');
    }

    wt.parentPort.postMessage(msg);
  }

  /**
   * Sends an event to the main thread.
   *
   * @param payload
   */
  emit(payload: unknown) {
    this._sendMessage({ type: 'event', payload });
  }
}
