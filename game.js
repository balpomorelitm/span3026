// ============================================
// GLOBAL VARIABLES AND STATE
// ============================================

let zoneData = {};
let featureDescriptions = {};
let phraseChallenges = [];
let map;
let mapLayers = {};
let currentMode = 'exploration';
let currentQuestion = null;
let selectedZones = new Set();
let adminUnitToZone = {}; // Reverse lookup cache
let identifyState = {
    deck: [],
    used: [],
    currentVideo: null,
    guessed: false
};

let currentPhrase = null;

const adminUnitLabels = {
    'AR': 'Argentina', 'UY': 'Uruguay', 'PY': 'Paraguay',
    'BO': 'Bolivia', 'PE': 'Perú', 'EC': 'Ecuador', 'CO': 'Colombia', 'VE': 'Venezuela',
    'VE-CAR': 'Litoral Caribe de Venezuela', 'CO-CAR': 'Costa Caribe de Colombia',
    'CL': 'Chile', 'MX': 'México', 'GT': 'Guatemala', 'SV': 'El Salvador', 'HN': 'Honduras',
    'NI': 'Nicaragua', 'CR': 'Costa Rica', 'PA': 'Panamá', 'CU': 'Cuba', 'DO': 'República Dominicana',
    'PR': 'Puerto Rico', 'ES': 'España', 'ES-GA': 'Galicia', 'ES-AS': 'Asturias', 'ES-CB': 'Cantabria',
    'ES-PV': 'País Vasco', 'ES-NC': 'Navarra', 'ES-RI': 'La Rioja', 'ES-CL': 'Castilla y León',
    'ES-MD': 'Madrid', 'ES-CM': 'Castilla-La Mancha', 'ES-AR': 'Aragón', 'ES-CT': 'Cataluña',
    'ES-VC': 'Comunidad Valenciana', 'ES-AN': 'Andalucía', 'ES-EX': 'Extremadura', 'ES-MC': 'Murcia',
    'ES-CN': 'Canarias', 'ES-IB': 'Islas Baleares', 'ES-CE': 'Ceuta', 'ES-ML': 'Melilla',
    'GQ': 'Guinea Ecuatorial', 'PH': 'Filipinas'
};

const baseDialectColors = {
    'castellano-centro-norte': '#6b8afd',
    'andaluz': '#f472b6',
    'canario': '#f6ad55',
    'mexico-centroamerica': '#34d399',
    'caribeno': '#facc15',
    'andino': '#60a5fa',
    'chile': '#fb7185',
    'austral': '#a78bfa'
};

const identifyVideos = [
    'CR.mp4', 'PR.mp4', 'arg.mp4', 'boliv.mp4', 'chile.mp4', 'clombia.mp4', 'cuba.mp4',
    'ecuad.mp4', 'esp.mp4', 'guat.mp4', 'hond.mp4', 'mex.mp4', 'nica.mp4', 'pan.mp4',
    'peru.mp4', 'repdom.mp4', 'salv.mp4', 'urug.mp4', 'venez.mp4'
];

const countryToRegion = {
    'arg': { name: 'Argentina', region: 'austral' },
    'urug': { name: 'Uruguay', region: 'austral' },
    'chile': { name: 'Chile', region: 'chile' },
    'boliv': { name: 'Bolivia', region: 'andino' },
    'peru': { name: 'Perú', region: 'andino' },
    'ecuad': { name: 'Ecuador', region: 'andino' },
    'clombia': { name: 'Colombia', region: 'andino' },
    'mex': { name: 'México', region: 'mexico-centroamerica' },
    'guat': { name: 'Guatemala', region: 'mexico-centroamerica' },
    'hond': { name: 'Honduras', region: 'mexico-centroamerica' },
    'nica': { name: 'Nicaragua', region: 'mexico-centroamerica' },
    'salv': { name: 'El Salvador', region: 'mexico-centroamerica' },
    'cr': { name: 'Costa Rica', region: 'mexico-centroamerica' },
    'pan': { name: 'Panamá', region: 'mexico-centroamerica' },
    'esp': { name: 'España', region: 'castellano-centro-norte' },
    'cuba': { name: 'Cuba', region: 'caribeno' },
    'pr': { name: 'Puerto Rico', region: 'caribeno' },
    'repdom': { name: 'República Dominicana', region: 'caribeno' },
    'venez': { name: 'Venezuela', region: 'caribeno' }
};

const regionLabels = {
    'castellano-centro-norte': 'Castellano-Centro-Norte',
    'andaluz': 'Andaluz',
    'canario': 'Canario',
    'mexico-centroamerica': 'México y Centroamérica',
    'caribeno': 'Caribeño',
    'andino': 'Andino',
    'chile': 'Chile',
    'austral': 'Austral'
};

const phraseAnswerLabels = {
    'castellano-centro-norte': 'España (Centro-Norte / Castellano)',
    'andaluz': 'España (Andalucía)',
    'canario': 'Islas Canarias (España)',
    'mexico-centroamerica': 'México y Centroamérica',
    'caribeno': 'Caribe (Cuba, Puerto Rico, República Dominicana)',
    'andino': 'Zona Andina (Colombia, Perú, Bolivia, Ecuador)',
    'chile': 'Chile',
    'austral': 'Río de la Plata (Argentina, Uruguay)'
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    buildReverseIndex();
    populatePhraseOptions();
    initializeMap();
    setupEventListeners();
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
        phraseChallenges = rawData.phrase_challenges || [];

        console.log('Linguistic data loaded:', Object.keys(zoneData).length, 'zones');
        console.log('Phrase bank loaded:', phraseChallenges.length, 'phrases');
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

function getMainDialectZone(adminUnitID) {
    const zoneKey = adminUnitToZone[adminUnitID];
    if (!zoneKey) return null;

    if (zoneKey === 'sur_espana') {
        return adminUnitID === 'ES-CN' ? 'canario' : 'andaluz';
    }

    const mainZones = {
        'norte_espana': 'castellano-centro-norte',
        'mexico_ca': 'mexico-centroamerica',
        'caribe': 'caribeno',
        'caribe_colombia': 'caribeno',
        'caribe_venezuela': 'caribeno',
        'andino': 'andino',
        'austral': 'austral',
        'chile': 'chile'
    };

    return mainZones[zoneKey] || null;
}

function getBaseColorForAdminUnit(adminUnitID) {
    const mainZone = getMainDialectZone(adminUnitID);
    if (!mainZone) return '#e0e0e0';
    return baseDialectColors[mainZone] || '#e0e0e0';
}

function getBaseStyleForAdminUnit(adminUnitID) {
    const fillColor = getBaseColorForAdminUnit(adminUnitID);
    return { fillColor, fillOpacity: 0.6, color: '#666', weight: 1 };
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

function getAdminLabel(adminUnitID) {
    return adminUnitLabels[adminUnitID] || adminUnitID;
}

function getFeatureValueForAdminUnit(adminUnitID, featureKey) {
    const zoneKey = adminUnitToZone[adminUnitID];
    if (!zoneKey) return { value: null, zoneKey: null, isOverride: false, baseValue: null };

    const zone = zoneData[zoneKey];
    const baseValue = zone?.features?.[featureKey];
    const overrideExists = zone?.admin_overrides?.[adminUnitID]?.hasOwnProperty(featureKey);
    const value = overrideExists ? zone.admin_overrides[adminUnitID][featureKey] : baseValue;

    return { value, zoneKey, isOverride: overrideExists, baseValue };
}

function getFeatureValueLabel(value) {
    if (value === 1) return 'presente';
    if (value === 0) return 'ausente';
    if (value === 2) return 'variable';
    return 'sin datos';
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
                    style: getBaseStyleForAdminUnit(iso2),
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
            const baseStyle = getBaseStyleForAdminUnit(region.code);
            const marker = L.circleMarker(region.coords, { pane: 'spanishRegions', radius: 8, ...baseStyle, fillOpacity: 0.8, weight: 2 }).addTo(map);
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
        const baseStyle = getBaseStyleForAdminUnit(zone.code);
        const marker = L.circleMarker(zone.coords, { pane: 'caribbeanZones', radius: 8, ...baseStyle, fillOpacity: 0.8, weight: 2 }).addTo(map);
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
        case 'identify':
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

    let overridesHTML = '';
    if (data.admin_overrides && Object.keys(data.admin_overrides).length > 0) {
        const overrideRows = Object.entries(data.admin_overrides).map(([adminUnitID, overrides]) => {
            const overrideText = Object.entries(overrides)
                .map(([key, value]) => `${featureLabels[key] || key}: ${getFeatureValueLabel(value)}`)
                .join('; ');
            return `<p><strong>${getAdminLabel(adminUnitID)}</strong>: ${overrideText}</p>`;
        }).join('');

        overridesHTML = `
            <div class="info-section">
                <div class="info-label">Diferencias por país</div>
                <div class="info-content rich-text">${overrideRows}</div>
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
        ${overridesHTML}
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

    const presentZones = [], absentZones = [], variableZones = [], overrideNotes = [];

    for (const [adminUnitID, layer] of Object.entries(mapLayers)) {
        const { value, zoneKey, isOverride, baseValue } = getFeatureValueForAdminUnit(adminUnitID, featureKey);
        if (value === null || value === undefined || !zoneKey) continue;

        let color;
        if (value === 1) {
            color = '#48bb78';
            presentZones.push(`${getAdminLabel(adminUnitID)} (${zoneData[zoneKey].nombre})`);
        } else if (value === 0) {
            color = '#f56565';
            absentZones.push(`${getAdminLabel(adminUnitID)} (${zoneData[zoneKey].nombre})`);
        } else if (value === 2) {
            color = '#ecc94b';
            variableZones.push(`${getAdminLabel(adminUnitID)} (${zoneData[zoneKey].nombre})`);
        }

        if (layer && layer.setStyle) {
            layer.setStyle({ fillColor: color, fillOpacity: 0.7, color: '#333', weight: 1 });
        }

        if (isOverride && baseValue !== value) {
            overrideNotes.push(`${getAdminLabel(adminUnitID)} ajustado a ${getFeatureValueLabel(value)} (base: ${getFeatureValueLabel(baseValue)}) en ${zoneData[zoneKey].nombre}`);
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
    if (overrideNotes.length > 0) {
        statsHTML += `<div class="info-section"><div class="info-label" style="color: #667eea;">Ajustes por país:</div><div class="info-content">${overrideNotes.join(' · ')}</div></div>`;
    }
    document.getElementById('filterInfo').innerHTML = descriptionHTML + statsHTML;
}

function resetMapColors() {
    for (const [adminUnitID, layer] of Object.entries(mapLayers)) {
        if (layer.setStyle) {
            const neutralStyle = currentMode === 'exploration'
                ? getBaseStyleForAdminUnit(adminUnitID)
                : { fillColor: '#e0e0e0', fillOpacity: 0.6, color: '#666', weight: 1 };
            layer.setStyle(neutralStyle);
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

    generateFeatureQuestion();
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

// --- (MODIFICADO) ---
function handleChallengeClick(adminUnitID) {
    if (!currentQuestion) return;

    const data = getZoneData(adminUnitID);
    if (!data) return;

    const zoneKey = data.key;

    if (currentQuestion.type === 'feature') {
        if (selectedZones.has(zoneKey)) {
            selectedZones.delete(zoneKey);
            colorZone(zoneKey, 'neutral');
        } else {
            selectedZones.add(zoneKey);
            colorZone(zoneKey, 'selected');
        }
    }

    displaySelectionInfo();
}

// --- (NUEVA FUNCIÓN AUXILIAR) ---
function colorZone(zoneKey, style) {
    const data = zoneData[zoneKey];
    if (data) {
        for (const adminUnit of data.admin_units) {
            const layer = mapLayers[adminUnit];
            if (layer && layer.setStyle) {
                const zoneStyles = {
                    neutral: currentMode === 'exploration'
                        ? getBaseStyleForAdminUnit(adminUnit)
                        : { fillColor: '#e0e0e0', fillOpacity: 0.6, color: '#666', weight: 1 },
                    selected: { fillColor: '#667eea', fillOpacity: 0.7, color: '#333', weight: 2 },
                    correct: { fillColor: '#48bb78', fillOpacity: 0.7, color: '#2f855a', weight: 2 },
                    incorrect: { fillColor: '#f56565', fillOpacity: 0.7, color: '#c53030', weight: 2 }
                };
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

    document.getElementById('resultMessage').innerHTML = resultHTML;
    document.getElementById('checkAnswerBtn').disabled = true;
}

// ============================================
// MODE 4: PHRASE CHALLENGE
// ============================================

function populatePhraseOptions() {
    const select = document.getElementById('phraseSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Selecciona una opción --</option>';
    Object.entries(phraseAnswerLabels).forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
    });
}

function loadNewPhraseChallenge() {
    const phraseText = document.getElementById('phraseText');
    const feedback = document.getElementById('phraseFeedback');
    const hintBox = document.getElementById('phraseHint');
    const select = document.getElementById('phraseSelect');
    const checkBtn = document.getElementById('phraseCheckBtn');
    const hintBtn = document.getElementById('phraseHintBtn');

    feedback.style.display = 'none';
    feedback.textContent = '';
    feedback.className = 'feedback-box';
    hintBox.style.display = 'none';
    hintBox.textContent = '';

    if (!phraseChallenges || phraseChallenges.length === 0) {
        phraseText.textContent = 'No hay frases disponibles en este momento.';
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-error';
        feedback.textContent = 'Revisa el archivo de datos para añadir frases.';
        checkBtn.disabled = true;
        hintBtn.disabled = true;
        return;
    }

    const randomIndex = Math.floor(Math.random() * phraseChallenges.length);
    currentPhrase = phraseChallenges[randomIndex];
    phraseText.textContent = currentPhrase.text;
    select.value = '';
    checkBtn.disabled = false;
    hintBtn.disabled = false;
}

function revealPhraseHint() {
    if (!currentPhrase) return;
    const hintBox = document.getElementById('phraseHint');
    hintBox.textContent = currentPhrase.hint;
    hintBox.style.display = 'block';
}

function checkPhraseAnswer() {
    if (!currentPhrase) return;

    const select = document.getElementById('phraseSelect');
    const feedback = document.getElementById('phraseFeedback');

    if (!select.value) {
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-error';
        feedback.textContent = 'Selecciona una opción antes de comprobar.';
        return;
    }

    const isCorrect = select.value === currentPhrase.answer;
    const verdict = isCorrect ? '¡Correcto!' : 'Respuesta incorrecta.';

    feedback.style.display = 'block';
    feedback.className = `feedback-box ${isCorrect ? 'feedback-success' : 'feedback-error'}`;
    feedback.innerHTML = `${verdict} ${currentPhrase.feedback}`;
}

// ============================================
// MODE 5: IDENTIFY THE SPEAKER
// ============================================

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function parseCountryData(filename) {
    const key = filename.replace('.mp4', '').toLowerCase();
    return countryToRegion[key];
}

function rebuildIdentifyDeck() {
    identifyState.deck = shuffleDeck([...identifyVideos]);
    identifyState.used = [];
}

function loadNextIdentifyVideo() {
    if (identifyState.deck.length === 0) {
        rebuildIdentifyDeck();
    }

    identifyState.currentVideo = identifyState.deck.pop();
    identifyState.used.push(identifyState.currentVideo);
    identifyState.guessed = false;

    const videoElement = document.getElementById('dialectVideo');
    videoElement.src = `public/${identifyState.currentVideo}`;
    videoElement.load();

    const feedback = document.getElementById('identifyFeedback');
    feedback.style.display = 'none';
    feedback.textContent = '';
    feedback.className = 'feedback-box';
}

function handleDialectGuess(regionKey) {
    if (!identifyState.currentVideo || identifyState.guessed) return;

    const countryData = parseCountryData(identifyState.currentVideo);
    const feedback = document.getElementById('identifyFeedback');

    if (!countryData) {
        feedback.textContent = 'No se pudo determinar el origen de este video.';
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-error';
        return;
    }

    identifyState.guessed = true;
    const isCorrect = countryData.region === regionKey;
    feedback.style.display = 'block';
    feedback.className = `feedback-box ${isCorrect ? 'feedback-success' : 'feedback-error'}`;
    const verdict = isCorrect ? '¡Correcto!' : 'Incorrecto.';
    feedback.innerHTML = `${verdict} Origen: <strong>${countryData.name}</strong>. Región dialectal: <strong>${regionLabels[countryData.region]}</strong>.`;
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
    document.getElementById('phraseHintBtn').addEventListener('click', revealPhraseHint);
    document.getElementById('phraseNextBtn').addEventListener('click', loadNewPhraseChallenge);
    document.getElementById('phraseCheckBtn').addEventListener('click', checkPhraseAnswer);

    document.getElementById('nextVideoBtn').addEventListener('click', () => {
        loadNextIdentifyVideo();
    });

    document.querySelectorAll('.dialect-region').forEach(region => {
        region.addEventListener('click', () => handleDialectGuess(region.dataset.region));
    });
}

function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    document.getElementById('explorationPanel').style.display = mode === 'exploration' ? 'block' : 'none';
    document.getElementById('filterPanel').style.display = mode === 'filter' ? 'block' : 'none';
    document.getElementById('challengePanel').style.display = mode === 'challenge' ? 'block' : 'none';
    document.getElementById('phraseChallengePanel').style.display = mode === 'phrase-challenge' ? 'block' : 'none';
    document.getElementById('filterControls').style.display = mode === 'filter' ? 'flex' : 'none';
    document.getElementById('map').style.display = mode === 'identify' ? 'none' : 'block';
    document.getElementById('identifyGame').style.display = mode === 'identify' ? 'block' : 'none';

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
    } else if (mode === 'phrase-challenge') {
        loadNewPhraseChallenge();
        document.getElementById('phraseFeedback').style.display = 'none';
        document.getElementById('phraseHint').style.display = 'none';
    } else if (mode === 'identify') {
        loadNextIdentifyVideo();
    }
}
