const DAY_MS = 24 * 60 * 60 * 1000;

export const dayKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getProCardAccessState = (user) => {
  const grantedAt = user?.proCardAccessGrantedAt ? new Date(user.proCardAccessGrantedAt) : null;
  const expiresAt = user?.proCardAccessExpiresAt ? new Date(user.proCardAccessExpiresAt) : null;
  const active = Boolean(expiresAt && expiresAt.getTime() > Date.now());
  return {
    active,
    grantedAt: grantedAt ? grantedAt.toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    source: user?.proCardAccessSource || '',
    daysLeft: active ? Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS)) : 0,
    lastClaimedDay: user?.proCardMysteryLastClaimedDay || '',
  };
};

export const applyProCardAccessToUser = async (user, { days = 7, source = 'mystery_box' } = {}) => {
  if (!user) throw new Error('User is required');

  const now = new Date();
  const currentExpiresAt = user.proCardAccessExpiresAt ? new Date(user.proCardAccessExpiresAt) : null;
  const base = currentExpiresAt && currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const nextExpiresAt = new Date(base.getTime() + Math.max(1, Number(days || 7)) * DAY_MS);

  user.proCardAccessGrantedAt = now;
  user.proCardAccessExpiresAt = nextExpiresAt;
  user.proCardAccessSource = source;
  user.proCardMysteryLastClaimedDay = dayKey(now);

  await user.save();
  return getProCardAccessState(user);
};

export const canClaimMysteryAccessToday = (user) => {
  const today = dayKey();
  return String(user?.proCardMysteryLastClaimedDay || '') !== today;
};

