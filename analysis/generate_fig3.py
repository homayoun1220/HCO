"""
generate_fig3.py — HCO Paper Figure 3
Run from: ~/Deusto-Homayoun/paper/hco app/analysis/
Output:   fig3_hco_empirical.pdf
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
import math

df = pd.read_csv("solver_results.csv")

SOLVER_MAP = {
    "gpt-4o":                     "GPT-4o",
    "gemini-2.5-flash":           "Gemini 2.5\nFlash",
    "claude-sonnet-4-5-20250929": "Claude\nSonnet 4.5",
}
DELTA   = {"perceptual": 8.0, "reasoning": 12.0}
SOLVERS = ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4-5-20250929"]
FAMILIES= ["perceptual", "reasoning"]

def wilson_ci(p, n, z=1.96):
    if n == 0: return 0.0, 1.0
    denom  = 1 + z**2/n
    center = (p + z**2/(2*n)) / denom
    margin = z * math.sqrt(max(0, p*(1-p)/n + z**2/(4*n**2))) / denom
    return max(0.0, center-margin), min(1.0, center+margin)

records = []
for solver in SOLVERS:
    for family in FAMILIES:
        sub      = df[(df.solver==solver) & (df.family==family)]
        n        = len(sub)
        success  = float(sub["passed"].mean())
        mean_lat = float(sub["latency"].mean())
        tau_h    = max(1, math.floor(DELTA[family] / mean_lat))
        lo, hi   = wilson_ci(success, n)
        records.append(dict(
            solver=solver, family=family,
            success=success*100,
            mean_lat=mean_lat,
            tau_h=tau_h,
            err_lo=max(0.0, success*100 - lo*100),
            err_hi=max(0.0, hi*100 - success*100),
        ))

stats = pd.DataFrame(records)

def get(field, solver, family):
    return float(stats[(stats.solver==solver)&(stats.family==family)][field].values[0])

plt.rcParams.update({
    "font.family":"serif", "font.size":8,
    "axes.labelsize":8, "axes.titlesize":8.5,
    "xtick.labelsize":7, "ytick.labelsize":7,
    "legend.fontsize":7,
})

fig, axes = plt.subplots(1, 3, figsize=(7.16, 3.0),
                          gridspec_kw={"width_ratios":[2,2,1.6]})
fig.subplots_adjust(wspace=0.40)

COLORS = {"perceptual":"#2166ac", "reasoning":"#d6604d"}
HATCH  = {"perceptual":"",        "reasoning":"//"}
x      = np.arange(len(SOLVERS))
w      = 0.36
xlbls  = [SOLVER_MAP[s] for s in SOLVERS]

# Panel A — pass rate
ax = axes[0]
for i, fam in enumerate(FAMILIES):
    vals   = [get("success",s,fam)  for s in SOLVERS]
    err_lo = [get("err_lo",s,fam)   for s in SOLVERS]
    err_hi = [get("err_hi",s,fam)   for s in SOLVERS]
    off    = (i-0.5)*w
    ax.bar(x+off, vals, w, color=COLORS[fam], hatch=HATCH[fam],
           edgecolor="white", lw=0.5, alpha=0.9,
           label="Perceptual" if fam=="perceptual" else "Reasoning")
    ax.errorbar(x+off, vals, yerr=[err_lo, err_hi], fmt="none",
                ecolor="black", elinewidth=0.8, capsize=2.5)
ax.set_ylim(0,115); ax.set_yticks([0,25,50,75,100])
ax.set_ylabel("Pass rate (%)"); ax.set_title("(a) Pass rate [95% CI]")
ax.set_xticks(x); ax.set_xticklabels(xlbls)
ax.axhline(100, color="gray", lw=0.5, ls="--", alpha=0.4)
ax.legend(loc="lower left"); ax.spines[["top","right"]].set_visible(False)

# Panel B — latency
ax = axes[1]
for i, fam in enumerate(FAMILIES):
    vals = [get("mean_lat",s,fam) for s in SOLVERS]
    off  = (i-0.5)*w
    ax.bar(x+off, vals, w, color=COLORS[fam], hatch=HATCH[fam],
           edgecolor="white", lw=0.5, alpha=0.9,
           label="Perceptual" if fam=="perceptual" else "Reasoning")
    ax.axhline(DELTA[fam], color=COLORS[fam], lw=1.0, ls="--", alpha=0.7)
ax.set_ylim(0,15); ax.set_yticks([0,3,6,9,12])
ax.set_ylabel("Mean latency (s)")
ax.set_title(r"(b) Latency vs.\ $\Delta_{\mathrm{resp}}$")
ax.set_xticks(x); ax.set_xticklabels(xlbls)
ax.text(2.6, 8.4,  r"$\Delta=8$s",  color=COLORS["perceptual"], fontsize=6.5, ha="right")
ax.text(2.6, 12.4, r"$\Delta=12$s", color=COLORS["reasoning"],  fontsize=6.5, ha="right")
ax.legend(loc="upper left"); ax.spines[["top","right"]].set_visible(False)

# Panel C — tau_h
ax = axes[2]
for i, fam in enumerate(FAMILIES):
    vals = [get("tau_h",s,fam) for s in SOLVERS]
    off  = (i-0.5)*w
    bars = ax.bar(x+off, vals, w, color=COLORS[fam], hatch=HATCH[fam],
                  edgecolor="white", lw=0.5, alpha=0.9,
                  label="Perceptual" if fam=="perceptual" else "Reasoning")
    for bar, v in zip(bars, vals):
        ax.text(bar.get_x()+bar.get_width()/2, v+0.3, str(int(v)),
                ha="center", va="bottom", fontsize=6.5, fontweight="bold")
ax.set_ylim(0,16); ax.set_yticks([0,4,8,12])
ax.set_ylabel(r"$\tau_h$ (solves / window)")
ax.set_title(r"(c) Throughput $\tau_h$")
ax.set_xticks(x); ax.set_xticklabels(xlbls)
ax.legend(loc="upper right"); ax.spines[["top","right"]].set_visible(False)

fig.text(0.5, -0.05,
    r"Perceptual: latency-bound ($\tau_h\in\{2,3\}$, accuracy 97–100%).  "
    r"Reasoning: correctness-bound ($\tau_h\in\{6,8,12\}$, accuracy 75–78%).",
    ha="center", fontsize=6.5, style="italic", color="#444")

out = Path("fig3_hco_empirical.pdf")
fig.savefig(out, format="pdf", bbox_inches="tight", dpi=300)
print(f"Saved: {out.resolve()}")