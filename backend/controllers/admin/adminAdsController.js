import AppConfig from '../../models/AppConfig.js';

export const getAdsConfig = async (req, res) => {
  const config = await AppConfig.getSingleton();
  return res.json({
    enabled: !!config.ads?.enabled,
    banner: !!config.ads?.banner,
    interstitial: !!config.ads?.interstitial,
    rewarded: !!config.ads?.rewarded,
    adsRevenue: Number(config.ads?.adsRevenue ?? 0),
  });
};

export const updateAdsConfig = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const body = req.body || {};

  if (typeof body.enabled === 'boolean') config.ads.enabled = body.enabled;
  if (typeof body.banner === 'boolean') config.ads.banner = body.banner;
  if (typeof body.interstitial === 'boolean') config.ads.interstitial = body.interstitial;
  if (typeof body.rewarded === 'boolean') config.ads.rewarded = body.rewarded;
  if (typeof body.adsRevenue === 'number') config.ads.adsRevenue = Math.max(0, body.adsRevenue);

  await config.save();
  return res.json({
    enabled: !!config.ads?.enabled,
    banner: !!config.ads?.banner,
    interstitial: !!config.ads?.interstitial,
    rewarded: !!config.ads?.rewarded,
    adsRevenue: Number(config.ads?.adsRevenue ?? 0),
  });
};
