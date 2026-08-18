/**
 * `Upload.fileName` is stored URI-encoded (see `useUpload` and
 * `uploadWikiPageFile`), so every surface showing a file name has to decode
 * it. Malformed encodings fall back to the stored value rather than
 * throwing — the column also holds rows from before that convention.
 */
export const decodeUploadFileName = (fileName: string): string => {
  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};
