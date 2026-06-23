/** Wallet feature types — mirrors backend wallet.schema.ts + bank-accounts.schema.ts. */

export interface MonthPoint {
  month: string;
  value: number;
}

export interface WalletTx {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface WalletPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Result shape after transformResponse merges data + meta.pagination. */
export interface WalletData {
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  monthlySeries: MonthPoint[];
  transactions: WalletTx[];
  pagination: WalletPagination;
}

export interface BankAccount {
  id: number;
  bankName: string;
  accountNumberMasked: string;
  accountHolder: string;
  isDefault: boolean;
  createdAt: string | null;
}

export interface CreateBankAccountInput {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  accountHolder?: string;
}

export interface WithdrawalDTO {
  id: number;
  amount: number;
  status: string;
  bankAccountId: number;
  requestedAt: string;
}

export interface CreateWithdrawalInput {
  amount: number;
  bankAccountId: number;
}
