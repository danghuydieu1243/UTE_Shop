import { passwordField } from '../password';

describe('passwordField', () => {
  it.each(['Abcd@1234', 'Str0ng#Pass'])('accepts strong password %s', (pw) => {
    expect(passwordField.safeParse(pw).success).toBe(true);
  });
  it.each(['short1', 'alllowercase1@', 'NoSpecial123', 'NOLOWER@123'])('rejects weak password %s', (pw) => {
    expect(passwordField.safeParse(pw).success).toBe(false);
  });
});
