export const checkResponseForError = (
  data: Record<string, unknown> | unknown[],
) => {
  if (Array.isArray(data) || typeof data.message !== "string") return;

  if (data.message === "You are being rate limited.") {
    throw new Error("Rate limiting by the Discord API");
  }

  if (data.message === "Unknown Guild") {
    throw new Error(
      `The Discord server "${process.env.DISCORD_GUILD_ID}" does not exist.`,
    );
  }

  if (data.message === "Missing Access") {
    throw new Error(
      `This application does not have access to the Discord server "${process.env.DISCORD_GUILD_ID}".`,
    );
  }

  throw new Error(data.message);
};
