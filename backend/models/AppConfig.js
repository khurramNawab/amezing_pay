import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema(
  {
    maxCardsPerUser: { type: Number, default: 3 },
    platformFeePercent: { type: Number, default: 2 },
    referralRewardPercent: { type: Number, default: 2 },
    maintenanceMode: { type: Boolean, default: false },
    minAppVersion: { type: String, default: '1.0.0' },
    supportPhone: { type: String, default: '910000000000' },
    supportEmail: { type: String, default: 'support@amezingpay.com' },
    adUnits: {
      adMob: {
        banner: { type: String, default: '' },
        interstitial: { type: String, default: '' },
        rewarded: { type: String, default: '' },
      },
      unity: {
        gameId: { type: String, default: '' },
      }
    },
    commissions: {
      enabled: { type: Boolean, default: true },
      minTransactionAmount: { type: Number, default: 0 },
      sellerPercent: { type: Number, default: 5 },
      uplinePercent: { type: Number, default: 2 },
      level1Percent: { type: Number, default: 10 },
      level2Percent: { type: Number, default: 3 },
    },
    payouts: {
      enabled: { type: Boolean, default: true },
      minWithdrawAmount: { type: Number, default: 100 },
      autoPayoutEnabled: { type: Boolean, default: false },
      defaultProvider: { type: String, enum: ['manual', 'razorpay', 'cashfree'], default: 'manual' },
    },
    earnzone: {
      enabled: { type: Boolean, default: true },
      dailyLimitInr: { type: Number, default: 20 },
      autoValidateRewards: { type: Boolean, default: false },
      tasks: [
        {
          id: { type: String },
          title: { type: String },
          subtitle: { type: String },
          rewardInr: { type: Number },
          screen: { type: String },
          icon: { type: String },
          color: { type: String },
          enabled: { type: Boolean, default: true }
        }
      ],
      quiz: {
        enabled: { type: Boolean, default: true },
        questionsCount: { type: Number, default: 3 },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
        rewardInr: { type: Number, default: 2 },
        timePerQuestionSec: { type: Number, default: 12 },
        minCorrect: { type: Number, default: 0 },
      },
      spin: { enabled: { type: Boolean, default: true }, rewardInr: { type: Number, default: 1 } },
      ads: { enabled: { type: Boolean, default: true }, rewardInr: { type: Number, default: 1 } },
      engagement: { enabled: { type: Boolean, default: true }, rewardInr: { type: Number, default: 4 } },
    },
    referral: {
      enabled: { type: Boolean, default: true },
      attributionWindowDays: { type: Number, default: 7 },
      installRewardInr: { type: Number, default: 5 },
      level1InstallRewardInr: { type: Number, default: 5 },
      level2InstallRewardInr: { type: Number, default: 1 },
      enforceLastClick: { type: Boolean, default: true },
    },
    fraud: {
      preventSelfReferral: { type: Boolean, default: true },
      maxAccountsPerDevice: { type: Number, default: 1 },
      maxAccountsPerIpPerDay: { type: Number, default: 5 },
      requireUniqueInstallPerDevice: { type: Boolean, default: true },
    },
    ads: {
      enabled: { type: Boolean, default: true },
      banner: { type: Boolean, default: true },
      interstitial: { type: Boolean, default: true },
      rewarded: { type: Boolean, default: true },
      adsRevenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

appConfigSchema.statics.getSingleton = async function () {
  let existing = await this.findOne();
  if (!existing) {
    existing = await this.create({});
  }

  let changed = false;
  if (existing.earnzone?.autoValidateRewards !== true) {
    existing.earnzone.autoValidateRewards = true;
    changed = true;
  }

  // Seed default tasks if empty
  if (!existing.earnzone.tasks || existing.earnzone.tasks.length === 0) {
    existing.earnzone.tasks = [
      { id: "quiz", title: "Answer 5 Questions", subtitle: "Unlock Reward", screen: "Quiz", icon: "Target", color: "#6366F1" },
      { id: "spin", title: "Spin and Win", subtitle: "Surprise Reward", screen: "Spin", icon: "RotateCw", color: "#F59E0B" },
      { id: "watch", title: "Watch and Earn", subtitle: "Unlock Reward", screen: "WatchAd", icon: "PlayCircle", color: "#10B981" },
    ];
    changed = true;
  }

  if (changed) {
    await existing.save();
  }
  
  return existing;
};

const AppConfig = mongoose.model('AppConfig', appConfigSchema);
export default AppConfig;
