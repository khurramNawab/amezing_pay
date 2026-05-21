import User from '../models/User.js';
import KycDocument from '../models/KycDocument.js';
import { logger } from '../services/logger.js';

/**
 * Submit KYC Documents
 * POST /api/kyc/submit
 */
export const submitKycDocuments = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.kycStatus === 'pending') {
            return res.status(400).json({ message: 'KYC is already pending review.' });
        }

        if (user.kycStatus === 'verified') {
            return res.status(400).json({ message: 'KYC is already verified.' });
        }

        const body = req.body || {};
        const docs = Array.isArray(body.documents) ? body.documents : [body];

        const normalized = [];
        let usedProtectedReference = false;
        for (const d of docs) {
            if (!d || typeof d !== 'object') continue;
            const docType = d.docType;
            // Backward compatible:
            // - old clients: { docType, url }
            // - hardened flow: { docType, documentId }
            let url = d.url;
            const documentId = d.documentId;

            if (!url && documentId) {
                const kd = await KycDocument.findOne({ _id: documentId, user: req.user._id, docType });
                if (!kd) {
                    return res.status(400).json({ message: 'Invalid document reference' });
                }
                url = kd.url;
                usedProtectedReference = true;
                kd.status = 'attached';
                await kd.save().catch(() => {});
            }

            if (docType && url) normalized.push({ docType, url });
        }

        if (!normalized.length) {
            return res.status(400).json({ message: 'Document type and URL are required.' });
        }

        // Add document(s) to list
        for (const d of normalized) {
            user.kycDocuments.push(d);
        }
        
        // If we have enough documents, set to pending
        if (user.kycDocuments.length >= 3) {
            user.kycStatus = 'pending';
        }

        await user.save();

        res.status(200).json({
            message: 'Document uploaded successfully',
            kycStatus: user.kycStatus,
            documents: usedProtectedReference
                ? user.kycDocuments.map((d) => ({ docType: d.docType, url: '' }))
                : user.kycDocuments
        });
    } catch (error) {
        logger.error('KYC submission failed', { message: error?.message, stack: error?.stack });
        res.status(500).json({ message: 'Server error during KYC submission' });
    }
};

/**
 * Admin: Review KYC (Verify or Reject)
 * POST /api/admin/kyc/:userId/review
 */
export const reviewKyc = async (req, res) => {
    const { status, reason } = req.body;
    const { userId } = req.params;

    if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.kycStatus = status;
        if (status === 'rejected') {
            user.kycRejectionReason = reason || 'Documents invalid or unclear.';
            // Clear documents so they can re-upload
            user.kycDocuments = [];
        } else {
            user.kycVerifiedAt = new Date();
            user.kycRejectionReason = null;
        }

        await user.save();

        res.status(200).json({ message: `KYC ${status} successfully`, userStatus: user.kycStatus });
    } catch (error) {
        res.status(500).json({ message: 'Server error during KYC review' });
    }
};

export const getMyKycDocument = async (req, res) => {
    try {
        const docId = String(req.params?.id || '').trim();
        const doc = await KycDocument.findOne({ _id: docId, user: req.user._id, status: { $ne: 'revoked' } })
            .select('docType mimeType sizeBytes url createdAt');
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        logger.info('KYC document accessed', { userId: String(req.user._id), documentId: docId, docType: doc.docType });
        return res.json({
            docType: doc.docType,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            url: doc.url,
            createdAt: doc.createdAt,
        });
    } catch (e) {
        logger.error('KYC document fetch failed', { message: e?.message, stack: e?.stack });
        return res.status(500).json({ message: 'Server error' });
    }
};
