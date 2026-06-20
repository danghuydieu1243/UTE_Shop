import { sequelize } from '../db/sequelize';
import '../../db/models'; // register models + associations

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
