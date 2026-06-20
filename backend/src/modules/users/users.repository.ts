import { User } from '../../db/models';

export async function findById(id: number): Promise<User | null> {
  return User.scope('defaultScope').findOne({ where: { id } });
}

export async function findByIdWithSecret(id: number): Promise<User | null> {
  return User.scope('withSecret').findOne({ where: { id } });
}

export async function updateProfile(id: number, data: { fullName?: string; phone?: string }): Promise<void> {
  await User.update(data, { where: { id } });
}

export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await User.update({ passwordHash }, { where: { id } });
}
