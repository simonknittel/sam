/**
 * The wordings of the New Year greeting. They live next to the handler
 * instead of inside it, so that the unit test can read them without pulling
 * the AWS clients of the publisher into the test run.
 */
import { getInGameYear } from "@sam-monorepo/domain";

export const NEW_YEAR_WORDINGS = [
  (inGameYear: number) => ({
    title: "Frohes neues Jahr, Citizen!",
    body: `Willkommen in ${inGameYear}. Wir wünschen dir ein Jahr voller sanfter Landungen.`,
  }),
  (inGameYear: number) => ({
    title: `Willkommen in ${inGameYear}!`,
    body: "Ein neues Jahr, ein neues Verse. Auf viele gemeinsame Flüge.",
  }),
  (inGameYear: number) => ({
    title: "o7 zum Jahreswechsel!",
    body: `Die ganze Org salutiert dir. Auf ein großartiges ${inGameYear}.`,
  }),
  (inGameYear: number) => ({
    title: "Ein neues Jahr im Stanton-System!",
    body: `Frohes neues Jahr ${inGameYear}. Möge dein Kurs immer frei sein.`,
  }),
  (inGameYear: number) => ({
    title: `Auf ${inGameYear}!`,
    body: "Wir wünschen dir ein Jahr ohne 30k und mit immer freier Landeplattform.",
  }),
  (inGameYear: number) => ({
    title: "Prost Neujahr, Pilot!",
    body: `${inGameYear} ist da. Möge dein Quantum-Antrieb kalibriert und dein Tank voll sein.`,
  }),
  (inGameYear: number) => ({
    title: "Die Crew wünscht ein frohes neues Jahr!",
    body: `Schön, dass du auch ${inGameYear} an Bord bist.`,
  }),
  (inGameYear: number) => ({
    title: "Frohes neues Jahr!",
    body: `Möge ${inGameYear} dir volle Frachträume und Claims bringen, die sofort durchgehen.`,
  }),
  (inGameYear: number) => ({
    title: "Ein neues Jahr, ein neuer Kurs!",
    body: `Wir wünschen dir für ${inGameYear} freie Bahn bis nach Terra.`,
  }),
  (_inGameYear: number) => ({
    title: "Feuerwerk über Orison!",
    body: "Frohes neues Jahr. Heute leuchtet das ganze Verse für dich.",
  }),
  (inGameYear: number) => ({
    title: "Grüße aus Pyro!",
    body: `Auch im gefährlichsten System wird ${inGameYear} gefeiert. Frohes neues Jahr!`,
  }),
  (inGameYear: number) => ({
    title: `${inGameYear} ist gelandet!`,
    body: "Wir wünschen dir ein Jahr mit stabilen Servern und ruhigen Sprüngen.",
  }),
  (inGameYear: number) => ({
    title: "Der Countdown ist vorbei!",
    body: `Willkommen in ${inGameYear}. Auf ein Jahr ohne Kratzer am Schiff.`,
  }),
  (inGameYear: number) => ({
    title: "Frohes neues Jahr, Commander!",
    body: `Mögen deine Aufzüge in ${inGameYear} immer kommen und deine Türen sich öffnen.`,
  }),
  (inGameYear: number) => ({
    title: "Auf ein neues Jahr voller Sprünge!",
    body: `Frohes neues Jahr ${inGameYear}. Ruhige Reise durch den Aaron Halo.`,
  }),
  (inGameYear: number) => ({
    title: "Party auf Daymar!",
    body: `Das neue Jahr ist da. Wir wünschen dir ein unvergessliches ${inGameYear}.`,
  }),
  (inGameYear: number) => ({
    title: `Die erste Runde in ${inGameYear} geht aufs Haus!`,
    body: "Irgendwo zwischen New Babbage und Area18. Frohes neues Jahr!",
  }),
  (inGameYear: number) => ({
    title: `Volle Kraft voraus in ${inGameYear}!`,
    body: "Wir wünschen dir ein neues Jahr mit gutem Kurs und guter Crew.",
  }),
  (inGameYear: number) => ({
    title: "Frohes neues Jahr, Citizen!",
    body: `Möge dein Med-Bed in ${inGameYear} unbenutzt bleiben.`,
  }),
  (inGameYear: number) => ({
    title: `Ein Hoch auf ${inGameYear}!`,
    body: "Frohes neues Jahr. Schön, dass du Teil der Org bist.",
  }),
] as const;

export const buildWording = (realYear: number, index: number) =>
  (NEW_YEAR_WORDINGS[index] ?? NEW_YEAR_WORDINGS[0])(getInGameYear(realYear));

export const pickWording = (realYear: number) =>
  buildWording(realYear, Math.floor(Math.random() * NEW_YEAR_WORDINGS.length));
