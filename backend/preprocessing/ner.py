import spacy
import subprocess
import sys
import re

# ── Load spaCy Model ──────────────────────────────────────────────────────────
def load_spacy_model():
    """Load spaCy model, auto-download if not present."""
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        print("Downloading spaCy model en_core_web_sm...")
        subprocess.run(
            [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
            check=True
        )
        return spacy.load("en_core_web_sm")


nlp = load_spacy_model()

# ── Common Indian Cities ──────────────────────────────────────────────────────
INDIAN_CITIES = [
    "Delhi", "New Delhi", "Noida", "Greater Noida",
    "Gurgaon", "Gurugram", "Faridabad", "Ghaziabad",
    "Chandigarh", "Mumbai", "Pune", "Bengaluru",
    "Bangalore", "Hyderabad", "Chennai", "Kolkata",
    "Ahmedabad", "Jaipur", "Lucknow", "Patna",
    "Bhopal", "Indore", "Nagpur", "Surat",
    "Kanpur", "Varanasi"
]


# ── Location Extraction ───────────────────────────────────────────────────────
def extract_locations(text: str) -> list:
    """
    Extract locations using:
    1. spaCy NER
    2. Regex
    3. Indian city lookup
    """

    if not isinstance(text, str) or not text.strip():
        return []

    doc = nlp(text)

    # ── spaCy NER ────────────────────────────────────────────────────────────
    locations = [
        ent.text.strip()
        for ent in doc.ents
        if ent.label_ in ("GPE", "LOC", "FAC")
    ]

    # ── Regex Patterns ───────────────────────────────────────────────────────
    patterns = [
        r"(Sector\s*-?\s*\d+[A-Za-z]?)",
        r"(Block\s+[A-Za-z])",
        r"(Phase\s+\d+)",
        r"(NH[- ]?\d+)",
        r"(Highway\s+\d+)",
        r"(National Highway\s+\d+)",
        r"(Village\s+[A-Za-z]+)",
        r"(District\s+[A-Za-z]+)",
        r"([A-Za-z]+\s+Hospital)",
        r"([A-Za-z]+\s+School)",
        r"([A-Za-z]+\s+University)",
        r"([A-Za-z]+\s+Metro Station)",
        r"([A-Za-z]+\s+Railway Station)",
        r"([A-Za-z]+\s+Bus Stand)",
        r"([A-Za-z]+\s+Airport)"
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        locations.extend(matches)

    # ── Indian City Lookup ───────────────────────────────────────────────────
    text_lower = text.lower()

    for city in INDIAN_CITIES:
        if city.lower() in text_lower:
            locations.append(city)

    # ── Remove Duplicates ────────────────────────────────────────────────────
    seen = set()
    unique = []

    for loc in locations:
        cleaned = loc.strip()

        if cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            unique.append(cleaned)

    return unique


# ── Primary Location ──────────────────────────────────────────────────────────
def get_primary_location(text: str, gps_fallback: dict = None) -> dict:
    """
    Returns best available location from text or GPS.
    """

    locations = extract_locations(text)

    if locations:
        return {
            "source": "text",
            "locations": locations
        }

    if gps_fallback and "lat" in gps_fallback and "lon" in gps_fallback:
        return {
            "source": "gps",
            "lat": gps_fallback["lat"],
            "lon": gps_fallback["lon"],
            "locations": []
        }

    return {
        "source": "none",
        "locations": []
    }


# ── Test ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":

    samples = [
        "Heavy rainfall near Sector 17, Chandigarh. Water entered houses.",
        "Earthquake felt in Delhi and surrounding areas of Gurgaon.",
        "Wildfire near Highway 101, California spreading rapidly.",
        "Chemical leak near Block A, Noida.",
        "Flood near NH-44 close to Jaipur.",
        "Accident near AIIMS Hospital, Delhi.",
        "Chemical leak at factory. Strong fumes reported."
    ]

    gps = {
        "lat": 28.6139,
        "lon": 77.2090
    }

    print("──── NER Location Extraction Test ────")

    for text in samples:

        result = get_primary_location(
            text,
            gps_fallback=gps
        )

        print("\nText :", text)
        print("Source :", result["source"])
        print("Locations :", result["locations"])

        if result["source"] == "gps":
            print("GPS :", result["lat"], result["lon"])

    print("──────────────────────────────────────")