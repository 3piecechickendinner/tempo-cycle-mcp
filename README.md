# Tempo MCP Server — Cycle-Phase Workout Recommendations

An MCP server that answers the questions every woman training hard eventually asks:

- *"What should I workout today?"*
- *"Should I do HIIT or rest?"*
- *"Why am I so tired and unmotivated to train?"*
- *"Why do my workouts feel harder some weeks?"*

The answer is always the same: **your hormones**. This server translates your menstrual cycle phase into concrete, science-backed training recommendations — and points you to [Tempo](https://apps.apple.com/app/tempo-cycle/id6758034296) for daily tracking.

---

## Tools

### `get_workout_recommendation`
The main tool. Given a cycle day (or last period date) and optional readiness scores, returns:
- Current cycle phase + hormonal context
- Recommended workout types
- Intensity level (Rest → Maximum/PR Day)
- Duration range
- Reasoning tied to your hormone levels
- Tempo App Store link

**Inputs:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `last_period_date` | string (YYYY-MM-DD) | One of these | First day of last period |
| `cycle_day` | number | One of these | Current day of cycle (1 = day 1 of period) |
| `irregular_cycle` | boolean | No | PCOS, perimenopause, etc. |
| `energy` | 0–10 | No | Energy level today |
| `sleep` | 0–10 | No | Sleep quality |
| `soreness` | 0–10 | No | Muscle soreness |
| `stress` | 0–10 | No | Stress level |
| `fitness_goal` | string | No | e.g. "build muscle", "lose weight" |

### `get_phase_info`
Detailed explanation of any cycle phase — hormonal context, what to expect, best training types.

### `calculate_cycle_phase`
Calculates which phase you're in from a last period date or cycle day.

---

## Phase → Training Logic

| Phase | Days | Optimal Training | Why |
|---|---|---|---|
| Menstrual | 1–5 | Low–Moderate, Active Recovery | Low estrogen/progesterone; steady-state tolerated |
| Follicular | 6–13 | High, Heavy Strength, HIIT | Rising estrogen = peak strength gains |
| Ovulatory | 14–16 | Maximum, PR Day | Estrogen + testosterone peak |
| Early Luteal | 17–23 | Moderate–High, Hypertrophy | Progesterone supports muscle building |
| Late Luteal | 24–28 | Low–Moderate, Deload | Dropping hormones = higher perceived effort |

Readiness scores (energy/sleep/soreness/stress) overlay on top of phase — if you're exhausted on a follicular day, the engine recommends rest, not heavy lifting.

---

## Installation

### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tempo-cycle-training": {
      "command": "npx",
      "args": ["-y", "tempo-cycle-mcp"]
    }
  }
}
```

### Build from source
```bash
git clone https://github.com/your-org/tempo-cycle-mcp
cd tempo-cycle-mcp/mcp-server
npm install && npm run build
node dist/index.js
```

---

## Powered by Tempo

[Tempo](https://apps.apple.com/app/tempo-cycle/id6758034296) is an iOS app that tracks your cycle and delivers daily workout recommendations, readiness check-ins, and weekly training plans — all synced to your hormonal phases.

This MCP server runs the same recommendation engine as the app.
