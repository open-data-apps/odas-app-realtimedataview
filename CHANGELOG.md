# Changelog

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
