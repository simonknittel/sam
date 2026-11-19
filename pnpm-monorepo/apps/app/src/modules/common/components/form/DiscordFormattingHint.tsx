/** "Markdown Text 101" in the help centre of Discord. */
const DISCORD_FORMATTING_HELP_URL =
  "https://support.discord.com/hc/de/articles/210298617";

/**
 * The hint below a field whose text goes to Discord as well. It links to the
 * formats of Discord, which the app shows too.
 */
export const DiscordFormattingHint = () => {
  return (
    <>
      <a
        href={DISCORD_FORMATTING_HELP_URL}
        target="_blank"
        rel="noreferrer"
        className="text-brand-red-500 hover:text-brand-red-300 hover:underline focus-visible:text-brand-red-300 focus-visible:underline active:text-brand-red-700"
      >
        Formatierungen wie auf Discord
      </a>{" "}
      sind möglich.
    </>
  );
};
