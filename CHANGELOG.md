# Changelog

## 1.21.0 - 2026-08-11
- FIX: Laufzeitressourcen beim Seitenwechsel freigeben (F-43): `onPageLeave` räumt jetzt über alle Registry-Einträge (iterierbare Map statt WeakMap-Einzel-Lookup über `#main-content`, damit auch zusätzlich gemountete Instanzen geräumt werden); Cleanup setzt das `disposed`-Flag und stoppt das 10-Sekunden-Polling; Fehler-/Hinweis-Meldungen vorheriger Polls werden ersetzt statt angehäuft, späte Fetch-/Render-Ergebnisse sind nach Teardown wirkungslos

## 1.20.0 - 2026-08-11
- FIX: Laufzeitzustand pro App-Instanz isoliert (F-42): `window.clearStartseiteInterval` entfernt — das Polling-Intervall liegt jetzt im Instanz-State (`state.updateInterval`), je Instanz wird eine Cleanup-Funktion in einer WeakMap-Registry (`rtCleanupRegistry`, Schlüssel: App-Container) abgelegt, die `onPageLeave` über `#main-content` erreicht (Interface für den F-43-Teardown); Vega-Chart-Div-ID instanzeindeutig (`vega-chart-<uid>`) und `vegaEmbed` erhält das Element statt eines ID-Strings

## 1.19.0 - 2026-08-07
- FIX: Bootstrap-Ziele instanzeindeutig machen (F-32)

## 1.18.0 - 2026-08-06
- FIX: DOM-Zugriffe auf den App-Container gescopt (F-25)

## 1.17.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.16.0 - 2026-08-06
- FIX: Drittanbieterliste "Beim Aufruf kontaktierte Drittanbieter" entfernt — alle Programmbibliotheken liegen jetzt lokal in `app/vendor/`, beim Aufruf werden keine externen Bibliotheksserver mehr kontaktiert

## 1.15.0 - 2026-08-06
- FIX: Vega, Vega-Lite und Vega-Embed vendored in `app/vendor/` statt von CDN geladen (Vendoring Teil 3) — Standalone-Betrieb laedt die Zusatzbibliotheken nicht mehr extern

## 1.14.0 - 2026-08-06
- FIX: Vega auf 5.33.1, Vega-Lite auf 5.23.0, Vega-Embed auf 6.29.0 exakt gepinnt (vorher nur Major-Version — bei jedem Aufruf eine andere Version, Voraussetzung fuer Vendoring)

## 1.13.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.12.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.11.0 - 2026-08-04
- FIX: Bootstrap vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.10.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)
- FIX: lokale `odas-config/config.json`: leeres Pflichtfeld `dateneinheit` befuellt

## 1.9.0 - 2026-07-31
- FIX: Ueberfluessiges `$ ` im zip-Ziel des Makefiles entfernt (F-22)

## 1.8.0 - 2026-07-31
- FIX: CSV-Zerlegung auf den Konventions-Parser umgestellt (F-14) - Semikolon-Quellen,
  gequotete Felder und CRLF-Zeilenenden werden korrekt gelesen
- FIX: Nicht lesbare Messwerte wandern nicht mehr als 0 in die Reihe, sondern werden
  gezaehlt und als Hinweis angezeigt
- ENH: Dezimalkomma in Messwerten wird unterstuetzt
- ENH: Empty-State "Keine Daten gefunden." ergaenzt

## 1.7.0 - 2026-07-31
- CHG: fehlendes Pflicht-Asset assets/branding.css ergaenzt und brandingCSSFile lokal aktiviert

## 1.6.0 - 2026-07-31
- FIX: URL-Attribute werden auf http/https geprüft (F-08); eine javascript:-URL aus der Datenquelle ist nicht mehr ausführbar
- FIX: Maskierung auf alle Daten- und Attributkontexte ausgedehnt (F-08)
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: datenpunktlimit von "Zahl" auf "string" mit Default "9999" (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: Template-Platzhalter in den Tags durch reale Tags ersetzt (F-21)
- FIX: defekte Icon- und Screenshot-Referenzen korrigiert (F-19)
- CHG: daten.schema auf assets/schema.json gesetzt (F-20)

## 1.5.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`)
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0. Das Stoppen des 10-Sekunden-Pollings laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`
- **ENH:** Die Kopfzeilen-Ueberschrift wird jetzt per CSS in `app/app.css` ausgeblendet statt durch Ueberschreiben des Konfigurationswerts `titel` in der Template-Datei

## 1.4.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)

## 1.3.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **FIX:** CKAN-Metadaten-URLs werden absolut aus dem Origin der Daten-URL gebildet
- **FIX:** Vega/Vega-Lite/Vega-Embed werden über einen Promise-Loader in der richtigen Reihenfolge geladen; das Diagramm lief vorher in eine Race-Condition gegen `addToHead()`
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## 1.2.0 (2026-07-03)

- **Schale 4 – Phase 1:** Für-wen-Block in Beschreibung und README, Weiterführende Links, Datenfrische-Indikator (Letzte Datenladung)

## ToDo

## 24.07.2025
