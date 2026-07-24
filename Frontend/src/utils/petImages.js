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

export const readPetImageFiles = async (fileList, existingCount = 0) => {
  const files = Array.from(fileList || []);

  if (existingCount + files.length > MAX_PET_IMAGES) {
    throw new Error('You can upload a maximum of two images for each pet.');
  }

  files.forEach((file) => {
    if (!SUPPORTED_PET_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Pet images must be JPEG, PNG, or WebP files.');
    }

    if (file.size > MAX_PET_IMAGE_BYTES) {
      throw new Error('Each pet image must be 2 MB or smaller.');
    }
  });

  return Promise.all(files.map(readFileAsDataUrl));
};
