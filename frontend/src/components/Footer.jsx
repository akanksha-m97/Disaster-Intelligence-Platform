// src/components/Footer.jsx
// Placeholder — your folder tree lists Footer.jsx with no matching .css
// file and no content was shared yet. Replace this with your real footer;
// styles are inlined here for now since there's no Footer.css in the tree.

import React from "react";

const footerStyle = {
  textAlign: "center",
  padding: "20px",
  fontSize: "12.5px",
  color: "#9ca3af",
  borderTop: "1px solid #e5e7eb",
  background: "#ffffff",
};

const Footer = () => {
  return (
    <footer style={footerStyle}>
      <p>© {new Date().getFullYear()} JalRakshak AI. All rights reserved.</p>
    </footer>
  );
};

export default Footer;