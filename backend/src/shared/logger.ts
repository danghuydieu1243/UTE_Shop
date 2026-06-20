import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

export const logger = pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' });

export const httpLogger = pinoHttp({
  logger,
  genReqId: (_req, res) => {
    const id = randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
});
