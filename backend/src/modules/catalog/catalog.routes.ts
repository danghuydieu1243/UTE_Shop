import { Router } from 'express';
import * as c from './catalog.controller';

export const catalogRouter = Router();

catalogRouter.get('/home', c.home);
catalogRouter.get('/books', c.listBooks);
catalogRouter.get('/books/:idOrSlug', c.bookDetail);
catalogRouter.get('/categories', c.categories);
catalogRouter.get('/filters', c.filters);
