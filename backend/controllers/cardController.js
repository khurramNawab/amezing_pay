import Card from '../models/Card.js';
import AppConfig from '../models/AppConfig.js';
import { extractDeviceId, extractIpAddress } from '../services/fraudService.js';
import { captureReferralClick } from '../services/referralEngine.js';
import Template from '../models/Template.js';
import { getProCardAccessState } from '../services/proCardAccessService.js';
import { logger } from '../services/logger.js';

const isValidUpiId = (upiId) => {
    if (!upiId) return true;
    const s = String(upiId).trim();
    // Basic UPI handle format: local-part@psp (allow dots, dashes, underscores)
    return /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9]{2,64}$/.test(s);
};

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

// @desc    Create a new visiting card
// @route   POST /api/cards/create
// @access  Private
export const createCard = async (req, res) => {
    try {
        const {
            templateId,
            name,
            phone,
            email,
            role,
            address,
            profileImage,
            companyName,
            socialLinks,
            businessInfo,
            payment,
            products,
        } = req.body;

        const config = await AppConfig.getSingleton();
        const maxCards = Number(config?.maxCardsPerUser || 3);
        const cardCount = await Card.countDocuments({ user: req.user._id });
        if (cardCount >= maxCards) {
            return res.status(400).json({ message: `You can only save up to ${maxCards} cards. Please delete an existing card to save a new one.` });
        }

        const template = await Template.findById(templateId).select('name styleType isPremium');
        if (!template) {
            return res.status(400).json({ message: 'Template not found' });
        }

        const proCardAccess = getProCardAccessState(req.user);
        if (template.isPremium && !proCardAccess.active) {
            return res.status(403).json({
                message: 'This is a PRO template. Unlock it from the Bonus Mystery Box for 7 days.',
            });
        }

        const normalizedBusinessInfo = {
            name: safeTrim(businessInfo?.name) || safeTrim(companyName) || '',
            category: safeTrim(businessInfo?.category) || '',
            address: safeTrim(businessInfo?.address) || safeTrim(address) || '',
            description: safeTrim(businessInfo?.description) || '',
        };

        const normalizedPayment = {
            upiId: safeTrim(payment?.upiId) || '',
            qrImageUrl: safeTrim(payment?.qrImageUrl) || '',
        };

        if (normalizedPayment.upiId && !isValidUpiId(normalizedPayment.upiId)) {
            return res.status(400).json({ message: 'Invalid UPI ID format. Example: user@upi' });
        }

        const normalizedProducts = Array.isArray(products) ? products : [];
        if (normalizedProducts.length > 5) {
            return res.status(400).json({ message: 'Max 5 products/services images allowed.' });
        }
        for (const p of normalizedProducts) {
            if (!p || typeof p.imageUrl !== 'string' || p.imageUrl.trim() === '') {
                return res.status(400).json({ message: 'Each product must include a valid imageUrl.' });
            }
        }

        const card = await Card.create({
            user: req.user._id, // Assumes standard auth middleware adding user to req
            template: template._id,
            name,
            phone,
            email,
            role,
            address,
            profileImage,
            companyName,
            socialLinks,
            businessInfo: normalizedBusinessInfo,
            payment: normalizedPayment,
            products: normalizedProducts.map((p) => ({
                imageUrl: String(p.imageUrl).trim(),
                title: typeof p.title === 'string' ? p.title.trim() : '',
            })),
        });

        res.status(201).json(card);
    } catch (error) {
        logger.error('Error in createCard', { message: error?.message, stack: error?.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get card by ID
// @route   GET /api/cards/:id
// @access  Public (So the shared link works without auth)
export const getCardById = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id)
            .populate('template') // Full population for deep down reliability
            .populate('user', 'name referralCode'); // Populate referral code for tracking if available

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const ref = String(req.query?.ref || '').trim();
        if (ref) {
            const deviceId = extractDeviceId(req);
            const ipAddress = extractIpAddress(req);
            const userAgent = String(req.headers['user-agent'] || '');
            await captureReferralClick({
                ref,
                productId: null,
                deviceId,
                ipAddress,
                userAgent,
                sourcePath: req.originalUrl,
                attributedUserId: req.user?._id || null,
                metadata: { channel: 'card_share' },
            }).catch(() => {});
        }

        res.json(card);
    } catch (error) {
        logger.error('Error in getCardById', { message: error?.message, stack: error?.stack });
        if(error.kind === 'ObjectId') {
             return res.status(404).json({ message: 'Card not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user's cards
// @route   GET /api/cards/mycards
// @access  Private
export const getMyCards = async (req, res) => {
    try {
        const cards = await Card.find({ user: req.user._id }).populate('template');
        res.json(cards);
    } catch (error) {
        logger.error('Error in getMyCards', { message: error?.message, stack: error?.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private
export const deleteCard = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        // Check if user owns the card
        if (card.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await card.deleteOne();
        res.json({ message: 'Card deleted successfully' });
    } catch (error) {
        logger.error('Error in deleteCard', { message: error?.message, stack: error?.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};
