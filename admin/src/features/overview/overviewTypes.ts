export type OverviewStats = {
  totals: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    adsRevenue: number;
    totalReferrals: number;
    conversionRate: number;
    cardsCreated: number;
    sellerEarnings?: number;
    uplineEarnings?: number;
  };
  series: {
    days: string[];
    users: number[];
    revenue: number[];
    cards: number[];
    referrals: number[];
  };
  recentTransactions: Array<{
    _id: string;
    userName?: string;
    userPhone?: string;
    title: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
};
