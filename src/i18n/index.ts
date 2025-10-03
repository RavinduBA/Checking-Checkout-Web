import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
// Import translation files
import en from "./locales/en/common.json";
import si from "./locales/si/common.json";

// Define supported languages
export const supportedLanguages = [
	{ code: "en", name: "English", nativeName: "English" },
	{ code: "si", name: "Sinhala", nativeName: "සිංහල" },
];

const resources = {
	en: {
		common: en,
	},
	si: {
		common: si,
	},
};

i18n
	// Detect user language
	.use(LanguageDetector)
	// Pass the i18n instance to react-i18next
	.use(initReactI18next)
	// Initialize i18next
	.init({
		resources,
		fallbackLng: "en",
		debug: process.env.NODE_ENV === "development",

		// Language detection options
		detection: {
			order: ["localStorage", "navigator", "htmlTag"],
			lookupLocalStorage: "i18nextLng",
			caches: ["localStorage"],
		},

		interpolation: {
			escapeValue: false, // React already escapes values
		},

		// Default namespace
		defaultNS: "common",
		ns: ["common"],

		// Key separator (set to false to use nested keys with dots)
		keySeparator: ".",

		// Nesting separator for accessing nested objects
		nsSeparator: ":",

		// Return empty string for missing keys in development
		returnEmptyString: process.env.NODE_ENV === "development",

		// Load languages
		load: "languageOnly", // en-US -> en

		// Preload languages
		preload: ["en"],

		// Save missing keys
		saveMissing: process.env.NODE_ENV === "development",

		// Custom missing key handler for development
		missingKeyHandler: (lng, ns, key) => {
			if (process.env.NODE_ENV === "development") {
				console.warn(`Missing translation key: ${key} for language: ${lng}`);
			}
		},
	});

export default i18n;
