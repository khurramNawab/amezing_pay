import AppConfig from '../models/AppConfig.js';

export const getPublicConfig = async (req, res) => {
  const config = await AppConfig.getSingleton();
  return res.json({
    maintenanceMode: !!config.maintenanceMode,
    minAppVersion: config.minAppVersion || '1.0.0',
    supportPhone: config.supportPhone || '910000000000',
    supportEmail: config.supportEmail || 'support@amezingpay.com',
    adUnits: config.adUnits || {},
  });
};
