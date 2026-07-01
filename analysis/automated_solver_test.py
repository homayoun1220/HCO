#!/usr/bin/env python3
"""Automated solver benchmark for HCO perceptual and reasoning challenges."""

from __future__ import annotations

import argparse
import base64
import csv
import io
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from PIL import Image

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from challenges.perceptual import generate_challenge as gen_perceptual  # noqa: E402
from challenges.perceptual import verify_response as verify_perceptual  # noqa: E402
from challenges.reasoning import generate_challenge as gen_reasoning  # noqa: E402
from challenges.reasoning import verify_response as verify_reasoning  # noqa: E402

RESULTS_PATH = Path(__file__).resolve().parent / "solver_results.csv"
CSV_COLUMNS = [
    "solver",
    "family",
    "trial",
    "latency",
    "correct",
    "passed",
    "latency_fail",
    "correctness_fail",
    "response_raw",
    "error",
]

PERCEPTUAL_PROMPT = (
    "You will see one ORIGINAL image, followed by 4 OPTION images "
    "labeled 0, 1, 2, 3 in order. Which option image is the same shape "
    "composition as the original (allowing for rotation, noise, color "
    "shift)? Reply with ONLY a single digit: 0, 1, 2, or 3. No other text."
)

SOLVER_ALIASES = {
    "gpt-4o": "openai",
    "openai": "openai",
    "gemini": "google",
    "gemini-2.5-flash": "google",
    "google": "google",
    "claude": "anthropic",
    "claude-sonnet-4-5-20250929": "anthropic",
    "anthropic": "anthropic",
}


@dataclass(frozen=True)
class SolverSpec:
    key: str
    display_name: str
    model: str
    env_var: str
    rate_limit_s: float


SOLVERS: Dict[str, SolverSpec] = {
    "openai": SolverSpec(
        key="openai",
        display_name="gpt-4o",
        model="gpt-4o",
        env_var="OPENAI_API_KEY",
        rate_limit_s=1.0,
    ),
    "google": SolverSpec(
        key="google",
        display_name="gemini-2.5-flash",
        model="gemini-2.5-flash",
        env_var="GOOGLE_API_KEY",
        rate_limit_s=4.0,
    ),
    "anthropic": SolverSpec(
        key="anthropic",
        display_name="claude-sonnet-4-5-20250929",
        model="claude-sonnet-4-5-20250929",
        env_var="ANTHROPIC_API_KEY",
        rate_limit_s=1.0,
    ),
}

FAMILIES = {
    "perceptual": {
        "generate": gen_perceptual,
        "verify": verify_perceptual,
        "delta_resp": 8.0,
    },
    "reasoning": {
        "generate": gen_reasoning,
        "verify": verify_reasoning,
        "delta_resp": 12.0,
    },
}


def _b64_to_pil(b64_string: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64_string))).convert("RGB")


def _reasoning_prompt(public: Dict[str, Any]) -> str:
    seq = public["sequence"]
    return (
        "What is the next number in this sequence? Reply with ONLY the "
        "number, no other text.\n"
        f"Sequence: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ?"
    )


def parse_perceptual_response(text: str) -> Dict[str, Any]:
    match = re.search(r"[0-3]", text or "")
    digit = int(match.group(0)) if match else -1
    return {"selected_index": digit}


def parse_reasoning_response(text: str) -> Dict[str, Any]:
    match = re.search(r"-?\d+", text or "")
    if not match:
        return {"answer": ""}
    return {"answer": match.group(0)}


def _call_with_timeout(fn: Callable[[], str], timeout: float) -> Tuple[str, float]:
    t_start = time.time()
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(fn)
        try:
            result = future.result(timeout=timeout)
            return result, time.time() - t_start
        except FuturesTimeoutError as exc:
            raise TimeoutError(f"API call exceeded {timeout}s deadline") from exc


class SolverRunner:
    def __init__(self, spec: SolverSpec) -> None:
        self.spec = spec
        self._openai_client = None
        self._google_client = None
        self._anthropic_client = None

    def _get_openai_client(self):
        if self._openai_client is None:
            from openai import OpenAI

            self._openai_client = OpenAI(api_key=os.environ[self.spec.env_var])
        return self._openai_client

    def _get_google_client(self):
        if self._google_client is None:
            from google import genai

            api_key = os.environ.get(self.spec.env_var) or os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise RuntimeError(f"{self.spec.env_var} or GEMINI_API_KEY is not set")
            self._google_client = genai.Client(api_key=api_key)
        return self._google_client

    def _get_anthropic_client(self):
        if self._anthropic_client is None:
            from anthropic import Anthropic

            self._anthropic_client = Anthropic(api_key=os.environ[self.spec.env_var])
        return self._anthropic_client

    def solve_perceptual(self, public: Dict[str, Any]) -> str:
        if self.spec.key == "openai":
            return self._perceptual_openai(public)
        if self.spec.key == "google":
            return self._perceptual_google(public)
        return self._perceptual_anthropic(public)

    def solve_reasoning(self, public: Dict[str, Any]) -> str:
        prompt = _reasoning_prompt(public)
        if self.spec.key == "openai":
            client = self._get_openai_client()
            response = client.chat.completions.create(
                model=self.spec.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=32,
            )
            return response.choices[0].message.content or ""
        if self.spec.key == "google":
            client = self._get_google_client()
            response = client.models.generate_content(
                model=self.spec.model,
                contents=[prompt],
            )
            return getattr(response, "text", "") or ""
        client = self._get_anthropic_client()
        response = client.messages.create(
            model=self.spec.model,
            max_tokens=32,
            messages=[{"role": "user", "content": prompt}],
        )
        parts = []
        for block in response.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "".join(parts)

    def _perceptual_openai(self, public: Dict[str, Any]) -> str:
        client = self._get_openai_client()
        content: List[Dict[str, Any]] = [{"type": "text", "text": PERCEPTUAL_PROMPT}]
        content.append({"type": "text", "text": "ORIGINAL:"})
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{public['original_b64']}"},
            }
        )
        for idx, option_b64 in enumerate(public["options"]):
            content.append({"type": "text", "text": f"OPTION {idx}:"})
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{option_b64}"},
                }
            )
        response = client.chat.completions.create(
            model=self.spec.model,
            messages=[{"role": "user", "content": content}],
            max_tokens=16,
        )
        return response.choices[0].message.content or ""

    def _perceptual_google(self, public: Dict[str, Any]) -> str:
        client = self._get_google_client()
        contents: List[Any] = [PERCEPTUAL_PROMPT, "ORIGINAL:", _b64_to_pil(public["original_b64"])]
        for idx, option_b64 in enumerate(public["options"]):
            contents.extend([f"OPTION {idx}:", _b64_to_pil(option_b64)])
        response = client.models.generate_content(
            model=self.spec.model,
            contents=contents,
        )
        return getattr(response, "text", "") or ""

    def _perceptual_anthropic(self, public: Dict[str, Any]) -> str:
        client = self._get_anthropic_client()
        content: List[Dict[str, Any]] = [{"type": "text", "text": PERCEPTUAL_PROMPT}]
        content.append({"type": "text", "text": "ORIGINAL:"})
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": public["original_b64"],
                },
            }
        )
        for idx, option_b64 in enumerate(public["options"]):
            content.append({"type": "text", "text": f"OPTION {idx}:"})
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": option_b64,
                    },
                }
            )
        response = client.messages.create(
            model=self.spec.model,
            max_tokens=16,
            messages=[{"role": "user", "content": content}],
        )
        parts = []
        for block in response.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "".join(parts)


def ensure_csv(path: Path) -> None:
    if not path.exists():
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            writer.writeheader()


def append_result(path: Path, row: Dict[str, Any]) -> None:
    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writerow(row)


def run_trial(
    runner: SolverRunner,
    family: str,
    trial_num: int,
    total_trials: int,
    results_path: Path,
) -> Dict[str, Any]:
    family_cfg = FAMILIES[family]
    public, private = family_cfg["generate"]()
    challenge = {**public, **private}
    delta_resp = float(public.get("delta_resp", family_cfg["delta_resp"]))

    response_raw = ""
    error = ""
    parsed: Dict[str, Any]
    t_start = time.time()
    latency = 0.0

    try:
        if family == "perceptual":
            api_fn = lambda: runner.solve_perceptual(public)
            parse_fn = parse_perceptual_response
        else:
            api_fn = lambda: runner.solve_reasoning(public)
            parse_fn = parse_reasoning_response

        response_raw, latency = _call_with_timeout(api_fn, timeout=delta_resp)
        parsed = parse_fn(response_raw)
    except Exception as exc:  # noqa: BLE001 - benchmark must continue
        latency = time.time() - t_start
        error = str(exc)
        parsed = (
            {"selected_index": -1}
            if family == "perceptual"
            else {"answer": ""}
        )
        response_raw = response_raw or ""

    correct = bool(family_cfg["verify"](challenge, parsed))
    latency_fail = latency > delta_resp
    correctness_fail = (not latency_fail) and (not correct)
    passed = correct and (not latency_fail)

    row = {
        "solver": runner.spec.display_name,
        "family": family,
        "trial": trial_num,
        "latency": f"{latency:.4f}",
        "correct": str(correct),
        "passed": str(passed),
        "latency_fail": str(latency_fail),
        "correctness_fail": str(correctness_fail),
        "response_raw": response_raw,
        "error": error,
    }
    append_result(results_path, row)

    print(
        f"[{runner.spec.display_name}][{family}] Trial {trial_num}/{total_trials} "
        f"— latency: {latency:.1f}s — correct: {correct} — passed: {passed}"
        + (f" — error: {error}" if error else "")
    )
    return row


def run_solver(spec: SolverSpec, trials: int, results_path: Path) -> List[Dict[str, Any]]:
    if not os.environ.get(spec.env_var):
        if spec.key == "google" and os.environ.get("GEMINI_API_KEY"):
            os.environ.setdefault("GOOGLE_API_KEY", os.environ["GEMINI_API_KEY"])
        else:
            print(f"WARNING: skipping {spec.display_name} — {spec.env_var} not set")
            return []

    runner = SolverRunner(spec)
    rows: List[Dict[str, Any]] = []

    for family in ("perceptual", "reasoning"):
        for trial_num in range(1, trials + 1):
            row = run_trial(runner, family, trial_num, trials, results_path)
            rows.append(row)
            time.sleep(spec.rate_limit_s)

    return rows


def print_summary(results_path: Path) -> None:
    if not results_path.exists():
        print("No results file found.")
        return

    with results_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    if not rows:
        print("No trial rows found.")
        return

    groups: Dict[Tuple[str, str], List[Dict[str, str]]] = {}
    for row in rows:
        key = (row["solver"], row["family"])
        groups.setdefault(key, []).append(row)

    print("\nSummary")
    print("Solver | Family | Success% | Mean Latency | Latency Fail% | Correctness Fail%")
    print("-" * 78)

    for (solver, family), group in sorted(groups.items()):
        n = len(group)
        passed = sum(1 for r in group if r["passed"].lower() == "true")
        latency_vals = [float(r["latency"]) for r in group]
        latency_fail = sum(1 for r in group if r["latency_fail"].lower() == "true")
        correctness_fail = sum(1 for r in group if r["correctness_fail"].lower() == "true")
        success_pct = 100.0 * passed / n if n else 0.0
        mean_latency = sum(latency_vals) / n if n else 0.0
        latency_fail_pct = 100.0 * latency_fail / n if n else 0.0
        correctness_fail_pct = 100.0 * correctness_fail / n if n else 0.0
        print(
            f"{solver} | {family} | {success_pct:5.1f}% | {mean_latency:6.2f}s | "
            f"{latency_fail_pct:6.1f}% | {correctness_fail_pct:6.1f}%"
        )


def resolve_solver_keys(solver_args: List[str]) -> List[str]:
    keys: List[str] = []
    for raw in solver_args:
        token = raw.strip().lower()
        if not token:
            continue
        key = SOLVER_ALIASES.get(token) or SOLVER_ALIASES.get(raw.strip())
        if key is None:
            raise ValueError(f"Unknown solver '{raw}'. Use: gpt-4o, gemini, claude")
        if key not in keys:
            keys.append(key)
    return keys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run automated solver benchmark for HCO challenges.")
    parser.add_argument("--trials", type=int, default=100, help="Trials per (solver, family) pair")
    parser.add_argument(
        "--solvers",
        default="gpt-4o,gemini,claude",
        help="Comma-separated subset: gpt-4o,gemini,claude",
    )
    parser.add_argument(
        "--output",
        default=str(RESULTS_PATH),
        help="CSV output path (default: analysis/solver_results.csv)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    results_path = Path(args.output)
    ensure_csv(results_path)

    try:
        solver_keys = resolve_solver_keys(args.solvers.split(","))
    except ValueError as exc:
        print(exc)
        sys.exit(2)

    print(f"Output: {results_path}")
    print(f"Trials per (solver, family): {args.trials}")
    print(f"Solvers: {', '.join(SOLVERS[k].display_name for k in solver_keys)}")

    for key in solver_keys:
        print(f"\n=== Running {SOLVERS[key].display_name} ===")
        run_solver(SOLVERS[key], args.trials, results_path)

    print_summary(results_path)


if __name__ == "__main__":
    main()
