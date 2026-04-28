/*
- Diese Funktion ist für die Inhalte der Startseite zuständig.
- @param {Object} configdata - Konfigurationsdaten (enthält apiurl)
- @param {HTMLElement} enclosingHtmlDivElement - Container für den Content
- @returns {null}
*/
function extractPathFromUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch (e) {
    return url;
  }
}

async function app(configdata = {}, enclosingHtmlDivElement) {
  // Bootstrap-Container und Flex
  enclosingHtmlDivElement.className =
    "container-xxl d-flex flex-column justify-content-center align-items-center p-0";
  enclosingHtmlDivElement.innerHTML = "";

  // Info-Box
  const infoBox = document.createElement("div");
  infoBox.className = "mb-4 text-center";
  enclosingHtmlDivElement.appendChild(infoBox);

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

    // CKAN API Endpunkt über Proxy
    const fullPath = window.location.pathname.replace(/\/+$/, "");

    // Hole Resource-Metadaten über Proxy
    if (resourceId) {
      const resApiUrl = `/api/3/action/resource_show?id=${resourceId}`;
      const resProxyEndpoint = `${fullPath}/odp-data?path=${resApiUrl}`;
      try {
        const resMeta = await fetch(resProxyEndpoint, { method: "POST" });
        if (resMeta.ok) {
          const resProxyData = await resMeta.json();
          const resJson = JSON.parse(resProxyData.content);
          if (resJson.success && resJson.result) {
            resourceTitle = resJson.result.name || resJson.result.title || "";
            resourceDescription = resJson.result.description || "";
          }
        }
      } catch (e) {
        console.warn("Fehler beim Laden der Resource-Metadaten:", e);
      }
    }

    // Hole Dataset-Metadaten über Proxy
    if (datasetId) {
      const dsApiUrl = `/api/3/action/package_show?id=${datasetId}`;
      const dsProxyEndpoint = `${fullPath}/odp-data?path=${dsApiUrl}`;
      try {
        const dsMeta = await fetch(dsProxyEndpoint, { method: "POST" });
        if (dsMeta.ok) {
          const dsProxyData = await dsMeta.json();
          const dsJson = JSON.parse(dsProxyData.content);
          if (dsJson.success && dsJson.result) {
            datasetTitle = dsJson.result.title || "";
          }
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
    <h2 class="fw-bold">${resourceTitle || "Ressourcen-Titel"}</h2>
    <div class="mb-2">${resourceDescription || ""}</div>
    <div class="mb-1">
      <span class="fw-bold">Datenbeschreibung (Open Data):</span>
      <a href="${configdata.urlDaten || "#"}" target="_blank" rel="noopener">
        ${datasetTitle || "Datensatz"}
      </a>
    </div>
    <div class="mb-3">
      <span class="fw-bold">Daten (Open Data):</span>
      <a href="${configdata.apiurl || "#"}" target="_blank" rel="noopener">
        ${resourceTitle || "Ressourcen-Titel"}
      </a>
    </div>
  `;
  enclosingHtmlDivElement.appendChild(metaHeader);

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
      rowAndChartContainer.appendChild(chartDiv);

      contentContainer = document.createElement("div");
      contentContainer.className =
        "d-flex flex-column flex-grow-1 w-100 h-100 gap-3 startseite-content";
      contentContainer.appendChild(rowAndChartContainer);

      enclosingHtmlDivElement.appendChild(contentContainer);
    }

    // Aktualisiere nur die Inhalte
    const datenpunktlimit = parseInt(configdata.datenpunktlimit) || 9999;
    const isLimited = data.length >= datenpunktlimit;
    const dateneinheit = configdata.dateneinheit;

    infoLeft.innerHTML = `
      <span class='fw-bold'>Anzeige:</span>
      <span>${isLimited ? "Letzte " : ""}${data.length} Datenpunkte${
      isLimited ? ` (Limit: ${datenpunktlimit})` : ""
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
      <span>${latestValue}${dateneinheit}</span>
      <span class='fw-bold ms-2'> Datum des Wertes:</span>
      <span>${lastMod}</span>
      ${spinnerHtml}
    `;

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
    await vegaEmbed("#vega-chart", spec, {
      mode: "vega-lite",
      renderer: "canvas",
      actions: false,
    });
  }

  // --- CSV Parser Funktion ---
  function parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row = {};

      headers.forEach((header, index) => {
        if (header === "date") {
          row[header] = values[index];
        } else if (header === "value") {
          row[header] = parseFloat(values[index]) || 0;
        } else {
          row[header] = values[index];
        }
      });

      data.push(row);
    }

    return data;
  }

  // Funktion zum Laden der Daten und Aktualisieren der Anzeige (über Proxy)
  async function loadAndRender() {
    // Spinner anzeigen (sofort ausblenden nach Laden)
    let spinnerElem;
    // Suche nach dem Spinner im aktuellen infoRight (kann sich bei jedem Render ändern)
    const findSpinner = () => {
      return enclosingHtmlDivElement.querySelector("#data-spinner");
    };
    spinnerElem = findSpinner();
    if (spinnerElem) spinnerElem.style.display = "inline-block";

    try {
      // CSV-Daten über Proxy laden
      const fullPath = window.location.pathname.replace(/\/+$/, "");
      const proxyEndpoint = `${fullPath}/odp-data?path=${extractPathFromUrl(
        configdata.apiurl
      )}`;
      const res = await fetch(proxyEndpoint, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const proxyData = await res.json();
      // CSV-Daten verarbeiten
      const csvText = proxyData.content;
      let data = parseCSV(csvText);

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
    } catch (err) {
      const alert = document.createElement("div");
      alert.className = "alert alert-danger text-center";
      alert.textContent = `Fehler: ${err.message}`;
      enclosingHtmlDivElement.appendChild(alert);
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

/*
- Lädt Vega, Vega-Lite und Vega-Embed ins <head>
*/
function addToHead() {
  [
    "https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js",
    "https://cdn.jsdelivr.net/npm/vega-lite@5/build/vega-lite.min.js",
    "https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js",
  ].forEach((src) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  });
}
