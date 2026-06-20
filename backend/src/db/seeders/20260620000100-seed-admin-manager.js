'use strict';
require('dotenv').config();
const bcrypt = require('bcrypt');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@uteshop.com';
const MANAGER_EMAIL = process.env.SEED_MANAGER_EMAIL || 'manager@uteshop.com';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@12345', 10);
    const managerHash = await bcrypt.hash(process.env.SEED_MANAGER_PASSWORD || 'Manager@1234', 10);
    await queryInterface.bulkInsert('users', [
      {
        email: ADMIN_EMAIL,
        password_hash: adminHash,
        role: 'admin',
        full_name: 'Administrator',
        status: 'active',
        email_verified_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        email: MANAGER_EMAIL,
        password_hash: managerHash,
        role: 'manager',
        full_name: 'Content Manager',
        status: 'active',
        email_verified_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: { [Sequelize.Op.in]: [ADMIN_EMAIL, MANAGER_EMAIL] },
    });
  },
};
