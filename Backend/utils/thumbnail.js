// Small preview images for list views (feeds and dashboards).
// Lists used to send each report's full first photo (~150-250 KB each), so 60 reports was a 12 MB response.
// A 320 px WebP preview is a few KB; the full photos are still sent by the detail endpoints.
const MAX_SIDE = 320;

let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  // Lists then fall back to the full first photo, as before
  console.warn('Thumbnails disabled: sharp is not available:', error.message);
}

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

// Returns a WebP data URL, or null when there is nothing to shrink (no photo, an http link, or no sharp)
const makeThumbnail = async (image) => {
  const match = sharp && typeof image === 'string' && image.match(DATA_URL);
  if (!match) return null;
  try {
    const buffer = await sharp(Buffer.from(match[1], 'base64'))
      .rotate() // respect the camera's orientation
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    return `data:image/webp;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn('Could not make a thumbnail:', error.message);
    return null;
  }
};

module.exports = { makeThumbnail, thumbnailsEnabled: () => Boolean(sharp) };
