import MediaAsset from '../../models/MediaAsset.js';
import { deleteCloudinaryAssetSigned } from '../../config/cloudinaryUpload.js';

export const listMedia = async (req, res) => {
  const items = await MediaAsset.find({}).sort({ createdAt: -1 }).limit(200);
  return res.json({ items });
};

export const deleteMedia = async (req, res) => {
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  const publicId = asset.publicId;
  await asset.deleteOne();

  // Best-effort remote deletion (requires CLOUDINARY_API_KEY/SECRET in backend/.env)
  try {
    await deleteCloudinaryAssetSigned({ publicId });
  } catch (e) {
    // If remote delete fails, we still removed local tracking.
  }

  return res.json({ message: 'Deleted' });
};

