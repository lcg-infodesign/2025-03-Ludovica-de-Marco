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
  // Assicurati che il file 'volcanoes.csv' sia nella stessa cartella
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
}

function parseData() {
  for (let r = 0; r < table.getRowCount(); r++) {
    // Recupero tutti i dati rilevanti
    let v_num = table.getString(r, "Volcano Number");
    let v_name = table.getString(r, "Volcano Name");
    let country = table.getString(r, "Country");
    let v_type = table.getString(r, "Type");
    let lat = float(table.getString(r, "Latitude"));
    let lon = float(table.getString(r, "Longitude"));
    let elevRaw = table.getString(r, "Elevation (m)");
    let elev = elevRaw === "" ? null : float(elevRaw);
    let status = table.getString(r, "Status"); 
    let lastEruption = table.getString(r, "Last Known Eruption"); // Campo per l'animazione D1

    if (!isNaN(lat) && !isNaN(lon)) {
      volcanoes.push({ 
          v_num, v_name, country, v_type, lat, lon, 
          elev,
          elevRaw,
          status,
          lastEruption 
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
  
  // Mappatura Y (OUTER_MARGIN in alto, MARGIN_BOTTOM in basso)
  let y = map(lat, minLat, maxLat, height - MARGIN_BOTTOM, OUTER_MARGIN); 
  return { x, y };
}

// Calcola il colore in base all'elevazione usando l'interpolazione della palette.
function getColorFromElevation(elev) {
  if (elev === null || isNaN(elev)) {
    return palette[0]; 
  }

  let t = map(elev, MIN_ELEV, MAX_ELEV, 0, palette.length - 1);
  t = constrain(t, 0, palette.length - 1);

  let i = floor(t);
  let frac = t - i;

  let c1 = palette[i];
  let c2 = palette[min(i + 1, palette.length - 1)];
  return lerpColor(c1, c2, frac);
}

//Funzione per disegnare il cerchio del vulcano con interattività e animazione.
function drawInteractiveCircle(v, scaleFactor) {
    let baseSize = v.elev !== null && !isNaN(v.elev)
      ? map(v.elev, MIN_ELEV, MAX_ELEV, 4, 10)
      : 6;
      
    let currentSize = baseSize * scaleFactor;
    
    // CONDIZIONE PER L'ANIMAZIONE: Attiva l'effetto SOLTANTO se l'ultima eruzione è D1 E non è in hover
    const isRecentlyActive = v.lastEruption === "D1";

    if (isRecentlyActive && scaleFactor === 1.0) {
        let pulse = 0.5 + 0.5 * sin(frameCount * 0.15); 
        let baseColor = getColorFromElevation(v.elev);

        // --- Disegno dell'alone luminoso e cangiante (PALLA DI FUOCO) ---
        drawingContext.filter = "blur(8px)"; // Filtro di sfocatura
        
        // Cerchio più esterno (il glow maggiore)
        let outerGlowColor = lerpColor(baseColor, color(255, 200, 0, 150), pulse * 0.8); 
        fill(outerGlowColor);
        ellipse(v.x, v.y, currentSize * (2.5 + pulse * 0.8), currentSize * (2.5 + pulse * 0.8)); 

        // Cerchio intermedio
        let midGlowColor = lerpColor(baseColor, color(255, 150, 0, 200), pulse * 0.5); 
        fill(midGlowColor);
        ellipse(v.x, v.y, currentSize * (1.8 + pulse * 0.5), currentSize * (1.8 + pulse * 0.5)); 

        drawingContext.filter = "none"; // Disattiva il blur prima del nucleo

        // Cerchio interno (il nucleo)
        let innerColor = lerpColor(baseColor, color(255, 255, 0), pulse * 0.3); 
        innerColor.setAlpha(255); 
        fill(innerColor);
        ellipse(v.x, v.y, currentSize * (1.0 + pulse * 0.2), currentSize * (1.0 + pulse * 0.2)); 
        
        drawingContext.filter = "none"; 

    } else {
        // LOGICA HOVER / VULCANI NON ANIMATI
        if (scaleFactor > 1.0) {
            fill(255); // Bianco in hover
        } else {
            let c = getColorFromElevation(v.elev);
            fill(c); // Colore base
        }
        // Disegna il cerchio normale (o bianco per hover)
        ellipse(v.x, v.y, currentSize, currentSize);
    }
}

//Disegna una scheda informativa (tooltip) vicino al vulcano hovered con gestione dei bordi.
function drawTooltip(v) {
  let name = v.v_name || "N/A";
  let country = v.country || "N/A";
  let elev = v.elevRaw === "" || v.elevRaw === null ? "N/A" : `${v.elevRaw} m`;
  let type = v.v_type || "N/A";
  let status = v.status || "N/A"; 

  let tooltipText = 
`Volcan: ${name}
Country: ${country}
Elevation: ${elev}
Type: ${type}
Status: ${status}`;

  textSize(14);
  textAlign(LEFT, TOP);
  
  // Calcolo della larghezza e altezza del box
  let boxWidth = max(tooltipText.split('\n').map(line => textWidth(line))) + 20; 
  let boxHeight = 85;

  let tooltipX;
  let tooltipY;
  const margin = 15; // Margine tra cursore e box

  // 1. GESTIONE POSIZIONE X (BORDO DESTRO)
  // Se il mouse è troppo vicino al bordo destro (mouseY + larghezza del box > larghezza totale)
  if (mouseX + boxWidth + margin + 5 > width) {
      // Disegna il tooltip A SINISTRA del cursore
      tooltipX = mouseX - margin - boxWidth;
  } else {
      // Disegna il tooltip A DESTRA del cursore (default)
      tooltipX = mouseX + margin;
  }
  
  // GESTIONE POSIZIONE Y (BORDO INFERIORE)
  // Se il mouse è troppo vicino al bordo inferiore (mouseY + altezza del box > altezza totale)
  if (mouseY + boxHeight + margin > height) {
      // Disegna il tooltip SOPRA il cursore
      tooltipY = mouseY - margin - boxHeight;
  } else {
      // Disegna il tooltip SOTTO il cursore (default)
      tooltipY = mouseY + margin;
  }
  
  
  // Sfondo del tooltip (Nero semi-trasparente)
  fill(0, 200); 
  noStroke();
  
  // Disegna il rettangolo usando le coordinate aggiustate
  rect(tooltipX - 5, tooltipY - 5, boxWidth, boxHeight, 5); 

  // Testo del tooltip (Bianco)
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