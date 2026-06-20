import { requireRole } from '../rbac';
import { AppError } from '../../errors/AppError';

const run = (role?: string) => {
  const req: any = role ? { user: { id: 1, role } } : {};
  let err: any;
  requireRole('admin')(req, {} as any, (e?: any) => { err = e; });
  return err;
};

describe('requireRole', () => {
  it('allows matching role', () => { expect(run('admin')).toBeUndefined(); });
  it('forbids wrong role', () => {
    const err = run('user');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('AUTH_FORBIDDEN');
  });
  it('forbids missing user', () => { expect(run()).toBeInstanceOf(AppError); });
});
