import Template from '../../models/Template.js';

export const listTemplates = async (req, res) => {
  const templates = await Template.find({}).sort({ createdAt: -1 });
  return res.json({ items: templates });
};

export const createTemplate = async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.styleType) {
    return res.status(400).json({ message: 'name and styleType are required' });
  }
  const t = await Template.create({
    name: String(body.name).trim(),
    styleType: String(body.styleType).trim(),
    isPremium: !!body.isPremium,
    isActive: body.isActive !== false,
    category: body.category || 'business',
    priceInr: Number(body.priceInr ?? 0),
    thumbnailUrl: body.thumbnailUrl || '',
    layoutConfig: body.layoutConfig || {},
  });
  return res.status(201).json(t);
};

export const updateTemplate = async (req, res) => {
  const t = await Template.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Template not found' });
  const body = req.body || {};

  if (typeof body.name === 'string') t.name = body.name.trim();
  if (typeof body.styleType === 'string') t.styleType = body.styleType.trim();
  if (typeof body.isPremium === 'boolean') t.isPremium = body.isPremium;
  if (typeof body.isActive === 'boolean') t.isActive = body.isActive;
  if (typeof body.category === 'string') t.category = body.category;
  if (typeof body.priceInr === 'number') t.priceInr = Math.max(0, body.priceInr);
  if (typeof body.thumbnailUrl === 'string') t.thumbnailUrl = body.thumbnailUrl;
  if (body.layoutConfig && typeof body.layoutConfig === 'object') t.layoutConfig = body.layoutConfig;

  await t.save();
  return res.json(t);
};

export const setTemplateVisibility = async (req, res) => {
  const t = await Template.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Template not found' });
  const { isActive } = req.body || {};
  t.isActive = !!isActive;
  await t.save();
  return res.json({ _id: t._id, isActive: t.isActive });
};

export const deleteTemplate = async (req, res) => {
  const t = await Template.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Template not found' });
  await t.deleteOne();
  return res.json({ message: 'Template deleted' });
};
