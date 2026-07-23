# Changelog

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
