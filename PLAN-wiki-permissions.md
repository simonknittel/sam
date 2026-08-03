# Wiki-Berechtigungen: effektive Rechte, dauerhafte Verwalter, kein Aufweiten von Lesezugriff

## Goal

Das Berechtigungs-Modal von Wiki-Seiten zeigt neben "Geerbt" künftig auch die effektiven Berechtigungen — ausschließlich als Rollen, nie als einzelne Citizens. Gleichzeitig wird das Berechtigungsmodell vereinfacht: Besitzer und Verwalter einer Seite behalten diese Rechte immer auch auf allen Unterseiten, und Unterseiten können den Lesezugriff nur noch einschränken, nie erweitern. Die Bedienelemente des Modals werden zu gleich großen Icon-Buttons mit kurzer Beschriftung und einer Erklärung unterhalb der Buttons.

## Decision log

### Berechtigungsmodell

1. **Verwalten vererbt sich additiv nach unten.** `canAdmin(Seite) = eigene Verwalter-Rolle || Besitzer || canAdmin(Elternseite)`. Besitzer und Verwalter einer Seite haben damit immer Lesen, Bearbeiten und Verwalten auf allen Unterseiten — auch dann, wenn die Unterseite einen eigenen Besitzer oder eigene Verwalter-Rollen hat. Bisher schnitt eine Unterseite mit eigener Verwalten-Einstellung die Vorfahren aus.
2. **Besitz wird weiterhin vererbt und weiterhin so angezeigt.** Eine Unterseite ohne eigenen Besitzer zeigt weiter den Besitzer des nächsten Vorfahren mit dem Zusatz "(geerbt)". Der Besitzer eines Vorfahren wird dadurch nicht automatisch zum Besitzer der Unterseite, wenn diese einen eigenen hat — er hat dort "nur" Verwalter-Rechte (siehe 1).
3. **`adminability` entfällt komplett.** Weil Verwalten nur noch additiv ist, bedeuten `INHERIT` und `RESTRICTED` dasselbe. Die Spalte `WikiPage.adminability` und das Enum `WikiPageAdminability` werden per Migration entfernt; die Verwalter ergeben sich allein aus den `WikiPageRoleAccess`-Zeilen vom Typ `ADMIN`. Bestehende ADMIN-Zeilen bleiben erhalten und wirken ab sofort additiv.
4. **Eine Seite gibt nie mehr als die Seite darüber.** Jede Stufe setzt `canRead(Elternseite)` voraus — Lesen, Bearbeiten, Verwalten und der eigene Besitzer. Es gibt keine erreichbare Seite ohne lesbaren Pfad von der obersten Ebene bis zu ihr. Einzige Ausnahme ist `wiki;manage`, das wie bisher überall gilt.
5. **Damit gibt es keinen Sonderfall "bearbeiten ohne lesen" mehr.** Eine Rolle, die die Elternseite nicht lesen darf, bekommt auf der Unterseite gar nichts — auch keine Bearbeiten- oder Verwalten-Rechte. Die frühere Ausnahme (eigene stärkere Rechte umgehen die Elternseite) ist entfallen, ebenso die Umgehungen in Sidebar, Breadcrumb und Unterbaum-Sammlung, die dafür Unterseiten unsichtbarer Eltern nach oben gezogen haben.
6. **"Öffentlich" gibt es nur noch auf oberster Ebene.** Auf Unterseiten wäre "Öffentlich" nach (4) identisch mit "Geerbt". Unterseiten bieten deshalb nur noch "Geerbt" und "Eingeschränkt". Eine Migration setzt bestehende Unterseiten mit `PUBLIC` auf `INHERIT` (effektiv identisches Ergebnis), die Server-Action lehnt `PUBLIC` mit Elternseite ab, und der Resolver behandelt ein trotzdem vorhandenes `PUBLIC` auf einer Unterseite defensiv wie `INHERIT`.
7. **`INHERIT` auf oberster Ebene bleibt maximal restriktiv** (nur Besitzer), ebenso bei kaputter Elternkette oder Zyklus. Das ist das heutige Verhalten und schützt Alt-/Fehldaten davor, durch die neue rekursive Auswertung plötzlich für alle lesbar zu werden.
8. **Bearbeiten und Hochladen behalten "nächste explizite Einstellung gewinnt".** Nur Lesen (Einschränkung nach unten) und Verwalten (Erweiterung nach unten) bekommen die neue Kettensemantik.
9. **`editability = ALL` heißt "alle mit Lesezugriff auf diese Seite"**, nicht "alle mit Wiki-Zugriff". Auf einer eingeschränkten Seite dürfen damit genau ihre Leser bearbeiten. Technisch nötig dafür: der Lese-Anspruch aus der Sichtbarkeitsstufe (`hasReadGrant`) wird getrennt von `canRead` ausgewertet, sonst würden sich Lesen und Bearbeiten gegenseitig definieren.

### Schreibpfad

9. **Teilmengen-Invariante beim Speichern.** Alle Rollen einer Unterseite — Lesen, Bearbeiten und Verwalten — müssen die Elternseite lesen dürfen, ebenso ein explizit gesetzter Besitzer. Geprüft wird pro Rolle durch Simulation eines Viewers mit genau dieser Rolle plus ihren geerbten Rollen (`role.inherits`), beim Besitzer über dessen echte Rollen; dadurch zählt Rollenvererbung korrekt mit.
10. **Rollenauswahl ist eingeschränkt.** Alle drei Rollen-Picker bieten auf Unterseiten nur Rollen an, die die Elternseite lesen dürfen, mit erklärendem Hinweis. Server-seitige Validierung bleibt als Backstop.
11. **Einschränken einer Elternseite bereinigt Unterseiten.** Wird beim Speichern der Zugriff einer Seite verkleinert, werden wirkungslos gewordene Rollen-Einträge jeder Art im gesamten Unterbaum gelöscht. Die Erfolgsmeldung nennt die Anzahl betroffener Seiten, pro Seite entsteht ein Audit-Event.
12. **Verschieben setzt Berechtigungen zurück.** `moveWikiPage` und `updateWikiPagePosition` setzen die verschobene Seite und ihren gesamten Unterbaum auf "Geerbt" und löschen deren Rollenlisten — die Seite übernimmt am neuen Ort die Berechtigungen des neuen Elternteils. Beim Verschieben auf die oberste Ebene gelten die Standardwerte einer neuen Wurzelseite inklusive explizitem Besitzer. `duplicateWikiPage` bereinigt gespiegelte Rollen weiterhin gegen das Ziel.
13. **Laufzeit-Einschränkung bleibt trotzdem bestehen** (Defense in Depth). Die gespeicherten Daten können auch ohne Wiki-Schreibzugriff driften — z. B. wenn im Rollen-Modul die Vererbung einer Rolle geändert wird. Der Resolver schneidet deshalb weiterhin mit der Elternseite, sodass die Invariante "keine Erweiterung nach unten" unabhängig vom Datenstand gilt.
14. **Bereinigung umfasst auch Seiten im Papierkorb**, damit ein wiederhergestellter Unterbaum keine ungültigen Leserechte zurückbringt.

### Anzeige der effektiven Berechtigungen

15. **Inline pro Abschnitt, immer sichtbar** — je eine "Effektiv"-Zeile unter den Bedienelementen von Sehen, Bearbeiten und Verwalten, unabhängig davon, ob die Einstellung geerbt oder eigen ist.
16. **Nur Rollen, keine Citizens.** Rollenmitgliedschaften werden nicht aufgelöst.
17. **Implizite Rechte werden mitgelistet und markiert**, weil die Frage "wer sieht diese Seite?" sonst falsch beantwortet wird: z. B. `@Marine (via Bearbeiten)`, `@Flottenrat (geerbt von "Flotte")`, `@Admin (Wiki-Verwaltung)`.
18. **Nicht-Rollen-Rechte werden als eigene Chips gezeigt**: `Besitzer (@handle)` und `Alle mit Wiki-Zugriff`.
19. **Rollen mit der App-Berechtigung `wiki;manage`** erscheinen in allen Listen, markiert mit `(Wiki-Verwaltung)`.
20. **Die Upload-Abschnitte bekommen keine Effektiv-Liste** — ihr Publikum steht bereits in den Abschnitten Bearbeiten und Verwalten.
21. **Die Effektiv-Listen zeigen den gespeicherten Stand**, nicht die im Modal gerade ausgewählten, noch nicht gespeicherten Werte. Das wird in der Überschrift der Zeile kenntlich gemacht ("Effektiv (gespeichert)"). Eine Live-Neuberechnung im Client würde den kompletten Resolver samt aller Seiten in den Browser holen.

### Visuelles

22. **Gleich große Buttons mit Icon und ein bis zwei Wörtern.** Die Optionen einer Gruppe teilen sich die volle Breite des Abschnitts.
23. **Die Erklärung steht unter der Button-Gruppe, außerhalb der Buttons**, und beschreibt nur die aktuell ausgewählte Option. Der bestehende `hint`-Mechanismus von `RadioGroup` macht genau das und wird wiederverwendet.
24. **`RadioGroup` wird erweitert statt kopiert** — optionales `icon` pro Item und ein Modus für gleich breite Items. Die zehn bestehenden Verwendungsstellen bleiben unverändert.
25. **Der Abschnitt "Verwalten" verliert seine Radio-Gruppe** (siehe 3) und besteht künftig aus einer schreibgeschützten Liste "Immer" (Besitzer, geerbte Manager) und dem Picker "Zusätzliche Manager".
26. **Wortwahl**: Personen heißen "Manager" statt "Verwalter" (auch "Wiki-Manager", Markierung "(Wiki-Management)"); die Stufe heißt weiterhin "Verwalten", weil sie in einer Reihe mit "Lesen", "Bearbeiten" und "Hochladen" steht. Die erste Stufe heißt "Lesen" statt "Sehen".
27. **Der einleitende Hinweis steht oben im Dialog**, nicht mehr unten über dem Speichern-Button.

### Nachtrag: Audit der Berechtigungsfläche (2026-08-03)

28. **Alle Durchsetzungsstellen geprüft** (Routen, Actions, tRPC, Collab-Server, Sidebar/Suche/Breadcrumb/Seitenindex/Anhänge): keine Lücke, durch die sich Lesen, Bearbeiten oder Verwalten umgehen ließe.
29. **Gefixt:** Der Bereinigungs-Helper hat eine fehlende Elternseite als "Elternseite nicht lesbar" gewertet und dabei alle Rollen der Seite gelöscht, während der Resolver dieselben Daten als "keine Elternseite" behandelt und Zugriff gewährt. Jetzt überspringt die Bereinigung solche Seiten.
30. **Gefixt:** Verschieben ließ Stufenwerte unverändert und konnte dadurch Zustände erzeugen, die das Modal nicht darstellen und die Server-Action ablehnt (Wurzelseite mit `INHERIT`, Unterseite mit `PUBLIC`, Wurzelseite ohne Besitzer). Der Reset beim Verschieben löst das mit.
31. **Bewusst nicht geändert:** Beim Wiederherstellen einer Seite werden gelöschte Vorfahren mit wiederhergestellt, auch wenn der Handelnde diese nicht verwaltet. Ebenso bleibt eine aktive Collab-Verbindung nach Rechteentzug bis zum Verbindungsende bestehen (JWT wird nur beim Verbinden geprüft).
32. **Datenmigration:** Bestehende Rollen-Einträge, die die neue Invariante verletzen, sind wirkungslos (der Resolver ignoriert sie) und lassen sich in SQL nicht zuverlässig erkennen, weil dafür Rollenvererbung und `wiki;manage` ausgewertet werden müssten. Sie verschwinden beim nächsten Speichern der jeweiligen Seite: Das Modal wählt sie gar nicht erst aus, das Speichern schreibt nur noch die gültigen. Ein einmaliges Aufräumskript ist möglich, aber nicht nötig.

### Out of scope

- Auflösung von Rollen in einzelne Citizens in der Anzeige.
- Änderungen an `sidebarMode` (rein kosmetisch, nie eine Berechtigung).
- Bilder bleiben unauthentifiziert über ihre nicht erratbare S3-URL abrufbar (unverändert, dokumentiert in der Attachment-Route).
- "Öffentlich" bedeutet weiterhin "alle mit Wiki-Zugriff", kein anonymer Zugriff aus dem Internet.
- Wer neue Seiten auf oberster Ebene anlegen darf (`wiki;create`).
- Automatische Reparatur, wenn im Rollen-Modul Vererbungen geändert werden — dafür sorgt die Laufzeit-Einschränkung (13), kein Hintergrund-Job.
- Bearbeiten-Rechte einschränken, sodass sie sich nach unten verengen. Bearbeiten bleibt explizit unabhängig.

## Overall implementation notes

**Resolver.** `resolveWikiPagePermissions.ts` wird von "pro Ebene die nächste explizite Einstellung suchen" auf eine rekursive Auswertung pro Seite mit Memoisierung umgestellt:

```
canAdmin(p) = wiki;manage || istBesitzer(p) || eigeneAdminRolle(p) || canAdmin(parent)
canEdit(p)  = canAdmin(p) || (editability: ALL → true | RESTRICTED → eigene Editrolle | INHERIT → canEdit(parent))
canRead(p)  = canEdit(p)  || (visibility: PUBLIC → nur Wurzel: true | RESTRICTED → eigene Leserolle && canRead(parent) | INHERIT → canRead(parent))
```

Ohne Elternseite (Wurzel, kaputte Kette, Zyklus) liefert der jeweilige `parent`-Zweig `false`. Die Upload-Stufen behalten die bisherige `findSource`-Logik ("nächste explizite Einstellung gewinnt") und werten danach wie bisher gegen `canEdit`/`canAdmin` aus. `visibilitySourceId`, `editabilitySourceId` und die Upload-Source-Ids bleiben für die "Geerbt von …"-Beschriftung erhalten; `adminabilitySourceId` entfällt und wird durch eine Liste der vererbenden Vorfahren ersetzt.

Damit die Effektiv-Anzeige nicht für jede Rolle alle Seiten auflösen muss, wird der Resolver in eine Fabrik umgebaut: `createWikiPagePermissionResolver(pages, viewer)` liefert ein Objekt mit `get(pageId)` und internem Memo; `resolveWikiPagePermissions(pages, viewer)` bleibt als Map-über-alle-Seiten-Wrapper für `getWikiContext` bestehen. Die Effektiv-Anzeige erzeugt pro Rolle einen Resolver und fragt nur die eine Seite ab — Aufwand also Rollenanzahl × Tiefe der Kette statt Rollenanzahl × Seitenanzahl.

**Teilmengen-Prüfung und Bereinigung.** Beides braucht dieselbe Frage ("welche Rollen dürfen Seite X lesen?") und liegt deshalb in einem gemeinsamen Util `resolveWikiPageReadRoles.ts` (Simulation pro Rolle inkl. `role.inherits` und `wiki;manage`). Darauf setzt `pruneWikiPageReadRoles.ts` auf, das für einen Unterbaum die zu löschenden `(pageId, roleId)`-Paare berechnet — verwendet von `updateWikiPagePermissions`, `moveWikiPage`, `updateWikiPagePosition` und `duplicateWikiPage`.

**Anzeige.** Die Seiten-Server-Component (`app/app/wiki/[pageId]/[[...slug]]/page.tsx`) berechnet die Effektiv-Listen und die erlaubten Lese-Rollen und reicht sie als Props ins Modal. Dafür wird zusätzlich `prisma.role.findMany` mit `permissionStrings` und `inherits` geladen — nur im Zweig `permissions.canAdmin`, in dem das Modal ohnehin gerendert wird. Rollen werden im Modal über das bestehende `SingleRoleBadge` dargestellt, sodass keine Namen durchgereicht werden müssen.

**Migration.** Eine Prisma-Migration entfernt `WikiPage.adminability` samt Enum und setzt `visibility = 'INHERIT'` für alle Seiten mit `parentId IS NOT NULL AND visibility = 'PUBLIC'`. Beides ist verlustfrei im Sinne der effektiven Rechte.

**Sprache.** Alle sichtbaren Texte bleiben deutsch, konsistent zum bestehenden Modal.

## Implementation phases

### Phase 1: Schema und Migration

Entfernt die bedeutungslos gewordene `adminability`-Stufe und zieht bestehende öffentliche Unterseiten auf "Geerbt", damit die folgenden Phasen auf einem konsistenten Datenmodell aufsetzen.

#### Status

Abgeschlossen

#### Steps

1. In `packages/database/prisma/models/wiki.prisma` das Enum `WikiPageAdminability` und das Feld `WikiPage.adminability` entfernen; den Kommentarblock zur Berechtigungsvererbung an das neue Modell anpassen (Verwalten additiv, Lesen nur einschränkend, "Öffentlich" nur auf oberster Ebene).
2. Migration erzeugen, die die Spalte und den Typ droppt und im selben Schritt `visibility` bestehender Unterseiten von `PUBLIC` auf `INHERIT` setzt.
3. Prisma-Client neu generieren und alle Compile-Fehler in den bekannten Fundstellen abarbeiten: `getWikiContext`, `resolveWikiPagePermissions` (+ Test), `createWikiPage`, `duplicateWikiPage`, `updateWikiPagePermissions`, `WikiPagePermissionsModal`, `page.tsx`, `AuditEventTypes`.
4. Im Audit-Event-Typ `WIKI_PAGE_PERMISSIONS_UPDATED` das Feld `adminability` aus neuen Events entfernen und prüfen, dass die Audit-Anzeige alte Events ohne das Feld weiterhin rendert.

#### Notes

- `createWikiPage` setzte für Wurzelseiten `adminability: RESTRICTED`, für Unterseiten `INHERIT` — beides ersatzlos entfernen. Der Ersteller bleibt über den expliziten Besitz Verwalter der Wurzelseite.
- `duplicateWikiPage` kopierte die Stufe mit; auch hier ersatzlos entfernen. Die kopierten ADMIN-Rollen-Zeilen bleiben.

#### Verification

- `pnpm --filter @sam-monorepo/database exec prisma migrate dev` läuft lokal durch, `prisma migrate status` meldet keine Abweichung.
- Repository-weite Suche nach `adminability`/`Adminability` findet nur noch Treffer in der alten Migration und in generiertem Code.
- Stichprobe in der lokalen DB: keine Seite mit `parentId IS NOT NULL AND visibility = 'PUBLIC'`.

### Phase 2: Resolver

Setzt das neue Berechtigungsmodell in der einen sicherheitskritischen Stelle um, durch die sämtliche Wiki-Zugriffe laufen.

#### Status

Abgeschlossen

#### Steps

1. `resolveWikiPagePermissions.ts` auf die rekursive Auswertung mit Memo pro Seite umstellen (siehe Formeln oben), inklusive Zyklus- und Kettenbruch-Schutz und der Sonderbehandlung von `INHERIT` ohne Elternseite als maximal restriktiv.
2. Verwalten additiv machen: eigene ADMIN-Rollen plus `canAdmin(parent)`; `adminabilitySourceId` durch `inheritedAdminFromPageIds` (Vorfahren, die Verwalten beisteuern) ersetzen.
3. Lesen einschränken: `RESTRICTED` und `INHERIT` erfordern zusätzlich `canRead(parent)`; `PUBLIC` auf einer Unterseite defensiv wie `INHERIT` behandeln.
4. Resolver-Fabrik `createWikiPagePermissionResolver(pages, viewer)` einführen und `resolveWikiPagePermissions` darauf zurückführen; `getWikiContext` bleibt unverändert in der Benutzung.
5. `resolveWikiPagePermissions.test.ts` erweitern: Vorfahren-Verwalter behalten Rechte trotz eigenem Besitzer/eigenen Verwalter-Rollen der Unterseite; Unterseite kann Lesen nicht erweitern; Bearbeiten ohne Leserecht auf der Elternseite funktioniert weiterhin; Besitzer der Unterseite liest trotz nicht lesbarer Elternseite; `INHERIT` auf oberster Ebene bleibt restriktiv; Zyklen und fehlende Elternseiten.

#### Notes

- Der Kommentarblock über `resolveWikiPagePermissions` beschreibt die Grant-Regeln und muss vollständig auf das neue Modell umgeschrieben werden — er ist die Referenz für alle weiteren Änderungen.
- Der Zyklusschutz braucht **pro Stufe** ein eigenes Set laufender Auswertungen. Mit einem gemeinsamen Set wird der reguläre Abstieg Lesen → Bearbeiten → Verwalten derselben Seite als Zyklus missverstanden und liefert `false`. Aufgefallen ist das erst beim Umbau von `ALL`; abgesichert durch einen Test, in dem eine Unterseite vor ihrer Elternseite in der Liste steht.
- Die bestehenden 26 Tests bleiben der Ausgangspunkt; erwartete Ergebnisse ändern sich nur dort, wo Vorfahren bisher ausgeschlossen wurden oder eine Unterseite Lesen erweitert hat.

#### Verification

- `pnpm --filter app test resolveWikiPagePermissions` grün, inklusive der neuen Fälle.
- Manuelle Gegenprobe der Sichtbarkeit in der laufenden App (Sidebar-Baum, Suche, Breadcrumb) mit einem Nutzer ohne `wiki;manage`.

### Phase 3: Schreibpfad — Validierung und Bereinigung

Hält die Teilmengen-Invariante beim Speichern, Verschieben und Duplizieren aufrecht, damit die gespeicherten Daten das widerspiegeln, was der Resolver zur Laufzeit ohnehin erzwingt.

#### Status

Abgeschlossen

#### Steps

1. `resolveWikiPageReadRoles.ts` anlegen: liefert für eine Seite die Menge der Rollen-Ids, die sie allein (inkl. `role.inherits` und `wiki;manage`) lesen dürfen. Benötigt die Rollen mit `inherits` und `permissionStrings` als Eingabe.
2. `pruneWikiPageReadRoles.ts` anlegen: berechnet für einen Unterbaum top-down die zu löschenden `(pageId, roleId)`-Paare gegen einen in-memory aktualisierten Seitenstand; berücksichtigt auch Seiten im Papierkorb.
3. `updateWikiPagePermissions` erweitern: `adminability` aus Schema und Update entfernen; `PUBLIC` mit Elternseite ablehnen; READ-Rollen gegen die erlaubten Rollen der Elternseite validieren; nach dem Update den Unterbaum bereinigen; Anzahl betroffener Seiten in die Erfolgsmeldung aufnehmen und Audit-Events pro bereinigter Seite schreiben.
4. Die Kaskaden-Filterung auf Seiten mit Verwalten-Recht (`cascadableIds`) vereinfachen: Wer die Seite verwalten darf, verwaltet nach dem neuen Modell auch den gesamten Unterbaum — der Sonderfall "übersprungene Unterseiten" entfällt samt der zugehörigen Meldung.
5. `moveWikiPage` und `updateWikiPagePosition` um die Bereinigung des verschobenen Unterbaums erweitern, inklusive Rückmeldung.
6. `duplicateWikiPage` um dieselbe Bereinigung für die Kopie erweitern, damit ein Duplikat in einem restriktiveren Zielbaum keine Leserechte mitbringt.

#### Notes

- Die Bereinigung arbeitet auf `context.allPages` (inklusive Papierkorb), nicht auf `context.pages`.
- Reihenfolge in der Transaktion: erst die Seite selbst aktualisieren, dann Kaskaden, dann Bereinigung — sonst bereinigt man gegen den alten Stand.
- Die geplante Top-down-Iteration war unnötig: der Resolver verlangt für Lesen ohnehin die ganze Vorfahrenkette, also erkennt ein einziger Durchlauf gegen den neuen Stand auch tote Einträge weiter unten. Umgesetzt in `collectWikiPageReadRolePrunes` (rein) plus `pruneWikiPageReadRoles` (löscht und auditiert), statt der geplanten Aufteilung `resolveWikiPageReadRoles`/`pruneWikiPageReadRoles`.
- Neuer Audit-Event-Typ `WIKI_PAGE_READ_ROLES_PRUNED` mit `removedRoleIds` und `trigger` (`PERMISSIONS_UPDATED` | `MOVED` | `DUPLICATED`) — die Bereinigung als "Berechtigungsänderung" zu protokollieren hätte die Rollenlisten des Events verfälscht.
- Das Formularfeld `cascadeAdminability` heißt jetzt `cascadeAdminRoles`: es gibt keine Stufe mehr zurückzusetzen, nur noch zusätzliche Verwalter-Rollen zu entfernen.
- Rollenvererbung macht die Teilmengen-Prüfung großzügiger als erwartet und das ist richtig so: erbt Rolle A von Rolle B, darf A auf einer Unterseite Lesen bekommen, sobald B die Elternseite sehen darf. In der App gegengeprüft (Ace erbt Airman).

#### Verification

- Unit-Tests für `resolveWikiPageReadRoles` und `pruneWikiPageReadRoles` (Rollenvererbung, mehrstufige Bäume, Papierkorb-Seiten).
- In der App: Elternseite einschränken → Erfolgsmeldung nennt bereinigte Unterseiten, deren Rollen sind im Modal verschwunden, Audit-Log zeigt die Events.
- In der App: Seite unter eine restriktivere Elternseite verschieben → Leserollen werden bereinigt und gemeldet.

### Phase 4: Effektive Berechtigungen berechnen

Liefert die Daten für die neue Anzeige, ohne die Rollenmitgliedschaften aufzulösen.

#### Status

Abgeschlossen

#### Steps

1. Query/Util anlegen, das alle Rollen mit `inherits` und `permissionStrings` lädt und daraus je Rolle bestimmt: darf lesen / darf bearbeiten / darf verwalten auf der Seite, sowie ob die Rolle `wiki;manage` trägt (über die bestehende Permission-String-Auswertung).
2. Je Stufe eine sortierte Liste aus Rollen-Einträgen mit Grund-Markierung aufbauen: direkt, `via Bearbeiten`/`via Verwalten`, `geerbt von "<Titel>"`, `(Wiki-Verwaltung)`.
3. Nicht-Rollen-Einträge ergänzen: `Besitzer (@handle)` und — bei öffentlicher Wurzelseite — `Alle mit Wiki-Zugriff`.
4. Die Liste der "immer" geltenden Verwalter (Besitzer der Seite, Besitzer und Verwalter-Rollen der Vorfahren) für den neuen Verwalten-Abschnitt aufbauen.
5. Die erlaubten Lese-Rollen der Elternseite für den eingeschränkten Rollen-Picker bereitstellen.
6. Alles in `page.tsx` im `canAdmin`-Zweig berechnen und als Props an das Modal geben.

#### Notes

- Rollen, die der aktuelle Nutzer über `getVisibleRoles` nicht sehen darf, können trotzdem in den Effektiv-Listen auftauchen. Das ist gewollt: Wer eine Seite verwaltet, muss wissen, wer sie sehen kann. Der Picker bleibt dagegen auf sichtbare Rollen beschränkt.
- Der Admin-Notausgang (`user.role === "admin"` plus `enable_admin`-Cookie) ist nicht rollenbasiert und taucht in den Listen bewusst nicht auf.
- "Alle mit Wiki-Zugriff" wird nicht aus den Enum-Werten abgeleitet, sondern durch Auflösen der Seite für einen Viewer ganz ohne Rollen und ohne Citizen. Damit stimmt die Aussage auch für Unterseiten, die eine öffentliche Wurzelseite erben.
- `getPermissionSetsByRoles` nimmt jetzt strukturell getypte Rollen (nur `permissionStrings` zählt) statt vollständiger `Role`-Objekte, damit die schlanke Rollen-Query dafür ausreicht.
- Der Verwalten-Abschnitt bekommt bewusst keine eigene Effektiv-Zeile: "Immer (von übergeordneten Seiten)" plus der Picker darunter zeigen zusammen bereits die vollständige Menge, eine dritte Liste wäre nur Wiederholung.

#### Verification

- Unit-Test für die Effektiv-Berechnung mit einem mehrstufigen Baum inklusive vererbter Verwalter und eingeschränktem Lesen.
- Abgleich in der App: Die angezeigte Leserolle sieht die Seite tatsächlich (Test mit einem zweiten Account/Rolle).

### Phase 5: Modal-Umbau

Ersetzt die textlastigen Radio-Zeilen durch gleich große Icon-Buttons mit Erklärung darunter und blendet die effektiven Berechtigungen ein.

#### Status

Abgeschlossen

#### Steps

1. `RadioGroup` um ein optionales `icon` je Item und einen Modus für gleich breite, die volle Breite füllende Items erweitern, ohne die bestehenden Verwendungsstellen zu verändern.
2. Beschriftungen auf ein bis zwei Wörter kürzen und Icons vergeben: Geerbt (`FaSitemap`), Öffentlich (`FaGlobe`), Eingeschränkt (`FaLock`), Alle (`FaUsers`), Bearbeiter (`FaPen`), Verwalter (`FaUserShield`), Bestimmter Citizen (`FaUser`).
3. Die bisherigen Klammertexte in `hint`s überführen, sodass unter der Button-Gruppe genau eine Erklärung zur gewählten Option steht — inklusive "Geerbt von \"<Titel>\"" mit dem Seitentitel.
4. "Öffentlich" auf Unterseiten nicht mehr anbieten.
5. Den Abschnitt "Verwalten" umbauen: schreibgeschützte Liste "Immer" plus Picker "Zusätzliche Verwalter-Rollen"; Kaskaden-Schalter bleibt und bedeutet nun "zusätzliche Verwalter-Rollen der Unterseiten entfernen".
6. Komponente für die Effektiv-Zeile bauen (Rollen-Badges plus Text-Chips, Markierungen als kleiner Zusatz) und in Sehen, Bearbeiten und Verwalten einhängen, überschrieben mit "Effektiv (gespeichert)".
7. `WikiRoleSelector` um eine optionale Beschränkung auf erlaubte Rollen samt Hinweistext erweitern und im Lese-Picker von Unterseiten nutzen.
8. Den Hinweis am Ende des Modals auf das neue Modell umschreiben: Verwalten schließt Bearbeiten ein, Bearbeiten schließt Sehen ein, Besitzer und Verwalter übergeordneter Seiten verwalten auch alle Unterseiten, und Unterseiten können den Lesezugriff nur einschränken.

#### Notes

- Die Buttons sollen auch bei drei Optionen und schmalem Modal nicht umbrechen; Beschriftung deshalb wirklich kurz halten.
- Das Modal ist eine Client-Komponente ohne eigenen Datenzugriff — alle neuen Daten kommen als Props aus `page.tsx`.

#### Verification

- Optische Prüfung in der App: gleich breite Buttons, Icons sichtbar, Erklärung wechselt beim Klick, keine Textwüste mehr in den Buttons.
- Screenshot einer Wurzelseite und einer Unterseite mit vererbten Rechten.
- Tastaturbedienung der Radio-Gruppen funktioniert weiterhin (Pfeiltasten, Fokus sichtbar).

### Phase 6: Abschluss

#### Status

Abgeschlossen

#### Steps

1. Volle Verifikation nach den Projekt-Konventionen: Typecheck, Lint, Formatierung, Unit-Tests, Build.
2. Kommentare in den geänderten Dateien gegen das neue Modell prüfen — insbesondere die Modellbeschreibung in `wiki.prisma` und im Resolver.
3. Merge-Request-Beschreibung schreiben, ohne Details zu wiederholen, die bereits in Code-Kommentaren stehen.

#### Notes

- Verifiziert am 2026-08-03 im Worktree-Stack (Slot 1): Typecheck, ESLint (keine neuen Fehler — die verbleibenden sind auch auf `main` vorhanden), Prettier, 193 Unit-Tests, `next build`.
- In der App gegengeprüft mit einem Testbaum "Berechtigungstest" → "Einsatzplanung" → "Detailseite": gleich breite Icon-Buttons, "Öffentlich" nur auf der Wurzelseite, Effektiv-Listen mit Markierungen, "Immer"-Liste der geerbten Verwalter, Lese-Picker auf die Leser der Elternseite beschränkt, Bereinigung samt Meldung und Audit-Event.

#### Verification

Siehe "Final end-to-end verification".

## Final end-to-end verification

1. Typecheck, Lint, Formatierung, Unit-Tests und Build der App laufen durch.
2. Testbaum in der lokalen App: Wurzelseite "Flotte" (öffentlich), Unterseite "Einsatzplanung" (eingeschränkt auf eine Rolle), Enkelseite mit eigenem Besitzer und eigenen Verwalter-Rollen.
3. Besitzer und Verwalter von "Flotte" können die Enkelseite lesen, bearbeiten, verwalten und ihre Berechtigungen ändern — obwohl die Enkelseite einen anderen Besitzer hat.
4. Eine Rolle mit Leserecht nur auf der Enkelseite, aber ohne Leserecht auf "Einsatzplanung", sieht die Enkelseite nicht — weder direkt, noch in Sidebar, Suche, Favoriten oder Seitenindex.
5. Dieselbe Rolle mit Bearbeitungsrecht auf der Enkelseite sieht und bearbeitet sie weiterhin.
6. Auf Unterseiten gibt es keine Option "Öffentlich" mehr; der Lese-Picker bietet nur Rollen an, die die Elternseite lesen dürfen.
7. Einschränken der Leserollen von "Einsatzplanung" entfernt ungültige Leserollen aus dem Unterbaum, meldet die Anzahl und schreibt Audit-Events.
8. Verschieben der Enkelseite unter eine restriktivere Seite bereinigt ihre Leserollen und meldet das.
9. Die Effektiv-Listen im Modal nennen alle Rollen mit Zugriff samt Markierung, den Besitzer als eigenen Chip und keine einzelnen Citizens.
10. Die Bedienelemente sind gleich große Icon-Buttons mit kurzer Beschriftung; die Erklärung steht unterhalb und wechselt mit der Auswahl.
