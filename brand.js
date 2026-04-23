// ── BRAND CONFIG — change this file to rebrand the app ──
const BRAND = {
  appName:      'Paunam Khenna',
  appTagline:   'Language Learning',
  languageName: 'Zolai',
  logoMark:     'Zolai · Kampau',

  heroTitle:    'Learn <em>Zolai</em><br>with Purpose.',
  heroSubtitle: 'A structured learning path drawn from the classic Zolai grammar text. Reconnect with the language of the Zo people through lessons, exercises, and quizzes.',
  heroBadge:    'Paunam Khenna Leh Kampau Luanzia',
  aboutText:    '<strong>Paunam Khenna Leh Kampau Luanzia</strong> is a comprehensive Zolai language and composition guide authored by Sia Cin Sian Pau. It covers the full grammar of the Zo language — from alphabet and phonetics through to tense, voice, punctuation, and Zomi cultural vocabulary. The lessons in this app are drawn directly from this foundational text.',

  storagePrefix: 'zolai_',
};

// Storage keys — always use these, never raw strings
const KEYS = {
  features:      BRAND.storagePrefix + 'features',
  adminData:     BRAND.storagePrefix + 'admin_data',
  structure:     BRAND.storagePrefix + 'structure',
  adminPw:       BRAND.storagePrefix + 'admin_pw',
  lockout:       BRAND.storagePrefix + 'admin_lockout',
  selectedLevel: BRAND.storagePrefix + 'selected_level',
  visitLog:      BRAND.storagePrefix + 'visit_log',
  firebaseUrl:   BRAND.storagePrefix + 'firebase_url',
  gaId:          BRAND.storagePrefix + 'ga_id',
};
