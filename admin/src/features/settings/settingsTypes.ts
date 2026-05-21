export type AdminSettings = {
  maxCardsPerUser: number;
  platformFeePercent: number;
  referralRewardPercent: number;
  commissions: {
    enabled: boolean;
    minTransactionAmount: number;
    sellerPercent: number;
    uplinePercent: number;
    level1Percent: number;
    level2Percent: number;
  };
  payouts: {
    enabled: boolean;
    minWithdrawAmount: number;
    autoPayoutEnabled: boolean;
    defaultProvider: "manual" | "razorpay" | "cashfree";
  };
  earnzone: {
    enabled: boolean;
    dailyLimitInr: number;
    autoValidateRewards: boolean;
    quiz: {
      enabled: boolean;
      questionsCount: number;
      difficulty: "easy" | "medium" | "hard";
      rewardInr: number;
      timePerQuestionSec: number;
      minCorrect: number;
    };
    spin: {
      enabled: boolean;
      rewardInr: number;
    };
    ads: {
      enabled: boolean;
      rewardInr: number;
    };
    engagement: {
      enabled: boolean;
      rewardInr: number;
    };
  };
  referral: {
    enabled: boolean;
    attributionWindowDays: number;
    installRewardInr: number;
    level1InstallRewardInr: number;
    level2InstallRewardInr: number;
    enforceLastClick: boolean;
  };
  fraud: {
    preventSelfReferral: boolean;
    maxAccountsPerDevice: number;
    maxAccountsPerIpPerDay: number;
    requireUniqueInstallPerDevice: boolean;
  };
  ads: {
    enabled: boolean;
    banner: boolean;
    interstitial: boolean;
    rewarded: boolean;
  };
};
