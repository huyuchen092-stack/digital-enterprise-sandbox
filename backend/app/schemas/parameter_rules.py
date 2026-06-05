KNOWN_CRITICAL_PARAMETER_KEYS = {
    "finance.initial_cash",
    "finance.initial_equity",
    "loan.multiplier",
    "loan.short_rate",
    "loan.long_rate",
    "production.group_count",
}

KNOWN_CRITICAL_PARAMETER_PREFIXES = (
    "loan.",
    "finance.",
    "market.capacity.",
    "market.size.",
    "market.price.",
    "market.groups.",
    "product.",
    "production.",
    "line.",
    "raw_material.",
    "worker.",
    "advertising.",
    "iso.",
    "rd.",
    "tax.",
    "management.",
)


def coerce_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    return bool(value)


def is_critical_parameter_key(key: object, supplied_critical: object = True) -> bool:
    if key is None:
        return coerce_bool(supplied_critical)
    normalized_key = str(key).strip().lower()
    if normalized_key in KNOWN_CRITICAL_PARAMETER_KEYS:
        return True
    if normalized_key.startswith(KNOWN_CRITICAL_PARAMETER_PREFIXES):
        return True
    return coerce_bool(supplied_critical)
