import type http from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../../modules/auth/token.service';
import { logger } from '../logger';

let io: Server | null = null;

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  try {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) return next(new Error('UNAUTHORIZED'));
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.id;
    socket.join(`user:${payload.id}`);
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}

export function initIO(httpServer: http.Server): Server {
  io = new Server(httpServer, { cors: { origin: true, credentials: true } });
  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    logger.info({ userId: socket.data.userId }, 'socket connected');
  });
  return io;
}

export function emitToUser(userId: number, event: string, payload: unknown): void {
  if (!io) return; // no-op khi chưa init (vd môi trường test)
  io.to(`user:${userId}`).emit(event, payload);
}
