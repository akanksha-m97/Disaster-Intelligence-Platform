from datetime import datetime
from typing import Any


def format_timestamp(dt: datetime) -> str:
    """Convert datetime to readable string."""
    return dt.strftime("%d %b %Y, %H:%M UTC")


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp a value between min and max."""
    return max(min_val, min(max_val, value))


def safe_get(d: dict, *keys, default: Any = None) -> Any:
    """Safely get nested dict value."""
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, default)
    return d


def percentage(part: int, total: int) -> float:
    """Calculate percentage safely."""
    if total == 0:
        return 0.0
    return round((part / total) * 100, 1)