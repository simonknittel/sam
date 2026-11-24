import {
  getGreetingName,
  type ViewerWordingFactory,
} from "@/modules/dashboard/utils/greetingWordings";

/**
 * A different pool than the birthday notification of the Lambda: a citizen can
 * receive that notification and open the dashboard on the same day.
 */
export const BIRTHDAY_WORDINGS: readonly ViewerWordingFactory[] = [
  (context) => ({
    title: `Geburtstagsalarm für ${getGreetingName(context)}!`,
    body: "Die ganze Crew auf Station: Heute wirst du gefeiert.",
  }),
  () => ({
    title: "Kuchen im Frachtraum",
    body: "Gut gesichert und mit Kerzen. Angezündet wird erst nach dem Andocken. Alles Gute zum Geburtstag!",
  }),
  (context) => ({
    title: `${getGreetingName(context)} hat Geburtstag!`,
    body: "Die Org stößt heute auf dich an. Lass dich ordentlich feiern.",
  }),
  () => ({
    title: "Ein neues Jahr in deinem Logbuch",
    body: "Wir wünschen dir viele gute Flüge darin. Herzlichen Glückwunsch!",
  }),
  (context) => ({
    title: "Funkspruch an alle Kanäle",
    body: `Heute feiern wir ${getGreetingName(context)}. Alles Gute zum Geburtstag!`,
  }),
  () => ({
    title: "Geburtstagsflug genehmigt",
    body: "Der Tower gibt dir heute jede Landebucht frei. Genieß deinen Tag.",
  }),
  () => ({
    title: "Konfetti im Cockpit",
    body: "Das bekommen wir nie wieder aus der Lüftung. Für dich war es das wert.",
  }),
  (context) => ({
    title: `Hoch soll ${getGreetingName(context)} leben!`,
    body: "Mögen deine Schilde halten und die Kaffeemaschine an Bord nie streiken.",
  }),
  () => ({
    title: "Eine Kerze mehr",
    body: "Kein Grund zur Sorge, die Lebenserhaltung kommt damit klar. Herzlichen Glückwunsch!",
  }),
  () => ({
    title: "Die Messe ist geschmückt",
    body: "Ballons, Kuchen und die ganze Crew warten auf dich. Alles Gute zum Geburtstag!",
  }),
  (context) => ({
    title: "Ehrenrunde um Crusader",
    body: `Die Crew fliegt heute eine Runde für dich, ${getGreetingName(context)}. Feier schön!`,
  }),
];
