import mongoose from 'mongoose';

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    folder: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
export default MediaAsset;

