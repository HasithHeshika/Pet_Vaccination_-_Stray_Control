export const MAX_PET_IMAGES = 2;
export const MAX_PET_IMAGE_BYTES = 2 * 1024 * 1024;

const SUPPORTED_PET_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const getPetImages = (pet) => {
  if (Array.isArray(pet?.photoUrls) && pet.photoUrls.length > 0) {
    return pet.photoUrls;
  }

  return pet?.photoUrl ? [pet.photoUrl] : [];
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
  reader.readAsDataURL(file);
});

// Shrink a photo (data URL) so its longest side is at most maxSize px, as JPEG.
// Keeps lists light (e.g. the Lost & Found feed) without visibly losing detail.
export const resizeImageDataUrl = (dataUrl, maxSize = 1024, quality = 0.82) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    if (scale === 1 && dataUrl.length < 400 * 1024) {
      resolve(dataUrl);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      resolve(dataUrl);
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/jpeg', quality));
  };
  image.onerror = () => resolve(dataUrl);
  image.src = dataUrl;
});

export const readPetImageFiles = async (fileList, existingCount = 0) => {
  const files = Array.from(fileList || []);

  if (existingCount + files.length > MAX_PET_IMAGES) {
    throw new Error('You can upload a maximum of two images.');
  }

  files.forEach((file) => {
    if (!SUPPORTED_PET_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Images must be JPEG, PNG, or WebP files.');
    }

    if (file.size > MAX_PET_IMAGE_BYTES) {
      throw new Error('Each image must be 2 MB or smaller.');
    }
  });

  return Promise.all(files.map(readFileAsDataUrl));
};
