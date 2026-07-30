import { Link } from "@/modules/common/components/Link";
import { RichText } from "@/modules/common/components/RichText";
import { Footer } from "@/modules/shell/components/Footer";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

export default function Page() {
  return (
    <div className="min-h-dvh background-primary">
      <div className="p-2 pt-4 lg:p-8">
        <main className="flex items-center flex-col">
          <h1 className="text-xl font-bold">Datenschutzerklärung</h1>

          <RichText className="mt-4 w-full max-w-4xl p-4 lg:p-8 rounded-primary bg-neutral-800/50 ">
            <h2>1. Datenschutz auf einen Blick</h2>

            <h3>Allgemeine Hinweise</h3>

            <p>
              Die folgenden Hinweise geben einen Überblick darüber, was mit
              Ihren personenbezogenen Daten passiert, wenn Sie diese Website
              besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
              persönlich identifiziert werden können. Ausführliche Informationen
              zum Thema Datenschutz entnehmen Sie unserer unter diesem Text
              aufgeführten Datenschutzerklärung.
            </p>

            <h3>Datenerfassung auf dieser Website</h3>

            <p>
              Wer ist verantwortlich für die Datenerfassung auf dieser Website?
            </p>

            <p>
              Die Datenverarbeitung auf dieser Website erfolgt durch den
              Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt
              „Hinweis zur Verantwortlichen Stelle“ in dieser
              Datenschutzerklärung entnehmen.
            </p>

            <h3>Wie erfassen und nutzen wir Ihre Daten?</h3>

            <p>
              Ihre Daten werden überwiegend dadurch erhoben, dass Sie uns diese
              mitteilen. Welche Daten Sie so preisgeben, bestimmen demnach Sie
              selbst. Andere Daten werden automatisch oder nach Ihrer
              Einwilligung beim Besuch der Website durch unsere IT-Systeme
              erfasst. Das sind vor allem technische Daten wie z. B. die Uhrzeit
              eines Logins oder Login-Versuchs oder die IP-Adressen, welche
              versuchen, sich Zugriff auf unsere interne Website zu verschaffen.
              Die Erfassung solcher Daten erfolgt automatisch, sobald Sie diese
              Website betreten oder sich einloggen.
            </p>

            <p>
              Ein Teil der Daten wird erhoben, um eine fehlerfreie
              Bereitstellung der Website zu gewährleisten. Andere Daten können
              zur Analyse Ihres Nutzerverhaltens verwendet werden. Alle
              erhobenen Daten dienen einzig der Funktionellen Umsetzung der
              Platform und der Moderation der Nutzer. Über die bei der
              Registrierung angegebene E-Mail Adresse werden lediglich die
              Bestätigung des Nutzers, eine eventuell erforderliche Passwort
              Administration, wie das Zurücksetzen oder Ändern des Passwortes
              oder Updates der Datenschutzerklärung abgewickelt. Eine
              kommerzielle Nutzung ihrer Daten erfolgt in keinster Weise.
              Abseits der beschriebenen Vorgänge werden wir Sie nicht über Ihre
              E-Mail kontaktieren oder diese anderweitig verwenden oder
              weitergeben.
            </p>

            <p>
              Da kein kommerzielles Interesse an Ihren Daten besteht, können Sie
              im Allgemeinen davon ausgehen, dass alle erhobenen Daten lediglich
              der Verwaltung der Vorgänge im Computerspiel “Star Citizen”
              dienen. Daten, die über diesen Zweck hinausgehen, werden nicht
              gespeichert oder nur von Ihnen selbst auf unserer Website zur
              Verfügung gestellt. Die Daten des Spieles “Star Citizen” selbst
              werden im europäischen Raum verwaltet von: Roberts Space
              Industries International Limited, Manchester Goods Yard, 6 Goods
              Yard Street, Manchester M3 3BG, United Kingdom. Im Folgenden nur
              genannt “Star Citizen”. Zur Absicherung behalten wir uns jedoch
              unser Recht vor, auch weitere Daten zu speichern, wenn diese in
              unserem berechtigten Interesse liegen, speziell wenn es sich um
              die in der DSGVO, Art.6 Abs.1 a,c und f genannten Fälle handelt.
            </p>

            <p>
              Um unseren moderativen Verpflichtungen nachzukommen, besteht vor
              allem bei der Sperrung eines Nutzers die Notwendigkeit, die für
              den Login genutzten Daten zu speichern. Hierzu zählen gesperrte
              E-Mail Konten, genutzte Discord ID’s, Teamspeak ID’s, Star Citizen
              Handle’s (Bezeichnung der Nutzernamen im Computerspiel “Star
              Citizen”) sowie die Star Citizen Spectrum ID. Diese sind von dem
              berechtigten Interesse geprägt, die Umgehung einer von uns
              ausgesprochenen Benutzersperre zu verhindern.
            </p>

            <p>
              Ähnlich wie in sozialen Medien, können auch unsere Nutzer Daten
              erheben, in welchen eventuell personenbezogene Daten anderer
              Nutzer enthalten sein können. Daher werden alle Daten auf unserer
              Website von Moderatoren auf den Personenbezug geprüft und nur
              freigegeben, wenn dieser nicht gegeben ist. Finden sich hier
              personenbezogene, oder gar speziell schützenswerte Daten nach
              Artikel 9 DSGVO, werden diese unverzüglich gelöscht. Auch können
              durch Nutzer erhobene Daten nur eingesehen werden, sobald diese
              durch Moderatoren freigegeben wurden. Die so durch Moderatoren
              freigegebenen Daten erhalten demnach keine kritischen
              Informationen. An dieser Stelle möchten wir die Nutzer unserer
              Website daran erinnern, dass aufgrund der sehr weitreichenden
              Auslegung der DSGVO auch bei der Erhebung von Daten schon
              Pflichten entstehen können. Seien Sie sich demnach bitte auch bei
              der Übersendung von Daten, gleich welcher Form, auch Ihren
              Pflichten als Nutzer bewusst. Unaufgefordert übersendete Daten,
              die nicht den Zwecken nach DSGVO Art.6 Abs.1 a,c und f dienen,
              wollen wir nicht erhalten und werden diese löschen.
            </p>

            <p>
              Dem Nutzer zugeordnet sind zudem Daten, wie intern vergebene
              Ränge, Aktivitätspunkte oder Notizen zum Abschneiden bei der
              Teilnahme an Events oder ähnlichen dem Spiel “Star Citizen”
              zugeordneten Vorgängen. Diese werden entweder durch aktive
              Teilnahme erhoben oder durch das Mitwirkenden des Nutzers auf
              unserer Website erfasst.
            </p>

            <p>
              Weitere Daten, welche durch Nutzer selbst erhoben werden können,
              sind Beschwerden über andere Nutzer. Diese sind auch nur für die
              Einsicht durch Moderatoren freigegeben und ermöglichen uns, unsere
              moderativen Pflichten wahrzunehmen, falls sich Mitglieder nicht an
              unsere Regeln der Kommunikation halten. Hierfür führen wir ein
              Strafpunktesystem, in welches nur die Moderatoren der Website
              Einsicht haben. Bei wiederholtem Fehlverhalten, vor allem aus
              denselben Gründen, folgt die Sperrung des Nutzers. Sollte eine
              Löschung dieser Daten erforderlich sein, so kann der Grund für die
              Vergabe des Strafpuktes folglich nicht mehr nachvollzogen werden.
              Daher würde eine Löschung der Begründung zur unwiederrufbaren
              Sperrung des Nutzers führen.
            </p>

            <p>
              Im Falle einer Moderation, wie beispielsweise der Sperrung eines
              Accounts, werden zudem die für die Moderation notwendigen Daten
              wie der Grund für den Ausschluss vermerkt. Zugriff auf diese Art
              der Daten haben nur die Moderatoren der Website. Die Daten hierfür
              werden manuell erhoben. Sollte der Grund des Ausschlusses laut
              Art. 9 der DSGVO Informationen beinhalten, welche in besonderem
              Umfang schützenswert sind, so wird gar kein Grund vermerkt. Jedoch
              kann eine solche Sperre ohne Begründung, aufgrund der nicht mehr
              möglichen Rückverfolgbarkeit, nicht wieder rückgängig gemacht
              werden. Der Nutzer bleibt daher unwiderruflich gesperrt.{" "}
            </p>

            <h3>Welche Rechte haben Sie bezüglich Ihrer Daten?</h3>

            <p>
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über
              Herkunft, Empfänger und Zweck Ihrer gespeicherten
              personenbezogenen Daten zu erhalten. Sie haben außerdem das Recht,
              die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie
              eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie
              diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem
              haben Sie das Recht, unter bestimmten Umständen die Einschränkung
              der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des
              Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen
              Aufsichtsbehörde zu. Hierzu sowie zu weiteren Fragen zum Thema
              Datenschutz können Sie sich jederzeit an uns wenden.
            </p>

            <h2>2. Hosting</h2>

            <p>
              Wir hosten die Inhalte unserer Website bei folgendem
              Anbieter:{" "}
            </p>

            <h3>Hetzner</h3>

            <p>
              Anbieter ist die Hetzner Online GmbH, Industriestr. 25, 91710
              Gunzenhausen (nachfolgend Hetzner).
            </p>

            <p>
              Details entnehmen Sie der Datenschutzerklärung von Hetzner:{" "}
              <Link
                href="https://www.hetzner.com/de/rechtliches/datenschutz"
                rel="noreferrer"
              >
                https://www.hetzner.com/de/rechtliches/datenschutz
              </Link>
              .
            </p>

            <p>
              Die Verwendung von Hetzner erfolgt auf Grundlage von Art. 6 Abs. 1
              lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer
              möglichst zuverlässigen Darstellung unserer Website. Sofern eine
              entsprechende Einwilligung abgefragt wurde, erfolgt die
              Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a
              DSGVO und § 25 Abs. 1 TTDSG, soweit die Einwilligung die
              Speicherung von Cookies oder den Zugriff auf Informationen im
              Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des
              TTDSG umfasst. Die Einwilligung ist jederzeit widerrufbar.
            </p>

            <h3>Auftragsverarbeitung</h3>

            <p>
              Wir haben einen Vertrag über Auftragsverarbeitung (AVV) zur
              Nutzung des oben genannten Dienstes geschlossen. Hierbei handelt
              es sich um einen datenschutzrechtlich vorgeschriebenen Vertrag,
              der gewährleistet, dass dieser die personenbezogenen Daten unserer
              Websitebesucher nur nach unseren Weisungen und unter Einhaltung
              der DSGVO verarbeitet.
            </p>

            <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>

            <h3>Datenschutz</h3>

            <p>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen
              Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten
              vertraulich und entsprechend den gesetzlichen
              Datenschutzvorschriften sowie dieser Datenschutzerklärung. Wenn
              Sie diese Website benutzen, werden verschiedene personenbezogene
              Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie
              persönlich identifiziert werden können. Die vorliegende
              Datenschutzerklärung erläutert, welche Daten wir erheben und wofür
              wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das
              geschieht. Wir weisen darauf hin, dass die Datenübertragung im
              Internet (z. B. bei der Kommunikation per E-Mail)
              Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten
              vor dem Zugriff durch Dritte ist nicht möglich.
            </p>

            <h3>Hinweis zur verantwortlichen Stelle</h3>

            <p>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser
              Website ist: Andreas Gerte, c/o COCENTER, Koppoldstr. 1, 86551
              Aichach, E-Mail:{" "}
              <Link
                href="mailto:info@sinister-incorporated.de"
                rel="noreferrer"
              >
                info@sinister-incorporated.de
              </Link>{" "}
              . Verantwortliche Stelle ist die natürliche oder juristische
              Person, die allein oder gemeinsam mit anderen über die Zwecke und
              Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen,
              E-Mail-Adressen o. Ä.) entscheidet.
            </p>

            <h3>Zweck der Speicherung</h3>

            <p>
              Der Zweck der Speicherung dient der Erfüllung der Moderation
              unserer Plattform nach den Rechten und Pflichten der DSGVO,
              insbesondere die in Art. 6 1 a,c & f DSGVO festgelegten
              Begründungen einer Speicherung.
            </p>

            <h3>Gespeicherte Daten</h3>

            <p>
              Persönliche Daten, welche eine direkte Identifizierung ohne
              weitere Daten ermöglichen, wie Vorname, Nachname, PLZ, Anschrift,
              Wohnort & Telefonnummer, erheben wir initial nicht. Sie selbst
              können jedoch Daten hinzufügen, wie beispielsweise den Wohnort auf
              unserer Mitgliederkarte. Hier können Sie sich anonym oder mit
              Ihrem Nickname auf der Karte unserer Mitglieder anzeigen lassen.
              Eine Löschung dieser Daten können Sie auch selbst jederzeit
              vornehmen.
            </p>

            <p>
              Für die schon zuvor beschriebene Verifizierung und Administration,
              benötigen wir zudem Ihre E-Mail-Adresse. Durch die Bestätigung der
              Anmeldung über diese, geben Sie Ihre Einwilligung nach Art. 6
              Abs.1 a DSGVO. Wenn Sie sich anmelden, wird die Einwilligung
              eindeutig und unmissverständlich angefragt. Die Einwilligung kann
              jederzeit widerrufen werden, führt aber zu einer Sperrung des
              Accounts, da wir Sie nach einer Löschung der E-Mail nicht mehr zu
              Datenschutzrelevanten Themen kontaktieren können.
            </p>

            <p>
              Zudem gespeichert werden IT-Nutzungsdaten (z.B. IP-Adresse,
              Geräte-ID, Logging-Daten, Uhrzeit, Datum, Dauer der Nutzung der
              Webseiten, Betriebssystem, Browser oder andere Geräte-Kennungen)
              welche der Auslieferung der Webseiten an das Endgerät des
              Besuchers, dem Einsatz von technischen Sicherheitsmaßnahmen zum
              Schutz vor unlauterer Nutzung der Webseiten, potentiell verbotenen
              oder illegalen Aktivitäten sowie dem Angebot von Supportfunktionen
              dienen.
            </p>

            <h3>Speicherdauer</h3>

            <p>
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere
              Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen
              Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt.
              Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine
              Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten
              gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für
              die Speicherung Ihrer personenbezogenen Daten haben.
            </p>

            <h3>
              Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung
              auf dieser Website
            </h3>

            <p>
              Sofern Sie in die Datenverarbeitung eingewilligt haben,
              verarbeiten wir Ihre personenbezogenen Daten auf Grundlage von
              Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9 Abs. 2 lit. a DSGVO, sofern
              besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO verarbeitet
              werden. Im Falle einer ausdrücklichen Einwilligung in die
              Übertragung personenbezogener Daten in Drittstaaten erfolgt die
              Datenverarbeitung außerdem auf Grundlage von Art. 49 Abs. 1 lit. a
              DSGVO. Sofern Sie in die Speicherung von Cookies oder in den
              Zugriff auf Informationen in Ihr Endgerät (z. B. via
              Device-Fingerprinting) eingewilligt haben, erfolgt die
              Datenverarbeitung zusätzlich auf Grundlage von § 25 Abs. 1 TTDSG.
              Die Einwilligung ist jederzeit widerrufbar. Sind Ihre Daten zur
              Vertragserfüllung oder zur Durchführung vorvertraglicher Maßnahmen
              erforderlich, verarbeiten wir Ihre Daten auf Grundlage des Art. 6
              Abs. 1 lit. b DSGVO. Des Weiteren verarbeiten wir Ihre Daten,
              sofern diese zur Erfüllung einer rechtlichen Verpflichtung
              erforderlich sind auf Grundlage von Art. 6 Abs. 1 lit. c DSGVO.
              Die Datenverarbeitung kann ferner auf Grundlage unseres
              berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO erfolgen.
              Über die jeweils im Einzelfall einschlägigen Rechtsgrundlagen wird
              in den folgenden Absätzen dieser Datenschutzerklärung informiert.
            </p>

            <h3>Empfänger von personenbezogenen Daten</h3>

            <p>
              Im Rahmen unserer Tätigkeit arbeiten wir mit verschiedenen
              externen Stellen zusammen. Dabei ist teilweise auch eine
              Übermittlung von personenbezogenen Daten an diese externen Stellen
              erforderlich. Wir geben personenbezogene Daten nur dann an externe
              Stellen weiter, wenn dies im Rahmen einer Vertragserfüllung
              erforderlich ist, wenn wir gesetzlich hierzu verpflichtet sind (z.
              B. Weitergabe von Daten an Steuerbehörden), wenn wir ein
              berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO an der
              Weitergabe haben oder wenn eine sonstige Rechtsgrundlage die
              Datenweitergabe erlaubt. Im Falle einer gemeinsamen Verarbeitung
              würde ein Vertrag über gemeinsame Verarbeitung geschlossen werden.
            </p>

            <h3>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>

            <p>
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen
              Einwilligung möglich. Sie können eine bereits erteilte
              Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum
              Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf
              unberührt.
            </p>

            <h3>
              Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen
              sowie gegen Direktwerbung (Art. 21 DSGVO)
            </h3>

            <p>
              WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E
              ODER F DSGVOERFOLGT, HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN,
              DIE SICH AUS IHRER BESONDEREN SITUATION ERGEBEN, GEGEN DIE
              VERARBEITUNG IHRER PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN;
              DIES GILT AUCH FÜR EIN AUF DIESE BESTIMMUNGEN GESTÜTZTES
              PROFILING. DIE JEWEILIGE RECHTSGRUNDLAGE, AUF DENEN EINE
              VERARBEITUNG BERUHT, ENTNEHMEN SIE DIESER DATENSCHUTZERKLÄRUNG.
              WENN SIE WIDERSPRUCH EINLEGEN, WERDEN WIR IHRE BETROFFENEN
              PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN, WIR
              KÖNNEN ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG
              NACHWEISEN, DIE IHRE INTERESSEN, RECHTE UND FREIHEITEN ÜBERWIEGEN
              ODER DIE VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER
              VERTEIDIGUNG VON RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1
              DSGVO). WERDEN IHRE PERSONENBEZOGENEN DATEN VERARBEITET, UM
              DIREKTWERBUNG ZU BETREIBEN, SO HABEN SIE DAS RECHT, JEDERZEIT
              WIDERSPRUCH GEGEN DIE VERARBEITUNG SIE BETREFFENDER
              PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG EINZULEGEN;
              DIES GILT AUCH FÜR DAS PROFILING, SOWEIT ES MIT SOLCHER
              DIREKTWERBUNG IN VERBINDUNG STEHT. WENN SIE WIDERSPRECHEN, WERDEN
              IHRE PERSONENBEZOGENEN DATEN ANSCHLIESSEND NICHT MEHR ZUM ZWECKE
              DER DIREKTWERBUNG VERWENDET (WIDERSPRUCH NACH ART. 21 ABS. 2
              DSGVO).
            </p>

            <h3>Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>

            <p>
              Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein
              Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem
              Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes
              oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht
              besteht unbeschadet anderweitiger verwaltungsrechtlicher oder
              gerichtlicher Rechtsbehelfe.
            </p>

            <h3>Recht auf Datenübertragbarkeit</h3>

            <p>
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer
              Einwilligung oder in Erfüllung eines Vertrags automatisiert
              verarbeiten, an sich oder an einen Dritten in einem gängigen,
              maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die
              direkte Übertragung der Daten an einen anderen Verantwortlichen
              verlangen, erfolgt dies nur, soweit es technisch machbar ist.
            </p>

            <h3>Auskunft, Berichtigung und Löschung</h3>

            <p>
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen
              jederzeit das Recht auf unentgeltliche Auskunft über Ihre
              gespeicherten personenbezogenen Daten, deren Herkunft und
              Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht
              auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu
              weiteren Fragen zum Thema personenbezogene Daten können Sie sich
              jederzeit an uns wenden.
            </p>

            <h3>Recht auf Einschränkung der Verarbeitung</h3>

            <p>
              Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen. Hierzu können Sie sich
              jederzeit an uns wenden. Das Recht auf Einschränkung der
              Verarbeitung besteht in folgenden Fällen:
            </p>

            <p>
              Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten
              personenbezogenen Daten bestreiten, benötigen wir in der Regel
              Zeit, um dies zu überprüfen. Für die Dauer der Prüfung haben Sie
              das Recht, die Einschränkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen.
            </p>

            <p>
              Wenn die Verarbeitung Ihrer personenbezogenen Daten unrechtmäßig
              geschah/geschieht, können Sie statt der Löschung die Einschränkung
              der Datenverarbeitung verlangen.
            </p>

            <p>
              Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie
              sie jedoch zur Ausübung, Verteidigung oder Geltendmachung von
              Rechtsansprüchen benötigen, haben Sie das Recht, statt der
              Löschung die Einschränkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen.
            </p>

            <p>
              Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt
              haben, muss eine Abwägung zwischen Ihren und unseren Interessen
              vorgenommen werden. Solange noch nicht feststeht, wessen
              Interessen überwiegen, haben Sie das Recht, die Einschränkung der
              Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Wenn Sie
              die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt
              haben, dürfen diese Daten – von ihrer Speicherung abgesehen – nur
              mit Ihrer Einwilligung oder zur Geltendmachung, Ausübung oder
              Verteidigung von Rechtsansprüchen oder zum Schutz der Rechte einer
              anderen natürlichen oder juristischen Person oder aus Gründen
              eines wichtigen öffentlichen Interesses der Europäischen Union
              oder eines Mitgliedstaats verarbeitet werden.
            </p>

            <h3>SSL- bzw. TLS-Verschlüsselung</h3>

            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der
              Übertragung vertraulicher Inhalte, wie zum Beispiel Bestellungen
              oder Anfragen, die Sie an uns als Seitenbetreiber senden, eine
              SSL- bzw. TLS Verschlüsselung. Eine verschlüsselte Verbindung
              erkennen Sie daran, dass die Adresszeile des Browsers von
              „http://“ auf „https://“ wechselt und an dem Schloss-Symbol in
              Ihrer Browserzeile. Wenn die SSL- bzw. TLS-Verschlüsselung
              aktiviert ist, können die Daten, die Sie an uns übermitteln, nicht
              von Dritten mitgelesen werden.
            </p>

            <h2>4. Datenerfassung auf dieser Website</h2>

            <h3>Cookies</h3>

            <p>
              Unsere Internetseiten verwenden so genannte „Cookies“. Cookies
              sind kleine Datenpakete und richten auf Ihrem Endgerät keinen
              Schaden an. Sie werden entweder vorübergehend für die Dauer einer
              Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf
              Ihrem Endgerät gespeichert. Session-Cookies werden nach Ende Ihres
              Besuchs automatisch gelöscht. Permanente Cookies bleiben auf Ihrem
              Endgerät gespeichert, bis Sie diese selbst löschen oder eine
              automatische Löschung durch Ihren Webbrowser erfolgt. Cookies
              können von uns (First-Party-Cookies) oder von Drittunternehmen
              stammen (sog. Third-PartyCookies). Third-Party-Cookies ermöglichen
              die Einbindung bestimmter Dienstleistungen von Drittunternehmen
              innerhalb von Webseiten (z. B. Cookies zur Abwicklung von
              Zahlungsdienstleistungen). Cookies haben verschiedene Funktionen.
              Zahlreiche Cookies sind technisch notwendig, da bestimmte
              Webseitenfunktionen ohne diese nicht funktionieren würden (z. B.
              die Warenkorbfunktion oder die Anzeige von Videos). Andere Cookies
              können zur Auswertung des Nutzerverhaltens oder zu Werbezwecken
              verwendet werden. Cookies, die zur Durchführung des elektronischen
              Kommunikationsvorgangs, zur Bereitstellung bestimmter, von Ihnen
              erwünschter Funktionen (z. B. für die Warenkorbfunktion) oder zur
              Optimierung der Website (z. B. Cookies zur Messung des
              Webpublikums) erforderlich sind (notwendige Cookies), werden auf
              Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine
              andere Rechtsgrundlage angegeben wird. Der Websitebetreiber hat
              ein berechtigtes Interesse an der Speicherung von notwendigen
              Cookies zur technisch fehlerfreien und optimierten Bereitstellung
              seiner Dienste. Sofern eine Einwilligung zur Speicherung von
              Cookies und vergleichbaren Wiedererkennungstechnologien abgefragt
              wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage
              dieser Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1
              TTDSG); die Einwilligung ist jederzeit widerrufbar. Sie können
              Ihren Browser so einstellen, dass Sie über das Setzen von Cookies
              informiert werden und Cookies nur im Einzelfall erlauben, die
              Annahme von Cookies für bestimmte Fälle oder generell ausschließen
              sowie das automatische Löschen der Cookies beim Schließen des
              Browsers aktivieren. Bei der Deaktivierung von Cookies kann die
              Funktionalität dieser Website eingeschränkt sein. Welche Cookies
              und Dienste auf dieser Website eingesetzt werden, können Sie
              dieser Datenschutzerklärung entnehmen.{" "}
            </p>

            <h3>Server-Log-Dateien</h3>

            <p>
              Der Provider der Seiten erhebt und speichert automatisch
              Informationen in so genannten Server-LogDateien, die Ihr Browser
              automatisch an uns übermittelt. Dies sind:
            </p>

            <ul>
              <li>Browsertyp und Browserversion</li>
              <li>verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Datum und Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
              <li>Zeitzonendifferenz zur Greenwich Mean Time (GMT)</li>
              <li>Inhalt der Anforderung (konkrete Seite)</li>
              <li>Zugriffsstatus/HTTP-Statuscode</li>
              <li>jeweils übertragene Datenmenge</li>
              <li>Website, von der die Anforderung kommt</li>
              <li>Betriebssystem und dessen Oberfläche</li>
              <li>Sprache und Version der Browsersoftware.</li>
            </ul>

            <p>
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird
              nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf
              Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat
              ein berechtigtes Interesse an der technisch fehlerfreien
              Darstellung und der Optimierung seiner Website – hierzu müssen die
              Server-Log-Files erfasst werden.
            </p>

            <h3>Anfrage per E-Mail</h3>

            <p>
              Wenn Sie uns per E-Mail kontaktieren, wird Ihre Anfrage inklusive
              aller daraus hervorgehenden personenbezogenen Daten (Name,
              Anfrage) zum Zwecke der Bearbeitung Ihres Anliegens bei uns
              gespeichert und verarbeitet. Diese Daten geben wir nicht ohne Ihre
              Einwilligung weiter. Die Verarbeitung dieser Daten erfolgt auf
              Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit
              der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung
              vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen
              Fällen beruht die Verarbeitung auf unserem berechtigten Interesse
              an der effektiven Bearbeitung der an uns gerichteten Anfragen
              (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6
              Abs. 1 lit. a DSGVO) sofern diese abgefragt wurde; die
              Einwilligung ist jederzeit widerrufbar. Die von Ihnen an uns per
              Kontaktanfragen übersandten Daten verbleiben bei uns, bis Sie uns
              zur Löschung auffordern, Ihre Einwilligung zur Speicherung
              widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B.
              nach abgeschlossener Bearbeitung Ihres Anliegens). Zwingende
              gesetzliche Bestimmungen – insbesondere gesetzliche
              Aufbewahrungsfristen – bleiben unberührt.
            </p>
          </RichText>
        </main>

        <Footer className="mt-4" />
      </div>
    </div>
  );
}
