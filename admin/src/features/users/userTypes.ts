export type AdminUserRow = {
  _id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  isBlocked: boolean;
  commission?: {
    enabled: boolean;
    sellerPercent: number | null;
    uplinePercent: number | null;
  };
  referralCode?: string;
  walletBalance: number;
  totalEarnings: number;
  kycStatus?: "unverified" | "pending" | "verified" | "rejected";
  kycDocuments?: { docType: string; url: string; uploadedAt?: string }[];
  kycRejectionReason?: string | null;
  cardsCreated: number;
  referralsCount: number;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};
