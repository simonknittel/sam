import type { SeasonalWordingFactory } from "../utils/types";

/**
 * The greetings of the banner on the Day of the Vara, the Halloween of the
 * Star Citizen universe. The banner picks one of them per citizen and day,
 * thus two citizens of the same day usually read a different one.
 */
export const HALLOWEEN_WORDINGS: readonly SeasonalWordingFactory[] = [
  () => ({
    title: "Tag der Vara!",
    body: "Setz die Maske auf, Citizen. Heute gehört das Verse den Verkleideten.",
  }),
  () => ({
    title: "Die Masken sind oben",
    body: "Zum Tag der Vara zeigt selbst die härteste Crew ihr schaurigstes Gesicht.",
  }),
  () => ({
    title: "Spuk über Daymar",
    body: "Wer heute im Sandsturm ein Wrack sieht, sollte lieber nicht anhalten.",
  }),
  () => ({
    title: "Grüße aus Pyro!",
    body: "Am Tag der Vara ist das gefährlichste System genau die richtige Adresse.",
  }),
  () => ({
    title: "Ein Derelict ruft",
    body: "Irgendwo treibt ein verlassenes Schiff mit offener Luftschleuse. Nimm eine Lampe mit.",
  }),
  () => ({
    title: "Geisterstunde im Verse",
    body: "Heute knackt es im Funk, und niemand hat gesendet. Frohen Tag der Vara!",
  }),
  () => ({
    title: "Süßes oder Saures, Citizen!",
    body: "Die Org verteilt heute beides. Such dir aus, was dir lieber ist.",
  }),
  () => ({
    title: "Vanduul-Geschichten am Feuer",
    body: "Heute Abend erzählt jeder seine Version. Keine davon endet gut.",
  }),
  () => ({
    title: "Kürbis im Frachtraum",
    body: "Wir haben deine Ladung geprüft. Sie leuchtet und sie grinst.",
  }),
  () => ({
    title: "o7 zum Tag der Vara!",
    body: "Die ganze Org salutiert dir. Heute mit Maske.",
  }),
  () => ({
    title: "Etwas folgt deinem Kurs",
    body: "Der Scanner zeigt nichts an. Frohen Tag der Vara, Pilot.",
  }),
  () => ({
    title: "Nachtschicht über Yela",
    body: "Im Ring ist es heute besonders dunkel. Lass die Schilde oben.",
  }),
  () => ({
    title: "Ein Klopfen an der Luftschleuse",
    body: "Draußen ist niemand. Wir empfehlen: einfach weiterfliegen.",
  }),
  () => ({
    title: "Die Geister des Verse sind unterwegs",
    body: "Am Tag der Vara fliegen sie mit. Achte auf deine Sechs.",
  }),
  () => ({
    title: "Maskenball in Area18",
    body: "Heute erkennt dich niemand. Die Security allerdings auch nicht.",
  }),
  () => ({
    title: "Kein Signal, kein Licht, kein Problem",
    body: "So beginnt jede Geschichte, die am Tag der Vara erzählt wird.",
  }),
  () => ({
    title: "Schaurige Landung gefällig?",
    body: "Der Hangar ist offen und das Licht ist aus. Willkommen zum Tag der Vara.",
  }),
  () => ({
    title: "Dein Med-Bed bleibt heute besser leer",
    body: "Auch wenn im Verse gerade alles nach einer Rückkehr aussieht.",
  }),
  () => ({
    title: "Frohen Tag der Vara, Crew!",
    body: "Zieh dir etwas Gruseliges an und komm an Bord.",
  }),
  () => ({
    title: "Verlassener Außenposten, offene Tür",
    body: "Am Tag der Vara ist das eine Einladung. Geh trotzdem nicht hinein.",
  }),
];
