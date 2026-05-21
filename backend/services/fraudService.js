import AppConfig from '../models/AppConfig.js';
import DeviceIdentity from '../models/DeviceIdentity.js';
import User from '../models/User.js';
import FraudLog from '../models/FraudLog.js';

export const extractIpAddress = (req) => {
  const raw =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '';
  return String(raw).split(',')[0].trim();
};

export const extractDeviceId = (req) => {
  const header = req.headers['x-device-id'] || req.headers['x-client-device-id'] || '';
  const bodyDevice = req.body?.deviceId || '';
  return String(header || bodyDevice || '').trim();
};

export const registerUserDevice = async ({ userId, deviceId, ipAddress, userAgent }) => {
  if (!deviceId) return { skipped: true };

  await DeviceIdentity.updateOne(
    { user: userId, deviceId },
    {
      $setOnInsert: { user: userId, deviceId, firstSeenAt: new Date() },
      $set: { ipAddress: ipAddress || '', userAgent: userAgent || '', lastSeenAt: new Date() },
    },
    { upsert: true },
  );

  const count = await DeviceIdentity.countDocuments({ deviceId });
  const config = await AppConfig.getSingleton();
  const max = Number(config?.fraud?.maxAccountsPerDevice || 1);
  const atRiskDevice = max > 0 ? count > max : false;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const ipAccounts = ipAddress
    ? await DeviceIdentity.distinct('user', { ipAddress, createdAt: { $gte: todayStart } })
    : [];
  const ipCount = Number(ipAccounts?.length ?? 0);
  const maxPerIp = Number(config?.fraud?.maxAccountsPerIpPerDay || 5);
  const atRiskIp = ipAddress && maxPerIp > 0 ? ipCount > maxPerIp : false;
  const atRisk = atRiskDevice || atRiskIp;

  if (atRisk) {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          'fraudFlags.multipleAccountsDevice': atRiskDevice,
          'fraudFlags.duplicateIpRisk': atRiskIp,
        },
      },
    );
  }

  return { skipped: false, accountsOnDevice: count, accountsOnIp: ipCount, allowed: !atRisk };
};

export const assertDeviceAllowedForUser = async ({ userId, deviceId }) => {
  if (!deviceId) return;
  const config = await AppConfig.getSingleton();
  const max = Number(config?.fraud?.maxAccountsPerDevice || 1);
  if (!(max > 0)) return;

  const count = await DeviceIdentity.countDocuments({ deviceId });
  if (count > max) {
    const err = new Error('Device is already associated with maximum allowed accounts');
    err.statusCode = 403;
    throw err;
  }

  await DeviceIdentity.updateOne(
    { user: userId, deviceId },
    { $setOnInsert: { user: userId, deviceId, firstSeenAt: new Date() } },
    { upsert: true },
  );
};

import FraudRateLimit from '../models/FraudRateLimit.js';

export const checkRateLimit = async (userId, action, limitSeconds, maxRequests) => {
    const key = `ratelimit:${action}:${String(userId)}`;
    
    // Atomically increment or create the record
    const record = await FraudRateLimit.findOneAndUpdate(
        { key },
        { 
            $inc: { count: 1 },
            $setOnInsert: { expiresAt: new Date(Date.now() + (limitSeconds * 1000)) }
        },
        { upsert: true, new: true }
    );

    if (record.count > maxRequests) {
        await FraudLog.create({
            user: userId,
            type: action === 'withdraw' ? 'ABNORMAL_EARNING' : 'VELOCITY_ABUSE',
            metadata: { action, detail: `Hit limit of ${maxRequests} reqs in ${limitSeconds}s` },
            severity: 'high'
        });

        await User.findByIdAndUpdate(userId, { 
            status: 'under_review',
            $inc: { riskScore: 50 } 
        });

        const err = new Error("Security Alert: Abnormal velocity detected. Account under review.");
        err.statusCode = 429;
        throw err;
    }
};
