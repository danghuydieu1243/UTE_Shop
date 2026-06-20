import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';
import * as c from './users.controller';
import { updateProfileSchema, changePasswordSchema } from './users.schema';

export const usersRouter = Router();
usersRouter.patch('/me', auth, validate(updateProfileSchema), c.updateProfile);
usersRouter.post('/me/change-password', auth, validate(changePasswordSchema), c.changePassword);
