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
let phraseSolved = false;
let quizState = {
    deck: [],
    used: [],
    current: null,
    answered: false
};

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

function shuffleArray(list) {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const quizQuestions = [
    {
        id: 1,
        prompt: 'Según la definición de la Sesión 1, ¿qué estudia la Sociolingüística?',
        options: [
            {
                text: 'La evolución histórica de las palabras desde el latín.',
                feedback: 'Incorrecto: Esto corresponde a la lingüística diacrónica o histórica, no a la sociolingüística.',
                isCorrect: false
            },
            {
                text: 'La estructura gramatical y las reglas normativas de la lengua.',
                feedback: 'Incorrecto: Esto es el estudio de la gramática normativa o la sintaxis pura, sin considerar el contexto social.',
                isCorrect: false
            },
            {
                text: 'La relación entre la lengua y la sociedad, y cómo varía el habla según el contexto social.',
                feedback: 'Correcto: Se centra en cómo factores como la clase, edad o contexto influyen en el uso de la lengua.',
                isCorrect: true
            },
            {
                text: 'Los sonidos del habla desde un punto de vista físico y acústico.',
                feedback: 'Incorrecto: Esto es el campo de estudio de la fonética.',
                isCorrect: false
            }
        ]
    },
    {
        id: 2,
        prompt: '¿Qué tres elementos componen el "idiolecto" de una persona?',
        options: [
            {
                text: 'Geolecto, Sociolecto y Registro.',
                feedback: 'Correcto: Es la suma de tu origen geográfico, tu grupo social y tus experiencias/estilo personal.',
                isCorrect: true
            },
            {
                text: 'Sujeto, Verbo y Predicado.',
                feedback: 'Incorrecto: Estos son componentes sintácticos de una oración, no variedades de la lengua.',
                isCorrect: false
            },
            {
                text: 'Acento, Tono y Ritmo.',
                feedback: 'Incorrecto: Estos son rasgos prosódicos o fonéticos, no las variedades que forman el idiolecto.',
                isCorrect: false
            },
            {
                text: 'Español, Inglés y Spanglish.',
                feedback: 'Incorrecto: Estos son idiomas o mezclas específicas, no los componentes teóricos del habla individual.',
                isCorrect: false
            }
        ]
    },
    {
        id: 3,
        prompt: 'Una diferencia de vocabulario (ej. decir "autobús" vs. "guagua") corresponde al nivel de variación...',
        options: [
            {
                text: 'Fónico.',
                feedback: 'Incorrecto: El nivel fónico se refiere a sonidos y pronunciación, no a palabras completas.',
                isCorrect: false
            },
            {
                text: 'Morfosintáctico.',
                feedback: 'Incorrecto: Este nivel se refiere a la gramática y estructura de las oraciones.',
                isCorrect: false
            },
            {
                text: 'Léxico.',
                feedback: 'Correcto: El nivel léxico se ocupa del vocabulario y las palabras que usamos.',
                isCorrect: true
            },
            {
                text: 'Diacrónico.',
                feedback: 'Incorrecto: Diacrónico se refiere al tiempo/historia, no al tipo de elemento lingüístico que varía.',
                isCorrect: false
            }
        ]
    },
    {
        id: 4,
        prompt: '¿Cuál es la diferencia entre un Pidgin y una Lengua Criolla?',
        options: [
            {
                text: 'El Pidgin tiene hablantes nativos y la Criolla no.',
                feedback: 'Incorrecto: Es al revés; el pidgin nace como lengua de emergencia sin hablantes nativos.',
                isCorrect: false
            },
            {
                text: 'El Pidgin es solo para comercio y no tiene hablantes nativos; la Criolla sí tiene hablantes nativos.',
                feedback: 'Correcto: Cuando un pidgin se transmite a los hijos y se convierte en lengua materna, pasa a ser una lengua criolla.',
                isCorrect: true
            },
            {
                text: 'No hay diferencia, son sinónimos exactos.',
                feedback: 'Incorrecto: Son etapas diferentes en la evolución del contacto de lenguas.',
                isCorrect: false
            },
            {
                text: 'El Pidgin se habla en América y la Criolla en España.',
                feedback: 'Incorrecto: La distinción es sociolingüística y evolutiva, no puramente geográfica.',
                isCorrect: false
            }
        ]
    },
    {
        id: 5,
        prompt: '¿Qué variedad se considera "diastrática"?',
        options: [
            {
                text: 'El dialecto de una región específica (ej. Madrid).',
                feedback: 'Incorrecto: Eso es una variedad diatópica (geográfica).',
                isCorrect: false
            },
            {
                text: 'El sociolecto (depende de la clase social, educación, etc.).',
                feedback: 'Correcto: Diastrático se refiere a los estratos sociales.',
                isCorrect: true
            },
            {
                text: 'El registro formal o informal.',
                feedback: 'Incorrecto: Eso es una variedad diafásica (situacional).',
                isCorrect: false
            },
            {
                text: 'El español del siglo XV.',
                feedback: 'Incorrecto: Eso es una variedad diacrónica (histórica).',
                isCorrect: false
            }
        ]
    },
    {
        id: 6,
        prompt: 'Según la "Tesis Andalucista", ¿por qué el español de América se parece al andaluz?',
        options: [
            {
                text: 'Porque los reyes de España eran andaluces.',
                feedback: 'Incorrecto: Los Reyes Católicos eran de Castilla y Aragón.',
                isCorrect: false
            },
            {
                text: 'Porque la mayoría de los colonos y barcos salieron de puertos andaluces (Sevilla/Cádiz).',
                feedback: 'Correcto: El predominio demográfico y logístico del sur de España influyó decisivamente en la formación del español americano.',
                isCorrect: true
            },
            {
                text: 'Porque el clima de América es igual al de Andalucía.',
                feedback: 'Incorrecto: El clima no determina la estructura de la lengua de esta manera.',
                isCorrect: false
            },
            {
                text: 'Es una teoría falsa; el español de América viene del vasco.',
                feedback: 'Incorrecto: La tesis andalucista es la más aceptada para explicar rasgos como el seseo.',
                isCorrect: false
            }
        ]
    },
    {
        id: 7,
        prompt: '¿Qué rasgo gramatical comparten Andalucía, Canarias y América?',
        options: [
            {
                text: 'El uso de "vosotros".',
                feedback: 'Incorrecto: Al contrario, “vosotros” es exclusivo del español peninsular centro-norte.',
                isCorrect: false
            },
            {
                text: 'El uso de "ustedes" para la segunda persona del plural (informal y formal).',
                feedback: 'Correcto: En estas zonas no se usa “vosotros”; “ustedes” cubre ambos usos.',
                isCorrect: true
            },
            {
                text: 'El leísmo.',
                feedback: 'Incorrecto: El leísmo es característico del centro de España y algunas zonas andinas, no de Andalucía/Canarias en general.',
                isCorrect: false
            },
            {
                text: 'El voseo.',
                feedback: 'Incorrecto: El voseo es típico del Cono Sur y Centroamérica, no de Andalucía o Canarias.',
                isCorrect: false
            }
        ]
    },
    {
        id: 8,
        prompt: '¿Cuál de estas palabras es un "guanchismo" (origen canario)?',
        options: [
            {
                text: 'Gofio.',
                feedback: 'Correcto: Es un alimento tradicional canario de origen guanche.',
                isCorrect: true
            },
            {
                text: 'Tomate.',
                feedback: 'Incorrecto: Es de origen náhuatl (México).',
                isCorrect: false
            },
            {
                text: 'Cancha.',
                feedback: 'Incorrecto: Es de origen quechua (Andes).',
                isCorrect: false
            },
            {
                text: 'Almohada.',
                feedback: 'Incorrecto: Es de origen árabe.',
                isCorrect: false
            }
        ]
    },
    {
        id: 9,
        prompt: 'El rasgo de pronunciar la "z" y la "c" igual que la "s" se llama:',
        options: [
            {
                text: 'Yeísmo.',
                feedback: 'Incorrecto: El yeísmo es pronunciar “ll” como “y”.',
                isCorrect: false
            },
            {
                text: 'Seseo.',
                feedback: 'Correcto: Es la ausencia del fonema /θ/ (interdental), pronunciando todo como /s/.',
                isCorrect: true
            },
            {
                text: 'Ceceo.',
                feedback: 'Incorrecto: El ceceo es pronunciar la “s” como “z” (interdental), típico de zonas rurales de Andalucía.',
                isCorrect: false
            },
            {
                text: 'Voseo.',
                feedback: 'Incorrecto: El voseo es un rasgo gramatical (uso de vos), no fonético.',
                isCorrect: false
            }
        ]
    },
    {
        id: 10,
        prompt: '¿Qué lengua prerromana se hablaba en la Península Ibérica y NO es indoeuropea (sigue viva hoy)?',
        options: [
            {
                text: 'Celta.',
                feedback: 'Incorrecto: El celta es indoeuropeo y desapareció como lengua hablada en la península.',
                isCorrect: false
            },
            {
                text: 'Íbero.',
                feedback: 'Incorrecto: El íbero desapareció y su relación con otras lenguas no está clara, aunque no era indoeuropeo.',
                isCorrect: false
            },
            {
                text: 'Euskera (Vasco).',
                feedback: 'Correcto: Es la única lengua prerromana que ha sobrevivido hasta la actualidad.',
                isCorrect: true
            },
            {
                text: 'Latín.',
                feedback: 'Incorrecto: El latín llegó con los romanos, no es prerromano.',
                isCorrect: false
            }
        ]
    },
    {
        id: 11,
        prompt: '¿Qué rasgo fonético caracteriza al español de México (tierras altas)?',
        options: [
            {
                text: 'Aspiración fuerte de la "s" final.',
                feedback: 'Incorrecto: Al contrario, México se caracteriza por conservar la “s” final muy fuerte.',
                isCorrect: false
            },
            {
                text: 'Debilitamiento o pérdida de vocales átonas.',
                feedback: 'Correcto: Es típico escuchar “ntes” por “antes” o “pes” por “pesos”.',
                isCorrect: true
            },
            {
                text: 'Pronunciación de la "r" como "l" (lambdacismo).',
                feedback: 'Incorrecto: Esto es típico del Caribe, no de México.',
                isCorrect: false
            },
            {
                text: 'Distinción entre "s" y "z".',
                feedback: 'Incorrecto: En México hay seseo, no distinción.',
                isCorrect: false
            }
        ]
    },
    {
        id: 12,
        prompt: 'La palabra "cuate" (amigo) proviene de la lengua...',
        options: [
            {
                text: 'Quechua.',
                feedback: 'Incorrecto: Del quechua vienen palabras como “papa” o “cancha”.',
                isCorrect: false
            },
            {
                text: 'Náhuatl.',
                feedback: 'Correcto: Es un indigenismo mexicano muy común.',
                isCorrect: true
            },
            {
                text: 'Taíno.',
                feedback: 'Incorrecto: Del taíno vienen “hamaca” o “huracán”.',
                isCorrect: false
            },
            {
                text: 'Guaraní.',
                feedback: 'Incorrecto: Del guaraní vienen “jaguar” o “tucán”.',
                isCorrect: false
            }
        ]
    },
    {
        id: 13,
        prompt: '¿Qué uso del verbo "haber" es común en el español popular de México y otras zonas?',
        options: [
            {
                text: 'Pluralización del impersonal ("Habían muchas fiestas").',
                feedback: 'Correcto: Aunque la norma culta prefiere “había”, la pluralización es muy frecuente.',
                isCorrect: true
            },
            {
                text: 'Uso como verbo principal de movimiento.',
                feedback: 'Incorrecto: Haber no indica movimiento.',
                isCorrect: false
            },
            {
                text: 'Eliminación del verbo haber.',
                feedback: 'Incorrecto: No se elimina, se pluraliza.',
                isCorrect: false
            },
            {
                text: 'Sustitución por "ser".',
                feedback: 'Incorrecto: No se sustituye por ser en este contexto.',
                isCorrect: false
            }
        ]
    },
    {
        id: 14,
        prompt: 'El "leísmo" (uso de "le" como objeto directo) es aceptado en España para personas masculinas, pero también aparece en...',
        options: [
            {
                text: 'El Caribe.',
                feedback: 'Incorrecto: El Caribe no es una zona leísta.',
                isCorrect: false
            },
            {
                text: 'La zona del Río de la Plata.',
                feedback: 'Incorrecto: Allí predomina el sistema etimológico (lo/la).',
                isCorrect: false
            },
            {
                text: 'La zona Andina (Ecuador, Perú, Bolivia).',
                feedback: 'Correcto: En la zona andina se da un leísmo particular por contacto con lenguas indígenas.',
                isCorrect: true
            },
            {
                text: 'México.',
                feedback: 'Incorrecto: México usa mayoritariamente “lo” para objeto directo.',
                isCorrect: false
            }
        ]
    },
    {
        id: 15,
        prompt: '¿Qué característica fonética define al Español Andino frente a otras variedades americanas?',
        options: [
            {
                text: 'Es fonéticamente innovador (aspira mucho).',
                feedback: 'Incorrecto: Al contrario, es conservador.',
                isCorrect: false
            },
            {
                text: 'Es fonéticamente conservador (mantiene la "s" final y consonantes).',
                feedback: 'Correcto: Se pronuncian claramente las consonantes finales.',
                isCorrect: true
            },
            {
                text: 'Usa el "sheísmo" en todas partes.',
                feedback: 'Incorrecto: El sheísmo es rioplatense.',
                isCorrect: false
            },
            {
                text: 'Confunde la "r" y la "l".',
                feedback: 'Incorrecto: Eso es caribeño.',
                isCorrect: false
            }
        ]
    },
    {
        id: 16,
        prompt: 'En el español andino, es común la posposición del posesivo. Un ejemplo es:',
        options: [
            {
                text: '"Mi hijo".',
                feedback: 'Incorrecto: Este es el orden estándar.',
                isCorrect: false
            },
            {
                text: '"El hijo mío".',
                feedback: 'Correcto: Esta estructura es muy frecuente en el habla andina.',
                isCorrect: true
            },
            {
                text: '"Hijo de mi".',
                feedback: 'Incorrecto: Esta estructura no es correcta.',
                isCorrect: false
            },
            {
                text: '"Su de él hijo".',
                feedback: 'Incorrecto: Estructura agramatical.',
                isCorrect: false
            }
        ]
    },
    {
        id: 17,
        prompt: '¿Qué palabra de origen quechua usamos en español general para un tubérculo?',
        options: [
            {
                text: 'Tomate.',
                feedback: 'Incorrecto: Es náhuatl.',
                isCorrect: false
            },
            {
                text: 'Yuca.',
                feedback: 'Incorrecto: Es arahuaco/taíno.',
                isCorrect: false
            },
            {
                text: 'Papa.',
                feedback: 'Correcto: “Papa” (patata) viene del quechua.',
                isCorrect: true
            },
            {
                text: 'Maíz.',
                feedback: 'Incorrecto: Es taíno.',
                isCorrect: false
            }
        ]
    },
    {
        id: 18,
        prompt: 'El rasgo más distintivo del español Rioplatense (Argentina/Uruguay) es el "rehilamiento". ¿En qué consiste?',
        options: [
            {
                text: 'Pronunciar la "r" como "l".',
                feedback: 'Incorrecto: Eso es lambdacismo (Caribe).',
                isCorrect: false
            },
            {
                text: 'Pronunciar la "ll" y la "y" como un sonido similar a "sh" ([ʃ]).',
                feedback: 'Correcto: Ej: “sho” por “yo”, “cashé” por “calle”.',
                isCorrect: true
            },
            {
                text: 'Aspirar la "j".',
                feedback: 'Incorrecto: Eso ocurre en el Caribe y Andalucía.',
                isCorrect: false
            },
            {
                text: 'Pronunciar la "z" como "s".',
                feedback: 'Incorrecto: Eso es seseo, y es general en América, no exclusivo del Rioplatense.',
                isCorrect: false
            }
        ]
    },
    {
        id: 19,
        prompt: '¿Cómo se conjugan los verbos en el voseo argentino (presente)?',
        options: [
            {
                text: 'Tú cantas, tú comes.',
                feedback: 'Incorrecto: Esa es la forma de tuteo estándar.',
                isCorrect: false
            },
            {
                text: 'Vos cantáis, vos coméis.',
                feedback: 'Incorrecto: Esa forma conserva el diptongo (más parecido al vosotros original), no es la argentina estándar.',
                isCorrect: false
            },
            {
                text: 'Vos cantás, vos comés, vos vivís.',
                feedback: 'Correcto: Se pierde el diptongo y se acentúa la última sílaba.',
                isCorrect: true
            },
            {
                text: 'Vos canta, vos come.',
                feedback: 'Incorrecto: Eso parece imperativo o tercera persona.',
                isCorrect: false
            }
        ]
    },
    {
        id: 20,
        prompt: '¿Qué es el "lunfardo"?',
        options: [
            {
                text: 'Una lengua indígena de Uruguay.',
                feedback: 'Incorrecto: No es una lengua indígena.',
                isCorrect: false
            },
            {
                text: 'Una jerga originada en Buenos Aires con mucha influencia italiana.',
                feedback: 'Correcto: Nació en ambientes populares y carcelarios.',
                isCorrect: true
            },
            {
                text: 'El dialecto oficial de la Patagonia.',
                feedback: 'Incorrecto: No es un dialecto oficial ni regional extenso.',
                isCorrect: false
            },
            {
                text: 'Una variedad del quechua.',
                feedback: 'Incorrecto: No tiene relación con el quechua.',
                isCorrect: false
            }
        ]
    },
    {
        id: 21,
        prompt: 'En Chile, el voseo es particular porque...',
        options: [
            {
                text: 'Es idéntico al argentino.',
                feedback: 'Incorrecto: No, la conjugación es diferente.',
                isCorrect: false
            },
            {
                text: 'Mezcla el pronombre "tú" con una conjugación voseante (ej. "tú cachái").',
                feedback: 'Correcto: Es un rasgo muy distintivo del habla chilena coloquial.',
                isCorrect: true
            },
            {
                text: 'Solo se usa en documentos escritos.',
                feedback: 'Incorrecto: Es eminentemente oral y coloquial.',
                isCorrect: false
            },
            {
                text: 'No existe, en Chile solo se tutea.',
                feedback: 'Incorrecto: Falso, el voseo verbal es muy común.',
                isCorrect: false
            }
        ]
    },
    {
        id: 22,
        prompt: '¿Qué significa la palabra chilena "fome"?',
        options: [
            {
                text: 'Divertido.',
                feedback: 'Incorrecto: Es lo opuesto.',
                isCorrect: false
            },
            {
                text: 'Aburrido o sin gracia.',
                feedback: 'Correcto: Es una de las palabras más comunes en Chile.',
                isCorrect: true
            },
            {
                text: 'Hambriento.',
                feedback: 'Incorrecto: Se parece a “fame” (hambre en italiano/gallego), pero no significa eso.',
                isCorrect: false
            },
            {
                text: 'Rápido.',
                feedback: 'Incorrecto: Eso sería “al tiro”.',
                isCorrect: false
            }
        ]
    },
    {
        id: 23,
        prompt: 'En el Caribe (Puerto Rico), es común escuchar "Puelto Rico" en lugar de "Puerto Rico". Este fenómeno se llama:',
        options: [
            {
                text: 'Rotacismo.',
                feedback: 'Incorrecto: Rotacismo es cambiar L por R.',
                isCorrect: false
            },
            {
                text: 'Lambdacismo (o lateralización).',
                feedback: 'Correcto: Es el cambio de /r/ implosiva por /l/.',
                isCorrect: true
            },
            {
                text: 'Yeísmo.',
                feedback: 'Incorrecto: Es ll -> y.',
                isCorrect: false
            },
            {
                text: 'Ceceo.',
                feedback: 'Incorrecto: Es s -> z.',
                isCorrect: false
            }
        ]
    },
    {
        id: 24,
        prompt: '¿Qué rasgo sintáctico es distintivo del español caribeño en las preguntas?',
        options: [
            {
                text: 'La inversión sujeto-verbo no se hace (Sujeto explícito antepuesto).',
                feedback: 'Correcto: Ej: “¿Qué tú quieres?” en lugar de “¿Qué quieres tú?”.',
                isCorrect: true
            },
            {
                text: 'Poner el verbo siempre al final.',
                feedback: 'Incorrecto: Eso es típico del alemán o latín, no del español caribeño.',
                isCorrect: false
            },
            {
                text: 'Eliminar el sujeto siempre.',
                feedback: 'Incorrecto: Al contrario, el sujeto se explicita mucho.',
                isCorrect: false
            },
            {
                text: 'Usar "vos" en las preguntas.',
                feedback: 'Incorrecto: El Caribe es zona de tuteo/ustedes.',
                isCorrect: false
            }
        ]
    },
    {
        id: 25,
        prompt: 'La palabra "guagua" tiene significados diferentes. En el Caribe y Canarias significa _______, pero en la zona Andina significa _______.',
        options: [
            {
                text: 'Bebé / Autobús.',
                feedback: 'Incorrecto: Al revés.',
                isCorrect: false
            },
            {
                text: 'Autobús / Bebé (niño pequeño).',
                feedback: 'Correcto: Es un ejemplo clásico de variación léxica.',
                isCorrect: true
            },
            {
                text: 'Comida / Dinero.',
                feedback: 'Incorrecto: No tiene estos significados.',
                isCorrect: false
            },
            {
                text: 'Fiesta / Trabajo.',
                feedback: 'Incorrecto: Tampoco.',
                isCorrect: false
            }
        ]
    },
    {
        id: 26,
        prompt: 'El español es la _______ lengua materna más hablada del mundo.',
        options: [
            {
                text: 'Primera.',
                feedback: 'Incorrecto: El chino mandarín es la primera.',
                isCorrect: false
            },
            {
                text: 'Segunda.',
                feedback: 'Correcto: Supera al inglés en hablantes nativos.',
                isCorrect: true
            },
            {
                text: 'Tercera.',
                feedback: 'Incorrecto: Es la segunda.',
                isCorrect: false
            },
            {
                text: 'Cuarta.',
                feedback: 'Incorrecto: Es la segunda.',
                isCorrect: false
            }
        ]
    },
    {
        id: 27,
        prompt: '¿Cuál es el origen mayoritario de la población hispana en Estados Unidos?',
        options: [
            {
                text: 'Puertorriqueño.',
                feedback: 'Incorrecto: Son el segundo grupo, pero lejos del primero.',
                isCorrect: false
            },
            {
                text: 'Cubano.',
                feedback: 'Incorrecto: Son importantes en Florida, pero minoría a nivel nacional.',
                isCorrect: false
            },
            {
                text: 'Mexicano.',
                feedback: 'Correcto: Representan más del 60% de los hispanos en EE.UU.',
                isCorrect: true
            },
            {
                text: 'Colombiano.',
                feedback: 'Incorrecto: Es un grupo menor en comparación.',
                isCorrect: false
            }
        ]
    },
    {
        id: 28,
        prompt: '¿En qué estado de EE.UU. hay una gran concentración de cubanos?',
        options: [
            {
                text: 'California.',
                feedback: 'Incorrecto: California es mayoritariamente mexicana.',
                isCorrect: false
            },
            {
                text: 'Texas.',
                feedback: 'Incorrecto: Texas es mayoritariamente mexicana.',
                isCorrect: false
            },
            {
                text: 'Florida.',
                feedback: 'Correcto: Especialmente en Miami.',
                isCorrect: true
            },
            {
                text: 'Nueva York.',
                feedback: 'Incorrecto: Nueva York es dominicana/puertorriqueña.',
                isCorrect: false
            }
        ]
    },
    {
        id: 29,
        prompt: '¿Qué ocurre generalmente con el español en la tercera generación de inmigrantes en EE.UU.?',
        options: [
            {
                text: 'Lo hablan mejor que sus abuelos.',
                feedback: 'Incorrecto: Falso, suelen perder fluidez.',
                isCorrect: false
            },
            {
                text: 'Se mantiene intacto.',
                feedback: 'Incorrecto: Falso, hay un desplazamiento hacia el inglés.',
                isCorrect: false
            },
            {
                text: 'Tiende a perderse y el inglés se convierte en la lengua dominante.',
                feedback: 'Correcto: Es el patrón sociolingüístico habitual.',
                isCorrect: true
            },
            {
                text: 'Se convierte en francés.',
                feedback: 'Incorrecto: Imposible.',
                isCorrect: false
            }
        ]
    },
    {
        id: 30,
        prompt: 'El "Spanglish" se define mejor como:',
        options: [
            {
                text: 'Una lengua oficial de EE.UU.',
                feedback: 'Incorrecto: No es oficial.',
                isCorrect: false
            },
            {
                text: 'Un fenómeno de alternancia de códigos y préstamos léxicos.',
                feedback: 'Correcto: No es una lengua separada, sino una práctica de bilingües.',
                isCorrect: true
            },
            {
                text: 'Un dialecto del inglés.',
                feedback: 'Incorrecto: Tiene base española también.',
                isCorrect: false
            },
            {
                text: 'Una lengua criolla establecida.',
                feedback: 'Incorrecto: No cumple los requisitos de lengua criolla (estabilidad, hablantes nativos únicos).',
                isCorrect: false
            }
        ]
    },
    {
        id: 31,
        prompt: 'La alternancia de códigos "intrasentencial" ocurre...',
        options: [
            {
                text: 'Entre dos frases distintas.',
                feedback: 'Incorrecto: Eso es intersentencial.',
                isCorrect: false
            },
            {
                text: 'Dentro de la misma oración.',
                feedback: 'Correcto: Ej: “I want to go a la playa”.',
                isCorrect: true
            },
            {
                text: 'Usando solo una palabra suelta (tag).',
                feedback: 'Incorrecto: Eso es emblemática o tag-switching.',
                isCorrect: false
            },
            {
                text: 'Al cambiar de tema de conversación.',
                feedback: 'Incorrecto: No define el tipo gramatical de alternancia.',
                isCorrect: false
            }
        ]
    },
    {
        id: 32,
        prompt: '¿Qué lengua asiática tiene miles de préstamos del español debido a la colonización?',
        options: [
            {
                text: 'Chino Mandarín.',
                feedback: 'Incorrecto: Poca influencia española.',
                isCorrect: false
            },
            {
                text: 'Tagalo (Filipinas).',
                feedback: 'Correcto: Filipinas fue colonia española y su lengua absorbió mucho vocabulario.',
                isCorrect: true
            },
            {
                text: 'Japonés.',
                feedback: 'Incorrecto: Solo tiene algunas palabras (pan), pero no miles.',
                isCorrect: false
            },
            {
                text: 'Hindi.',
                feedback: 'Incorrecto: Sin relación colonial.',
                isCorrect: false
            }
        ]
    },
    {
        id: 33,
        prompt: '¿Qué es el "ladino"?',
        options: [
            {
                text: 'El español que se habla en Guinea Ecuatorial.',
                feedback: 'Incorrecto: Ese es español ecuatoguineano.',
                isCorrect: false
            },
            {
                text: 'La lengua de los judíos sefardíes expulsados de España en 1492.',
                feedback: 'Correcto: Conserva rasgos del español medieval.',
                isCorrect: true
            },
            {
                text: 'Una lengua indígena de Centroamérica.',
                feedback: 'Incorrecto: Ladino en Centroamérica se refiere a mestizos, pero la lengua ladino es judeoespañol.',
                isCorrect: false
            },
            {
                text: 'Un dialecto del italiano.',
                feedback: 'Incorrecto: Existe un ladino en los Alpes, pero en este contexto nos referimos al judeoespañol.',
                isCorrect: false
            }
        ]
    },
    {
        id: 34,
        prompt: '¿Cuál es el único país de África donde el español es lengua oficial?',
        options: [
            {
                text: 'Marruecos.',
                feedback: 'Incorrecto: Se habla algo de español en el norte, pero no es oficial.',
                isCorrect: false
            },
            {
                text: 'Guinea Ecuatorial.',
                feedback: 'Correcto: Fue colonia española hasta 1968.',
                isCorrect: true
            },
            {
                text: 'Senegal.',
                feedback: 'Incorrecto: Es francófono.',
                isCorrect: false
            },
            {
                text: 'Angola.',
                feedback: 'Incorrecto: Es lusófono (portugués).',
                isCorrect: false
            }
        ]
    },
    {
        id: 35,
        prompt: 'El término "chicano" se refiere específicamente a...',
        options: [
            {
                text: 'Cualquier hispano en EE.UU.',
                feedback: 'Incorrecto: Demasiado general.',
                isCorrect: false
            },
            {
                text: 'Estadounidenses de ascendencia mexicana.',
                feedback: 'Correcto: Es un término de identidad cultural y política.',
                isCorrect: true
            },
            {
                text: 'Inmigrantes de Puerto Rico.',
                feedback: 'Incorrecto: Esos son “nuyoricans” o puertorriqueños.',
                isCorrect: false
            },
            {
                text: 'Cubanos en Miami.',
                feedback: 'Incorrecto: No se usa para cubanos.',
                isCorrect: false
            }
        ]
    },
    {
        id: 36,
        prompt: '(Verdadero/Falso) El ladino es una variedad moderna que ha incorporado muchos anglicismos.',
        options: [
            {
                text: 'Verdadero.',
                feedback: 'Incorrecto: El ladino es arcaizante.',
                isCorrect: false
            },
            {
                text: 'Falso.',
                feedback: 'Correcto: El ladino es conocido por conservar el español antiguo (arcaísmos) y no por modernismos.',
                isCorrect: true
            }
        ]
    },
    {
        id: 37,
        prompt: '¿Qué lengua indígena es cooficial con el español en Paraguay?',
        options: [
            {
                text: 'Quechua.',
                feedback: 'Incorrecto: Se habla en los Andes, no es dominante en Paraguay.',
                isCorrect: false
            },
            {
                text: 'Guaraní.',
                feedback: 'Correcto: Es hablado por la mayoría de la población, incluso no indígena.',
                isCorrect: true
            },
            {
                text: 'Aimara.',
                feedback: 'Incorrecto: Se habla en Bolivia/Perú.',
                isCorrect: false
            },
            {
                text: 'Mapudungun.',
                feedback: 'Incorrecto: Se habla en Chile/Argentina.',
                isCorrect: false
            }
        ]
    },
    {
        id: 38,
        prompt: 'El uso de "le" en expresiones como "ándale", "pásale", "híjolé" es típico de...',
        options: [
            {
                text: 'España.',
                feedback: 'Incorrecto: No se usa así en España.',
                isCorrect: false
            },
            {
                text: 'Argentina.',
                feedback: 'Incorrecto: No es un rasgo rioplatense.',
                isCorrect: false
            },
            {
                text: 'México.',
                feedback: 'Correcto: Es un sufijo intensificador muy característico.',
                isCorrect: true
            },
            {
                text: 'Cuba.',
                feedback: 'Incorrecto: No es rasgo caribeño.',
                isCorrect: false
            }
        ]
    },
    {
        id: 39,
        prompt: '¿Qué es el "dequeísmo"?',
        options: [
            {
                text: 'Usar "de que" cuando el verbo no lo requiere (ej. "Pienso de que...").',
                feedback: 'Correcto: Es añadir una preposición innecesaria.',
                isCorrect: true
            },
            {
                text: 'Omitir el "de" cuando es necesario (ej. "Me alegro que...").',
                feedback: 'Incorrecto: Eso es “queísmo”.',
                isCorrect: false
            },
            {
                text: 'Usar mucho la palabra "que".',
                feedback: 'Incorrecto: No es la definición lingüística.',
                isCorrect: false
            },
            {
                text: 'Hablar muy rápido.',
                feedback: 'Incorrecto: Irrelevante.',
                isCorrect: false
            }
        ]
    },
    {
        id: 40,
        prompt: '¿Cuál de los siguientes NO es un nivel de variación lingüística?',
        options: [
            {
                text: 'Fónico.',
                feedback: 'Incorrecto: Sí es un nivel (sonidos).',
                isCorrect: false
            },
            {
                text: 'Léxico.',
                feedback: 'Incorrecto: Sí es un nivel (palabras).',
                isCorrect: false
            },
            {
                text: 'Gramatical.',
                feedback: 'Incorrecto: Sí es un nivel (estructura).',
                isCorrect: false
            },
            {
                text: 'Atómico.',
                feedback: 'Correcto: “Atómico” no es un término de la lingüística para niveles de variación.',
                isCorrect: true
            }
        ]
    }
];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    buildReverseIndex();
    initializeMap();
    setupEventListeners();
    initializeQuizDeck();
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
        case 'phrase-challenge':
            handlePhraseMapClick(adminUnitID);
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
            const useBaseColors = currentMode === 'exploration' || currentMode === 'phrase-challenge';
            const neutralStyle = useBaseColors
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
// MODE 4: PHRASE CHALLENGE (MAP-BASED)
// ============================================

function loadNewPhraseChallenge() {
    const phraseText = document.getElementById('phraseText');
    const feedback = document.getElementById('phraseFeedback');
    const hintBox = document.getElementById('phraseHint');
    const hintBtn = document.getElementById('phraseHintBtn');
    const selectionInfo = document.getElementById('phraseSelectionInfo');

    phraseSolved = false;
    currentPhrase = null;

    feedback.style.display = 'none';
    feedback.textContent = '';
    feedback.className = 'feedback-box';
    hintBox.style.display = 'none';
    hintBox.textContent = '';
    if (selectionInfo) {
        selectionInfo.textContent = 'Usa el mapa de la izquierda: al hacer clic se marcará tu selección y sabrás si es correcta.';
    }

    if (!phraseChallenges || phraseChallenges.length === 0) {
        phraseText.textContent = 'No hay frases disponibles en este momento.';
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-error';
        feedback.textContent = 'Revisa el archivo de datos para añadir frases.';
        hintBtn.disabled = true;
        return;
    }

    const randomIndex = Math.floor(Math.random() * phraseChallenges.length);
    currentPhrase = phraseChallenges[randomIndex];
    phraseText.textContent = currentPhrase.text;
    hintBtn.disabled = false;

    if (currentMode === 'phrase-challenge') {
        resetMapColors();
    }
}

function revealPhraseHint() {
    if (!currentPhrase) return;
    const hintBox = document.getElementById('phraseHint');
    hintBox.textContent = currentPhrase.hint;
    hintBox.style.display = 'block';
}

function handlePhraseMapClick(adminUnitID) {
    if (currentMode !== 'phrase-challenge' || !currentPhrase) return;

    const feedback = document.getElementById('phraseFeedback');
    const selectionInfo = document.getElementById('phraseSelectionInfo');
    if (phraseSolved) {
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-success';
        feedback.textContent = 'Ya acertaste esta frase. Pulsa "Nueva frase" para seguir jugando.';
        return;
    }
    const regionKey = getMainDialectZone(adminUnitID);

    if (!regionKey) {
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-error';
        feedback.textContent = 'Esta zona no forma parte de las regiones dialectales del desafío. Prueba con otra.';
        return;
    }

    highlightPhraseSelection(adminUnitID);

    const regionLabel = phraseAnswerLabels[regionKey] || regionLabels[regionKey] || getAdminLabel(adminUnitID);
    if (selectionInfo) {
        selectionInfo.textContent = `Seleccionaste: ${regionLabel}`;
    }

    const isCorrect = regionKey === currentPhrase.answer;
    phraseSolved = isCorrect;

    const verdict = isCorrect ? '¡Correcto!' : 'Respuesta incorrecta.';
    const detail = isCorrect
        ? currentPhrase.feedback
        : 'Sigue probando y haz clic en otra zona dialectal del mapa.';

    feedback.style.display = 'block';
    feedback.className = `feedback-box ${isCorrect ? 'feedback-success' : 'feedback-error'}`;
    feedback.innerHTML = `${verdict} ${detail}`;
}

function highlightPhraseSelection(adminUnitID) {
    const layer = mapLayers[adminUnitID];
    if (!layer || !layer.setStyle) return;

    resetMapColors();

    layer.setStyle({
        fillColor: '#2b6cb0',
        fillOpacity: 0.85,
        color: '#2c5282',
        weight: 2
    });

    if (layer._hoverStyleBackup) {
        layer._hoverStyleBackup = null;
    }
}

// ============================================
// MODE 6: QUIZ (MULTIPLE CHOICE)
// ============================================

function initializeQuizDeck() {
    quizState.deck = shuffleArray(quizQuestions.map((_, idx) => idx));
    quizState.used = [];
}

function loadNextQuizQuestion() {
    const header = document.getElementById('quizHeader');
    const questionEl = document.getElementById('quizQuestion');
    const optionsContainer = document.getElementById('quizOptions');
    const feedback = document.getElementById('quizFeedback');
    const nextBtn = document.getElementById('quizNextBtn');

    if (!quizQuestions || quizQuestions.length === 0) {
        header.textContent = 'No hay preguntas disponibles.';
        questionEl.textContent = '';
        optionsContainer.innerHTML = '';
        feedback.style.display = 'block';
        feedback.className = 'feedback-box feedback-error';
        feedback.textContent = 'Añade preguntas al cuestionario para activar esta sección.';
        nextBtn.disabled = true;
        return;
    }

    if (quizState.deck.length === 0) {
        initializeQuizDeck();
        header.textContent = 'Nueva ronda: se reordenaron las 40 preguntas.';
    }

    const nextIndex = quizState.deck.pop();
    quizState.used.push(nextIndex);
    quizState.current = quizQuestions[nextIndex];
    quizState.answered = false;

    header.textContent = `Pregunta ${quizState.used.length} de ${quizQuestions.length} (ID ${quizState.current.id})`;
    questionEl.textContent = quizState.current.prompt;
    optionsContainer.innerHTML = '';

    feedback.style.display = 'none';
    feedback.className = 'feedback-box';
    feedback.textContent = '';

    const shuffledOptions = shuffleArray(quizState.current.options);
    shuffledOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = option.text;
        btn.dataset.correct = option.isCorrect;
        btn.dataset.feedback = option.feedback;
        btn.addEventListener('click', () => handleQuizAnswer(btn));
        optionsContainer.appendChild(btn);
    });

    nextBtn.disabled = true;
    nextBtn.textContent = 'Siguiente pregunta';
}

function handleQuizAnswer(button) {
    if (!quizState.current || quizState.answered) return;

    quizState.answered = true;
    const isCorrect = button.dataset.correct === 'true';
    const feedbackText = button.dataset.feedback || '';
    const feedback = document.getElementById('quizFeedback');
    const nextBtn = document.getElementById('quizNextBtn');

    document.querySelectorAll('#quizOptions .quiz-option').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === 'true') {
            btn.classList.add('correct');
        }
    });

    if (!isCorrect) {
        button.classList.add('incorrect');
    }

    feedback.style.display = 'block';
    feedback.className = `feedback-box ${isCorrect ? 'feedback-success' : 'feedback-error'}`;
    feedback.textContent = feedbackText;

    nextBtn.disabled = false;
    nextBtn.textContent = quizState.deck.length === 0 ? 'Comenzar nueva ronda' : 'Siguiente pregunta';
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
    document.getElementById('quizNextBtn').addEventListener('click', loadNextQuizQuestion);

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
    document.getElementById('quizPanel').style.display = mode === 'quiz' ? 'block' : 'none';
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
    } else if (mode === 'quiz') {
        loadNextQuizQuestion();
    } else if (mode === 'identify') {
        loadNextIdentifyVideo();
    }
}
