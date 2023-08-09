import wt from 'node:worker_threads';

import { TaskMessage, HandlerMessage } from './messages.js';

// Class
export abstract class WorkerHandler {
  // Attributes
  private _port: wt.MessagePort;

  // Methods
  protected abstract _run(payload: unknown): void | Promise<void>;

  init(port = wt.parentPort) {
    if (!port) {
      throw new Error('Should not be running in main thread');
    }

    this._port = port;

    // Handle incoming messages
    this._port.on('message', async (msg: TaskMessage) => {
      if (msg.type === 'run') {
        try {
          this._sendMessage({ type: 'started' });
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
    if (!this._port) {
      throw new Error('Cannot send message, handler not yet initialized');
    }

    this._port.postMessage(msg);
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
