// ============================================
// GLOBAL VARIABLES AND STATE
// ============================================

let zoneData = {};
let featureDescriptions = {};
let textBank = []; // <--- NUEVO: Almacén para preguntas de texto
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
        const rawData = await response.json();
        
        zoneData = rawData.zones;
        featureDescriptions = rawData.feature_descriptions;
        textBank = rawData.text_bank_questions; // <--- NUEVO

        console.log('Linguistic data loaded:', Object.keys(zoneData).length, 'zones');
        console.log('Text bank loaded:', textBank.length, 'questions'); // <--- NUEVO
    } catch (error) {
        console.error('Error loading linguistic data:', error);
        alert('Error al cargar los datos lingüísticos. Por favor, recarga la página.');
    }
}

// ============================================
// CORE FUNCTION: Reverse Lookup
// ============================================

function buildReverseIndex() {
    for (const [zoneKey, data] of Object.entries(zoneData)) {
        for (const adminUnit of data.admin_units) {
            adminUnitToZone[adminUnit] = zoneKey;
        }
    }
    console.log('Reverse index built:', Object.keys(adminUnitToZone).length, 'admin units');
}

function getZoneData(adminUnitID) {
    const zoneKey = adminUnitToZone[adminUnitID];
    if (zoneKey) {
        return {
            key: zoneKey,
            ...zoneData[zoneKey]
        };
    }
    return null;
}

// ============================================
// MAP INITIALIZATION
// ============================================

function initializeMap() {
    map = L.map('map', {
        center: [0, -60],
        zoom: 3,
        minZoom: 2,
        maxZoom: 6
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 0.3
    }).addTo(map);

    loadGeoJSONData();
}

async function loadGeoJSONData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        const worldGeoJSON = await response.json();

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
        addSpanishRegions();
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
    if (mapLayers['ES']) {
        if (!map.getPane('spanishRegions')) {
            map.createPane('spanishRegions');
            map.getPane('spanishRegions').style.zIndex = 650;
        }
        const regions = [
            { code: 'ES-AN', name: 'Andalucía', coords: [37.5, -4.5] },
            { code: 'ES-MD', name: 'Madrid', coords: [40.4, -3.7] },
            { code: 'ES-CN', name: 'Canarias', coords: [28.3, -16.5] }
        ];
        regions.forEach(region => {
            const marker = L.circleMarker(region.coords, { pane: 'spanishRegions', radius: 8, fillColor: '#e0e0e0', fillOpacity: 0.8, color: '#666', weight: 2 }).addTo(map);
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
    }
    const coastalZones = [
        { code: 'CO-CAR', name: 'Costa Caribe de Colombia', coords: [10.9, -75.1] },
        { code: 'VE-CAR', name: 'Litoral Caribe de Venezuela', coords: [10.4, -66.8] }
    ];
    coastalZones.forEach(zone => {
        const marker = L.circleMarker(zone.coords, { pane: 'caribbeanZones', radius: 8, fillColor: '#e0e0e0', fillOpacity: 0.8, color: '#666', weight: 2 }).addTo(map);
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
        if (!layer._hoverStyleBackup) {
            layer._hoverStyleBackup = {
                color: layer.options.color, weight: layer.options.weight,
                fillColor: layer.options.fillColor, fillOpacity: layer.options.fillOpacity
            };
        }
        layer.setStyle({
            color: '#667eea', weight: (layer.options.weight || 1) + 1,
            fillColor: layer.options.fillColor, fillOpacity: Math.min(1, (layer.options.fillOpacity || 0.6) + 0.2)
        });
        if (layer.bringToFront) layer.bringToFront();
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
    const data = getZoneData(adminUnitID);
    if (data) {
        displayZoneInfo(data);
    } else {
        document.getElementById('zoneInfo').innerHTML = 
            '<p style="color: #999;">Esta región no está incluida en los datos lingüísticos.</p>';
    }
}

function displayZoneInfo(data) {
    const featureLabels = {
        seseo: 'Seseo', yeismo: 'Yeísmo', aspiracion_s: 'Aspiración de /s/',
        aspiracion_j: 'Aspiración de /x/', perdida_d: 'Pérdida de /d/', lambdacismo: 'Lambdacismo',
        ustedeo: 'Ustedeo', uso_tu: 'Uso de tú', uso_tu_vos: 'Uso de tú y vos',
        uso_vos: 'Uso de vos', indefinido_vs_perfecto: 'Preferencia por indefinido',
        pronombre_sujeto: 'Pronombre sujeto', queismo: 'Queísmo',
        dequeismo: 'Dequeísmo', adj_por_adv: 'Adjetivo por adverbio',
        verbos_reflexivos: 'Verbos reflexivos'
    };

    const getFeatureBadge = (value) => {
        if (value === 1) return '<span class="feature-badge present">Presente</span>';
        if (value === 0) return '<span class="feature-badge absent">Ausente</span>';
        if (value === 2) return '<span class="feature-badge variable">Variable</span>';
        return '<span class="feature-badge">—</span>';
    };

    let featuresHTML = '<div class="features-grid">';
    for (const [key, value] of Object.entries(data.features)) {
        featuresHTML += `
            <div class="feature-item">
                <span class="feature-name">${featureLabels[key] || key}</span>
                ${getFeatureBadge(value)}
            </div>
        `;
    }
    featuresHTML += '</div>';

    let descriptionHTML = '';
    if (data.descripcion_detallada) {
        descriptionHTML = `
            <div class="info-section">
                <div class="info-label">Descripción de la Zona</div>
                <div class="info-content" style="font-size: 0.95em; line-height: 1.6;">
                    ${data.descripcion_detallada}
                </div>
            </div>
        `;
    }

    const html = `
        <div class="zone-name">${data.nombre}</div>
        ${descriptionHTML}
        <div class="info-section">
            <div class="info-label">Rasgos Principales (Resumen)</div>
            <div class="info-content">
                ${featuresHTML}
            </div>
        </div>
        <div class="info-section">
            <div class="info-label">Sustrato Lingüístico</div>
            <div class="info-content">${data.sustrato || 'No especificado'}</div>
        </div>
        ${data.adstrato ? `
            <div class="info-section">
                <div class="info-label">Adstrato</div>
                <div class="info-content">${data.adstrato}</div>
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

    let presentZones = [], absentZones = [], variableZones = [];
    for (const [zoneKey, data] of Object.entries(zoneData)) {
        const featureValue = data.features[featureKey];
        let color;
        if (featureValue === 1) {
            color = '#48bb78';
            presentZones.push(data.nombre);
        } else if (featureValue === 0) {
            color = '#f56565';
            absentZones.push(data.nombre);
        } else if (featureValue === 2) {
            color = '#ecc94b';
            variableZones.push(data.nombre);
        }

        for (const adminUnit of data.admin_units) {
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle({ fillColor: color, fillOpacity: 0.7, color: '#333', weight: 1 });
            }
        }
    }

    let statsHTML = `<div class="info-section"><div class="info-label">Distribución del Rasgo</div></div>`;
    if (presentZones.length > 0) {
        statsHTML += `<div class="info-section"><div class="info-label" style="color: #48bb78;">✓ Presente en:</div><div class="info-content">${presentZones.join(', ')}</div></div>`;
    }
    if (variableZones.length > 0) {
        statsHTML += `<div class="info-section"><div class="info-label" style="color: #d69e2e;">~ Variable en:</div><div class="info-content">${variableZones.join(', ')}</div></div>`;
    }
    if (absentZones.length > 0) {
        statsHTML += `<div class="info-section"><div class="info-label" style="color: #f56565;">✗ Ausente en:</div><div class="info-content">${absentZones.join(', ')}</div></div>`;
    }
    document.getElementById('filterInfo').innerHTML = descriptionHTML + statsHTML;
}

function resetMapColors() {
    for (const layer of Object.values(mapLayers)) {
        if (layer.setStyle) {
            layer.setStyle({ fillColor: '#e0e0e0', fillOpacity: 0.6, color: '#666', weight: 1 });
        }
    }
}

// ============================================
// MODE 3: CHALLENGE MODE
// ============================================

// --- (MODIFICADO) ---
function generateQuestion() {
    selectedZones.clear();
    resetMapColors();
    document.getElementById('resultMessage').innerHTML = '';
    document.getElementById('challengeInfo').innerHTML = '';
    document.getElementById('checkAnswerBtn').disabled = false;

    // 50/50 chance to pick a feature question or a text question
    if (Math.random() > 0.5) {
        generateFeatureQuestion();
    } else {
        generateTextQuestion();
    }
}

// --- (NUEVA FUNCIÓN INTERNA) ---
function generateFeatureQuestion() {
    const features = [
        'seseo', 'yeismo', 'aspiracion_s', 'aspiracion_j', 'perdida_d',
        'lambdacismo', 'ustedeo', 'uso_vos', 'indefinido_vs_perfecto',
        'pronombre_sujeto', 'queismo', 'dequeismo'
    ];
    const randomFeature = features[Math.floor(Math.random() * features.length)];
    const featureLabel = featureDescriptions[randomFeature] ? featureDescriptions[randomFeature].nombre : randomFeature;

    const correctZones = [];
    for (const [zoneKey, data] of Object.entries(zoneData)) {
        if (data.features[randomFeature] === 1) {
            correctZones.push(zoneKey);
        }
    }

    if (correctZones.length === 0) {
        generateQuestion(); // Try again
        return;
    }

    currentQuestion = {
        type: 'feature',
        feature: randomFeature,
        featureLabel: featureLabel,
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

// --- (NUEVA FUNCIÓN INTERNA) ---
function generateTextQuestion() {
    if (textBank.length === 0) {
        generateFeatureQuestion(); // Fallback if text bank is empty
        return;
    }
    
    const randomQuestion = textBank[Math.floor(Math.random() * textBank.length)];
    
    currentQuestion = {
        type: 'text',
        text: randomQuestion.text,
        answerZone: randomQuestion.answer
    };

    const questionHTML = `
        <div class="question-box">
            <div class="question-text">¿A qué zona dialectal pertenece este texto?</div>
            <div class="question-feature" style="font-family: monospace; font-size: 1.1em;">"${currentQuestion.text}"</div>
        </div>
    `;
    document.getElementById('questionBox').innerHTML = questionHTML;
}

// --- (MODIFICADO) ---
function handleChallengeClick(adminUnitID) {
    if (!currentQuestion) return;

    const data = getZoneData(adminUnitID);
    if (!data) return;

    const zoneKey = data.key;

    if (currentQuestion.type === 'feature') {
        // --- Lógica de selección múltiple (como antes) ---
        if (selectedZones.has(zoneKey)) {
            selectedZones.delete(zoneKey);
            colorZone(zoneKey, 'neutral');
        } else {
            selectedZones.add(zoneKey);
            colorZone(zoneKey, 'selected');
        }
    } else if (currentQuestion.type === 'text') {
        // --- Lógica de selección única (NUEVO) ---
        // Deselecciona todas las zonas primero
        selectedZones.forEach(oldZoneKey => colorZone(oldZoneKey, 'neutral'));
        selectedZones.clear();
        
        // Selecciona la nueva zona
        selectedZones.add(zoneKey);
        colorZone(zoneKey, 'selected');
    }

    displaySelectionInfo();
}

// --- (NUEVA FUNCIÓN AUXILIAR) ---
function colorZone(zoneKey, style) {
    const zoneStyles = {
        neutral: { fillColor: '#e0e0e0', fillOpacity: 0.6, color: '#666', weight: 1 },
        selected: { fillColor: '#667eea', fillOpacity: 0.7, color: '#333', weight: 2 },
        correct: { fillColor: '#48bb78', fillOpacity: 0.7, color: '#2f855a', weight: 2 },
        incorrect: { fillColor: '#f56565', fillOpacity: 0.7, color: '#c53030', weight: 2 }
    };
    
    const data = zoneData[zoneKey];
    if (data) {
        for (const adminUnit of data.admin_units) {
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                layer.setStyle(zoneStyles[style]);
            }
        }
    }
}

function displaySelectionInfo() {
    const selectedNames = Array.from(selectedZones).map(key => zoneData[key].nombre);
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

// --- (MODIFICADO) ---
function checkAnswer() {
    if (!currentQuestion) return;

    let resultHTML = '';
    resetMapColors();

    if (currentQuestion.type === 'feature') {
        // --- Lógica de verificación de RASGO (como antes) ---
        const correctZones = new Set(currentQuestion.correctZones);
        const userZones = selectedZones;
        const missedZones = new Set();
        const wrongSelections = new Set();

        for (const zone of correctZones) {
            if (!userZones.has(zone)) missedZones.add(zone);
        }
        for (const zone of userZones) {
            if (!correctZones.has(zone)) wrongSelections.add(zone);
        }

        const isCorrect = wrongSelections.size === 0 && missedZones.size === 0;

        for (const zoneKey of correctZones) colorZone(zoneKey, 'correct');
        for (const zoneKey of wrongSelections) colorZone(zoneKey, 'incorrect');

        if (isCorrect) {
            resultHTML = '<div class="result-message success">¡Correcto! Has identificado todas las zonas.</div>';
        } else {
            const correctNames = Array.from(correctZones).map(k => zoneData[k].nombre);
            const wrongNames = Array.from(wrongSelections).map(k => zoneData[k].nombre);
            resultHTML = '<div class="result-message error">Respuesta incorrecta</div>';
            resultHTML += `<div class="info-section"><div class="info-label" style="color: #48bb78;">✓ Respuestas correctas:</div><div class="info-content">${correctNames.join(', ')}</div></div>`;
            if (wrongNames.length > 0) {
                resultHTML += `<div class="info-section"><div class="info-label" style="color: #f56565;">✗ Selecciones incorrectas:</div><div class="info-content">${wrongNames.join(', ')}</div></div>`;
            }
        }
    } else if (currentQuestion.type === 'text') {
        // --- Lógica de verificación de TEXTO (NUEVO) ---
        const correctZone = currentQuestion.answerZone;
        const userZone = selectedZones.values().next().value; // Obtener la única zona seleccionada
        
        const isCorrect = (userZone === correctZone);

        if (isCorrect) {
            colorZone(correctZone, 'correct');
            resultHTML = '<div class="result-message success">¡Correcto!</div>';
        } else {
            colorZone(correctZone, 'correct'); // Muestra la correcta en verde
            if (userZone) {
                colorZone(userZone, 'incorrect'); // Muestra la incorrecta en rojo
            }
            resultHTML = `<div class="result-message error">Respuesta incorrecta. La zona correcta era: <strong>${zoneData[correctZone].nombre}</strong></div>`;
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
        btn.addEventListener('click', (e) => switchMode(e.target.dataset.mode));
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
