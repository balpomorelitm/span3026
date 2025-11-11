// ============================================
// GLOBAL VARIABLES AND STATE
// ============================================

let zoneData = {}; // <--- MODIFICADO
let featureDescriptions = {}; // <--- NUEVO
let map;
let mapLayers = {};
let currentMode = 'exploration';
let currentQuestion = null;
let selectedZones = new Set();
let adminUnitToZone = {}; // Reverse lookup cache

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initializeMap();
    setupEventListeners();
    buildReverseIndex();
});

// ============================================
// CORE FUNCTION: Data Loading
// ============================================

async function loadData() {
    try {
        const response = await fetch('linguistic_data.json');
        const rawData = await response.json(); // <--- MODIFICADO
        
        zoneData = rawData.zones; // <--- NUEVO
        featureDescriptions = rawData.feature_descriptions; // <--- NUEVO

        console.log('Linguistic data loaded:', Object.keys(zoneData).length, 'zones');
    } catch (error) {
        console.error('Error loading linguistic data:', error);
        alert('Error al cargar los datos lingüísticos. Por favor, recarga la página.');
    }
}

// ============================================
// CORE FUNCTION: Reverse Lookup
// ============================================

function buildReverseIndex() {
    // Build the adminUnitToZone lookup table
    for (const [zoneKey, data] of Object.entries(zoneData)) { // <--- MODIFICADO (zoneData)
        for (const adminUnit of data.admin_units) {
            adminUnitToZone[adminUnit] = zoneKey;
        }
    }
    console.log('Reverse index built:', Object.keys(adminUnitToZone).length, 'admin units');
}

/**
 * CRITICAL FUNCTION: Reverse lookup from adminUnitID to zone data
 * @param {string} adminUnitID - The admin unit code (e.g., "AR", "ES-AN")
 * @returns {object|null} - The zone object or null if not found
 */
function getZoneData(adminUnitID) {
    const zoneKey = adminUnitToZone[adminUnitID];
    if (zoneKey) {
        return {
            key: zoneKey,
            ...zoneData[zoneKey] // <--- MODIFICADO (zoneData)
        };
    }
    return null;
}

// ============================================
// MAP INITIALIZATION
// ============================================

function initializeMap() {
    // Initialize Leaflet map
    map = L.map('map', {
        center: [0, -60],
        zoom: 3,
        minZoom: 2,
        maxZoom: 6
    });

    // Add base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 0.3
    }).addTo(map);

    // Load and add GeoJSON for countries and Spanish regions
    loadGeoJSONData();
}

async function loadGeoJSONData() {
    // For this implementation, we'll use a simplified approach with country boundaries
    // In production, you'd load a proper GeoJSON with Spanish regions included

    try {
        const response = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        const worldGeoJSON = await response.json();

        // Filter to include only relevant Spanish-speaking countries
        const relevantCountries = ['ARG', 'BOL', 'CHL', 'COL', 'CRI', 'CUB', 'DOM', 'ECU', 
                                   'SLV', 'GNQ', 'GTM', 'HND', 'MEX', 'NIC', 'PAN', 'PRY', 
                                   'PER', 'PHL', 'PRI', 'ESP', 'URY', 'VEN'];

        worldGeoJSON.features.forEach(feature => {
            const countryCode = feature.id;
            const iso2 = getISO2Code(countryCode);

            if (iso2) {
                const layer = L.geoJSON(feature, {
                    style: {
                        fillColor: '#e0e0e0',
                        fillOpacity: 0.6,
                        color: '#666',
                        weight: 1
                    },
                    onEachFeature: (feature, layer) => {
                        layer.adminUnitID = iso2;
                        layer.on({
                            click: (e) => handleMapClick(e, iso2),
                            mouseover: highlightFeature,
                            mouseout: resetHighlight
                        });
                    }
                }).addTo(map);

                mapLayers[iso2] = layer;
            }
        });

        // Add Spanish regions as simplified overlays
        addSpanishRegions();

        // Add custom Caribbean coastal zones overlays
        addCaribbeanCoastalZones();

    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

function getISO2Code(iso3) {
    const mapping = {
        'ARG': 'AR', 'BOL': 'BO', 'CHL': 'CL', 'COL': 'CO', 'CRI': 'CR',
        'CUB': 'CU', 'DOM': 'DO', 'ECU': 'EC', 'SLV': 'SV', 'GNQ': 'GQ',
        'GTM': 'GT', 'HND': 'HN', 'MEX': 'MX', 'NIC': 'NI', 'PAN': 'PA',
        'PRY': 'PY', 'PER': 'PE', 'PHL': 'PH', 'ESP': 'ES', 'URY': 'UY',
        'VEN': 'VE'
    };
    return mapping[iso3];
}

function addSpanishRegions() {
    // Simplified: treat Spain as regions
    // In production, load actual region boundaries
    const spainLayer = mapLayers['ES'];
    if (spainLayer) {
        if (!map.getPane('spanishRegions')) {
            map.createPane('spanishRegions');
            map.getPane('spanishRegions').style.zIndex = 650;
            map.getPane('spanishRegions').style.pointerEvents = 'auto';
        }

        // Create clickable zones for Spanish regions
        // This is a simplified version - ideally load real region GeoJSON
        const regions = [
            { code: 'ES-AN', name: 'Andalucía', coords: [37.5, -4.5] },
            { code: 'ES-MD', name: 'Madrid', coords: [40.4, -3.7] },
            { code: 'ES-CN', name: 'Canarias', coords: [28.3, -16.5] }
        ];

        regions.forEach(region => {
            const marker = L.circleMarker(region.coords, {
                pane: 'spanishRegions',
                radius: 8,
                fillColor: '#e0e0e0',
                fillOpacity: 0.8,
                color: '#666',
                weight: 2
            }).addTo(map);

            marker.adminUnitID = region.code;
            marker.bindTooltip(region.name);
            marker.on('click', (e) => handleMapClick(e, region.code));
            marker.on('mouseover', (e) => highlightFeature(e));
            marker.on('mouseout', (e) => resetHighlight(e));

            mapLayers[region.code] = marker;
        });
    }
}

function addCaribbeanCoastalZones() {
    if (!map.getPane('caribbeanZones')) {
        map.createPane('caribbeanZones');
        map.getPane('caribbeanZones').style.zIndex = 645;
        map.getPane('caribbeanZones').style.pointerEvents = 'auto';
    }

    const coastalZones = [
        {
            code: 'CO-CAR',
            name: 'Costa Caribe de Colombia',
            coords: [10.9, -75.1]
        },
        {
            code: 'VE-CAR',
            name: 'Litoral Caribe de Venezuela',
            coords: [10.4, -66.8]
        }
    ];

    coastalZones.forEach(zone => {
        const marker = L.circleMarker(zone.coords, {
            pane: 'caribbeanZones',
            radius: 8,
            fillColor: '#e0e0e0',
            fillOpacity: 0.8,
            color: '#666',
            weight: 2
        }).addTo(map);

        marker.adminUnitID = zone.code;
        marker.bindTooltip(zone.name);
        marker.on('click', (e) => handleMapClick(e, zone.code));
        marker.on('mouseover', (e) => highlightFeature(e));
        marker.on('mouseout', (e) => resetHighlight(e));

        mapLayers[zone.code] = marker;
    });
}

// ============================================
// MAP INTERACTION HANDLERS
// ============================================

function handleMapClick(e, adminUnitID) {
    L.DomEvent.stopPropagation(e);

    switch(currentMode) {
        case 'exploration':
            handleExplorationClick(adminUnitID);
            break;
        case 'filter':
            // In filter mode, clicks just show info
            handleExplorationClick(adminUnitID);
            break;
        case 'challenge':
            handleChallengeClick(adminUnitID);
            break;
    }
}

function highlightFeature(e) {
    const layer = e.target;
    if (layer.setStyle) {
        if (!layer._hoverStyleBackup) {
            layer._hoverStyleBackup = {
                color: layer.options.color,
                weight: layer.options.weight,
                fillColor: layer.options.fillColor,
                fillOpacity: layer.options.fillOpacity
            };
        }

        const newWeight = (layer.options.weight || 1) + 1;
        const newFillOpacity = Math.min(1, (layer.options.fillOpacity || 0.6) + 0.2);

        layer.setStyle({
            color: '#667eea',
            weight: newWeight,
            fillColor: layer.options.fillColor,
            fillOpacity: newFillOpacity
        });
        if (layer.bringToFront) {
            layer.bringToFront();
        }
    }
}

function resetHighlight(e) {
    const layer = e.target;
    if (currentMode !== 'challenge' && layer.setStyle && layer._hoverStyleBackup) {
        layer.setStyle(layer._hoverStyleBackup);
        layer._hoverStyleBackup = null;
    }
}

// ============================================
// MODE 1: EXPLORATION MODE
// ============================================

function handleExplorationClick(adminUnitID) {
    const data = getZoneData(adminUnitID); // <--- MODIFICADO (data)

    if (data) { // <--- MODIFICADO (data)
        displayZoneInfo(data); // <--- MODIFICADO (data)
    } else {
        document.getElementById('zoneInfo').innerHTML = 
            '<p style="color: #999;">Esta región no está incluida en los datos lingüísticos.</p>';
    }
}

function displayZoneInfo(data) { // <--- MODIFICADO (data)
    const featureLabels = {
        seseo: 'Seseo', yeismo: 'Yeísmo', aspiracion_s: 'Aspiración de /s/',
        aspiracion_j: 'Aspiración de /x/', perdida_d: 'Pérdida de /d/', lambdacismo: 'Lambdacismo',
        ustedeo: 'Ustedeo', uso_tu: 'Uso de tú', uso_tu_vos: 'Uso de tú y vos',
        uso_vos: 'Uso de vos', indefinido_vs_perfecto: 'Preferencia por indefinido',
        pronombre_sujeto: 'Pronombre sujeto obligatorio', queismo: 'Queísmo',
        dequeismo: 'Dequeísmo', adj_por_adv: 'Adjetivo por adverbio',
        verbos_reflexivos: 'Verbos reflexivos distintivos'
    };

    const getFeatureBadge = (value) => {
        if (value === 1) return '<span class="feature-badge present">Presente</span>';
        if (value === 0) return '<span class="feature-badge absent">Ausente</span>';
        if (value === 2) return '<span class="feature-badge variable">Variable</span>';
        return '<span class="feature-badge">—</span>';
    };

    let featuresHTML = '<div class="features-grid">';
    for (const [key, value] of Object.entries(data.features)) { // <--- MODIFICADO (data.features)
        featuresHTML += `
            <div class="feature-item">
                <span class="feature-name">${featureLabels[key] || key}</span>
                ${getFeatureBadge(value)}
            </div>
        `;
    }
    featuresHTML += '</div>';

    const html = `
        <div class="zone-name">${data.nombre}</div> <div class="info-section">
            <div class="info-label">Rasgos Fonológicos y Gramaticales</div>
            <div class="info-content">
                ${featuresHTML}
            </div>
        </div>

        <div class="info-section">
            <div class="info-label">Sustrato Lingüístico</div>
            <div class="info-content">${data.sustrato || 'No especificado'}</div> </div>

        ${data.adstrato ? ` <div class="info-section">
                <div class="info-label">Adstrato</div>
                <div class="info-content">${data.adstrato}</div> </div>
        ` : ''}
    `;

    document.getElementById('zoneInfo').innerHTML = html;
}

// ============================================
// MODE 2: FILTER MODE
// ============================================

function applyFilter(featureKey) {
    if (!featureKey) {
        resetMapColors();
        document.getElementById('filterInfo').innerHTML = '';
        return;
    }

    // --- (BLOQUE NUEVO) OBTENER Y MOSTRAR DESCRIPCIÓN ---
    const descriptionObj = featureDescriptions[featureKey];
    let descriptionHTML = '';
    if (descriptionObj) {
        descriptionHTML = `
            <div class="info-section">
                <div class="info-label" style="font-size: 1.1em; color: #667eea;">${descriptionObj.nombre}</div>
                <div class="info-content" style="line-height: 1.5; font-size: 0.95em;">
                    ${descriptionObj.descripcion}
                </div>
            </div>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        `;
    }
    // --- (FIN BLOQUE NUEVO) ---

    // Collect statistics
    let presentZones = [];
    let absentZones = [];
    let variableZones = [];

    // Iterate through all zones and color accordingly
    for (const [zoneKey, data] of Object.entries(zoneData)) { // <--- MODIFICADO (zoneData)
        const featureValue = data.features[featureKey]; // <--- MODIFICADO (data)
        let color;

        if (featureValue === 1) {
            color = '#48bb78';
            presentZones.push(data.nombre); // <--- MODIFICADO (data)
        } else if (featureValue === 0) {
            color = '#f56565';
            absentZones.push(data.nombre); // <--- MODIFICADO (data)
        } else if (featureValue === 2) {
            color = '#ecc94b';
            variableZones.push(data.nombre); // <--- MODIFICADO (data)
        }

        // Color all admin units in this zone
        for (const adminUnit of data.admin_units) { // <--- MODIFICADO (data)
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle({
                    fillColor: color,
                    fillOpacity: 0.7,
                    color: '#333',
                    weight: 1
                });
            }
        }
    }

    // Display statistics
    let statsHTML = `
        <div class="info-section">
            <div class="info-label">Distribución del Rasgo</div>
        </div>
    `;

    if (presentZones.length > 0) {
        statsHTML += `
            <div class="info-section">
                <div class="info-label" style="color: #48bb78;">✓ Presente en:</div>
                <div class="info-content">${presentZones.join(', ')}</div>
            </div>
        `;
    }

    if (variableZones.length > 0) {
        statsHTML += `
            <div class="info-section">
                <div class="info-label" style="color: #d69e2e;">~ Variable en:</div>
                <div class="info-content">${variableZones.join(', ')}</div>
            </div>
        `;
    }

    if (absentZones.length > 0) {
        statsHTML += `
            <div class="info-section">
                <div class="info-label" style="color: #f56565;">✗ Ausente en:</div>
                <div class="info-content">${absentZones.join(', ')}</div>
            </div>
        `;
    }

    // <--- MODIFICADO: Añade la descripción al principio ---
    document.getElementById('filterInfo').innerHTML = descriptionHTML + statsHTML;
}

function resetMapColors() {
    for (const layer of Object.values(mapLayers)) {
        if (layer.setStyle) {
            layer.setStyle({
                fillColor: '#e0e0e0',
                fillOpacity: 0.6,
                color: '#666',
                weight: 1
            });
        }
    }
}

// ============================================
// MODE 3: CHALLENGE MODE
// ============================================

function generateQuestion() {
    // Reset state
    selectedZones.clear();
    resetMapColors();
    document.getElementById('resultMessage').innerHTML = '';
    document.getElementById('challengeInfo').innerHTML = '';
    document.getElementById('checkAnswerBtn').disabled = false;

    // Pick a random feature
    const features = [
        'seseo', 'yeismo', 'aspiracion_s', 'aspiracion_j', 'perdida_d',
        'lambdacismo', 'ustedeo', 'uso_vos', 'indefinido_vs_perfecto',
        'pronombre_sujeto', 'queismo', 'dequeismo'
    ];

    // Obtener la etiqueta del objeto de descripciones
    const randomFeature = features[Math.floor(Math.random() * features.length)];
    const featureLabel = featureDescriptions[randomFeature] ? featureDescriptions[randomFeature].nombre : randomFeature;

    // Find all zones with this feature (value = 1)
    const correctZones = [];
    for (const [zoneKey, data] of Object.entries(zoneData)) { // <--- MODIFICADO (zoneData)
        if (data.features[randomFeature] === 1) { // <--- MODIFICADO (data)
            correctZones.push(zoneKey);
        }
    }

    if (correctZones.length === 0) {
        // Try another feature
        generateQuestion();
        return;
    }

    currentQuestion = {
        feature: randomFeature,
        featureLabel: featureLabel, // <--- MODIFICADO
        correctZones: correctZones
    };

    const questionHTML = `
        <div class="question-box">
            <div class="question-text">Selecciona todas las zonas que tienen:</div>
            <div class="question-feature">${currentQuestion.featureLabel}</div>
        </div>
    `;

    document.getElementById('questionBox').innerHTML = questionHTML;
}

function handleChallengeClick(adminUnitID) {
    if (!currentQuestion) {
        return;
    }

    const data = getZoneData(adminUnitID); // <--- MODIFICADO (data)
    if (!data) { // <--- MODIFICADO (data)
        return;
    }

    const zoneKey = data.key; // <--- MODIFICADO (data)

    // Toggle selection
    if (selectedZones.has(zoneKey)) {
        selectedZones.delete(zoneKey);
        // Color back to neutral
        for (const adminUnit of data.admin_units) { // <--- MODIFICADO (data)
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle({
                    fillColor: '#e0e0e0',
                    fillOpacity: 0.6,
                    color: '#666',
                    weight: 1
                });
            }
        }
    } else {
        selectedZones.add(zoneKey);
        // Color as selected
        for (const adminUnit of data.admin_units) { // <--- MODIFICADO (data)
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle({
                    fillColor: '#667eea',
                    fillOpacity: 0.7,
                    color: '#333',
                    weight: 2
                });
            }
        }
    }

    // Show selection info
    displaySelectionInfo();
}

function displaySelectionInfo() {
    const selectedNames = Array.from(selectedZones).map(key => zoneData[key].nombre); // <--- MODIFICADO (zoneData)
    const html = `
        <div class="info-section">
            <div class="info-label">Zonas Seleccionadas (${selectedZones.size})</div>
            <div class="info-content">
                ${selectedNames.length > 0 ? selectedNames.join(', ') : 'Ninguna'}
            </div>
        </div>
    `;
    document.getElementById('challengeInfo').innerHTML = html;
}

function checkAnswer() {
    if (!currentQuestion) {
        return;
    }

    const correctZones = new Set(currentQuestion.correctZones);
    const userZones = selectedZones;

    // Calculate correct and incorrect
    const correctSelections = new Set();
    const missedZones = new Set();
    const wrongSelections = new Set();

    for (const zone of correctZones) {
        if (userZones.has(zone)) {
            correctSelections.add(zone);
        } else {
            missedZones.add(zone);
        }
    }

    for (const zone of userZones) {
        if (!correctZones.has(zone)) {
            wrongSelections.add(zone);
        }
    }

    const isCorrect = wrongSelections.size === 0 && missedZones.size === 0;

    // Color the map
    resetMapColors();

    // Color correct zones green
    for (const zoneKey of correctZones) {
        const data = zoneData[zoneKey]; // <--- MODIFICADO (zoneData)
        for (const adminUnit of data.admin_units) { // <--- MODIFICADO (data)
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle({
                    fillColor: '#48bb78',
                    fillOpacity: 0.7,
                    color: '#2f855a',
                    weight: 2
                });
            }
        }
    }

    // Color wrong selections red
    for (const zoneKey of wrongSelections) {
        const data = zoneData[zoneKey]; // <--- MODIFICADO (zoneData)
        for (const adminUnit of data.admin_units) { // <--- MODIFICADO (data)
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle({
                    fillColor: '#f56565',
                    fillOpacity: 0.7,
                    color: '#c53030',
                    weight: 2
                });
            }
        }
    }

    // Display result
    let resultHTML;
    if (isCorrect) {
        resultHTML = '<div class="result-message success">¡Correcto! Has identificado todas las zonas.</div>';
    } else {
        const correctNames = Array.from(correctZones).map(k => zoneData[k].nombre); // <--- MODIFICADO (zoneData)
        const wrongNames = Array.from(wrongSelections).map(k => zoneData[k].nombre); // <--- MODIFICADO (zoneData)

        resultHTML = '<div class="result-message error">Respuesta incorrecta</div>';
        resultHTML += `
            <div class="info-section">
                <div class="info-label" style="color: #48bb78;">✓ Respuestas correctas:</div>
                <div class="info-content">${correctNames.join(', ')}</div>
            </div>
        `;

        if (wrongNames.length > 0) {
            resultHTML += `
                <div class="info-section">
                    <div class="info-label" style="color: #f56565;">✗ Selecciones incorrectas:</div>
                    <div class="info-content">${wrongNames.join(', ')}</div>
                </div>
            `;
        }
    }

    document.getElementById('resultMessage').innerHTML = resultHTML;
    document.getElementById('checkAnswerBtn').disabled = true;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Mode switching
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            switchMode(mode);
        });
    });

    // Feature filter
    document.getElementById('featureSelect').addEventListener('change', (e) => {
        applyFilter(e.target.value);
    });

    // Challenge mode buttons
    document.getElementById('getQuestionBtn').addEventListener('click', generateQuestion);
    document.getElementById('checkAnswerBtn').addEventListener('click', checkAnswer);
}

function switchMode(mode) {
    currentMode = mode;

    // Update button states
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show/hide panels
    document.getElementById('explorationPanel').style.display = mode === 'exploration' ? 'block' : 'none';
    document.getElementById('filterPanel').style.display = mode === 'filter' ? 'block' : 'none';
    document.getElementById('challengePanel').style.display = mode === 'challenge' ? 'block' : 'none';
    document.getElementById('filterControls').style.display = mode === 'filter' ? 'flex' : 'none';

    // Reset state
    resetMapColors();
    selectedZones.clear();
    currentQuestion = null;

    if (mode === 'exploration') {
        document.getElementById('zoneInfo').innerHTML = '';
    } else if (mode === 'filter') {
        document.getElementById('featureSelect').value = '';
        document.getElementById('filterInfo').innerHTML = '';
    } else if (mode === 'challenge') {
        document.getElementById('questionBox').innerHTML = '<p style="color: #999;">Haz clic en "Generar Pregunta" para comenzar.</p>';
        document.getElementById('resultMessage').innerHTML = '';
        document.getElementById('challengeInfo').innerHTML = '';
    }
}
