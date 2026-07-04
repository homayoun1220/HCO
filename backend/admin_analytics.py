"""Rule-based insights and chart data for clean study sessions."""

import time
from typing import Any, Dict, List, Optional

import db

FAMILIES = ["perceptual", "reasoning", "attention", "biometric"]
LATENCY_BUCKETS = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10), (10, 999)]
TOTAL_TRIALS = 20


def _percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, int(len(ordered) * p))
    return round(ordered[idx], 2)


def _latency_histogram(latencies: List[float]) -> List[Dict[str, Any]]:
    buckets = []
    for lo, hi in LATENCY_BUCKETS:
        label = f"{lo}-{hi}s" if hi < 100 else f"{lo}s+"
        count = sum(1 for v in latencies if lo <= v < hi)
        buckets.append({"label": label, "count": count})
    return buckets


def _failure_slice(trials: List[Dict[str, Any]]) -> Dict[str, int]:
    passed = latency_fail = correctness_fail = 0
    for t in trials:
        if t["passed"]:
            passed += 1
        elif t["latency_fail"]:
            latency_fail += 1
        elif t["correctness_fail"]:
            correctness_fail += 1
    return {
        "passed": passed,
        "latency_fail": latency_fail,
        "correctness_fail": correctness_fail,
    }


def generate_insights(
    participants_clean: int,
    families: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    insights: List[Dict[str, Any]] = []

    if participants_clean == 0:
        insights.append(
            {
                "severity": "warning",
                "family": None,
                "message": "No clean participants yet. Analytics require completed runs with exactly 20 trials.",
            }
        )
        return insights

    if participants_clean < 10:
        insights.append(
            {
                "severity": "info",
                "family": None,
                "message": f"Only {participants_clean} clean participant(s). Insights are indicative — aim for N ≥ 20.",
            }
        )

    for fam in families:
        name = fam["family"]
        pass_rate = fam["pass_rate"]
        lat_fail = fam["latency_fail_rate"]
        corr_fail = fam["correctness_fail_rate"]

        if pass_rate >= 0.9:
            insights.append(
                {
                    "severity": "info",
                    "family": name,
                    "message": f"{name.capitalize()} pass rate is {pass_rate * 100:.0f}%. This challenge may be too easy for this population.",
                }
            )
        elif pass_rate <= 0.4:
            insights.append(
                {
                    "severity": "warning",
                    "family": name,
                    "message": f"{name.capitalize()} pass rate is {pass_rate * 100:.0f}%. The task may be too hard or the deadline too tight.",
                }
            )

        if lat_fail >= 0.5 and lat_fail > corr_fail:
            insights.append(
                {
                    "severity": "info",
                    "family": name,
                    "message": f"{name.capitalize()} failures are mostly latency-bound (deadline), not wrong answers.",
                }
            )
        elif corr_fail >= 0.4 and corr_fail > lat_fail:
            insights.append(
                {
                    "severity": "info",
                    "family": name,
                    "message": f"{name.capitalize()} failures are mostly correctness-bound — participants had time but answered wrong.",
                }
            )

    if len(families) >= 2:
        hardest = min(families, key=lambda f: f["pass_rate"])
        easiest = max(families, key=lambda f: f["pass_rate"])
        if hardest["family"] != easiest["family"]:
            insights.append(
                {
                    "severity": "info",
                    "family": None,
                    "message": (
                        f"Hardest channel: {hardest['family']} ({hardest['pass_rate'] * 100:.0f}% pass). "
                        f"Easiest: {easiest['family']} ({easiest['pass_rate'] * 100:.0f}% pass)."
                    ),
                }
            )

    if not any(i["severity"] == "warning" for i in insights):
        insights.append(
            {
                "severity": "info",
                "family": None,
                "message": "No observed family shows unbounded servicing capacity — throughput appears bounded across channels.",
            }
        )

    return insights


async def build_analytics_report() -> Dict[str, Any]:
    trials = await db.fetch_clean_trials(total_trials=TOTAL_TRIALS)
    timeline = await db.fetch_clean_completion_timeline(total_trials=TOTAL_TRIALS)
    participants_clean = await db.count_clean_sessions(total_trials=TOTAL_TRIALS)

    by_family_map: Dict[str, List[Dict[str, Any]]] = {f: [] for f in FAMILIES}
    for trial in trials:
        family = trial.get("family")
        if family in by_family_map:
            by_family_map[family].append(trial)

    families = []
    failure_by_family = []
    latency_histograms: Dict[str, List[Dict[str, Any]]] = {}

    for family in FAMILIES:
        rows = by_family_map[family]
        n = len(rows)
        if n == 0:
            families.append(
                {
                    "family": family,
                    "n": 0,
                    "pass_rate": 0.0,
                    "correct_rate": 0.0,
                    "mean_latency": 0.0,
                    "median_latency": 0.0,
                    "p90_latency": 0.0,
                    "throughput_per_min": 0.0,
                    "latency_fail_rate": 0.0,
                    "correctness_fail_rate": 0.0,
                }
            )
            failure_by_family.append({"family": family, "passed": 0, "latency_fail": 0, "correctness_fail": 0})
            latency_histograms[family] = _latency_histogram([])
            continue

        latencies = [float(r["latency"]) for r in rows if r.get("latency") is not None]
        passed = sum(1 for r in rows if r["passed"])
        correct = sum(1 for r in rows if r["correct"])
        mean_lat = sum(latencies) / len(latencies) if latencies else 0.0

        families.append(
            {
                "family": family,
                "n": n,
                "pass_rate": round(passed / n, 3),
                "correct_rate": round(correct / n, 3),
                "mean_latency": round(mean_lat, 2),
                "median_latency": _percentile(latencies, 0.5),
                "p90_latency": _percentile(latencies, 0.9),
                "throughput_per_min": round(60.0 / mean_lat, 2) if mean_lat > 0 else 0.0,
                "latency_fail_rate": round(sum(1 for r in rows if r["latency_fail"]) / n, 3),
                "correctness_fail_rate": round(sum(1 for r in rows if r["correctness_fail"]) / n, 3),
            }
        )
        failure_by_family.append({"family": family, **_failure_slice(rows)})
        latency_histograms[family] = _latency_histogram(latencies)

    total_trials = len(trials)
    total_passed = sum(1 for t in trials if t["passed"])
    overall_fail = _failure_slice(trials)

    return {
        "generated_at": time.time(),
        "filter": "clean",
        "overview": {
            "participants_clean": participants_clean,
            "trials_total": total_trials,
            "trials_per_participant": TOTAL_TRIALS,
            "overall_pass_rate": round(total_passed / total_trials, 3) if total_trials else 0.0,
            "overall_correct_rate": round(sum(1 for t in trials if t["correct"]) / total_trials, 3)
            if total_trials
            else 0.0,
        },
        "families": families,
        "failure_breakdown": failure_by_family,
        "overall_outcomes": overall_fail,
        "latency_histograms": latency_histograms,
        "timeline": timeline,
        "insights": generate_insights(participants_clean, families),
    }
