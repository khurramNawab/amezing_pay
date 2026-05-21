const requiredEnv = (key) => {
  const v = process.env[key];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return String(v).trim();
};

const rejectSlashes = (label, value) => {
  if (/[\\/]/.test(String(value))) {
    throw new Error(`${label} cannot contain slashes (use the preset "Name", not "Display name")`);
  }
  return value;
};

export const getCloudinaryUploadConfig = () => {
  const cloudName = rejectSlashes('CLOUDINARY_CLOUD_NAME', requiredEnv('CLOUDINARY_CLOUD_NAME'));
  const uploadPreset = rejectSlashes('CLOUDINARY_UPLOAD_PRESET', requiredEnv('CLOUDINARY_UPLOAD_PRESET'));
  const defaultFolder = String(process.env.CLOUDINARY_FOLDER || 'amezing_pay').trim();
  return { cloudName, uploadPreset, defaultFolder };
};

export const getCloudinarySignedConfig = () => {
  const cloudName = rejectSlashes('CLOUDINARY_CLOUD_NAME', requiredEnv('CLOUDINARY_CLOUD_NAME'));
  const apiKey = requiredEnv('CLOUDINARY_API_KEY');
  const apiSecret = requiredEnv('CLOUDINARY_API_SECRET');
  const defaultFolder = String(process.env.CLOUDINARY_FOLDER || 'amezing_pay').trim();
  return { cloudName, apiKey, apiSecret, defaultFolder };
};

export const uploadImageToCloudinaryUnsigned = async ({ dataUri, folder }) => {
  const { cloudName, uploadPreset, defaultFolder } = getCloudinaryUploadConfig();

  const targetFolder = (folder && String(folder).trim()) || defaultFolder;
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;

  const params = new URLSearchParams();
  params.set('file', dataUri);
  params.set('upload_preset', uploadPreset);
  if (targetFolder) params.set('folder', targetFolder);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = json?.error?.message || `Cloudinary upload failed (${resp.status})`;
    throw new Error(message);
  }

  return {
    url: json.secure_url || json.url || '',
    publicId: json.public_id || '',
    width: json.width,
    height: json.height,
    format: json.format,
  };
};

const sha1Hex = async (input) => {
  const { createHash } = await import('node:crypto');
  return createHash('sha1').update(String(input), 'utf8').digest('hex');
};

export const uploadImageToCloudinarySigned = async ({ dataUri, folder }) => {
  const { cloudName, apiKey, apiSecret, defaultFolder } = getCloudinarySignedConfig();

  const targetFolder = (folder && String(folder).trim()) || defaultFolder;
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;

  const timestamp = Math.floor(Date.now() / 1000);
  // Signature string: "folder=...&timestamp=...<api_secret>"
  const toSignParts = [];
  if (targetFolder) toSignParts.push(`folder=${targetFolder}`);
  toSignParts.push(`timestamp=${timestamp}`);
  const signature = await sha1Hex(`${toSignParts.join('&')}${apiSecret}`);

  const params = new URLSearchParams();
  params.set('file', dataUri);
  params.set('api_key', apiKey);
  params.set('timestamp', String(timestamp));
  params.set('signature', signature);
  if (targetFolder) params.set('folder', targetFolder);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = json?.error?.message || `Cloudinary upload failed (${resp.status})`;
    throw new Error(message);
  }

  return {
    url: json.secure_url || json.url || '',
    publicId: json.public_id || '',
    width: json.width,
    height: json.height,
    format: json.format,
  };
};

export const uploadFileToCloudinarySigned = async ({
  dataUri,
  folder,
  publicId,
  resourceType = 'image', // 'image' for jpg/png, 'raw' for pdf
}) => {
  const { cloudName, apiKey, apiSecret, defaultFolder } = getCloudinarySignedConfig();

  const targetFolder = (folder && String(folder).trim()) || defaultFolder;
  const rt = resourceType === 'raw' ? 'raw' : 'image';
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${rt}/upload`;

  const timestamp = Math.floor(Date.now() / 1000);
  const toSignParts = [];
  if (targetFolder) toSignParts.push(`folder=${targetFolder}`);
  if (publicId) toSignParts.push(`public_id=${publicId}`);
  toSignParts.push(`timestamp=${timestamp}`);
  const signature = await sha1Hex(`${toSignParts.join('&')}${apiSecret}`);

  const params = new URLSearchParams();
  params.set('file', dataUri);
  params.set('api_key', apiKey);
  params.set('timestamp', String(timestamp));
  params.set('signature', signature);
  if (targetFolder) params.set('folder', targetFolder);
  if (publicId) params.set('public_id', publicId);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = json?.error?.message || `Cloudinary upload failed (${resp.status})`;
    throw new Error(message);
  }

  return {
    url: json.secure_url || json.url || '',
    publicId: json.public_id || '',
    width: json.width,
    height: json.height,
    format: json.format,
    bytes: json.bytes,
    resourceType: json.resource_type,
  };
};

export const deleteCloudinaryAssetSigned = async ({ publicId }) => {
  const { cloudName, apiKey, apiSecret } = getCloudinarySignedConfig();
  const pid = String(publicId || '').trim();
  if (!pid) throw new Error('publicId is required');

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1Hex(`public_id=${pid}&timestamp=${timestamp}${apiSecret}`);

  const params = new URLSearchParams();
  params.set('public_id', pid);
  params.set('api_key', apiKey);
  params.set('timestamp', String(timestamp));
  params.set('signature', signature);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = json?.error?.message || `Cloudinary destroy failed (${resp.status})`;
    throw new Error(message);
  }

  return { result: json.result || 'unknown' };
};
