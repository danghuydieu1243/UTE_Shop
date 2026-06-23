import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './bank-accounts.controller';

export const bankAccountsRouter = Router();

bankAccountsRouter.get('/', auth, requireRole('vendor'), c.listAccounts);
bankAccountsRouter.post('/', auth, requireRole('vendor'), c.createAccount);
bankAccountsRouter.patch('/:id/default', auth, requireRole('vendor'), c.setDefault);
bankAccountsRouter.patch('/:id', auth, requireRole('vendor'), c.updateAccount);
bankAccountsRouter.delete('/:id', auth, requireRole('vendor'), c.deleteAccount);
