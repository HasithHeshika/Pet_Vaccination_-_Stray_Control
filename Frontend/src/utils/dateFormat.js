export const formatDate = (value, fallback = 'N/A') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toISOString().slice(0, 10).replace(/-/g, '/');
};
