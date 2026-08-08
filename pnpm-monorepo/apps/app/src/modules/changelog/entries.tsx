import image20250227Dropdown from "@/modules/changelog/assets/2025-02-27-dropdown.png";
import image20250228PenaltyPoints from "@/modules/changelog/assets/2025-02-28-penalty-points.png";
import image20250302SilcDashboard from "@/modules/changelog/assets/2025-03-02-silc-dashboard.png";
import image20250302SilcOverview from "@/modules/changelog/assets/2025-03-02-silc-overview.png";
import image20250302SilcTransactions from "@/modules/changelog/assets/2025-03-02-silc-transactions.png";
import image20250303SilcAuecConversionRate from "@/modules/changelog/assets/2025-03-03-silc-auec-conversion-rate.png";
import image20250303SilcStatistics from "@/modules/changelog/assets/2025-03-03-silc-statistics.png";
import image20250309LineupCreateChild from "@/modules/changelog/assets/2025-03-09-lineup-create-child.png";
import image20250309LineupGroups from "@/modules/changelog/assets/2025-03-09-lineup-groups.png";
import image20250315EventManagers from "@/modules/changelog/assets/2025-03-15-event-managers.png";
import image20250315LineupEnabled from "@/modules/changelog/assets/2025-03-15-lineup-enabled.png";
import image20250322RequiredVariantsEdit from "@/modules/changelog/assets/2025-03-22-required-variants-edit.png";
import image20250322RequiredVariantsTooltip from "@/modules/changelog/assets/2025-03-22-required-variants-tooltip.png";
import image20250323LineupDragNDrop from "@/modules/changelog/assets/2025-03-23-lineup-dragndrop.png";
import image20250329CitizenHandle from "@/modules/changelog/assets/2025-03-29-citizen-handle.png";
import image20250516CornerstoneImageBrowser from "@/modules/changelog/assets/2025-05-16-cornerstone-image-browser.png";
import image20250529LogAnalyzer from "@/modules/changelog/assets/2025-05-29-log-analyzer.png";
import image20250531Overlay from "@/modules/changelog/assets/2025-05-31-overlay.png";
import image20250609Collapsed from "@/modules/changelog/assets/2025-06-09-collapsed.png";
import image20250609Uncollapsed from "@/modules/changelog/assets/2025-06-09-uncollapsed.png";
import image20250614CmdK from "@/modules/changelog/assets/2025-06-14-cmdk.png";
import image20250906NewLayout from "@/modules/changelog/assets/2025-09-06-new-layout.png";
import image20251007sincome from "@/modules/changelog/assets/2025-10-07-sincome.png";
import image20251013rolesHistory from "@/modules/changelog/assets/2025-10-13-roles-history.png";
import image20260214RoleTooltip from "@/modules/changelog/assets/2026-02-14-role-tooltip.png";
import image20260301CitizenPopover from "@/modules/changelog/assets/2026-03-01-citizen-popover.png";
import image20260510Career from "@/modules/changelog/assets/2026-05-10-career.png";
import image20260510CitizenPopover from "@/modules/changelog/assets/2026-05-10-citizen-popover.png";
import image20260510OverviewTab from "@/modules/changelog/assets/2026-05-10-overview-tab.png";
import image20260510ProfileTile from "@/modules/changelog/assets/2026-05-10-profile-tile.png";
import image20260521Timezones from "@/modules/changelog/assets/2026-05-21-timezones.png";
import image20260731LineupPastePopover from "@/modules/changelog/assets/2026-07-31-lineup-paste-popover.png";
import image20260731LineupPositionActions from "@/modules/changelog/assets/2026-07-31-lineup-position-actions.png";
import image20260801WikiEditor from "@/modules/changelog/assets/2026-08-01-wiki-editor.png";
import image20260801WikiPage from "@/modules/changelog/assets/2026-08-01-wiki-page.png";
import image20260801WikiSearch from "@/modules/changelog/assets/2026-08-01-wiki-search.png";
import type { ChangelogEntry } from "@/modules/changelog/types";
import { Link } from "@/modules/common/components/Link";
import Image from "next/image";
import { AiFillAppstore } from "react-icons/ai";
import { FaCopy } from "react-icons/fa";

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    key: "2026-08-08-wiki-kopieren-und-einfuegen",
    date: "2026-08-08",
    title: "Wiki: Seiten kopieren und einfügen",
    tags: ["Neu", "Wiki", "Events"],
    isTracked: true,
    body: () => (
      <>
        <p>
          Wiki-Seiten lassen sich jetzt kopieren. Der neue Kopieren-Button auf
          der Seite legt sie in die Zwischenablage. Eingefügt wird über
          &bdquo;Neue Seite&ldquo; oder das Plus im Inhaltsverzeichnis: Dies ist
          auch zwischen Wiki und Events möglich.
        </p>

        <p>
          Beim Erstellen einer neuen Seite kann ihr Inhalt außerdem direkt von
          einer bestehenden Seite übernommen werden (&bdquo;Inhalt kopieren
          von&ldquo;). Kopien übernehmen die Berechtigungen ihres neuen Orts.
          Der bisherige Duplizieren-Button wurde entfernt.
        </p>
      </>
    ),
  },

  {
    key: "2026-08-08-event-briefing",
    date: "2026-08-08",
    title: "Events: Briefing",
    tags: ["Neu", "Events", "Wiki"],
    isTracked: true,
    body: () => (
      <>
        <p>
          Jedes neu angelegte Event bekommt einen eigenen
          &bdquo;Briefing&ldquo;-Tab: ein Wiki nur für dieses Event. Der
          Organisator und die Event-Manager befüllen es und legen pro Seite
          fest, wer lesen und bearbeiten darf – nur die Manager, die Teilnehmer,
          eine Gruppe der Aufstellung oder alle. Sobald die Startseite für mehr
          als die Manager freigegeben wird, erscheint der Tab für die neue
          Zielgruppe und sie bekommt einmalig eine Benachrichtigung.
        </p>

        <p>
          Im Briefing stecken die bekannten Wiki-Funktionen: gemeinsames
          Bearbeiten, Unterseiten, Suche, Tags, Favoriten, Bilder und
          Dateianhänge. Nach dem Ende des Events wird das Briefing wie das
          restliche Event eingefroren und bleibt lesbar. In den
          Event-Übersichten führt ein Briefing-Button direkt hinein.
        </p>
      </>
    ),
  },

  {
    key: "2026-08-05-wiki-kleiner-text",
    date: "2026-08-05",
    title: "Wiki: Kleiner Text",
    tags: ["Neu", "Wiki"],
    isTracked: false,
    body: () => (
      <p>
        Im Wiki-Editor gibt es jetzt die Formatierung &bdquo;Kleiner Text&ldquo;
        – für Bildunterschriften, Randbemerkungen und Kleingedrucktes. Sie
        funktioniert wie Fett oder Kursiv: Text markieren, im Menü auf das
        Symbol klicken. Und weil sie eine Formatierung ist, lässt sie sich
        überall einsetzen, wo Text steht – auch in Überschriften, Listen und
        Tabellen.
      </p>
    ),
  },

  {
    key: "2026-08-05-wiki-seite-auf-dem-dashboard",
    date: "2026-08-05",
    title: "Wiki-Seite auf dem Dashboard",
    tags: ["Neu", "Dashboard", "Wiki"],
    isTracked: true,
    body: () => (
      <>
        <p>
          Das{" "}
          <Link
            href="/app/dashboard"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Dashboard
          </Link>{" "}
          zeigt jetzt unter den Events den Inhalt einer Wiki-Seite – etwa für
          Ankündigungen oder die wichtigsten Infos der Woche. Längere Seiten
          lassen sich direkt im Kasten scrollen, darunter führt ein Link auf die
          ganze Seite im Wiki.
        </p>

        <p>
          Welche Seite das ist, legen die Wiki-Verwalter in den
          Wiki-Einstellungen fest. Wie überall im Wiki gilt: Angezeigt wird sie
          nur denen, die sie auch lesen dürfen.
        </p>
      </>
    ),
  },

  {
    key: "2026-08-05-wiki-featured-seiten",
    date: "2026-08-05",
    title: "Wiki: Featured Seiten",
    tags: ["Neu", "Wiki"],
    isTracked: false,
    body: () => (
      <>
        <p>
          Die{" "}
          <Link
            href="/app/wiki"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Wiki-Startseite
          </Link>{" "}
          zeigt jetzt ganz oben einen Bereich mit Featured Seiten – als Kacheln
          mit Symbol, Titel und Datum der letzten Änderung. So sind die
          wichtigsten Seiten wie Handbuch oder Onboarding sofort erreichbar,
          statt im Inhaltsverzeichnis gesucht werden zu müssen.
        </p>

        <p>
          Welche Seiten das sind und in welcher Reihenfolge sie erscheinen,
          legen die Wiki-Verwalter in den Wiki-Einstellungen fest. Wie überall
          im Wiki gilt: Angezeigt wird eine Seite nur denen, die sie auch lesen
          dürfen.
        </p>
      </>
    ),
  },

  {
    key: "2026-08-04-wiki-inhaltsverzeichnis-einklappen",
    date: "2026-08-04",
    title: "Wiki: Inhaltsverzeichnis einklappen",
    tags: ["Neu", "Wiki"],
    isTracked: false,
    body: () => (
      <>
        <p>
          Das Inhaltsverzeichnis in der Wiki-Seitenleiste lässt sich jetzt
          einklappen: Jede Seite mit Unterseiten hat davor einen Pfeil, der ihre
          Unterseiten ein- und ausblendet. Zu Beginn ist alles eingeklappt, so
          dass nur die obersten Seiten zu sehen sind. Über der Liste klappt ein
          Knopf das gesamte Verzeichnis auf einen Schlag auf oder zu.
        </p>

        <p>
          Öffnest du eine Seite, klappt der Weg dorthin automatisch auf – und
          hat sie selbst Unterseiten, werden diese gleich mit angezeigt. Welche
          Seiten aufgeklappt sind, merkt sich der Browser bis zum nächsten
          Besuch.
        </p>
      </>
    ),
  },

  {
    key: "2026-08-02-wiki-blockbreite",
    date: "2026-08-02",
    title: "Wiki: Blockbreite",
    tags: ["Neu", "Wiki"],
    isTracked: false,
    body: () => (
      <p>
        Alle Blöcke im Wiki-Editor – Absätze, Überschriften, Listen, Tabellen,
        Code-Blöcke, aufklappbare Bereiche und mehr – lassen sich jetzt wie
        Bilder an den Seiten in der Breite ziehen. Im Menü jedes Blocks gibt es
        dafür drei Voreinstellungen (Schmal, Breit, Volle Breite). Seiten werden
        dadurch zur zentrierten Lesespalte: Blöcke starten in
        &bdquo;Schmal&ldquo;, platzhungrige Elemente wie Tabellen, Code-Blöcke,
        Embeds, Raster und Trennlinien in &bdquo;Breit&ldquo;; jeder Block lässt
        sich außerdem links, mittig oder rechts positionieren.
      </p>
    ),
  },

  {
    key: "2026-08-02-wiki-upload-berechtigungen",
    date: "2026-08-02",
    title: "Wiki: Upload-Berechtigungen",
    tags: ["Änderung", "Wiki"],
    isTracked: false,
    body: () => (
      <>
        <p>
          Bilder und Dateianhänge können ab jetzt standardmäßig nur noch
          Verwalter einer Wiki-Seite hochladen. Im Berechtigungen-Dialog gibt es
          dafür den neuen Abschnitt &bdquo;Hochladen&ldquo;: Dort lässt sich pro
          Seite – getrennt für Bilder und Dateianhänge – freischalten, dass auch
          alle mit Bearbeiten-Berechtigung hochladen dürfen. Wie die übrigen
          Berechtigungen erben Unterseiten die Einstellung, solange sie keine
          eigene haben.
        </p>

        <p>Das Seiten-Icon können ebenfalls nur noch Verwalter ändern.</p>
      </>
    ),
  },

  {
    key: "2026-08-02-wiki-verbundene-nutzer",
    date: "2026-08-02",
    title: "Wiki: Verbundene Nutzer",
    tags: ["Änderung", "Wiki"],
    isTracked: false,
    body: () => (
      <p>
        Die Liste der verbundenen Nutzer im Editor – der grüne Punkt in der
        Werkzeugleiste – trennt jetzt zwischen denen, die die Seite bearbeiten
        können, und denen, die nur mitlesen.
      </p>
    ),
  },

  {
    key: "2026-08-02-wiki-rollenmitglieder",
    date: "2026-08-02",
    title: "Wiki: Rollenmitglieder",
    tags: ["Neu", "Wiki"],
    isTracked: false,
    body: () => (
      <>
        <p>
          Wiki-Seiten können jetzt einen Block &bdquo;Rollenmitglieder&ldquo;
          enthalten: Du wählst eine Rolle aus und der Block listet alle Citizens
          auf, denen diese Rolle zugewiesen ist. Bei Rollen mit Leveln
          erscheinen nur die Citizens, die das höchste Level erreicht haben.
        </p>

        <p>
          Die Liste wird bei jedem Aufruf neu ermittelt – wer eine Rolle nicht
          sehen darf, sieht auch ihre Mitglieder nicht. Eingefügt wird der Block
          über das Plus am Seitenrand oder mit <code>/</code> im Editor; die
          Rolle wählst du anschließend über das Zahnrad im Block-Menü.
        </p>
      </>
    ),
  },

  {
    key: "2026-08-02-wiki-schiffe",
    date: "2026-08-02",
    title: "Wiki: Schiffe verlinken",
    tags: ["Neu", "Wiki"],
    isTracked: false,
    body: () => (
      <p>
        Im Wiki lassen sich jetzt Schiffe aus der Flotte verlinken: Der Eintrag
        „Schiff“ im Slash-Menü und im Plus-Menü am Seitenrand öffnet eine Suche
        über alle Schiffe und Hersteller. Der eingefügte Link zeigt den
        Schiffsnamen samt Hersteller-Logo und führt direkt zur Schiffsseite –
        eingefügte Schiff-URLs werden automatisch zu solchen Links.
      </p>
    ),
  },

  {
    key: "2026-08-02-wiki-suche-tags",
    date: "2026-08-02",
    title: "Wiki: Tags in der Suche",
    tags: ["Neu", "Wiki"],
    isTracked: true,
    body: () => (
      <p>
        Die Wiki-Suche berücksichtigt jetzt auch Tags: Seiten, deren Tags zum
        Suchbegriff passen, erscheinen in den Ergebnissen und zeigen die
        passenden Tags an. Zusätzlich tauchen passende Tags selbst als Ergebnis
        auf und führen direkt zur Übersicht aller Seiten mit diesem Tag.
      </p>
    ),
  },

  {
    key: "2026-08-02-wiki-dateianhaenge",
    date: "2026-08-02",
    title: "Wiki: Dateianhänge melden",
    tags: ["Neu", "Wiki"],
    isTracked: true,
    body: () => (
      <p>
        Dateianhänge im Wiki zeigen jetzt ein Download-Icon und können — wie
        Seiten — über das Flaggen-Symbol neben dem Anhang direkt den
        Wiki-Administratoren gemeldet werden.
      </p>
    ),
  },

  {
    key: "2026-08-01-wiki",
    date: "2026-08-01",
    title: "Neue App: Wiki",
    tags: ["Neu", "Wiki"],
    isTracked: true,
    body: () => (
      <>
        <p>
          Mit dem{" "}
          <Link
            href="/app/wiki"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Wiki
          </Link>{" "}
          gibt es jetzt einen Ort für das gesammelte Wissen der Organisation.
          Seiten können von mehreren Personen gleichzeitig bearbeitet werden –
          Änderungen werden live gespeichert und sind sofort für alle sichtbar.
        </p>

        <Link href={image20260801WikiPage.src}>
          <Image
            quality={100}
            src={image20260801WikiPage}
            alt=""
            loading="eager"
            className="max-h-full w-auto"
          />
        </Link>

        <p>
          Der Editor kann neben Text unter anderem Tabellen, Callouts,
          mehrspaltige Raster, Aufgabenlisten, Bilder, Dateianhänge und
          Einbettungen wie YouTube-Videos. Neue Blöcke fügst du über die
          Toolbar, über das Plus am Seitenrand oder direkt beim Schreiben mit{" "}
          <code>/</code> ein.
        </p>

        <Link href={image20260801WikiEditor.src}>
          <Image
            quality={100}
            src={image20260801WikiEditor}
            alt=""
            loading="eager"
            className="max-h-full w-auto"
          />
        </Link>

        <p>
          Seiten sind hierarchisch organisiert und lassen sich mit Favoriten und
          Tags strukturieren. Die Volltextsuche durchsucht alle für dich
          sichtbaren Seiten. Wer eine Seite sehen, bearbeiten oder verwalten
          darf, wird pro Seite festgelegt – Unterseiten übernehmen die
          Einstellungen automatisch.
        </p>

        <Link href={image20260801WikiSearch.src}>
          <Image
            quality={100}
            src={image20260801WikiSearch}
            alt=""
            loading="eager"
            className="max-h-full w-auto"
          />
        </Link>

        <p>
          Die Hilfe-App wurde durch das Wiki abgelöst – ihre Inhalte findest du
          ab sofort dort.
        </p>

        <p className="text-sm text-neutral-500">
          Die Screenshots zeigen Beispielinhalte.
        </p>
      </>
    ),
  },

  {
    key: "2026-07-31-posten-kopieren-und-einfuegen",
    date: "2026-07-31",
    title: "Posten kopieren und einfügen",
    tags: ["Neu", "Events"],
    isTracked: true,
    body: () => (
      <>
        <p>
          In der Aufstellung eines Events gibt es bei jedem Posten drei neue
          Schaltflächen: Duplizieren, Kopieren und Einfügen. Damit lassen sich
          einzelne Posten und ganze Gruppen inkl. ihrer untergeordneten Posten
          wiederverwenden, anstatt sie erneut anzulegen.
        </p>

        <Link href={image20260731LineupPositionActions.src}>
          <Image
            quality={100}
            src={image20260731LineupPositionActions}
            alt=""
            loading="eager"
            className="max-h-full w-auto"
          />
        </Link>

        <p>
          Duplizieren legt die Kopie direkt unter dem Original ab. Kopieren legt
          den Posten in eine Zwischenablage, die auch beim Wechsel in ein
          anderes Event erhalten bleibt. Von dort kann er entweder hinter einem
          Posten oder in eine Gruppe eingefügt werden.
        </p>

        <Link href={image20260731LineupPastePopover.src}>
          <Image
            quality={100}
            src={image20260731LineupPastePopover}
            alt=""
            loading="eager"
            className="max-h-full w-auto"
          />
        </Link>

        <p>
          Zugewiesene Citizen und Bewerbungen werden nicht mitkopiert. Eine
          Kopie startet also immer unbesetzt.
        </p>
      </>
    ),
  },

  {
    key: "2026-06-07-autostart-log-analyzer",
    date: "2026-06-07",
    title: "Autostart vom Log Analyzer",
    tags: ["Neu", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <>
        <p>
          Für den{" "}
          <Link
            href="/app/tools/log-analyzer"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Log Analyzer
          </Link>{" "}
          gibt es nun eine Autostart-Funktion. Wenn diese aktiviert ist, wird
          der Log Analyzer automatisch gestartet, wenn die App geöffnet wird
          (bspw. über einen Browser-Lesezeichen).
        </p>

        <p>
          Als Ordner für die Star Citizen Installation wird der zuletzt
          verwendete Ordner verwendet.
        </p>
      </>
    ),
  },

  {
    key: "2026-05-26-neueste-tasks-auf-dem-dashboard",
    date: "2026-05-26",
    title: "Neueste Tasks auf dem Dashboard",
    tags: ["Neu", "Tasks"],
    body: () => (
      <p>
        Auf dem Dashboard werden nun die 5 neuesten Tasks der letzten Woche
        angezeigt, die von Anderen erstellt wurden und für dich sichtbar sind.
        So findest du schneller Tasks, die du übernehmen kannst.
      </p>
    ),
  },

  {
    key: "2026-05-25-hervorhebung-neuer-changelog-einträge",
    date: "2026-05-25",
    title: "Hervorhebung neuer Changelog-Einträge",
    tags: ["Neu", "Changelog"],
    isTracked: true,
    body: () => (
      <p>
        Es gibt nun eine Hervorhebung wenn es im Changelog neue Einträge gibt.
      </p>
    ),
  },

  {
    key: "2026-05-25-log-analyzer-refreshed",
    date: "2026-05-25",
    title: "Log Analyzer refreshed",
    tags: ["Änderung", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <>
        <p>
          Für den Log Analyzer wurde überarbeitet, wie die Logs ausgewertet
          werden. Dies ermöglicht ein einfacheres und schnelleres Hinzufügen von
          neuen Log-Einträgen.
        </p>

        <p>
          Zudem wurde die Darstellung an das neue Standard-Tabellen-Layout
          angepasst.
        </p>
      </>
    ),
  },

  {
    key: "2026-05-25-blueprint-freischaltungen",
    date: "2026-05-25",
    title: "Blueprint-Freischaltungen",
    tags: ["Neu", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <p>
        Im Log Analyzer wird nun angezeigt, wenn ein Blueprint freigeschaltet
        wird.
      </p>
    ),
  },

  {
    key: "2026-05-25-contract-angenommen",
    date: "2026-05-25",
    title: "Contract angenommen",
    tags: ["Neu", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <p>
        Im Log Analyzer wird nun angezeigt, wenn ein Contract angenommen wird.
      </p>
    ),
  },

  {
    key: "2026-05-25-contract-abgeschlossen",
    date: "2026-05-25",
    title: "Contract abgeschlossen",
    tags: ["Neu", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <p>
        Im Log Analyzer wird nun angezeigt, wenn ein Contract abgeschlossen
        wird.
      </p>
    ),
  },

  {
    key: "2026-05-25-contract-fehlgeschlagen",
    date: "2026-05-25",
    title: "Contract fehlgeschlagen",
    tags: ["Neu", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <p>
        Im Log Analyzer wird nun angezeigt, wenn ein Contract fehlgeschlagen
        wird.
      </p>
    ),
  },

  {
    key: "2026-05-25-verbindung-getrennt",
    date: "2026-05-25",
    title: "Verbindung getrennt",
    tags: ["Neu", "Log Analyzer"],
    isTracked: true,
    body: () => (
      <p>
        Im Log Analyzer wird nun angezeigt, wenn die Verbindung getrennt wird.
      </p>
    ),
  },

  {
    key: "2026-05-21-neue-timezones-app",
    date: "2026-05-21",
    title: "Neue Timezones App",
    tags: ["Neu", "Timezones"],
    body: () => (
      <>
        <p>
          Unter{" "}
          <Link
            href="/app/timezones"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Timezones
          </Link>{" "}
          gibt es eine neue App, die dir bei der Umrechnung von Zeiten zwischen
          verschiedenen Zeitzonen hilft. Das ist besonders nützlich, um
          Ankündigungen von CIG in der eigenen Zeitzone zu verstehen.
        </p>

        <Link href={image20260521Timezones.src}>
          <Image
            quality={100}
            src={image20260521Timezones}
            alt=""
            loading="eager"
            className="max-h-full w-auto"
          />
        </Link>
      </>
    ),
  },

  {
    key: "2026-05-16-suchen-filter",
    date: "2026-05-16",
    title: "Suchen-Filter",
    tags: ["Neu"],
    body: () => (
      <p>
        Die Filter von diversen Apps (bspw. Flotte) wurde um eine Suche
        erweitert.
      </p>
    ),
  },

  {
    key: "2026-05-16-suchen-filter-flotte",
    date: "2026-05-16",
    title: "Suchen-Filter",
    tags: ["Neu", "Flotte"],
    body: () => (
      <p>
        Die Filter der Flotten- und Schiffstabellen wurden um einen Filter für
        Hersteller erweitert.
      </p>
    ),
  },

  {
    key: "2026-05-16-changelog-jahr",
    date: "2026-05-16",
    title: "Changelog - Jahr",
    tags: ["Neu", "Changelog"],
    body: () => <p>Der Changelog ist nun nach Jahr aufgeteilt.</p>,
  },

  {
    key: "2026-05-15-flotte-schiffe-löschen",
    date: "2026-05-15",
    title: "Flotte - Schiffe löschen",
    tags: ["Neu", "Flotte"],
    body: () => (
      <>
        <p>
          Gelöschte Schiffe werden nicht mehr endgültig aus der Datenbank
          entfernt, sondern nur als gelöscht markiert. Sie können auf der Seite
          &ldquo;Meine Schiffe&rdquo; über den Filter &ldquo;Gelöscht&rdquo;
          wieder angezeigt und berücksichtigt werden.
        </p>

        <p>
          Zusätzlich werden nun alle Änderungen an Schiffen mit Zeitstempeln und
          dem verantwortlichen Benutzer protokolliert (&ldquo;erstellt
          am&rdquo;, &ldquo;erstellt von&rdquo;, &ldquo;aktualisiert am&rdquo;,
          &ldquo;aktualisiert von&rdquo;, &ldquo;gelöscht am&rdquo;,
          &ldquo;gelöscht von&rdquo;).
        </p>
      </>
    ),
  },

  {
    key: "2026-05-15-flotte-detailseiten",
    date: "2026-05-15",
    title: "Flotte - Detailseiten",
    tags: ["Neu", "Flotte"],
    body: () => (
      <>
        <p>
          Es gibt nun eine Detailseite für jedes Schiff. Die Seite zeigt den
          Namen, die Serien- und Herstellerzuordnung, Tags, den
          Flight-ready-Status, externe Links zu anderen Diensten.
        </p>

        <p>
          Der Zugriff ist für Benutzer mit der Berechtigung &ldquo;Schiffe
          verwalten&rdquo; oder &ldquo;Org-Flotte lesen&rdquo; möglich.
        </p>
      </>
    ),
  },

  {
    key: "2026-05-15-flotte-änderungen",
    date: "2026-05-15",
    title: "Flotte - Änderungen",
    tags: ["Neu", "Flotte"],
    body: () => (
      <>
        <p>
          Eine neue Seite &ldquo;Änderungen&rdquo; zeigt alle Erstellungen und
          Löschungen von Schiffen in einer tabellarischen Übersicht. Die
          Änderungen können nach Variant, Eigentümer, Akteur und Typ gefiltert
          werden.
        </p>

        <p>
          Der Zugriff erfordert die Berechtigung &ldquo;Andere Schiffe
          lesen&rdquo;.
        </p>
      </>
    ),
  },

  {
    key: "2026-05-14-rolle-beschreibungsfeld",
    date: "2026-05-14",
    title: "Rollen - Beschreibungsfeld",
    tags: ["Neu", "IAM"],
    body: () => (
      <p>
        Rollen können nun eine Beschreibung erhalten. Die Beschreibung wird in
        der Rollenübersicht und im Rollen-Badge angezeigt.
      </p>
    ),
  },

  {
    key: "2026-05-12-org-flotte-alle-varianten-anzeigen",
    date: "2026-05-12",
    title: "Org-Flotte - Alle Varianten anzeigen",
    tags: ["Änderung", "Flotte"],
    body: () => (
      <p>
        Die Org-Flotte zeigt nun alle verfügbaren Varianten an, auch wenn kein
        Org-Mitglied eine besitzt. Diese Varianten werden mit 0 in der
        &ldquo;Anzahl&rdquo;-Spalte dargestellt.
      </p>
    ),
  },

  {
    key: "2026-05-12-meine-schiffe-neues-layout",
    date: "2026-05-12",
    title: "Meine Schiffe - Neues Layout",
    tags: ["Änderung", "Flotte"],
    body: () => (
      <p>
        Die Übersicht &ldquo;Meine Schiffe&rdquo; wurde neu gestaltet und
        entspricht nun dem Layout der anderen Apps wie Events und Tasks.
      </p>
    ),
  },

  {
    key: "2026-05-11-rolle-neues-layout",
    date: "2026-05-11",
    title: "Rollen - Neues Layout",
    tags: ["Änderung", "IAM"],
    body: () => (
      <p>
        Die Übersicht der Rollen wurde neu gestaltet und entspricht nun dem
        Layout der anderen Apps wie Events und Tasks.
      </p>
    ),
  },

  {
    key: "2026-05-11-benutzer-neues-layout",
    date: "2026-05-11",
    title: "Benutzer - Neues Layout",
    tags: ["Änderung", "IAM"],
    body: () => (
      <p>
        Die Übersicht der Benutzer wurde neu gestaltet und entspricht nun dem
        Layout der anderen Apps wie Events und Tasks.
      </p>
    ),
  },

  {
    key: "2026-05-10-levelbare-rolle",
    date: "2026-05-10",
    title: "Levelbare Rollen",
    tags: ["Neu", "Rollen", "Karriere"],
    body: () => (
      <>
        <p>
          Eine Rolle kann nun levelbar geschaltet werden. Levelbare Rollen haben
          ein maximales Level. Erst wenn dieses Level erreicht ist, gilt diese
          Rolle als freigeschaltet für den jeweiligen Citizen. Erst ab diesem
          Moment greifen Berechtigungen und die Rolle erscheint visuell (z.B. in
          Karriere) als aktiv.
        </p>

        <p>
          Die Level können von Citizen mit der Berechtigung Rollen zu vergeben
          und nehmen angepasst werden.
        </p>

        <div className="grid grid-cols-2 grid-rows-[128px_128px] gap-2">
          <Link href={image20260510CitizenPopover.src}>
            <Image
              quality={100}
              src={image20260510CitizenPopover}
              alt=""
              className="max-h-full w-auto"
            />
          </Link>

          <Link href={image20260510ProfileTile.src}>
            <Image
              quality={100}
              src={image20260510ProfileTile}
              alt=""
              className="max-h-full w-auto"
            />
          </Link>

          <Link href={image20260510Career.src}>
            <Image
              quality={100}
              src={image20260510Career}
              alt=""
              className="max-h-full w-auto"
            />
          </Link>

          <Link href={image20260510OverviewTab.src}>
            <Image
              quality={100}
              src={image20260510OverviewTab}
              alt=""
              className="max-h-full w-auto"
            />
          </Link>
        </div>
      </>
    ),
  },

  {
    key: "2026-05-10-flotte-neues-layout",
    date: "2026-05-10",
    title: "Flotte - Neues Layout",
    tags: ["Änderung", "Flotte"],
    body: () => (
      <p>
        Die Übersicht der Organisationsflotte wurde neu gestaltet und entspricht
        nun dem Layout der anderen Apps wie Events und Tasks.
      </p>
    ),
  },

  {
    key: "2026-05-06-automatische-rolle-zuweisung",
    date: "2026-05-06",
    title: "Automatische Rollen-Zuweisung",
    tags: ["Neu", "Rollen"],
    body: () => (
      <>
        <p>
          Einer Rolle kann nun eine automatische Zuweisung nach einer bestimmten
          Anzahl an Tagen der Inaktivität konfiguriert werden. Citizen, die sich
          innerhalb dieses Zeitraums nicht angemeldet haben, erhalten die Rolle
          automatisch.
        </p>

        <p>
          Hierüber kann bspw. die &ldquo;Gesperrt&rdquo;-Rolle automatisch an
          inaktive Member zugewiesen werden, um deren Login-Berechtigung zu
          entziehen.
        </p>
      </>
    ),
  },

  {
    key: "2026-05-06-benachrichtigung-wenn-event-bald-beginnt",
    date: "2026-05-06",
    title: "Benachrichtigung wenn Event bald beginnt",
    tags: ["Neu", "Benachrichtigungen"],
    body: () => (
      <>
        <p>
          Du kannst nun 15 Minuten vor Beginn eines Events benachrichtigt
          werden, wenn du Teilnehmer bist.
        </p>

        <p>
          Die neue Benachrichtigung kann aktiviert werden unter:{" "}
          <Link
            href="/app/account/notifications"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Account &gt; Benachrichtigungen
          </Link>
        </p>
      </>
    ),
  },

  {
    key: "2026-05-06-system-protokoll-für-automatische-rolle-änderungen",
    date: "2026-05-06",
    title: "System-Protokoll für automatische Rollen-Änderungen",
    tags: ["Neu", "System Log"],
    requiresAuth: { resource: "systemLog", action: "read" },
    body: () => (
      <p>
        Automatische Rollen-Zuweisungen und -Entfernungen werden nun im
        System-Protokoll protokolliert. Dies ermöglicht eine bessere
        Nachverfolgung der Änderungen.
      </p>
    ),
  },

  {
    key: "2026-05-06-formatierung-von-posten-in-der-aufstellung",
    date: "2026-05-06",
    title: "Formatierung von Posten in der Aufstellung",
    tags: ["Neu", "Events"],
    body: () => (
      <p>
        Posten in der Event-Aufstellung können nun individuell formatiert
        werden. Bei der Bearbeitung eines Posten lassen sich die Schriftgröße
        (Normal und Groß), die Hintergrundfarbe und die Textfarbe konfigurieren.
      </p>
    ),
  },

  {
    key: "2026-05-05-strafpunkte-neues-layout",
    date: "2026-05-05",
    title: "Strafpunkte - Neues Layout",
    tags: ["Änderung", "Strafpunkte"],
    body: () => (
      <>
        <p>
          Die Strafpunkte-Übersicht wurde neu gestaltet und entspricht nun dem
          Layout der anderen Apps wie Events und Tasks. Die Einträge werden nun
          als flache Liste mit Pagination angezeigt (50 pro Seite).
        </p>

        <p>
          Ein neuer Filter ermöglicht es, abgelaufene Strafpunkte ein- oder
          auszublenden. Der Filter ist auch auf der Detailseite pro Citizen
          verfügbar.
        </p>
      </>
    ),
  },

  {
    key: "2026-05-05-pagination-für-silc-transaktionen",
    date: "2026-05-05",
    title: "Pagination für SILC-Transaktionen",
    tags: ["Neu", "SILC"],
    body: () => (
      <p>
        Die SILC-Transaktionen werden nun paginiert angezeigt (100 pro Seite).
        Dies verbessert die performance bei vielen Transaktionen.
      </p>
    ),
  },

  {
    key: "2026-05-05-silc-benachrichtigung-bei-gehalt-und-task-erledigung",
    date: "2026-05-05",
    title: "SILC-Benachrichtigung bei Gehalt und Task-Erledigung",
    tags: ["Neu", "SILC", "Benachrichtigungen"],
    body: () => (
      <p>
        Du wirst nun auch benachrichtigt, wenn du SILC durch dein Gehalt
        erhältst oder wenn du einen Task mit SILC-Belohnung erfüllst.
      </p>
    ),
  },

  {
    key: "2026-03-24-system-log",
    date: "2026-03-24",
    title: "System Log",
    tags: ["Neu", "Apps"],
    requiresAuth: { resource: "systemLog", action: "read" },
    body: () => (
      <>
        <p>
          Es gibt eine neue App &ldquo;System Log&rdquo; welche eine Auflistung
          aller Ereignisse im SAM anzeigt. Die Logs werden mit der Zeit
          detaillierter und besser.
        </p>

        <p>
          Es gibt eine neue Berechtigung unter &ldquo;Sonstiges&rdquo; um den
          Zugriff auf das System Log zu limitieren. Benutzer mit dieser
          Berechtigung können vertrauliche Informationen und personenbezogene
          Daten einsehen.
        </p>
      </>
    ),
  },

  {
    key: "2026-03-01-tooltip-für-citizen",
    date: "2026-03-01",
    title: "Tooltip für Citizen",
    tags: ["Neu", "Citizen"],
    body: () => (
      <>
        <p>
          Citizen haben nun ein Tooltip in welchem die wichtigsten Details zum
          jeweiligen Citizen angezeigt werden. Von hier aus können direkt die
          Rollen des Citizens eingesehen und bearbeitet werden.
        </p>

        <p>
          Zukünftig werden hier auch die Organisationen angezeigt, in welchen
          der Citizen Mitglied ist.
        </p>

        <Link href={image20260301CitizenPopover.src}>
          <Image quality={100} src={image20260301CitizenPopover} alt="" />
        </Link>
      </>
    ),
  },

  {
    key: "2026-02-14-tooltip-für-rolle",
    date: "2026-02-14",
    title: "Tooltip für Rollen",
    tags: ["Neu", "Citizen"],
    body: () => (
      <>
        <p>
          Rollen haben nun ein Tooltip in welchem alle Details zu der jeweiligen
          Rolle angezeigt werden. Auch kann direkt hier die jeweilige Rolle von
          einem Citizen entfernt werden.
        </p>

        <p>
          Zukünftig wird hier das aktuelle Level von levelbaren Rollen gezeigt.
          Auch kann direkt hier das Level angepasst werden.
        </p>

        <Link href={image20260214RoleTooltip.src}>
          <Image
            quality={100}
            src={image20260214RoleTooltip}
            alt=""
            loading="lazy"
          />
        </Link>
      </>
    ),
  },

  {
    key: "2026-02-06-projekte",
    date: "2026-02-06",
    title: "Projekte",
    tags: ["Neu", "Apps"],
    body: () => (
      <>
        <p>
          Mit der neuen App &ldquo;Projekte&rdquo; kannst du nun den Fortschritt
          unserer Org-internen Projekte verfolgen.
        </p>

        <p>Diese App wird bereitgestellt von GeronBraginson und Redilian.</p>

        <p>
          Die App ist zu finden unter{" "}
          <Link
            href="/app/external/projects"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Projekte
          </Link>
        </p>
      </>
    ),
  },

  {
    key: "2026-01-31-akzeptanzdatum-bei-auszahlungsstatus-anzeigen",
    date: "2026-01-31",
    title: "Akzeptanzdatum bei Auszahlungsstatus anzeigen",
    tags: ["Änderung", "Gewinnausschüttung"],
    body: () => (
      <p>
        Bei ausstehenden Auszahlungen wird nun das Datum der Zustimmung
        angezeigt, damit besser nachvollzogen werden kann, wann die Zustimmung
        erfolgt ist.
      </p>
    ),
  },

  {
    key: "2026-01-26-favicon-aktualisiert",
    date: "2026-01-26",
    title: "Favicon aktualisiert",
    tags: ["Änderung"],
    body: () => (
      <p>Das Favicon zeigt jetzt das SAM-Logo auf schwarzem Hintergrund.</p>
    ),
  },

  {
    key: "2026-01-18-transaktion-erstellen-über-topbar",
    date: "2026-01-18",
    title: "Transaktion erstellen über TopBar",
    tags: ["Neu", "SILC"],
    body: () => (
      <p>
        Du kannst jetzt SILC-Transaktionen direkt über den
        &ldquo;Neu&rdquo;-Button in der TopBar erstellen.
      </p>
    ),
  },

  {
    key: "2026-01-02-neuer-avatar-rahmen",
    date: "2026-01-02",
    title: "Neuer Avatar-Rahmen",
    tags: ["Änderung", "Avatar Creator"],
    body: () => (
      <>
        <p>
          Der Rahmen im Avatar Creator wurde durch ein neues Design
          ausgetauscht.
        </p>

        <p>
          Du findest den Avatar Creator unter{" "}
          <Link
            href="/app/avatar-creator"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Avatar Creator
          </Link>
          .
        </p>
      </>
    ),
  },

  // 2025 entries
  {
    key: "2025-12-06-neue-statistiken",
    date: "2025-12-06",
    title: "Neue Statistiken",
    tags: ["Neu", "Statistiken"],
    requiresAuth: { resource: "globalStatistics", action: "read" },
    body: () => (
      <>
        <p>
          Die Statistiken zeigen nun auch, wie viel neue SILC an einem Tag
          verteilt wurden. Zusätzlich gibt es Verläufe für die Anzahl an
          registrierten Nutzern, Citizens und Organisationen.
        </p>

        <p>Alle Diagramme enthalten nun einen direkten Vergleich zum Vortag.</p>

        <p>
          Du findest die Ansicht unter{" "}
          <Link
            href="/app/statistics"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Statistiken
          </Link>
          .
        </p>
      </>
    ),
  },

  {
    key: "2025-12-02-schusswaffen-und-messer",
    date: "2025-12-02",
    title: "Schusswaffen und Messer",
    tags: ["Neu", "Cornerstone Image Browser"],
    body: () => (
      <>
        <p>
          Der Cornerstone Image Browser enthält nun auch Schusswaffen und Messer
          von Cornerstone.
        </p>

        <p>
          Dieser ist verfügbar unter{" "}
          <Link
            href="/app/tools/cornerstone-image-browser"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Cornerstone Image Browser
          </Link>
        </p>
      </>
    ),
  },

  {
    key: "2025-12-02-statistiken",
    date: "2025-12-02",
    title: "Statistiken",
    tags: ["Neu", "Statistiken"],
    requiresAuth: { resource: "globalStatistics", action: "read" },
    body: () => (
      <>
        <p>
          Es werden nun täglich Statistiken zur Nutzung des SAM erfasst. Zu
          Beginn werden Schiffsvarianten, Rollen, Logins und Events gezählt.
        </p>

        <p>
          Diese sind einsehbar unter{" "}
          <Link
            href="/app/statistics"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Statistiken
          </Link>
        </p>

        <p>
          Es gibt eine neue Berechtigung unter &ldquo;Sonstiges&rdquo; um den
          Zugriff auf diese Statistiken zu limitieren.
        </p>
      </>
    ),
  },

  {
    key: "2025-11-25-schwarzmarkt-ankauf-umbenannt",
    date: "2025-11-25",
    title: "Schwarzmarkt-Ankauf umbenannt",
    tags: ["Änderung", "Apps"],
    body: () => (
      <>
        <p>
          Die App &ldquo;Schwarzmarkt-Ankauf&rdquo; wurde in
          &ldquo;Scrapper&apos;s Codex&rdquo; umbenannt. Bisherige Links werden
          automatisch auf die neue URL weitergeleitet.
        </p>

        <p>
          Die App ist zu finden unter{" "}
          <Link
            href="/app/external/scrappers-codex"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Scrapper&apos;s Codex
          </Link>
        </p>
      </>
    ),
  },

  {
    key: "2025-11-11-rolle-änderungen-in-der-aktivität",
    date: "2025-11-11",
    title: "Rollen-Änderungen in der Aktivität",
    tags: ["Neu", "Spynet"],
    body: () => (
      <>
        <p>
          Die Aktivitätsseite im Spynet zeigt nun auch Änderungen an
          Rollen-Zuweisungen von Citizens an. Neben den bisherigen Änderungen an
          Organisationen werden jetzt auch hinzugefügte und entfernte Rollen
          angezeigt.
        </p>

        <p>
          Die Einträge werden automatisch basierend auf deinen Berechtigungen
          gefiltert, sodass du nur Änderungen an Rollen siehst, für die du
          Leserechte hast.
        </p>

        <p>
          Du findest die Aktivität unter:{" "}
          <Link
            href="/app/spynet/activity"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Spynet &gt; Aktivität
          </Link>
        </p>
      </>
    ),
  },

  {
    key: "2025-11-08-aufstellung-kopieren",
    date: "2025-11-08",
    title: "Aufstellung kopieren",
    tags: ["Neu", "Events"],
    body: () => (
      <>
        <p>
          Für die Aufstellung eines Events gibt es nun die Möglichkeit die
          Aufstellung eines anderen Events zu kopieren.
        </p>

        <p>
          Klick dazu einfach bei deiner Event-Aufstellung neben den Button
          &ldquo;Hinzufügen&rdquo; auf das{" "}
          <FaCopy className="text-interaction-500 inline" />
          -Symbol und wähle das Event aus von welchem du die Aufstellung
          kopieren möchtest.
        </p>

        <p>
          Die kopierten Posten und Gruppen werden dann in deine aktuelle
          Aufstellung übernommen.
        </p>
      </>
    ),
  },

  {
    key: "2025-11-01-benachrichtigung-bei-veröffentlichung-der-aufstellung",
    date: "2025-11-01",
    title: "Benachrichtigung bei Veröffentlichung der Aufstellung",
    tags: ["Neu"],
    body: () => (
      <>
        <p>
          Es gibt nun die Möglichkeit, sich benachrichtigen zu lassen, wenn die
          Aufstellung eines Events veröffentlicht wird.
        </p>

        <p>
          Die neue Benachrichtigung kann aktiviert werden unter:{" "}
          <Link
            href="/app/account/notifications"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Account &gt; Benachrichtigungen
          </Link>
        </p>
      </>
    ),
  },

  {
    key: "2025-10-31-überarbeitung-der-benachrichtigungen",
    date: "2025-10-31",
    title: "Überarbeitung der Benachrichtigungen",
    tags: ["Änderung"],
    body: () => (
      <>
        <p>
          Das Benachrichtigungssystem wurde grundlegend überarbeitet. Mit der
          Überarbeitung wurden zusätzliche Benachrichtigungen implementiert.
          Außerdem können Browser-Benachrichtigungen nun auf mehr Geräten und
          Browsern empfangen werden. Zudem bietet die Überarbeitung, dass
          zukünftig zusätzliche Empfangskanäle wie On-Site, Discord und E-Mail
          unterstützt werden.
        </p>

        <p>
          Hier kannst du deine Benachrichtigungseinstellungen anpassen:{" "}
          <Link
            href="/app/account/notifications"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Account &gt; Benachrichtigungen
          </Link>
        </p>

        <p className="text-neutral-500">
          Die bisherigen Einstellungen konnten nicht übernommen werden.
        </p>
      </>
    ),
  },

  {
    key: "2025-10-26-avatar-creator",
    date: "2025-10-26",
    title: "Avatar Creator",
    tags: ["Neu"],
    body: () => (
      <>
        <p>
          Der neue Avatar Creator hilft dir dabei, dein Profilbild schnell in
          den offiziellen Rahmen zu setzen. Lade einfach dein Bild hoch, passe
          Position und Größe an und exportiere das Ergebnis direkt aus dem
          Browser.
        </p>

        <p>
          Du findest das Tool unter{" "}
          <Link
            href="/app/avatar-creator"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; Avatar Creator
          </Link>
          .
        </p>

        <p>
          Hintergründe können optional eingefärbt werden, und du kannst
          entscheiden, ob der Rahmen vor oder hinter deinem Bild liegen soll.
        </p>
      </>
    ),
  },

  {
    key: "2025-10-13-änderungsverlauf-für-rolle",
    date: "2025-10-13",
    title: "Änderungsverlauf für Rollen",
    tags: ["Neu"],
    body: () => (
      <>
        <p>
          Auf der Citizen-Detailseite im Spynet gibt es nun den neuen Reiter
          &ldquo;Rollen&rdquo;. Von hier aus können nun dem Citizen Rollen
          hinzugefügt und entfernt werden. Zudem gibt es hier nun einen Verlauf
          aller Änderungen an den Rollen dieses Citizen.
        </p>

        <Link href={image20251013rolesHistory.src}>
          <Image
            quality={100}
            src={image20251013rolesHistory}
            alt=""
            loading="lazy"
          />
        </Link>
      </>
    ),
  },

  {
    key: "2025-10-12-verfallsdatum-für-rolle",
    date: "2025-10-12",
    title: "Verfallsdatum für Rollen",
    tags: ["Neu"],
    body: () => (
      <>
        <p>
          Einer Rolle kann nun ein optionales Verfallsdatum gegeben werden.
          Dieses Datum wird in Anzahl an Tagen angegeben. Sollte sich ein
          Citizen mit dieser Rolle innerhalb dieses Datums nicht einmal im SAM
          angemeldet haben, wird die Rolle automatisch entfernt.
        </p>

        <p>
          Hierüber kann bspw. die Login-Berechtigung für inaktiven Member
          automatisch entfernt werden.
        </p>
      </>
    ),
  },

  {
    key: "2025-10-07-sincome",
    date: "2025-10-07",
    title: "SINcome",
    tags: ["Neu"],
    body: () => (
      <>
        <p>Die neue SINcome-App ist nun live.</p>
        <p>
          Mit SINcome machst du deine SILC zu Geld. Verdiene über den jeweils
          aktiven SINcome-Zeitraum SILC und lasse sie dir im Anschluss als aUEC
          auszahlen.
        </p>

        <p>
          <strong>Hinweis:</strong> Für jeden Zeitraum musst du während der
          Auszahlungsphase einmal händisch bestätigen, dass du die Auszahlung
          empfangen kannst. Nähere Details hierzu findest du in der App.
        </p>

        <p>
          Die App ist zu finden unter{" "}
          <Link
            href="/app/sincome"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps &gt; SINcome
          </Link>
        </p>

        <Link href={image20251007sincome.src}>
          <Image
            quality={100}
            src={image20251007sincome}
            alt=""
            loading="lazy"
          />
        </Link>
      </>
    ),
  },

  {
    key: "2025-10-02-mithilfe",
    date: "2025-10-02",
    title: "Mithilfe",
    tags: ["Ankündigung"],
    body: () => (
      <>
        <p>
          Du hast eine Idee, einen Verbesserungsvorschlag oder einen Wunsch
          f&uuml;r&apos;s SAM? Oder, du m&ouml;chtest sogar selbst an der
          Entwicklung des SAM mitwirken?
        </p>

        <p>
          Unter{" "}
          <Link
            href="/app/help/contributing"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Hilfe &gt; Mithilfe
          </Link>{" "}
          bekommst du nun eine Übersicht dar&uuml;ber, wie du uns bei der
          Entwicklung des SAM unterstützen kannst.
        </p>
      </>
    ),
  },

  {
    key: "2025-09-28-aufzüge-in-contested-zones-und-asd-facilities",
    date: "2025-09-28",
    title: "Aufzüge in Contested Zones und ASD Facilities",
    tags: ["Log Analyzer", "Neu"],
    body: () => (
      <>
        <p>
          Das Benutzen von Aufzügen in den Contested Zones und ASD Facilities
          wird nun erkannt. Es wird auch das Benutzen durch andere Spieler
          erkannt.
        </p>

        <p>Vielen Dank an O-C für das Herausfinden dieser Log-Einträge.</p>

        <p>
          Ebenso vielen Dank an Zettman für das Korrigieren einiger Einträge.
        </p>
      </>
    ),
  },

  {
    key: "2025-09-28-filter-zurückgesetzt",
    date: "2025-09-28",
    title: "Filter zurückgesetzt",
    tags: ["Log Analyzer", "Änderungen"],
    body: () => (
      <p>
        Um zukünftig mehr Filter im Log Analyzer anzubieten, musste ich die
        Datenstruktur dieser ändern. Dazu haben sich eure aktuell eingestellten
        Filter zurückgesetzt.
      </p>
    ),
  },

  {
    key: "2025-09-08-strg-k-umsortiert",
    date: "2025-09-08",
    title: "Strg + K umsortiert",
    tags: ["Änderungen"],
    body: () => <p>Es gab Anpassungen an der Sortierung vom Strg + K Menü.</p>,
  },

  {
    key: "2025-09-06-layout-überarbeitung",
    date: "2025-09-06",
    title: "Layout-Überarbeitung",
    tags: ["Änderungen"],
    body: () => (
      <>
        <p>
          Alle Apps wurden nun in ein neues einheitliches Layout überführt.
          Dieses Layout ist wie folgt strukturiert:
        </p>

        <Link href={image20250906NewLayout.src}>
          <Image
            quality={100}
            src={image20250906NewLayout}
            alt=""
            loading="lazy"
          />
        </Link>
      </>
    ),
  },

  {
    key: "2025-09-05-accounteinstellungen-und-benachrichtigungen",
    date: "2025-09-05",
    title: "Accounteinstellungen und Benachrichtigungen",
    tags: ["Neu", "Änderungen"],
    body: () => (
      <>
        <p>
          Sämtliche Benachrichtigungen werden nun in den neuen{" "}
          <Link
            href="/app/account"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Accounteinstellungen
          </Link>{" "}
          verwaltet. Um dahin zu gelangen, klicke auf dein Avatar oben rechts
          und dann auf &ldquo;Einstellungen&rdquo;. Alternativ kannst du oben
          links unter Apps &ldquo;Account&rdquo; wählen.
        </p>

        <p>
          Zukünftig wird es auch möglich sein sich über Discord benachrichtigen
          zu lassen.
        </p>
      </>
    ),
  },

  {
    key: "2025-09-05-spynet-unterseiten-verschoben",
    date: "2025-09-05",
    title: "Spynet-Unterseiten verschoben",
    tags: ["Änderungen"],
    body: () => (
      <p>
        Die Links zu den Unterseiten des Spynet (Aktivität, Citizen, Notizen,
        Sonstige) wurden in die neue Sidebar der Spynet-App verschoben.
      </p>
    ),
  },

  {
    key: "2025-09-05-flotten-app-mit-sidebar",
    date: "2025-09-05",
    title: "Flotten-App mit Sidebar",
    tags: ["Änderungen"],
    body: () => (
      <p>
        Für die Flotten-App wurde nun ebenfalls das neue Sidebar-Layout
        übernommen.
      </p>
    ),
  },

  {
    key: "2025-08-27-apps-link",
    date: "2025-08-27",
    title: "Apps-Link",
    tags: ["Änderung"],
    body: () => (
      <p>Der Link zu den Apps ist in die Topbar gewandet, oben links.</p>
    ),
  },

  {
    key: "2025-08-27-rolle-und-benutzer-iam",
    date: "2025-08-27",
    title: "Rollen und Benutzer -> IAM",
    tags: ["Änderung"],
    requiresAuth: { resource: "role", action: "manage" },
    body: () => (
      <p>
        Die Seiten Rollen, Berechtigungsmatrix und Benutzer wurden
        zusammengeführt und sind nun über die App &ldquo;IAM&rdquo; erreichbar.
      </p>
    ),
  },

  {
    key: "2025-08-26-topbar",
    date: "2025-08-26",
    title: "Topbar",
    tags: ["Änderung"],
    body: () => (
      <p>
        Es gibt nun eine Topbar. Diese wurde implementiert um zukünftigen
        Funktionen einen Platz zu bieten. Hier sind bereits ein paar Funktionen
        aus der aktuellen Hauptnavigation hingewandert, Strg + K-Menü und
        Abmelden.
      </p>
    ),
  },

  {
    key: "2025-08-24-npc-kills-ausblenden",
    date: "2025-08-24",
    title: "NPC-Kills ausblenden",
    tags: ["Log Analyzer", "Neu"],
    body: () => (
      <p>
        Im Log Analyzer gibt es nun einen neuen Filter um Kills von NPCs
        auszublenden.
      </p>
    ),
  },

  {
    key: "2025-08-24-tasks-übersicht-redesign",
    date: "2025-08-24",
    title: "Tasks-Übersicht Redesign",
    tags: ["Tasks", "Änderung"],
    body: () => (
      <p>
        Die Tasks-Übersicht wurde neu gestaltet, um zusätzliche Filter zu
        ermöglichen.
      </p>
    ),
  },

  {
    key: "2025-08-16-tools-apps",
    date: "2025-08-16",
    title: "Tools -> Apps",
    tags: ["Änderung"],
    body: () => (
      <>
        <p>
          Um der wachsenden Anzahl von Funktionen im SAM gerecht zu werden, gibt
          es nun unter{" "}
          <Link
            href="/app/apps"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Apps
          </Link>{" "}
          eine Übersicht mit allen Apps und Tools.
        </p>

        <p>
          Diese Übersicht ist in der Hauptnavigation hinter dem Icon{" "}
          <AiFillAppstore className="inline-block text-brand-red-500 align-middle" />{" "}
          zu finden.
        </p>

        <p>
          Zukünftig wird es möglich sein, dass Nutzer ihre eigene
          Hauptnavigation individualisieren können, indem sie einzelne Apps
          dieser hinzufügen oder entfernen können.
        </p>
      </>
    ),
  },

  {
    key: "2025-07-25-teamübersicht",
    date: "2025-07-25",
    title: "Teamübersicht",
    tags: ["Karriere", "Neu"],
    body: () => (
      <p>
        Unter{" "}
        <Link
          href="/app/career/team"
          className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
        >
          Karriere &gt; Team
        </Link>{" "}
        gibt es nun eine stets aktuelle Übersicht der Teammitglieder und
        Ansprechpartner.
      </p>
    ),
  },

  {
    key: "2025-06-22-shard-beitritt",
    date: "2025-06-22",
    title: "Shard-Beitritt",
    tags: ["Log Analyzer", "Neu"],
    body: () => (
      <p>Es wird nun angezeigt, wenn man selber einem Shard beitritt.</p>
    ),
  },

  {
    key: "2025-06-14-neues-design",
    date: "2025-06-14",
    title: "Neues Design",
    tags: ["Strg + K", "Änderung"],
    body: () => (
      <>
        <p>Das Strg + K Menü wurde auf den aktuellen Stand gebracht.</p>
        <Image quality={100} src={image20250614CmdK} alt="" loading="lazy" />
      </>
    ),
  },

  {
    key: "2025-06-06-ein-ausklappare-navigation",
    date: "2025-06-06",
    title: "Ein-/ausklappare Navigation",
    tags: ["Neu"],
    body: () => (
      <>
        <p>Die Navigation ist nun ein-/ausklappbar.</p>

        <p>
          Mit der Zeit wird das restliche Interface an den mehr verfügbaren
          Platz angepasst.
        </p>

        <div className="flex justify-between items-start gap-2">
          <div className="w-2/3">
            <Image
              quality={100}
              src={image20250609Uncollapsed}
              alt=""
              loading="lazy"
            />
          </div>

          <div className="w-1/3">
            <Image
              quality={100}
              src={image20250609Collapsed}
              alt=""
              loading="lazy"
            />
          </div>
        </div>
      </>
    ),
  },

  {
    key: "2025-06-06-monatliches-gehalt-auf-dem-dashboard",
    date: "2025-06-06",
    title: "Monatliches Gehalt auf dem Dashboard",
    tags: ["SILC", "Neu"],
    body: () => (
      <p>
        In der SILC-Kachel auf dem Dashboard ist nun das eigene monatliche
        Gehalt sichtbar.
      </p>
    ),
  },

  {
    key: "2025-06-05-berechtigungsmatrix",
    date: "2025-06-05",
    title: "Berechtigungsmatrix",
    tags: ["Rollen", "Neu"],
    requiresAuth: { resource: "role", action: "manage" },
    body: () => (
      <p>
        Unter{" "}
        <Link
          href="/app/roles/permission-matrix"
          className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
        >
          Rollen &gt; Berechtigungsmatrix
        </Link>{" "}
        gibt es nun eine Darstellung aller Rollen und deren Berechtigungen in
        Matrixform.
      </p>
    ),
  },

  {
    key: "2025-06-01-leichen-in-der-umgebung",
    date: "2025-06-01",
    title: "Leichen in der Umgebung",
    tags: ["Log Analyzer", "Neu"],
    requiresAuth: { resource: "logAnalyzer", action: "read" },
    body: () => (
      <p>
        Der Log Analyzer wertet nun Log-Einträge aus, die auf eine Leiche in der
        Umgebung hinweisen. Nach meinem Verständnis werden diese Einträge nur
        einmal pro Leiche geloggt. Hierüber können bspw. Tode erkannt werden,
        die man selber nicht verursacht hat.
      </p>
    ),
  },

  {
    key: "2025-05-31-kill-feed-overlay",
    date: "2025-05-31",
    title: "Kill Feed Overlay",
    tags: ["Log Analyzer", "Neu"],
    requiresAuth: { resource: "logAnalyzer", action: "read" },
    body: () => (
      <>
        <p>
          Der Log Analyzer hat nun ein Overlay, welches über dem Star Citizen
          Fenster positioniert werden kann. In diesem wird der Kill Feed
          gezeigt, wenn automatisches aktualisieren aktiv ist.
        </p>

        <Image
          quality={100}
          src={image20250531Overlay}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-05-31-letzten-einstellungen",
    date: "2025-05-31",
    title: "Letzten Einstellungen",
    tags: ["Log Analyzer", "Neu"],
    requiresAuth: { resource: "logAnalyzer", action: "read" },
    body: () => (
      <>
        <p>
          Die letzte Einstellung von &ldquo;Automatisch aktualisieren&rdquo;
          bleibt nun bestehen.
        </p>

        <p>
          Es gibt nun eine Möglichkeit den letzten ausgewählten Ordner
          wiederzuverwenden.
        </p>
      </>
    ),
  },

  {
    key: "2025-05-31-dogfight-trainer",
    date: "2025-05-31",
    title: "Dogfight Trainer",
    tags: ["Dogfight Trainer", "Tools", "Neu"],
    body: () => (
      <>
        <p>
          Der{" "}
          <Link
            href="/app/dogfight-trainer"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Dogfight Trainer
          </Link>{" "}
          ist nun direkt unter Tools verfügbar.
        </p>

        <p>
          Zeige deinen Dogfight Skill in unserer Hommage an den Klassiker,
          Asteroids. Achte darauf was du abschießt!
        </p>
      </>
    ),
  },

  {
    key: "2025-05-30-verlinkung-von-handles",
    date: "2025-05-30",
    title: "Verlinkung von Handles",
    tags: ["Log Analyzer", "Neu"],
    requiresAuth: { resource: "logAnalyzer", action: "read" },
    body: () => (
      <p>
        Die Handles im Log Analyzer verlinken nun zu den Profilen auf der Seite
        von Roberts Space Industries.
      </p>
    ),
  },

  {
    key: "2025-05-30-automatisches-aktualisieren",
    date: "2025-05-30",
    title: "Automatisches aktualisieren",
    tags: ["Log Analyzer", "Neu"],
    requiresAuth: { resource: "logAnalyzer", action: "read" },
    body: () => (
      <p>
        Es kann nun ein Interval aktiviert werden, durch welchen die Logs alle
        10 Sekunden aktualisiert werden. Neue Einträge werden für 30 Sekunden
        hervorgehoben.
      </p>
    ),
  },

  {
    key: "2025-05-29-eventorganisator-in-der-teilnehmerliste",
    date: "2025-05-29",
    title: "Eventorganisator in der Teilnehmerliste",
    tags: ["Events", "Änderung"],
    body: () => (
      <p>
        Der Eventorganisator wird nun nicht mehr automatisch in der
        Teilnehmerliste mit aufgenommen, wenn er in Discord nicht auf Teilnehmen
        geklickt hat.
      </p>
    ),
  },

  {
    key: "2025-05-29-log-analyzer",
    date: "2025-05-29",
    title: "Log Analyzer",
    tags: ["Log Analyzer", "Tools", "Neu"],
    requiresAuth: { resource: "logAnalyzer", action: "read" },
    body: () => (
      <>
        <p>
          Unter Tools gibt es nun den{" "}
          <Link
            href="/app/tools/log-analyzer"
            className="text-interaction-500 hover:text-interaction-300 focus-visible:text-interaction-300"
          >
            Log Analyzer
          </Link>
          . Dieser wertet die Game Logs von Star Citizen aus um nach Kills zu
          filtern.
        </p>

        <Image
          quality={100}
          src={image20250529LogAnalyzer}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-05-25-selbstständiges-abschließen-von-tasks",
    date: "2025-05-25",
    title: "Selbstständiges Abschließen von Tasks",
    tags: ["Tasks", "Neu"],
    body: () => (
      <p>
        Für personalisierte und Gruppen-Tasks gibt es nun die Möglichkeit, dass
        diese von den zugewiesenen Citizen selbstständig abgeschlossen werden
        können. Diese Option kann unter dem Reiter &ldquo;Zielgruppe&rdquo; beim
        Erstellen eines Tasks aktiviert werden.
      </p>
    ),
  },

  {
    key: "2025-05-17-cornerstone-image-browser-update",
    date: "2025-05-17",
    title: "Cornerstone Image Browser",
    tags: ["Cornerstone Image Browser", "Tools", "Neu"],
    body: () => (
      <p>
        Es stehen nun auch die Bilder für Hüte, Brillen, Handschuhe, Jacken,
        Oberteile, Jumpsuits, Hosen und Schuhe zur Verfügung.
      </p>
    ),
  },

  {
    key: "2025-05-17-github-flavored-markdown",
    date: "2025-05-17",
    title: "GitHub Flavored Markdown",
    tags: ["Tasks", "Neu"],
    body: () => (
      <p>
        Die Beschreibung und der Belohnungstext unterstützen nun{" "}
        <Link
          href="https://github.github.com/gfm/"
          target="_blank"
          className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
        >
          GitHub Flavored Markdown
        </Link>
        . Dadurch werden u.a. nun Links automatisch erkannt und Zeilenumbrüche
        können mit einem einfachen Enter gesetzt werden.
      </p>
    ),
  },

  {
    key: "2025-05-17-tasks-auf-dem-dashboard",
    date: "2025-05-17",
    title: "Tasks auf dem Dashboard",
    tags: ["Tasks", "Neu"],
    body: () => (
      <p>Angenommene Tasks werden nun zusätzlich im Dashboard gezeigt.</p>
    ),
  },

  {
    key: "2025-05-16-cornerstone-image-browser",
    date: "2025-05-16",
    title: "Cornerstone Image Browser",
    tags: ["Cornerstone Image Browser", "Tools", "Neu"],
    body: () => (
      <>
        <p>
          Unter dem Navigationspunkt{" "}
          <Link
            href="/app/tools"
            className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
          >
            Tools
          </Link>{" "}
          gibt es nun den <strong>Cornerstone Image Browser</strong>. Hier
          können die Bilder von Cornerstone nebeneinander dargestellt werden, um
          sie visuell einfach vergleichen zu können.
        </p>

        <Image
          quality={100}
          src={image20250516CornerstoneImageBrowser}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-05-16-tasks-bugfixes",
    date: "2025-05-16",
    title: "Tasks",
    body: () => (
      <>
        <p>
          Es wurde ein Fehler behoben, durch den das Teilnehmerlimit nicht auf
          unbegrenzt gestellt werden konnte.
        </p>

        <p>
          Es wurde ein Fehler behoben, durch den eine SILC-Belohnung nicht
          nachträglich verändert werden konnte.
        </p>

        <p>
          Es ist nun möglich eine negative SILC-Belohnung zu erstellen. Dies
          kann u.a. zum Verkauf von Gegenständen genutzt werden.
        </p>

        <p>
          Es wird nun in jedem Fall ein Hinweis angezeigt, wenn das Annehmen
          oder Aufgeben eines Tasks deaktiviert ist.
        </p>

        <p>Es wurden ein paar Texte verändert zur besseren Verständlichkeit.</p>

        <p>
          Es wurden ein paar visuelle Veränderungen vorgenommen zur besseren
          Verständlichkeit.
        </p>
      </>
    ),
  },

  {
    key: "2025-05-15-tasks-zuweisung-benachrichtigung",
    date: "2025-05-15",
    title: "Tasks",
    body: () => (
      <p>
        Es gibt nun die Möglichkeit sich benachrichtigen zu lassen, wenn einem
        ein Task zugewiesen wird.
      </p>
    ),
  },

  {
    key: "2025-05-13-tasks-markdown",
    date: "2025-05-13",
    title: "Tasks",
    body: () => (
      <p>
        Die Beschreibung und der Belohnungstext unterstützen nun
        Markdown-Formatierung.
      </p>
    ),
  },

  {
    key: "2025-05-12-tasks-details",
    date: "2025-05-12",
    title: "Tasks",
    body: () => (
      <>
        <p>
          Die Details zu einem Task sind nun auf einer separaten Seiten zu
          finden.
        </p>

        <p>
          Beschreibung und Freitext-Belohnung können nun 2048 Zeichen lang sein.
        </p>
      </>
    ),
  },

  {
    key: "2025-05-02-neu-silc-gehälter",
    date: "2025-05-02",
    title: "Neu: SILC-Gehälter",
    body: () => (
      <p>
        Über SILC-Gehälter können Rollen einen monatlichen SILC-Betrag
        überwiesen werden.
      </p>
    ),
  },

  {
    key: "2025-04-23-tasks-sichtbarkeit-auf-rolle-einschränken",
    date: "2025-04-23",
    title: "Tasks",
    body: () => (
      <>
        <p>Weiterentwicklung des neuen Tasks System</p>

        <p>
          <strong>Sichtbarkeit auf Rollen einschränken</strong>
        </p>

        <p>
          Tasks können nun optional auf Rolle eingeschränkt werden. Hierbei gibt
          es die Möglichkeit den Task vollständig zu verstecken oder auf
          &ldquo;nicht-annehmbar&rdquo; zu schalten.
        </p>
      </>
    ),
  },

  {
    key: "2025-04-23-eventbelohnung",
    date: "2025-04-23",
    title: "Eventbelohnung",
    body: () => (
      <p>
        Im Teilnehmer-Reiter der Events gibt es nun eine Möglichkeit eine
        SILC-Transaktion zu starten, welche alle Teilnehmer vorausgefüllt hat.
        Vor dem Speichern können die Empfänger noch bearbeitet werden.
      </p>
    ),
  },

  {
    key: "2025-04-21-tasks-geschlossene-tasks",
    date: "2025-04-21",
    title: "Tasks",
    body: () => (
      <>
        <p>Weiterentwicklung des neuen Tasks System</p>
        <p>
          <strong>Geschlossene Tasks</strong>
        </p>

        <p>
          Es gibt nun eine separate Ansicht für geschlossene Tasks (erfüllt,
          abgebrochen, abgelaufen).
        </p>

        <p>
          <strong>Tasks verwalten</strong>
        </p>

        <p>
          Citizen mit der Berechtigung <em>Tasks verwalten</em> sehen nun auch
          personalisierte Tasks, welche nicht von ihnen selber erstellt wurden.
        </p>
      </>
    ),
  },

  {
    key: "2025-04-14-tasks-wiederholungen",
    date: "2025-04-14",
    title: "Tasks",
    body: () => (
      <>
        <p>Weiterentwicklung des neuen Tasks System</p>

        <p>
          <strong>Wiederholungen</strong>
        </p>

        <p>
          Für Tasks kann nun eingestellt werden wie häufig dieser wiederholt
          werden kann. Wenn ein wiederholbarer Task abgeschlossen, wird dieser
          automatisiert dupliziert und neu erstellt.
        </p>
      </>
    ),
  },

  {
    key: "2025-04-13-tasks-gruppen-tasks",
    date: "2025-04-13",
    title: "Tasks",
    body: () => (
      <>
        <p>Weiterentwicklung des neuen Tasks System</p>

        <p>
          <strong>Gruppen-Tasks</strong>
        </p>

        <p>
          Erstelle eine Aufgabe und weise sie einer Gruppen von Citizen zu.
          Diese Aufgabe kann nur von ihnen gesehen und erfüllt werden.
        </p>

        <p>
          <strong>Task erstellen</strong>
        </p>

        <p>
          Bei Mehrfachauswahl von Citizen kann nun eine Rolle ausgewählt werden
          um direkt alle Citizen mit dieser Rolle hinzuzufügen.
        </p>

        <p>
          <strong>Task abschließen</strong>
        </p>

        <p>
          Im Bestätigungsdialog wird nun zusätzlich abgefragt wer den Task
          erfüllt hat.
        </p>
      </>
    ),
  },

  {
    key: "2025-04-12-tasks-erste-version",
    date: "2025-04-12",
    title: "Tasks",
    body: () => (
      <>
        <p>Die erste Version des Tasks System wurde implementiert.</p>

        <p>
          <strong>Öffentliche Tasks</strong>
        </p>

        <p>
          Erstelle eine Aufgabe, die von jemand beliebigen angenommen und
          erfüllt werden kann.
        </p>

        <p>
          <strong>Personalisierte Tasks</strong>
        </p>

        <p>
          Erstelle eine Aufgabe und weise sie einem bestimmten Citizen zu. Diese
          Aufgabe kann nur von ihm gesehen und erfüllt werden.
        </p>

        <p>
          <strong>Belohnungen</strong>
        </p>

        <p>
          Wähle zwischen SILC vom eigenen Konto, generieren von neuen SILC oder
          einem Freitext als Belohnung für das Erfüllen eines Tasks.
        </p>

        <p>
          <em>
            Das System befindet sich aktuell im Test und wird die nächsten Tage
            weiter ausgerollt.
          </em>
        </p>
      </>
    ),
  },

  {
    key: "2025-04-08-bug-keinem-posten-zugeordnet",
    date: "2025-04-08",
    title: "Bug: Keinem Posten zugeordnet",
    body: () => (
      <p>
        Es wurde ein Fehler behoben, welcher dazu führte, dass die Citizen in
        der Liste &ldquo;Keinem Posten zugeordnet&rdquo; nicht korrekt berechnet
        wurden.
      </p>
    ),
  },

  {
    key: "2025-04-05-filter",
    date: "2025-04-05",
    title: "Filter",
    body: () => (
      <p>
        In den Filtern für die Spynet-Listen muss nun nicht mehr auf Speichern
        geklickt werden.
      </p>
    ),
  },

  {
    key: "2025-03-29-suche-nach-handle-anstatt-internal-id",
    date: "2025-03-29",
    title: "Suche nach Handle anstatt Internal ID",
    body: () => (
      <>
        <p>
          In diversen Formularen (Strafpunkteeintrag, Eventmanager, SILC
          Transaktion) kann nun ein Citizen durch seinen Handle gesucht und
          hinzugefügt werden anstatt der Internal ID.
        </p>

        <Image
          quality={100}
          src={image20250329CitizenHandle}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-03-29-bug-korrekte-einordnung-je-nach-voraussetzung",
    date: "2025-03-29",
    title: "Bug: Korrekte Einordnung je nach Voraussetzung",
    body: () => (
      <p>
        Es wurde ein Fehler in der Eventaufstellung behoben, welcher dazu
        führte, dass Citizen nicht korrekt eingeordnet wurden je nachdem, ob die
        Voraussetzungen (erforderliches Schiff) eines Posten erfüllt wurden oder
        nicht.
      </p>
    ),
  },

  {
    key: "2025-03-23-dragndrop-in-der-eventaufstellung",
    date: "2025-03-23",
    title: "Drag'n'Drop in der Eventaufstellung",
    body: () => (
      <>
        <p>
          Die Posten in der Eventaufstellung können nun per
          Drag&apos;n&apos;Drop verschoben werden.
        </p>

        <p>
          Dazu einfach an den 6 Punkten an der linken Seite ziehen und den
          Posten dahin verschieben, wo er hin soll. Ablageflächen werden grün
          hervorgehoben. Wird ein Posten an die obere bzw. untere Kante eines
          anderen Posten gezogen, wird dieser davor bzw. danach eingeordnet.
          Wird ein Posten auf die untere rechte Ecke eines anderen Postens
          gezogen, wird dieser Posten als Kindposten eingeordnet.
        </p>

        <Image
          quality={100}
          src={image20250323LineupDragNDrop}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-03-22-alternativen-zu-erforderlichen-schiffen",
    date: "2025-03-22",
    title: "Alternativen zu erforderlichen Schiffen",
    body: () => (
      <>
        <p>
          In der Eventaufstellung können nun mehrere Schiffe als erforderliches
          Schiff hinzugefügt werden.
        </p>

        <Image
          quality={100}
          src={image20250322RequiredVariantsTooltip}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <Image
          quality={100}
          src={image20250322RequiredVariantsEdit}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-03-16-organisationen-von-citizen",
    date: "2025-03-16",
    title: "Organisationen von Citizen",
    body: () => (
      <p>
        Für Citizen im Spynet gibt es nun den
        &ldquo;Organisationen&rdquo;-Reiter. Dieser listet alle aktuellen
        Organisationen sowie den Verlauf von Ein- und Austritten (sofern
        eingetragen).
      </p>
    ),
  },

  {
    key: "2025-03-15-zusätzliche-eventmanager",
    date: "2025-03-15",
    title: "Zusätzliche Eventmanager",
    body: () => (
      <>
        <p>
          Events können nun zusätzliche Manager hinzugefügt werden. Diese haben
          die gleichen Berechtigungen wie die Organisatoren.
        </p>

        <Image
          quality={100}
          src={image20250315EventManagers}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-03-15-eventaufstellung-de-aktivieren",
    date: "2025-03-15",
    title: "Eventaufstellung de-/aktivieren",
    body: () => (
      <>
        <p>
          Die Aufstellung eines Events kann nun de-/aktiviert werden. Solang die
          Aufstellung deaktiviert ist, kann sie nur von einem Eventorganisator
          eingesehen und bearbeitet werden.
        </p>

        <Image
          quality={100}
          src={image20250315LineupEnabled}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <p>Bei neuen Events ist die Aufstellung initial deaktiviert.</p>
      </>
    ),
  },

  {
    key: "2025-03-15-laufende-events",
    date: "2025-03-15",
    title: "Laufende Events",
    body: () => (
      <>
        <p>Aktuell laufende Events werden nun direkt im Dashboard gezeigt.</p>

        <p>
          Hierzu muss das Event ein eingetragenes Enddatum haben. FYI: Dies ist
          in Discord optional.
        </p>
      </>
    ),
  },

  {
    key: "2025-03-15-super-hornets",
    date: "2025-03-15",
    title: "Super Hornets",
    body: () => (
      <p>
        Die beiden Varianten der F7C-M Super Hornet Mk II wurden zu einer
        zusammengeführt.
      </p>
    ),
  },

  {
    key: "2025-03-09-gruppen-in-der-eventaufstellung",
    date: "2025-03-09",
    title: "Gruppen in der Eventaufstellung",
    body: () => (
      <>
        <p>Die Eventaufstellung kann nun in Gruppen unterteilt werden.</p>

        <Image
          quality={100}
          src={image20250309LineupGroups}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <p>
          Es kann bis zu vier Ebenen geben. In jeder Ebene ist eine beliebige
          Kombination aus weiteren Gruppen und Posten möglich.
        </p>

        <p>Zum Anlegen einer Kindgruppe, auf folgendes Plus-Icon klicken:</p>

        <Image
          quality={100}
          src={image20250309LineupCreateChild}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-03-08-rework-discord-synchronisation",
    date: "2025-03-08",
    title: "Rework: Discord-Synchronisation",
    body: () => (
      <p>
        Die Synchronisation mit Discord wurde erneut überarbeitet. Dies sollte
        die Synchronisation zuverlässiger machen.
      </p>
    ),
  },

  {
    key: "2025-03-08-fix-event-history",
    date: "2025-03-08",
    title: "Fix: Event-History",
    body: () => (
      <p>Die Seite mit vergangenen Events wird nun wieder korrekt angezeigt.</p>
    ),
  },

  {
    key: "2025-03-07-zusagen-im-dashboard",
    date: "2025-03-07",
    title: "Zusagen im Dashboard",
    body: () => (
      <p>
        Bei den Events auf dem Dashboard wird nun angezeigt, ob man selber
        zugesagt hat.
      </p>
    ),
  },

  {
    key: "2025-03-07-eigene-silc-transaktionen",
    date: "2025-03-07",
    title: "Eigene SILC-Transaktionen",
    body: () => (
      <p>
        Ein Klick auf die Kachel mit dem eigenen SILC-Kontostand im Dashboard
        führt nun zu einer Übersicht mit den SILC-Transaktionen zum eigenen
        SILC-Konto.
      </p>
    ),
  },

  {
    key: "2025-03-07-eigene-strafpunkte",
    date: "2025-03-07",
    title: "Eigene Strafpunkte",
    body: () => (
      <p>
        Ein Klick auf die Kachel mit den eigenen aktiven Strafpunkten im
        Dashboard führt nun zu einer Übersicht mit den eigenen Strafpunkten
        inkl. Begründung.
      </p>
    ),
  },

  {
    key: "2025-03-07-eventaufstellung-bearbeitung",
    date: "2025-03-07",
    title: "Eventaufstellung",
    body: () => (
      <p>
        Der Name eines Posten kann nun direkt bearbeitet werden ohne das Modal
        öffnen zu müssen. Dazu einfach auf den Namen klicken und im Anschluss
        mit Enter bestätigen.
      </p>
    ),
  },

  {
    key: "2025-03-07-silc-transaktion-erstellen",
    date: "2025-03-07",
    title: "SILC-Transaktion erstellen",
    body: () => (
      <p>
        Das Eingabefeld für die Internal IDs ist nun ein Mehrzeilen-Feld um die
        Eingabe zu vereinfachen. Pro Zeile muss eine Internal ID angegeben
        werden.
      </p>
    ),
  },

  {
    key: "2025-03-07-fix-eventaufstellung",
    date: "2025-03-07",
    title: "Fix: Eventaufstellung",
    body: () => (
      <p>
        Es wurde ein Fehler behoben, wenn ein Eventteilnehmer absagt, allerdings
        einem Posten zugeteilt war.
      </p>
    ),
  },

  {
    key: "2025-03-07-fix-discord-synchronisation",
    date: "2025-03-07",
    title: "Fix: Discord-Synchronisation",
    body: () => (
      <p>
        Es wurden Fehler in der Synchronisation mit Discord behoben. Teilnehmer
        an einem Event sollten nun zuverlässiger synchronisiert werden.
      </p>
    ),
  },

  {
    key: "2025-03-05-eventaufstellung-button",
    date: "2025-03-05",
    title: "Eventaufstellung",
    body: () => (
      <p>Es gibt nun einen Button um alle Positionen auf- oder zuzuklappen.</p>
    ),
  },

  {
    key: "2025-03-05-silc-übersicht",
    date: "2025-03-05",
    title: "SILC",
    body: () => (
      <p>
        In der SILC-Übersicht gibt es nun eine neue Spalte, welche die gesamt
        verdienten SILC pro Citizen anzeigt.
      </p>
    ),
  },

  {
    key: "2025-03-05-visuelle-optimierungen",
    date: "2025-03-05",
    title: "Visuelle Optimierungen",
    body: () => <p>Es wurden diverse visuelle Optimierungen vorgenommen.</p>,
  },

  {
    key: "2025-03-03-silc-auec-umrechnungskurs",
    date: "2025-03-03",
    title: "SILC: aUEC Umrechnungskurs",
    body: () => (
      <>
        <p>
          Im SILC-System kann nun ein Umrechnungskurs zu aUEC konfiguriert
          werden. Hierzu gibt es auch eine neue Berechtigung.
        </p>

        <p>
          Zudem wird in der Übersicht nun angezeigt wie viel SILC im Umlauf ist.
        </p>

        <Image
          quality={100}
          src={image20250303SilcAuecConversionRate}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <Image
          quality={100}
          src={image20250303SilcStatistics}
          alt=""
          loading="lazy"
          className="self-center"
        />
      </>
    ),
  },

  {
    key: "2025-03-03-bug-silc-kontostände",
    date: "2025-03-03",
    title: "Bug: SILC-Kontostände",
    body: () => (
      <p>
        Es wurde ein Fehler behoben, welcher verhinderte, dass der
        SILC-Kontostand eines Citizen korrekt berechnet wird, wenn alle seine
        Transaktionen gelöscht wurden.
      </p>
    ),
  },

  {
    key: "2025-03-02-silc-mvp",
    date: "2025-03-02",
    title: "SILC MVP",
    body: () => (
      <>
        <p>Die erste Version des SILC-System ist nun implementiert.</p>

        <p>
          Citizen mit entsprechenden Berechtigungen können SILC an andere
          Citizen verteilen und die aktuellen Kontostände einsehen.
        </p>

        <p>
          Hierzu gibt es zwei neue Seiten: Übersicht und Transaktionen. In der
          Übersicht werden die aktuellen Kontostände aller Citizen aufgelistet.
          In den Transaktionen können chronologisch die einzelnen Transaktionen
          eingesehen werden.
        </p>

        <Image
          quality={100}
          src={image20250302SilcOverview}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <Image
          quality={100}
          src={image20250302SilcTransactions}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <p>In der Profilkachel können Citizen ihre eigenen SILC einsehen.</p>

        <Image
          quality={100}
          src={image20250302SilcDashboard}
          alt=""
          loading="lazy"
          className="self-center"
        />

        <p>
          Die Berechtigungen, um auf die einzelnen Funktionen zugreifen zu
          können, werden zeitnahe verteilt.
        </p>
      </>
    ),
  },

  {
    key: "2025-02-28-eigene-strafpunkte-im-dashboard",
    date: "2025-02-28",
    title: "Eigene Strafpunkte im Dashboard",
    body: () => (
      <>
        <p>
          Im Profil auf dem Dashboard können nun die eigenen aktiven Strafpunkte
          eingesehen werden.
        </p>

        <p>
          Diese Funktion muss von der Leitung freigeschaltet werden, bevor sie
          sichtbar wird.
        </p>

        <Image
          quality={100}
          src={image20250228PenaltyPoints}
          alt=""
          loading="lazy"
        />
      </>
    ),
  },

  {
    key: "2025-02-28-fix-eventaufstellung-dropdown",
    date: "2025-02-28",
    title: "Fix: Eventaufstellung",
    body: () => (
      <p>
        Wenn ein Posten kein Schiff vorraussetzt, werden die Teilnehmer nun auch
        hier korrekt im Dropdown einsortiert.
      </p>
    ),
  },

  {
    key: "2025-02-27-eventaufstellung-dropdown",
    date: "2025-02-27",
    title: "Eventaufstellung",
    body: () => (
      <>
        <p>
          Teilnehmer im Dropdown zur Zuordnung von Teilnehmern zu einem Posten,
          werden nun in den richtigen Abschnitt sortiert - je nachdem, ob sie
          die Anforderungen erfüllen oder nicht.
        </p>

        <Image
          quality={100}
          src={image20250227Dropdown}
          alt=""
          loading="lazy"
        />
      </>
    ),
  },

  {
    key: "2025-02-27-fix-discord-verlinkung",
    date: "2025-02-27",
    title: "Fix: Discord-Verlinkung",
    body: () => (
      <p>
        Die Discord-Verlinkungen von Events im Dashboard führen nun wieder
        korrekt zu Discord.
      </p>
    ),
  },

  {
    key: "2025-02-25-abgesagte-events",
    date: "2025-02-25",
    title: "Abgesagte Events",
    body: () => (
      <p>
        Wenn in Discord ein Event abgesagt wird, wird dieses nun auch ins SAM
        synchronisiert. Hier gibt es nun die Möglichkeit sich vom SAM eine
        Benachrichtigung zuschicken zu lassen. Hierzu einfach auf die rote
        Glocke im Dashboard klicken.
      </p>
    ),
  },

  {
    key: "2025-02-25-vergangene-events",
    date: "2025-02-25",
    title: "Vergangene Events",
    body: () => (
      <>
        <p>
          Unter der Auflistung der anstehenden Events im Dashboard gibt es nun
          einen Link um sich vergangene Events anzeigen zu lassen.
        </p>

        <p>
          Diese Events sind nur bearbeitebar (z.B. Aufstellung) während diese
          noch nicht beendet sind. Hat das Event keine Endzeit eingetragen,
          gilt: Startzeit + vier Stunden.
        </p>

        <p>
          Es werden nur Events seit gestern angezeigt. Ältere Events werden
          nicht nachgetragen.
        </p>
      </>
    ),
  },

  {
    key: "2025-02-25-changelog",
    date: "2025-02-25",
    title: "Changelog",
    body: () => (
      <p>
        Es wurde ein Changelog implementiert. Hier werden zukünftig alle großen
        und kleinen Änderungen vom SAM kommuniziert.
      </p>
    ),
  },

  {
    key: "2025-02-24-discord-synchronisierung",
    date: "2025-02-24",
    title: "Discord-Synchronisierung",
    body: () => (
      <p>
        Die Synchronisation der Events zwischen Discord und SAM wurde
        überarbeitet. Die Synchronisierung läuft alle zwei Minuten. Es werden
        nur noch Teilnehmer angezeigt, welche einen Spynet-Eintrag haben. Die
        Überarbeitung behebt Probleme mit dem Rate Limiting von Discord. Zudem
        ist sie für zukünftige Features notwendig.
      </p>
    ),
  },

  {
    key: "2025-02-24-dokumente",
    date: "2025-02-24",
    title: "Dokumente",
    body: () => (
      <p>
        Das Akkordion auf der Dokumente-Seite wurde entfernt. Damit sind nun
        alle Dokumente direkt sichtbar.
      </p>
    ),
  },

  {
    key: "2025-02-24-bilder-lazy",
    date: "2025-02-24",
    title: "Bilder",
    body: () => (
      <p>
        Alle Bilder werden nun lazy geladen. Dies verbessert die Ladezeit der
        Seite.
      </p>
    ),
  },

  {
    key: "2025-02-24-fix-hersteller-logos",
    date: "2025-02-24",
    title: "Fix: Hersteller-Logos",
    body: () => (
      <p>
        Es wurde ein Fehler mit den Hersteller-Logos behoben. Diese werden nun
        wieder angezeigt.
      </p>
    ),
  },

  {
    key: "2025-02-23-neue-dokumente",
    date: "2025-02-23",
    title: "Neue Dokumente",
    body: () => (
      <p>
        Es wurden neue Dokumente für diverse Zertifikate hinzugefügt. Diese
        werden freigeschaltet, sobald diese vollständig sind.
      </p>
    ),
  },

  {
    key: "2025-02-23-bilder-caching",
    date: "2025-02-23",
    title: "Bilder",
    body: () => (
      <p>
        Das Caching von Bildern wurde angepasst. Dies verbessert die Ladezeit
        der Seite.
      </p>
    ),
  },

  {
    key: "2025-02-23-styling",
    date: "2025-02-23",
    title: "Styling",
    body: () => <p>Es wurden kleinere visuelle Optimierungen vorgenommen.</p>,
  },

  {
    key: "2025-02-22-teilnehmer-ohne-posten",
    date: "2025-02-22",
    title: "Teilnehmer ohne Posten",
    body: () => (
      <p>
        Die Eventaufstellung hat nun einen neuen Abschnitt, welche Teilnehmer
        auflistet, die noch keinem Posten zugeordnet sind. Diese Liste ist
        alphabetisch sortiert.
      </p>
    ),
  },

  {
    key: "2025-02-22-dashboard-events",
    date: "2025-02-22",
    title: "Dashboard-Events",
    body: () => (
      <p>
        Die Events auf dem Dashboard haben nun einen Link, welcher direkt zur
        Aufstellung führt. Dazu wurden kleinere visuelle Optimierungen
        vorgenommen.
      </p>
    ),
  },

  {
    key: "2025-02-22-bilder-svg",
    date: "2025-02-22",
    title: "Bilder",
    body: () => (
      <p>
        Die Einbindung von SVG-Bildern wurde überarbeitet. Dies verbessert die
        Ladezeit der Seite.
      </p>
    ),
  },

  {
    key: "2025-02-22-noreferrer",
    date: "2025-02-22",
    title: "noreferrer",
    body: () => (
      <p>
        Alle externen Links haben nun das Attribut{" "}
        <code>rel=&quot;noreferrer&quot;</code>. Dies verbessert den Datenschutz
        der Seite.
      </p>
    ),
  },

  {
    key: "2025-02-20-eventaufstellung-dropdown-alle",
    date: "2025-02-20",
    title: "Eventaufstellung",
    body: () => (
      <>
        <p>
          In dem Dropdown zur Zuordnung von Teilnehmer zu einem Posten werden
          nun alle Eventteilnehmer aufgelistet.
        </p>

        <p>
          Der Hinweis, dass der Teilnehmer nicht alle Anforderungen erfüllt,
          wird nun als Tooltip anstatt einem Modal dargestellt. Dies verbessert
          die Usability der Seite.
        </p>
      </>
    ),
  },

  {
    key: "2025-02-19-eventaufstellung-hinweise",
    date: "2025-02-19",
    title: "Eventaufstellung",
    body: () => (
      <>
        <p>
          Es wird nun ein Hinweis angezeigt, wenn der Teilnehmer nicht alle
          Anforderungen erfüllt.
        </p>

        <p>
          Es wurden diverse Tooltips hinzugefügt, welche das Anlegen von Posten
          erklären.
        </p>

        <p>
          Wenn ein Posten aufgeklappt wurde, wird dieses nun für den aktuellen
          Browser gespeichert.
        </p>

        <p>
          Beim Anlegen eines Postens gibt es nun einen Button &quot;Speichern
          und weiteren Posten erstellen&quot;. Dies erleichtert das Anlegen von
          vielen Posten.
        </p>
      </>
    ),
  },

  {
    key: "2025-02-18-eventaufstellung",
    date: "2025-02-18",
    title: "Eventaufstellung",
    body: () => (
      <>
        <p>
          Einem Event kann nun eine Aufstellung hinzugefügt werden. Die
          Aufstellung besteht aus Posten und Teilnehmern. Ein Teilnehmer kann
          sich für mehrere Posten bewerben. Vor Eventbeginn ordnet der
          Organisator die Teilnehmer den Posten zu.
        </p>

        <p>
          Die Aufstellung kann vom Eventorganisator (Discord) und Rängen mit der
          jeweiligen Berechtigung bearbeitet werden.
        </p>

        <p>
          Zukünftig können an die Posten Bedingungen (Schiff, Rang) geknüpft
          werden.
        </p>
      </>
    ),
  },

  {
    key: "2025-02-16-strafpunktesystem",
    date: "2025-02-16",
    title: "Strafpunktesystem",
    body: () => (
      <>
        <p>
          Die erste Version des Strafpunktesystems wurde implementiert. Benutzer
          mit entsprechender Berechtigung können Strafpunkte vergeben und haben
          eine Übersicht über alle aktiven Strafpunkte.
        </p>

        <p>
          Einem Strafpunkteeintrag kann eine Begründung und ein Ablaufdatum
          gegeben werden.
        </p>

        <p>
          Zukünftig sollen Benutzer ihre eigenen Strafpunkte einsehen können.
        </p>
      </>
    ),
  },

  {
    key: "2025-02-16-prefers-reduced-motion",
    date: "2025-02-16",
    title: "prefers-reduced-motion",
    body: () => (
      <p>
        Die flackernden Überschriften werden nun deaktiviert, wenn der Browser
        die prefers-reduced-motion-Einstellung aktiviert hat.
      </p>
    ),
  },

  {
    key: "2025-02-16-eventstandort",
    date: "2025-02-16",
    title: "Eventstandort",
    body: () => (
      <p>
        In den Eventdetails wird nun der eingetragene Standort aus Discord
        angezeigt.
      </p>
    ),
  },

  {
    key: "2025-02-16-flotte",
    date: "2025-02-16",
    title: "Flotte",
    body: () => (
      <p>
        Unter der Überschrift wird nun angezeigt wie viele Benutzer mind. ein
        Schiff eingetragen haben.
      </p>
    ),
  },
];
