// Shared rules for user-uploaded photos (pet photos and incident report photos):
// an http(s) link, or a JPEG/PNG/WebP data URL of at most 2 MB.
const MAX_IMAGES = 2;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const validateImage = (image) => {
  if (typeof image === 'string' && /^https?:\/\/\S+$/i.test(image)) {
    return true;
  }

  const match = typeof image === 'string' && image.match(IMAGE_DATA_URL);
  if (!match) {
    throw new Error('Images must be JPEG, PNG, or WebP files');
  }

  if (Buffer.byteLength(match[1], 'base64') > MAX_IMAGE_SIZE) {
    throw new Error('Each image must be 2 MB or smaller');
  }

  return true;
};

// For public uploads (incident photos): only uploaded files, never external links,
// so viewing a report can't load content from a third-party server
const validateUploadedImage = (image) => {
  if (typeof image === 'string' && /^https?:/i.test(image)) {
    throw new Error('Please upload photos as files rather than links');
  }
  return validateImage(image);
};

module.exports = { MAX_IMAGES, MAX_IMAGE_SIZE, validateImage, validateUploadedImage };
