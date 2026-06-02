"""
Phase 1 Rule-Based Loss Prediction Engine.
Pre-seeded with Rwanda FAO/RAB crop benchmarks.
No training data required — works from Day 1.
Phase 2: upgrade to Scikit-learn Random Forest when 500+ batch records exist.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime


@dataclass
class PredictionInput:
    crop_name: str
    transit_hours: Optional[float] = None
    temperature_celsius: Optional[float] = None
    time_of_day_hour: Optional[int] = None       # 0-23
    distance_km: Optional[float] = None
    agent_historical_loss_pct: Optional[float] = None
    storage_days: Optional[int] = None
    humidity_pct: Optional[float] = None
    has_physical_damage: bool = False


@dataclass
class PredictionResult:
    risk_score: int                         # 0-100
    risk_label: str                         # GREEN / AMBER / RED
    confidence_pct: int
    stage: str
    contributing_factors: List[Dict]
    recommendation: str
    phase: str = "RULE_BASED"


# Rwanda-specific crop thresholds (sourced from FAO East Africa + RAB crop loss data)
CROP_THRESHOLDS = {
    "Tomatoes": {
        "transit_amber_h": 4.0, "transit_red_h": 6.0,
        "temp_amber_c": 28.0,   "temp_red_c": 32.0,
        "storage_amber_d": 3,   "storage_red_d": 5,
        "requires_cold_chain": True,
        "self_collect_risk_hour": 10,   # High risk if collected after this hour
        "benchmark_loss_pct": 22.0,     # Rwanda average from RAB
    },
    "Bananas": {
        "transit_amber_h": 6.0, "transit_red_h": 10.0,
        "temp_amber_c": 28.0,   "temp_red_c": 32.0,
        "storage_amber_d": 5,   "storage_red_d": 8,
        "requires_cold_chain": False,
        "self_collect_risk_hour": 11,
        "benchmark_loss_pct": 18.0,
    },
    "Avocados": {
        "transit_amber_h": 12.0, "transit_red_h": 24.0,
        "temp_amber_c": 25.0,    "temp_red_c": 30.0,
        "storage_amber_d": 7,    "storage_red_d": 14,
        "requires_cold_chain": False,
        "self_collect_risk_hour": 12,
        "benchmark_loss_pct": 15.0,
    },
    "Potatoes": {
        "transit_amber_h": 24.0, "transit_red_h": 48.0,
        "temp_amber_c": None,    "temp_red_c": None,
        "storage_amber_d": 30,   "storage_red_d": 60,
        "requires_cold_chain": False,
        "self_collect_risk_hour": None,
        "benchmark_loss_pct": 10.0,
    },
    "Maize": {
        "transit_amber_h": 72.0, "transit_red_h": 120.0,
        "temp_amber_c": None,    "temp_red_c": None,
        "storage_amber_d": 90,   "storage_red_d": 180,
        "requires_cold_chain": False,
        "self_collect_risk_hour": None,
        "benchmark_loss_pct": 8.0,
    },
    "Beans": {
        "transit_amber_h": 72.0, "transit_red_h": 120.0,
        "temp_amber_c": None,    "temp_red_c": None,
        "storage_amber_d": 90,   "storage_red_d": 180,
        "requires_cold_chain": False,
        "self_collect_risk_hour": None,
        "benchmark_loss_pct": 7.0,
    },
    "Sweet Potatoes": {
        "transit_amber_h": 18.0, "transit_red_h": 36.0,
        "temp_amber_c": 28.0,    "temp_red_c": 33.0,
        "storage_amber_d": 10,   "storage_red_d": 21,
        "requires_cold_chain": False,
        "self_collect_risk_hour": 11,
        "benchmark_loss_pct": 14.0,
    },
    "DEFAULT": {
        "transit_amber_h": 12.0, "transit_red_h": 24.0,
        "temp_amber_c": 30.0,    "temp_red_c": 35.0,
        "storage_amber_d": 14,   "storage_red_d": 30,
        "requires_cold_chain": False,
        "self_collect_risk_hour": 12,
        "benchmark_loss_pct": 15.0,
    },
}


def get_risk_label(score: int) -> str:
    if score <= 40:
        return "GREEN"
    elif score <= 70:
        return "AMBER"
    return "RED"


def score_transit_risk(inp: PredictionInput, thresholds: dict) -> tuple:
    """Returns (score_contribution, factor_dict)"""
    if inp.transit_hours is None:
        return 0, None

    amber_h = thresholds["transit_amber_h"]
    red_h   = thresholds["transit_red_h"]

    if inp.transit_hours >= red_h:
        score = 80
        weight = "HIGH"
    elif inp.transit_hours >= amber_h:
        ratio = (inp.transit_hours - amber_h) / (red_h - amber_h)
        score = int(40 + ratio * 40)
        weight = "MEDIUM"
    else:
        ratio = inp.transit_hours / amber_h
        score = int(ratio * 30)
        weight = "LOW"

    factor = {
        "factor": "transit_time",
        "value": f"{inp.transit_hours:.1f} hours",
        "threshold_amber": f"{amber_h}h",
        "threshold_red": f"{red_h}h",
        "weight": weight,
    }
    return score, factor


def score_temperature_risk(inp: PredictionInput, thresholds: dict) -> tuple:
    if inp.temperature_celsius is None or thresholds["temp_amber_c"] is None:
        return 0, None

    amber_t = thresholds["temp_amber_c"]
    red_t   = thresholds["temp_red_c"]

    if inp.temperature_celsius >= red_t:
        score = 90
        weight = "HIGH"
    elif inp.temperature_celsius >= amber_t:
        ratio = (inp.temperature_celsius - amber_t) / (red_t - amber_t)
        score = int(40 + ratio * 50)
        weight = "MEDIUM"
    else:
        score = 0
        weight = "LOW"

    factor = {
        "factor": "temperature",
        "value": f"{inp.temperature_celsius}°C",
        "threshold_amber": f"{amber_t}°C",
        "threshold_red": f"{red_t}°C",
        "weight": weight,
    }
    return score, factor


def score_self_transport_risk(inp: PredictionInput, thresholds: dict) -> tuple:
    """Risk for market agent self-collection."""
    score = 0
    factors = []

    risk_hour = thresholds.get("self_collect_risk_hour")
    if risk_hour and inp.time_of_day_hour is not None and inp.time_of_day_hour >= risk_hour:
        hours_over = inp.time_of_day_hour - risk_hour
        time_score = min(40, 20 + hours_over * 5)
        score += time_score
        factors.append({
            "factor": "collection_time",
            "value": f"{inp.time_of_day_hour:02d}:00",
            "note": f"Collections after {risk_hour:02d}:00 carry higher heat exposure risk",
            "weight": "HIGH" if hours_over >= 2 else "MEDIUM",
        })

    if inp.distance_km and inp.distance_km > 10:
        dist_score = min(30, int(inp.distance_km * 1.5))
        score += dist_score
        factors.append({
            "factor": "distance",
            "value": f"{inp.distance_km:.1f} km",
            "note": "Longer distances increase transit time and heat exposure",
            "weight": "MEDIUM" if inp.distance_km < 20 else "HIGH",
        })

    if inp.agent_historical_loss_pct and inp.agent_historical_loss_pct > 15:
        hist_score = min(30, int(inp.agent_historical_loss_pct * 1.2))
        score += hist_score
        factors.append({
            "factor": "agent_history",
            "value": f"{inp.agent_historical_loss_pct:.1f}% average loss (last 30 days)",
            "note": "Historical performance indicates systematic collection issues",
            "weight": "HIGH" if inp.agent_historical_loss_pct > 20 else "MEDIUM",
        })

    if inp.has_physical_damage:
        score += 25
        factors.append({"factor": "packaging", "value": "Physical damage risk flagged", "weight": "MEDIUM"})

    return min(100, score), factors


def predict_transit_loss(inp: PredictionInput) -> PredictionResult:
    thresholds = CROP_THRESHOLDS.get(inp.crop_name, CROP_THRESHOLDS["DEFAULT"])
    factors = []
    scores = []

    transit_score, transit_factor = score_transit_risk(inp, thresholds)
    if transit_factor:
        scores.append(transit_score)
        factors.append(transit_factor)

    temp_score, temp_factor = score_temperature_risk(inp, thresholds)
    if temp_factor:
        scores.append(temp_score)
        factors.append(temp_factor)

    # Weighted average: transit 60%, temp 40%
    if scores:
        if len(scores) == 2:
            final_score = int(scores[0] * 0.6 + scores[1] * 0.4)
        else:
            final_score = scores[0]
    else:
        final_score = 10  # Minimal baseline risk

    risk_label = get_risk_label(final_score)

    recommendation = ""
    if risk_label == "RED":
        recommendation = (
            f"HIGH RISK: {inp.crop_name} batch is at critical loss risk. "
            f"Immediate action required: expedite delivery or arrange cold chain if not already in use."
        )
    elif risk_label == "AMBER":
        recommendation = (
            f"MEDIUM RISK: {inp.crop_name} batch shows elevated loss risk. "
            f"Monitor closely and ensure delivery is completed within safe window."
        )
    else:
        recommendation = f"{inp.crop_name} batch is within safe parameters."

    return PredictionResult(
        risk_score=final_score,
        risk_label=risk_label,
        confidence_pct=75,
        stage="TRANSIT_LEG1",
        contributing_factors=factors,
        recommendation=recommendation,
    )


def predict_self_transport_risk(inp: PredictionInput) -> PredictionResult:
    thresholds = CROP_THRESHOLDS.get(inp.crop_name, CROP_THRESHOLDS["DEFAULT"])
    score, factors = score_self_transport_risk(inp, thresholds)
    risk_label = get_risk_label(score)

    risk_hour = thresholds.get("self_collect_risk_hour")
    recommendation = ""
    if risk_label == "RED":
        if risk_hour and inp.time_of_day_hour and inp.time_of_day_hour >= risk_hour:
            recommendation = (
                f"HIGH RISK — {inp.crop_name} collected after {risk_hour:02d}:00 "
                f"loses {thresholds[\'benchmark_loss_pct\']}% on average. "
                f"Collect before {risk_hour:02d}:00 or request distributor-arranged delivery."
            )
        else:
            recommendation = (
                f"HIGH RISK — Consider requesting distributor-arranged transporter delivery "
                f"to reduce post-collection losses for this {inp.crop_name} order."
            )
    elif risk_label == "AMBER":
        recommendation = f"MEDIUM RISK — Proceed with caution. Complete collection and return to stall promptly."
    else:
        recommendation = f"LOW RISK — Safe to self-collect. Return to stall within normal time."

    return PredictionResult(
        risk_score=score,
        risk_label=risk_label,
        confidence_pct=70,
        stage="SELF_TRANSPORT",
        contributing_factors=factors if isinstance(factors, list) else [factors] if factors else [],
        recommendation=recommendation,
    )


def predict_storage_risk(inp: PredictionInput) -> PredictionResult:
    thresholds = CROP_THRESHOLDS.get(inp.crop_name, CROP_THRESHOLDS["DEFAULT"])
    factors = []
    score = 0

    if inp.storage_days is not None:
        amber_d = thresholds["storage_amber_d"]
        red_d   = thresholds["storage_red_d"]
        if inp.storage_days >= red_d:
            score = 85
        elif inp.storage_days >= amber_d:
            ratio = (inp.storage_days - amber_d) / max(1, red_d - amber_d)
            score = int(40 + ratio * 45)
        else:
            score = int((inp.storage_days / max(1, amber_d)) * 30)
        factors.append({
            "factor": "storage_duration",
            "value": f"{inp.storage_days} days",
            "threshold_amber": f"{amber_d} days",
            "threshold_red": f"{red_d} days",
            "weight": "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW",
        })

    temp_score, temp_factor = score_temperature_risk(inp, thresholds)
    if temp_factor:
        score = int(score * 0.6 + temp_score * 0.4)
        factors.append(temp_factor)

    risk_label = get_risk_label(min(100, score))
    recommendation = ""
    if risk_label == "RED":
        recommendation = f"CRITICAL: {inp.crop_name} in storage is at high spoilage risk. Expedite dispatch within 24 hours."
    elif risk_label == "AMBER":
        recommendation = f"Monitor storage conditions for {inp.crop_name}. Consider prioritising dispatch."
    else:
        recommendation = f"{inp.crop_name} storage conditions are within safe parameters."

    return PredictionResult(
        risk_score=min(100, score),
        risk_label=risk_label,
        confidence_pct=80,
        stage="STORAGE",
        contributing_factors=factors,
        recommendation=recommendation,
    )
