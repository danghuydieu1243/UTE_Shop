import { socketAuthMiddleware, emitToUser } from '../io';
import { signAccessToken } from '../../../modules/auth/token.service';

function fakeSocket(token?: string) {
  const joined: string[] = [];
  return {
    handshake: { auth: token ? { token } : {} },
    data: {} as { userId?: number },
    join: (room: string) => { joined.push(room); },
    joined,
  };
}

describe('socket auth middleware', () => {
  it('IO1: token hợp lệ → set userId + join room user:<id>', (done) => {
    const token = signAccessToken({ id: 42, role: 'user' });
    const s = fakeSocket(token);
    socketAuthMiddleware(s as any, (err?: Error) => {
      expect(err).toBeUndefined();
      expect(s.data.userId).toBe(42);
      expect(s.joined).toContain('user:42');
      done();
    });
  });

  it('IO2: thiếu token → next(error)', (done) => {
    const s = fakeSocket();
    socketAuthMiddleware(s as any, (err?: Error) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });

  it('IO3: token sai → next(error)', (done) => {
    const s = fakeSocket('garbage.token.here');
    socketAuthMiddleware(s as any, (err?: Error) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });

  it('IO4: emitToUser no-op an toàn khi io chưa init (không throw)', () => {
    expect(() => emitToUser(1, 'notification', { a: 1 })).not.toThrow();
  });
});
