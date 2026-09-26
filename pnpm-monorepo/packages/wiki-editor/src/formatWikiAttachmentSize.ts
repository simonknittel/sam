/**
 * Formats a byte count for the attachment card, e.g. "1,2 MB".
 */
export const formatWikiAttachmentSize = (size: number | null): string => {
  if (size === null || Number.isNaN(size)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: value >= 10 || unitIndex === 0 ? 0 : 1,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
};
