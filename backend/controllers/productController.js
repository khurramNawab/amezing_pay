import Product from '../models/Product.js';
import { extractDeviceId, extractIpAddress } from '../services/fraudService.js';
import { captureReferralClick } from '../services/referralEngine.js';

const clampMoney = (value) => Math.max(0, Number(value ?? 0));

// @desc    Fetch all products with optional filters
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
    try {
        const query = { isActive: true };
        
        // Filter by source (affiliate, internal)
        if (req.query.type && req.query.type !== 'all') {
            query.source = req.query.type;
        }

        // Filter by category
        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.placement) {
            query.placements = { $in: [String(req.query.placement)] };
        }

        const limit = Math.max(0, Number(req.query.limit ?? 0));
        const q = Product.find(query).sort({ sortOrder: 1, createdAt: -1 });
        if (limit > 0) q.limit(limit);
        const products = await q;
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const ref = String(req.query?.ref || '').trim();
            if (ref) {
                const deviceId = extractDeviceId(req);
                const ipAddress = extractIpAddress(req);
                const userAgent = String(req.headers['user-agent'] || '');
                await captureReferralClick({
                    ref,
                    productId: product._id,
                    deviceId,
                    ipAddress,
                    userAgent,
                    sourcePath: req.originalUrl,
                    attributedUserId: req.user?._id || null,
                    metadata: { channel: 'product_detail' },
                }).catch(() => {});
            }
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a product (affiliate or internal)
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            commission,
            category,
            imageUrl,
            imageUrls,
            source,
            platformName,
            platformColor,
            trustBadge,
            shareUrl,
            originalPrice,
            placements,
            sortOrder,
        } = req.body;

        const cleanSource = source || 'internal';
        const normalizedPlacements = Array.isArray(placements) && placements.length
            ? placements
            : cleanSource === 'affiliate'
                ? ['trending_affiliate']
                : ['high_commission', 'digital_store'];
        
        const product = new Product({
            title,
            description,
            price,
            commission,
            category,
            imageUrl,
            imageUrls: Array.isArray(imageUrls) ? imageUrls.slice(0, 3) : [],
            source: cleanSource,
            platformName,
            platformColor,
            trustBadge,
            shareUrl,
            originalPrice,
            placements: normalizedPlacements,
            sortOrder: clampMoney(sortOrder),
            sellerId: req.user._id,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            product.title = req.body.title || product.title;
            product.description = req.body.description || product.description;
            if (req.body.price !== undefined) product.price = clampMoney(req.body.price);
            product.commission = req.body.commission || product.commission;
            product.imageUrl = req.body.imageUrl || product.imageUrl;
            product.imageUrls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls.slice(0, 3) : product.imageUrls;
            product.category = req.body.category || product.category;
            product.source = req.body.source || product.source;
            product.platformName = req.body.platformName || product.platformName;
            product.platformColor = req.body.platformColor || product.platformColor;
            product.trustBadge = req.body.trustBadge || product.trustBadge;
            product.shareUrl = req.body.shareUrl ?? product.shareUrl;
            if (req.body.originalPrice !== undefined) product.originalPrice = clampMoney(req.body.originalPrice);
            if (Array.isArray(req.body.placements)) {
                product.placements = req.body.placements;
            }
            if (req.body.sortOrder !== undefined) {
                product.sortOrder = clampMoney(req.body.sortOrder);
            }
            product.isActive = req.body.isActive !== undefined ? req.body.isActive : product.isActive;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            await product.remove();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
