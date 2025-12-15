import path from "path";

export const USER_AGENT = "CabalToolkitHarvester/1.0 (hello@yao.page)";

export const HARVESTED_DATA_DIR = path.join(__dirname, "/harvested");

export const CONTENT_INCLUDE_TAGS = "p, h2, h3, ul, table, figure";

export const CONTENT_EXCLUDE_TAGS =
  "script, style, .fandom-community-header__background, .toc, aside, .mw-editsection, .page-header__actions";

// --- Links ---
export const BASE_URL = "https://cnc.fandom.com";

// Units and structures
export const ARSENALS_SEED_URLS = [
  `${BASE_URL}/wiki/Category:Tiberian_Sun_GDI_arsenal`,
  `${BASE_URL}/wiki/Category:Firestorm_GDI_arsenal`,
  `${BASE_URL}/wiki/Category:Tiberian_Sun_Nod_arsenal`,
  `${BASE_URL}/wiki/Category:Firestorm_Nod_arsenal`,
  `${BASE_URL}/wiki/Category:Tiberian_Sun_Forgotten_arsenal`,
  `${BASE_URL}/wiki/Category:Firestorm_Forgotten_arsenal`,
  `${BASE_URL}/wiki/Category:Firestorm_CABAL_arsenal`,
];

// Factions
export const FACTIONS_SEED_URLS = [
  `${BASE_URL}/wiki/Global_Defense_Initiative`,
  `${BASE_URL}/wiki/Brotherhood_of_Nod`,
  `${BASE_URL}/wiki/Forgotten`,
  `${BASE_URL}/wiki/Computer_Assisted_Biologically_Augmented_Lifeform`,
];

// Characters
export const CHARACTERS_SEED_URLS = [
  `${BASE_URL}/wiki/Category:Tiberian_Sun_characters`,
  `${BASE_URL}/wiki/Category:Firestorm_characters`,
];

// Missions
export const MISSIONS_SEED_URLS = [
  `${BASE_URL}/wiki/Category:Tiberian_Sun_GDI_missions`,
  `${BASE_URL}/wiki/Category:Firestorm_GDI_missions`,
  `${BASE_URL}/wiki/Category:Tiberian_Sun_Nod_missions`,
  `${BASE_URL}/wiki/Category:Firestorm_Nod_missions`,
];

// Combined Seed URLs
export const SEED_URLS = [
  ...ARSENALS_SEED_URLS,
  ...FACTIONS_SEED_URLS,
  ...CHARACTERS_SEED_URLS,
  ...MISSIONS_SEED_URLS,
];
