import { validate } from '../validate';
import { z } from 'zod';
import { AppError } from '../../errors/AppError';

const schema = z.object({ n: z.coerce.number() });
const run = (body: unknown) => {
  const req: any = { body };
  let err: any;
  validate(schema)(req, {} as any, (e?: any) => { err = e; });
  return { req, err };
};

describe('validate', () => {
  it('coerces and passes valid input', () => {
    const { req, err } = run({ n: '5' });
    expect(err).toBeUndefined();
    expect(req.body.n).toBe(5);
  });
  it('rejects invalid input with VALIDATION_ERROR 422', () => {
    const { err } = run({ n: 'abc' });
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(422);
  });
});
