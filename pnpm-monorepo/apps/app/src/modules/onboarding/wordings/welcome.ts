import {
  getGreetingName,
  type ViewerWordingFactory,
} from "@/modules/dashboard/utils/greetingWordings";

/**
 * The pool is a different one than the pool of the welcome notification of the
 * Lambda: a new member reads both on the same day, and two identical greetings
 * would read like a mistake.
 */
export const WELCOME_WORDINGS: readonly ViewerWordingFactory[] = [
  (context) => ({
    title: `Herzlich willkommen, ${getGreetingName(context)}!`,
    body: "Wir freuen uns, dass du ab heute mit uns durchs Verse fliegst.",
  }),
  (context) => ({
    title: "Neues Crewmitglied an Bord",
    body: `Die ganze Org begrüßt dich, ${getGreetingName(context)}. Mach es dir im Hangar bequem.`,
  }),
  () => ({
    title: "Andockklammern gelöst",
    body: "Dein erster Tag bei uns beginnt jetzt. Wir freuen uns auf viele gemeinsame Flüge.",
  }),
  (context) => ({
    title: `Grüß dich, ${getGreetingName(context)}!`,
    body: "Schön, dass du zu uns gehörst. Wenn du eine Frage hast, frag einfach die Crew.",
  }),
  (context) => ({
    title: "Eingetragen in die Crewliste",
    body: `Ab heute stehst du bei uns auf der Liste, ${getGreetingName(context)}. Willkommen!`,
  }),
  () => ({
    title: "Dein Platz im Hangar ist frei",
    body: "Wir haben schon auf dich gewartet. Willkommen in der Org!",
  }),
  () => ({
    title: "Die Landebucht ist frei",
    body: "Setz in Ruhe auf. Den Rest des Verse erkunden wir gemeinsam.",
  }),
  (context) => ({
    title: `Endlich da, ${getGreetingName(context)}!`,
    body: "Ab heute gehörst du zur Crew. Willkommen an Bord!",
  }),
  () => ({
    title: "Ankunft bestätigt",
    body: "Ziel: deine neue Org. Ankunftszeit: genau jetzt. Willkommen!",
  }),
  () => ({
    title: "Frischer Wind im Hangar",
    body: "Hol dir einen Kaffee in der Messe und sieh dich in Ruhe um.",
  }),
  (context) => ({
    title: "Neue Signatur auf dem Radar",
    body: `Freundlich identifiziert: ${getGreetingName(context)}. Willkommen bei uns!`,
  }),
];
