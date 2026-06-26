// src/components/RoleSelect.jsx
// Extracted from Auth.jsx's inline role <select>. Same three options,
// same default. Only used on the signup side now (matches original
// behavior — role was never read during login).

import React from "react";

const RoleSelect = ({ value, onChange, translations }) => {
  return (
    <select value={value} onChange={onChange}>
      <option value="Authority">{translations.authority}</option>
      <option value="Volunteer">{translations.volunteer}</option>
      <option value="Researcher">{translations.researcher}</option>
    </select>
  );
};

export default RoleSelect;