# ODAS App Realtime Data View

Realtime Data View-App für den Open Data App-Store (ODAP)

Die App Realtime Data View bietet eine Visualisierung von Open Data Informationen.

Die App ist eine "ODAP App V1".

## Funktionen

Die APP ist eine Single Page Application Webapp. Mit:

- Logo Anzeige
- Menü
- Seiten für Impressum, Datenschutz, Beschreibung, Kontakt, Hauptinhalt
- Inhaltsbereich mit Visualisierung von Daten
- Fußzeile

Die Konfiguration wird vom ODAS geladen.

Die APP zeigt Ihre Konfiguration im CSV Format an.

#### Desktop Version

![Alt-Text](/assets/Desktop_Screenshot.png)

## Betriebsarten

Die App kann lokal, eigenstaendig hinter einem Traefik-Reverse-Proxy oder ueber den ODAS
betrieben werden.

### Datenabruf: `proxyAktiv`

| Wert   | Bedeutung                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `nein` | Direkter Abruf der Daten-URL. Standard fuer Entwicklung und Standalone.      |
| `ja`   | Abruf ueber den ODAS-Proxy `…/odp-data`. Nur im ODAS-Live-System verfuegbar. |

Bei `nein` muss die Datenquelle CORS freigeben.

### Standalone-Betrieb

Voraussetzung: ein laufender Traefik mit dem externen Docker-Netzwerk `proxynet`,
dem EntryPoint `websecure` und dem Zertifikatsresolver `letsencrypt`.

1. In `docker-compose.standalone.yml` den Platzhalter `app1.example.com` durch den
   echten FQDN ersetzen.
2. In `odas-config/config.json` `proxyAktiv` auf `nein` belassen.
3. Starten:

```bash
STANDALONE=true make up
STANDALONE=true make logs
STANDALONE=true make down
```

Im Standalone-Betrieb entfaellt die lokale Portfreigabe; Traefik terminiert TLS und
leitet auf den internen Nginx-Port 80 weiter. Die Konfiguration wird aus derselben
`odas-config/config.json` gelesen wie in der Entwicklung und von Nginx unter `/config`
ausgeliefert.

### Auslieferung an den ODAS

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und
`CHANGELOG.md`. Die Infrastrukturdateien (`Dockerfile`, `docker-compose*.yml`,
`nginx.conf`, `Makefile`) sind nicht Teil der Auslieferung.

## Autor

(C) 2025, Ondics GmbH

## Für wen ist diese App?

Diese App zeigt Echtzeit-Sensordaten wie Pegelstände, Verkehrszahlen oder Wetterdaten. Sie richtet sich an Bürger:innen und Fachleute, die aktuelle Messwerte im Blick behalten möchten.
