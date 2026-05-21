import crypto from 'crypto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const startsWith = (buf, bytes) => {
  if (!Buffer.isBuffer(buf) || buf.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buf[i] !== bytes[i]) return false;
  }
  return true;
};

export const detectMagicMime = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return { mime: '', ext: '' };
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf' }; // %PDF-
  if (startsWith(buffer, [0x4d, 0x5a])) return { mime: 'application/x-msdownload', ext: 'exe' }; // MZ
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return { mime: 'application/zip', ext: 'zip' }; // PK..
  if (startsWith(buffer, [0x7f, 0x45, 0x4c, 0x46])) return { mime: 'application/x-elf', ext: 'elf' };
  if (startsWith(buffer, [0x23, 0x21])) return { mime: 'text/x-script', ext: 'sh' }; // #!
  return { mime: '', ext: '' };
};

export const isAllowedMime = (mime) =>
  mime === 'image/jpeg' || mime === 'image/png' || mime === 'application/pdf';

export const maxBytesForMime = (mime) => (mime === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES);

export const sha256Hex = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

export const sanitizeFileName = (name) => {
  const base = String(name || '').trim();
  if (!base) return 'file';
  // keep only safe chars
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return safe || 'file';
};

export const hasDoubleExtension = (name) => {
  const n = String(name || '').trim();
  if (!n) return false;
  const parts = n.split('.').filter(Boolean);
  if (parts.length <= 2) return false; // "a.pdf" or "a.b"
  const last = parts[parts.length - 1].toLowerCase();
  const prev = parts[parts.length - 2].toLowerCase();
  // common dangerous combos: *.php.jpg, *.exe.pdf, *.js.png, etc.
  const dangerousPrev = ['php', 'phtml', 'exe', 'js', 'sh', 'bat', 'cmd', 'ps1', 'jar', 'com', 'scr', 'vbs'];
  const allowedLast = ['jpg', 'jpeg', 'png', 'pdf'];
  return allowedLast.includes(last) && dangerousPrev.includes(prev);
};

export const validateUploadedBuffer = ({ buffer, declaredMime, originalName }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Empty file');
    err.statusCode = 400;
    throw err;
  }

  if (hasDoubleExtension(originalName)) {
    const err = new Error('Suspicious filename');
    err.statusCode = 400;
    throw err;
  }

  const magic = detectMagicMime(buffer);
  if (!isAllowedMime(magic.mime)) {
    const err = new Error('Unsupported file type');
    err.statusCode = 400;
    throw err;
  }

  // Reject mismatches (never trust extension alone)
  if (declaredMime && declaredMime !== magic.mime) {
    const err = new Error('File type mismatch');
    err.statusCode = 400;
    throw err;
  }

  const max = maxBytesForMime(magic.mime);
  if (buffer.length > max) {
    const err = new Error(magic.mime === 'application/pdf' ? 'PDF too large' : 'Image too large');
    err.statusCode = 400;
    throw err;
  }

  return { mime: magic.mime, ext: magic.ext, size: buffer.length, sha256: sha256Hex(buffer) };
};

