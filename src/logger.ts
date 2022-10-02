/* eslint-disable no-console */

// Types
export interface ILogger {
  // Methods
  debug(msg: string): void;
  verbose(msg: string): void;
  warn(msg: string): void;
}

// Types
export const logger: ILogger = {
  debug: console.debug,
  verbose: console.info,
  warn: console.warn,
};
