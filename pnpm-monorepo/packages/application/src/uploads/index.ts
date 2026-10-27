/** The use cases of the uploads, with the find helpers of the upload manager */
export {
  assignEventCoverImage,
  assignEventCoverImageInputSchema,
  type AssignEventCoverImageInput,
  type AssignEventCoverImageOutput,
} from "./assignEventCoverImage.js";
export {
  RoleImageAttribute,
  assignManufacturerImage,
  assignManufacturerImageInputSchema,
  assignRoleImage,
  assignRoleImageInputSchema,
  assignRoleTagImage,
  assignRoleTagImageInputSchema,
  type AssignManufacturerImageInput,
  type AssignResourceImageOutput,
  type AssignRoleImageInput,
  type AssignRoleTagImageInput,
} from "./assignResourceImage.js";
export {
  assignWikiPageIcon,
  assignWikiPageIconInputSchema,
  type AssignWikiPageIconInput,
  type AssignWikiPageIconOutput,
} from "./assignWikiPageIcon.js";
export {
  createUpload,
  createUploadInputSchema,
  type CreateUploadInput,
  type CreateUploadOutput,
} from "./createUpload.js";
export {
  deleteUnusedUploads,
  type DeleteUnusedUploadsOutput,
} from "./deleteUnusedUploads.js";
export {
  deleteUpload,
  deleteUploadInputSchema,
  type DeleteUploadInput,
  type DeleteUploadOutput,
} from "./deleteUpload.js";
export {
  linkWikiPageUpload,
  linkWikiPageUploadInputSchema,
  type LinkWikiPageUploadInput,
  type LinkWikiPageUploadOutput,
} from "./linkWikiPageUpload.js";
export { probeUploadImageDimensions } from "./probeUploadImageDimensions.js";
export {
  findUploadAuthorOptions,
  type UploadAuthorOption,
} from "./uploadAuthorOptions.js";
export { UploadErrorMessage } from "./uploadErrors.js";
export {
  findUploadTablePage,
  type UploadTablePage,
  type UploadTablePageInput,
  type UploadTableRow,
} from "./uploadTablePage.js";
