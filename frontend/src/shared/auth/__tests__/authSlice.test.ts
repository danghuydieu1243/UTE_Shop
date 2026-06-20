import reducer, { setCredentials, clearCredentials } from '../authSlice';
import type { User } from '../../types/auth';

const user: User = { id: 1, email: 'a@b.com', role: 'user', fullName: 'A', status: 'active' };

describe('authSlice', () => {
  it('setCredentials stores token + user', () => {
    const s = reducer(undefined, setCredentials({ accessToken: 'at', refreshToken: 'rt', user }));
    expect(s.accessToken).toBe('at');
    expect(s.user?.email).toBe('a@b.com');
    expect(localStorage.getItem('athena_access')).toBe('at');
  });
  it('clearCredentials resets + clears storage', () => {
    reducer(undefined, setCredentials({ accessToken: 'at', refreshToken: 'rt', user }));
    const s = reducer(undefined, clearCredentials());
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(localStorage.getItem('athena_access')).toBeNull();
  });
});
