from typing import Optional


# ── Recommendation Database ───────────────────────────────────────────────────
# Structured by disaster_type → severity → recommendations
RECOMMENDATIONS = {
    "Flood": {
        "High": [
            "EVACUATE IMMEDIATELY to higher ground.",
            "Do not walk or drive through floodwaters — 6 inches can knock you down.",
            "Disconnect all electrical appliances and switch off main power.",
            "Call National Emergency: 112 or NDRF: 011-24363260.",
            "Carry emergency kit: water, food, medicine, documents.",
            "Avoid bridges over fast-moving water.",
            "Follow official evacuation routes only.",
        ],
        "Medium": [
            "Move valuables and furniture to upper floors.",
            "Avoid low-lying areas and river banks.",
            "Monitor weather updates continuously.",
            "Prepare emergency kit in case evacuation is needed.",
            "Disconnect non-essential electrical appliances.",
            "Keep important documents in a waterproof bag.",
        ],
        "Low": [
            "Stay alert and monitor local weather updates.",
            "Avoid unnecessary travel near water bodies.",
            "Keep drains and gutters clear.",
            "Have emergency contact numbers ready.",
        ],
    },

    "Earthquake": {
        "High": [
            "DROP, COVER, and HOLD ON under a sturdy table.",
            "Stay away from windows, heavy furniture, and outer walls.",
            "Do NOT use elevators.",
            "After shaking stops — check for gas leaks, do not use open flames.",
            "Move to open ground away from buildings immediately after.",
            "Call Emergency: 112. Expect aftershocks.",
            "Do not re-enter damaged buildings.",
        ],
        "Medium": [
            "Identify safe spots in each room (under tables, against inner walls).",
            "Secure heavy furniture and objects that could fall.",
            "Keep a flashlight and emergency kit accessible.",
            "Know your building's evacuation plan.",
            "Check for structural damage before staying indoors.",
        ],
        "Low": [
            "Stay calm — minor tremors are common in seismic zones.",
            "Inspect your surroundings for any cracks or damage.",
            "Review your earthquake preparedness plan.",
            "Keep emergency numbers saved.",
        ],
    },

    "Wildfire": {
        "High": [
            "EVACUATE IMMEDIATELY — do not wait for official order.",
            "Close all windows, doors, and vents before leaving.",
            "Wear N95 mask to avoid smoke inhalation.",
            "Follow designated evacuation routes — do not use shortcuts.",
            "Turn on lights so your home is visible in smoke.",
            "Call Fire Emergency: 101 or National Emergency: 112.",
            "Do not return until authorities declare area safe.",
        ],
        "Medium": [
            "Prepare for possible evacuation — pack essentials now.",
            "Clear dry leaves and debris around your property.",
            "Close all windows and doors to reduce smoke entry.",
            "Monitor fire department updates continuously.",
            "Keep vehicle fueled and facing outward for quick exit.",
        ],
        "Low": [
            "Avoid burning waste or using open flames outdoors.",
            "Stay informed via local fire authority updates.",
            "Keep emergency kit ready.",
            "Know your nearest evacuation route.",
        ],
    },

    "Cyclone": {
        "High": [
            "MOVE TO CYCLONE SHELTER immediately.",
            "Stay away from coastal areas and river banks.",
            "Board up windows and secure loose outdoor objects.",
            "Stock up on 72 hours of food, water, and medicines.",
            "Call IMD Cyclone Warning: 1800-180-1717.",
            "Do not venture out during landfall — stay indoors.",
            "Avoid using electrical appliances during storm.",
        ],
        "Medium": [
            "Secure all outdoor furniture and loose items.",
            "Keep emergency supplies stocked.",
            "Monitor IMD weather bulletins every hour.",
            "Identify nearest cyclone shelter in your area.",
            "Charge all devices and keep power bank ready.",
        ],
        "Low": [
            "Stay updated on IMD cyclone tracking.",
            "Prepare basic emergency kit.",
            "Avoid coastal areas until storm passes.",
            "Keep emergency contact numbers ready.",
        ],
    },

    "Landslide": {
        "High": [
            "EVACUATE the area immediately — do not delay.",
            "Move away from the slide path and surrounding hillsides.",
            "Avoid river valleys — flooding may follow landslide.",
            "Call Emergency: 112 or NDRF: 011-24363260.",
            "Do not return to the area until declared safe by authorities.",
            "Watch for subsequent slides after the initial one.",
        ],
        "Medium": [
            "Avoid steep slopes and hillside areas.",
            "Watch for warning signs: cracks in ground, leaning trees, unusual sounds.",
            "Prepare to evacuate quickly if situation worsens.",
            "Keep vehicles ready for immediate departure.",
            "Monitor local disaster management alerts.",
        ],
        "Low": [
            "Stay away from slopes after heavy rainfall.",
            "Report any ground cracks or slope instability to authorities.",
            "Keep emergency contacts ready.",
        ],
    },

    "Tsunami": {
        "High": [
            "MOVE INLAND AND TO HIGHER GROUND IMMEDIATELY.",
            "Do not wait for official warning if you felt a strong earthquake near coast.",
            "A receding ocean is a warning — move away immediately.",
            "Call Emergency: 112. Stay away from the coast.",
            "Keep moving until you reach high ground — multiple waves come.",
            "Do not return to coast until all-clear is given by authorities.",
        ],
        "Medium": [
            "Move away from coastal areas immediately.",
            "Monitor Indian Tsunami Early Warning Centre alerts.",
            "Identify highest ground or tall building in your area.",
            "Prepare emergency kit for rapid evacuation.",
        ],
        "Low": [
            "Stay informed via INCOIS Tsunami Warning updates.",
            "Know your nearest evacuation route to high ground.",
            "Avoid beaches and coastal areas.",
        ],
    },

    "Chemical Leak": {
        "High": [
            "EVACUATE upwind of the leak immediately.",
            "Cover nose and mouth with wet cloth — move away fast.",
            "Do not touch any spilled chemicals or contaminated surfaces.",
            "Call Fire Emergency: 101 and Poison Control: 1800-116-117.",
            "Remove and bag contaminated clothing outside before entering shelter.",
            "Wash exposed skin with large amounts of water for 15 minutes.",
            "Seek immediate medical attention even without symptoms.",
        ],
        "Medium": [
            "Stay indoors with windows and doors sealed.",
            "Turn off air conditioning and ventilation systems.",
            "Avoid the area downwind of the incident.",
            "Follow instructions from emergency responders only.",
            "Monitor official updates for evacuation orders.",
        ],
        "Low": [
            "Avoid the area and report to local authorities.",
            "Stay upwind of the incident location.",
            "Keep windows closed if indoors near the area.",
        ],
    },

    "Building Collapse": {
        "High": [
            "Call Emergency: 112 and NDRF: 011-24363260 IMMEDIATELY.",
            "Do NOT enter the collapsed structure under any circumstances.",
            "Listen for sounds of trapped survivors and guide rescuers.",
            "Keep bystanders away — secondary collapse is common.",
            "Provide first aid ONLY if you are trained.",
            "Mark areas where you hear signs of life.",
            "Keep the area clear for rescue teams and heavy machinery.",
        ],
        "Medium": [
            "Evacuate adjacent buildings as a precaution.",
            "Report structural damage to local municipal authority.",
            "Do not use elevators in nearby buildings.",
            "Keep emergency services informed of the situation.",
        ],
        "Low": [
            "Report visible structural damage to authorities immediately.",
            "Do not enter structurally compromised areas.",
            "Keep emergency contact numbers ready.",
        ],
    },
}

DEFAULT_RECOMMENDATIONS = [
    "Stay calm and assess the situation carefully.",
    "Call National Emergency Services: 112.",
    "Follow instructions from local authorities.",
    "Keep family members informed of your location.",
    "Move to a safe location if you feel threatened.",
]


# ── Main Function ─────────────────────────────────────────────────────────────
def get_recommendations(
    disaster_type: str,
    severity: str,
    risk_score: float,
    weather: Optional[dict] = None,
) -> list:
    """
    Returns actionable recommendations based on:
    - Disaster type
    - Severity (High/Medium/Low)
    - Risk score (adds urgency prefix if > 85)
    - Weather context (adds weather-specific tip if relevant)

    Args:
        disaster_type: Predicted disaster type
        severity:      Predicted severity
        risk_score:    Predicted risk score (0-100)
        weather:       Optional weather dict for context

    Returns:
        List of recommendation strings
    """
    # Get base recommendations
    type_recs     = RECOMMENDATIONS.get(disaster_type, {})
    base_recs     = type_recs.get(severity, DEFAULT_RECOMMENDATIONS)
    recommendations = list(base_recs)

    # Add urgency prefix for extreme risk
    if risk_score >= 85:
        recommendations.insert(0, "⚠️ EXTREME RISK — Immediate action required.")

    # Add weather-specific tip
    if weather:
        weather_tip = _get_weather_tip(disaster_type, weather)
        if weather_tip:
            recommendations.append(weather_tip)

    return recommendations


def _get_weather_tip(disaster_type: str, weather: dict) -> Optional[str]:
    """Add a dynamic tip based on live weather conditions."""
    rainfall    = weather.get("rainfall_mm", 0)
    wind_speed  = weather.get("wind_speed_kmph", 0)
    aqi         = weather.get("aqi", 0)
    humidity    = weather.get("humidity_percent", 0)

    if disaster_type == "Flood" and rainfall > 50:
        return f"Current rainfall is {rainfall}mm — flooding risk is actively increasing."

    if disaster_type == "Cyclone" and wind_speed > 100:
        return f"Wind speed is {wind_speed} km/h — do not venture outdoors under any circumstances."

    if disaster_type == "Wildfire" and humidity < 20:
        return f"Humidity is critically low at {humidity}% — fire can spread extremely fast."

    if aqi > 200:
        return f"Air Quality Index is {aqi} — wear N95 mask even indoors if possible."

    return None