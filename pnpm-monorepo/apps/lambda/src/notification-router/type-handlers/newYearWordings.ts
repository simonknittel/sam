/**
 * The wordings of the New Year greeting. They live next to the handler
 * instead of inside it, so that the unit test can read them without pulling
 * the AWS clients of the publisher into the test run.
 */
/**
 * Star Citizen plays 930 years ahead of the real calendar, thus the night
 * from December 31, 2026 to January 1, 2027 starts the year 2957 in the
 * game. The greeting names that year, not the real one.
 */
const IN_GAME_YEAR_OFFSET = 930;

/**
 * The greeting picks one of these for each citizen, so that a citizen does
 * not read the same sentence every year. The greeting keeps no memory of the
 * previous year, thus the same wording can occur twice in sequence.
 *
 * Every wording is a function of the in-game year, and the picked wording
 * travels in the payload as the finished strings.
 */
export const NEW_YEAR_WORDINGS = [
  (year: number) => ({
    title: "Frohes neues Jahr, Citizen!",
    body: `Willkommen in ${year}. Wir wünschen dir ein Jahr voller sanfter Landungen.`,
  }),
  (year: number) => ({
    title: `Willkommen in ${year}!`,
    body: "Ein neues Jahr, ein neues Verse. Auf viele gemeinsame Flüge.",
  }),
  (year: number) => ({
    title: "o7 zum Jahreswechsel!",
    body: `Die ganze Org salutiert dir. Auf ein großartiges ${year}.`,
  }),
  (year: number) => ({
    title: "Ein neues Jahr im Stanton-System!",
    body: `Frohes neues Jahr ${year}. Möge dein Kurs immer frei sein.`,
  }),
  (year: number) => ({
    title: `Auf ${year}!`,
    body: "Wir wünschen dir ein Jahr ohne 30k und mit immer freier Landeplattform.",
  }),
  (year: number) => ({
    title: "Prost Neujahr, Pilot!",
    body: `${year} ist da. Möge dein Quantum-Antrieb kalibriert und dein Tank voll sein.`,
  }),
  (year: number) => ({
    title: "Die Crew wünscht ein frohes neues Jahr!",
    body: `Schön, dass du auch ${year} an Bord bist.`,
  }),
  (year: number) => ({
    title: "Frohes neues Jahr!",
    body: `Möge ${year} dir volle Frachträume und Claims bringen, die sofort durchgehen.`,
  }),
  (year: number) => ({
    title: "Ein neues Jahr, ein neuer Kurs!",
    body: `Wir wünschen dir für ${year} freie Bahn bis nach Terra.`,
  }),
  (_year: number) => ({
    title: "Feuerwerk über Orison!",
    body: "Frohes neues Jahr. Heute leuchtet das ganze Verse für dich.",
  }),
  (year: number) => ({
    title: "Grüße aus Pyro!",
    body: `Auch im gefährlichsten System wird ${year} gefeiert. Frohes neues Jahr!`,
  }),
  (year: number) => ({
    title: `${year} ist gelandet!`,
    body: "Wir wünschen dir ein Jahr mit stabilen Servern und ruhigen Sprüngen.",
  }),
  (year: number) => ({
    title: "Der Countdown ist vorbei!",
    body: `Willkommen in ${year}. Auf ein Jahr ohne Kratzer am Schiff.`,
  }),
  (year: number) => ({
    title: "Frohes neues Jahr, Commander!",
    body: `Mögen deine Aufzüge in ${year} immer kommen und deine Türen sich öffnen.`,
  }),
  (year: number) => ({
    title: "Auf ein neues Jahr voller Sprünge!",
    body: `Frohes neues Jahr ${year}. Ruhige Reise durch den Aaron Halo.`,
  }),
  (year: number) => ({
    title: "Party auf Daymar!",
    body: `Das neue Jahr ist da. Wir wünschen dir ein unvergessliches ${year}.`,
  }),
  (year: number) => ({
    title: `Die erste Runde in ${year} geht aufs Haus!`,
    body: "Irgendwo zwischen New Babbage und Area18. Frohes neues Jahr!",
  }),
  (year: number) => ({
    title: `Volle Kraft voraus in ${year}!`,
    body: "Wir wünschen dir ein neues Jahr mit gutem Kurs und guter Crew.",
  }),
  (year: number) => ({
    title: "Frohes neues Jahr, Citizen!",
    body: `Möge dein Med-Bed in ${year} unbenutzt bleiben.`,
  }),
  (year: number) => ({
    title: `Ein Hoch auf ${year}!`,
    body: "Frohes neues Jahr. Schön, dass du Teil der Org bist.",
  }),
] as const;

/** The wording of one citizen, with the in-game year filled in */
export const buildWording = (year: number, index: number) =>
  (NEW_YEAR_WORDINGS[index] ?? NEW_YEAR_WORDINGS[0])(
    year + IN_GAME_YEAR_OFFSET,
  );

/** The wording for one citizen, picked at random */
export const pickWording = (year: number) =>
  buildWording(year, Math.floor(Math.random() * NEW_YEAR_WORDINGS.length));
