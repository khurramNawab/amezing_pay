import Product from '../../models/Product.js';

const clampMoney = (value) => Math.max(0, Number(value ?? 0));

export const listProductsAdmin = async (req, res) => {
  const query = {};
  if (req.query.source && req.query.source !== 'all') query.source = String(req.query.source);
  if (req.query.status === 'active') query.isActive = true;
  if (req.query.status === 'inactive') query.isActive = false;

  const items = await Product.find(query).sort({ sortOrder: 1, createdAt: -1 });
  return res.json({ items });
};

export const createProductAdmin = async (req, res) => {
  const body = req.body || {};
  const source = body.source || 'internal';
  const placements = Array.isArray(body.placements) && body.placements.length
    ? body.placements
    : source === 'affiliate'
      ? ['trending_affiliate']
      : ['high_commission', 'digital_store'];

  const created = await Product.create({
    title: body.title,
    description: body.description || '',
    price: clampMoney(body.price),
    commission: body.commission || '',
    category: body.category || 'general',
    imageUrl: body.imageUrl || '',
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.slice(0, 3) : [],
    source,
    platformName: body.platformName || '',
    platformColor: body.platformColor || '',
    trustBadge: body.trustBadge || '',
    shareUrl: body.shareUrl || '',
    originalPrice: clampMoney(body.originalPrice),
    placements,
    sortOrder: clampMoney(body.sortOrder),
    isActive: body.isActive !== false,
    sellerId: req.user._id,
  });
  return res.status(201).json(created);
};

export const updateProductAdmin = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const body = req.body || {};
  product.title = body.title ?? product.title;
  product.description = body.description ?? product.description;
  product.price = body.price !== undefined ? clampMoney(body.price) : product.price;
  product.commission = body.commission ?? product.commission;
  product.category = body.category ?? product.category;
  product.imageUrl = body.imageUrl ?? product.imageUrl;
  product.imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.slice(0, 3) : product.imageUrls;
  product.source = body.source ?? product.source;
  product.platformName = body.platformName ?? product.platformName;
  product.platformColor = body.platformColor ?? product.platformColor;
  product.trustBadge = body.trustBadge ?? product.trustBadge;
  product.shareUrl = body.shareUrl ?? product.shareUrl;
  product.originalPrice = body.originalPrice !== undefined ? clampMoney(body.originalPrice) : product.originalPrice;
  if (Array.isArray(body.placements)) product.placements = body.placements;
  if (body.sortOrder !== undefined) product.sortOrder = clampMoney(body.sortOrder);
  if (body.isActive !== undefined) product.isActive = !!body.isActive;

  const saved = await product.save();
  return res.json(saved);
};

export const setProductVisibilityAdmin = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  product.isActive = !!req.body?.isActive;
  await product.save();
  return res.json({ ok: true, isActive: product.isActive });
};

export const deleteProductAdmin = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  await Product.deleteOne({ _id: product._id });
  return res.json({ ok: true });
};
