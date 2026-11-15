import type { Archive } from "@sam-monorepo/mcp";

/** A zip file that a browser saves with the given name */
export const archiveResponse = (archive: Archive, fileName: string) =>
  new Response(archive.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
