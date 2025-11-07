let volcanoes = [];
let table;

// VARIABILI PER I LIMITI E I MARGINI
let minLon, maxLon, minLat, maxLat;
const MIN_ELEV = -4000;
const MAX_ELEV = 6000;
const OUTER_MARGIN = 60; // Margine esterno laterale e superiore
const MARGIN_BOTTOM = 150; // Margine specifico per la parte inferiore (per la legenda)

let palette = [
  "#370617", "#6A040F", "#9D0208", "#D00000",
  "#DC2F02", "#E85D04", "#F48C06", "#FAA307", "#FFB539"
];

// variabile per tenere traccia del vulcano attualmente hovered
let hoveredVolcano = null;

function preload() {
  table = loadTable("volcanoes.csv", "csv", "header"); 
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  parseData();
  
  
  // Calcola i limiti geografici dinamicamente
  let allLon = volcanoes.map(v => v.lon);
  let allLat = volcanoes.map(v => v.lat);
  
  minLon = min(allLon);
  maxLon = max(allLon);
  minLat = min(allLat);
  maxLat = max(allLat);

  // Converto i colori della palette in oggetti p5.Color
  for (let i = 0; i < palette.length; i++) {
    palette[i] = color(palette[i]);
  }

  // Forza la prima esecuzione di draw
  redraw(); 
}

function parseData() {
  for (let r = 0; r < table.getRowCount(); r++) {
    // Recupero tutti i dati rilevanti, inclusi quelli per il tooltip
    let v_num = table.getString(r, "Volcano Number");
    let v_name = table.getString(r, "Volcano Name");
    let country = table.getString(r, "Country");
    let v_type = table.getString(r, "Type");
    let lat = float(table.getString(r, "Latitude"));
    let lon = float(table.getString(r, "Longitude"));
    let elevRaw = table.getString(r, "Elevation (m)");
    let elev = elevRaw === "" ? null : float(elevRaw);

    if (!isNaN(lat) && !isNaN(lon)) {
      volcanoes.push({ 
          v_num, v_name, country, v_type, lat, lon, 
          elev,
          elevRaw 
      });
    }
  }
}

function draw() {
  background(10); 
  noStroke();

  // Reset e rilevamento del vulcano più vicino
  hoveredVolcano = null;
  let maxDistance = Infinity; 

  // Primo ciclo: Proietta le posizioni e trova il vulcano hovered
  for (let v of volcanoes) {
    let pos = project(v.lat, v.lon);
    v.x = pos.x; 
    v.y = pos.y;
    
    let baseSize = v.elev !== null && !isNaN(v.elev)
      ? map(v.elev, MIN_ELEV, MAX_ELEV, 4, 10)
      : 6;

    let d = dist(mouseX, mouseY, v.x, v.y);
    
    // Identifica il vulcano hovered (deve essere all'interno e il più vicino)
    if (d < baseSize / 2 && d < maxDistance) {
        maxDistance = d;
        hoveredVolcano = v; 
    }
  }

  // Secondo ciclo: Disegno dei vulcani
  // Disegno prima i non-hovered per evitare che coprano l'hovered
  for (let v of volcanoes) {
    if (v === hoveredVolcano) continue; 
    drawInteractiveCircle(v, 1.0);
  }

  if (hoveredVolcano) {
    cursor("pointer");
    drawInteractiveCircle(hoveredVolcano, 1.5); // Ingrandito e Bianco
    drawTooltip(hoveredVolcano); // Tooltip
  } else {
    cursor("default");
  }

  drawHorizontalLegend();
}

function project(lat, lon) {
  // Mappatura X (margine OUTER_MARGIN a sinistra e a destra)
  let x = map(lon, minLon, maxLon, OUTER_MARGIN, width - OUTER_MARGIN);
  
  // Mappatura Y (0 in alto, MARGIN_BOTTOM in basso)
  let y = map(lat, minLat, maxLat, height - MARGIN_BOTTOM, OUTER_MARGIN); 
  return { x, y };
}

// Calcola il colore in base all'elevazione usando l'interpolazione della palette.
function getColorFromElevation(elev) {
  if (elev === null || isNaN(elev)) {
    return palette[0]; // Ritorna il colore più scuro per i dati mancanti
  }

  let t = map(elev, MIN_ELEV, MAX_ELEV, 0, palette.length - 1);
  t = constrain(t, 0, palette.length - 1);

  let i = floor(t);
  let frac = t - i;

  let c1 = palette[i];
  let c2 = palette[min(i + 1, palette.length - 1)];
  return lerpColor(c1, c2, frac);
}

//Se scaleFactor > 1.0, il pallino diventa bianco.
function drawInteractiveCircle(v, scaleFactor) {
    let size = v.elev !== null && !isNaN(v.elev)
      ? map(v.elev, MIN_ELEV, MAX_ELEV, 4, 10)
      : 6;
      
    // LOGICA HOVER: Se si passa il mouse (scaleFactor > 1.0) usa il bianco.
    if (scaleFactor > 1.0) {
        fill(255); // Bianco
    } else {
        let c = getColorFromElevation(v.elev);
        fill(c); // Colore basato sull'elevazione
    }

    // Disegna il cerchio con il fattore di scala applicato
    ellipse(v.x, v.y, size * scaleFactor, size * scaleFactor);
}

//Disegna una scheda informativa (tooltip) vicino al vulcano hovered.
function drawTooltip(v) {
  let tooltipX = mouseX + 15;
  let tooltipY = mouseY + 5;

  let name = v.v_name || "N/A";
  let country = v.country || "N/A";
  let elev = v.elevRaw === "" || v.elevRaw === null ? "N/A" : `${v.elevRaw} m`;
  let type = v.v_type || "N/A";
  let coords = `${v.lat.toFixed(2)}°, ${v.lon.toFixed(2)}°`;

  let tooltipText = 
`Volcan: ${name}
Country: ${country}
Elevation: ${elev}
Type: ${type}
Coords: ${coords}`;

  textSize(14);
  textAlign(LEFT, TOP);
  
  // Sfondo del tooltip (calcolo della larghezza per adattarsi al testo)
  let boxWidth = max(tooltipText.split('\n').map(line => textWidth(line))) + 20; 
  let boxHeight = 85;
  fill(0, 200); 
  noStroke();
  rect(tooltipX - 5, tooltipY - 5, boxWidth, boxHeight, 5); 

  // Testo del tooltip
  fill(255);
  text(tooltipText, tooltipX, tooltipY);
}

//Disegna la legenda orizzontale per l'elevazione.
function drawHorizontalLegend() {
  let legendWidth = 300;
  let legendHeight = 20;
  // Posiziona la legenda rispetto al margine inferiore
  let paddingBottom = MARGIN_BOTTOM - 40; 
  let x = (width - legendWidth) / 2;
  let y = height - legendHeight - paddingBottom;

  for (let i = 0; i < legendWidth; i++) {
    let elev = map(i, 0, legendWidth, MIN_ELEV, MAX_ELEV);
    let c = getColorFromElevation(elev);
    stroke(c);
    line(x + i, y, x + i, y + legendHeight);
  }

  noStroke();
  fill(255);
  textSize(12);
  textAlign(CENTER, TOP);
  text("Elevation (m)", width / 2, y + legendHeight + 5);

  // Etichette dei limiti
  textAlign(LEFT, TOP);
  text(MIN_ELEV, x, y + legendHeight + 20);
  
  textAlign(CENTER, TOP);
  let midElev = map(legendWidth / 2, 0, legendWidth, MIN_ELEV, MAX_ELEV);
  text(midElev.toFixed(0), x + legendWidth / 2, y + legendHeight + 20);
  
  textAlign(RIGHT, TOP);
  text(MAX_ELEV, x + legendWidth, y + legendHeight + 20);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Richiama draw per ridisegnare i vulcani sulla nuova dimensione
  redraw(); 
}