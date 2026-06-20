import bcrypt from 'bcrypt';
import * as authRepo from '../../auth/auth.repository';
import * as usersRepo from '../users.repository';
import * as usersService from '../users.service';

const makeUser = async () => {
  const passwordHash = await bcrypt.hash('Abcd@1234', 10);
  return authRepo.createUser({ email: `u${Date.now()}${Math.random()}@x.com`, passwordHash, role: 'user', fullName: 'Old Name' });
};

describe('users.service', () => {
  it('updateProfile changes fullName', async () => {
    const u = await makeUser();
    const res = await usersService.updateProfile(u.id, { fullName: 'New Name' });
    expect(res.fullName).toBe('New Name');
  });
  it('changePassword wrong current → PASSWORD_MISMATCH', async () => {
    const u = await makeUser();
    await expect(usersService.changePassword(u.id, { currentPassword: 'Wrong@1234', newPassword: 'NewP@ss123' }))
      .rejects.toMatchObject({ code: 'PASSWORD_MISMATCH' });
  });
  it('changePassword correct updates hash', async () => {
    const u = await makeUser();
    await usersService.changePassword(u.id, { currentPassword: 'Abcd@1234', newPassword: 'NewP@ss123' });
    const fresh = await usersRepo.findByIdWithSecret(u.id);
    expect(await bcrypt.compare('NewP@ss123', fresh!.passwordHash)).toBe(true);
  });
});
