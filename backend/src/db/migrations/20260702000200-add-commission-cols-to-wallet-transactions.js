'use strict';
module.exports = {
  async up(q, S) {
    await q.addColumn('wallet_transactions', 'gross_amount', { type: S.BIGINT.UNSIGNED, allowNull: true });
    await q.addColumn('wallet_transactions', 'fee_amount', { type: S.BIGINT.UNSIGNED, allowNull: true });
    await q.addColumn('wallet_transactions', 'commission_rate_bps', { type: S.INTEGER.UNSIGNED, allowNull: true });
  },
  async down(q) {
    await q.removeColumn('wallet_transactions', 'gross_amount');
    await q.removeColumn('wallet_transactions', 'fee_amount');
    await q.removeColumn('wallet_transactions', 'commission_rate_bps');
  },
};
