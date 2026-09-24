import type { SeasonalWordingFactory } from "../utils/types";

/**
 * The greetings of the banner on the first day of the year. Every wording
 * names the in-game year and never the calendar year.
 *
 * The pool is a different one than the pool of the New Year notification of
 * the Lambda: a citizen can receive that notification and open the dashboard
 * on the same day, and two identical greetings would read like a mistake.
 */
export const NEW_YEAR_WORDINGS: readonly SeasonalWordingFactory[] = [
  ({ inGameYear }) => ({
    title: `${inGameYear} ist da!`,
    body: "Die ganze Org hat den Sprung geschafft. Auf ein gutes Jahr im Verse.",
  }),
  ({ inGameYear }) => ({
    title: "Der erste Sonnenaufgang des Jahres",
    body: `Über Hurston, über Lorville, über allem. Willkommen in ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: "Neue Flugpläne, neues Glück",
    body: `Wir wünschen dir ein ${inGameYear} mit ruhigen Anflügen.`,
  }),
  ({ inGameYear }) => ({
    title: `Startklar für ${inGameYear}`,
    body: "Systeme grün, Tank voll, Crew wach. Los geht es.",
  }),
  ({ inGameYear }) => ({
    title: "Die Nacht war laut",
    body: `Über New Babbage stand der ganze Himmel in Farben. Willkommen in ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: "Log-Eintrag: neues Jahr",
    body: `Ab heute steht ${inGameYear} in jedem Manifest. Auf eine gute Reise.`,
  }),
  ({ inGameYear }) => ({
    title: "Ein Glas auf die Crew",
    body: `Ohne euch wäre das letzte Jahr nur halb so gut gewesen. Auf ${inGameYear}!`,
  }),
  ({ inGameYear }) => ({
    title: "Der Kurs für das neue Jahr steht",
    body: `Wir wünschen dir für ${inGameYear} freie Sprungpunkte und volle Frachträume.`,
  }),
  ({ inGameYear }) => ({
    title: "Silvester im Orbit",
    body: `Wer von oben zugesehen hat, sah das schönste Feuerwerk. Willkommen in ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: "Erste Schicht des Jahres",
    body: `Auch ${inGameYear} fängt irgendwo mit einem Kaffee an Bord an.`,
  }),
  ({ inGameYear }) => ({
    title: "Jahreswechsel im Aaron Halo",
    body: `Still, dunkel und voller Steine. Auf ein gutes ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: `Willkommen an Bord von ${inGameYear}`,
    body: "Schön, dass du auch dieses Jahr mit uns fliegst.",
  }),
  ({ inGameYear }) => ({
    title: "Der Hangar ist aufgeräumt",
    body: `Fast. Wir wünschen dir trotzdem ein großartiges ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: "Neues Jahr, alte Crew",
    body: `Genau so soll es sein. Auf ${inGameYear}, Citizen!`,
  }),
  ({ inGameYear }) => ({
    title: "Ein Hoch auf ruhige Server",
    body: `Viel mehr wünschen wir uns für ${inGameYear} gar nicht.`,
  }),
  ({ inGameYear }) => ({
    title: "Die Uhren im Verse stehen auf null",
    body: `${inGameYear} beginnt jetzt. Setz deinen Kurs.`,
  }),
  ({ inGameYear }) => ({
    title: "Was bleibt vom alten Jahr?",
    body: `Ein paar Kratzer und viele gute Flüge. Auf nach ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: "Feuerwerk über Area18",
    body: `Die halbe Stadt stand auf den Dächern. Frohes ${inGameYear}!`,
  }),
  ({ inGameYear }) => ({
    title: "Vorsätze für das neue Jahr",
    body: `Weniger Bußgelder, mehr Fracht. Viel Erfolg in ${inGameYear}.`,
  }),
  ({ inGameYear }) => ({
    title: "Auf die nächsten Sprünge",
    body: `Wir sehen uns im Verse. Willkommen in ${inGameYear}.`,
  }),
];
