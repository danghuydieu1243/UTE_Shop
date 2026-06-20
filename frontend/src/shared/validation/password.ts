export const PASSWORD_4GROUPS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/;

export type Strength = 'weak' | 'medium' | 'strong';

export const passwordStrength = (pw: string): Strength => {
  let groups = 0;
  if (/[a-z]/.test(pw)) groups++;
  if (/[A-Z]/.test(pw)) groups++;
  if (/\d/.test(pw)) groups++;
  if (/[^A-Za-z0-9]/.test(pw)) groups++;
  if (pw.length >= 9 && groups === 4) return 'strong';
  if (pw.length >= 6 && groups >= 3) return 'medium';
  return 'weak';
};
