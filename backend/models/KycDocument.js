import mongoose from 'mongoose';

const kycDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docType: {
      type: String,
      enum: ['aadhar_front', 'aadhar_back', 'pan_card', 'selfie'],
      required: true,
      index: true,
    },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256: { type: String, required: true },
    originalName: { type: String, default: '' },
    publicId: { type: String, required: true },
    url: { type: String, required: true }, // stored, never returned directly to clients
    status: { type: String, enum: ['uploaded', 'attached', 'revoked'], default: 'uploaded' },
  },
  { timestamps: true }
);

kycDocumentSchema.index({ user: 1, docType: 1, createdAt: -1 });

const KycDocument = mongoose.model('KycDocument', kycDocumentSchema);
export default KycDocument;

