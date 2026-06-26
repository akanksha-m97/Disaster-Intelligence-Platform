from typing import Optional


# ── Risk Thresholds ───────────────────────────────────────────────────────────
RISK_LEVELS = [
    {"min": 85, "max": 100, "label": "Critical",  "color": "#FF0000", "alert": True},
    {"min": 65, "max": 84,  "label": "High",      "color": "#FF6600", "alert": True},
    {"min": 40, "max": 64,  "label": "Moderate",  "color": "#FFA500", "alert": False},
    {"min": 20, "max": 39,  "label": "Low",       "color": "#FFFF00", "alert": False},
    {"min": 0,  "max": 19,  "label": "Minimal",   "color": "#00CC00", "alert": False},
]


# ── Core Functions ────────────────────────────────────────────────────────────
def get_risk_level(risk_score: float) -> dict:
    """
    Convert a numeric risk score to a risk level object.

    Args:
        risk_score: Float between 0 and 100

    Returns:
        Dict with label, color, alert flag, and score
    """
    score = max(0.0, min(100.0, risk_score))  # clamp

    for level in RISK_LEVELS:
        if level["min"] <= score <= level["max"]:
            return {
                "score":  round(score, 1),
                "label":  level["label"],
                "color":  level["color"],
                "alert":  level["alert"],
            }

    return {
        "score": round(score, 1),
        "label": "Unknown",
        "color": "#CCCCCC",
        "alert": False,
    }


def get_map_marker_color(risk_score: float) -> str:
    """
    Returns map marker color matching your workflow doc:
    Red → High Risk, Orange → Medium Risk, Green → Low Risk

    Args:
        risk_score: Float between 0 and 100

    Returns:
        Hex color string
    """
    if risk_score >= 65:
        return "#FF0000"   # Red   → High / Critical
    elif risk_score >= 35:
        return "#FFA500"   # Orange → Moderate
    else:
        return "#00CC00"   # Green  → Low / Minimal


def calculate_risk_summary(incidents: list) -> dict:
    """
    Compute risk statistics across a list of incidents.
    Used by the analytics dashboard.

    Args:
        incidents: List of incident dicts with 'risk_score' field

    Returns:
        Dict with avg, max, min, and distribution counts
    """
    if not incidents:
        return {
            "average": 0.0,
            "maximum": 0.0,
            "minimum": 0.0,
            "distribution": {
                "Critical": 0,
                "High":     0,
                "Moderate": 0,
                "Low":      0,
                "Minimal":  0,
            }
        }

    scores = [i.get("risk_score", 0) for i in incidents]
    dist   = {"Critical": 0, "High": 0, "Moderate": 0, "Low": 0, "Minimal": 0}

    for score in scores:
        level = get_risk_level(score)
        label = level["label"]
        if label in dist:
            dist[label] += 1

    return {
        "average":      round(sum(scores) / len(scores), 1),
        "maximum":      round(max(scores), 1),
        "minimum":      round(min(scores), 1),
        "distribution": dist,
    }


def should_trigger_alert(risk_score: float, severity: str) -> bool:
    """
    Decides whether to trigger an emergency alert notification.

    Triggers if:
    - Risk score >= 65, OR
    - Severity is High regardless of score

    Args:
        risk_score: Float between 0 and 100
        severity:   "High", "Medium", or "Low"

    Returns:
        True if alert should be triggered
    """
    return risk_score >= 65 or severity == "High"


# ── Test ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_scores = [96.2, 78.5, 55.0, 30.1, 10.0]

    print("── Risk Calculator Test ──────────────────────────────")
    for score in test_scores:
        level  = get_risk_level(score)
        marker = get_map_marker_color(score)
        print(f"\nScore: {score}")
        print(f"  Level : {level['label']} | Color: {level['color']} | Alert: {level['alert']}")
        print(f"  Marker: {marker}")

    print("\n── Risk Summary Test ─────────────────────────────────")
    mock_incidents = [{"risk_score": s} for s in test_scores]
    summary = calculate_risk_summary(mock_incidents)
    print(f"  Average : {summary['average']}")
    print(f"  Maximum : {summary['maximum']}")
    print(f"  Minimum : {summary['minimum']}")
    print(f"  Distribution: {summary['distribution']}")
    print("──────────────────────────────────────────────────────")