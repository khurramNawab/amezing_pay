import crypto from 'crypto';
import { uploadFileToCloudinarySigned, uploadImageToCloudinarySigned, uploadImageToCloudinaryUnsigned } from '../config/cloudinaryUpload.js';
import MediaAsset from '../models/MediaAsset.js';
import KycDocument from '../models/KycDocument.js';
import { validateUploadedBuffer } from '../services/fileValidationService.js';
import { logger } from '../services/logger.js';

const ensureDataUri = (input) => {
  const s = String(input || '').trim();
  if (!s) return '';
  if (s.startsWith('data:image/')) return s;
  // Assume raw base64 and default to jpeg if header not provided.
  return `data:image/jpeg;base64,${s}`;
};

export const uploadImage = async (req, res) => {
  try {
    // Backward compatible:
    // - JSON base64: { file, folder }
    // - multipart/form-data: file=<binary>, folder=<string>
    let safeFolder = '';
    let uploaded;

    if (req.file && Buffer.isBuffer(req.file.buffer)) {
      safeFolder = typeof req.body?.folder === 'string' ? req.body.folder.replace(/[\\/]/g, '_') : '';
      const { mime } = validateUploadedBuffer({
        buffer: req.file.buffer,
        declaredMime: req.file.mimetype,
        originalName: req.file.originalname,
      });
      const dataUri = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
      // For generic uploads we keep existing behavior: try unsigned then signed.
      try {
        uploaded = await uploadImageToCloudinaryUnsigned({ dataUri, folder: safeFolder });
      } catch (e) {
        uploaded = await uploadImageToCloudinarySigned({ dataUri, folder: safeFolder });
      }
    } else {
      const { file, folder } = req.body || {};
      const dataUri = ensureDataUri(file);
      if (!dataUri) return res.status(400).json({ message: 'file is required (base64 or data URI)' });

      safeFolder = typeof folder === 'string' ? folder.replace(/[\\/]/g, '_') : folder;
      // Extra safety: enforce image-only magic bytes even for base64 clients.
      const base64 = String(dataUri.split('base64,')[1] || '');
      const buf = Buffer.from(base64, 'base64');
      const { mime } = validateUploadedBuffer({ buffer: buf, declaredMime: (dataUri.match(/^data:([^;]+);base64,/) || [])[1] || '', originalName: '' });
      if (mime !== 'image/jpeg' && mime !== 'image/png') {
        return res.status(400).json({ message: 'Unsupported file type' });
      }

      try {
        uploaded = await uploadImageToCloudinaryUnsigned({ dataUri, folder: safeFolder });
      } catch (e) {
        // Fallback to signed upload if preset is misconfigured but api key/secret are available.
        uploaded = await uploadImageToCloudinarySigned({ dataUri, folder: safeFolder });
      }
    }

    if (!uploaded.url) return res.status(502).json({ message: 'Upload succeeded but no URL returned' });

    try {
      await MediaAsset.create({
        url: uploaded.url,
        publicId: uploaded.publicId,
        folder: safeFolder || '',
        createdBy: req.user?._id || null,
      });
    } catch (e) {
      // Non-blocking: upload succeeded even if tracking fails
    }

    return res.status(200).json({ url: uploaded.url, publicId: uploaded.publicId });
  } catch (err) {
    const message = err?.message || 'Upload failed';
    const hint = message.toLowerCase().includes('display name cannot contain slashes')
      ? 'Cloudinary preset issue. Either: (1) use an upload preset NAME without "/" (not display name) and set it to Unsigned, or (2) set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env to use signed upload.'
      : undefined;
    return res.status(500).json({ message, ...(hint ? { hint } : {}) });
  }
};

const kycFolderForDocType = (docType) => {
  if (docType === 'pan_card') return 'kyc/pan';
  if (docType === 'selfie') return 'kyc/selfie';
  if (docType === 'aadhar_front' || docType === 'aadhar_back') return 'kyc/aadhar';
  return 'kyc/misc';
};

export const uploadKycDocument = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: 'Not authorized' });
    const docType = String(req.body?.docType || '').trim();
    if (!docType) return res.status(400).json({ message: 'docType is required' });
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({ message: 'file is required' });
    }

    const validated = validateUploadedBuffer({
      buffer: req.file.buffer,
      declaredMime: req.file.mimetype,
      originalName: req.file.originalname,
    });

    const folder = kycFolderForDocType(docType);
    const randomId = crypto.randomBytes(16).toString('hex');
    const publicId = `kyc_${docType}_${randomId}`;
    const dataUri = `data:${validated.mime};base64,${req.file.buffer.toString('base64')}`;
    const resourceType = validated.mime === 'application/pdf' ? 'raw' : 'image';

    const uploaded = await uploadFileToCloudinarySigned({
      dataUri,
      folder,
      publicId,
      resourceType,
    });

    if (!uploaded.url || !uploaded.publicId) {
      return res.status(502).json({ message: 'Upload succeeded but no URL returned' });
    }

    const doc = await KycDocument.create({
      user: req.user._id,
      docType,
      mimeType: validated.mime,
      sizeBytes: validated.size,
      sha256: validated.sha256,
      originalName: String(req.file.originalname || ''),
      publicId: uploaded.publicId,
      url: uploaded.url,
      status: 'uploaded',
    });

    logger.info('KYC document uploaded', { userId: String(req.user._id), docType, kycDocumentId: String(doc._id) });

    // IMPORTANT: do not return raw URL publicly
    return res.status(201).json({
      success: true,
      documentId: doc._id,
      docType,
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    const message = status === 500 ? 'Upload failed' : (err?.message || 'Upload failed');
    logger.error('KYC upload failed', { message: err?.message, stack: err?.stack });
    return res.status(status).json({ message });
  }
};
