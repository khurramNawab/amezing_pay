import multer from 'multer';

// Hard cap at 10MB (PDF max). Type-specific caps are enforced after magic-byte detection.
const MAX_BYTES = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

export const uploadSingle = (field = 'file') =>
  multer({
    storage,
    limits: { fileSize: MAX_BYTES, files: 1 },
  }).single(field);

export const multerErrorHandler = (err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field' });
  }
  return res.status(400).json({ message: 'Upload failed' });
};

