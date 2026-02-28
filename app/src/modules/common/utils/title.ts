const regex = /(?:\((?<count>\d+)\))?(?<title>.+)/;

export const bumpDocumentTitle = () => {
  const match = regex.exec(document.title);
  if (!match?.groups) return;
  const count = parseInt(match.groups?.count || "0", 10) + 1;
  document.title = `(${count}) ${match.groups.title}`;
};
