import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Where an upload is referenced. `Unused` is not a usage: it is the absence
 * of all usages. `listUploadUsages` never gives it. Only the usage filter and
 * the badge of an upload without a reference use it.
 *
 * Each other type is one usage relation of the `Upload` model, see
 * `UPLOAD_USAGE_RELATION_BY_TYPE`.
 */
export enum UploadUsageType {
  RoleIcon = "roleIcon",
  RoleThumbnail = "roleThumbnail",
  RoleTagIcon = "roleTagIcon",
  ManufacturerLogo = "manufacturerLogo",
  EventCover = "eventCover",
  EventTemplateCover = "eventTemplateCover",
  WikiPageIcon = "wikiPageIcon",
  WikiPageAttachment = "wikiPageAttachment",
  WikiPageSnapshot = "wikiPageSnapshot",
  Unused = "unused",
}

/**
 * The rule of upload usage: an upload is in use while one of these
 * relations of the `Upload` model references it. The nightly cleanup
 * deletes each other upload (`UNUSED_UPLOAD_WHERE`), and the upload manager
 * of the app shows the usage type of each relation.
 *
 * The wiki relations are link tables that follow the content: the collab
 * server replaces the links of a page at each store, and each new snapshot
 * links the uploads of its content. Thus no check searches the content.
 *
 * `wikiReports` is the one deliberate omission: report evidence is meant to
 * expire with its upload, and the report keeps a `uploadFileName` snapshot.
 *
 * A relation that is in the model but not in this record silently deletes
 * uploads that are in use (as happened to `eventCovers`). Thus add each new
 * relation of the model here, with a usage type.
 */
export const UPLOAD_USAGE_RELATION_BY_TYPE = {
  [UploadUsageType.RoleIcon]: "roleIcons",
  [UploadUsageType.RoleThumbnail]: "roleThumbnails",
  [UploadUsageType.RoleTagIcon]: "roleTagIcons",
  [UploadUsageType.ManufacturerLogo]: "manufacturers",
  [UploadUsageType.EventCover]: "eventCovers",
  [UploadUsageType.EventTemplateCover]: "eventTemplateCovers",
  [UploadUsageType.WikiPageIcon]: "wikiPageIcons",
  [UploadUsageType.WikiPageAttachment]: "wikiPageLinks",
  [UploadUsageType.WikiPageSnapshot]: "wikiPageSnapshotLinks",
} as const satisfies Record<
  Exclude<UploadUsageType, UploadUsageType.Unused>,
  keyof Prisma.UploadCountOutputTypeSelect
>;

/**
 * The labels of the upload manager. The audit event of a deleted upload
 * writes them into its `locations`, thus a changed label changes only the
 * new audit events.
 */
export const UPLOAD_USAGE_TYPE_LABELS: Readonly<
  Record<UploadUsageType, string>
> = {
  [UploadUsageType.RoleIcon]: "Rollen-Icon",
  [UploadUsageType.RoleThumbnail]: "Rollen-Thumbnail",
  [UploadUsageType.RoleTagIcon]: "Rollen-Tag-Icon",
  [UploadUsageType.ManufacturerLogo]: "Hersteller-Bild",
  [UploadUsageType.EventCover]: "Event-Titelbild",
  [UploadUsageType.EventTemplateCover]: "Vorlagen-Titelbild",
  [UploadUsageType.WikiPageIcon]: "Wiki-Icon",
  [UploadUsageType.WikiPageAttachment]: "Wiki-Bild/-Anhang",
  [UploadUsageType.WikiPageSnapshot]: "Wiki-Snapshot",
  [UploadUsageType.Unused]: "Unbenutzt",
};

interface UploadUsageNamedResource {
  readonly id: string;
  readonly name: string;
}

/** A wiki page with the fields of its route */
export interface UploadUsageWikiPage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly eventId: string | null;
  readonly templateId: string | null;
}

/** The usage relations of an upload */
export interface UploadUsageSource {
  readonly roleIcons: readonly UploadUsageNamedResource[];
  readonly roleThumbnails: readonly UploadUsageNamedResource[];
  readonly roleTagIcons: readonly UploadUsageNamedResource[];
  readonly manufacturers: readonly UploadUsageNamedResource[];
  readonly eventCovers: readonly UploadUsageNamedResource[];
  readonly eventTemplateCovers: readonly UploadUsageNamedResource[];
  readonly wikiPageIcons: readonly UploadUsageWikiPage[];
  /** One link for each page, also when the page uses the upload two times */
  readonly wikiPageLinks: readonly { readonly page: UploadUsageWikiPage }[];
  readonly wikiPageSnapshotLinks: readonly {
    readonly snapshot: { readonly page: UploadUsageWikiPage };
  }[];
}

interface UploadUsageLocationFields {
  /** Unique in the usages of one upload, for the React keys */
  readonly key: string;
  /** The name of the resource, for example the name of the role */
  readonly label: string;
}

/** One place where an upload is referenced */
export type UploadUsageLocation = UploadUsageLocationFields &
  (
    | {
        readonly type:
          | UploadUsageType.RoleIcon
          | UploadUsageType.RoleThumbnail
          | UploadUsageType.RoleTagIcon
          | UploadUsageType.ManufacturerLogo
          | UploadUsageType.EventCover
          | UploadUsageType.EventTemplateCover;
        readonly resource: { readonly id: string };
      }
    | {
        readonly type:
          | UploadUsageType.WikiPageIcon
          | UploadUsageType.WikiPageAttachment
          | UploadUsageType.WikiPageSnapshot;
        readonly resource: UploadUsageWikiPage;
      }
  );

/** The usage types whose relation gives a resource with a name */
const NAMED_RESOURCE_USAGE_TYPES = [
  UploadUsageType.RoleIcon,
  UploadUsageType.RoleThumbnail,
  UploadUsageType.RoleTagIcon,
  UploadUsageType.ManufacturerLogo,
  UploadUsageType.EventCover,
  UploadUsageType.EventTemplateCover,
] as const;

/**
 * The snapshots of a page often use the same upload many times. The usage is
 * the page, one time.
 */
const getSnapshotPages = (
  links: UploadUsageSource["wikiPageSnapshotLinks"],
) => [
  ...new Map(
    links.map(({ snapshot }) => [snapshot.page.id, snapshot.page]),
  ).values(),
];

/**
 * All places where an upload is referenced, in the sequence of the upload
 * manager. An empty result means that the upload is unused, and the nightly
 * cleanup deletes it.
 */
export const listUploadUsages = (
  upload: UploadUsageSource,
): UploadUsageLocation[] => [
  ...NAMED_RESOURCE_USAGE_TYPES.flatMap((type) =>
    upload[UPLOAD_USAGE_RELATION_BY_TYPE[type]].map((resource) => ({
      type,
      key: `${type}:${resource.id}`,
      label: resource.name,
      resource: { id: resource.id },
    })),
  ),

  ...upload.wikiPageIcons.map((page) => ({
    type: UploadUsageType.WikiPageIcon as const,
    key: `${UploadUsageType.WikiPageIcon}:${page.id}`,
    label: page.title,
    resource: page,
  })),

  ...upload.wikiPageLinks.map(({ page }) => ({
    type: UploadUsageType.WikiPageAttachment as const,
    key: `${UploadUsageType.WikiPageAttachment}:${page.id}`,
    label: page.title,
    resource: page,
  })),

  ...getSnapshotPages(upload.wikiPageSnapshotLinks).map((page) => ({
    type: UploadUsageType.WikiPageSnapshot as const,
    key: `${UploadUsageType.WikiPageSnapshot}:${page.id}`,
    label: page.title,
    resource: page,
  })),
];
