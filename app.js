// ── UTILS ──
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── FEATURE FLAGS ──
function getFeatureFlags() {
  try { return JSON.parse(localStorage.getItem(KEYS.features) || '{}'); }
  catch { return {}; }
}
function isGlobalEnabled(f) { return getFeatureFlags().global?.[f] !== false; }
function isLessonEnabled(lvl, n) { return getFeatureFlags().levels?.[lvl]?.[n]?.enabled !== false; }
function isTabEnabled(lvl, n, i) { return getFeatureFlags().levels?.[lvl]?.[n]?.tabs?.[i] !== false; }

function getAdminSection(key) {
  try {
    const source = _liveAdminData || JSON.parse(localStorage.getItem(KEYS.adminData) || 'null');
    if (!source) return null;
    const data = source[key];
    return (data && data.length > 0) ? data : null;
  } catch(e) { return null; }
}

// ── SECTION REGISTRY — single source of truth for all navigable sections ──
const SECTIONS = {
  quiz:        { navId: 'nav-quiz',        mnavId: 'mnav-quiz',       defaultLabel: 'Quiz Mode',         render: (c) => renderQuizStart(c) },
  reference:   { navId: 'nav-reference',   mnavId: 'mnav-ref',        defaultLabel: 'Grammar Reference', render: (c) => renderReference(c) },
  resources:   { navId: 'nav-resources',   mnavId: 'mnav-resources',  defaultLabel: 'Resources',         render: (c) => renderResources(c) },
  vocabulary:  { navId: 'nav-vocab',       mnavId: null,              defaultLabel: 'Vocabulary',        render: (c) => renderVocabulary(c) },
  leaderboard: { navId: 'nav-leaderboard', mnavId: null,              defaultLabel: 'Leaderboard',       render: (c) => renderLeaderboard(c) },
};

function applyFeatureFlags() {
  const flags = getFeatureFlags();
  const labels = flags.labels || {};
  for (const [key, sec] of Object.entries(SECTIONS)) {
    const enabled = flags.global?.[key] !== false;
    const el = document.getElementById(sec.navId);
    if (el) {
      el.style.display = enabled ? '' : 'none';
      const lbl = el.querySelector('.nav-label');
      if (lbl) lbl.textContent = labels[key] || sec.defaultLabel;
    }
    if (sec.mnavId) {
      const mel = document.getElementById(sec.mnavId);
      if (mel) mel.style.display = enabled ? '' : 'none';
    }
  }
}

// ── GOOGLE ANALYTICS 4 — loaded dynamically if admin configured an ID ──
function _initAnalytics() {
  if (window.gtag) return; // already initialized
  const gaId = localStorage.getItem(KEYS.gaId);
  if (!gaId) return;
  const s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
  s.async = true;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', gaId);
}
_initAnalytics(); // try immediately for cached gaId; called again after Firebase sync

// ── STATE ──
const state = {
  xp: 0,
  completedLessons: new Set(),
  quizScores: {},
  currentLesson: null,
  currentQuiz: null,
  currentQuizIndex: 0,
  quizAnswers: [],
  activeView: 'home',
};

// ── DATA ──
const lessons = {
  1: {
    title: "Alphabet & Vowels",
    subtitle: "The foundation of Zolai — understanding its consonants (Laimungte) and vowels (Awsuaksak), and how they combine to form words.",
    badge: "Lesson I · Phonetics",
    tabs: ['Consonants', 'Vowels', 'Practice'],
    content: {
      consonants: {
        title: "Laimungte — Consonants",
        info: "Zolai uses these consonants. Some letters from the English alphabet (F, J, Q, R, X, Y) are borrowed and used only in loanwords.",
        items: ['B','C','D','G','H','K','L','M','N','P','S','T','V','Z','Ng','Kh','Ph','Th']
      },
      vowels: {
        title: "Awsuaksak — Vowels",
        info: "These six vowel sounds form the core of every Zolai syllable. When combined with consonants, they create the rich sound system of the language.",
        items: [
          {symbol:'a', note:'as in "father"'},
          {symbol:'e', note:'as in "bed"'},
          {symbol:'i', note:'as in "see"'},
          {symbol:'o', note:'as in "open"'},
          {symbol:'u', note:'as in "put"'},
          {symbol:'aw', note:'rounded, back vowel'},
        ]
      },
      practice: [
        "Alu a to hi.",
        "Bi a po zo hi.",
        "Be a su hi.",
        "Ci va la ve.",
        "Dopi kha ni a sa hi.",
        "Ga a la hi.",
        "Gutate a bu hi.",
        "Ka ta a migi hi.",
        "Ka mo a gi hi.",
        "Haza va la hi.",
        "Ni a sa hi.",
        "Tho a na hi.",
        "Mawtaw ka mu hi.",
        "Lono po zo lo hi.",
      ]
    }
  },
  2: {
    title: "Basic Syllables",
    subtitle: "Learn to combine consonants with vowel endings to form common Zolai syllable patterns. Each combination follows a consistent rule.",
    badge: "Lesson II · Building Words",
    tabs: ['Syllable Table', 'Sentences', 'Tips'],
    content: {
      syllableRows: [
        {cons:'B', cells:['Ba','Be','Bi','Bo','Bu','Baw','Bah','Beh','Bih','Boh','Buh','Bawh']},
        {cons:'C', cells:['Ca','Ce','Ci','Co','Cu','Caw','Cah','Ceh','Cih','Coh','Cuh','Cawh']},
        {cons:'D', cells:['Da','De','Di','Do','Du','Daw','Dah','Deh','Dih','Doh','Duh','Dawh']},
        {cons:'G', cells:['Ga','Ge','Gi','Go','Gu','Gaw','Gah','Geh','Gih','Goh','Guh','Gawh']},
        {cons:'H', cells:['Ha','He','Hi','Ho','Hu','Haw','Hah','Heh','Hih','Hoh','Huh','Hawh']},
        {cons:'K', cells:['Ka','Ke','Ki','Ko','Ku','Kaw','Kah','Keh','Kih','Koh','Kuh','Kawh']},
        {cons:'L', cells:['La','Le','Li','Lo','Lu','Law','Lah','Leh','Lih','Loh','Luh','Lawh']},
        {cons:'M', cells:['Ma','Me','Mi','Mo','Mu','Maw','Mah','Meh','Mih','Moh','Muh','Mawh']},
        {cons:'N', cells:['Na','Ne','Ni','No','Nu','Naw','Nah','Neh','Nih','Noh','Nuh','Nawh']},
        {cons:'P', cells:['Pa','Pe','Pi','Po','Pu','Paw','Pah','Peh','Pih','Poh','Puh','Pawh']},
        {cons:'S', cells:['Sa','Se','Si','So','Su','Saw','Sah','Seh','Sih','Soh','Suh','Sawh']},
        {cons:'T', cells:['Ta','Te','Ti','To','Tu','Taw','Tah','Teh','Tih','Toh','Tuh','Tawh']},
        {cons:'V', cells:['Va','Ve','Vi','Vo','Vu','Vaw','Vah','Veh','Vih','Voh','Vuh','Vawh']},
        {cons:'Z', cells:['Za','Ze','Zi','Zo','Zu','Zaw','Zah','Zeh','Zih','Zoh','Zuh','Zawh']},
        {cons:'Ng', cells:['Nga','Nge','Ngi','Ngo','Ngu','Ngaw','Ngah','Ngeh','Ngih','Ngoh','Nguh','Ngawh']},
        {cons:'Kh', cells:['Kha','Khe','Khi','Kho','Khu','Khaw','Khah','Kheh','Khih','Khoh','Khuh','Khawh']},
        {cons:'Ph', cells:['Pha','Phe','Phi','Pho','Phu','Phaw','Phah','Pheh','Phih','Phoh','Phuh','Phawh']},
        {cons:'Th', cells:['Tha','The','Thi','Tho','Thu','Thaw','Thah','Theh','Thih','Thoh','Thuh','Thawh']},
      ],
      vowelHeaders: ['a','e','i','o','u','aw','ah','eh','ih','oh','uh','awh'],
      sentences: [
        "Lo ah buhtuh a huh hi.",
        "Zato ah zaa a nuh hi.",
        "Gah leh teh kane hi.",
        "Ih meh ci na sawh ve.",
        "A u buh tuh a huh hi.",
        "Mi cimawhte a hehpih hi.",
        "Hih lawh na dawh ve.",
        "Ala! Ka cihmah ahi veh leh.",
        "A behpa a huh hi.",
        "Saseh a la hi.",
        "A pi a dah mahmah hi.",
        "Tano a zahla hi.",
        "Lo ahuh a, a zawh pih hi.",
        "Sameh a ne hi.",
        "Be a kheh hi.",
      ],
      tips: [
        { title: "Open Syllables", body: "Syllables ending in a vowel (Ba, De, Si…) are called 'open' — they form the most common word endings in Zolai." },
        { title: "Closed with -h", body: "Adding 'h' to a vowel ending creates a breathy or aspirated tone — Bah, Deh, Gih. Practice exhaling slightly on these." },
        { title: "Tone matters", body: "The same consonant-vowel combination can carry different meanings depending on tone. Pay attention to the written markers in formal Zolai text." },
      ]
    }
  },
  3: {
    title: "Parts of Speech",
    subtitle: "Zolai grammar categorises words into eight main parts of speech (Kammal Namte). Understanding these structures is key to constructing correct sentences.",
    badge: "Lesson III · Grammar",
    tabs: ['Overview', 'Sentences', 'Vocab'],
    content: {
      parts: [
        { name: 'A Min', eng: 'Noun', desc: 'Names persons, places, things, or ideas.', examples: 'inn (house), mun (place), mi (person)' },
        { name: 'Mintaang', eng: 'Pronoun', desc: 'Replaces nouns to avoid repetition.', examples: 'kei (I/me), nang (you), amah (he/she)' },
        { name: 'Gamtatna / Sepna', eng: 'Verb', desc: 'Expresses action or state.', examples: 'pai (go), om (be/exist), sa (sing)' },
        { name: 'Pianzia', eng: 'Adjective', desc: 'Describes or modifies a noun.', examples: 'hoih (good), san (tall), sau (long)' },
        { name: 'Sepzia', eng: 'Adverb', desc: 'Modifies verbs, adjectives, or other adverbs.', examples: 'manmaan (carefully), bek (only), mahmah (very)' },
        { name: 'Munlahna', eng: 'Preposition', desc: 'Shows relationships between words.', examples: 'ah (in/at), tawh (with), pan (from)' },
        { name: 'Thuzopna', eng: 'Conjunction', desc: 'Connects words, phrases, or clauses.', examples: 'leh (and), napi-in (but), zong (also)' },
        { name: 'Lamdang Sakna', eng: 'Interjection', desc: 'Expresses sudden emotion.', examples: 'Oh! Hallo! Ah! Alas! Nuvaw!' },
      ],
      sentences: [
        "Aung San in Kawlgam adingin a si hi.",
        "Inn a hoih mahmah hi.",
        "Huih a nung hi.",
        "Sakol in, leng a kai hi.",
        "Kei in nisim sang kakah hi.",
        "Nang, mipil khat na hi hi.",
        "Taang in, a hang pasal no khat ahi hi.",
        "Eite in, laitan/a khan kibang i hi hi.",
      ],
      vocab: [
        {z:'inn', e:'house / home'},
        {z:'mi', e:'person / people'},
        {z:'kei', e:'I / me'},
        {z:'nang', e:'you'},
        {z:'amah', e:'he / she / it'},
        {z:'pai', e:'to go'},
        {z:'om', e:'to be / to stay'},
        {z:'hoih', e:'good / beautiful'},
        {z:'leh', e:'and'},
        {z:'ah', e:'in / at (locative)'},
        {z:'hi', e:'is / am / are (copula)'},
        {z:'mahmah', e:'very / greatly'},
        {z:'zong', e:'also / too'},
        {z:'napi-in', e:'but / however'},
        {z:'a', e:'he/she/it (subject marker)'},
        {z:'ih', e:'our / we (possessive)'},
      ]
    }
  },
  4: {
    title: "Nouns & Pronouns",
    subtitle: "Zolai has four types of nouns and six categories of pronouns. Learn how possession, demonstration, and personal reference work in the language.",
    badge: "Lesson IV · Nominals",
    tabs: ['Noun Types', 'Pronoun Chart', 'Practice'],
    content: {
      nounTypes: [
        { name: 'Neihkhawm Min', eng: 'Common Noun', desc: 'General names shared by a category.', ex: 'gang (a man), vasa (bird), inn (house)' },
        { name: 'Neihtuam Min', eng: 'Proper Noun', desc: 'Unique names for specific people, places. Always capitalised.', ex: 'Tedim, Cingno, Kawlgam' },
        { name: 'Lawnmawh Min', eng: 'Abstract Noun', desc: 'Intangible things — feelings, ideas, qualities.', ex: 'cidamna (health), dikna (justice), lungdamna (happiness)' },
        { name: 'Honlawhna Min', eng: 'Collective Noun', desc: 'Names for groups of people or things.', ex: 'sangnaupang (students), galkapte (soldiers)' },
      ],
      pronouns: [
        { person: '1st Sing.', zolai: 'Kei', possAdj: 'ka', possP: 'kei a', obj: 'kei\'', eng: 'I / me' },
        { person: '2nd Sing.', zolai: 'Nang', possAdj: 'na', possP: 'nang a', obj: 'nang\'', eng: 'You' },
        { person: '3rd M.', zolai: 'Taang', possAdj: 'taang\'', possP: 'taang a', obj: 'taang\'', eng: 'He / him' },
        { person: '3rd F.', zolai: 'Lia', possAdj: 'lia\'', possP: 'lia a', obj: 'lia\'', eng: 'She / her' },
        { person: '1st Pl.', zolai: 'Eite', possAdj: 'ih', possP: 'ei a', obj: 'ei\'', eng: 'We / us' },
        { person: '2nd Pl.', zolai: 'Note', possAdj: 'no\'', possP: 'nang a', obj: 'no\'', eng: 'You (plural)' },
        { person: '3rd Pl.', zolai: 'Amaute', possAdj: 'amau\'', possP: 'amau a', obj: 'amau\'', eng: 'They / them' },
      ],
      practice: [
        "Kei-in laibu khat nei-ing. — I have a book.",
        "Hihin ka laibu ahi hi. — This is my book.",
        "Nang laibu khat nei teh. — You have a book.",
        "Hih in na laibu hi. — This is your book.",
        "Eite in, inn khat nei hang. — We have a house.",
        "Hih in, ih inn hi. — This is our house.",
        "Taang in laikung khat nei hi. — He has a notebook.",
        "Lia in, laikung khat nei hi. — She has a notebook.",
      ]
    }
  },
  5: {
    title: "Verbs & Tense",
    subtitle: "Zolai verbs change form to express when an action occurs. There are three main tenses, each with four sub-types.",
    badge: "Lesson V · Verbs",
    tabs: ['Tense System', 'Examples', 'Vocab'],
    content: {
      tenses: [
        {
          name: 'Tu Hun — Present Tense', color: '#6b9e7a',
          forms: [
            { label: 'Simple', pattern: 'verb + hi', ex: 'Thangpu a tai hi. — Thangpu runs.' },
            { label: 'Continuous', pattern: 'verb + laitak hi', ex: 'Thangpu a tai laitak hi. — Thangpu is running.' },
            { label: 'Perfect', pattern: 'verb + khinzo hi', ex: 'Thangpu a tai khinzo hi. — Thangpu has run.' },
            { label: 'Perf. Cont.', pattern: 'verb×2 + khinzo hi', ex: 'Thangpu a taitai khinzo hi. — Thangpu has been running.' },
          ]
        },
        {
          name: 'A Beisa Hun — Past Tense', color: '#c9a84c',
          forms: [
            { label: 'Simple', pattern: 'verb + khin hi', ex: 'Thangpu a tai khin hi. — Thangpu ran.' },
            { label: 'Continuous', pattern: 'verb + khit laitak hi', ex: 'Thangpu a tai khit laitak hi. — Thangpu was running.' },
            { label: 'Perfect', pattern: 'verb + khinzota hi', ex: 'Thangpu a tai khinzota hi. — Thangpu had run.' },
            { label: 'Perf. Cont.', pattern: 'verb×2 + khinzota hi', ex: 'Thangpu a taitai khinzota hi. — Thangpu had been running.' },
          ]
        },
        {
          name: 'Mailam Hun — Future Tense', color: '#e07b4a',
          forms: [
            { label: 'Simple', pattern: 'verb + ding hi', ex: 'Thangpu a tai ding hi. — Thangpu will run.' },
            { label: 'Continuous', pattern: 'verb + ding laitak hi', ex: 'Thangpu a tai ding laitak hi. — Thangpu will be running.' },
            { label: 'Perfect', pattern: 'verb + khinzo tading hi', ex: 'Thangpu a tai khinzo tading hi. — Thangpu will have run.' },
            { label: 'Perf. Cont.', pattern: 'verb×2 + khinzota ding hi', ex: 'Thangpu a taitai khinzota ding hi. — Thangpu will have been running.' },
          ]
        }
      ],
      examples: [
        "Tua lai-ah ni simin, ka pai hi. — I go there every day.",
        "Hih lai-ah tu ni-in, kapa a om hi. — Today my father is here.",
        "Ni-in siangtakin, a taang hi. — He stands upright.",
        "Tua lai-ah ni simin, ka paikhin hi. — I went there every day.",
        "Hih lai-ah zanin, kapa omkhin hi. — Last night my father was here.",
        "Tua lai-ah ni simin, ka paiding hi. — I will go there every day.",
        "Hih lai-ah zing ciangin, kapa omding hi. — Tomorrow morning my father will be here.",
        "Kei in, inn ah ka ciah ding hi. — I will return home.",
      ],
      vocab: [
        {z:'pai', e:'go'}, {z:'om', e:'be / stay / exist'}, {z:'taang', e:'stand'},
        {z:'ciah', e:'return / come back'}, {z:'tai', e:'run'}, {z:'ne', e:'eat'},
        {z:'sa', e:'sing'}, {z:'sim', e:'read / study'}, {z:'nei', e:'have / own'},
        {z:'gen', e:'speak / say'}, {z:'mu', e:'see'}, {z:'kah', e:'study (at school)'},
        {z:'hi', e:'is/am/are (copula)'}, {z:'khin', e:'past marker'}, {z:'ding', e:'future marker'},
        {z:'laitak', e:'continuous marker'}, {z:'khinzo', e:'perfect marker'}, {z:'mahmah', e:'very'},
      ]
    }
  },
  6: {
    title: "Adjectives",
    subtitle: "Pianzia kammalte — descriptive words that modify nouns. Zolai adjectives come in six types and have a systematic comparison system.",
    badge: "Lesson VI · Adjectives",
    tabs: ['Types', 'Comparison', 'Practice'],
    content: {
      types: [
        { name: 'Phacia Lak Pianzia', eng: 'Quality', desc: 'Describes inherent qualities.', ex: 'hoih (beautiful), hat (strong), pil (wise)' },
        { name: 'Phazah Lak Pianzia', eng: 'Quantity', desc: 'Describes amounts (uncountable).', ex: 'tampi (many), tawmkha (few), beek (none)' },
        { name: 'Amalzah Lak Pianzia', eng: 'Number', desc: 'Describes countable amounts.', ex: 'nga (five), sawmnih (twenty), giat (eight)' },
        { name: 'Lahkhiatna Lak Pianzia', eng: 'Demonstrative', desc: 'Points to specific things.', ex: 'hih (this), hua (that), tua (that one)' },
        { name: 'Dotna Lak Pianzia', eng: 'Interrogative', desc: 'Used in questions.', ex: 'bangci (what kind), koi (which)' },
        { name: 'Neihna Lak Pianzia', eng: 'Possessive', desc: 'Shows ownership or possession.', ex: "ka (my), na (your), taang' (his), lia' (her), ih (our)" },
      ],
      comparison: [
        { degree: 'Positive', zolai_suffix: '(root form)', example: 'Mangpu in, a thahat mi khat ahi hi.', english: 'Mangpu is a strong person.' },
        { degree: 'Comparative', zolai_suffix: '+ zaw', example: 'Mangpu sangin Thangpu hatzaw hi.', english: 'Thangpu is stronger than Mangpu.' },
        { degree: 'Superlative', zolai_suffix: '+ pen', example: 'Tua mite thum lakah Mungno a hat pen ahi hi.', english: 'Among the three, Mungno is the strongest.' },
      ],
      practice: [
        "A mah in, inn hoih khat a nei hi. — He has a beautiful house.",
        "Mi sangpa en dih ve. — Look at that tall man.",
        "A mah in, bawng thau khat a nei hi. — He has a fat cow.",
        "Hih tangvalpa in, a thahat hi. — This young man is strong.",
        "Lia in, a melhoih hi. — She is beautiful.",
        "Nang inn koi pen hiam? — Which house is yours?",
        "Mangno in, a bangci mi ahi hiam? — What kind of person is Mangno?",
        "Mangpu sangin Thangpu hatzaw hi. — Thangpu is stronger than Mangpu.",
      ]
    }
  }
};

// ── QUIZ DATA ──
const quizBank = [
  // Alphabet
  { q: "What does 'Awsuaksak' mean in Zolai grammar?", opts: ["Consonants","Vowels","Syllables","Sentences"], ans: 1, lesson: 1 },
  { q: "Which of these letters is a Zolai vowel (Awsuaksak)?", opts: ["B","K","aw","Ng"], ans: 2, lesson: 1 },
  { q: "How many core vowel sounds does Zolai have?", opts: ["4","5","6","8"], ans: 2, lesson: 1 },
  // Syllables
  { q: "What is the Zolai word for 'house'?", opts: ["mi","inn","pai","leh"], ans: 1, lesson: 2 },
  { q: "Complete the syllable: 'B' + 'aw' = ?", opts: ["Baw","Bih","Boh","Buh"], ans: 0, lesson: 2 },
  { q: "Which ending makes a syllable 'breathy' or aspirated?", opts: ["vowel + k","vowel + h","vowel + ng","vowel + m"], ans: 1, lesson: 2 },
  // Parts of Speech
  { q: "What is the Zolai term for 'Verb'?", opts: ["Mintaang","Pianzia","Gamtatna / Sepna","Munlahna"], ans: 2, lesson: 3 },
  { q: "In Zolai, 'leh' is a ___?", opts: ["Noun","Adjective","Conjunction","Preposition"], ans: 2, lesson: 3 },
  { q: "Which word means 'very / greatly' in Zolai?", opts: ["mahmah","zong","napi-in","bek"], ans: 0, lesson: 3 },
  // Pronouns
  { q: "What is 'we / us' in Zolai?", opts: ["Nang","Kei","Eite","Amah"], ans: 2, lesson: 4 },
  { q: "The Zolai word for 'he' (masculine, literary) is?", opts: ["Lia","Amah","Taang","Eite"], ans: 2, lesson: 4 },
  { q: "Which pronoun means 'she' in formal Zolai?", opts: ["Taang","Nang","Kei","Lia"], ans: 3, lesson: 4 },
  { q: "The possessive adjective for 'our' (eite) is?", opts: ["ka","na","ih","amau'"], ans: 2, lesson: 4 },
  // Verbs & Tense
  { q: "How do you form the Simple Past tense in Zolai?", opts: ["verb + ding hi","verb + khin hi","verb + laitak hi","verb + khinzo hi"], ans: 1, lesson: 5 },
  { q: "What does 'ding' added to a verb indicate?", opts: ["Past tense","Present perfect","Future tense","Continuous aspect"], ans: 2, lesson: 5 },
  { q: "Translate: 'Thangpu a tai khin hi'", opts: ["Thangpu is running","Thangpu ran","Thangpu will run","Thangpu has run"], ans: 1, lesson: 5 },
  { q: "Which Zolai word means 'to go'?", opts: ["ne","om","pai","sa"], ans: 2, lesson: 5 },
  // Adjectives
  { q: "The Comparative degree in Zolai is formed by adding?", opts: ["+ pen","+ zaw","+ mahmah","+ bek"], ans: 1, lesson: 6 },
  { q: "What type of adjective is 'hih' (this)?", opts: ["Quality","Number","Demonstrative","Interrogative"], ans: 2, lesson: 6 },
  { q: "What does 'hat pen' mean?", opts: ["Very strong","Strongest","Stronger than","Quite strong"], ans: 1, lesson: 6 },
  { q: "Which type of adjective is 'ka' (my) or 'na' (your) in Zolai?", opts: ["Quality Adjective","Demonstrative Adjective","Interrogative Adjective","Possessive Adjective"], ans: 3, lesson: 6 },
];

// ── RENDER HELPERS ──
function setNav(viewId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(viewId);
  if (el) el.classList.add('active');
}

function setBreadcrumb(text) {
  document.getElementById('breadcrumb').textContent = text;
}

function updateXP() {
  document.getElementById('xpCount').textContent = state.xp + ' XP';
  const pct = Math.min(100, Math.round((state.completedLessons.size / 6) * 100));
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
}

function markLessonComplete(n) {
  if (!state.completedLessons.has(n)) {
    state.completedLessons.add(n);
    state.xp += 50;
    const el = document.getElementById('status-' + n);
    if (el) el.textContent = '✓';
    document.getElementById('nav-lesson' + n)?.classList.add('completed');
    updateXP();
  }
}

// ── VIEWS ──
function showView(view) {
  const sec = SECTIONS[view];
  if (sec) {
    if (!isGlobalEnabled(view)) return showView('home');
    state.activeView = view;
    const c = document.getElementById('mainContent');
    c.className = 'content fade-in';
    setNav(sec.navId);
    setBreadcrumb(getFeatureFlags().labels?.[view] || sec.defaultLabel);
    if (sec.mnavId) setMobileNav(sec.mnavId);
    sec.render(c);
    closeLessonPicker();
    return;
  }
  // home
  state.activeView = 'home';
  const c = document.getElementById('mainContent');
  c.className = 'content fade-in';
  setNav('nav-home');
  setBreadcrumb('Home');
  renderHome(c);
  setMobileNav('mnav-home');
  closeLessonPicker();
}

function showLesson(n) {
  state.currentLesson = n;
  state.activeView = 'lesson';
  setNav('nav-lesson' + n);
  setBreadcrumb('Lessons → ' + lessons[n].title);
  const c = document.getElementById('mainContent');
  c.className = 'content fade-in';
  renderLesson(n, c, 0);
}

// ── HOME ──
function renderHome(c) {
  const done = state.completedLessons.size;
  c.innerHTML = `
    <div class="home-hero">
      <div class="lesson-badge">${BRAND.heroBadge}</div>
      <div class="home-hero-title">${BRAND.heroTitle}</div>
      <div class="home-hero-sub">${BRAND.heroSubtitle}</div>
      <button class="btn btn-primary" onclick="showLesson(${done < 6 ? done + 1 : 1})">
        ${done === 0 ? '→ Begin Learning' : done < 6 ? '→ Continue Lesson ' + (done+1) : '→ Review Lessons'}
      </button>
    </div>

    <div class="module-grid">
      ${[
        {icon:'◎', title:'Phonetics', desc:'Consonants, vowels, and syllable patterns', lesson:1, pct: state.completedLessons.has(1)?100:0},
        {icon:'⊞', title:'Word Building', desc:'Combining sounds into meaningful syllables', lesson:2, pct: state.completedLessons.has(2)?100:0},
        {icon:'≋', title:'Grammar Basics', desc:'Parts of speech and sentence structure', lesson:3, pct: state.completedLessons.has(3)?100:0},
        {icon:'◈', title:'Nominals', desc:'Nouns, pronouns, and possession', lesson:4, pct: state.completedLessons.has(4)?100:0},
        {icon:'▷', title:'Verbs & Tense', desc:'Actions, states, and time expressions', lesson:5, pct: state.completedLessons.has(5)?100:0},
        {icon:'◇', title:'Adjectives', desc:'Description and comparison', lesson:6, pct: state.completedLessons.has(6)?100:0},
      ].map(m => `
        <div class="module-card" onclick="showLesson(${m.lesson})">
          <div class="module-icon">${m.icon}</div>
          <div class="module-title">${m.title}</div>
          <div class="module-desc">${m.desc}</div>
          <div class="module-progress">
            <div class="mini-bar"><div class="mini-fill" style="width:${m.pct}%"></div></div>
            <span>${m.pct === 100 ? '✓ Done' : 'Start'}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-title">About This Text</div>
      <div class="info-box">
        ${BRAND.aboutText}
      </div>
    </div>
  `;
}

// ── LESSON RENDERER ──
function renderLesson(n, c, tabIdx) {
  const L = lessons[n];
  const tabContent = renderLessonTab(n, tabIdx);

  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">${L.badge}</div>
      <div class="lesson-title">${L.title}</div>
      <div class="lesson-subtitle">${L.subtitle}</div>
    </div>

    <div class="tabs" id="lessonTabs">
      ${L.tabs.map((t,i) => `<button class="tab${i===tabIdx?' active':''}" onclick="switchTab(${n},${i})">${t}</button>`).join('')}
    </div>

    <div id="tabContent">${tabContent}</div>

    <div style="display:flex;gap:12px;margin-top:32px;align-items:center">
      ${n > 1 ? `<button class="btn btn-outline" onclick="showLesson(${n-1})">← Previous</button>` : ''}
      <button class="btn btn-primary" onclick="markLessonComplete(${n}); ${n<6?`showLesson(${n+1})`:`showView('quiz')`}">
        ${n < 6 ? 'Next Lesson →' : 'Take the Quiz →'}
      </button>
    </div>
  `;
}

function switchTab(n, tabIdx) {
  const c = document.getElementById('mainContent');
  renderLesson(n, c, tabIdx);
}

function renderLessonTab(n, tabIdx) {
  const L = lessons[n];
  const d = L.content;

  if (n === 1) {
    if (tabIdx === 0) {
      return `
        <div class="card">
          <div class="card-title">Laimungte — Consonants</div>
          <div class="info-box"><strong>Zolai consonants</strong> are the backbone of every word. The special digraphs Ng, Kh, Ph, and Th each represent a single sound.</div>
          <div class="syllable-grid">
            ${d.consonants.items.map(c => `<div class="syllable-cell" data-toggle="highlight" data-item-key="${c}">${c}</div>`).join('')}
          </div>
        </div>`;
    } else if (tabIdx === 1) {
      return `
        <div class="card">
          <div class="card-title">Awsuaksak — Vowels</div>
          <div class="info-box">Zolai has <strong>six core vowel sounds</strong>. The vowel 'aw' is a unique rounded back vowel not found in English.</div>
          <div class="syllable-grid" style="grid-template-columns:repeat(3,1fr)">
            ${d.vowels.items.map(v => `
              <div class="syllable-cell highlighted" style="padding:16px 8px" data-toggle="highlight" data-item-key="${v.symbol}">
                <div style="font-size:22px;font-weight:700;color:var(--gold-light)">${v.symbol}</div>
                <div style="font-size:10px;color:var(--text-dim);margin-top:4px">${v.note}</div>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      return `
        <div class="card">
          <div class="card-title">Practice Sentences</div>
          <div class="info-box">These sentences from <em>Sinna II</em> use simple consonant+vowel combinations. Read each aloud.</div>
          <div class="sentence-list">
            ${d.practice.map((s,i) => `
              <div class="sentence-item">
                <span class="sentence-num">${i+1}.</span>
                <span class="sentence-text">${s}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  if (n === 2) {
    if (tabIdx === 0) {
      const headers = d.vowelHeaders;
      return `
        <div class="card" style="overflow-x:auto">
          <div class="card-title">Syllable Combination Table</div>
          <div class="info-box">Click any cell to highlight it. Each row shows one consonant combined with all vowel endings.</div>
          <table style="border-collapse:collapse;width:100%;min-width:700px">
            <tr>
              <th class="syllable-header" style="text-align:left;padding-left:12px">Cons.</th>
              ${headers.map(h=>`<th class="syllable-header">${h}</th>`).join('')}
            </tr>
            ${d.syllableRows.map(row=>`
              <tr>
                <td style="padding:4px 12px;font-family:'DM Mono',monospace;font-size:12px;color:var(--gold-dim);border-bottom:1px solid var(--border)">${row.cons}</td>
                ${row.cells.map(cell=>`<td style="padding:2px;border-bottom:1px solid var(--border)"><div class="syllable-cell" data-toggle="highlight">${cell}</div></td>`).join('')}
              </tr>`).join('')}
          </table>
        </div>`;
    } else if (tabIdx === 1) {
      return `
        <div class="card">
          <div class="card-title">Practice Sentences — Sinna III</div>
          <div class="sentence-list">
            ${d.sentences.map((s,i) => `
              <div class="sentence-item">
                <span class="sentence-num">${i+1}.</span>
                <span class="sentence-text">${s}</span>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      return `
        ${d.tips.map(t=>`
          <div class="card">
            <div class="card-title">${t.title}</div>
            <div style="font-size:14.5px;color:var(--text-muted);line-height:1.7">${t.body}</div>
          </div>`).join('')}`;
    }
  }

  if (n === 3) {
    if (tabIdx === 0) {
      return `
        <div class="card">
          <div class="card-title">Kammal Namte — Parts of Speech</div>
          <table class="grammar-table">
            <tr><th>Zolai Term</th><th>English</th><th>Description</th><th>Examples</th></tr>
            ${d.parts.map(p=>`
              <tr>
                <td class="z">${p.name}</td>
                <td style="color:var(--gold-light);font-size:13px">${p.eng}</td>
                <td class="e">${p.desc}</td>
                <td><span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${p.examples}</span></td>
              </tr>`).join('')}
          </table>
        </div>`;
    } else if (tabIdx === 1) {
      return `
        <div class="card">
          <div class="card-title">Example Sentences</div>
          <div class="sentence-list">
            ${d.sentences.map((s,i)=>`
              <div class="sentence-item">
                <span class="sentence-num">${i+1}.</span>
                <span class="sentence-text">${s}</span>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      return `
        <div class="card">
          <div class="card-title">Core Vocabulary</div>
          <div class="vocab-grid">
            ${d.vocab.map(v=>`
              <div class="vocab-item">
                <span class="vocab-zolai">${v.z}</span>
                <span class="vocab-arrow">→</span>
                <span class="vocab-english">${v.e}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  if (n === 4) {
    if (tabIdx === 0) {
      return `
        <div class="card">
          <div class="card-title">Four Types of Nouns — A Min Namte</div>
          ${d.nounTypes.map(nt=>`
            <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px">
                <span style="font-family:'DM Mono',monospace;color:var(--gold-light);font-size:14px">${nt.name}</span>
                <span style="font-size:12px;color:var(--text-dim)">(${nt.eng})</span>
              </div>
              <div style="font-size:13.5px;color:var(--text-muted);margin-bottom:6px">${nt.desc}</div>
              <div style="font-size:12.5px;color:var(--text-dim);font-family:'DM Mono',monospace">${nt.ex}</div>
            </div>`).join('')}
        </div>`;
    } else if (tabIdx === 1) {
      return `
        <div class="card" style="overflow-x:auto">
          <div class="card-title">Personal Pronoun Chart</div>
          <div class="info-box">Unlike English, Zolai uses different words for masculine (<strong>Taang</strong>) and feminine (<strong>Lia</strong>) third person — a classical distinction preserved in formal writing.</div>
          <table class="grammar-table" style="min-width:560px">
            <tr><th>Person</th><th>Subject</th><th>Poss. Adj.</th><th>Poss. Pro.</th><th>Object</th><th>English</th></tr>
            ${d.pronouns.map(p=>`
              <tr>
                <td style="font-size:12px;color:var(--text-dim)">${p.person}</td>
                <td class="z">${p.zolai}</td>
                <td class="z">${p.possAdj}</td>
                <td class="z">${p.possP}</td>
                <td class="z">${p.obj}</td>
                <td class="e">${p.eng}</td>
              </tr>`).join('')}
          </table>
        </div>`;
    } else {
      return `
        <div class="card">
          <div class="card-title">Practice Sentences</div>
          <div class="sentence-list">
            ${d.practice.map((s,i)=>`
              <div class="sentence-item">
                <span class="sentence-num">${i+1}.</span>
                <span class="sentence-text">${s}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  if (n === 5) {
    if (tabIdx === 0) {
      return d.tenses.map(t=>`
        <div class="card" style="border-left:3px solid ${t.color}">
          <div class="card-title" style="color:${t.color}">${t.name}</div>
          <table class="grammar-table">
            <tr><th>Aspect</th><th>Pattern</th><th>Example</th></tr>
            ${t.forms.map(f=>`
              <tr>
                <td style="color:var(--text-muted);font-size:12px;white-space:nowrap">${f.label}</td>
                <td class="z" style="font-size:12px">${f.pattern}</td>
                <td class="e">${f.ex}</td>
              </tr>`).join('')}
          </table>
        </div>`).join('');
    } else if (tabIdx === 1) {
      return `
        <div class="card">
          <div class="card-title">Sentences by Tense</div>
          <div class="sentence-list">
            ${d.examples.map((s,i)=>`
              <div class="sentence-item">
                <span class="sentence-num">${i+1}.</span>
                <span class="sentence-text">${s}</span>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      return `
        <div class="card">
          <div class="card-title">Core Verb Vocabulary</div>
          <div class="vocab-grid">
            ${d.vocab.map(v=>`
              <div class="vocab-item">
                <span class="vocab-zolai">${v.z}</span>
                <span class="vocab-arrow">→</span>
                <span class="vocab-english">${v.e}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  if (n === 6) {
    if (tabIdx === 0) {
      return `
        <div class="card">
          <div class="card-title">Six Types of Adjectives</div>
          <table class="grammar-table">
            <tr><th>Zolai Term</th><th>Type</th><th>Description</th><th>Examples</th></tr>
            ${d.types.map(t=>`
              <tr>
                <td class="z" style="font-size:12px">${t.name}</td>
                <td style="color:var(--gold-light);font-size:13px">${t.eng}</td>
                <td class="e">${t.desc}</td>
                <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text-muted)">${t.ex}</td>
              </tr>`).join('')}
          </table>
        </div>`;
    } else if (tabIdx === 1) {
      return `
        <div class="card">
          <div class="card-title">Saikak / Tehkak — Degrees of Comparison</div>
          <div class="info-box">Comparison in Zolai is formed by adding suffixes to the <strong>positive (root) form</strong> of the adjective.</div>
          <table class="grammar-table">
            <tr><th>Degree</th><th>Suffix</th><th>Zolai Example</th><th>English</th></tr>
            ${d.comparison.map(c=>`
              <tr>
                <td style="color:var(--gold-light);font-size:13px">${c.degree}</td>
                <td class="z">${c.zolai_suffix}</td>
                <td class="e" style="font-style:italic">${c.example}</td>
                <td class="e">${c.english}</td>
              </tr>`).join('')}
          </table>
        </div>`;
    } else {
      return `
        <div class="card">
          <div class="card-title">Practice Sentences</div>
          <div class="sentence-list">
            ${d.practice.map((s,i)=>`
              <div class="sentence-item">
                <span class="sentence-num">${i+1}.</span>
                <span class="sentence-text">${s}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  return '<div class="card">Content coming soon.</div>';
}

// ── QUIZ ──
let quizQuestions = [];

function renderQuizStart(c) {
  const quizLabel = getFeatureFlags().labels?.quiz || SECTIONS.quiz.defaultLabel;
  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">Practice · All Lessons</div>
      <div class="lesson-title">${quizLabel}</div>
      <div class="lesson-subtitle">Test your knowledge across all six lessons. Each session draws 10 questions from the full question bank.</div>
    </div>
    <div class="card" style="max-width:540px">
      <div class="card-title">How It Works</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
        ${[
          ['◎','10 questions per session','Randomly selected from all lesson topics'],
          ['✦','Instant feedback','Learn from mistakes immediately'],
          ['◈','Track your score','XP awarded for correct answers'],
        ].map(([icon,title,desc])=>`
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,0.1);border:1px solid var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--gold);flex-shrink:0;margin-top:1px">${icon}</div>
            <div>
              <div style="font-size:14px;color:var(--text);font-weight:500">${title}</div>
              <div style="font-size:12.5px;color:var(--text-muted)">${desc}</div>
            </div>
          </div>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="startQuiz()">Start Quiz →</button>
    </div>`;
}

function startQuiz() {
  // Shuffle and pick 10
  quizQuestions = [...quizBank].sort(()=>Math.random()-0.5).slice(0,10);
  state.currentQuizIndex = 0;
  state.quizAnswers = [];
  const c = document.getElementById('mainContent');
  renderQuestion(c);
}

function renderQuestion(c) {
  const q = quizQuestions[state.currentQuizIndex];
  const total = quizQuestions.length;
  const idx = state.currentQuizIndex;
  const letters = ['A','B','C','D'];

  c.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-progress">
        ${Array.from({length:total},(_,i)=>`<div class="qp-dot${i<idx?' done':i===idx?' current':''}"></div>`).join('')}
      </div>
      <div class="quiz-question-num">Question ${idx+1} of ${total}</div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-instruction">Choose the best answer.</div>
      <div class="quiz-options" id="quizOpts">
        ${q.opts.map((opt,i)=>`
          <button class="quiz-option" id="opt${i}" onclick="selectAnswer(${i})">
            <span class="option-letter">${letters[i]}</span>
            ${opt}
          </button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quizFeedback"></div>
      <button class="btn btn-primary hidden" id="nextBtn" onclick="nextQuestion()">
        ${idx === total-1 ? 'See Results →' : 'Next Question →'}
      </button>
    </div>`;
}

function selectAnswer(chosen) {
  const q = quizQuestions[state.currentQuizIndex];
  const correct = q.ans;
  const btns = document.querySelectorAll('.quiz-option');
  const fb = document.getElementById('quizFeedback');

  btns.forEach(b => b.disabled = true);
  btns[correct].classList.add('correct');

  if (chosen === correct) {
    btns[chosen].classList.add('correct');
    state.quizAnswers.push(true);
    state.xp += 10;
    updateXP();
    fb.className = 'quiz-feedback show correct';
    fb.innerHTML = '✓ Correct! +10 XP';
  } else {
    btns[chosen].classList.add('wrong');
    state.quizAnswers.push(false);
    fb.className = 'quiz-feedback show wrong';
    fb.innerHTML = `✗ The correct answer is: <strong>${q.opts[correct]}</strong>`;
  }

  document.getElementById('nextBtn').classList.remove('hidden');
}

function nextQuestion() {
  state.currentQuizIndex++;
  const c = document.getElementById('mainContent');
  if (state.currentQuizIndex >= quizQuestions.length) {
    renderResults(c);
  } else {
    renderQuestion(c);
  }
}

function renderResults(c) {
  const correct = state.quizAnswers.filter(Boolean).length;
  const total = quizQuestions.length;
  const pct = Math.round((correct/total)*100);
  const msg = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practising!';
  const emoji = pct >= 80 ? '◎' : pct >= 60 ? '◈' : '○';

  c.innerHTML = `
    <div class="quiz-container">
      <div class="score-screen">
        <div class="score-ring">${emoji}</div>
        <div class="score-title">${msg}</div>
        <div class="score-subtitle">You answered ${correct} out of ${total} questions correctly.</div>
        <div class="score-stats">
          <div class="score-stat">
            <div class="score-stat-value">${correct}/${total}</div>
            <div class="score-stat-label">Correct</div>
          </div>
          <div class="score-stat">
            <div class="score-stat-value">${pct}%</div>
            <div class="score-stat-label">Score</div>
          </div>
          <div class="score-stat">
            <div class="score-stat-value">${correct*10}</div>
            <div class="score-stat-label">XP Earned</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-outline" onclick="showView('home')">← Home</button>
          <button class="btn btn-primary" onclick="startQuiz()">Try Again →</button>
        </div>
      </div>
    </div>`;
}

// ── REFERENCE ──
function renderReference(c) {
  const adminRef = getAdminSection('_reference');
  const refLabel = getFeatureFlags().labels?.reference || 'Grammar Reference';

  if (adminRef) {
    const grammarHtml = adminRef.map(sec => `
      <div class="card">
        <div class="card-title">${esc(sec.title)}</div>
        <table class="grammar-table">
          <tr><th>Zolai</th><th>English</th></tr>
          ${sec.rows.map(r=>`<tr><td class="z">${esc(r.z)}</td><td class="e">${esc(r.e)}</td></tr>`).join('')}
        </table>
      </div>`).join('');
    c.innerHTML = `
      <div class="lesson-header">
        <div class="lesson-badge">Quick Reference</div>
        <div class="lesson-title">${esc(refLabel)}</div>
        <div class="lesson-subtitle">A condensed reference sheet covering key Zolai grammar terms.</div>
      </div>
      ${grammarHtml}`;
    return;
  }
  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">Quick Reference</div>
      <div class="lesson-title">${refLabel}</div>
      <div class="lesson-subtitle">A condensed reference sheet covering key grammar terms, the pronoun chart, and the tense system.</div>
    </div>

    <div class="card">
      <div class="card-title">Kammal Namte — Parts of Speech</div>
      <table class="grammar-table">
        <tr><th>Zolai</th><th>English</th></tr>
        ${[
          ['A Min','Noun'],['Mintaang','Pronoun'],['Gamtatna / Sepna','Verb'],
          ['Pianzia','Adjective'],['Sepzia / Gamtatnazem','Adverb'],
          ['Munlahna','Preposition'],['Thuzopna','Conjunction'],['Lamdang Sakna','Interjection'],
        ].map(([z,e])=>`<tr><td class="z">${z}</td><td class="e">${e}</td></tr>`).join('')}
      </table>
    </div>

    <div class="card">
      <div class="card-title">Hun Lahkhiatna — Tense Summary</div>
      <table class="grammar-table">
        <tr><th>Tense</th><th>Aspect</th><th>Marker</th></tr>
        ${[
          ['Tu Hun (Present)','Simple','hi'],
          ['Tu Hun','Continuous','laitak hi'],
          ['Tu Hun','Perfect','khinzo hi'],
          ['A Beisa Hun (Past)','Simple','khin hi'],
          ['A Beisa Hun','Continuous','khit laitak hi'],
          ['A Beisa Hun','Perfect','khinzota hi'],
          ['Mailam Hun (Future)','Simple','ding hi'],
          ['Mailam Hun','Continuous','ding laitak hi'],
          ['Mailam Hun','Perfect','khinzo tading hi'],
        ].map(([t,a,m])=>`<tr><td style="color:var(--text-muted);font-size:12.5px">${t}</td><td style="color:var(--text-dim);font-size:12px">${a}</td><td class="z">${m}</td></tr>`).join('')}
      </table>
    </div>

    <div class="card">
      <div class="card-title">Pronoun Quick Reference</div>
      <table class="grammar-table">
        <tr><th>English</th><th>Subject</th><th>Possessive</th><th>Object</th></tr>
        ${[
          ['I / me','Kei','ka','kei\''],
          ['You','Nang','na','nang\''],
          ['He','Taang','taang\'','taang\''],
          ['She','Lia','lia\'','lia\''],
          ['We','Eite','ih','ei\''],
          ['You (pl.)','Note','no\'','no\''],
          ['They','Amaute','amau\'','amau\''],
        ].map(([e,s,p,o])=>`<tr><td class="e">${e}</td><td class="z">${s}</td><td class="z">${p}</td><td class="z">${o}</td></tr>`).join('')}
      </table>
    </div>

    <div class="card">
      <div class="card-title">Adjective Comparison</div>
      <table class="grammar-table">
        <tr><th>Degree</th><th>Formation</th><th>Example</th></tr>
        <tr><td style="color:var(--text-muted)">Positive</td><td class="z">root form</td><td class="e">hat (strong)</td></tr>
        <tr><td style="color:var(--text-muted)">Comparative</td><td class="z">root + zaw</td><td class="e">hatzaw (stronger)</td></tr>
        <tr><td style="color:var(--text-muted)">Superlative</td><td class="z">root + pen</td><td class="e">hat pen (strongest)</td></tr>
      </table>
    </div>

    <div class="card">
      <div class="card-title">Common Vocabulary</div>
      <div class="vocab-grid">
        ${[
          {z:'inn',e:'house'},{z:'mi',e:'person'},{z:'pai',e:'go'},{z:'om',e:'be/stay'},
          {z:'hoih',e:'good/beautiful'},{z:'mahmah',e:'very'},{z:'leh',e:'and'},
          {z:'napi-in',e:'but'},{z:'zong',e:'also'},{z:'ah',e:'in/at'},
          {z:'hi',e:'is/am/are'},{z:'khin',e:'past marker'},{z:'ding',e:'future marker'},
          {z:'khinzo',e:'perfect marker'},{z:'laitak',e:'continuous marker'},{z:'taang',e:'he (masc.)'},
        ].map(v=>`
          <div class="vocab-item">
            <span class="vocab-zolai">${v.z}</span>
            <span class="vocab-arrow">→</span>
            <span class="vocab-english">${v.e}</span>
          </div>`).join('')}
      </div>
    </div>
  `;
}

// ── RESOURCES ──
function renderResources(c) {
  const adminRes = getAdminSection('_resources');
  const resLabel = getFeatureFlags().labels?.resources || 'Resources';

  if (!adminRes || adminRes.length === 0) {
    c.innerHTML = `
      <div class="lesson-header">
        <div class="lesson-badge">Additional Materials</div>
        <div class="lesson-title">${esc(resLabel)}</div>
        <div class="lesson-subtitle">Supplementary materials to support your ${esc(BRAND.languageName)} learning journey.</div>
      </div>
      <div class="card">
        <div class="card-title">📖 Primary Text</div>
        <div class="res-list">
          <div class="res-item">
            <div class="res-item-info">
              <div class="res-item-title">${esc(BRAND.heroBadge)}</div>
              <div class="res-item-desc">${esc(BRAND.appName)} — the foundational ${esc(BRAND.languageName)} grammar and composition guide that all lessons in this app are drawn from.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📝 Study Tips</div>
        <div class="res-list">
          <div class="res-item"><div class="res-item-info">
            <div class="res-item-title">Use the Flashcards daily</div>
            <div class="res-item-desc">Each lesson's Flashcards tab is the fastest way to build vocabulary retention. Aim for one full deck per day.</div>
          </div></div>
          <div class="res-item"><div class="res-item-info">
            <div class="res-item-title">Check the Grammar Reference</div>
            <div class="res-item-desc">The Reference tab has a condensed parts-of-speech chart and the complete tense marker table — useful while reading or writing.</div>
          </div></div>
          <div class="res-item"><div class="res-item-info">
            <div class="res-item-title">Take the Quiz after each level</div>
            <div class="res-item-desc">The Quiz pulls from the full lesson bank. Submit your score to the leaderboard to track progress over time.</div>
          </div></div>
        </div>
      </div>`;
    return;
  }

  const secHtml = adminRes.map(sec => {
    const items = sec.items.map(r => {
      const linkBtn = r.url
        ? `<a href="${esc(r.url)}" target="_blank" rel="noopener" class="res-link-btn">🔗 Open Link</a>`
        : '';
      const fileBtn = r.file
        ? `<a href="${esc(r.file)}" target="_blank" rel="noopener" class="res-link-btn res-dl-btn">📄 Open file</a>`
        : '';
      return `<div class="res-item">
        <div class="res-item-info">
          <div class="res-item-title">${esc(r.label)}</div>
          ${r.desc ? `<div class="res-item-desc">${esc(r.desc)}</div>` : ''}
        </div>
        ${(linkBtn||fileBtn) ? `<div class="res-item-links">${linkBtn}${fileBtn}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="card">
      <div class="card-title">📂 ${esc(sec.title)}</div>
      <div class="res-list">${items || '<p style="color:var(--muted);font-size:13px">No resources yet.</p>'}</div>
    </div>`;
  }).join('');

  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">Additional Materials</div>
      <div class="lesson-title">${esc(resLabel)}</div>
    </div>
    ${secHtml}`;
}

// ── MOBILE NAV ──
function toggleLessonPicker() {
  const picker = document.getElementById('lessonPicker');
  picker.classList.toggle('open');
  document.getElementById('mnav-lessons').classList.toggle('active');
}

function closeLessonPicker() {
  document.getElementById('lessonPicker')?.classList.remove('open');
}

function setMobileNav(id) {
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}


// Global delegated click handler for syllable cells
document.addEventListener('click', function(e) {
  const cell = e.target.closest('[data-toggle="highlight"]');
  if (cell) {
    cell.classList.toggle('highlighted');
  }
});


// ── LEVEL DATA ──
const levelData = {
  beginner: {
    name: 'Beginner',
    zolai: 'Zolai Sim Ni',
    color: '#4a9b7a',
    icon: '🌱',
    desc: 'Start from zero. Learn the alphabet, basic sounds, greetings, and your first 100 Zolai words.',
    topics: ['Sounds','Alphabet','Greetings','100 Core Words','Numbers'],
    cta: "Start here if you're new",
    lessons: {
      1: {
        title: "Alphabet & Sounds",
        subtitle: "The Zolai alphabet — consonants (Laimungte) and vowels (Awsuaksak). Learn to recognise and pronounce every letter.",
        badge: "Lesson 1 · Phonetics",
        tabs: [
          { name: 'Consonants', type: 'grid', title: 'Laimungte — Consonants',
            info: 'Zolai uses 18 consonants. Special digraphs Ng, Kh, Ph, Th each represent one single sound. Letters F, J, Q, R, X, Y appear only in borrowed words.',
            items: ['B','C','D','G','H','K','L','M','N','P','S','T','V','Z','Ng','Kh','Ph','Th'], toggleable: true },
          { name: 'Vowels', type: 'grid', title: 'Awsuaksak — Vowels',
            info: 'Zolai has <strong>6 core vowel sounds</strong>. The vowel \'aw\' is a unique rounded back vowel.',
            items: [{s:'a',n:'as in "father"'},{s:'e',n:'as in "bed"'},{s:'i',n:'as in "see"'},{s:'o',n:'as in "open"'},{s:'u',n:'as in "put"'},{s:'aw',n:'rounded back vowel'}], columns: 3 },
          { name: 'Practice', type: 'sentences', title: 'Practice Reading',
            info: 'Read these sentences aloud. Each one is from the original Paunam Khenna text.',
            items: ['Alu a to hi.','Bi a po zo hi.','Be a su hi.','Ga a la hi.','Ni a sa hi.','Ka mo a gi hi.','Haza va la hi.','Tho a na hi.','Mawtaw ka mu hi.'] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Alphabet & Sounds',
            items: [{z:'a',e:'as in "father"'},{z:'e',e:'as in "bed"'},{z:'i',e:'as in "see"'},{z:'o',e:'as in "open"'},{z:'u',e:'as in "put"'},{z:'aw',e:'rounded back vowel'},{z:'Ng',e:'"ng" as in "sing"'},{z:'Kh',e:'aspirated K'},{z:'Ph',e:'aspirated P'},{z:'Th',e:'aspirated T'},{z:'B',e:'consonant B'},{z:'C',e:'consonant C'},{z:'D',e:'consonant D'},{z:'G',e:'consonant G'},{z:'H',e:'consonant H'},{z:'K',e:'consonant K'},{z:'L',e:'consonant L'},{z:'M',e:'consonant M'},{z:'N',e:'consonant N'},{z:'P',e:'consonant P'},{z:'S',e:'consonant S'},{z:'T',e:'consonant T'},{z:'V',e:'consonant V'},{z:'Z',e:'consonant Z'}] },
        ],
      },
      2: {
        title: "Syllable Patterns",
        subtitle: "How consonants and vowels combine to form syllables. From simple Ba/Be/Bi to complex endings.",
        badge: "Lesson 2 · Syllables",
        tabs: [
          { name: 'Simple', type: 'grid', title: 'Sinna II — Basic Syllables',
            info: 'Consonant + Vowel combinations. These form the basic building blocks of Zolai words.',
            items: ['Ba','Be','Bi','Bo','Bu','Baw','Ca','Ce','Ci','Co','Cu','Caw','Da','De','Di','Do','Du','Daw','Ka','Ke','Ki','Ko','Ku','Kaw','La','Le','Li','Lo','Lu','Law','Ma','Me','Mi','Mo','Mu','Maw','Na','Ne','Ni','No','Nu','Naw','Pa','Pe','Pi','Po','Pu','Paw','Sa','Se','Si','So','Su','Saw','Ta','Te','Ti','To','Tu','Taw'] },
          { name: 'With -h', type: 'grid', title: 'Sinna III — Syllables with -h (breathy)',
            info: 'Adding <strong>-h</strong> to a vowel creates a breathy, aspirated sound. This is a key feature of Zolai phonology.',
            items: ['Bah','Beh','Bih','Boh','Buh','Bawh','Cah','Ceh','Cih','Coh','Cuh','Cawh','Dah','Deh','Dih','Doh','Duh','Dawh','Kah','Keh','Kih','Koh','Kuh','Kawh','Lah','Leh','Lih','Loh','Luh','Lawh','Mah','Meh','Mih','Moh','Muh','Mawh','Nah','Neh','Nih','Noh','Nuh','Nawh'], highlight: true },
          { name: 'Practice', type: 'sentences', title: 'Practice Sentences',
            items: ['Lo ah buhtuh a huh hi.','Zato ah zaa a nuh hi.','Gah leh teh kane hi.','A u buh tuh a huh hi.','A behpa a huh hi.','Sameh a ne hi.','A pi a dah mahmah hi.','Lo ahuh a, a zawh pih hi.'] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Syllable Patterns',
            items: [{z:'Ba / Be / Bi',e:'B + vowel (open syllables)'},{z:'Ka / Ke / Ki',e:'K + vowel combinations'},{z:'La / Le / Li',e:'L + vowel combinations'},{z:'Ma / Me / Mi',e:'M + vowel combinations'},{z:'Na / Ne / Ni',e:'N + vowel combinations'},{z:'Sa / Se / Si',e:'S + vowel combinations'},{z:'Bah / Beh / Bih',e:'B + vowel + h (breathy)'},{z:'Kah / Keh / Kih',e:'K + vowel + h (breathy)'},{z:'Lah / Leh / Lih',e:'L + vowel + h (breathy)'},{z:'Lo ah buhtuh a huh hi.',e:'There is food in the field.'},{z:'Sameh a ne hi.',e:'Sameh is eating.'},{z:'A behpa a huh hi.',e:'His father is there.'},{z:'A pi a dah mahmah hi.',e:'His grandmother is very sad.'},{z:'Gah leh teh kane hi.',e:'Here and there is scattered.'}] },
        ],
      },
      3: {
        title: "Greetings & Phrases",
        subtitle: "Essential Zolai greetings and everyday phrases to start speaking from day one.",
        badge: "Lesson 3 · Greetings",
        tabs: [
          { name: 'Greetings', type: 'vocab-list', title: 'Kihopihnala — Greetings',
            info: 'These are foundational Zolai greetings used in daily life and in the Paunam Khenna text.',
            items: [{z:'Hallo / Dammaw',e:'Hello (greeting)'},{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},{z:'Lungdam mahmah hi.',e:'I am very glad.'},{z:'Itna lianpi tawh kong zawn hi.',e:'I invite you with great love.'},{z:'Hong phawk den.',e:'Please remember (me/us).'},{z:'Na lawm it.',e:'Your loving friend.'},{z:'Kong it pa/nu.',e:'Dear father/mother.'}] },
          { name: 'Phrases', type: 'vocab-list', title: 'Common Phrases',
            items: [{z:'Kei ka dam hi.',e:'I am well.'},{z:'Nang na dam hiam?',e:'Are you well?'},{z:'Ka lungdam mahmah hi.',e:'I am very glad.'},{z:'Ka siate nuam thei mahmah uh hi.',e:'They are also very well.'},{z:'Ka nu leh innkuanpih teng zong ka phawk mahmah hi.',e:'I also greatly remember my mother and family.'},{z:'Ih kimuh lungdam un.',e:'We are glad to meet you (all).'}] },
          { name: 'Practice', type: 'practice', title: 'Practice — Match the meaning',
            info: 'Translate these greetings into English in your head, then tap to reveal.',
            items: [{z:'Hallo / Dammaw',e:'Hello (greeting)'},{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},{z:'Lungdam mahmah hi.',e:'I am very glad.'},{z:'Hong phawk den.',e:'Please remember (me/us).'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Greetings',
            items: [{z:'Hallo / Dammaw',e:'Hello (greeting)'},{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},{z:'Lungdam mahmah hi.',e:'I am very glad.'},{z:'Hong phawk den.',e:'Please remember us.'},{z:'Kei ka dam hi.',e:'I am well.'},{z:'Nang na dam hiam?',e:'Are you well?'},{z:'Ka lungdam mahmah hi.',e:'I am very glad.'},{z:'Ka siate nuam thei mahmah uh hi.',e:'They are also very well.'},{z:'Ih kimuh lungdam un.',e:'We are glad to meet you.'},{z:'Na lawm it.',e:'Your loving friend.'},{z:'Kong it pa/nu.',e:'Dear father/mother.'}] },
        ],
      },
      4: {
        title: "Core 100 Words",
        subtitle: "The 100 most essential Zolai words — nouns, verbs, and particles you'll use every day.",
        badge: "Lesson 4 · Vocabulary",
        tabs: [
          { name: 'Nouns', type: 'vocab-list', title: 'Essential Nouns',
            info: 'Learn these <strong>20 core Zolai nouns</strong> first — they appear in almost every conversation.',
            items: [{z:'mi',e:'person'},{z:'inn',e:'house'},{z:'lo',e:'field/farm'},{z:'tui',e:'water'},{z:'ni',e:'sun/day'},{z:'zan',e:'night'},{z:'lam',e:'road/way'},{z:'sang',e:'school'},{z:'gam',e:'country/land'},{z:'khua',e:'village/town'},{z:'nu',e:'mother'},{z:'pa',e:'father'},{z:'ta',e:'child'},{z:'u',e:'elder sibling'},{z:'nau',e:'younger sibling'},{z:'laibu',e:'book'},{z:'sum',e:'money'},{z:'mawtaw',e:'car'},{z:'vanleng',e:'airplane'},{z:'an',e:'food/rice'}] },
          { name: 'Verbs', type: 'vocab-list', title: 'Essential Verbs',
            info: 'These <strong>20 core Zolai verbs</strong> form the backbone of everyday speech.',
            items: [{z:'pai',e:'go'},{z:'ciah',e:'come/return'},{z:'ne',e:'eat'},{z:'dawn',e:'drink'},{z:'om',e:'be/stay'},{z:'tai',e:'run'},{z:'sim',e:'read/study'},{z:'gel',e:'write'},{z:'sa',e:'sing'},{z:'mu',e:'see'},{z:'theih',e:'know'},{z:'it',e:'love'},{z:'dawng',e:'hear'},{z:'ngaih',e:'think/remember'},{z:'sep',e:'work'},{z:'pia',e:'give'},{z:'la',e:'take'},{z:'lam',e:'walk'},{z:'tu',e:'stand'},{z:'lum',e:'sleep'}] },
          { name: 'Particles', type: 'vocab-list', title: 'Particles & Markers',
            info: 'These small words are essential — they mark grammar roles and modify meaning.',
            items: [{z:'hi',e:'is/am/are (affirmative ending)'},{z:'leh',e:'and'},{z:'in',e:'subject marker'},{z:'a',e:'3rd person subject marker'},{z:'tawh',e:'with'},{z:'ah',e:'at/in'},{z:'panin',e:'from'},{z:'nadingin',e:'for/in order to'},{z:'napi-in',e:'although/even though'},{z:'zong',e:'also/too'},{z:'bek',e:'only/just'},{z:'mahmah',e:'very/greatly'},{z:'kei/lo',e:'not (negation)'},{z:'hiam',e:'question marker'},{z:'ding hi',e:'will (future)'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Core Words',
            items: [{z:'mi',e:'person'},{z:'inn',e:'house'},{z:'laibu',e:'book'},{z:'mawtaw',e:'car'},{z:'an',e:'food/rice'},{z:'pai',e:'go'},{z:'ciah',e:'come/return'},{z:'ne',e:'eat'},{z:'om',e:'be/stay'},{z:'sim',e:'read/study'},{z:'mu',e:'see'},{z:'it',e:'love'},{z:'hi',e:'is/am/are'},{z:'leh',e:'and'},{z:'in',e:'subject marker'},{z:'tawh',e:'with'},{z:'mahmah',e:'very/greatly'},{z:'hiam',e:'question marker'},{z:'ding hi',e:'will (future)'}] },
        ],
      },
      5: {
        title: "Numbers",
        subtitle: "Counting in Zolai from zero to one million. Ordinal numbers, days, and months.",
        badge: "Lesson 5 · Numbers",
        tabs: [
          { name: 'Cardinal', type: 'vocab-list', title: 'Zo Nambatte — Numbers',
            info: 'Zolai has its own number system. Larger numbers are built by combining smaller units.',
            items: [{z:'bem',e:'0'},{z:'khat',e:'1'},{z:'nih',e:'2'},{z:'thum',e:'3'},{z:'li',e:'4'},{z:'nga',e:'5'},{z:'guk',e:'6'},{z:'sagih',e:'7'},{z:'giat',e:'8'},{z:'kua',e:'9'},{z:'sawmkhat',e:'10'},{z:'sawmnih',e:'20'},{z:'zakhat',e:'100'},{z:'tulkhat',e:'1,000'},{z:'thenkhat',e:'10,000'},{z:'awnkhat',e:'1,000,000'}] },
          { name: 'Ordinal', type: 'vocab-list', title: 'Ordinal Numbers',
            info: 'Add <strong>-na</strong> after a cardinal number to make it ordinal (1st, 2nd, 3rd...).',
            items: [{z:'a khatna',e:'1st'},{z:'a nihna',e:'2nd'},{z:'a thumna',e:'3rd'},{z:'a lina',e:'4th'},{z:'a ngana',e:'5th'},{z:'a masa',e:'first (the original)'},{z:'a tawpna',e:'last'}] },
          { name: 'Days & Months', type: 'multi-section', title: 'Days & Months',
            info: 'Days of the week (Nipikal minte) and months (Kraminte) in Zolai.',
            sections: [
              { heading: 'Days of the Week', items: [{z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},{z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'}] },
              { heading: 'Months', items: [{z:'Theinosihkha',e:'January'},{z:'Tunkha',e:'February'},{z:'Dota',e:'March'},{z:'Dopi',e:'April'},{z:'Zingkha',e:'May'},{z:'Gamkha',e:'June'},{z:'Tangsihkha',e:'July'},{z:'Tangkha',e:'August'},{z:'Phalkha',e:'September'},{z:'Khuadokha',e:'October'},{z:'Nokha',e:'November'},{z:'Kaukha',e:'December'}] },
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Numbers',
            items: [{z:'bem',e:'0 (zero)'},{z:'khat',e:'1 (one)'},{z:'nih',e:'2 (two)'},{z:'thum',e:'3 (three)'},{z:'li',e:'4 (four)'},{z:'nga',e:'5 (five)'},{z:'guk',e:'6 (six)'},{z:'sagih',e:'7 (seven)'},{z:'giat',e:'8 (eight)'},{z:'kua',e:'9 (nine)'},{z:'sawmkhat',e:'10 (ten)'},{z:'sawmnih',e:'20 (twenty)'},{z:'zakhat',e:'100 (hundred)'},{z:'tulkhat',e:'1,000 (thousand)'},{z:'awnkhat',e:'1,000,000 (million)'},{z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},{z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'}] },
        ],
      },
    },
    vocabData: [
      { category: 'Greetings', words: [
        {z:'Hallo / Dammaw', e:'Hello'},
        {z:'Na dam hiam?', e:'Are you well?'},
        {z:'Ka dam hi.', e:'I am well.'},
        {z:'Lungdam mahmah hi.', e:'I am very glad.'},
        {z:'Hong phawk den.', e:'Please remember us.'},
        {z:'Na lawm it.', e:'Your loving friend.'},
        {z:'Kong it pa/nu.', e:'Dear father / mother.'},
        {z:'Ih kimuh lungdam un.', e:'We are glad to meet you.'},
      ]},
      { category: 'Nouns', words: [
        {z:'mi', e:'person'}, {z:'inn', e:'house'}, {z:'lo', e:'field / farm'},
        {z:'tui', e:'water'}, {z:'ni', e:'sun / day'}, {z:'zan', e:'night'},
        {z:'sang', e:'school'}, {z:'gam', e:'country / land'}, {z:'khua', e:'village / town'},
        {z:'nu', e:'mother'}, {z:'pa', e:'father'}, {z:'ta', e:'child'},
        {z:'u', e:'elder sibling'}, {z:'nau', e:'younger sibling'},
        {z:'laibu', e:'book'}, {z:'sum', e:'money'}, {z:'mawtaw', e:'car'},
        {z:'vanleng', e:'airplane'}, {z:'an', e:'food / rice'}, {z:'lam', e:'road / way'},
      ]},
      { category: 'Verbs', words: [
        {z:'pai', e:'go'}, {z:'ciah', e:'come / return'}, {z:'ne', e:'eat'},
        {z:'dawn', e:'drink'}, {z:'om', e:'be / stay'}, {z:'tai', e:'run'},
        {z:'sim', e:'read / study'}, {z:'gel', e:'write'}, {z:'sa', e:'sing'},
        {z:'mu', e:'see'}, {z:'theih', e:'know'}, {z:'it', e:'love'},
        {z:'dawng', e:'hear'}, {z:'ngaih', e:'think / remember'}, {z:'sep', e:'work'},
        {z:'pia', e:'give'}, {z:'la', e:'take'}, {z:'lam', e:'walk'},
        {z:'tu', e:'stand'}, {z:'lum', e:'sleep'},
      ]},
      { category: 'Particles', words: [
        {z:'hi', e:'is / am / are (affirmative ending)'}, {z:'leh', e:'and'},
        {z:'in', e:'subject marker'}, {z:'a', e:'3rd person subject marker'},
        {z:'tawh', e:'with'}, {z:'ah', e:'at / in'}, {z:'panin', e:'from'},
        {z:'nadingin', e:'for / in order to'}, {z:'napi-in', e:'although / even though'},
        {z:'zong', e:'also / too'}, {z:'bek', e:'only / just'}, {z:'mahmah', e:'very / greatly'},
        {z:'hiam', e:'question marker'}, {z:'ding hi', e:'will (future marker)'},
      ]},
      { category: 'Numbers', words: [
        {z:'bem', e:'0'}, {z:'khat', e:'1'}, {z:'nih', e:'2'}, {z:'thum', e:'3'},
        {z:'li', e:'4'}, {z:'nga', e:'5'}, {z:'guk', e:'6'}, {z:'sagih', e:'7'},
        {z:'giat', e:'8'}, {z:'kua', e:'9'}, {z:'sawmkhat', e:'10'},
        {z:'sawmnih', e:'20'}, {z:'zakhat', e:'100'}, {z:'tulkhat', e:'1,000'},
        {z:'Nipi', e:'Sunday'}, {z:'Pizang', e:'Monday'}, {z:'Pithai', e:'Tuesday'},
        {z:'Nilai', e:'Wednesday'}, {z:'Laizing', e:'Thursday'}, {z:'Laithai', e:'Friday'}, {z:'Nino', e:'Saturday'},
      ]},
    ],
    quizBank: [
      { q: "How many core vowels does Zolai have?", opts: ["4","5","6","7"], ans: 2 },
      { q: "Which letter is a Zolai vowel?", opts: ["B","K","aw","Ng"], ans: 2 },
      { q: "What does 'inn' mean?", opts: ["river","house","person","tree"], ans: 1 },
      { q: "How do you say 'Hello' in Zolai?", opts: ["Damno","Hallo","Lungdam","Pai"], ans: 1 },
      { q: "What is 'khat' in Zolai?", opts: ["two","ten","one","zero"], ans: 2 },
      { q: "What is the word for 'person' in Zolai?", opts: ["mi","ni","pai","inn"], ans: 0 },
      { q: "'Nih' means?", opts: ["one","two","three","four"], ans: 1 },
      { q: "Which consonant digraph is unique to Zolai?", opts: ["sh","ch","Ng","wh"], ans: 2 },
      { q: "What does 'dam' mean?", opts: ["sick","well/healthy","tired","hungry"], ans: 1 },
      { q: "'Sawm' means?", opts: ["100","10","1000","5"], ans: 1 },
    ]
  },
  elementary: {
    name: 'Elementary',
    zolai: 'Paunam Khenna 1',
    color: '#5b8fd4',
    icon: '📖',
    desc: 'Build your first sentences. Learn numbers, time expressions, and simple everyday conversations.',
    topics: ['Basic Sentences','Numbers','Time','Articles','Dialogues'],
    cta: 'For early learners',
    lessons: {
      1: {
        title: "Basic Sentences",
        subtitle: "How Zolai sentences are structured. Subject, predicate, and basic sentence patterns.",
        badge: "Lesson 1 · Sentences",
        tabs: [
          { name: 'Structure', type: 'type-cards', title: 'Laigual — Sentence Structure',
            items: [
              {name:'Subject + Verb + hi', en:'Taang a tai hi.', desc:'He runs. (most basic pattern)'},
              {name:'Subject + in + Object + Verb + hi', en:'Lianpi in kong a khak hi.', desc:'Lianpi knocked the door.'},
              {name:'Subject + Adjective + hi', en:'Inn a hoih mahmah hi.', desc:'The house is very beautiful.'},
              {name:'Question: ...hiam?', en:'Nang na dam hiam?', desc:'Are you well?'},
            ] },
          { name: 'Examples', type: 'vocab-list', title: 'Example Sentences',
            info: 'Read these sentences. Notice how \'a\' appears before many verbs and \'hi\' ends most statements.',
            items: [{z:'Va-ak in moh a tuah hi.',e:'The crow played a trick.'},{z:'Ka nu ka it hi.',e:'I love my mother.'},{z:'Inn a hoih mahmah hi.',e:'The house is very beautiful.'},{z:'Huih a nung hi.',e:'The wind is blowing.'},{z:'Sakol in, leng a kai hi.',e:'The horse climbed the hill.'}] },
          { name: 'Practice', type: 'vocab-list', title: 'Positive, Negative, Question',
            info: 'Add <strong>kei/lo</strong> for negative, and <strong>hiam/hia/maw</strong> for questions.',
            items: [{z:'Kei in nasep ka hanciam hi.',e:'I work hard. (positive)'},{z:'Kei in nasep ka hanciam kei hi.',e:'I do not work hard. (negative)'},{z:'Kei in nasep ka hanciam hiam?',e:'Do I work hard? (question)'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Sentences',
            items: [{z:'Laigual',e:'sentence'},{z:'A sempa',e:'subject (of sentence)'},{z:'A thu',e:'predicate'},{z:'hi',e:'affirmative sentence ending'},{z:'kei/lo',e:'negation marker'},{z:'hiam',e:'question marker'},{z:'Va-ak in moh a tuah hi.',e:'The crow played a trick.'},{z:'Ka nu ka it hi.',e:'I love my mother.'},{z:'Inn a hoih mahmah hi.',e:'The house is very beautiful.'},{z:'Kei in nasep ka hanciam kei hi.',e:'I do not work hard. (negative)'}] },
        ],
      },
      2: {
        title: "Numbers & Counting",
        subtitle: "Full number system — cardinal, ordinal, and how to use numbers in sentences.",
        badge: "Lesson 2 · Numbers",
        tabs: [
          { name: 'Cardinal', type: 'vocab-list', title: 'Full Number System',
            info: 'Larger numbers combine smaller ones: <strong>sawm-leh-khat = 11</strong>, <strong>sawmnih-nga = 25</strong>.',
            items: [{z:'bem',e:'0'},{z:'khat',e:'1'},{z:'nih',e:'2'},{z:'thum',e:'3'},{z:'li',e:'4'},{z:'nga',e:'5'},{z:'guk',e:'6'},{z:'sagih',e:'7'},{z:'giat',e:'8'},{z:'kua',e:'9'},{z:'sawmkhat',e:'10'},{z:'sawmnih',e:'20'},{z:'sawmthum',e:'30'},{z:'sawmli',e:'40'},{z:'sawmnga',e:'50'},{z:'zakhat',e:'100'},{z:'zanga',e:'500'},{z:'tulkhat',e:'1,000'},{z:'thenkhat',e:'10,000'},{z:'sangkhat',e:'100,000'},{z:'awnkhat',e:'1,000,000'},{z:'makkhat',e:'10,000,000'}] },
          { name: 'Ordinal', type: 'vocab-list', title: 'Ordinal & Counting',
            info: 'Add <strong>-na</strong> for ordinals. Use <strong>-veina</strong> for repetitions (once, twice).',
            items: [{z:'a khatna',e:'first'},{z:'a nihna',e:'second'},{z:'khatveina',e:'once'},{z:'nihveina',e:'twice'},{z:'thumveina',e:'three times'},{z:'sawmnih-sagih',e:'27 (twenty-seven)'},{z:'zakhat-sawmnih',e:'120 (one hundred twenty)'}] },
          { name: 'In Sentences', type: 'vocab-list', title: 'Numbers in Sentences',
            items: [{z:'Ka sang uhah tukpeng kimawlna tualpi khat om hi.',e:'There is one big sports ground at our school.'},{z:'Kum sawmnih a pha hi.',e:'She is 20 years old.'},{z:'Khutme nga a nei hi.',e:'She has five fingers.'},{z:'Pak tampi a nei hi.',e:'He has many chickens.'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Numbers',
            items: [{z:'khat',e:'1 (one)'},{z:'nih',e:'2 (two)'},{z:'thum',e:'3 (three)'},{z:'li',e:'4 (four)'},{z:'nga',e:'5 (five)'},{z:'guk',e:'6 (six)'},{z:'sagih',e:'7 (seven)'},{z:'giat',e:'8 (eight)'},{z:'kua',e:'9 (nine)'},{z:'sawmkhat',e:'10 (ten)'},{z:'zakhat',e:'100'},{z:'tulkhat',e:'1,000'},{z:'a khatna',e:'first (ordinal)'},{z:'khatveina',e:'once'},{z:'nihveina',e:'twice'},{z:'sawmnih-sagih',e:'27 (twenty-seven)'}] },
        ],
      },
      3: {
        title: "Time Expressions",
        subtitle: "Days, months, time of day, and how to express 'when' in Zolai.",
        badge: "Lesson 3 · Time",
        tabs: [
          { name: 'Days', type: 'vocab-list', title: 'Nipikal Minte — Days of the Week',
            items: [{z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},{z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'}] },
          { name: 'Months', type: 'vocab-list', title: 'Kraminte — Months',
            items: [{z:'Theinosihkha',e:'January'},{z:'Tunkha',e:'February'},{z:'Dota',e:'March'},{z:'Dopi',e:'April'},{z:'Zingkha',e:'May'},{z:'Gamkha',e:'June'},{z:'Tangsihkha',e:'July'},{z:'Tangkha',e:'August'},{z:'Phalkha',e:'September'},{z:'Khuadokha',e:'October'},{z:'Nokha',e:'November'},{z:'Kaukha',e:'December'}] },
          { name: 'Time of Day', type: 'vocab-list', title: 'Time of Day',
            info: 'Use these time words as adverbs of time (Sepzia hun kammal) in sentences. <strong>Example:</strong> Zingsang tungin lai ka sim hi. → I study in the morning.',
            items: [{z:'zingsang',e:'morning'},{z:'nitak',e:'evening/afternoon'},{z:'zan',e:'night'},{z:'zingtunga',e:'early morning'},{z:'nai sagih',e:"7 o'clock"},{z:'tu ni',e:'today'},{z:'zanin',e:'yesterday/last night'},{z:'taang',e:'tomorrow'},{z:'mai',e:'soon/later'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Time',
            items: [{z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},{z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'},{z:'Theinosihkha',e:'January'},{z:'Tunkha',e:'February'},{z:'Dota',e:'March'},{z:'Dopi',e:'April'},{z:'Zingkha',e:'May'},{z:'Gamkha',e:'June'},{z:'zingsang',e:'morning'},{z:'nitak',e:'evening/afternoon'},{z:'zan',e:'night'},{z:'tu ni',e:'today'},{z:'zanin',e:'yesterday/last night'},{z:'taang',e:'tomorrow'}] },
        ],
      },
      4: {
        title: "Articles",
        subtitle: "Zolai has three articles: 'khat' (indefinite), 'tua...pen', and 'tua...in' (definite). Learn to use them correctly.",
        badge: "Lesson 4 · Articles",
        tabs: [
          { name: 'Indefinite', type: 'vocab-list', title: "Indefinite Article — 'khat'",
            info: 'In Zolai, the indefinite article is <strong>khat</strong> (meaning \'one/a\'). Place it after the noun. Do not use articles with Proper Nouns.',
            items: [{z:'sakol khat',e:'a horse (indefinite)'},{z:'laibu khat',e:'a book'},{z:'mi citak khat',e:'a certain person'},{z:'sikkeu khat',e:'a cat'}] },
          { name: 'Definite', type: 'vocab-list', title: "Definite Articles — 'Tua...pen' and 'Tua...in'",
            info: 'Use <strong>Tua...pen</strong> when the noun is the topic/subject, and <strong>Tua...in</strong> when the noun is actively doing something. Zolai has <strong>3 articles</strong> total: khat, tua...pen, tua...in. (English has 2: a/an, the.)',
            items: [{z:'Tua sakol pen',e:'the horse (subject/topic)'},{z:'Tua sakol in',e:'the horse (doing something)'},{z:'Tua laibu pen',e:'the book (subject)'}] },
          { name: 'Practice', type: 'practice', title: 'Article Practice',
            info: 'Fill in the article in your mind, then tap to reveal.',
            items: [{z:'Kumpipa in, sakol ___ tawh khual a zin hi.',e:'khat (a horse)'},{z:'___ sakol pen, a kaang ahi hi.',e:'Tua (the horse — topic)'},{z:'___ sakol in kumpipa a thei hi.',e:'Tua (the horse — doing)'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Articles',
            items: [{z:'khat',e:'indefinite article (a/one)'},{z:'tua...pen',e:'definite — topic/subject'},{z:'tua...in',e:'definite — doing the action'},{z:'sakol khat',e:'a horse'},{z:'Tua sakol pen',e:'the horse (topic)'},{z:'Tua sakol in',e:'the horse (acting)'}] },
        ],
      },
      5: {
        title: "Simple Dialogues",
        subtitle: "Real Zolai conversations — greetings, asking directions, and everyday exchanges.",
        badge: "Lesson 5 · Dialogues",
        tabs: [
          { name: 'Greetings', type: 'vocab-list', title: 'Greeting Dialogue',
            items: [{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},{z:'Na min bang ci hiam?',e:'What is your name?'},{z:'Ka min ___ ahi hi.',e:'My name is ___.'},{z:'Koi pan hong pai na hia?',e:'Where are you coming from?'},{z:'Zanin koi-ah om na hi vua?',e:'Where were you last night?'}] },
          { name: 'Questions', type: 'vocab-list', title: 'Question Words',
            info: 'These question words (Dotna kammalte) ask who, what, where, when, why, and how.',
            items: [{z:'Kua?',e:'Who?'},{z:'Bang?',e:'What?'},{z:'Koi?',e:'Where?'},{z:'Bang hunin?',e:'When?'},{z:'Banghanghiam?',e:'Why?'},{z:'Bangci?',e:'How?'},{z:'Bang zah?',e:'How many?'}] },
          { name: 'Practice', type: 'vocab-list', title: 'Full Dialogue',
            info: 'Read and memorise this dialogue between two friends meeting.',
            items: [{z:'A: Na dam hiam?',e:'Are you well?'},{z:'B: Ka dam hi, lungdam un. Nang zong na dam hiam?',e:'I am well, thank you. Are you also well?'},{z:'A: Ka dam hi. Koi-ah na pai hiam?',e:'I am well. Where are you going?'},{z:'B: Ka sang ah ka pai hi.',e:'I am going to school.'}] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Dialogues',
            items: [{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},{z:'Na min bang ci hiam?',e:'What is your name?'},{z:'Koi pan hong pai na hia?',e:'Where are you coming from?'},{z:'Kua?',e:'Who?'},{z:'Bang?',e:'What?'},{z:'Koi?',e:'Where?'},{z:'Bang hunin?',e:'When?'},{z:'Banghanghiam?',e:'Why?'},{z:'Bangci?',e:'How?'}] },
        ],
      },
    },
    vocabData: [
      { category: 'Sentence Structure', words: [
        {z:'Laigual', e:'sentence'}, {z:'A sempa', e:'subject'},
        {z:'A thu', e:'predicate'}, {z:'hi', e:'affirmative ending'},
        {z:'kei / lo', e:'negation marker'}, {z:'hiam', e:'question marker'},
        {z:'leh', e:'and (conjunction)'},
      ]},
      { category: 'Numbers', words: [
        {z:'khat', e:'1'}, {z:'nih', e:'2'}, {z:'thum', e:'3'}, {z:'li', e:'4'}, {z:'nga', e:'5'},
        {z:'guk', e:'6'}, {z:'sagih', e:'7'}, {z:'giat', e:'8'}, {z:'kua', e:'9'}, {z:'sawmkhat', e:'10'},
        {z:'sawmnih', e:'20'}, {z:'sawmthum', e:'30'}, {z:'sawmli', e:'40'}, {z:'sawmnga', e:'50'},
        {z:'zakhat', e:'100'}, {z:'zanga', e:'500'}, {z:'tulkhat', e:'1,000'}, {z:'awnkhat', e:'1,000,000'},
        {z:'a khatna', e:'first (ordinal)'}, {z:'a nihna', e:'second'}, {z:'khatveina', e:'once'}, {z:'nihveina', e:'twice'},
      ]},
      { category: 'Time', words: [
        {z:'Nipi', e:'Sunday'}, {z:'Pizang', e:'Monday'}, {z:'Pithai', e:'Tuesday'},
        {z:'Nilai', e:'Wednesday'}, {z:'Laizing', e:'Thursday'}, {z:'Laithai', e:'Friday'}, {z:'Nino', e:'Saturday'},
        {z:'Theinosihkha', e:'January'}, {z:'Tunkha', e:'February'}, {z:'Dota', e:'March'}, {z:'Dopi', e:'April'},
        {z:'Zingkha', e:'May'}, {z:'Gamkha', e:'June'}, {z:'Tangsihkha', e:'July'}, {z:'Tangkha', e:'August'},
        {z:'Phalkha', e:'September'}, {z:'Khuadokha', e:'October'}, {z:'Nokha', e:'November'}, {z:'Kaukha', e:'December'},
        {z:'zingsang', e:'morning'}, {z:'nitak', e:'evening'}, {z:'zan', e:'night'},
        {z:'tu ni', e:'today'}, {z:'zanin', e:'yesterday'}, {z:'taang', e:'tomorrow'},
      ]},
      { category: 'Articles', words: [
        {z:'khat', e:'indefinite article — a / one'},
        {z:'tua...pen', e:'definite article — the (topic)'},
        {z:'tua...in', e:'definite article — the (agent / doer)'},
        {z:'sakol khat', e:'a horse'}, {z:'laibu khat', e:'a book'},
        {z:'Tua sakol pen', e:'the horse (as topic)'}, {z:'Tua sakol in', e:'the horse (as doer)'},
      ]},
      { category: 'Question Words', words: [
        {z:'Kua?', e:'Who?'}, {z:'Bang?', e:'What?'}, {z:'Koi?', e:'Where?'},
        {z:'Bang hunin?', e:'When?'}, {z:'Banghanghiam?', e:'Why?'},
        {z:'Bangci?', e:'How?'}, {z:'Bang zah?', e:'How many?'},
        {z:'Na min bang ci hiam?', e:'What is your name?'},
        {z:'Koi pan hong pai na hia?', e:'Where are you from?'},
      ]},
    ],
    quizBank: [
      { q: "In Zolai sentence structure, what comes first?", opts: ["Verb","Object","Subject","Adjective"], ans: 2 },
      { q: "What is the Zolai word for 'one hundred'?", opts: ["tulkhat","zakhat","sawm","sawmkhat"], ans: 1 },
      { q: "The indefinite article in Zolai is?", opts: ["tua","pen","khat","in"], ans: 2 },
      { q: "How do you say 'Sunday' in Zolai?", opts: ["Pizang","Nipi","Laithai","Nilai"], ans: 1 },
      { q: "'Tua...pen' is a ___?", opts: ["Indefinite article","Definite article","Pronoun","Verb"], ans: 1 },
      { q: "What does 'zan' mean in time expressions?", opts: ["morning","afternoon","night","evening"], ans: 2 },
      { q: "'Sawmnih' equals?", opts: ["12","20","100","21"], ans: 1 },
      { q: "The Zolai month 'Tunkha' corresponds to?", opts: ["January","February","March","April"], ans: 1 },
      { q: "What does 'damhiam' mean?", opts: ["Are you tired?","Are you hungry?","Are you well?","Are you busy?"], ans: 2 },
      { q: "'Zingkha' is which month?", opts: ["April","May","June","July"], ans: 1 },
    ]
  },
  intermediate: {
    name: 'Intermediate',
    zolai: 'Paunam Khenna 2',
    color: '#c9a84c',
    icon: '⚗️',
    desc: 'Master Zolai grammar. Study nouns, verbs, adjectives, pronouns, and all tense forms.',
    topics: ['Nouns','Verbs','Adjectives','Pronouns','Tenses'],
    cta: 'Know the basics already',
    lessons: {
      1: {
        title: "Nouns (Minte)",
        subtitle: "Four kinds of nouns — Common, Proper, Abstract, and Collective. How they work in Zolai.",
        badge: "Lesson 1 · Nouns",
        tabs: [
          { name: 'Types', type: 'type-cards', title: 'Four Types of Nouns (Minte)',
            items: [
              {name:'Neihkhawm min',en:'Common Noun',desc:'Names shared by all of a kind: mi (person), khua (village), laibu (book).'},
              {name:'Neihtuam min',en:'Proper Noun',desc:'Unique names — always start with a capital letter: Tedim, Mang, Cingno.'},
              {name:'Lawnmawh min',en:'Abstract Noun',desc:'Invisible things felt or thought: cidamna (health), dikna (justice), lungdamna (joy).'},
              {name:'Honlawhna min',en:'Collective Noun',desc:'Names for groups: galkapte (soldiers), naupangte (children), minam (people).'},
            ] },
          { name: 'Examples', type: 'vocab-list', title: 'Noun Examples in Sentences',
            items: [
              {z:'Ka gang a honghawh hi.',e:'My friend came.'},
              {z:'Utong a zempha mahmah hi.',e:'The Utong bird is very beautiful.'},
              {z:'Zato ah zatui kila hi.',e:'There is medicine at the market.'},
              {z:"Ka nu dikna in, genzawh lohin lian hi.",e:"My mother's righteousness shines without ceasing."},
            ] },
          { name: 'Practice', type: 'practice', title: 'Identify the Noun Type',
            info: "For each Zolai word, identify whether it's Common, Proper, Abstract, or Collective.",
            items: [
              {z:'Tedim',e:'Proper Noun (city name)'},
              {z:'inn',e:'Common Noun (house)'},
              {z:'cidamna',e:'Abstract Noun (health)'},
              {z:'galkapte',e:'Collective Noun (soldiers)'},
              {z:'Mang',e:'Proper Noun (a name)'},
              {z:'lungdamna',e:'Abstract Noun (happiness)'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Nouns',
            items: [
              {z:'Neihkhawm min',e:'Common Noun'},{z:'Neihtuam min',e:'Proper Noun'},
              {z:'Lawnmawh min',e:'Abstract Noun'},{z:'Honlawhna min',e:'Collective Noun'},
              {z:'mi',e:'person (common noun)'},{z:'Tedim',e:'city name (proper noun)'},
              {z:'cidamna',e:'health (abstract noun)'},{z:'galkapte',e:'soldiers (collective noun)'},
              {z:'innkuan',e:'family'},{z:'laibu',e:'book'},{z:'sang',e:'school'},
              {z:'lungdamna',e:'happiness (abstract noun)'},{z:'dikna',e:'justice (abstract noun)'},
              {z:'naupangte',e:'children (collective noun)'},
            ] },
        ],
      },
      2: {
        title: "Verbs (Sepna)",
        subtitle: "Transitive, intransitive, and helping verbs. How Zolai marks actions and states.",
        badge: "Lesson 2 · Verbs",
        tabs: [
          { name: 'Types', type: 'type-cards', title: 'Three Types of Verbs (Sepna/Gamtatna)',
            items: [
              {name:'A thuak kisam sepna',en:'Transitive Verb',desc:'Requires an object to complete meaning. "Bawng in lopa a ne hi" — the cow eats grass.'},
              {name:'A thuak kullo sepna',en:'Intransitive Verb',desc:'Complete without an object. "Thangpu a tai hi" — Thangpu runs.'},
              {name:'A cinglo / ahuh sepna',en:'Incomplete / Helping Verb',desc:'Needs a complement. "Naupangte a cidam hi" — Children are healthy.'},
            ] },
          { name: 'Examples', type: 'vocab-list', title: 'Verb Examples',
            items: [
              {z:'Bawng in lopa a ne hi.',e:'The cow eats grass. (transitive: ne = eat)'},
              {z:'Thangpu a tai hi.',e:'Thangpu runs. (intransitive: tai = run)'},
              {z:'Dimno a laam hi.',e:'Dimno dances. (intransitive: laam = dance)'},
              {z:'Naupangte a cidam hi.',e:'Children are healthy. (helping verb)'},
              {z:'Lianpi in kong a khak hi.',e:'Lianpi knocked the door. (transitive: khak = knock)'},
              {z:'Mangno in naupang khat ahi hi.',e:'Mangno is a child. (helping: ahi hi)'},
            ] },
          { name: 'Practice', type: 'practice', title: 'Practice — Verb Types',
            items: [
              {z:'Kei-in laibu khat nei-ing.',e:'Transitive (nei = have; object = laibu)'},
              {z:'Ni a taang hi.',e:'Intransitive (taang = shine; no object)'},
              {z:'Amah ka tanu ahi hi.',e:'Helping verb (ahi hi = is)'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Verbs',
            items: [
              {z:'A thuak kisam sepna',e:'Transitive Verb'},{z:'A thuak kullo sepna',e:'Intransitive Verb'},
              {z:'A cinglo sepna',e:'Incomplete/Helping Verb'},
              {z:'ne',e:'eat (transitive)'},{z:'tai',e:'run (intransitive)'},{z:'om',e:'be/stay/exist'},
              {z:'laam',e:'dance (intransitive)'},{z:'ahi hi',e:'is/am/are (helping verb)'},
              {z:'khak',e:'knock/strike (transitive)'},{z:'sa',e:'sing'},{z:'sim',e:'read/study'},
              {z:'Bawng in lopa a ne hi.',e:'The cow eats grass. (transitive)'},{z:'Thangpu a tai hi.',e:'Thangpu runs. (intransitive)'},
            ] },
        ],
      },
      3: {
        title: "Adjectives (Pianzia)",
        subtitle: "Six kinds of adjectives — quality, quantity, number, demonstrative, interrogative, and possessive.",
        badge: "Lesson 3 · Adjectives",
        tabs: [
          { name: 'Types', type: 'type-cards', title: 'Six Types of Adjectives (Pianzia)',
            items: [
              {name:'Phacia lak pianzia',en:'Quality Adjective',desc:'Describes qualities: hoih (good), sau (tall), gol (round), thau (heavy).'},
              {name:'Phazah lak pianzia',en:'Quantity Adjective',desc:'Describes amounts: tampi (many), tawmkha (few), beek (all).'},
              {name:'Amalzah lak pianzia',en:'Number Adjective',desc:'Specific numbers: nga (five), sawmnih (twenty), giat (eight).'},
              {name:'Lahkhiatna lak pianzia',en:'Demonstrative Adjective',desc:'Points to specific things: hih (this), hua (that), tua (that).'},
              {name:'Dotna lak pianzia',en:'Interrogative Adjective',desc:'Asks about things: bang ci (what kind), koi (which), bang zah (how many).'},
              {name:'Neihna lak pianzia',en:'Possessive Adjective',desc:"Shows ownership: ka (my), na (your), taang' (his), lia' (her), ih (our), amau' (their)."},
            ] },
          { name: 'Comparison', type: 'vocab-list', title: 'Comparison of Adjectives (Saikak/Tehkak)',
            info: 'Add <strong>-zaw</strong> for Comparative (better), <strong>-pen</strong> for Superlative (best).',
            items: [
              {z:'hoih',e:'good'},{z:'hoihzaw',e:'better'},{z:'hoihpen',e:'best'},
              {z:'hat',e:'strong'},{z:'hatzaw',e:'stronger'},{z:'hatpen',e:'strongest'},
              {z:'baih',e:'far'},{z:'baihzaw',e:'farther'},{z:'baihpen',e:'farthest'},
            ] },
          { name: 'Practice', type: 'vocab-list', title: 'Adjective Practice',
            items: [
              {z:'A mah in, inn hoih khat a nei hi.',e:'hoih = quality adjective (good house)'},
              {z:'Ciinno in, pak tampi a nei hi.',e:'tampi = quantity adjective (many chickens)'},
              {z:'Hih tangvalpa in a thahat hi.',e:'hih = demonstrative adjective (this young man)'},
              {z:'Mangpu sangin Thangpu a hatzaw hi.',e:'hatzaw = comparative (stronger than Mangpu)'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Adjectives',
            items: [
              {z:'Phacia lak pianzia',e:'Quality Adjective'},{z:'Phazah lak pianzia',e:'Quantity Adjective'},
              {z:'Amalzah lak pianzia',e:'Number Adjective'},{z:'Lahkhiatna lak pianzia',e:'Demonstrative Adjective'},
              {z:'Dotna lak pianzia',e:'Interrogative Adjective'},{z:'Neihna lak pianzia',e:'Possessive Adjective'},
              {z:'hoih',e:'good/beautiful'},{z:'hoihzaw',e:'better'},{z:'hoihpen',e:'best'},
              {z:'hat',e:'strong'},{z:'hatzaw',e:'stronger'},{z:'hatpen',e:'strongest'},
              {z:'baih',e:'far'},{z:'baihzaw',e:'farther'},{z:'baihpen',e:'farthest'},
              {z:'tampi',e:'many (quantity adj.)'},{z:'hih',e:'this (demonstrative)'},{z:'koi',e:'which (interrogative)'},
            ] },
        ],
      },
      4: {
        title: "Pronouns (Mintaang)",
        subtitle: "Personal, demonstrative, reflexive, interrogative, and possessive pronouns.",
        badge: "Lesson 4 · Pronouns",
        tabs: [
          { name: 'Personal', type: 'vocab-list', title: 'Personal Pronouns (Mimalmintaang)',
            info: 'Zolai distinguishes <strong>three persons</strong> and literary forms for he/she: Taang (he) and Lia (she). In everyday speech, \'Amah\' is used for both.',
            items: [
              {z:'Kei',e:'I (1st person sg.)'},{z:'Nang',e:'You (2nd person sg.)'},
              {z:'Taang',e:'He (3rd person masc.)'},{z:'Lia',e:'She (3rd person fem.)'},
              {z:'Amah',e:'He/She/It (general)'},{z:'Eite',e:'We (1st person pl.)'},
              {z:'Note',e:'You (2nd person pl.)'},{z:'Amaute',e:'They (3rd person pl.)'},
            ] },
          { name: 'Possessive', type: 'vocab-list', title: 'Possessive Pronouns',
            info: 'Possessive adjectives go before the noun (ka laibu = my book). Possessive pronouns stand alone (hih laibu in kei a hi = this book is mine).',
            items: [
              {z:'ka',e:'my'},{z:'na',e:'your'},{z:"taang'",e:"his"},{z:"lia'",e:"her"},
              {z:'ih',e:'our'},{z:"amau'",e:'their'},{z:'kei a',e:'mine'},{z:'nang a',e:'yours'},
            ] },
          { name: 'Practice', type: 'vocab-list', title: 'Pronoun Practice',
            items: [
              {z:'Kei-in laibu khat nei-ing.',e:'I have a book. (Kei = I, subject)'},
              {z:'Hih in ka laibu ahi hi.',e:'This is my book. (ka = my)'},
              {z:'Hih laibu in kei a hi.',e:'This book is mine. (kei a = mine)'},
              {z:'Nang mipil khat na hi hi.',e:'You are a wise person. (Nang = you)'},
              {z:'Eite in inn khat nei hang.',e:'We have a house. (Eite = we)'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Pronouns',
            items: [
              {z:'Kei',e:'I (1st person sg.)'},{z:'Nang',e:'You (2nd person sg.)'},{z:'Taang',e:'He (masc.)'},
              {z:'Lia',e:'She (fem.)'},{z:'Amah',e:'He/She/It (general)'},{z:'Eite',e:'We (1st pl.)'},
              {z:'Note',e:'You (2nd pl.)'},{z:'Amaute',e:'They (3rd pl.)'},
              {z:'ka',e:'my (possessive adj.)'},{z:'na',e:'your'},{z:"taang'",e:"his"},{z:"lia'",e:"her"},
              {z:'ih',e:'our'},{z:"amau'",e:'their'},{z:'kei a',e:'mine (possessive pro.)'},{z:'nang a',e:'yours'},
            ] },
        ],
      },
      5: {
        title: "Tense (Hun Lahkhiatna)",
        subtitle: "Present, Past, and Future tenses with all their sub-forms: Simple, Continuous, Perfect.",
        badge: "Lesson 5 · Tenses",
        tabs: [
          { name: 'Present', type: 'vocab-list', title: 'Tu Hun — Present Tense',
            info: 'Present tenses in Zolai. Simple = base verb. Continuous = verb + laitak. Perfect = verb + khinzo. Perfect Continuous = verb doubled + khinzo.',
            items: [
              {z:'Thangpu a tai hi.',e:'Thangpu runs. (Simple Present)'},
              {z:'Thangpu a tai laitak hi.',e:'Thangpu is running. (Present Continuous)'},
              {z:'Ka na pai khinzo hi.',e:'I have gone. (Present Perfect)'},
              {z:'Ka na paipai khinzo hi.',e:'I have been going. (Present Perfect Continuous)'},
            ] },
          { name: 'Past & Future', type: 'multi-section', title: 'A Beisa Hun & Mailam Hun',
            info: 'Past: add <strong>khin</strong> (simple), <strong>khit laitak</strong> (continuous), <strong>khinzota</strong> (perfect). Future: add <strong>ding hi</strong> (simple).',
            sections: [
              { heading: 'Past Tense', items: [
                {z:'Thangpu a tai khin hi.',e:'Thangpu ran. (Simple Past)'},
                {z:'Thangpu a tai khit laitak hi.',e:'Thangpu was running. (Past Continuous)'},
                {z:'Ka na pai khinzota hi.',e:'I had gone. (Past Perfect)'},
                {z:'Ka na paipai khinzota hi.',e:'I had been going. (Past Perfect Continuous)'},
              ] },
              { heading: 'Future Tense', items: [
                {z:'Thangpu a tai ding hi.',e:'Thangpu will run. (Simple Future)'},
                {z:'Thangpu a tai ding laitak hi.',e:'Thangpu will be running. (Future Continuous)'},
                {z:'Ka pai khinzo tading hi.',e:'I will have gone. (Future Perfect)'},
              ] },
            ] },
          { name: 'Practice', type: 'practice', title: 'Tense Practice',
            info: 'Identify the tense of each sentence.',
            items: [
              {z:'Ka pai ding hi.',e:'Simple Future (I will go)'},
              {z:'A tai khin hi.',e:'Simple Past (He ran)'},
              {z:'Ka na paipai khinzo hi.',e:'Present Perfect Continuous (I have been going)'},
              {z:'A om laitak hi.',e:'Present Continuous (He is staying)'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Tense',
            items: [
              {z:'verb + hi',e:'Simple Present'},{z:'verb + laitak hi',e:'Present Continuous'},
              {z:'verb + khinzo hi',e:'Present Perfect'},{z:'verb + khin hi',e:'Simple Past'},
              {z:'verb + khit laitak hi',e:'Past Continuous'},{z:'verb + khinzota hi',e:'Past Perfect'},
              {z:'verb + ding hi',e:'Simple Future'},{z:'verb + ding laitak hi',e:'Future Continuous'},
              {z:'verb + khinzo tading hi',e:'Future Perfect'},
              {z:'Thangpu a tai hi.',e:'Thangpu runs. (Simple Present)'},{z:'Thangpu a tai khin hi.',e:'Thangpu ran. (Simple Past)'},
              {z:'Ka pai ding hi.',e:'I will go. (Simple Future)'},
            ] },
        ],
      },
    },
    vocabData: [
      { category: 'Noun Types', words: [
        {z:'Neihkhawm min', e:'Common Noun'}, {z:'Neihtuam min', e:'Proper Noun'},
        {z:'Lawnmawh min', e:'Abstract Noun'}, {z:'Honlawhna min', e:'Collective Noun'},
        {z:'inn', e:'house (common noun)'}, {z:'Tedim', e:'Tedim (proper noun)'},
        {z:'cidamna', e:'health (abstract noun)'}, {z:'galkapte', e:'soldiers (collective noun)'},
        {z:'lungdamna', e:'happiness (abstract noun)'}, {z:'dikna', e:'justice (abstract noun)'},
        {z:'naupangte', e:'children (collective noun)'},
      ]},
      { category: 'Verb Types', words: [
        {z:'A thuak kisam sepna', e:'Transitive Verb'},
        {z:'A thuak kullo sepna', e:'Intransitive Verb'},
        {z:'A cinglo sepna', e:'Helping / Incomplete Verb'},
        {z:'ne', e:'eat (transitive)'}, {z:'tai', e:'run (intransitive)'},
        {z:'laam', e:'dance (intransitive)'}, {z:'ahi hi', e:'is / am / are (helping verb)'},
        {z:'khak', e:'knock (transitive)'}, {z:'om', e:'be / exist (intransitive)'},
      ]},
      { category: 'Adjective Types', words: [
        {z:'Phacia lak pianzia', e:'Quality Adjective'},
        {z:'Phazah lak pianzia', e:'Quantity Adjective'},
        {z:'Amalzah lak pianzia', e:'Number Adjective'},
        {z:'Lahkhiatna lak pianzia', e:'Demonstrative Adjective'},
        {z:'Dotna lak pianzia', e:'Interrogative Adjective'},
        {z:'Neihna lak pianzia', e:'Possessive Adjective'},
        {z:'hoih / hoihzaw / hoihpen', e:'good / better / best'},
        {z:'hat / hatzaw / hatpen', e:'strong / stronger / strongest'},
        {z:'baih / baihzaw / baihpen', e:'far / farther / farthest'},
        {z:'hih', e:'this (demonstrative)'}, {z:'koi', e:'which (interrogative)'}, {z:'tampi', e:'many (quantity)'},
      ]},
      { category: 'Pronouns', words: [
        {z:'Kei', e:'I (1st person sg.)'}, {z:'Nang', e:'You (2nd person sg.)'},
        {z:'Taang', e:'He (masc.)'}, {z:'Lia', e:'She (fem.)'},
        {z:'Amah', e:'He / She / It (general)'}, {z:'Eite', e:'We (1st pl.)'},
        {z:'Note', e:'You (2nd pl.)'}, {z:'Amaute', e:'They (3rd pl.)'},
        {z:'ka', e:'my'}, {z:'na', e:'your'}, {z:"taang'", e:'his'},
        {z:"lia'", e:'her'}, {z:'ih', e:'our'}, {z:"amau'", e:'their'},
        {z:'kei a', e:'mine'}, {z:'nang a', e:'yours'},
      ]},
      { category: 'Tense Markers', words: [
        {z:'verb + hi', e:'Simple Present'},
        {z:'verb + laitak hi', e:'Present Continuous'},
        {z:'verb + khinzo hi', e:'Present Perfect'},
        {z:'verb + khin hi', e:'Simple Past'},
        {z:'verb + khit laitak hi', e:'Past Continuous'},
        {z:'verb + khinzota hi', e:'Past Perfect'},
        {z:'verb + ding hi', e:'Simple Future'},
        {z:'verb + ding laitak hi', e:'Future Continuous'},
        {z:'verb + khinzo tading hi', e:'Future Perfect'},
      ]},
    ],
    quizBank: [
      { q: "What is the Zolai term for 'Verb'?", opts: ["Mintaang","Pianzia","Gamtatna / Sepna","Munlahna"], ans: 2 },
      { q: "Which type of noun is 'Tedim' (a city name)?", opts: ["Common noun","Abstract noun","Proper noun","Collective noun"], ans: 2 },
      { q: "What does 'khin hi' added to a verb indicate?", opts: ["Future tense","Simple Past tense","Present Perfect","Continuous aspect"], ans: 1 },
      { q: "A transitive verb is called?", opts: ["A thuak kullo sepna","A thuak kisam sepna","A cinglo sepna","Gamtatnazem"], ans: 1 },
      { q: "The Comparative degree uses which suffix?", opts: ["+ pen","+ zaw","+ mahmah","+ bek"], ans: 1 },
      { q: "In Zolai, 'she' (literary) is?", opts: ["Taang","Kei","Amah","Lia"], ans: 3 },
      { q: "Which pronoun means 'we' in Zolai?", opts: ["Nang","Kei","Eite","Amah"], ans: 2 },
      { q: "'Ding hi' at the end of a verb indicates?", opts: ["Past tense","Future tense","Continuous present","Perfect aspect"], ans: 1 },
      { q: "What kind of noun is 'cidamna' (health)?", opts: ["Common noun","Proper noun","Collective noun","Abstract noun"], ans: 3 },
      { q: "The Superlative degree uses which suffix?", opts: ["+ pen","+ zaw","+ mahmah","+ ding"], ans: 0 },
    ]
  },
  advanced: {
    name: 'Advanced',
    zolai: 'Paunam Khenna 3',
    color: '#c9604a',
    icon: '🏔️',
    desc: 'Reach fluency. Study punctuation, proverbs, Zomi cultural texts, and free composition.',
    topics: ['Punctuation','Proverbs','Cultural Texts','Composition','Free Writing'],
    cta: 'For serious learners',
    lessons: {
      1: {
        title: "Punctuation (Lailepna)",
        subtitle: "All 12 Zolai punctuation marks — comma, colon, apostrophe, hyphen and more — with correct usage rules.",
        badge: "Lesson 1 · Punctuation",
        tabs: [
          { name: 'Marks', type: 'markup-cards', title: '12 Punctuation Marks (Lailepna)',
            items: [
              {z:'Husanna',e:', comma',desc:'Used to separate clause elements, lists, and for clarity.'},
              {z:'Ngaklang',e:'; semi-colon',desc:'Longer pause than comma; joins related independent clauses.'},
              {z:'Ngakna',e:': colon',desc:'Introduces a list or explanation that follows.'},
              {z:'Tawpna',e:'. full stop / period',desc:'Ends a complete sentence.'},
              {z:'Dotna',e:'? question mark',desc:'Ends a question sentence.'},
              {z:'Phawnna',e:'! exclamation mark',desc:'After exclamatory words and sentences.'},
              {z:'Kamhonna / Kamkhakna',e:'" " quotation mark',desc:'Encloses direct speech (Genbanga Genna).'},
              {z:'Neihsa lak / Tanglak',e:"' apostrophe",desc:"Shows possession: ka pa'sum = my father's money."},
              {z:'Thekna',e:'- hyphen',desc:'Joins compound words and separates double vowels.'},
              {z:'Git-phei',e:'_ dash',desc:'Used for a longer break or explanation mid-sentence.'},
              {z:'Git-awn',e:'/ slash',desc:'Separates alternatives.'},
              {z:'Kual / Umtuam',e:'( ) brackets',desc:'Encloses additional explanatory information.'},
            ] },
          { name: 'Rules', type: 'text-blocks', title: 'Punctuation Rules & Examples',
            blocks: [
              { html: 'Correct punctuation can change the entire meaning of a sentence in Zolai, just as in English.' },
              { title: 'Kill him, not let him go.', html: 'Kill him — not: let him go. (comma changes meaning completely!)' },
              { title: 'Na hehnepnakammalte hangin, ka lawmpa a lungdam hi; a lungsim nuamsak hi; a dahna zong beisak hi.', html: 'Your encouraging words made my friend glad; comforted his heart; removed his sorrow. (semi-colons join related clauses)' },
              { html: "The apostrophe (neihsa lak) shows possession: <strong>Taang'khedap</strong> = Taang's shoes." },
            ] },
          { name: 'Practice', type: 'practice', title: 'Practice — Add the Punctuation',
            info: 'What punctuation is missing? Tap to reveal.',
            items: [
              {z:'Lawm nang bang semsem na hia ___',e:'? (question mark — Dotna)'},
              {z:'Oh ___ Hong pai mahmah hi',e:'! (exclamation — Phawnna)'},
              {z:'Na hehnepnakammalte hangin ___ ka lungdam hi.',e:', (comma — Husanna)'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Punctuation',
            items: [
              {z:'Husanna',e:'Comma ( , )'},{z:'Ngaklang',e:'Semi-colon ( ; )'},{z:'Ngakna',e:'Colon ( : )'},
              {z:'Tawpna',e:'Full stop ( . )'},{z:'Dotna',e:'Question mark ( ? )'},{z:'Phawnna',e:'Exclamation mark ( ! )'},
              {z:'Kamhonna',e:'Quotation marks ( " " )'},{z:"Neihsa lak / Tanglak",e:"Apostrophe ( ' )"},
              {z:'Thekna',e:'Hyphen ( - )'},{z:'Git-phei',e:'Dash ( _ )'},{z:'Git-awn',e:'Slash ( / )'},{z:'Kual / Umtuam',e:'Brackets ( )'},
            ] },
        ],
      },
      2: {
        title: "Proverbs (Paunak)",
        subtitle: "Study Zomi proverbs — their literal meaning, deeper wisdom, and use in speech and writing.",
        badge: "Lesson 2 · Proverbs",
        tabs: [
          { name: 'Proverbs A-M', type: 'proverbs', title: 'Paunak — Proverbs (A–M)',
            items: [
              {z:'Ak a pute in sangnaupang note a it hi.',e:'Like a mother hen loving her chicks (unconditional love).'},
              {z:'Beng zong kim citciat tangzang kiguang.',e:'Even a basket, when full, finds its place. (Wisdom gains recognition when complete.)'},
              {z:'Kamsiam siallei sang, kamsia sial liau.',e:'A wise speaker gains a cow; a foolish one loses cattle. (Words have consequences.)'},
              {z:'Kawl zong tuidamin kiho.',e:'Even a worm knows to swim in water. (Everyone knows their own element.)'},
              {z:'Kom Kim zong tapasal sagih neisa nawkik.',e:'Even a basket has had seven husbands again. (The seemingly impossible can repeat.)'},
              {z:'Lam nai tawn nuam behiang kum kua-a tung lo.',e:'A pleasant path not walked regularly takes years to reach. (Consistency matters.)'},
              {z:'Leii leh ha zong kipet.',e:'Even iron and bone can break. (Even the strongest have limits.)'},
              {z:'Meima lo-ah tho, tu lo.',e:"Don't rise without fire, don't stand without reason. (Act purposefully.)"},
            ] },
          { name: 'Proverbs N-Z', type: 'proverbs', title: 'Paunak — Proverbs (N–Z)',
            items: [
              {z:'Mihing leh papo.',e:'A person and a pot (life is as fragile as pottery).'},
              {z:'Sial vom leh sial vom kiingai.',e:'Cattle of the same kind graze together. (Like attracts like.)'},
              {z:'Suangpi suangneu in thek.',e:'A great tree is felled by a small axe. (Small things overcome great ones.)'},
              {z:'Thupha in kongbiang kan lo, thusia in mual kua khum.',e:"Good words don't knock at the gate; bad words pile up on the hilltop. (Bad news spreads faster.)"},
              {z:'Va-ak cingkam sakhau taw-ah kikuah lo.',e:"The crow on the strong branch doesn't fear the axe. (Security in strength.)"},
              {z:'Zawlthu kalah sial thawl.',e:"In a close friend's talk, a cow is put to shame. (In intimate friendship, great things become small.)"},
              {z:'Zawng nek ngau in thalpu.',e:"The dog that eats ends up being fined. (Actions have consequences.)"},
              {z:'Zuau in a khap lawn.',e:"A liar is caught eventually. (Truth always prevails.)"},
            ] },
          { name: 'Practice', type: 'practice', title: 'Proverb Quiz',
            info: 'Match the proverb to its lesson. Tap to reveal.',
            items: [
              {z:'Sial vom leh sial vom kiingai.',e:'Like attracts like.'},
              {z:'Suangpi suangneu in thek.',e:'Small things overcome great ones.'},
              {z:'Zuau in a khap lawn.',e:'Liars are always caught.'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Proverbs',
            items: [
              {z:'Ak a pute in sangnaupang...',e:'Mother hen loving her chicks — unconditional love'},
              {z:'Kamsiam siallei sang...',e:'Wise words gain a cow; foolish ones lose cattle'},
              {z:'Leii leh ha zong kipet.',e:'Even iron and bone can break'},
              {z:'Sial vom leh sial vom kiingai.',e:'Like attracts like'},
              {z:'Suangpi suangneu in thek.',e:'A great tree felled by a small axe'},
              {z:'Thupha in kongbiang kan lo...',e:"Good words don't spread; bad news does"},
              {z:'Va-ak cingkam sakhau...',e:'Security comes from strength'},
              {z:'Zuau in a khap lawn.',e:'A liar is always caught'},
              {z:'Mihing leh papo.',e:'Life is as fragile as pottery'},
              {z:'Zawng nek ngau in thalpu.',e:'Actions have consequences'},
              {z:'Lam nai tawn nuam...',e:'Consistency is key to reaching a goal'},
              {z:'Meima lo-ah tho, tu lo.',e:'Act only with purpose'},
            ] },
        ],
      },
      3: {
        title: "Cultural Texts",
        subtitle: "Read authentic Zomi cultural texts — history, customs, kinship, and traditional ceremonies.",
        badge: "Lesson 3 · Culture",
        tabs: [
          { name: 'Zo History', type: 'text-blocks', title: 'Zomite Pianna Thu — Zo History',
            blocks: [
              { html: 'The Zo people originally share heritage with the Mongolian peoples. Their ancestors migrated from the Sengam region (Mongolia), living in cave shelters called <strong>KHUL</strong> during their journey.' },
              { html: 'Two ancient kingdoms shaped Zo identity: the <strong>Zo Kingdom</strong> (BC 1027–265) and the <strong>Chin Kingdom</strong> (BC 221–207). The descendants spread across Myanmar, India, and Bangladesh.' },
              { html: 'Despite different clan names — Yaw, Asho, Cho, Zo — all share the same <strong>Zo ancestry</strong> from the original Mongolian homeland.' },
            ],
            items: [
              {z:'Zomite',e:'Zo people (collective name)'},{z:'Zogam',e:'Zo homeland'},
              {z:'Sengam',e:'Mongolia (ancestral origin)'},{z:'Khul',e:'Cave shelter (ancient dwelling)'},
            ] },
          { name: 'Customs', type: 'text-blocks', title: 'Zo Customs — Khuazindo & Pawi',
            blocks: [
              { html: '<strong>Khuado (Communal Feast)</strong>: A major village feast. On the day before (Meilah Satni), fires are lit in the fields to drive away evil spirits. Young men and women gather and celebrate with music (khuang, zam, daktal).' },
              { html: '<strong>Khuai Aihna (Chicken Divination)</strong>: Before important work, a chicken is sacrificed. Its leg bones are examined to divine the future — health, harvest, success.' },
              { html: '<strong>Innsung Phamawh (Kinship System)</strong>: Zomite have a detailed 12-role kinship system — Thalloh, Zinkhak, Pu, Tanupi, Tanu nauzaw, and more — each with specific duties at feasts and ceremonies.' },
            ] },
          { name: 'Practice', type: 'vocab-list', title: 'Cultural Vocabulary',
            items: [
              {z:'Khuazindo',e:'communal feast / village celebration'},{z:'Meilah satni',e:'fire-lighting day before a feast'},
              {z:'Khuai aihna',e:'chicken divination'},{z:'Pawi',e:'traditional feast/festival'},
              {z:'Thalloh',e:'primary kinship role (male line)'},{z:'Zinkhak',e:'secondary kinship role (male line)'},
              {z:'Sungpi',e:'kinship role (female line)'},{z:'Zawl',e:'close friend / best friend'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Cultural Texts',
            items: [
              {z:'Khuazindo',e:'communal feast / village celebration'},{z:'Meilah satni',e:'fire-lighting day before a feast'},
              {z:'Khuai aihna',e:'chicken divination'},{z:'Pawi',e:'traditional feast/festival'},
              {z:'Thalloh',e:'primary kinship role (male line)'},{z:'Sungpi',e:'kinship role (female line)'},
              {z:'Zawl',e:'close friend / best friend'},{z:'Zomite',e:'the Zo people'},
              {z:'Zogam',e:'Zo homeland'},{z:'Sengam',e:'Mongolia (ancestral origin)'},{z:'Khul',e:'cave shelter (ancient dwelling)'},
            ] },
        ],
      },
      4: {
        title: "Composition (Kampau Luanzia)",
        subtitle: "Learn the art of Zolai composition — letter writing, direct and indirect speech, and active/passive voice.",
        badge: "Lesson 4 · Composition",
        tabs: [
          { name: 'Voice', type: 'vocab-list', title: 'Active & Passive Voice',
            info: 'In Zolai, to form the <strong>Passive Voice</strong>, move the object to the front and add <strong>pen</strong> after it. The verb stays the same.',
            items: [
              {z:'Cingno in lengladei sung a phiat hi.',e:'Active: Cingno opens the window.'},
              {z:'Lengladei sung pen, Cingno in a phiat hi.',e:'Passive: The window is opened by Cingno.'},
              {z:'Lia in la khat a sa hi.',e:'Active: She sings a song.'},
              {z:'La khat pen, Lia in a sa hi.',e:'Passive: A song is sung by her.'},
            ] },
          { name: 'Letter Writing', type: 'vocab-list', title: 'Direct & Indirect Speech',
            info: '<strong>Direct Speech (Genbanga Genna)</strong>: Quote the exact words, inside quotation marks.<br><strong>Indirect Speech (Gensawnna)</strong>: Report what was said, with the quotation marks removed and verbs adjusted.<br><br><strong>Letter writing (Laikhak gelhzia)</strong>: Date → Salutation (Kong it pa/nu) → Body → Closing (Hong phawk den).',
            items: [
              {z:'Thangpi in, "Kei-in khual ka zin ding hi," a ci hi.',e:'Direct: Thangpi said, "I will travel."'},
              {z:'Thangpi in, amah khualzin ding, a gen hi.',e:'Indirect: Thangpi said that he would travel.'},
            ] },
          { name: 'Practice', type: 'practice', title: 'Composition Practice',
            info: 'Convert to passive voice. Tap to reveal.',
            items: [
              {z:'Taang in ticket te a khawm hi.',e:'Passive: Ticket te pen, Taang in a khawm hi.'},
              {z:'Lia in la khat a sa ding hi.',e:'Passive: La khat pen, Lia in a sa ding hi.'},
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Composition',
            items: [
              {z:'A Sepna Thupisak',e:'Active Voice'},{z:'A Sep Thupisak',e:'Passive Voice'},
              {z:'Genbanga Genna',e:'Direct Speech'},{z:'Gensawnna',e:'Indirect Speech'},
              {z:'Kampau Luanzia',e:'Composition'},{z:'Laikhak gelhzia',e:'Letter writing'},
              {z:'Kong it pa/nu',e:'Dear father/mother (salutation)'},{z:'Hong phawk den',e:'Please remember (closing)'},
              {z:'Itna lianpi tawh',e:'With great love'},{z:'Lungdam un',e:'Thank you / we are glad'},
            ] },
        ],
      },
      5: {
        title: "Free Writing",
        subtitle: "Apply everything — write your own Zolai sentences, short paragraphs, and creative compositions.",
        badge: "Lesson 5 · Writing",
        tabs: [
          { name: 'Word Lists', type: 'vocab-list', title: 'Grammar Terms — English & Zolai',
            info: 'These are the key grammar terms from the Paunam Khenna text, useful for discussing language and writing in Zolai.',
            items: [
              {z:'Kammal zatte',e:'Vocabulary list'},{z:'Paunam khenna',e:'Grammar'},
              {z:'Kampau luanzia',e:'Composition'},{z:'Laigelhzia',e:'Orthography (correct writing)'},
              {z:'Laimal gawmzia',e:'Spelling'},{z:'Awsuah',e:'Pronunciation'},
              {z:'Lailepna',e:'Punctuation'},{z:'Genbanga Genna',e:'Direct Speech'},
              {z:'Gensawnna',e:'Indirect Speech'},{z:'A Sepna Thupisak',e:'Active Voice'},
              {z:'A Sep Thupisak',e:'Passive Voice'},{z:'Hun lahkhiatna',e:'Tense'},
            ] },
          { name: 'Vocabulary', type: 'vocab-list', title: 'Advanced Vocabulary — Abstract & Cultural',
            items: [
              {z:'Angtang',e:'courage'},{z:'Cidamna',e:'health'},
              {z:'Dikna',e:'justice/righteousness'},{z:'Hansanna',e:'success'},
              {z:'Hauhna',e:'wealth'},{z:'Lungdamna',e:'happiness/joy'},
              {z:'Pilna',e:'wisdom/education'},{z:'Suahtakna',e:'independence/freedom'},
              {z:'Thukhunpi',e:'constitution/agreement'},{z:'Zomite',e:'the Zo people (collective)'},
            ] },
          { name: 'Practice', type: 'prompts', title: 'Free Writing Prompts',
            info: "Try writing 2–3 Zolai sentences for each prompt below. Use what you've learned throughout all four lessons.",
            items: [
              'Describe your family using Zolai pronouns and possessives.',
              'Write about what you did yesterday using Past tense.',
              'Use 3 proverbs in sentences that relate to modern life.',
              'Write a short letter (laikhak) to a friend inviting them to a feast.',
              'Describe the Zomite Pianna Thu (Zo history) in 5 sentences.',
            ] },
          { name: 'Flashcards', type: 'flashcards', title: 'Flashcards — Free Writing',
            items: [
              {z:'Paunam khenna',e:'Grammar'},{z:'Kampau luanzia',e:'Composition'},{z:'Laigelhzia',e:'Orthography'},
              {z:'Laimal gawmzia',e:'Spelling'},{z:'Awsuah',e:'Pronunciation'},{z:'Lailepna',e:'Punctuation'},
              {z:'Hun lahkhiatna',e:'Tense'},{z:'Paunak',e:'Proverbs'},{z:'Kammal zatte',e:'Vocabulary list'},
              {z:'Angtang',e:'courage'},{z:'Cidamna',e:'health'},{z:'Dikna',e:'justice'},
              {z:'Hansanna',e:'success'},{z:'Lungdamna',e:'happiness'},{z:'Pilna',e:'wisdom/education'},
              {z:'Suahtakna',e:'independence/freedom'},
            ] },
        ],
      },
    },
    vocabData: [
      { category: 'Punctuation', words: [
        {z:'Husanna', e:'Comma ( , )'}, {z:'Ngaklang', e:'Semi-colon ( ; )'},
        {z:'Ngakna', e:'Colon ( : )'}, {z:'Tawpna', e:'Full stop ( . )'},
        {z:'Dotna', e:'Question mark ( ? )'}, {z:'Phawnna', e:'Exclamation mark ( ! )'},
        {z:'Kamhonna', e:'Quotation marks ( " " )'}, {z:"Neihsa lak / Tanglak", e:"Apostrophe ( ' )"},
        {z:'Thekna', e:'Hyphen ( - )'}, {z:'Git-phei', e:'Dash ( _ )'},
        {z:'Git-awn', e:'Slash ( / )'}, {z:'Kual / Umtuam', e:'Brackets ( )'},
      ]},
      { category: 'Grammar Terms', words: [
        {z:'Paunam khenna', e:'Grammar'}, {z:'Kampau luanzia', e:'Composition'},
        {z:'Laigelhzia', e:'Orthography'}, {z:'Laimal gawmzia', e:'Spelling'},
        {z:'Awsuah', e:'Pronunciation'}, {z:'Lailepna', e:'Punctuation'},
        {z:'Hun lahkhiatna', e:'Tense'}, {z:'Paunak', e:'Proverbs'},
        {z:'A Sepna Thupisak', e:'Active Voice'}, {z:'A Sep Thupisak', e:'Passive Voice'},
        {z:'Genbanga Genna', e:'Direct Speech'}, {z:'Gensawnna', e:'Indirect Speech'},
        {z:'Kammal zatte', e:'Vocabulary list'},
      ]},
      { category: 'Cultural Terms', words: [
        {z:'Zomite', e:'the Zo people'}, {z:'Zogam', e:'Zo homeland'},
        {z:'Sengam', e:'Mongolia (ancestral origin)'}, {z:'Khul', e:'cave shelter (ancient dwelling)'},
        {z:'Khuazindo', e:'communal feast'}, {z:'Meilah satni', e:'fire-lighting day before a feast'},
        {z:'Khuai aihna', e:'chicken divination'}, {z:'Pawi', e:'traditional feast / festival'},
        {z:'Zawl', e:'close friend / best friend'}, {z:'Thalloh', e:'primary kinship role (male line)'},
        {z:'Sungpi', e:'kinship role (female line)'},
      ]},
      { category: 'Abstract Vocabulary', words: [
        {z:'Angtang', e:'courage'}, {z:'Cidamna', e:'health'},
        {z:'Dikna', e:'justice / righteousness'}, {z:'Hansanna', e:'success'},
        {z:'Hauhna', e:'wealth'}, {z:'Lungdamna', e:'happiness / joy'},
        {z:'Pilna', e:'wisdom / education'}, {z:'Suahtakna', e:'independence / freedom'},
        {z:'Thukhunpi', e:'constitution / agreement'},
      ]},
      { category: 'Key Proverb Words', words: [
        {z:'paunak', e:'proverb'}, {z:'kamsiam', e:'wise speaker'},
        {z:'kamsia', e:'foolish speaker'}, {z:'sial vom', e:'cattle of the same kind'},
        {z:'suangpi', e:'great tree'}, {z:'suangneu', e:'small axe'},
        {z:'zuau', e:'liar'}, {z:'zawl', e:'close friend'},
        {z:'meima', e:'fire'}, {z:'mihing', e:'human being'},
      ]},
    ],
    quizBank: [
      { q: "Which punctuation mark is 'Husanna' in Zolai?", opts: ["Full stop","Comma","Colon","Hyphen"], ans: 1 },
      { q: "What does the proverb 'Sial vom leh sial vom kiingai' mean?", opts: ["Work hard for the harvest","Like attracts like","A foolish person loses all","The brave win battles"], ans: 1 },
      { q: "In Direct Speech (Genbanga Genna), the quoted text goes inside?", opts: ["Brackets ()","Apostrophes","Quotation marks [...]","Hyphens"], ans: 2 },
      { q: "The Apostrophe (tanglak) is used to show?", opts: ["A question","Possession","A pause","Exclamation"], ans: 1 },
      { q: "What is the Active voice called in Zolai?", opts: ["A Sepna Thupisak","A Sep Thupisak","Genbanga Genna","Gensawnna"], ans: 0 },
      { q: "Zo people originally migrated from which region?", opts: ["India","Tibet","Mongolia","China proper"], ans: 2 },
      { q: "The Hyphen (Thekna) in Zolai is used when?", opts: ["Two vowels meet","Sentence ends","A noun is plural","Verb is past"], ans: 0 },
      { q: "'Paunak' means?", opts: ["Grammar","Proverbs","Composition","Alphabet"], ans: 1 },
      { q: "What is 'Kampau Luanzia' in English?", opts: ["Grammar","Reading","Composition","Vocabulary"], ans: 2 },
      { q: "February 12, 1947 is significant to Zomite because?", opts: ["Independence Day","Union Day / Pinlong Conference","National Language Day","Zo New Year"], ans: 1 },
    ]
  }
};

// ── APPLY CUSTOM STRUCTURE FROM ADMIN ──
function applyCustomStructure() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEYS.structure) || '{}');
    for (const lid of (saved._deletedLevels || [])) delete levelData[lid];
    for (const [lid, lvl] of Object.entries(saved)) {
      if (lid === '_deletedLevels') continue;
      if (!levelData[lid]) {
        levelData[lid] = {
          name: lvl.name || lid, icon: lvl.icon || '📚',
          color: lvl.color || '#7a8aa0', zolai: lvl.zolai || '',
          desc: lvl.desc || '', topics: lvl.topics || [],
          cta: lvl.cta || 'Start learning',
          lessons: {}, vocabData: [], quizBank: []
        };
      } else {
        if (lvl.name)   levelData[lid].name   = lvl.name;
        if (lvl.icon)   levelData[lid].icon   = lvl.icon;
        if (lvl.color)  levelData[lid].color  = lvl.color;
        if (lvl.zolai !== undefined) levelData[lid].zolai = lvl.zolai;
        if (lvl.desc)   levelData[lid].desc   = lvl.desc;
        if (lvl.topics) levelData[lid].topics = lvl.topics;
        if (lvl.cta)    levelData[lid].cta    = lvl.cta;
      }
      for (const [num, ls] of Object.entries(lvl.lessons || {})) {
        const n = +num;
        if (!levelData[lid].lessons[n]) {
          levelData[lid].lessons[n] = {
            title: ls.title || `Lesson ${n}`, subtitle: ls.subtitle || '',
            badge: ls.badge || `Lesson ${n}`, tabs: ls.tabs || ['Content','Flashcards']
          };
        } else {
          if (ls.title)    levelData[lid].lessons[n].title    = ls.title;
          if (ls.tabs)     levelData[lid].lessons[n].tabs     = ls.tabs;
          if (ls.subtitle) levelData[lid].lessons[n].subtitle = ls.subtitle;
          if (ls.badge)    levelData[lid].lessons[n].badge    = ls.badge;
        }
      }
      for (const num of (lvl._deletedLessons || [])) delete levelData[lid].lessons[+num];
    }
  } catch(e) {}
}

function renderLevelSelector() {
  const grid = document.getElementById('lsGrid');
  if (!grid) return;
  const levelIds = Object.keys(levelData);
  grid.innerHTML = levelIds.map((lid, i) => {
    const lvl = levelData[lid];
    const topicsHtml = (lvl.topics||[]).map(t => `<span class="ls-topic">${t}</span>`).join('');
    return `<div class="ls-card" data-level="${lid}" onclick="selectLevel('${lid}')" tabindex="0">
      <div class="ls-card-badge">Level ${i+1}</div>
      <div class="ls-card-icon">${lvl.icon}</div>
      <div class="ls-card-title">${lvl.name}</div>
      ${lvl.zolai  ? `<div class="ls-card-zolai">${lvl.zolai}</div>` : ''}
      ${lvl.desc   ? `<div class="ls-card-desc">${lvl.desc}</div>`   : ''}
      ${topicsHtml ? `<div class="ls-card-topics">${topicsHtml}</div>` : ''}
      <div class="ls-card-cta">
        <span class="ls-cta-label">${lvl.cta || 'Start learning'}</span>
        <span class="ls-cta-arrow">→</span>
      </div>
    </div>`;
  }).join('');
  // Inject CSS for custom level colors (built-ins already have static CSS rules)
  const builtIn = ['beginner','elementary','intermediate','advanced'];
  levelIds.filter(lid => !builtIn.includes(lid)).forEach(lid => {
    const color = levelData[lid].color || '#7a8aa0';
    let s = document.getElementById(`style-lvl-${lid}`);
    if (!s) { s = document.createElement('style'); s.id = `style-lvl-${lid}`; document.head.appendChild(s); }
    const light = color + 'cc'; const dim = color + '80';
    s.textContent = `.ls-card[data-level="${lid}"] { --card-color: ${color}; }
      body[data-level="${lid}"] { --lc:${color};--lc-dim:${dim};--lc-glow:${color}1e;--gold:${color};--gold-light:${light};--gold-dim:${dim}; }`;
  });
}
renderLevelSelector();

// ── VOCABULARY VIEW ──
function renderVocabulary(c) {
  if (!currentLevel) return;
  const ld = levelData[currentLevel];
  const adminVocab = (function() {
    try {
      const source = _liveAdminData || JSON.parse(localStorage.getItem(KEYS.adminData) || 'null');
      if (!source) return null;
      const d = source[currentLevel]?.['_vocab'];
      return (d && d.length > 0) ? d : null;
    } catch(e) { return null; }
  })();
  const vocabData = adminVocab || ld.vocabData;
  if (!vocabData || !vocabData.length) return;
  const cats = vocabData.map(d => d.category);
  const totalWords = vocabData.reduce((n, d) => n + d.words.length, 0);

  const vocabLabel = getFeatureFlags().labels?.vocabulary || SECTIONS.vocabulary.defaultLabel;
  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">${ld.icon} ${ld.name} — ${ld.zolai}</div>
      <div class="lesson-title">${vocabLabel}</div>
      <div class="lesson-subtitle">All ${totalWords} vocabulary words for the ${ld.name} level. Search or filter by category.</div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <input type="text" class="vocab-search" id="vocabSearch" placeholder="Search Zolai or English…" oninput="filterVocabList()">
      <div class="vocab-cat-bar">
        <button class="vocab-cat-btn active" onclick="setVocabCat(this,'All')">All (${totalWords})</button>
        ${cats.map(cat => {
          const cnt = vocabData.find(d => d.category === cat).words.length;
          return `<button class="vocab-cat-btn" onclick="setVocabCat(this,'${cat}')">${cat} (${cnt})</button>`;
        }).join('')}
      </div>
    </div>
    <div id="vocabSections">
      ${vocabData.map(section => `
        <div class="vocab-section" data-cat="${section.category}">
          <div class="card">
            <div class="card-title">${section.category}</div>
            ${section.words.map(w => `
              <div class="vocab-row vocab-searchable" data-z="${w.z.toLowerCase()}" data-e="${w.e.toLowerCase()}">
                <span class="vocab-zo">${w.z}</span>
                <span class="vocab-en">${w.e}</span>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>
  `;
  window._vocabActiveCat = 'All';
}

function setVocabCat(btn, cat) {
  document.querySelectorAll('.vocab-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  window._vocabActiveCat = cat;
  filterVocabList();
}

function filterVocabList() {
  const search = (document.getElementById('vocabSearch')?.value || '').toLowerCase().trim();
  const cat = window._vocabActiveCat || 'All';

  document.querySelectorAll('.vocab-section').forEach(section => {
    if (cat !== 'All' && section.dataset.cat !== cat) {
      section.style.display = 'none';
      return;
    }
    let visible = 0;
    section.querySelectorAll('.vocab-searchable').forEach(row => {
      const match = !search || row.dataset.z.includes(search) || row.dataset.e.includes(search);
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    section.style.display = visible > 0 ? '' : 'none';
  });
}

// ── LEVEL STATE ──
let currentLevel = null;

function selectLevel(levelId) {
  try {
    const ld = levelData[levelId];
    if (!ld) {
      localStorage.removeItem(KEYS.selectedLevel);
      return;
    }
    currentLevel = levelId;
    localStorage.setItem(KEYS.selectedLevel, levelId);

    // Apply theme
    document.body.setAttribute('data-level', levelId);

    // Hide level selector
    const selector = document.getElementById('levelSelector');
    if (selector) selector.style.display = 'none';

    // Show level indicator in sidebar
    const li = document.getElementById('levelIndicator');
    if (li) li.style.display = 'flex';
    
    const badge = document.getElementById('levelBadgeText');
    if (badge) badge.textContent = ld.icon + ' ' + ld.name + ' — ' + ld.zolai;

    // Update sidebar nav with level lessons
    renderSidebarLessons(levelId);

    // Update quiz bank
    updateQuizBank(levelId);

    // Show main app, reset to home
    const app = document.getElementById('mainApp');
    if (app) {
      app.style.display = 'flex';
      app.style.visibility = 'visible';
      app.classList.add('level-fade-in');
    }
    showView('home');
    updateXP();
    applyFeatureFlags();

  } catch (error) {
    console.error('Error in selectLevel:', error);
  }
}

function goLevelSelector() {
  document.getElementById('levelSelector').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  localStorage.removeItem(KEYS.selectedLevel);
  currentLevel = null;
  document.body.removeAttribute('data-level');
  state.completedLessons.clear();
  state.xp = 0;
  state.currentLesson = null;
  updateXP();
}

function renderSidebarLessons(levelId) {
  const ld = levelData[levelId];
  const nav = document.getElementById('dynamicNav');
  const sortedNums = Object.keys(ld.lessons).map(Number).sort((a,b) => a-b);
  let html = '<div class="nav-section-label" style="margin-top:12px">Lessons</div>';
  let enabledCount = 0;
  for (const i of sortedNums) {
    if (!isLessonEnabled(levelId, i)) continue;
    enabledCount++;
    const l = ld.lessons[i];
    html += `<button class="nav-item" onclick="showLesson(${i})" id="nav-lesson${i}">
      <span class="nav-icon" style="font-size:11px;font-weight:700">${i}</span>
      <span class="nav-label">${l.title}</span>
      <span class="nav-status" id="status-${i}"></span>
    </button>`;
  }
  if (isGlobalEnabled('vocabulary')) {
    const vocabLabel = getFeatureFlags().labels?.vocabulary || SECTIONS.vocabulary.defaultLabel;
    html += `<button class="nav-item" onclick="showView('vocabulary')" id="nav-vocab">
      <span class="nav-icon">◈</span>
      <span class="nav-label">${vocabLabel}</span>
    </button>`;
  }
  nav.innerHTML = html;
  // Update mobile lesson picker
  const mlp = document.getElementById('lessonPicker');
  let mlpHtml = '';
  for (const i of sortedNums) {
    if (!isLessonEnabled(levelId, i)) continue;
    mlpHtml += `<button class="mlp-btn" onclick="showLesson(${i}); closeLessonPicker()">${i} · ${ld.lessons[i].title}</button>`;
  }
  if (isGlobalEnabled('vocabulary')) {
    const vocabLabel = getFeatureFlags().labels?.vocabulary || SECTIONS.vocabulary.defaultLabel;
    mlpHtml += `<button class="mlp-btn" onclick="showView('vocabulary'); closeLessonPicker()">◈ ${vocabLabel}</button>`;
  }
  mlp.innerHTML = `<button class="mlp-btn mlp-change-level" onclick="goLevelSelector(); closeLessonPicker()">← Change Level</button>` + mlpHtml;
  state.totalLessons = enabledCount || sortedNums.length;
  applyFeatureFlags();
}

function updateQuizBank(levelId) {
  const adminQuiz = (function() {
    try {
      const raw = localStorage.getItem(KEYS.adminData);
      if (!raw) return null;
      const d = JSON.parse(raw)?.[levelId]?.['_quiz'];
      return (d && d.length > 0) ? d : null;
    } catch(e) { return null; }
  })();
  state.currentQuizBank = (adminQuiz || levelData[levelId].quizBank).slice();
}

function getLevelLessons() {
  if (!currentLevel) return {};
  return levelData[currentLevel].lessons;
}

// ── OVERRIDE showView to use level lessons ──
// Override showLesson to use level-specific data
function showLesson(n) {
  if (!currentLevel) return;
  const ld = levelData[currentLevel];
  const sortedNums = Object.keys(ld.lessons).map(Number).sort((a,b) => a-b);
  // If this lesson is disabled, find the nearest enabled one
  if (!isLessonEnabled(currentLevel, n)) {
    const idx = sortedNums.indexOf(n);
    for (let i = idx+1; i < sortedNums.length; i++) {
      if (isLessonEnabled(currentLevel, sortedNums[i])) return showLesson(sortedNums[i]);
    }
    for (let i = idx-1; i >= 0; i--) {
      if (isLessonEnabled(currentLevel, sortedNums[i])) return showLesson(sortedNums[i]);
    }
    return showView('home');
  }
  const l = ld.lessons[n];
  if (!l) return;
  state.currentLesson = n;
  state.activeView = 'lesson';
  setNav('nav-lesson' + n);
  setBreadcrumb('Lessons → ' + l.title);
  const c = document.getElementById('mainContent');
  c.className = 'content fade-in';
  renderLevelLesson(n, c, 0);
  trackVisit(currentLevel, n);
  closeLessonPicker();
  setMobileNav('mnav-lessons');
}

function renderLevelLesson(n, c, tabIdx) {
  if (!currentLevel) return;
  const ld = levelData[currentLevel];
  const l = ld.lessons[n];
  const sortedNums = Object.keys(ld.lessons).map(Number).sort((a,b) => a-b);
  const nIdx = sortedNums.indexOf(n);

  // Build list of enabled tabs (preserve original index for rendering)
  const enabledTabs = l.tabs
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => isTabEnabled(currentLevel, n, i));

  // Fall back to first enabled tab if requested tab is disabled
  if (!isTabEnabled(currentLevel, n, tabIdx)) {
    tabIdx = enabledTabs.length ? enabledTabs[0].i : 0;
  }

  const content = renderLevelLessonTab(n, tabIdx);

  // Find next enabled lesson for the Next button
  let nextLesson = null;
  for (let i = nIdx + 1; i < sortedNums.length; i++) {
    if (isLessonEnabled(currentLevel, sortedNums[i])) { nextLesson = sortedNums[i]; break; }
  }
  const isQuizEnabled = isGlobalEnabled('quiz');
  const nextBtn = nextLesson
    ? `<button class="btn btn-primary" onclick="markLessonComplete(${n}); showLesson(${nextLesson})">Next Lesson →</button>`
    : isQuizEnabled
      ? `<button class="btn btn-primary" onclick="markLessonComplete(${n}); showView('quiz')">Take the Quiz →</button>`
      : `<button class="btn btn-primary" onclick="markLessonComplete(${n}); showView('home')">Finish →</button>`;

  // Find previous enabled lesson
  let prevLesson = null;
  for (let i = nIdx - 1; i >= 0; i--) {
    if (isLessonEnabled(currentLevel, sortedNums[i])) { prevLesson = sortedNums[i]; break; }
  }

  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">${l.badge || ''}</div>
      <div class="lesson-title">${l.title || ''}</div>
      <div class="lesson-subtitle">${l.subtitle || ''}</div>
    </div>

    <div class="tabs" id="lessonTabs">
      ${enabledTabs.map(({ t, i }) => `<button class="tab${i===tabIdx?' active':''}" onclick="renderLevelLesson(${n},document.getElementById('mainContent'),${i})">${typeof t === 'object' ? t.name : t}</button>`).join('')}
    </div>

    <div id="tabContent">${content}${renderAdminMedia(currentLevel, n, tabIdx)}</div>

    <div style="display:flex;gap:12px;margin-top:32px;align-items:center">
      ${prevLesson ? `<button class="btn btn-outline" onclick="showLesson(${prevLesson})">← Previous</button>` : ''}
      ${nextBtn}
    </div>
  `;
  applyAdminItemAudio(currentLevel, n, tabIdx);
}

// ── VIDEO PLAYER HELPER ──
function renderVideoPlayer(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `<div style="position:relative;padding-top:56.25%"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;border:0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`;
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `<div style="position:relative;padding-top:56.25%"><iframe src="https://player.vimeo.com/video/${vmMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;border:0" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen></iframe></div>`;
  return `<video controls style="width:100%;border-radius:8px;max-height:300px" src="${url}"></video>`;
}

// ── ADMIN MEDIA OVERLAY ──
function renderAdminMedia(level, lesson, tabIdx) {
  try {
    const raw = localStorage.getItem(KEYS.adminData);
    if (!raw) return '';
    const td = JSON.parse(raw)?.[level]?.[lesson]?.[tabIdx];
    if (!td) return '';
    let html = '';
    if (td.image) html += `<div class="card" style="padding:12px"><img src="${td.image}" alt="" style="width:100%;border-radius:8px;max-height:300px;object-fit:contain"></div>`;
    if (td.video) html += `<div class="card" style="padding:14px"><div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em">Tab Video</div>${renderVideoPlayer(td.video)}</div>`;
    if (td.audio) html += `<div class="card" style="padding:14px"><div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em">Tab Audio</div><audio controls style="width:100%;height:36px" src="${td.audio}"></audio></div>`;
    if (td.vocab?.length) html += `<div class="card"><div class="card-title">Additional Vocabulary</div>${td.vocab.map(v=>`<div class="vocab-row"><div style="display:flex;align-items:center;gap:8px"><span class="vocab-zo">${v.z}</span>${v.audio?`<button onclick="(new Audio('${v.audio}')).play()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text-muted);cursor:pointer;padding:2px 6px;font-size:11px">&#9654;</button>`:''}</div><span class="vocab-en">${v.e}</span></div>`).join('')}</div>`;
    return html;
  } catch(e) { return ''; }
}

// ── ADMIN ITEM AUDIO — applied after innerHTML is set ──
function applyAdminItemAudio(level, lesson, tabIdx) {
  try {
    const raw = localStorage.getItem(KEYS.adminData);
    if (!raw) return;
    const items = JSON.parse(raw)?.[level]?.[lesson]?.[tabIdx]?.items;
    if (!items || !Object.keys(items).length) return;
    function wireAudio(el, key, audio) {
      if (el.dataset.audioWired) return;
      el.dataset.audioWired = '1';
      el.classList.add('has-admin-audio');
      el.title = `Tap to hear "${key}"`;
      el.style.cursor = 'pointer';
      const snd = new Audio(audio);
      el.addEventListener('click', e => { e.stopPropagation(); snd.currentTime = 0; snd.play(); });
    }
    // Match by explicit data-item-key attribute
    document.querySelectorAll('#tabContent [data-item-key]').forEach(el => {
      const key = el.dataset.itemKey;
      if (items[key]?.audio) wireAudio(el, key, items[key].audio);
    });
    // Match syllable-cell by text (consonants, vowels, syllables)
    document.querySelectorAll('#tabContent .syllable-cell').forEach(el => {
      const key = (el.querySelector('div') || el).textContent.trim();
      if (items[key]?.audio) wireAudio(el, key, items[key].audio);
    });
    // Match vocab-row by its .vocab-zo text
    document.querySelectorAll('#tabContent .vocab-row').forEach(el => {
      const zoEl = el.querySelector('.vocab-zo');
      if (!zoEl) return;
      const key = zoEl.textContent.trim();
      if (items[key]?.audio) wireAudio(el, key, items[key].audio);
    });
  } catch(e) {}
}

// ── VISIT TRACKING ──
function trackVisit(level, lesson) {
  if (_appDb) {
    _appDb.ref('analytics/visits').push({ ts: Date.now(), level, lesson }).catch(() => {});
  }
  if (window.gtag) gtag('event', 'lesson_view', { level_name: level, lesson_num: lesson });
}

// ── TAB RENDERER REGISTRY — add new tab types here, never touch per-lesson code ──
const TAB_RENDERERS = {
  'vocab-list': (tab) => {
    const rows = tab.items.map(w =>
      `<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}${rows}</div>`;
  },

  'grid': (tab) => {
    const cells = tab.items.map(item => {
      if (typeof item === 'object' && item.s !== undefined) {
        return `<div class="syllable-cell highlighted" style="padding:16px 8px"><div style="font-size:22px;font-weight:700;color:var(--gold-light)">${item.s}</div><div style="font-size:10px;color:var(--text-dim);margin-top:4px">${item.n}</div></div>`;
      }
      return `<div class="syllable-cell${tab.highlight ? ' highlighted' : ''}" ${tab.toggleable ? 'data-toggle="highlight"' : ''}>${item}</div>`;
    }).join('');
    const gridStyle = tab.columns ? `style="grid-template-columns:repeat(${tab.columns},1fr)"` : '';
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}<div class="syllable-grid" ${gridStyle}>${cells}</div></div>`;
  },

  'sentences': (tab) => {
    const rows = tab.items.map(s => `<div class="vocab-row"><span class="vocab-zo">${s}</span></div>`).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}${rows}</div>`;
  },

  'practice': (tab) => {
    const rows = tab.items.map(w =>
      `<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en" style="opacity:0;transition:opacity 0.3s;cursor:pointer" onclick="this.style.opacity=this.style.opacity==='1'?'0':'1'">${w.e}</span></div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}${rows}<div class="info-box" style="margin-top:12px">Tap to reveal.</div></div>`;
  },

  'type-cards': (tab) => {
    const cards = tab.items.map(t =>
      `<div style="margin-bottom:16px;padding:16px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)"><div style="font-weight:600;color:var(--gold-light);margin-bottom:2px">${t.name}</div><div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${t.en}</div><div style="font-size:13px;color:var(--text-muted)">${t.desc}</div></div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${cards}</div>`;
  },

  'text-blocks': (tab) => {
    const blocks = tab.blocks.map(b =>
      `${b.title ? `<div style="font-weight:600;margin-bottom:6px">${b.title}</div>` : ''}<div class="info-box">${b.html}</div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${blocks}${tab.items ? tab.items.map(w => `<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('') : ''}</div>`;
  },

  'proverbs': (tab) => {
    const items = tab.items.map(p =>
      `<div style="margin-bottom:14px;padding:14px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)"><div style="font-weight:600;color:var(--gold-light);margin-bottom:6px;font-size:14px">${p.z}</div><div style="font-size:12.5px;color:var(--text-muted)">${p.e}</div></div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${items}</div>`;
  },

  'markup-cards': (tab) => {
    const cards = tab.items.map(m =>
      `<div style="margin-bottom:12px;padding:14px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:600;color:var(--gold-light)">${m.z}</span><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted)">${m.e}</span></div>${m.desc ? `<div style="font-size:12.5px;color:var(--text-muted)">${m.desc}</div>` : ''}</div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}${cards}</div>`;
  },

  'multi-section': (tab) => {
    const sections = tab.sections.map((sec, idx) => {
      const rows = sec.items.map(w => `<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('');
      return `${sec.heading ? `<div style="font-weight:600;color:var(--gold-light);margin:${idx > 0 ? '16px' : '0'} 0 8px;font-size:13px">${sec.heading}</div>` : ''}${rows}`;
    }).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}${sections}</div>`;
  },

  'prompts': (tab) => {
    const items = tab.items.map((p, i) =>
      `<div style="margin-bottom:12px;padding:14px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)"><span style="font-size:11px;color:var(--gold);font-family:'DM Mono',monospace">PROMPT ${i+1}</span><div style="font-size:13.5px;color:var(--text);margin-top:4px">${p}</div></div>`
    ).join('');
    return `<div class="card">${tab.title ? `<div class="card-title">${tab.title}</div>` : ''}${tab.info ? `<div class="info-box">${tab.info}</div>` : ''}${items}</div>`;
  },

  'flashcards': (tab) => renderFlashcards(tab.items, tab.title || 'Flashcards'),
};

// ── CONTENT OVERRIDE (admin-editable rows) ──
function getContentOverride(level, lesson, tabIdx) {
  try {
    const raw = localStorage.getItem(KEYS.adminData);
    if (!raw) return null;
    const rows = JSON.parse(raw)?.[level]?.[lesson]?.[tabIdx]?.contentRows;
    return (rows && rows.length > 0) ? rows : null;
  } catch(e) { return null; }
}

function renderOverrideContent(n, tabIdx, rows) {
  const tabDef = levelData[currentLevel]?.lessons[n]?.tabs?.[tabIdx];
  const tabTitle = (tabDef && typeof tabDef === 'object') ? tabDef.name : (tabDef || '');
  const items = rows.map(r =>
    r.e
      ? `<div class="vocab-row"><span class="vocab-zo">${r.z}</span><span class="vocab-en">${r.e}</span></div>`
      : `<div class="vocab-row"><span class="vocab-zo">${r.z}</span></div>`
  ).join('');
  return `<div class="card">${tabTitle ? `<div class="card-title">${tabTitle}</div>` : ''}${items}</div>`;
}

// ── LEVEL LESSON CONTENT RENDERERS ──
function renderLevelLessonTab(n, tabIdx) {
  if (!currentLevel) return '';
  if (tabIdx !== 3) {
    const override = getContentOverride(currentLevel, n, tabIdx);
    if (override) return renderOverrideContent(n, tabIdx, override);
  }
  const tab = levelData[currentLevel]?.lessons[n]?.tabs?.[tabIdx];
  if (tab && typeof tab === 'object' && tab.type) {
    const renderer = TAB_RENDERERS[tab.type];
    if (renderer) return renderer(tab);
    return `<div class="card"><div class="card-title">Unknown tab type: ${esc(tab.type)}</div></div>`;
  }
  // Legacy fallback for string-keyed tabs (beginner/elementary still use old functions while migrating)
  if (currentLevel === 'beginner')   return renderBeginnerTab(n, tabIdx);
  if (currentLevel === 'elementary') return renderElementaryTab(n, tabIdx);
  return '';
}

// ── FLASHCARD RENDERER ──
function renderFlashcards(pairs, title) {
  title = title || 'Flashcards';
  const cards = pairs.map(p => `
    <div class="fc-card" onclick="this.classList.toggle('flipped')">
      <div class="fc-inner">
        <div class="fc-front">
          <div class="fc-word">${p.z}</div>
          <div class="fc-hint">tap to flip</div>
        </div>
        <div class="fc-back">
          <div class="fc-meaning">${p.e}</div>
        </div>
      </div>
    </div>`).join('');
  return `<div class="card">
    <div class="card-title">${title}</div>
    <div class="info-box">Click each card to flip and see the meaning. Use <em>Reveal All</em> to study, <em>Reset All</em> to practice again.</div>
    <div class="fc-grid">${cards}</div>
    <div class="fc-controls">
      <button class="fc-btn" onclick="this.closest('.card').querySelectorAll('.fc-card').forEach(c=>c.classList.remove('flipped'))">Reset All</button>
      <button class="fc-btn" onclick="this.closest('.card').querySelectorAll('.fc-card').forEach(c=>c.classList.add('flipped'))">Reveal All</button>
    </div>
  </div>`;
}

// ── BEGINNER FLASHCARD DATA ──
function renderBeginnerFlashcards(n) {
  const titles = ['','Alphabet & Sounds','Syllable Patterns','Greetings & Phrases','Core 100 Words','Numbers'];
  const data = {
    1: [
      {z:'a',e:'as in "father"'},{z:'e',e:'as in "bed"'},{z:'i',e:'as in "see"'},{z:'o',e:'as in "open"'},{z:'u',e:'as in "put"'},{z:'aw',e:'rounded back vowel'},
      {z:'Ng',e:'"ng" as in "sing"'},{z:'Kh',e:'aspirated K sound'},{z:'Ph',e:'aspirated P sound'},{z:'Th',e:'aspirated T sound'},
      {z:'B',e:'consonant B'},{z:'C',e:'consonant C'},{z:'D',e:'consonant D'},{z:'G',e:'consonant G'},
      {z:'H',e:'consonant H'},{z:'K',e:'consonant K'},{z:'L',e:'consonant L'},{z:'M',e:'consonant M'},
      {z:'N',e:'consonant N'},{z:'P',e:'consonant P'},{z:'S',e:'consonant S'},{z:'T',e:'consonant T'},
      {z:'V',e:'consonant V'},{z:'Z',e:'consonant Z'},
    ],
    2: [
      {z:'Ba / Be / Bi',e:'B + vowel (open syllables)'},{z:'Ka / Ke / Ki',e:'K + vowel combinations'},{z:'La / Le / Li',e:'L + vowel combinations'},
      {z:'Ma / Me / Mi',e:'M + vowel combinations'},{z:'Na / Ne / Ni',e:'N + vowel combinations'},{z:'Sa / Se / Si',e:'S + vowel combinations'},
      {z:'Bah / Beh / Bih',e:'B + vowel + h (breathy)'},{z:'Kah / Keh / Kih',e:'K + vowel + h (breathy)'},{z:'Lah / Leh / Lih',e:'L + vowel + h (breathy)'},
      {z:'Lo ah buhtuh a huh hi.',e:'There is food in the field.'},{z:'Sameh a ne hi.',e:'Sameh is eating.'},{z:'A behpa a huh hi.',e:'His father is there.'},
      {z:'A pi a dah mahmah hi.',e:'His grandmother is very sad.'},{z:'Gah leh teh kane hi.',e:'Here and there is scattered.'},
    ],
    3: [
      {z:'Hallo / Dammaw',e:'Hello (greeting)'},{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},
      {z:'Lungdam mahmah hi.',e:'I am very glad.'},{z:'Hong phawk den.',e:'Please remember us.'},
      {z:'Kei ka dam hi.',e:'I am well.'},{z:'Ka lungdam mahmah hi.',e:'I am very glad.'},
      {z:'Ih kimuh lungdam un.',e:'We are glad to meet you.'},{z:'Na lawm it.',e:'Your loving friend.'},
      {z:'Kong it pa/nu.',e:'Dear father/mother.'},
    ],
    4: [
      {z:'mi',e:'person'},{z:'inn',e:'house'},{z:'lo',e:'field/farm'},{z:'tui',e:'water'},{z:'ni',e:'sun/day'},
      {z:'zan',e:'night'},{z:'sang',e:'school'},{z:'gam',e:'country/land'},{z:'nu',e:'mother'},{z:'pa',e:'father'},
      {z:'laibu',e:'book'},{z:'mawtaw',e:'car'},{z:'vanleng',e:'airplane'},{z:'an',e:'food/rice'},
      {z:'pai',e:'go'},{z:'ciah',e:'come/return'},{z:'ne',e:'eat'},{z:'om',e:'be/stay'},
      {z:'sim',e:'read/study'},{z:'mu',e:'see'},{z:'it',e:'love'},{z:'sep',e:'work'},
      {z:'hi',e:'is/am/are (affirmative)'},{z:'leh',e:'and'},{z:'ah',e:'at/in'},{z:'tawh',e:'with'},
      {z:'hiam',e:'question marker'},{z:'mahmah',e:'very/greatly'},
    ],
    5: [
      {z:'bem',e:'0 (zero)'},{z:'khat',e:'1 (one)'},{z:'nih',e:'2 (two)'},{z:'thum',e:'3 (three)'},
      {z:'li',e:'4 (four)'},{z:'nga',e:'5 (five)'},{z:'guk',e:'6 (six)'},{z:'sagih',e:'7 (seven)'},
      {z:'giat',e:'8 (eight)'},{z:'kua',e:'9 (nine)'},{z:'sawmkhat',e:'10 (ten)'},{z:'sawmnih',e:'20 (twenty)'},
      {z:'zakhat',e:'100 (one hundred)'},{z:'tulkhat',e:'1,000 (one thousand)'},
      {z:'a khatna',e:'1st (first)'},{z:'a nihna',e:'2nd (second)'},{z:'a thumna',e:'3rd (third)'},
      {z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},
      {z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'},
    ],
  };
  return renderFlashcards(data[n] || [], 'Flashcards — ' + (titles[n] || ''));
}

// ── ELEMENTARY FLASHCARD DATA ──
function renderElementaryFlashcards(n) {
  const titles = ['','Basic Sentences','Numbers & Counting','Time Expressions','Articles','Simple Dialogues'];
  const data = {
    1: [
      {z:'Laigual',e:'sentence'},{z:'A sempa',e:'subject (of sentence)'},{z:'A thu',e:'predicate'},
      {z:'hi',e:'affirmative sentence ending'},{z:'kei/lo',e:'negation marker'},{z:'hiam',e:'question marker'},
      {z:'Va-ak in moh a tuah hi.',e:'The crow played a trick.'},{z:'Ka nu ka it hi.',e:'I love my mother.'},
      {z:'Inn a hoih mahmah hi.',e:'The house is very beautiful.'},{z:'Huih a nung hi.',e:'The wind is blowing.'},
      {z:'Kei in nasep ka hanciam hi.',e:'I work hard. (positive)'},{z:'Kei in nasep ka hanciam kei hi.',e:'I do not work hard. (negative)'},
    ],
    2: [
      {z:'bem',e:'0'},{z:'khat',e:'1'},{z:'nih',e:'2'},{z:'thum',e:'3'},{z:'li',e:'4'},{z:'nga',e:'5'},
      {z:'guk',e:'6'},{z:'sagih',e:'7'},{z:'giat',e:'8'},{z:'kua',e:'9'},{z:'sawmkhat',e:'10'},
      {z:'sawmnih',e:'20'},{z:'sawmthum',e:'30'},{z:'sawmnga',e:'50'},{z:'zakhat',e:'100'},
      {z:'tulkhat',e:'1,000'},{z:'awnkhat',e:'1,000,000'},{z:'a khatna',e:'first (ordinal)'},
      {z:'khatveina',e:'once'},{z:'nihveina',e:'twice'},{z:'sawmnih-sagih',e:'27 (twenty-seven)'},
    ],
    3: [
      {z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},
      {z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'},
      {z:'Theinosihkha',e:'January'},{z:'Tunkha',e:'February'},{z:'Dota',e:'March'},{z:'Dopi',e:'April'},
      {z:'Zingkha',e:'May'},{z:'Gamkha',e:'June'},{z:'Tangsihkha',e:'July'},{z:'Tangkha',e:'August'},
      {z:'Phalkha',e:'September'},{z:'Khuadokha',e:'October'},{z:'Nokha',e:'November'},{z:'Kaukha',e:'December'},
      {z:'zingsang',e:'morning'},{z:'nitak',e:'evening/afternoon'},{z:'zan',e:'night'},{z:'tu ni',e:'today'},{z:'zanin',e:'yesterday'},
    ],
    4: [
      {z:'khat',e:'indefinite article (a/one)'},{z:'tua...pen',e:'definite article (the — topic)'},
      {z:'tua...in',e:'definite article (the — doing)'},{z:'sakol khat',e:'a horse (indefinite)'},
      {z:'laibu khat',e:'a book (indefinite)'},{z:'Tua sakol pen',e:'the horse (as topic)'},
      {z:'Tua sakol in',e:'the horse (as agent)'},{z:'mi citak khat',e:'a certain person'},
      {z:'sikkeu khat',e:'a cat (indefinite)'},
    ],
    5: [
      {z:'Kua?',e:'Who?'},{z:'Bang?',e:'What?'},{z:'Koi?',e:'Where?'},{z:'Bang hunin?',e:'When?'},
      {z:'Banghanghiam?',e:'Why?'},{z:'Bangci?',e:'How?'},{z:'Bang zah?',e:'How many?'},
      {z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},
      {z:'Na min bang ci hiam?',e:'What is your name?'},{z:'Koi pan hong pai na hia?',e:'Where are you from?'},
      {z:'Ka sang ah ka pai hi.',e:'I am going to school.'},
    ],
  };
  return renderFlashcards(data[n] || [], 'Flashcards — ' + (titles[n] || ''));
}


// ─── BEGINNER CONTENT ───
function renderBeginnerTab(n, tabIdx) {
  if (tabIdx === 3) return renderBeginnerFlashcards(n);
  if (n === 1) {
    const cons = ['B','C','D','G','H','K','L','M','N','P','S','T','V','Z','Ng','Kh','Ph','Th'];
    const vowels = [{s:'a',n:'as in "father"'},{s:'e',n:'as in "bed"'},{s:'i',n:'as in "see"'},{s:'o',n:'as in "open"'},{s:'u',n:'as in "put"'},{s:'aw',n:'rounded back vowel'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Laimungte — Consonants</div>
      <div class="info-box"><strong>Zolai uses 18 consonants.</strong> Special digraphs Ng, Kh, Ph, Th each represent one single sound. Letters F, J, Q, R, X, Y appear only in borrowed words.</div>
      <div class="syllable-grid">${cons.map(c=>`<div class="syllable-cell">${c}</div>`).join('')}</div></div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Awsuaksak — Vowels</div>
      <div class="info-box">Zolai has <strong>6 core vowel sounds</strong>. The vowel 'aw' is a unique rounded back vowel.</div>
      <div class="syllable-grid" style="grid-template-columns:repeat(3,1fr)">${vowels.map(v=>`<div class="syllable-cell highlighted" style="padding:16px 8px"><div style="font-size:22px;font-weight:700;color:var(--gold-light)">${v.s}</div><div style="font-size:10px;color:var(--text-dim);margin-top:4px">${v.n}</div></div>`).join('')}</div></div>`;
    return `<div class="card"><div class="card-title">Practice Reading</div>
      <div class="info-box">Read these sentences aloud. Each one is from the original Paunam Khenna text.</div>
      ${['Alu a to hi.','Bi a po zo hi.','Be a su hi.','Ga a la hi.','Ni a sa hi.','Ka mo a gi hi.','Haza va la hi.','Tho a na hi.','Mawtaw ka mu hi.'].map(s=>`<div class="vocab-row"><span class="vocab-zo">${s}</span></div>`).join('')}</div>`;
  }
  if (n === 2) {
    const syl = ['Ba','Be','Bi','Bo','Bu','Baw','Ca','Ce','Ci','Co','Cu','Caw','Da','De','Di','Do','Du','Daw','Ka','Ke','Ki','Ko','Ku','Kaw','La','Le','Li','Lo','Lu','Law','Ma','Me','Mi','Mo','Mu','Maw','Na','Ne','Ni','No','Nu','Naw','Pa','Pe','Pi','Po','Pu','Paw','Sa','Se','Si','So','Su','Saw','Ta','Te','Ti','To','Tu','Taw'];
    const sylh = ['Bah','Beh','Bih','Boh','Buh','Bawh','Cah','Ceh','Cih','Coh','Cuh','Cawh','Dah','Deh','Dih','Doh','Duh','Dawh','Kah','Keh','Kih','Koh','Kuh','Kawh','Lah','Leh','Lih','Loh','Luh','Lawh','Mah','Meh','Mih','Moh','Muh','Mawh','Nah','Neh','Nih','Noh','Nuh','Nawh'];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Sinna II — Basic Syllables</div>
      <div class="info-box">Consonant + Vowel combinations. These form the basic building blocks of Zolai words.</div>
      <div class="syllable-grid">${syl.map(s=>`<div class="syllable-cell">${s}</div>`).join('')}</div></div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Sinna III — Syllables with -h (breathy)</div>
      <div class="info-box">Adding <strong>-h</strong> to a vowel creates a breathy, aspirated sound. This is a key feature of Zolai phonology.</div>
      <div class="syllable-grid">${sylh.map(s=>`<div class="syllable-cell highlighted">${s}</div>`).join('')}</div></div>`;
    return `<div class="card"><div class="card-title">Practice Sentences</div>
      ${['Lo ah buhtuh a huh hi.','Zato ah zaa a nuh hi.','Gah leh teh kane hi.','A u buh tuh a huh hi.','A behpa a huh hi.','Sameh a ne hi.','A pi a dah mahmah hi.','Lo ahuh a, a zawh pih hi.'].map(s=>`<div class="vocab-row"><span class="vocab-zo">${s}</span></div>`).join('')}</div>`;
  }
  if (n === 3) {
    const greetings = [
      {z:'Hallo / Dammaw',e:'Hello (greeting song)'},
      {z:'Na dam hiam?',e:'Are you well?'},
      {z:'Ka dam hi.',e:'I am well.'},
      {z:'Lungdam mahmah hi.',e:'I am very glad.'},
      {z:'Itna lianpi tawh kong zawn hi.',e:'I invite you with great love.'},
      {z:'Hong phawk den.',e:'Please remember (me/us).'},
      {z:'Na lawm it.',e:'Your loving friend.'},
      {z:'Kong it pa/nu.',e:'Dear father/mother.'},
    ];
    const phrases = [
      {z:'Kei ka dam hi.',e:'I am well.'},
      {z:'Nang na dam hiam?',e:'Are you well?'},
      {z:'Ka lungdam mahmah hi.',e:'I am very glad.'},
      {z:'Ka siate nuam thei mahmah uh hi.',e:'They are also very well.'},
      {z:'Ka nu leh innkuanpih teng zong ka phawk mahmah hi.',e:'I also greatly remember my mother and family.'},
      {z:'Ih kimuh lungdam un.',e:'We are glad to meet you (all).'},
    ];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Kihopihnala — Greetings</div>
      <div class="info-box">These are foundational Zolai greetings used in daily life and in the Paunam Khenna text.</div>
      ${greetings.map(g=>`<div class="vocab-row"><span class="vocab-zo">${g.z}</span><span class="vocab-en">${g.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Common Phrases</div>
      ${phrases.map(g=>`<div class="vocab-row"><span class="vocab-zo">${g.z}</span><span class="vocab-en">${g.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Practice — Match the meaning</div>
      <div class="info-box">Translate these greetings into English in your head, then check below.</div>
      ${greetings.slice(0,5).map(g=>`<div class="vocab-row"><span class="vocab-zo">${g.z}</span><span class="vocab-en" style="opacity:0;transition:opacity 0.3s;cursor:pointer" onclick="this.style.opacity=this.style.opacity==='1'?'0':'1'">${g.e}</span></div>`).join('')}
      <div class="info-box" style="margin-top:16px">Tap the right side to reveal the meaning.</div></div>`;
  }
  if (n === 4) {
    const nouns = [{z:'mi',e:'person'},{z:'inn',e:'house'},{z:'lo',e:'field/farm'},{z:'tui',e:'water'},{z:'ni',e:'sun/day'},{z:'zan',e:'night'},{z:'lam',e:'road/way'},{z:'sang',e:'school'},{z:'gam',e:'country/land'},{z:'khua',e:'village/town'},{z:'nu',e:'mother'},{z:'pa',e:'father'},{z:'ta',e:'child'},{z:'u',e:'elder sibling'},{z:'nau',e:'younger sibling'},{z:'laibu',e:'book'},{z:'sum',e:'money'},{z:'mawtaw',e:'car'},{z:'vanleng',e:'airplane'},{z:'an',e:'food/rice'}];
    const verbs = [{z:'pai',e:'go'},{z:'ciah',e:'come/return'},{z:'ne',e:'eat'},{z:'dawn',e:'drink'},{z:'om',e:'be/stay'},{z:'tai',e:'run'},{z:'sim',e:'read/study'},{z:'gel',e:'write'},{z:'sa',e:'sing'},{z:'mu',e:'see'},{z:'theih',e:'know'},{z:'it',e:'love'},{z:'dawng',e:'hear'},{z:'ngaih',e:'think/remember'},{z:'sep',e:'work'},{z:'pia',e:'give'},{z:'la',e:'take'},{z:'lam',e:'walk'},{z:'tu',e:'stand'},{z:'lum',e:'sleep'}];
    const particles = [{z:'hi',e:'(sentence ending - affirmative)'},{z:'leh',e:'and'},{z:'in',e:'(subject marker)'},{z:'a',e:'(subject marker - 3rd person)'},{z:'tawh',e:'with'},{z:'ah',e:'at/in'},{z:'panin',e:'from'},{z:'nadingin',e:'for/in order to'},{z:'napi-in',e:'although/even though'},{z:'zong',e:'also/too'},{z:'bek',e:'only/just'},{z:'mahmah',e:'very/greatly'},{z:'kei/lo',e:'not (negation)'},{z:'hiam',e:'(question marker)'},{z:'ding hi',e:'will (future)'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Essential Nouns</div>
      <div class="info-box">Learn these <strong>20 core Zolai nouns</strong> first — they appear in almost every conversation.</div>
      ${nouns.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Essential Verbs</div>
      <div class="info-box">These <strong>20 core Zolai verbs</strong> form the backbone of everyday speech.</div>
      ${verbs.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Particles & Markers</div>
      <div class="info-box">These small words are essential — they mark grammar roles and modify meaning.</div>
      ${particles.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
  }
  if (n === 5) {
    const cardinal = [{z:'bem',e:'0'},{z:'khat',e:'1'},{z:'nih',e:'2'},{z:'thum',e:'3'},{z:'li',e:'4'},{z:'nga',e:'5'},{z:'guk',e:'6'},{z:'sagih',e:'7'},{z:'giat',e:'8'},{z:'kua',e:'9'},{z:'sawmkhat',e:'10'},{z:'sawmnih',e:'20'},{z:'zakhat',e:'100'},{z:'tulkhat',e:'1,000'},{z:'thenkhat',e:'10,000'},{z:'awnkhat',e:'1,000,000'}];
    const ordinal = [{z:'a khatna',e:'1st'},{z:'a nihna',e:'2nd'},{z:'a thumna',e:'3rd'},{z:'a lina',e:'4th'},{z:'a ngana',e:'5th'},{z:'a masa',e:'first (the original)'},{z:'a tawpna',e:'last'}];
    const days = [{z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},{z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'}];
    const months = [{z:'Theinosihkha',e:'January'},{z:'Tunkha',e:'February'},{z:'Dota',e:'March'},{z:'Dopi',e:'April'},{z:'Zingkha',e:'May'},{z:'Gamkha',e:'June'},{z:'Tangsihkha',e:'July'},{z:'Tangkha',e:'August'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Zo Nambatte — Numbers</div>
      <div class="info-box">Zolai has its own number system. Note that larger numbers are built by combining smaller units.</div>
      ${cardinal.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Ordinal Numbers</div>
      <div class="info-box">Add <strong>-na</strong> after a cardinal number to make it ordinal (1st, 2nd, 3rd...).</div>
      ${ordinal.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Days & Months</div>
      <div class="info-box">Days of the week (Nipikal minte) and months of the year (Kraminte) in Zolai.</div>
      <div class="card-title" style="font-size:13px;margin-bottom:8px;margin-top:16px">Days of the Week</div>
      ${days.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}
      <div class="card-title" style="font-size:13px;margin:16px 0 8px">Months</div>
      ${months.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
  }
  return '<div class="card"><div class="card-title">Coming soon</div></div>';
}

// ─── ELEMENTARY CONTENT ───
function renderElementaryTab(n, tabIdx) {
  if (tabIdx === 3) return renderElementaryFlashcards(n);
  if (n === 1) {
    const struct = [{z:'Va-ak in moh a tuah hi.',e:'The crow played a trick.'},{z:'Ka nu ka it hi.',e:'I love my mother.'},{z:'Inn a hoih mahmah hi.',e:'The house is very beautiful.'},{z:'Huih a nung hi.',e:'The wind is blowing.'},{z:'Sakol in, leng a kai hi.',e:'The horse climbed the hill.'}];
    const patterns = [
      {label:'Subject + Verb + hi',ex:'Taang a tai hi.',en:'He runs.'},
      {label:'Subject + in + Object + Verb + hi',ex:'Lianpi in kong a khak hi.',en:'Lianpi knocked the door.'},
      {label:'Subject + Adjective + hi',ex:'Inn a hoih mahmah hi.',en:'The house is very beautiful.'},
      {label:'Question: ...hiam?',ex:'Nang na dam hiam?',en:'Are you well?'},
    ];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Laigual — Sentence Structure</div>
      <div class="info-box">A Zolai sentence (laigual) needs a <strong>subject (a sempa)</strong> and a <strong>predicate (a thu)</strong> to express a complete meaning. The verb typically comes near the end.</div>
      ${patterns.map(p=>`<div class="vocab-row" style="flex-direction:column;align-items:flex-start;gap:4px"><span style="font-size:11px;color:var(--gold);font-family:'DM Mono',monospace">${p.label}</span><span class="vocab-zo">${p.ex}</span><span class="vocab-en">${p.en}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Example Sentences</div>
      <div class="info-box">Read these sentences from the grammar text. Notice how 'a' appears before many verbs and 'hi' ends most statements.</div>
      ${struct.map(s=>`<div class="vocab-row"><span class="vocab-zo">${s.z}</span><span class="vocab-en">${s.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Positive, Negative, Question</div>
      <div class="info-box">Zolai has three sentence types. Add <strong>kei/lo</strong> for negative, and <strong>hiam/hia/maw</strong> for questions.</div>
      ${[{z:'Kei in nasep ka hanciam hi.',e:'I work hard. (positive)'},{z:'Kei in nasep ka hanciam kei hi.',e:'I do not work hard. (negative)'},{z:'Kei in nasep ka hanciam hiam?',e:'Do I work hard? (question)'}].map(s=>`<div class="vocab-row"><span class="vocab-zo">${s.z}</span><span class="vocab-en">${s.e}</span></div>`).join('')}</div>`;
  }
  if (n === 2) {
    const nums = [{z:'bem',e:'0'},{z:'khat',e:'1'},{z:'nih',e:'2'},{z:'thum',e:'3'},{z:'li',e:'4'},{z:'nga',e:'5'},{z:'guk',e:'6'},{z:'sagih',e:'7'},{z:'giat',e:'8'},{z:'kua',e:'9'},{z:'sawmkhat',e:'10'},{z:'sawmnih',e:'20'},{z:'sawmthum',e:'30'},{z:'sawmli',e:'40'},{z:'sawmnga',e:'50'},{z:'zakhat',e:'100'},{z:'zanga',e:'500'},{z:'tulkhat',e:'1,000'},{z:'thenkhat',e:'10,000'},{z:'sangkhat',e:'100,000'},{z:'awnkhat',e:'1,000,000'},{z:'makkhat',e:'10,000,000'}];
    const insent = [{z:'Ka sang uhah tukpeng kimawlna tualpi khat om hi.',e:'There is one big sports ground at our school.'},{z:'Kum sawmnih a pha hi.',e:'She is 20 years old.'},{z:'Khutme nga a nei hi.',e:'She has five fingers.'},{z:'Pak tampi a nei hi.',e:'He has many chickens.'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Full Number System</div>
      <div class="info-box">Larger numbers combine smaller ones: <strong>sawm-leh-khat = 11</strong>, <strong>sawmnih-nga = 25</strong>.</div>
      ${nums.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Ordinal & Counting</div>
      <div class="info-box">Add <strong>-na</strong> for ordinals. Use <strong>-veina</strong> for repetitions (once, twice).</div>
      ${[{z:'a khatna',e:'first'},{z:'a nihna',e:'second'},{z:'khatveina',e:'once'},{z:'nihveina',e:'twice'},{z:'thumveina',e:'three times'},{z:'sawmnih-sagih',e:'27 (twenty-seven)'},{z:'zakhat-sawmnih',e:'120 (one hundred twenty)'}].map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Numbers in Sentences</div>
      ${insent.map(s=>`<div class="vocab-row"><span class="vocab-zo">${s.z}</span><span class="vocab-en">${s.e}</span></div>`).join('')}</div>`;
  }
  if (n === 3) {
    const days = [{z:'Nipi',e:'Sunday'},{z:'Pizang',e:'Monday'},{z:'Pithai',e:'Tuesday'},{z:'Nilai',e:'Wednesday'},{z:'Laizing',e:'Thursday'},{z:'Laithai',e:'Friday'},{z:'Nino',e:'Saturday'}];
    const months = [{z:'Theinosihkha',e:'January'},{z:'Tunkha',e:'February'},{z:'Dota',e:'March'},{z:'Dopi',e:'April'},{z:'Zingkha',e:'May'},{z:'Gamkha',e:'June'},{z:'Tangsihkha',e:'July'},{z:'Tangkha',e:'August'},{z:'Phalkha',e:'September'},{z:'Khuadokha',e:'October'},{z:'Nokha',e:'November'},{z:'Kaukha',e:'December'}];
    const times = [{z:'zingsang',e:'morning'},{z:'nitak',e:'evening/afternoon'},{z:'zan',e:'night'},{z:'zingtunga',e:'early morning'},{z:'nai sagih',e:"7 o'clock"},{z:'tu ni',e:'today'},{z:'zanin',e:'yesterday/last night'},{z:'taang',e:'tomorrow'},{z:'mai',e:'soon/later'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Nipikal Minte — Days of the Week</div>${days.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Kraminte — Months</div>${months.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Time of Day</div>
      <div class="info-box">Use these time words as adverbs of time (Sepzia hun kammal) in sentences.</div>
      ${times.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}
      <div class="info-box" style="margin-top:16px"><strong>Example:</strong> Zingsang tungin lai ka sim hi. → I study in the morning.</div></div>`;
  }
  if (n === 4) {
    const indef = [{z:'sakol khat',e:'a horse (indefinite)'},{z:'laibu khat',e:'a book'},{z:'mi citak khat',e:'a certain person'},{z:'sikkeu khat',e:'a cat'}];
    const def = [{z:'Tua sakol pen',e:'the horse (subject)'},{z:'Tua sakol in',e:'the horse (doing)'},{z:'Tua laibu pen',e:'the book (subject)'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Indefinite Article — 'khat'</div>
      <div class="info-box">In Zolai, the indefinite article is <strong>khat</strong> (meaning 'one/a'). Place it after the noun. Do not use articles with Proper Nouns.</div>
      ${indef.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Definite Articles — 'Tua...pen' and 'Tua...in'</div>
      <div class="info-box">Use <strong>Tua...pen</strong> when the noun is the topic/subject, and <strong>Tua...in</strong> when the noun is actively doing something. These refer back to something already mentioned.</div>
      ${def.map(w=>`<div class="vocab-row"><span class="vocab-zo">${w.z}</span><span class="vocab-en">${w.e}</span></div>`).join('')}
      <div class="info-box" style="margin-top:12px">Zolai has <strong>3 articles</strong> total: khat, tua...pen, tua...in. (English has 2: a/an, the.)</div></div>`;
    return `<div class="card"><div class="card-title">Article Practice</div>
      <div class="info-box">Fill in the article in your mind, then check the answer.</div>
      ${[{z:'Kumpipa in, sakol ___ tawh khual a zin hi.',e:'khat (a horse)'},{z:'___ sakol pen, a kaang ahi hi.',e:'Tua (the horse — topic)'},{z:'___ sakol in kumpipa a thei hi.',e:'Tua (the horse — doing)'}].map(w=>`<div class="vocab-row" style="flex-direction:column;align-items:flex-start;gap:4px"><span class="vocab-zo">${w.z}</span><span class="vocab-en" style="opacity:0;transition:opacity 0.3s;cursor:pointer" onclick="this.style.opacity=this.style.opacity==='1'?'0':'1'">Answer: ${w.e}</span></div>`).join('')}
      <div class="info-box" style="margin-top:12px">Tap to reveal the answer.</div></div>`;
  }
  if (n === 5) {
    const greet = [{z:'Na dam hiam?',e:'Are you well?'},{z:'Ka dam hi.',e:'I am well.'},{z:'Na min bang ci hiam?',e:'What is your name?'},{z:'Ka min ___ ahi hi.',e:'My name is ___.'},{z:'Koi pan hong pai na hia?',e:'Where are you coming from?'},{z:'Zanin koi-ah om na hi vua?',e:'Where were you last night?'}];
    const quest = [{z:'Kua?',e:'Who?'},{z:'Bang?',e:'What?'},{z:'Koi?',e:'Where?'},{z:'Bang hunin?',e:'When?'},{z:'Banghanghiam?',e:'Why?'},{z:'Bangci?',e:'How?'},{z:'Bang zah?',e:'How many?'}];
    if (tabIdx === 0) return `<div class="card"><div class="card-title">Greeting Dialogue</div>
      ${greet.map(s=>`<div class="vocab-row"><span class="vocab-zo">${s.z}</span><span class="vocab-en">${s.e}</span></div>`).join('')}</div>`;
    if (tabIdx === 1) return `<div class="card"><div class="card-title">Question Words</div>
      <div class="info-box">These question words (Dotna kammalte) come at key positions in the sentence to ask who, what, where, when, why, and how.</div>
      ${quest.map(s=>`<div class="vocab-row"><span class="vocab-zo">${s.z}</span><span class="vocab-en">${s.e}</span></div>`).join('')}</div>`;
    return `<div class="card"><div class="card-title">Full Dialogue</div>
      <div class="info-box">Read and memorise this dialogue between two friends meeting.</div>
      ${[{z:'A: Na dam hiam?',e:'Are you well?'},{z:'B: Ka dam hi, lungdam un. Nang zong na dam hiam?',e:'I am well, thank you. Are you also well?'},{z:'A: Ka dam hi. Koi-ah na pai hiam?',e:'I am well. Where are you going?'},{z:'B: Ka sang ah ka pai hi.',e:'I am going to school.'}].map(s=>`<div class="vocab-row" style="flex-direction:column;align-items:flex-start;gap:2px"><span class="vocab-zo">${s.z}</span><span class="vocab-en">${s.e}</span></div>`).join('')}</div>`;
  }
  return '<div class="card"><div class="card-title">Coming soon</div></div>';
}

// ── OVERRIDE renderHome for level context ──
function renderHome(c) {
  if (!currentLevel) { return; }
  const ld = levelData[currentLevel];
  const lessonCount = Object.keys(ld.lessons).length;
  const done = state.completedLessons.size;
  c.innerHTML = `
    <div class="home-hero">
      <div class="lesson-badge">${ld.icon} ${ld.name} — ${ld.zolai}</div>
      <div class="home-hero-title">${BRAND.heroTitle}</div>
      <div class="home-hero-sub">You are on the <strong>${ld.name}</strong> path. Complete all ${lessonCount} lessons to master this level, then try a harder one.</div>
      <button class="btn btn-primary" onclick="showLesson(${done < lessonCount ? done + 1 : 1})">
        ${done === 0 ? '→ Begin Level' : done < lessonCount ? '→ Continue Lesson ' + (done+1) : '→ Review Lessons'}
      </button>
    </div>
    <div class="module-grid">
      ${Object.entries(ld.lessons).map(([num, l]) => `
        <div class="module-card" onclick="showLesson(${num})">
          <div class="module-icon" style="font-size:20px">${num}</div>
          <div class="module-title">${l.title}</div>
          <div class="module-desc">${(l.subtitle||'').substring(0,80)}${l.subtitle?.length>80?'...':''}</div>
          <div class="module-progress">
            <div class="mini-bar"><div class="mini-fill" style="width:${state.completedLessons.has(parseInt(num))?100:0}%"></div></div>
            <span>${state.completedLessons.has(parseInt(num)) ? '✓ Done' : 'Start'}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── OVERRIDE Quiz to use level quiz bank ──
function renderQuizStart(c) {
  if (!currentLevel || !state.currentQuizBank) { return; }
  const ld = levelData[currentLevel];
  c.innerHTML = `
    <div class="home-hero">
      <div class="lesson-badge">${ld.icon} ${ld.name} Quiz</div>
      <div class="home-hero-title">Test Your<br><em>Zolai Knowledge</em></div>
      <div class="home-hero-sub">${state.currentQuizBank.length} questions covering all ${ld.name} topics. Take your time!</div>
      <button class="btn btn-primary" onclick="startLevelQuiz()">→ Start Quiz</button>
    </div>
  `;
}

function startLevelQuiz() {
  if (!state.currentQuizBank) return;
  const bank = state.currentQuizBank.slice().sort(() => Math.random() - 0.5);
  state.quizAnswers = bank;
  state.quizIndex = 0;
  state.quizScore = 0;
  renderLevelQuizQuestion();
}

function renderLevelQuizQuestion() {
  const c = document.getElementById('mainContent');
  const bank = state.quizAnswers;
  const idx = state.quizIndex;
  if (idx >= bank.length) {
    renderLevelQuizResult();
    return;
  }
  const q = bank[idx];
  c.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-progress">
        ${Array.from({length:bank.length},(_,i)=>`<div class="qp-dot${i<idx?' done':i===idx?' current':''}"></div>`).join('')}
      </div>
      <div class="quiz-question-num">Question ${idx+1} of ${bank.length}</div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((o,i) => `
          <button class="quiz-option" onclick="answerLevelQuiz(${i})">
            <span class="option-letter">${String.fromCharCode(65+i)}</span>
            <span>${o}</span>
          </button>
        `).join('')}
      </div>
      <div class="quiz-feedback" id="qfb"></div>
    </div>
  `;
}

function answerLevelQuiz(chosen) {
  const q = state.quizAnswers[state.quizIndex];
  const btns = document.querySelectorAll('.quiz-option');
  btns.forEach(b => b.disabled = true);
  const correct = chosen === q.ans;
  if (correct) state.quizScore++;
  btns[chosen].classList.add(correct ? 'correct' : 'wrong');
  btns[q.ans].classList.add('correct');
  const fb = document.getElementById('qfb');
  fb.className = 'quiz-feedback show ' + (correct ? 'correct' : 'wrong');
  fb.textContent = correct ? '✓ Correct!' : '✗ The correct answer is: ' + q.opts[q.ans];
  setTimeout(() => {
    state.quizIndex++;
    renderLevelQuizQuestion();
  }, 1800);
}

function renderLevelQuizResult() {
  const c = document.getElementById('mainContent');
  const score = state.quizScore;
  const total = state.quizAnswers.length;
  const pct = Math.round((score/total)*100);
  const xpGained = score * 20;
  state.xp += xpGained;
  updateXP();

  // Save result for optional leaderboard submission
  state.lastQuizResult = {
    xp: state.xp,
    level: levelData[currentLevel]?.name || currentLevel,
    levelKey: currentLevel,
    lessons: state.completedLessons.size,
    totalLessons: state.totalLessons || 5,
    quizScore: score,
    quizTotal: total,
    quizPct: pct
  };

  const hasFb = !!localStorage.getItem(KEYS.firebaseUrl);
  const submitBtn = hasFb
    ? `<button class="btn btn-outline" style="border-color:var(--gold-dim);color:var(--gold)"
         onclick="showSubmitModal(state.lastQuizResult)">&#127942; Submit Score</button>`
    : '';

  c.innerHTML = `
    <div class="quiz-container" style="text-align:center">
      <div style="font-size:56px;margin-bottom:16px">${pct>=80?'🏆':pct>=60?'⭐':'📚'}</div>
      <div class="quiz-question" style="text-align:center">${pct>=80?'Excellent!':pct>=60?'Good work!':'Keep practising!'}</div>
      <div style="font-size:32px;font-weight:700;color:var(--gold-light);margin:16px 0">${score} / ${total}</div>
      <div style="font-size:14px;color:var(--text-muted);margin-bottom:8px">+${xpGained} XP earned · Total: ${state.xp} XP</div>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:24px">
        ${state.completedLessons.size} of ${state.totalLessons||5} lessons completed
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="startLevelQuiz()">Retry Quiz</button>
        ${submitBtn}
        <button class="btn btn-outline" onclick="showView('leaderboard')">View Leaderboard</button>
        <button class="btn btn-outline" onclick="showView('home')">Back to Home</button>
      </div>
    </div>
  `;
}

// ── OVERRIDE markLessonComplete for dynamic total ──
function markLessonComplete(n) {
  if (!state.completedLessons.has(n)) {
    state.completedLessons.add(n);
    state.xp += 50;
    const el = document.getElementById('status-' + n);
    if (el) el.textContent = '✓';
    document.getElementById('nav-lesson' + n)?.classList.add('completed');
    updateXP();
  }
}

// ── OVERRIDE updateXP for dynamic total ──
function updateXP() {
  document.getElementById('xpCount').textContent = state.xp + ' XP';
  const total = state.totalLessons || 6;
  const pct = Math.min(100, Math.round((state.completedLessons.size / total) * 100));
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
}

// ── FIREBASE SYNC — fetch shared content from Realtime Database ──
let _appDb = null;          // db reference for analytics writes
let _liveAdminData = null;  // kept in sync via real-time listener
let _fbListenerSet = false; // ensure listener is only attached once

const _APP_FB_CONFIG = {
  apiKey:            "AIzaSyD6TuwAQSa00u9AiU_SrOh81X6yUHcWPDY",
  authDomain:        "zopau-paunam-khenna.firebaseapp.com",
  databaseURL:       "https://zopau-paunam-khenna-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "zopau-paunam-khenna",
  storageBucket:     "zopau-paunam-khenna.firebasestorage.app",
  messagingSenderId: "241580430522",
  appId:             "1:241580430522:web:56e67804d07c91dfc71e83"
};

async function _fbSync() {
  try {
    let fbApp;
    try { fbApp = firebase.app('appClient'); }
    catch(e) { fbApp = firebase.initializeApp(_APP_FB_CONFIG, 'appClient'); }
    const db = firebase.database(fbApp);
    _appDb = db;

    // Real-time listener on adminData — fires immediately with current value,
    // then on every admin save, pushing updates to all connected clients.
    const adminFirstLoad = _fbListenerSet ? Promise.resolve() : new Promise(resolve => {
      _fbListenerSet = true;
      db.ref('adminData').on('value', snap => {
        const val = snap.val();
        if (val) {
          _liveAdminData = val;
          try { localStorage.setItem(KEYS.adminData, JSON.stringify(val)); } catch(e) {}
        }
        resolve(); // resolve exactly once on first callback
      }, () => resolve()); // also resolve on permission error so init doesn't hang
    });

    // One-time reads for structure/features/settings (admin changes here need a reload anyway)
    const [, structSnap, featSnap, settSnap] = await Promise.race([
      Promise.all([
        adminFirstLoad,
        db.ref('structure').once('value'),
        db.ref('features').once('value'),
        db.ref('settings').once('value'),
      ]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
    ]);
    const structVal = structSnap.val(); if (structVal) try { localStorage.setItem(KEYS.structure,  JSON.stringify(structVal)); } catch(e) {}
    const featVal   = featSnap.val();   if (featVal)   try { localStorage.setItem(KEYS.features,   JSON.stringify(featVal));   } catch(e) {}
    const settings  = settSnap.val() || {};
    if (settings.gaId)        localStorage.setItem(KEYS.gaId,        settings.gaId);
    if (settings.firebaseUrl) localStorage.setItem(KEYS.firebaseUrl, settings.firebaseUrl);
  } catch(e) {
    console.warn('Firebase sync failed, using cached content:', e.message);
  }
}

// ── INIT: show level selector, hide main app ──
async function initializeApp() {
  await _fbSync();         // Fetch shared content from Firebase
  applyCustomStructure(); // Apply with fresh data (levelData starts from hardcoded defaults)
  renderLevelSelector();  // Re-render with Firebase-sourced structure
  _initAnalytics();       // Initialize GA if gaId just arrived from Firebase

  // Track session start in Firebase
  if (_appDb) {
    _appDb.ref('analytics/sessions').push({ ts: Date.now() }).catch(() => {});
  }

  state.totalLessons = 5;
  state.currentQuizBank = null;

  // Restore previously selected level
  const savedLevel = localStorage.getItem(KEYS.selectedLevel);
  if (savedLevel && levelData[savedLevel]) {
    selectLevel(savedLevel);
    return;
  }

  const levelSelector = document.getElementById('levelSelector');
  const mainApp = document.getElementById('mainApp');

  if (levelSelector) {
    levelSelector.style.display = 'flex';
    levelSelector.style.visibility = 'visible';
    levelSelector.style.opacity = '1';
  }
  if (mainApp) {
    mainApp.style.display = 'none';
    mainApp.style.visibility = 'hidden';
  }
}

// Initialize immediately on page load or when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  setTimeout(initializeApp, 0);
}

// ── LEADERBOARD ──
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderLeaderboard(c) {
  const fbUrl = localStorage.getItem(KEYS.firebaseUrl);
  const lbLabel = getFeatureFlags().labels?.leaderboard || SECTIONS.leaderboard.defaultLabel;
  c.innerHTML = `
    <div class="lesson-header">
      <div class="lesson-badge">Global Rankings</div>
      <div class="lesson-title">${lbLabel}</div>
      <div class="lesson-subtitle">Top learners across all levels. Complete a quiz to submit your score.</div>
    </div>
    <div id="lbContent" style="margin-top:16px">
      <div style="text-align:center;padding:40px;color:var(--text-dim)">Loading scores...</div>
    </div>
  `;
  if (!fbUrl) {
    document.getElementById('lbContent').innerHTML = `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:16px">🏆</div>
        <div style="font-size:15px;font-weight:500;margin-bottom:8px">Leaderboard not yet active</div>
        <div style="font-size:13px;color:var(--text-muted)">
          The admin needs to configure Firebase in the Admin Panel to enable global scores.
        </div>
      </div>`;
    return;
  }
  fetch(fbUrl + '/scores.json')
    .then(r => r.json())
    .then(data => {
      const entries = data ? Object.values(data) : [];
      entries.sort((a, b) => b.xp - a.xp);
      document.getElementById('lbContent').innerHTML = buildLbTable(entries.slice(0, 50));
    })
    .catch(() => {
      document.getElementById('lbContent').innerHTML = `
        <div class="card" style="text-align:center;padding:24px;color:var(--text-muted)">
          Could not load scores. Check your connection and try again.
        </div>`;
    });
}

function buildLbTable(entries) {
  if (!entries.length) return `
    <div class="card" style="text-align:center;padding:40px">
      <div style="font-size:40px;margin-bottom:12px">🏆</div>
      <div style="color:var(--text-dim);font-size:13px">No scores yet — be the first to submit!</div>
    </div>`;
  const medals = ['🥇','🥈','🥉'];
  const rows = entries.map((s, i) => {
    const rank = i < 3
      ? `<span class="lb-rank-${i+1}">${medals[i]}</span>`
      : `<span style="color:var(--text-dim);font-size:13px">#${i+1}</span>`;
    return `<tr class="lb-row">
      <td style="text-align:center;width:48px">${rank}</td>
      <td class="lb-name">${escHtml(s.name)}</td>
      <td><span class="lb-level">${escHtml(s.level||'')}</span></td>
      <td class="lb-xp">${s.xp||0} XP</td>
      <td style="color:var(--text-muted)">${s.quizScore||0}/${s.quizTotal||0} (${s.quizPct||0}%)</td>
      <td style="color:var(--text-dim);font-size:12px">${escHtml(s.date||'')}</td>
    </tr>`;
  }).join('');
  return `
    <div class="card" style="padding:0;overflow:hidden">
      <table class="lb-table">
        <thead><tr>
          <th style="text-align:center">Rank</th>
          <th>Name</th><th>Level</th><th>XP</th><th>Quiz</th><th>Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function showSubmitModal(result) {
  if (!localStorage.getItem(KEYS.firebaseUrl)) {
    alert('Leaderboard is not configured yet. Ask the admin to set up Firebase.');
    return;
  }
  document.getElementById('submitScoreSummary').innerHTML = `
    <div class="score-stat">
      <div class="score-stat-val">${result.xp}</div>
      <div class="score-stat-lbl">Total XP</div>
    </div>
    <div class="score-stat">
      <div class="score-stat-val">${result.lessons}/${result.totalLessons}</div>
      <div class="score-stat-lbl">Lessons</div>
    </div>
    <div class="score-stat">
      <div class="score-stat-val">${result.quizScore}/${result.quizTotal}</div>
      <div class="score-stat-lbl">Quiz</div>
    </div>
    <div class="score-stat">
      <div class="score-stat-val" style="font-size:16px">${escHtml(result.level)}</div>
      <div class="score-stat-lbl">Level</div>
    </div>`;
  window._pendingScore = result;
  const btn = document.getElementById('submitScoreBtn');
  btn.disabled = false;
  btn.textContent = 'Submit →';
  document.getElementById('submitNameInput').value = '';
  document.getElementById('submitModal').classList.add('open');
  setTimeout(() => document.getElementById('submitNameInput').focus(), 50);
}

function closeSubmitModal() {
  document.getElementById('submitModal').classList.remove('open');
}

function submitScore() {
  const name = (document.getElementById('submitNameInput').value || '').trim();
  if (!name) { document.getElementById('submitNameInput').focus(); return; }
  const fbUrl = localStorage.getItem(KEYS.firebaseUrl);
  if (!fbUrl) return;
  const payload = {
    name,
    xp: window._pendingScore.xp,
    level: window._pendingScore.level,
    levelKey: window._pendingScore.levelKey,
    lessons: window._pendingScore.lessons,
    quizScore: window._pendingScore.quizScore,
    quizTotal: window._pendingScore.quizTotal,
    quizPct: window._pendingScore.quizPct,
    date: new Date().toISOString().slice(0, 10)
  };
  const btn = document.getElementById('submitScoreBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  fetch(fbUrl + '/scores.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => { if (!r.ok) throw new Error(); return r.json(); })
  .then(() => {
    closeSubmitModal();
    window._pendingScore = null;
    showView('leaderboard');
  })
  .catch(() => {
    btn.disabled = false;
    btn.textContent = 'Submit →';
    alert('Failed to submit. Check your connection and try again.');
  });
}

// ── BRANDING INIT — populates static HTML elements from brand.js ──
function initBranding() {
  document.title = `${BRAND.appName} — ${BRAND.languageName} ${BRAND.appTagline}`;
  const set = (id, html, prop = 'innerHTML') => { const el = document.getElementById(id); if (el) el[prop] = html; };
  set('brandLogoMark',  BRAND.logoMark);
  set('brandLogoTitle', BRAND.appName.replace(' ', '<br>'));
  set('brandLogoSub',   BRAND.appTagline);
  set('brandLsEyebrow', `${BRAND.appName} — ${BRAND.languageName} Language`);
  set('brandLsSub',     `Select the level that best matches your current ${BRAND.languageName} knowledge. You can change levels anytime.`);
}
initBranding();
