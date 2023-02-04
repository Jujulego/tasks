import wt from 'node:worker_threads';

import { TaskMessage, HandlerMessage } from './messages';

// Class
export abstract class WorkerHandler {
  // Methods
  protected abstract _run(payload: unknown): void | Promise<void>;

  init() {
    if (!wt.parentPort) {
      throw new Error('Should not be running in main thread');
    }

    // Handle incoming messages
    wt.parentPort.on('message', async (msg: TaskMessage) => {
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

  private _sendMessage(msg: HandlerMessage) {
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
