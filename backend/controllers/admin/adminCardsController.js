import Card from '../../models/Card.js';

const parseIntSafe = (v, def) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : def;
};

export const listCards = async (req, res) => {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseIntSafe(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, parseIntSafe(req.query.limit, 20)));
  const skip = (page - 1) * limit;

  const query = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }, { role: rx }];
  }

  const [total, cards] = await Promise.all([
    Card.countDocuments(query),
    Card.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name phone')
      .populate('template', 'name styleType isPremium'),
  ]);

  return res.json({
    items: cards.map((c) => ({
      _id: c._id,
      name: c.name,
      role: c.role,
      phone: c.phone,
      email: c.email,
      status: c.status,
      moderationStatus: c.moderationStatus || 'approved',
      user: c.user,
      template: c.template,
      createdAt: c.createdAt,
    })),
    page,
    limit,
    total,
  });
};

export const setModerationStatus = async (req, res) => {
  const card = await Card.findById(req.params.id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  const { moderationStatus } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(moderationStatus)) {
    return res.status(400).json({ message: 'Invalid moderationStatus' });
  }
  card.moderationStatus = moderationStatus;
  await card.save();
  return res.json({ _id: card._id, moderationStatus: card.moderationStatus });
};

export const deleteCardAdmin = async (req, res) => {
  const card = await Card.findById(req.params.id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  await card.deleteOne();
  return res.json({ message: 'Card deleted' });
};

