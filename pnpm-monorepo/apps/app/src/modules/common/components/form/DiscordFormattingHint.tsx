/** "Markdown Text 101" in the help centre of Discord. */
const DISCORD_FORMATTING_HELP_URL =
  "https://support.discord.com/hc/de/articles/210298617";

/**
 * The hint below a field whose text goes to Discord as well. It names the
 * formats that both the app and Discord show.
 */
export const DiscordFormattingHint = () => {
  return (
    <>
      Formatierungen wie auf Discord: fett, kursiv, unterstrichen,
      durchgestrichen, Code, Überschriften, Zitate, Listen und Links (
      <a
        href={DISCORD_FORMATTING_HELP_URL}
        target="_blank"
        rel="noreferrer"
        className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-700 hover:underline focus-visible:underline"
      >
        Hilfe von Discord
      </a>
      )
    </>
  );
};
