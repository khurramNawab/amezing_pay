import AppConfig from '../../models/AppConfig.js';

export const getSettings = async (req, res) => {
  const config = await AppConfig.getSingleton();
  if (!config.commissions) config.commissions = {};
  if (!config.payouts) config.payouts = {};
  if (!config.earnzone) config.earnzone = {};
  if (!config.referral) config.referral = {};
  if (!config.fraud) config.fraud = {};
  if (!config.ads) config.ads = {};
  if (!config.adUnits) config.adUnits = { adMob: {}, unity: {} };
  return res.json({
    maintenanceMode: !!config.maintenanceMode,
    minAppVersion: config.minAppVersion || '1.0.0',
    supportPhone: config.supportPhone || '910000000000',
    supportEmail: config.supportEmail || 'support@amezingpay.com',
    adUnits: {
       adMob: config.adUnits?.adMob || {},
       unity: config.adUnits?.unity || {},
    },
    maxCardsPerUser: config.maxCardsPerUser,
    platformFeePercent: config.platformFeePercent,
    referralRewardPercent: config.referralRewardPercent,
    commissions: {
      enabled: !!config.commissions?.enabled,
      minTransactionAmount: Number(config.commissions?.minTransactionAmount ?? 0),
      sellerPercent: Number(config.commissions?.sellerPercent ?? 0),
      uplinePercent: Number(config.commissions?.uplinePercent ?? 0),
      level1Percent: Number(config.commissions?.level1Percent ?? config.commissions?.sellerPercent ?? 0),
      level2Percent: Number(config.commissions?.level2Percent ?? config.commissions?.uplinePercent ?? 0),
    },
    payouts: {
      enabled: config.payouts?.enabled !== false,
      minWithdrawAmount: Number(config.payouts?.minWithdrawAmount ?? 0),
      autoPayoutEnabled: config.payouts?.autoPayoutEnabled === true,
      defaultProvider: config.payouts?.defaultProvider || 'manual',
    },
    earnzone: {
      enabled: config.earnzone?.enabled !== false,
      dailyLimitInr: Number(config.earnzone?.dailyLimitInr ?? 0),
      autoValidateRewards: true,
      tasks: config.earnzone?.tasks || [],
      quiz: {
        enabled: config.earnzone?.quiz?.enabled !== false,
        questionsCount: Number(config.earnzone?.quiz?.questionsCount || 3),
        difficulty: config.earnzone?.quiz?.difficulty || 'easy',
        rewardInr: Number(config.earnzone?.quiz?.rewardInr ?? 0),
        timePerQuestionSec: Number(config.earnzone?.quiz?.timePerQuestionSec || 12),
        minCorrect: Number(config.earnzone?.quiz?.minCorrect ?? 0),
      },
      spin: {
        enabled: config.earnzone?.spin?.enabled !== false,
        rewardInr: Number(config.earnzone?.spin?.rewardInr ?? 0),
      },
      ads: {
        enabled: config.earnzone?.ads?.enabled !== false,
        rewardInr: Number(config.earnzone?.ads?.rewardInr ?? 0),
      },
      engagement: {
        enabled: config.earnzone?.engagement?.enabled !== false,
        rewardInr: Number(config.earnzone?.engagement?.rewardInr ?? 0),
      },
    },
    referral: {
      enabled: config.referral?.enabled !== false,
      attributionWindowDays: Number(config.referral?.attributionWindowDays || 7),
      installRewardInr: Number(config.referral?.installRewardInr ?? 0),
      level1InstallRewardInr: Number(config.referral?.level1InstallRewardInr ?? 0),
      level2InstallRewardInr: Number(config.referral?.level2InstallRewardInr ?? 0),
      enforceLastClick: config.referral?.enforceLastClick !== false,
    },
    fraud: {
      preventSelfReferral: config.fraud?.preventSelfReferral !== false,
      maxAccountsPerDevice: Number(config.fraud?.maxAccountsPerDevice || 1),
      maxAccountsPerIpPerDay: Number(config.fraud?.maxAccountsPerIpPerDay || 5),
      requireUniqueInstallPerDevice: config.fraud?.requireUniqueInstallPerDevice !== false,
    },
    ads: {
      enabled: !!config.ads?.enabled,
      banner: !!config.ads?.banner,
      interstitial: !!config.ads?.interstitial,
      rewarded: !!config.ads?.rewarded,
    },
  });
};

export const updateSettings = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const body = req.body || {};
  if (!config.commissions) config.commissions = {};
  if (!config.payouts) config.payouts = {};
  if (!config.earnzone) config.earnzone = {};
  if (!config.referral) config.referral = {};
  if (!config.fraud) config.fraud = {};
  if (!config.ads) config.ads = {};
  if (!config.adUnits) config.adUnits = { adMob: {}, unity: {} };

  if (typeof body.maintenanceMode === 'boolean') config.maintenanceMode = body.maintenanceMode;
  if (typeof body.minAppVersion === 'string') config.minAppVersion = body.minAppVersion;
  if (typeof body.supportPhone === 'string') config.supportPhone = body.supportPhone;
  if (typeof body.supportEmail === 'string') config.supportEmail = body.supportEmail;

  if (body.adUnits && typeof body.adUnits === 'object') {
     if (body.adUnits.adMob) config.adUnits.adMob = { ...config.adUnits.adMob, ...body.adUnits.adMob };
     if (body.adUnits.unity) config.adUnits.unity = { ...config.adUnits.unity, ...body.adUnits.unity };
  }

  if (typeof body.maxCardsPerUser === 'number') config.maxCardsPerUser = Math.max(1, body.maxCardsPerUser);
  if (typeof body.platformFeePercent === 'number') config.platformFeePercent = Math.max(0, body.platformFeePercent);
  if (typeof body.referralRewardPercent === 'number') config.referralRewardPercent = Math.max(0, body.referralRewardPercent);

  if (body.ads && typeof body.ads === 'object') {
    if (typeof body.ads.enabled === 'boolean') config.ads.enabled = body.ads.enabled;
    if (typeof body.ads.banner === 'boolean') config.ads.banner = body.ads.banner;
    if (typeof body.ads.interstitial === 'boolean') config.ads.interstitial = body.ads.interstitial;
    if (typeof body.ads.rewarded === 'boolean') config.ads.rewarded = body.ads.rewarded;
  }

  if (body.commissions && typeof body.commissions === 'object') {
    if (typeof body.commissions.enabled === 'boolean') config.commissions.enabled = body.commissions.enabled;
    if (typeof body.commissions.minTransactionAmount === 'number') config.commissions.minTransactionAmount = Math.max(0, body.commissions.minTransactionAmount);
    const clampPct = (n) => Math.min(Math.max(Number(n), 0), 100);
    if (typeof body.commissions.sellerPercent === 'number') config.commissions.sellerPercent = clampPct(body.commissions.sellerPercent);
    if (typeof body.commissions.uplinePercent === 'number') config.commissions.uplinePercent = clampPct(body.commissions.uplinePercent);
    if (typeof body.commissions.level1Percent === 'number') config.commissions.level1Percent = clampPct(body.commissions.level1Percent);
    if (typeof body.commissions.level2Percent === 'number') config.commissions.level2Percent = clampPct(body.commissions.level2Percent);
  }

  if (body.payouts && typeof body.payouts === 'object') {
    if (typeof body.payouts.enabled === 'boolean') config.payouts.enabled = body.payouts.enabled;
    if (typeof body.payouts.minWithdrawAmount === 'number') config.payouts.minWithdrawAmount = Math.max(0, body.payouts.minWithdrawAmount);
    if (typeof body.payouts.autoPayoutEnabled === 'boolean') config.payouts.autoPayoutEnabled = body.payouts.autoPayoutEnabled;
    if (typeof body.payouts.defaultProvider === 'string') config.payouts.defaultProvider = body.payouts.defaultProvider;
  }

  if (body.earnzone && typeof body.earnzone === 'object') {
    if (typeof body.earnzone.enabled === 'boolean') config.earnzone.enabled = body.earnzone.enabled;
    if (typeof body.earnzone.dailyLimitInr === 'number') config.earnzone.dailyLimitInr = Math.max(0, body.earnzone.dailyLimitInr);
    if (typeof body.earnzone.autoValidateRewards === 'boolean') config.earnzone.autoValidateRewards = true;
    if (Array.isArray(body.earnzone.tasks)) {
      config.earnzone.tasks = body.earnzone.tasks;
    }

    if (!config.earnzone.quiz) config.earnzone.quiz = {};
    if (body.earnzone.quiz && typeof body.earnzone.quiz === 'object') {
      if (typeof body.earnzone.quiz.enabled === 'boolean') config.earnzone.quiz.enabled = body.earnzone.quiz.enabled;
      if (typeof body.earnzone.quiz.questionsCount === 'number') config.earnzone.quiz.questionsCount = Math.min(10, Math.max(1, body.earnzone.quiz.questionsCount));
      if (typeof body.earnzone.quiz.difficulty === 'string') config.earnzone.quiz.difficulty = body.earnzone.quiz.difficulty;
      if (typeof body.earnzone.quiz.rewardInr === 'number') config.earnzone.quiz.rewardInr = Math.max(0, body.earnzone.quiz.rewardInr);
      if (typeof body.earnzone.quiz.timePerQuestionSec === 'number') config.earnzone.quiz.timePerQuestionSec = Math.min(30, Math.max(8, body.earnzone.quiz.timePerQuestionSec));
      if (typeof body.earnzone.quiz.minCorrect === 'number') config.earnzone.quiz.minCorrect = Math.max(0, body.earnzone.quiz.minCorrect);
    }

    if (!config.earnzone.spin) config.earnzone.spin = {};
    if (body.earnzone.spin && typeof body.earnzone.spin === 'object') {
      if (typeof body.earnzone.spin.enabled === 'boolean') config.earnzone.spin.enabled = body.earnzone.spin.enabled;
      if (typeof body.earnzone.spin.rewardInr === 'number') config.earnzone.spin.rewardInr = Math.max(0, body.earnzone.spin.rewardInr);
    }

    if (!config.earnzone.ads) config.earnzone.ads = {};
    if (body.earnzone.ads && typeof body.earnzone.ads === 'object') {
      if (typeof body.earnzone.ads.enabled === 'boolean') config.earnzone.ads.enabled = body.earnzone.ads.enabled;
      if (typeof body.earnzone.ads.rewardInr === 'number') config.earnzone.ads.rewardInr = Math.max(0, body.earnzone.ads.rewardInr);
    }

    if (!config.earnzone.engagement) config.earnzone.engagement = {};
    if (body.earnzone.engagement && typeof body.earnzone.engagement === 'object') {
      if (typeof body.earnzone.engagement.enabled === 'boolean') config.earnzone.engagement.enabled = body.earnzone.engagement.enabled;
      if (typeof body.earnzone.engagement.rewardInr === 'number') config.earnzone.engagement.rewardInr = Math.max(0, body.earnzone.engagement.rewardInr);
    }
  }

  if (body.referral && typeof body.referral === 'object') {
    if (typeof body.referral.enabled === 'boolean') config.referral.enabled = body.referral.enabled;
    if (typeof body.referral.attributionWindowDays === 'number') config.referral.attributionWindowDays = Math.min(60, Math.max(1, body.referral.attributionWindowDays));
    if (typeof body.referral.installRewardInr === 'number') config.referral.installRewardInr = Math.max(0, body.referral.installRewardInr);
    if (typeof body.referral.level1InstallRewardInr === 'number') config.referral.level1InstallRewardInr = Math.max(0, body.referral.level1InstallRewardInr);
    if (typeof body.referral.level2InstallRewardInr === 'number') config.referral.level2InstallRewardInr = Math.max(0, body.referral.level2InstallRewardInr);
    if (typeof body.referral.enforceLastClick === 'boolean') config.referral.enforceLastClick = body.referral.enforceLastClick;
  }

  if (body.fraud && typeof body.fraud === 'object') {
    if (typeof body.fraud.preventSelfReferral === 'boolean') config.fraud.preventSelfReferral = body.fraud.preventSelfReferral;
    if (typeof body.fraud.maxAccountsPerDevice === 'number') config.fraud.maxAccountsPerDevice = Math.max(1, body.fraud.maxAccountsPerDevice);
    if (typeof body.fraud.maxAccountsPerIpPerDay === 'number') config.fraud.maxAccountsPerIpPerDay = Math.max(1, body.fraud.maxAccountsPerIpPerDay);
    if (typeof body.fraud.requireUniqueInstallPerDevice === 'boolean') config.fraud.requireUniqueInstallPerDevice = body.fraud.requireUniqueInstallPerDevice;
  }

  await config.save();

  return res.json({
    maxCardsPerUser: config.maxCardsPerUser,
    platformFeePercent: config.platformFeePercent,
    referralRewardPercent: config.referralRewardPercent,
    commissions: {
      enabled: !!config.commissions?.enabled,
      minTransactionAmount: Number(config.commissions?.minTransactionAmount ?? 0),
      sellerPercent: Number(config.commissions?.sellerPercent ?? 0),
      uplinePercent: Number(config.commissions?.uplinePercent ?? 0),
      level1Percent: Number(config.commissions?.level1Percent ?? config.commissions?.sellerPercent ?? 0),
      level2Percent: Number(config.commissions?.level2Percent ?? config.commissions?.uplinePercent ?? 0),
    },
    payouts: {
      enabled: config.payouts?.enabled !== false,
      minWithdrawAmount: Number(config.payouts?.minWithdrawAmount ?? 0),
      autoPayoutEnabled: config.payouts?.autoPayoutEnabled === true,
      defaultProvider: config.payouts?.defaultProvider || 'manual',
    },
    earnzone: {
      enabled: config.earnzone?.enabled !== false,
      dailyLimitInr: Number(config.earnzone?.dailyLimitInr ?? 0),
      autoValidateRewards: true,
      quiz: {
        enabled: config.earnzone?.quiz?.enabled !== false,
        questionsCount: Number(config.earnzone?.quiz?.questionsCount || 3),
        difficulty: config.earnzone?.quiz?.difficulty || 'easy',
        rewardInr: Number(config.earnzone?.quiz?.rewardInr ?? 0),
        timePerQuestionSec: Number(config.earnzone?.quiz?.timePerQuestionSec || 12),
        minCorrect: Number(config.earnzone?.quiz?.minCorrect ?? 0),
      },
      spin: {
        enabled: config.earnzone?.spin?.enabled !== false,
        rewardInr: Number(config.earnzone?.spin?.rewardInr ?? 0),
      },
      ads: {
        enabled: config.earnzone?.ads?.enabled !== false,
        rewardInr: Number(config.earnzone?.ads?.rewardInr ?? 0),
      },
      engagement: {
        enabled: config.earnzone?.engagement?.enabled !== false,
        rewardInr: Number(config.earnzone?.engagement?.rewardInr ?? 0),
      },
    },
    referral: {
      enabled: config.referral?.enabled !== false,
      attributionWindowDays: Number(config.referral?.attributionWindowDays || 7),
      installRewardInr: Number(config.referral?.installRewardInr ?? 0),
      level1InstallRewardInr: Number(config.referral?.level1InstallRewardInr ?? 0),
      level2InstallRewardInr: Number(config.referral?.level2InstallRewardInr ?? 0),
      enforceLastClick: config.referral?.enforceLastClick !== false,
    },
    fraud: {
      preventSelfReferral: config.fraud?.preventSelfReferral !== false,
      maxAccountsPerDevice: Number(config.fraud?.maxAccountsPerDevice || 1),
      maxAccountsPerIpPerDay: Number(config.fraud?.maxAccountsPerIpPerDay || 5),
      requireUniqueInstallPerDevice: config.fraud?.requireUniqueInstallPerDevice !== false,
    },
    ads: {
      enabled: !!config.ads?.enabled,
      banner: !!config.ads?.banner,
      interstitial: !!config.ads?.interstitial,
      rewarded: !!config.ads?.rewarded,
    },
  });
};
