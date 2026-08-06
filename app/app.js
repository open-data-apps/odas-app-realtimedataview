/*
- Diese Funktion ist für die Inhalte der Startseite zuständig.
- @param {Object} configdata - Konfigurationsdaten (enthält apiurl)
- @param {HTMLElement} enclosingHtmlDivElement - Container für den Content
- @returns {null}
*/
/*
 * Template-Hook (oda-generic 1.4.0). Die Base ruft ihn vor dem Rendern der neuen Seite
 * auf. app() registriert beim Aufbau der Startseite `window.clearStartseiteInterval`, um
 * sein 10-Sekunden-Polling wieder stoppen zu koennen; ohne diesen Aufruf liefe es auf den
 * Unterseiten weiter. Frueher rief app/app-base.js die Funktion selbst auf und wich
 * dadurch vom Template ab.
 */
function onPageLeave(page) {
  if (typeof window.clearStartseiteInterval === "function") {
    window.clearStartseiteInterval();
  }
}

function isOdasProxyEnabled(configdata = {}) {
  return String(configdata.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (_error) {
    return String(url || "");
  }
}

function getOdasAppBasePath(pathname) {
  let appPath =
    pathname === undefined
      ? typeof window !== "undefined"
        ? window.location.pathname
        : "/"
      : String(pathname || "/");

  if (!appPath.endsWith("/")) {
    const lastSlashIndex = appPath.lastIndexOf("/");
    const lastSegment = appPath.substring(lastSlashIndex + 1);
    if (lastSegment.includes(".")) {
      appPath = appPath.substring(0, lastSlashIndex + 1);
    }
  }

  return appPath.replace(/\/+$/, "");
}

function getOdasProxyEndpoint(targetUrl, pathname) {
  const appPath = getOdasAppBasePath(pathname);
  return `${appPath}/odp-data?path=${encodeURIComponent(
    extractPathFromUrl(targetUrl),
  )}`;
}

async function fetchViaOdasProxy(targetUrl) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

// ── CSV-PARSING ──────────────────────────────────────────────────────────────
// Kommunale Open-Data-CSVs sind häufig Semikolon-getrennt, enthalten gequotete
// Felder und CRLF-Zeilenenden. Naives split(",") verwirft solche Zeilen still.

function detectCsvDelimiter(text) {
  const firstLine = String(text).split(/\r\n|\r|\n/)[0] || "";
  let best = ",";
  let bestCount = 0;
  [";", ",", "\t", "|"].forEach((cand) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === cand && !inQuotes) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = cand;
    }
  });
  return best;
}

function parseCsv(text, delimiter) {
  const sep = delimiter || detectCsvDelimiter(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchOdasJson(targetUrl, configdata = {}) {
  return JSON.parse(await fetchOdasResource(targetUrl, configdata));
}

async function app(configdata = {}, enclosingHtmlDivElement) {
  enclosingHtmlDivElement.innerHTML = "";
  const startseiteContainer = document.createElement("div");
  startseiteContainer.className =
    "container-xxl d-flex flex-column justify-content-center align-items-center p-0 startseite-content";
  enclosingHtmlDivElement.appendChild(startseiteContainer);

  // Info-Box
  const infoBox = document.createElement("div");
  infoBox.className = "mb-4 text-center";
  startseiteContainer.appendChild(infoBox);

  // --- Metadaten laden über Proxy ---
  let resourceTitle = "";
  let resourceDescription = "";
  let datasetTitle = "";
  try {
    // Versuche CKAN API für Metadaten zu nutzen (über Proxy)
    // Extrahiere resource_id und dataset_id aus apiurl und urlDaten
    let resourceId = "";
    let datasetId = "";

    // Versuche resource_id aus apiurl zu extrahieren (CKAN Download-URL)
    if (typeof configdata.apiurl === "string") {
      const match = configdata.apiurl.match(/resource\/([a-f0-9-]{36})/i);
      if (match) resourceId = match[1];
      else {
        // Fallback: letzte UUID im Pfad
        const uuidMatch = configdata.apiurl.match(/[a-f0-9-]{36}/gi);
        if (uuidMatch) resourceId = uuidMatch[uuidMatch.length - 1];
      }
    }
    // dataset_id aus urlDaten extrahieren
    if (typeof configdata.urlDaten === "string") {
      const match = configdata.urlDaten.match(/dataset\/([a-zA-Z0-9-_]+)/);
      if (match) datasetId = match[1];
    }

    // CKAN-API-Basis aus der konfigurierten Daten-URL ableiten
    const ckanOrigin = new URL(configdata.apiurl).origin;

    // Hole Resource-Metadaten (direkt oder ueber den ODAS-Proxy)
    if (resourceId) {
      const resApiUrl = `${ckanOrigin}/api/3/action/resource_show?id=${resourceId}`;
      try {
        const resJson = await fetchOdasJson(resApiUrl, configdata);
        if (resJson.success && resJson.result) {
          resourceTitle = resJson.result.name || resJson.result.title || "";
          resourceDescription = resJson.result.description || "";
        }
      } catch (e) {
        console.warn("Fehler beim Laden der Resource-Metadaten:", e);
      }
    }

    // Hole Dataset-Metadaten (direkt oder ueber den ODAS-Proxy)
    if (datasetId) {
      const dsApiUrl = `${ckanOrigin}/api/3/action/package_show?id=${datasetId}`;
      try {
        const dsJson = await fetchOdasJson(dsApiUrl, configdata);
        if (dsJson.success && dsJson.result) {
          datasetTitle = dsJson.result.title || "";
        }
      } catch (e) {
        console.warn("Fehler beim Laden der Dataset-Metadaten:", e);
      }
    }
  } catch (e) {
    // Fehler ignorieren, Felder bleiben leer
    console.warn("Metadaten konnten nicht geladen werden:", e);
  }

  // --- Metadaten-Header-HTML ---
  const metaHeader = document.createElement("div");
  metaHeader.className = "mb-4 w-100 text-center";
  metaHeader.innerHTML = `
    <h2 class="fw-bold">${escapeHtml(resourceTitle || "Ressourcen-Titel")}</h2>
    <div class="mb-2">${escapeHtml(resourceDescription || "")}</div>
    <div class="mb-1">
      <span class="fw-bold">Datenbeschreibung (Open Data):</span>
      <a href="${escapeHtml(safeUrl(configdata.urlDaten) || "#")}" target="_blank" rel="noopener">
        ${escapeHtml(datasetTitle || "Datensatz")}
      </a>
    </div>
    <div class="mb-3">
      <span class="fw-bold">Daten (Open Data):</span>
      <a href="${escapeHtml(safeUrl(configdata.apiurl) || "#")}" target="_blank" rel="noopener">
        ${escapeHtml(resourceTitle || "Ressourcen-Titel")}
      </a>
    </div>
  `;
  startseiteContainer.appendChild(metaHeader);

  // Spinner-Element für das Laden (wird in infoRight platziert)
  const spinnerHtml = `
    <span id="data-spinner" style="display:none;vertical-align:middle;">
      <span class="spinner-border text-primary spinner-border-sm" role="status" style="width:1.2rem;height:1.2rem;">
        <span class="visually-hidden">Laden...</span>
      </span>
    </span>
  `;

  let contentContainer,
    rowAndChartContainer,
    flexRow,
    infoLeft,
    infoRight,
    chartDiv,
    updateInterval;

  // Funktion zum Rendern der Infoleiste und des Charts
  async function renderContent(data, lastMod) {
    // Erstelle Container nur beim ersten Aufruf
    if (!contentContainer) {
      // Info-Boxen für links und rechts
      infoLeft = document.createElement("div");
      infoLeft.className = "text-start";

      infoRight = document.createElement("div");
      infoRight.className = "text-end";

      flexRow = document.createElement("div");
      flexRow.className =
        "w-100 d-flex flex-row align-items-center justify-content-between gap-2 flex-wrap";
      flexRow.appendChild(infoLeft);
      flexRow.appendChild(infoRight);

      chartDiv = document.createElement("div");
      chartDiv.id = "vega-chart";
      chartDiv.className =
        "w-100 flex-grow-1 d-flex justify-content-center align-items-center";

      rowAndChartContainer = document.createElement("div");
      rowAndChartContainer.className = "w-100 d-flex flex-column gap-1";
      rowAndChartContainer.appendChild(flexRow);
      
      var kpiRow = document.createElement("div");
      kpiRow.id = "rt-kpi-row";
      kpiRow.className = "row g-3 mb-3";
      rowAndChartContainer.appendChild(kpiRow);
      rowAndChartContainer.appendChild(chartDiv);

      contentContainer = document.createElement("div");
      contentContainer.className =
        "d-flex flex-column flex-grow-1 w-100 h-100 gap-3 startseite-content";
      contentContainer.appendChild(rowAndChartContainer);

      var weitereDiv = document.createElement("div");
      weitereDiv.innerHTML = renderWeitereInfos(configdata);
      if (weitereDiv.innerHTML) contentContainer.appendChild(weitereDiv);
      var methodikDiv = document.createElement("div");
      methodikDiv.innerHTML = renderMethodikbox(configdata);
      if (methodikDiv.innerHTML) contentContainer.appendChild(methodikDiv);

      startseiteContainer.appendChild(contentContainer);
    }

    // Aktualisiere nur die Inhalte
    const datenpunktlimit = parseInt(configdata.datenpunktlimit) || 9999;
    const isLimited = data.length >= datenpunktlimit;
    const dateneinheit = configdata.dateneinheit;

    infoLeft.innerHTML = `
      <span class='fw-bold'>Anzeige:</span>
      <span>${isLimited ? "Letzte " : ""}${data.length} Datenpunkte${
      isLimited ? ` (Limit: ${escapeHtml(datenpunktlimit)})` : ""
    }</span>
    `;

    // Aktuellster Wert bestimmen (wie bisher: letzter Wert im Array, falls vorhanden)
    let latestValue = "unbekannt";
    if (Array.isArray(data) && data.length > 0) {
      const lastEntry = data[data.length - 1];
      latestValue =
        typeof lastEntry.value !== "undefined" ? lastEntry.value : "unbekannt";
    }

    infoRight.innerHTML = `
      <span class='fw-bold'>Aktueller Wert:</span>
      <span>${escapeHtml(latestValue)}${escapeHtml(dateneinheit)}</span>
      <span class='fw-bold ms-2'> Datum des Wertes:</span>
      <span>${escapeHtml(lastMod)}</span>
      ${spinnerHtml}
      <br><small id="rt-datenladung" class="text-muted"></small>
    `;

    var totalRecords = data.length;
    var categories = [...new Set(data.filter(function(d) { return d.category; }).map(function(d) { return d.category; }))].length;
    var latestVal = latestValue;
    
    var kpiRowEl = document.getElementById("rt-kpi-row");
    if (kpiRowEl) {
      kpiRowEl.innerHTML = '<div class="col-6 col-md-4"><div class="card border-primary h-100"><div class="card-body text-center py-3"><div class="fs-3 fw-bold text-primary">' + totalRecords + '</div><div class="text-muted small">Datenpunkte</div>' + kpiContext(configdata.kpiKontext1, "1") + '</div></div></div>' +
        '<div class="col-6 col-md-4"><div class="card border-info h-100"><div class="card-body text-center py-3"><div class="fs-3 fw-bold text-info">' + categories + '</div><div class="text-muted small">Kategorien</div>' + kpiContext(configdata.kpiKontext2, "2") + '</div></div></div>' +
        '<div class="col-6 col-md-4"><div class="card border-success h-100"><div class="card-body text-center py-3"><div class="fs-3 fw-bold text-success">' + escapeHtml(latestVal) + '</div><div class="text-muted small">Aktueller Wert</div>' + kpiContext(configdata.kpiKontext3, "3") + '</div></div></div>';
    }

    // Chart rendern
    const specs = {
      "Line Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "line",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Bar Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "bar",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Area Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "area",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Point Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "point",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Tick Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "tick",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Circle Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "circle",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Square Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "square",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      }),
      "Bar Chart Horizontal": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "bar",
        encoding: {
          y: { field: "date", type: "temporal" },
          x: { field: "value", type: "quantitative" },
        },
      }),
      "Text Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "text",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
          text: { field: "value", type: "quantitative" },
        },
      }),
      "Line with Color": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "line",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
          color: { field: "category", type: "nominal" },
        },
      }),
      "Stacked Area": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: { type: "area" },
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative", stack: "zero" },
          color: { field: "category", type: "nominal" },
        },
      }),
      "Stacked Bar": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "bar",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative", stack: "zero" },
          color: { field: "category", type: "nominal" },
        },
      }),
      "Layered Line+Point": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        layer: [
          {
            mark: "line",
            encoding: {
              x: { field: "date", type: "temporal" },
              y: { field: "value", type: "quantitative" },
            },
          },
          {
            mark: "point",
            encoding: {
              x: { field: "date", type: "temporal" },
              y: { field: "value", type: "quantitative" },
            },
          },
        ],
      }),
      "Trellis Bar": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "bar",
        encoding: {
          x: { field: "value", bin: true },
          y: { aggregate: "count" },
          column: { field: "category", type: "nominal" },
        },
      }),
      "Trellis Line": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "line",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
          column: { field: "category", type: "nominal" },
        },
      }),
      Histogram: (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "bar",
        encoding: {
          x: { field: "value", bin: true, type: "quantitative" },
          y: { aggregate: "count", type: "quantitative" },
        },
      }),
      "Aggregate Bar Chart": (data) => ({
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: { values: data },
        mark: "bar",
        encoding: {
          x: {
            timeUnit: "yearmonth",
            field: "date",
            type: "temporal",
            axis: { title: "Monat" },
          },
          y: {
            aggregate: "sum",
            field: "value",
            type: "quantitative",
            axis: { title: "Summe Value" },
          },
        },
      }),
    };

    const chartType = configdata.chartType || Object.keys(specs)[0];
    const specFn = specs[chartType];
    if (!specFn) throw new Error(`Unbekannter Chart-Typ: ${chartType}`);
    const spec = specFn(data);
    spec.width = "container";
    spec.height = 400;
    await loadVega();
    await vegaEmbed("#vega-chart", spec, {
      mode: "vega-lite",
      renderer: "canvas",
      actions: false,
    });
  }

  // --- CSV Parser Funktion ---
  // Liefert { rows, verworfen } — Zeilen ohne verwertbaren Messwert werden
  // gezählt statt stillschweigend als 0 in die Reihe zu wandern.
  function parseCSV(csvText) {
    const parsed = parseCsv(csvText);
    if (parsed.length < 2) return { rows: [], verworfen: 0 };

    const headers = parsed[0].map((h) => h.trim());
    const rows = [];
    let verworfen = 0;

    parsed.slice(1).forEach((values) => {
      const row = {};
      headers.forEach((header, index) => {
        const raw = (values[index] || "").trim();
        if (header === "value") {
          const num = parseFloat(raw.replace(",", "."));
          row[header] = Number.isFinite(num) ? num : null;
        } else {
          row[header] = raw;
        }
      });
      // Eine Zeile ohne Datum oder ohne lesbaren Messwert ist kein Datenpunkt.
      if (!row.date || row.value === null || row.value === undefined) {
        verworfen++;
        return;
      }
      rows.push(row);
    });

    return { rows, verworfen };
  }

  // Funktion zum Laden der Daten und Aktualisieren der Anzeige (über Proxy)
  async function loadAndRender() {
    // Spinner anzeigen (sofort ausblenden nach Laden)
    let spinnerElem;
    // Suche nach dem Spinner im aktuellen infoRight (kann sich bei jedem Render ändern)
    const findSpinner = () => {
      return startseiteContainer.querySelector("#data-spinner");
    };
    spinnerElem = findSpinner();
    if (spinnerElem) spinnerElem.style.display = "inline-block";

    try {
      // CSV-Daten laden: direkt oder ueber den ODAS-Proxy (proxyAktiv)
      const csvText = await fetchOdasResource(configdata.apiurl, configdata);
      const { rows: geparst, verworfen } = parseCSV(csvText);
      let data = geparst;

      if (verworfen > 0) {
        console.warn(
          `Realtimedataview: ${verworfen} Zeile(n) ohne verwertbaren Messwert übersprungen.`,
        );
      }

      // Datenpunkt-Limit anwenden
      const datenpunktlimit = parseInt(configdata.datenpunktlimit) || 9999; // Default: 9999 Punkte
      if (data.length > datenpunktlimit) {
        // Nimm nur die letzten X Datenpunkte
        data = data.slice(-datenpunktlimit);
      }

      // Datum des aktuellsten CSV-Datenpunkts ermitteln
      let lastMod = "unbekannt";
      if (data.length > 0) {
        const latestDate = data[data.length - 1].date;
        if (latestDate) {
          lastMod = new Date(latestDate).toLocaleString("de-DE");
        } else {
          lastMod = new Date().toLocaleString("de-DE");
        }
      } else {
        lastMod = new Date().toLocaleString("de-DE");
      }
      await renderContent(data, lastMod);

      if (data.length === 0) {
        const leer = document.createElement("div");
        leer.className = "alert alert-info text-center";
        leer.setAttribute("role", "alert");
        leer.textContent = "Keine Daten gefunden.";
        startseiteContainer.appendChild(leer);
      } else if (verworfen > 0) {
        const hinweis = document.createElement("div");
        hinweis.className = "alert alert-warning text-center";
        hinweis.setAttribute("role", "alert");
        hinweis.textContent =
          `${verworfen} Datenpunkt(e) der Datenquelle konnten nicht gelesen ` +
          "werden und fehlen in dieser Darstellung.";
        startseiteContainer.appendChild(hinweis);
      }

      var nowStr = new Date().toLocaleString("de-DE");
      var badge = document.getElementById("rt-datenladung");
      if (badge) badge.textContent = "Letzte Datenladung: " + nowStr;
    } catch (err) {
      const alert = document.createElement("div");
      alert.className = "alert alert-danger text-center";
      alert.textContent = `Fehler: ${err.message}`;
      startseiteContainer.appendChild(alert);
      console.error(err);
    } finally {
      // Spinner sofort ausblenden
      spinnerElem = findSpinner();
      if (spinnerElem) spinnerElem.style.display = "none";
    }
  }

  // Initiales Laden
  await loadAndRender();

  // Automatische Aktualisierung alle 10 Sekunden - nur auf der Startseite
  updateInterval = setInterval(() => {
    // Prüfe ob wir noch auf der Startseite sind
    if (enclosingHtmlDivElement.querySelector(".startseite-content")) {
      loadAndRender();
    }
  }, 10000);

  // Cleanup-Funktion für das Interval
  window.clearStartseiteInterval = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  };

  return null; // explizit null zurückgeben, kein Promise
}

/* ── Schale 4: escapeHtml ── */
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Laesst nur http- und https-URLs durch. Ohne diese Pruefung wuerde eine
// javascript:-URL aus Datenquelle oder Instanz-Konfiguration beim Klick
// ausgefuehrt.
function safeUrl(value = "") {
  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

/* ── Schale 4: Weiterführende Links ── */

  /* ── Schale 4: KPI Kontext ── */
  function kpiContext(kontext, id) {
    var text = String(kontext || "").trim();
    if (!text) return "";
    var targetId = "rt-kpi-kontext-" + id;
    return (
      '<button class="rt-kpi-info-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#' + targetId + '" ' +
      'aria-expanded="false" aria-controls="' + targetId + '" ' +
      'aria-label="Erklärung zu diesem Wert">' +
      '<span class="rt-kpi-info-icon" aria-hidden="true">ⓘ</span>' +
      "</button>" +
      '<div id="' + targetId + '" class="collapse">' +
      '<div class="rt-kpi-kontext">' + escapeHtml(text) + "</div>" +
      "</div>"
    );
  }

  /* ── Schale 4: Methodikbox ── */
  function renderMethodikbox(cfg) {
    var hinweis = ((cfg && cfg.datenquelleHinweis) || "").trim();
    var stand = ((cfg && cfg.datenStand) || "").trim();
    if (!hinweis && !stand) return "";
    var standHtml = stand
      ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
      : "";
    return (
      '<section class="rt-methodik mt-3">' +
      '<button class="rt-methodik-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#rt-methodik-body" ' +
      'aria-expanded="false" aria-controls="rt-methodik-body">' +
      '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
      '<span class="rt-methodik-chevron" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<div id="rt-methodik-body" class="collapse">' +
      '<div class="rt-methodik-content">' +
      standHtml +
      hinweis +
      "</div></div></section>"
    );
  }

function renderWeitereInfos(cfg) {
  var links = ((cfg && cfg.weiterfuehrendeLinks) || "").trim();
  if (!links) return "";
  return (
    '<section class="rt-weitere-infos mt-3">' +
    '<h2 class="h5 mb-2">Weitere Informationen</h2>' +
    '<div class="rt-weitere-infos-content">' +
    links +
    "</div></section>"
  );
}

/*
- Laedt Vega, Vega-Lite und Vega-Embed nacheinander und meldet erst dann fertig.
- Die Skripte haengen voneinander ab und muessen in dieser Reihenfolge geladen werden.
*/
let vegaLoadPromise = null;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const vorhanden = document.querySelector(`script[src="${src}"]`);
    if (vorhanden) {
      if (vorhanden.dataset.geladen === "ja") return resolve();
      vorhanden.addEventListener("load", () => resolve());
      vorhanden.addEventListener("error", () =>
        reject(new Error(`Skript konnte nicht geladen werden: ${src}`)),
      );
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.crossOrigin = "anonymous";
    el.onload = () => {
      el.dataset.geladen = "ja";
      resolve();
    };
    el.onerror = () =>
      reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
    document.head.appendChild(el);
  });
}

function loadVega() {
  if (typeof vegaEmbed !== "undefined") return Promise.resolve();
  if (vegaLoadPromise) return vegaLoadPromise;

  vegaLoadPromise = [
    "vendor/vega/vega.min.js",
    "vendor/vega/vega-lite.min.js",
    "vendor/vega/vega-embed.min.js",
  ].reduce(
    (kette, src) => kette.then(() => loadScriptOnce(src)),
    Promise.resolve(),
  );
  return vegaLoadPromise;
}

/*
- Vega wird bei Bedarf über loadVega() geladen, nicht mehr hier.
*/
function addToHead() {}
