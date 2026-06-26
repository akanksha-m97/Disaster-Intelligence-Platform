// src/utils/translate.js
// Extracted from the original Auth.jsx. Same MyMemory free-tier API call,
// just isolated so it can be reused by other pages later and unit-tested
// on its own.

/**
 * Translate a single string via the MyMemory API.
 * Returns the original text untouched on failure or if target is English.
 */
export const translateText = async (text, targetLang) => {
  if (targetLang === "en") return text;

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=en|${targetLang}`
    );
    const data = await response.json();
    return data?.responseData?.translatedText || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

/**
 * Translate every value in a flat string->string object.
 * NOTE: this fires one request per key sequentially (same behavior as the
 * original code). It works, but is slow for ~25 keys and will hit
 * MyMemory's free-tier rate limit if switched repeatedly. Worth batching
 * or caching server-side later — left as-is for now since the task is a
 * reorg, not a rewrite of this logic.
 */
export const translateAllTexts = async (defaultTexts, targetLang) => {
  if (targetLang === "en") return { ...defaultTexts };

  const translated = {};
  for (const [key, text] of Object.entries(defaultTexts)) {
    translated[key] = await translateText(text, targetLang);
  }
  return translated;
};