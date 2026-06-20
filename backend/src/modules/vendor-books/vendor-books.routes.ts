import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import { bookUpload, enforceCoverSize } from '../../shared/upload';
import * as c from './vendor-books.controller';

export const vendorBooksRouter = Router();

const uploadMiddleware = [bookUpload, enforceCoverSize];

vendorBooksRouter.get('/', auth, requireRole('vendor'), c.listBooks);
vendorBooksRouter.get('/:id', auth, requireRole('vendor'), c.getBook);
vendorBooksRouter.post('/', auth, requireRole('vendor'), ...uploadMiddleware, c.createBook);
vendorBooksRouter.put('/:id', auth, requireRole('vendor'), ...uploadMiddleware, c.updateBook);
vendorBooksRouter.patch('/:id/status', auth, requireRole('vendor'), c.patchStatus);
vendorBooksRouter.delete('/:id', auth, requireRole('vendor'), c.deleteBook);
