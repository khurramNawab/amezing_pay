export type AdminTransactionRow = {
  _id: string;
  user: { _id: string; name: string; phone: string };
  amount: number;
  title: string;
  type: string;
  category: string;
  status: string;
  wallet?: string;
  direction?: string;
  source?: string;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  meta?: Record<string, unknown>;
};
