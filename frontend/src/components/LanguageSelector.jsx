// src/components/LanguageSelector.jsx
// Extracted from Auth.jsx's inline language <select>. Pure presentational
// component — same markup/classes as the original so Auth.css needs no changes.

import React from "react";
import { languages } from "../locales/defaultTexts";

const LanguageSelector = ({
  selectedLanguage,
  onChange,
  isTranslating,
  label = "Language",
}) => {
  return (
    <div className="language-selector">
      <label htmlFor="language-select">{label}:</label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={onChange}
        disabled={isTranslating}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      {isTranslating && <span className="translating">Translating...</span>}
    </div>
  );
};

export default LanguageSelector;