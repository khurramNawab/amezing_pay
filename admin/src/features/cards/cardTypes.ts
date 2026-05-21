export type AdminCardRow = {
  _id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  moderationStatus: "pending" | "approved" | "rejected";
  user: { _id: string; name: string; phone: string };
  template: { _id: string; name: string; styleType: string; isPremium: boolean };
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

