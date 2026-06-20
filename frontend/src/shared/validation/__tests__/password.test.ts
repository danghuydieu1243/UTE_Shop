import { passwordStrength } from '../password';

describe('passwordStrength', () => {
  it('strong: ≥9 + đủ 4 nhóm', () => expect(passwordStrength('Abcd@1234')).toBe('strong'));
  it('medium', () => expect(passwordStrength('Abcd12')).toBe('medium'));
  it('weak', () => expect(passwordStrength('abc')).toBe('weak'));
});
