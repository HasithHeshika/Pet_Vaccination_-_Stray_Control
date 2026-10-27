// Lost & Found shared values (must match Backend/models/LostReport.js)
export const SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other'];

export const reportTypeOf = (report) => report?.reportType || (report?.status === 'Found' ? 'found' : 'lost');

export const speciesLabel = (report) =>
  (report?.species === 'Other' ? report?.speciesOther || 'Other' : report?.species) || '';

// First photo of a report (new photo uploads, or the legacy single link)
export const firstPhoto = (report) => (report?.images && report.images[0]) || report?.imageUrl || '';

export const isSafeImageSrc = (src) =>
  typeof src === 'string' && /^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(src);
