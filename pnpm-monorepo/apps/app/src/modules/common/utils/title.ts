const regex = /(?:\((?<count>\d+)\))?(?<title>.+)/;

export const bumpDocumentTitle = () => {
  const match = regex.exec(document.title);
  if (!match?.groups) return;
  const count = parseInt(match.groups?.count || "0", 10) + 1;
  document.title = `(${count}) ${match.groups.title}`;
};

export const setDocumentTitleUnreadCount = (count: number) => {
  const match = regex.exec(document.title);
  if (!match?.groups) return;

  const baseTitle = match.groups.title.trimStart();
  const newTitle = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
  if (document.title !== newTitle) document.title = newTitle;
};

/**
 * Only acts when the title carries no count prefix, so it never undoes a prefix
 * set by others (e.g. the release toast's bump).
 */
export const restoreDocumentTitleUnreadCount = (count: number) => {
  if (count <= 0) return;

  const match = regex.exec(document.title);
  if (!match?.groups || match.groups.count) return;

  document.title = `(${count}) ${match.groups.title.trimStart()}`;
};
