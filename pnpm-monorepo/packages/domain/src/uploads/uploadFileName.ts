/**
 * `Upload.fileName` is stored URI-encoded (see `useUpload` and
 * `uploadWikiPageFile`), so every surface showing a file name has to decode
 * it. Malformed encodings fall back to the stored value rather than
 * throwing — some rows of the column are not encoded.
 */
export const decodeUploadFileName = (fileName: string): string => {
  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};
