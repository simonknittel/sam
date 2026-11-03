"use client";

import {
  ATTACHMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  UploadCategory,
} from "@sam-monorepo/domain";
import type { Editor } from "@tiptap/core";
import { FileHandler } from "@tiptap/extension-file-handler";
import { NodeSelection } from "@tiptap/pm/state";
import toast from "react-hot-toast";
import {
  getWikiImageUrl,
  getWikiUploadKind,
  uploadWikiPageFile,
} from "../utils/uploadWikiPageFile";

const WIKI_IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");
/**
 * `text/*` is not one of the spec's wildcard values (only image, audio and
 * video are), but the major browsers prefix-match any `type/*` entry. The
 * upload sends the text formats that are not in `ATTACHMENT_MIME_TYPES` as
 * `text/plain`. The extensions cover files the platform reports no mime type
 * for (Markdown, YAML, …), which mime-only accept values would exclude from
 * the picker — they must stay in sync with MIME_TYPES_BY_EXTENSION.
 */
const WIKI_ATTACHMENT_ACCEPT = [
  ...ATTACHMENT_MIME_TYPES,
  "text/*",
  ".md",
  ".markdown",
  ".yml",
  ".yaml",
  ".toml",
  ".sql",
  ".log",
  ".ini",
  ".conf",
  ".cfg",
  ".env",
].join(",");

/**
 * The viewer's effective upload permissions on the page being edited
 * (ResolvedWikiPagePermissions), resolved server-side per upload kind.
 * Display/UX gating only — /api/upload/assign enforces them regardless.
 */
export interface WikiUploadPermissions {
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
}

export const isWikiUploadKindAllowed = (
  kind: UploadCategory,
  permissions: WikiUploadPermissions,
) =>
  kind === UploadCategory.Image
    ? permissions.canUploadImages
    : permissions.canUploadAttachments;

const UPLOAD_BLOCKED_MESSAGES: Record<UploadCategory, string> = {
  [UploadCategory.Image]:
    "Bilder dürfen auf dieser Seite nur Manager hochladen.",
  [UploadCategory.Attachment]:
    "Dateianhänge dürfen auf dieser Seite nur Manager hochladen.",
};

interface InsertWikiFileOptions {
  /** Where a drop inserts the file. Without it, the file goes to the selection. */
  readonly position?: number;
  /** The kind of the file picker (see `getWikiUploadKind()`) */
  readonly pickedKind?: UploadCategory;
}

/**
 * Uploads a file and inserts the matching node (image or attachment card)
 * into the editor.
 */
export const insertWikiFile = async (
  editor: Editor,
  pageId: string,
  permissions: WikiUploadPermissions,
  file: File,
  { position, pickedKind }: InsertWikiFileOptions = {},
) => {
  const kind = getWikiUploadKind(file, pickedKind);
  if (!kind) {
    toast.error(`Der Dateityp von "${file.name}" wird nicht unterstützt.`);
    return;
  }

  /**
   * Callers disable their upload UI when the kind is blocked — this guard
   * covers the remaining paths (stale UI after a permission change).
   */
  if (!isWikiUploadKindAllowed(kind, permissions)) {
    toast.error(UPLOAD_BLOCKED_MESSAGES[kind]);
    return;
  }

  const toastId = toast.loading(`"${file.name}" wird hochgeladen …`);
  try {
    const uploaded = await uploadWikiPageFile(file, pageId, kind);

    const content =
      kind === UploadCategory.Image
        ? {
            type: "image",
            attrs: {
              src: getWikiImageUrl(uploaded.uploadId),
              alt: uploaded.fileName,
            },
          }
        : {
            type: "wikiAttachment",
            attrs: {
              uploadId: uploaded.uploadId,
              fileName: uploaded.fileName,
              size: uploaded.size,
              mimeType: uploaded.mimeType,
            },
          };

    const { selection } = editor.state;
    /**
     * A just-inserted image/attachment stays node-selected — inserting at
     * the selection would replace it, so consecutive uploads land after it
     * instead.
     */
    const insertAt =
      position ??
      (selection instanceof NodeSelection ? selection.to : undefined);

    const chain = editor.chain().focus();
    if (insertAt === undefined) chain.insertContent(content).run();
    else chain.insertContentAt(insertAt, content).run();

    toast.success(`"${file.name}" wurde eingefügt.`, { id: toastId });
  } catch (error) {
    console.error(error);
    toast.error(
      error instanceof Error && error.message
        ? error.message
        : "Der Upload ist fehlgeschlagen. Bitte erneut versuchen.",
      { id: toastId },
    );
  }
};

const WIKI_ACCEPT_BY_KIND: Record<UploadCategory, string> = {
  [UploadCategory.Image]: WIKI_IMAGE_ACCEPT,
  [UploadCategory.Attachment]: WIKI_ATTACHMENT_ACCEPT,
};

/**
 * Opens the browser's file picker for the kind and inserts the picked files
 * as this kind, if their type allows it (see `getWikiUploadKind()`).
 */
export const pickAndInsertWikiFiles = (
  editor: Editor,
  pageId: string,
  permissions: WikiUploadPermissions,
  kind: UploadCategory,
) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = WIKI_ACCEPT_BY_KIND[kind];
  input.multiple = true;
  input.addEventListener("change", () => {
    if (!input.files) return;
    for (const file of input.files)
      void insertWikiFile(editor, pageId, permissions, file, {
        pickedKind: kind,
      });
  });
  input.click();
};

/**
 * Paste/drop handling for images and file attachments. Editor-only
 * behavior — the extension adds no schema. Files of a blocked kind are
 * dropped with one notice per kind; allowed kinds of a mixed drop still
 * upload.
 */
export const createWikiFileHandler = (
  pageId: string,
  permissions: WikiUploadPermissions,
) => {
  const handleFiles = (editor: Editor, files: File[], position?: number) => {
    const blockedKinds = new Set<UploadCategory>();
    for (const file of files) {
      const kind = getWikiUploadKind(file);
      if (kind && !isWikiUploadKindAllowed(kind, permissions)) {
        blockedKinds.add(kind);
        continue;
      }
      void insertWikiFile(editor, pageId, permissions, file, { position });
    }
    for (const kind of blockedKinds) toast.error(UPLOAD_BLOCKED_MESSAGES[kind]);
  };

  return FileHandler.configure({
    onDrop: (editor, files, position) => {
      handleFiles(editor, files, position);
    },
    onPaste: (editor, files, htmlContent) => {
      /**
       * When the clipboard also contains HTML (e.g. copying an image from a
       * website), let the default paste handle it instead of re-uploading.
       */
      if (htmlContent) return false;
      handleFiles(editor, files);
      return true;
    },
  });
};
