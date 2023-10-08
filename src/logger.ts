import { logger$, toConsole } from '@jujulego/logger';

// Types
export const logger = logger$();

logger.subscribe(toConsole().next);
