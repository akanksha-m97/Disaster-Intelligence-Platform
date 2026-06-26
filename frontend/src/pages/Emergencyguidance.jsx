import React from "react";
import {
  FaShieldAlt,
  FaSearch,
  FaExclamationTriangle,
  FaMountain,
  FaPhoneAlt,
  FaUserShield,
  FaShieldVirus,
  FaHeartbeat,
  FaFireAlt,
  FaTintSlash,
  FaPlusSquare,
  FaUser,
  FaTint,
  FaArrowUp,
  FaWater,
  FaBroadcastTower,
  FaUserFriends,
  FaFirstAid,
  FaCheckCircle,
  FaClipboardCheck,
  FaArrowRight,
  FaHeadset,
} from "react-icons/fa";
import "./EmergencyGuidance.css";

/* ---------- Reusable: Hero Section ---------- */
const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-left">
        <span className="hero-icon">
          <FaShieldAlt />
        </span>
        <div>
          <h2>Emergency Guidance</h2>
          <p>
            Important information to help you stay safe before, during and
            after a disaster.
          </p>
        </div>
      </div>

      <div className="hero-search">
        <input
          type="text"
          placeholder="Search guidance (e.g. flood, earthquake, safety tips...)"
        />
        <FaSearch className="search-icon" />
      </div>
    </section>
  );
};

/* ---------- Reusable: Safety Card ---------- */
const SafetyCard = ({ icon, title, description, color, linkColor }) => {
  return (
    <article className="safety-card">
      <div className="safety-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <a href="#" className="view-guide" style={{ color: linkColor }}>
        View Guide <FaArrowRight />
      </a>
    </article>
  );
};

/* ---------- Reusable: Safety Cards Section ---------- */
const SafetyCardsSection = () => {
  const cards = [
    {
      icon: <FaWater color="#2563eb" size={26} />,
      title: "Flood Safety",
      description: "Guidelines to stay safe during floods and heavy rainfall.",
      color: "#dbeafe",
      linkColor: "#2563eb",
    },
    {
      icon: <FaMountain color="#7c3aed" size={26} />,
      title: "Earthquake Safety",
      description:
        "What to do before, during and after an earthquake strikes.",
      color: "#ede9fe",
      linkColor: "#7c3aed",
    },
    {
      icon: <FaBroadcastTower color="#ea580c" size={26} />,
      title: "Cyclone Safety",
      description: "Stay safe during cyclones, strong winds and storm surge.",
      color: "#ffedd5",
      linkColor: "#ea580c",
    },
    {
      icon: <FaFireAlt color="#16a34a" size={26} />,
      title: "Landslide Safety",
      description:
        "How to protect yourself before and during a landslide.",
      color: "#dcfce7",
      linkColor: "#16a34a",
    },
  ];

  return (
    <section className="safety-grid">
      {cards.map((card) => (
        <SafetyCard key={card.title} {...card} />
      ))}
    </section>
  );
};

/* ---------- Reusable: Emergency Contacts ---------- */
const EmergencyContacts = () => {
  const contacts = [
    {
      icon: <FaUserFriends color="#2563eb" size={20} />,
      bg: "#dbeafe",
      name: "NDRF",
      number: "1078",
      desc: "National Disaster Response Force",
    },
    {
      icon: <FaUserShield color="#7c3aed" size={20} />,
      bg: "#ede9fe",
      name: "Police",
      number: "112",
      desc: "Police Helpline",
    },
    {
      icon: <FaFireAlt color="#dc2626" size={20} />,
      bg: "#fee2e2",
      name: "Fire Brigade",
      number: "101",
      desc: "Fire Helpline",
    },
    {
      icon: <FaShieldVirus color="#16a34a" size={20} />,
      bg: "#dcfce7",
      name: "Ambulance",
      number: "108",
      desc: "Medical Emergency",
    },
    {
      icon: <FaHeadset color="#ea580c" size={20} />,
      bg: "#ffedd5",
      name: "Disaster Helpline",
      number: "1070",
      desc: "State Disaster Helpline",
    },
  ];

  return (
    <section className="contacts-card">
      <h3 className="section-title">
        <FaPhoneAlt className="title-icon" /> Emergency Contacts
      </h3>
      <div className="contacts-grid">
        {contacts.map((c, idx) => (
          <React.Fragment key={c.name}>
            <div className="contact-item">
              <span className="contact-icon" style={{ backgroundColor: c.bg }}>
                {c.icon}
              </span>
              <div>
                <h4>{c.name}</h4>
                <p className="contact-number">{c.number}</p>
                <p className="contact-desc">{c.desc}</p>
              </div>
            </div>
            {idx !== contacts.length - 1 && (
              <div className="contact-divider" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

/* ---------- Reusable: Checklist Row ---------- */
const ChecklistRow = ({ icon, title, description }) => (
  <li className="checklist-row">
    <span className="checklist-icon">{icon}</span>
    <div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  </li>
);

/* ---------- Reusable: During an Emergency Card ---------- */
const DuringEmergencyCard = () => {
  const items = [
    {
      icon: <FaUser size={14} />,
      title: "Stay Calm",
      description: "Don't panic. Assess the situation and stay calm.",
    },
    {
      icon: <FaArrowUp size={14} />,
      title: "Move to Safe Place",
      description: "Move to higher ground or safer location immediately.",
    },
    {
      icon: <FaWater size={14} />,
      title: "Avoid Flood Waters",
      description:
        "Do not walk or drive through flood waters. It can be dangerous.",
    },
    {
      icon: <FaBroadcastTower size={14} />,
      title: "Stay Informed",
      description: "Listen to authorities and follow official instructions.",
    },
    {
      icon: <FaUserFriends size={14} />,
      title: "Help Others",
      description: "Check on your family, neighbors and help those in need.",
    },
    {
      icon: <FaFirstAid size={14} />,
      title: "Emergency Kit",
      description:
        "Keep an emergency kit with water, food, medicines and important documents.",
    },
  ];

  return (
    <section className="info-card">
      <h3 className="section-title">
        <FaShieldAlt className="title-icon green" /> During an Emergency
      </h3>
      <ul className="checklist">
        {items.map((item) => (
          <ChecklistRow key={item.title} {...item} />
        ))}
      </ul>
    </section>
  );
};

/* ---------- Reusable: First Aid Basics Card ---------- */
const FirstAidCard = () => {
  const items = [
    {
      icon: <FaHeartbeat size={14} />,
      title: "CPR",
      description:
        "If someone is not breathing, call emergency services and start CPR if you are trained.",
    },
    {
      icon: <FaTint size={14} />,
      title: "Stop Bleeding",
      description:
        "Apply pressure on the wound with a clean cloth and elevate the injured area.",
    },
    {
      icon: <FaFireAlt size={14} />,
      title: "Treat Burns",
      description:
        "Cool the burn with running water for 10 minutes. Do not use ice.",
    },
    {
      icon: <FaTintSlash size={14} />,
      title: "Stay Hydrated",
      description:
        "Drink clean water regularly, especially during heatwaves.",
    },
    {
      icon: <FaPlusSquare size={14} />,
      title: "Get Medical Help",
      description:
        "Seek medical attention as soon as possible for serious injuries.",
    },
  ];

  return (
    <section className="info-card">
      <h3 className="section-title">
        <FaFirstAid className="title-icon red" /> First Aid Basics
      </h3>
      <ul className="checklist">
        {items.map((item) => (
          <ChecklistRow key={item.title} {...item} />
        ))}
      </ul>
    </section>
  );
};

/* ---------- Reusable: General Tips Card ---------- */
const GeneralTipsCard = () => {
  const tips = [
    "Keep a list of emergency contacts.",
    "Keep your phone charged and carry a power bank.",
    "Follow local authorities and evacuation orders.",
    "Avoid rumors and unverified information.",
    "Store important documents in a waterproof bag.",
    "Keep whistle, torch, batteries and ID proof with you.",
  ];

  return (
    <section className="info-card">
      <h3 className="section-title">
        <FaHeadset className="title-icon blue" /> General Tips
      </h3>
      <ul className="tips-list">
        {tips.map((tip) => (
          <li key={tip} className="tip-row">
            <FaCheckCircle className="tip-check" />
            <p>{tip}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ---------- Reusable: Important Notice Banner ---------- */
const ImportantNotice = () => {
  return (
    <section className="notice-banner">
      <div className="notice-text">
        <FaExclamationTriangle className="notice-icon" />
        <div>
          <h4>Important Note</h4>
          <p>
            This information is for general guidance only. In case of a real
            emergency, follow the instructions of local authorities and
            emergency services immediately.
          </p>
        </div>
      </div>
      <div className="notice-illustration" aria-hidden="true">
        <FaClipboardCheck className="clipboard-icon" />
        <FaFirstAid className="firstaid-icon" />
      </div>
    </section>
  );
};

/* ---------- Page ---------- */
const EmergencyGuidance = () => {
  return (
    <main className="eg-main">
      <Hero />
      <SafetyCardsSection />
      <EmergencyContacts />
      <div className="info-grid">
        <DuringEmergencyCard />
        <FirstAidCard />
        <GeneralTipsCard />
      </div>
      <ImportantNotice />
    </main>
  );
};

export default EmergencyGuidance;