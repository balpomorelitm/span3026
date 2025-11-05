// ============================================
// GLOBAL VARIABLES AND STATE
// ============================================

let linguisticData = {};
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
        linguisticData = await response.json();
        console.log('Linguistic data loaded:', Object.keys(linguisticData).length, 'zones');
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
    for (const [zoneKey, zoneData] of Object.entries(linguisticData)) {
        for (const adminUnit of zoneData.admin_units) {
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
            ...linguisticData[zoneKey]
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
        center: [20, -20],
        zoom: 3,
        minZoom: 2,
        maxZoom: 8
    });

    // Add base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 0.3
    }).addTo(map);

    // Load GeoJSON data
    loadGeoJSONData();
}

async function loadGeoJSONData() {
    try {
        // Load world countries first
        await loadWorldCountries();

        // Then load Spanish autonomous communities
        await loadSpanishRegions();

        console.log('Map data loaded successfully');
    } catch (error) {
        console.error('Error loading map data:', error);
        alert('Error al cargar los datos del mapa. Algunas regiones pueden no estar disponibles.');
    }
}

// ============================================
// LOAD WORLD COUNTRIES
// ============================================

async function loadWorldCountries() {
    const response = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
    const worldGeoJSON = await response.json();

    // ISO3 to ISO2 mapping
    const iso3to2 = {
        'ARG': 'AR', 'BOL': 'BO', 'CHL': 'CL', 'COL': 'CO', 'CRI': 'CR',
        'CUB': 'CU', 'DOM': 'DO', 'ECU': 'EC', 'SLV': 'SV', 'GNQ': 'GQ',
        'GTM': 'GT', 'HND': 'HN', 'MEX': 'MX', 'NIC': 'NI', 'PAN': 'PA',
        'PRY': 'PY', 'PER': 'PE', 'PHL': 'PH', 'ESP': 'ES', 'URY': 'UY',
        'VEN': 'VE', 'PRI': 'PR'
    };

    worldGeoJSON.features.forEach(feature => {
        const iso3 = feature.id;
        const iso2 = iso3to2[iso3];

        if (iso2 && iso2 !== 'ES') {  // Skip Spain, we'll load it separately with regions
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
}

// ============================================
// LOAD SPANISH AUTONOMOUS COMMUNITIES
// ============================================

async function loadSpanishRegions() {
    try {
        // Option 1: Load from Opendatasoft
        const response = await fetch('https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-spain-comunidad-autonoma/exports/geojson?lang=es&timezone=Europe%2FBerlin');
        const spainGeoJSON = await response.json();

        // Mapping from official names to our codes
        const regionCodeMap = {
            'Galicia': 'ES-GA',
            'Principado de Asturias': 'ES-AS',
            'Cantabria': 'ES-CB',
            'País Vasco': 'ES-PV',
            'Comunidad Foral de Navarra': 'ES-NC',
            'La Rioja': 'ES-RI',
            'Aragón': 'ES-AR',
            'Cataluña': 'ES-CT',
            'Comunidad Valenciana': 'ES-VC',
            'Región de Murcia': 'ES-MC',
            'Castilla y León': 'ES-CL',
            'Comunidad de Madrid': 'ES-MD',
            'Castilla-La Mancha': 'ES-CM',
            'Extremadura': 'ES-EX',
            'Andalucía': 'ES-AN',
            'Illes Balears': 'ES-IB',
            'Canarias': 'ES-CN',
            'Ceuta': 'ES-CE',
            'Melilla': 'ES-ML'
        };

        spainGeoJSON.features.forEach(feature => {
            const regionName = feature.properties.cca_name_es || feature.properties.name;
            const adminCode = regionCodeMap[regionName];

            if (adminCode) {
                const layer = L.geoJSON(feature, {
                    style: {
                        fillColor: '#e0e0e0',
                        fillOpacity: 0.6,
                        color: '#666',
                        weight: 1
                    },
                    onEachFeature: (feature, layer) => {
                        layer.adminUnitID = adminCode;
                        layer.bindTooltip(regionName, {
                            permanent: false,
                            direction: 'center',
                            className: 'region-tooltip'
                        });
                        layer.on({
                            click: (e) => handleMapClick(e, adminCode),
                            mouseover: highlightFeature,
                            mouseout: resetHighlight
                        });
                    }
                }).addTo(map);

                mapLayers[adminCode] = layer;
                console.log('Loaded region:', regionName, '→', adminCode);
            }
        });

        // Center map on Spain for better view
        map.setView([40, -3.5], 4);

    } catch (error) {
        console.error('Error loading Spanish regions from Opendatasoft, trying fallback...', error);
        await loadSpanishRegionsFallback();
    }
}

// ============================================
// FALLBACK: Load Spanish regions from alternative source
// ============================================

async function loadSpanishRegionsFallback() {
    try {
        // Option 2: Load from es-atlas (TopoJSON converted to GeoJSON)
        const response = await fetch('https://cdn.jsdelivr.net/npm/es-atlas@0.5.0/es/autonomies.json');
        const topoData = await response.json();

        // Convert TopoJSON to GeoJSON using topojson-client
        // For simplicity, we'll use a pre-converted version or manual mapping
        console.log('Loading Spanish regions from es-atlas...');

        // Manual region coordinates as fallback
        const regions = [
            { code: 'ES-GA', name: 'Galicia', coords: [42.8, -8.0] },
            { code: 'ES-AS', name: 'Asturias', coords: [43.3, -5.8] },
            { code: 'ES-CB', name: 'Cantabria', coords: [43.2, -4.0] },
            { code: 'ES-PV', name: 'País Vasco', coords: [43.0, -2.5] },
            { code: 'ES-NC', name: 'Navarra', coords: [42.7, -1.6] },
            { code: 'ES-RI', name: 'La Rioja', coords: [42.3, -2.5] },
            { code: 'ES-AR', name: 'Aragón', coords: [41.5, -1.0] },
            { code: 'ES-CT', name: 'Cataluña', coords: [41.8, 1.5] },
            { code: 'ES-VC', name: 'C. Valenciana', coords: [39.5, -0.5] },
            { code: 'ES-MC', name: 'Murcia', coords: [38.0, -1.2] },
            { code: 'ES-CL', name: 'Castilla y León', coords: [41.8, -4.5] },
            { code: 'ES-MD', name: 'Madrid', coords: [40.4, -3.7] },
            { code: 'ES-CM', name: 'Castilla-La Mancha', coords: [39.5, -3.0] },
            { code: 'ES-EX', name: 'Extremadura', coords: [39.5, -6.0] },
            { code: 'ES-AN', name: 'Andalucía', coords: [37.5, -4.5] },
            { code: 'ES-IB', name: 'Baleares', coords: [39.6, 3.0] },
            { code: 'ES-CN', name: 'Canarias', coords: [28.3, -16.5] },
            { code: 'ES-CE', name: 'Ceuta', coords: [35.9, -5.3] },
            { code: 'ES-ML', name: 'Melilla', coords: [35.3, -2.9] }
        ];

        regions.forEach(region => {
            const marker = L.circleMarker(region.coords, {
                radius: 10,
                fillColor: '#e0e0e0',
                fillOpacity: 0.8,
                color: '#666',
                weight: 2
            }).addTo(map);

            marker.adminUnitID = region.code;
            marker.bindTooltip(region.name);
            marker.on('click', (e) => handleMapClick(e, region.code));

            mapLayers[region.code] = marker;
        });

        console.log('Loaded Spanish regions using fallback markers');

    } catch (error) {
        console.error('Fallback also failed:', error);
    }
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
        layer.setStyle({
            weight: 3,
            color: '#667eea',
            fillOpacity: 0.8
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
}

function resetHighlight(e) {
    const layer = e.target;
    if (currentMode !== 'challenge' && layer.setStyle) {
        layer.setStyle({
            weight: 1,
            color: '#666',
            fillOpacity: 0.6
        });
    }
}

// ============================================
// MODE 1: EXPLORATION MODE
// ============================================

function handleExplorationClick(adminUnitID) {
    const zoneData = getZoneData(adminUnitID);

    if (zoneData) {
        displayZoneInfo(zoneData);
    } else {
        document.getElementById('zoneInfo').innerHTML = 
            '<p style="color: #999;">Esta región no está incluida en los datos lingüísticos.</p>';
    }
}

function displayZoneInfo(zoneData) {
    const featureLabels = {
        seseo: 'Seseo',
        yeismo: 'Yeísmo',
        aspiracion_s: 'Aspiración de /s/',
        aspiracion_j: 'Aspiración de /x/',
        perdida_d: 'Pérdida de /d/',
        lambdacismo: 'Lambdacismo',
        ustedeo: 'Ustedeo',
        uso_tu: 'Uso de tú',
        uso_tu_vos: 'Uso de tú y vos',
        uso_vos: 'Uso de vos',
        indefinido_vs_perfecto: 'Preferencia por indefinido',
        pronombre_sujeto: 'Pronombre sujeto obligatorio',
        queismo: 'Queísmo',
        dequeismo: 'Dequeísmo',
        adj_por_adv: 'Adjetivo por adverbio',
        verbos_reflexivos: 'Verbos reflexivos distintivos'
    };

    const getFeatureBadge = (value) => {
        if (value === 1) return '<span class="feature-badge present">Presente</span>';
        if (value === 0) return '<span class="feature-badge absent">Ausente</span>';
        if (value === 2) return '<span class="feature-badge variable">Variable</span>';
        return '<span class="feature-badge">—</span>';
    };

    let featuresHTML = '<div class="features-grid">';
    for (const [key, value] of Object.entries(zoneData.features)) {
        featuresHTML += `
            <div class="feature-item">
                <span class="feature-name">${featureLabels[key] || key}</span>
                ${getFeatureBadge(value)}
            </div>
        `;
    }
    featuresHTML += '</div>';

    const html = `
        <div class="zone-name">${zoneData.nombre}</div>

        <div class="info-section">
            <div class="info-label">Rasgos Fonológicos y Gramaticales</div>
            <div class="info-content">
                ${featuresHTML}
            </div>
        </div>

        <div class="info-section">
            <div class="info-label">Sustrato Lingüístico</div>
            <div class="info-content">${zoneData.sustrato || 'No especificado'}</div>
        </div>

        ${zoneData.adstrato ? `
            <div class="info-section">
                <div class="info-label">Adstrato</div>
                <div class="info-content">${zoneData.adstrato}</div>
            </div>
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

    const featureLabels = {
        seseo: 'Seseo',
        yeismo: 'Yeísmo',
        aspiracion_s: 'Aspiración de /s/',
        aspiracion_j: 'Aspiración de /x/',
        perdida_d: 'Pérdida de /d/',
        lambdacismo: 'Lambdacismo',
        ustedeo: 'Ustedeo',
        uso_tu: 'Uso de tú',
        uso_tu_vos: 'Uso de tú y vos',
        uso_vos: 'Uso de vos',
        indefinido_vs_perfecto: 'Preferencia por indefinido',
        pronombre_sujeto: 'Pronombre sujeto obligatorio',
        queismo: 'Queísmo',
        dequeismo: 'Dequeísmo',
        adj_por_adv: 'Adjetivo por adverbio',
        verbos_reflexivos: 'Verbos reflexivos distintivos'
    };

    resetMapColors();

    let presentZones = [];
    let absentZones = [];
    let variableZones = [];

    for (const [zoneKey, zoneData] of Object.entries(linguisticData)) {
        const featureValue = zoneData.features[featureKey];
        let color;

        if (featureValue === 1) {
            color = '#48bb78';
            presentZones.push(zoneData.nombre);
        } else if (featureValue === 0) {
            color = '#f56565';
            absentZones.push(zoneData.nombre);
        } else if (featureValue === 2) {
            color = '#ecc94b';
            variableZones.push(zoneData.nombre);
        }

        for (const adminUnit of zoneData.admin_units) {
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

    let statsHTML = `
        <div class="info-section">
            <div class="info-label">Rasgo: ${featureLabels[featureKey]}</div>
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

    document.getElementById('filterInfo').innerHTML = statsHTML;
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
    selectedZones.clear();
    resetMapColors();
    document.getElementById('resultMessage').innerHTML = '';
    document.getElementById('challengeInfo').innerHTML = '';
    document.getElementById('checkAnswerBtn').disabled = false;

    const features = [
        'seseo', 'yeismo', 'aspiracion_s', 'aspiracion_j', 'perdida_d',
        'lambdacismo', 'ustedeo', 'uso_vos', 'indefinido_vs_perfecto',
        'pronombre_sujeto', 'queismo', 'dequeismo'
    ];

    const featureLabels = {
        seseo: 'Seseo',
        yeismo: 'Yeísmo',
        aspiracion_s: 'Aspiración de /s/',
        aspiracion_j: 'Aspiración de /x/',
        perdida_d: 'Pérdida de /d/ intervocálica',
        lambdacismo: 'Lambdacismo',
        ustedeo: 'Ustedeo',
        uso_vos: 'Uso de vos',
        indefinido_vs_perfecto: 'Preferencia por indefinido',
        pronombre_sujeto: 'Pronombre sujeto obligatorio',
        queismo: 'Queísmo',
        dequeismo: 'Dequeísmo'
    };

    const randomFeature = features[Math.floor(Math.random() * features.length)];

    const correctZones = [];
    for (const [zoneKey, zoneData] of Object.entries(linguisticData)) {
        if (zoneData.features[randomFeature] === 1) {
            correctZones.push(zoneKey);
        }
    }

    if (correctZones.length === 0) {
        generateQuestion();
        return;
    }

    currentQuestion = {
        feature: randomFeature,
        featureLabel: featureLabels[randomFeature],
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

    const zoneData = getZoneData(adminUnitID);
    if (!zoneData) {
        return;
    }

    const zoneKey = zoneData.key;

    if (selectedZones.has(zoneKey)) {
        selectedZones.delete(zoneKey);
        for (const adminUnit of zoneData.admin_units) {
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
        for (const adminUnit of zoneData.admin_units) {
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

    displaySelectionInfo();
}

function displaySelectionInfo() {
    const selectedNames = Array.from(selectedZones).map(key => linguisticData[key].nombre);
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

    resetMapColors();

    for (const zoneKey of correctZones) {
        const zoneData = linguisticData[zoneKey];
        for (const adminUnit of zoneData.admin_units) {
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

    for (const zoneKey of wrongSelections) {
        const zoneData = linguisticData[zoneKey];
        for (const adminUnit of zoneData.admin_units) {
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

    let resultHTML;
    if (isCorrect) {
        resultHTML = '<div class="result-message success">¡Correcto! Has identificado todas las zonas.</div>';
    } else {
        const correctNames = Array.from(correctZones).map(k => linguisticData[k].nombre);
        const wrongNames = Array.from(wrongSelections).map(k => linguisticData[k].nombre);

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
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            switchMode(mode);
        });
    });

    document.getElementById('featureSelect').addEventListener('change', (e) => {
        applyFilter(e.target.value);
    });

    document.getElementById('getQuestionBtn').addEventListener('click', generateQuestion);
    document.getElementById('checkAnswerBtn').addEventListener('click', checkAnswer);
}

function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    document.getElementById('explorationPanel').style.display = mode === 'exploration' ? 'block' : 'none';
    document.getElementById('filterPanel').style.display = mode === 'filter' ? 'block' : 'none';
    document.getElementById('challengePanel').style.display = mode === 'challenge' ? 'block' : 'none';
    document.getElementById('filterControls').style.display = mode === 'filter' ? 'flex' : 'none';

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
