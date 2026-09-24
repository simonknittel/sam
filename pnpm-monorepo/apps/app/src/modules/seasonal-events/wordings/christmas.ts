import type { SeasonalWordingFactory } from "../utils/types";

/**
 * The greetings of the banner on the Luminalia days, the winter festival of
 * lights of the Star Citizen universe. The banner picks one of them per
 * citizen and day, thus two citizens of the same day usually read a
 * different one.
 */
export const CHRISTMAS_WORDINGS: readonly SeasonalWordingFactory[] = [
  () => ({
    title: "Frohe Luminalia!",
    body: "Überall im Verse gehen heute die Lichter an. Bei uns auch.",
  }),
  () => ({
    title: "Lichter über New Babbage",
    body: "Der Schnee fällt und die ganze Stadt leuchtet. Schöne Luminalia, Citizen!",
  }),
  () => ({
    title: "Der Luminalia-Baum steht",
    body: "In der Messe brennt Licht, und jemand hat die Geschenke schon gezählt.",
  }),
  () => ({
    title: "Winter auf microTech",
    body: "Draußen eisig, an Bord warm. Wir wünschen dir eine frohe Luminalia.",
  }),
  () => ({
    title: "Ein Geschenk im Frachtraum",
    body: "Kein Manifest, kein Absender, sehr gut verpackt. Schöne Luminalia!",
  }),
  () => ({
    title: "o7 zur Luminalia!",
    body: "Die ganze Org wünscht dir ruhige und helle Tage.",
  }),
  () => ({
    title: "Schnee auf der Landeplattform",
    body: "Fahr vorsichtig aus, Pilot, und genieß die Luminalia.",
  }),
  () => ({
    title: "Die Tage der Lichter",
    body: "Luminalia dauert an. Nimm dir für jeden Tag etwas Schönes vor.",
  }),
  () => ({
    title: "Die Crew hat gedeckt",
    body: "Komm an Bord, es gibt etwas Warmes. Frohe Luminalia!",
  }),
  () => ({
    title: "Frohe Luminalia, Commander!",
    body: "Möge dein Hangar warm und dein Kurs ruhig sein.",
  }),
  () => ({
    title: "Lichterketten am Rumpf",
    body: "Ja, das ist erlaubt. Nein, wir nehmen sie nicht wieder ab.",
  }),
  () => ({
    title: "Ruhe im Verse",
    body: "Zur Luminalia fliegt es sich entspannter. Genieß die freien Bahnen.",
  }),
  () => ({
    title: "Post aus Stanton",
    body: "Deine Geschenke sind unterwegs. Die Lieferzeiten kennst du ja.",
  }),
  () => ({
    title: "Ein Toast zur Luminalia",
    body: "Irgendwo zwischen Lorville und New Babbage geht die Runde aufs Haus.",
  }),
  () => ({
    title: "Warme Schilde, kalte Nacht",
    body: "Schöne Luminalia. Bleib heil und komm zurück an Bord.",
  }),
  () => ({
    title: "Der Hangar ist geschmückt",
    body: "Wir haben die Lichter aufgehängt. Frohe Luminalia, Citizen!",
  }),
  () => ({
    title: "Frohe Luminalia, Pilot!",
    body: "Heute darf die Fracht auch mal einen Tag länger stehen.",
  }),
  () => ({
    title: "Sternenklar über microTech",
    body: "Ein guter Abend, um nach oben zu schauen. Frohe Luminalia!",
  }),
  () => ({
    title: "Geschenke für die ganze Crew",
    body: "Zur Luminalia fliegt niemand mit leeren Händen los.",
  }),
  () => ({
    title: "Licht in jedem Fenster",
    body: "Von Area18 bis Orison. Wir wünschen dir eine schöne Luminalia.",
  }),
];
