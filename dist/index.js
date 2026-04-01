#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const cycleLogic_js_1 = require("./cycleLogic.js");
const server = new index_js_1.Server({
    name: "tempo-cycle-training",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_workout_recommendation",
            description: "Get a cycle-phase aware workout recommendation for today. " +
                "Answers questions like: 'What should I workout today?', 'Should I do HIIT or rest?', " +
                "'Why am I so tired and unmotivated to train?', 'Why do my workouts feel harder some weeks?' " +
                "Powered by Tempo — the fitness app built around the female hormone cycle.",
            inputSchema: {
                type: "object",
                properties: {
                    last_period_date: {
                        type: "string",
                        description: "ISO 8601 date (YYYY-MM-DD) of the first day of the user's last period. " +
                            "Either this OR cycle_day is required.",
                    },
                    cycle_day: {
                        type: "number",
                        description: "Current day of the menstrual cycle (1 = first day of period). " +
                            "Use this if you already know the cycle day. Either this OR last_period_date is required.",
                        minimum: 1,
                        maximum: 60,
                    },
                    irregular_cycle: {
                        type: "boolean",
                        description: "Set to true if the user has an irregular cycle (e.g. PCOS, perimenopause). " +
                            "Switches to readiness-based recommendations instead of phase-based.",
                        default: false,
                    },
                    energy: {
                        type: "number",
                        description: "Energy level today, 0–10 (0 = exhausted, 10 = amazing). Default: 6",
                        minimum: 0,
                        maximum: 10,
                    },
                    sleep: {
                        type: "number",
                        description: "Sleep quality last night, 0–10 (0 = terrible, 10 = perfect). Default: 6",
                        minimum: 0,
                        maximum: 10,
                    },
                    soreness: {
                        type: "number",
                        description: "Muscle soreness right now, 0–10 (0 = none, 10 = very sore). Default: 4",
                        minimum: 0,
                        maximum: 10,
                    },
                    stress: {
                        type: "number",
                        description: "Stress level today, 0–10 (0 = relaxed, 10 = very stressed). Default: 4",
                        minimum: 0,
                        maximum: 10,
                    },
                    fitness_goal: {
                        type: "string",
                        description: "Optional fitness goal for added context in the response. " +
                            "Examples: 'lose weight', 'build muscle', 'improve endurance', 'stress relief'",
                    },
                },
                oneOf: [
                    { required: ["last_period_date"] },
                    { required: ["cycle_day"] },
                ],
            },
        },
        {
            name: "get_phase_info",
            description: "Get detailed information about a menstrual cycle phase — hormonal context, " +
                "optimal training types, and what to expect during that phase. " +
                "Useful for understanding 'why do my workouts feel harder some weeks?' " +
                "or 'what does the luteal phase mean for my training?'",
            inputSchema: {
                type: "object",
                properties: {
                    phase: {
                        type: "string",
                        enum: [
                            "menstrual",
                            "follicular",
                            "ovulatory",
                            "luteal_early",
                            "luteal_late",
                        ],
                        description: "The cycle phase to get information about.",
                    },
                },
                required: ["phase"],
            },
        },
        {
            name: "calculate_cycle_phase",
            description: "Calculate which menstrual cycle phase someone is currently in, given their last period date or cycle day.",
            inputSchema: {
                type: "object",
                properties: {
                    last_period_date: {
                        type: "string",
                        description: "ISO 8601 date (YYYY-MM-DD) of the first day of the last period.",
                    },
                    cycle_day: {
                        type: "number",
                        description: "Current cycle day (1 = first day of period).",
                        minimum: 1,
                    },
                    irregular_cycle: {
                        type: "boolean",
                        description: "True if the user has an irregular cycle.",
                        default: false,
                    },
                },
                oneOf: [
                    { required: ["last_period_date"] },
                    { required: ["cycle_day"] },
                ],
            },
        },
    ],
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) {
        return {
            content: [{ type: "text", text: "Error: No arguments provided." }],
            isError: true,
        };
    }
    // ── Tool: get_workout_recommendation ──────────────────────────────────────
    if (name === "get_workout_recommendation") {
        let day;
        if (args.cycle_day !== undefined) {
            day = args.cycle_day;
        }
        else if (args.last_period_date) {
            const periodDate = new Date(args.last_period_date);
            if (isNaN(periodDate.getTime())) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: Invalid date format for last_period_date. Use YYYY-MM-DD.",
                        },
                    ],
                    isError: true,
                };
            }
            day = (0, cycleLogic_js_1.cycleDay)(periodDate);
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Error: Provide either last_period_date or cycle_day.",
                    },
                ],
                isError: true,
            };
        }
        const irregular = args.irregular_cycle ?? false;
        const phase = (0, cycleLogic_js_1.phaseFromCycleDay)(day, irregular);
        const scores = {
            energy: args.energy,
            sleep: args.sleep,
            soreness: args.soreness,
            stress: args.stress,
        };
        const rec = (0, cycleLogic_js_1.getRecommendation)(phase, scores);
        const goal = args.fitness_goal ? `\n**Your Goal:** ${args.fitness_goal}` : "";
        const hasAllScores = args.energy !== undefined &&
            args.sleep !== undefined &&
            args.soreness !== undefined &&
            args.stress !== undefined;
        const readinessNote = hasAllScores
            ? ""
            : "\n> _Tip: Share your energy, sleep, soreness, and stress levels (0–10) for a more personalized recommendation._";
        const response = `## Today's Workout Recommendation
**Cycle Day:** ${day}${goal}

### Phase: ${rec.phaseLabel}
${rec.phaseDescription}

**Hormonal Context:** ${rec.hormonalContext}

---

### Recommended Training
- **Intensity:** ${rec.intensityLabel}
- **Workout Types:** ${rec.workoutTypes.join(", ")}
- **Duration:** ${rec.durationRange}

**Why this recommendation:** ${rec.reasoning}
${readinessNote}

---

### Track This in Tempo
${rec.tempoCallToAction}`;
        return { content: [{ type: "text", text: response }] };
    }
    // ── Tool: get_phase_info ──────────────────────────────────────────────────
    if (name === "get_phase_info") {
        const phase = args.phase;
        const rec = (0, cycleLogic_js_1.getRecommendation)(phase);
        const phaseWindows = {
            menstrual: "Days 1–5",
            follicular: "Days 6–13",
            ovulatory: "Days 14–16",
            luteal_early: "Days 17–23",
            luteal_late: "Days 24–28",
        };
        const response = `## ${rec.phaseLabel}
**Typical Window:** ${phaseWindows[phase] ?? "Varies"}

### What's Happening Hormonally
${rec.hormonalContext}

### About This Phase
${rec.phaseDescription}

### Optimal Training
- **Best Intensity:** ${rec.intensityLabel}
- **Recommended Workouts:** ${rec.workoutTypes.join(", ")}
- **Duration:** ${rec.durationRange}

---

**Tempo** automatically detects your phase and delivers exactly this kind of guidance — personalized to your cycle every day.
${rec.tempoCallToAction}`;
        return { content: [{ type: "text", text: response }] };
    }
    // ── Tool: calculate_cycle_phase ───────────────────────────────────────────
    if (name === "calculate_cycle_phase") {
        let day;
        if (args.cycle_day !== undefined) {
            day = args.cycle_day;
        }
        else if (args.last_period_date) {
            const periodDate = new Date(args.last_period_date);
            if (isNaN(periodDate.getTime())) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: Invalid date format. Use YYYY-MM-DD.",
                        },
                    ],
                    isError: true,
                };
            }
            day = (0, cycleLogic_js_1.cycleDay)(periodDate);
        }
        else {
            return {
                content: [
                    { type: "text", text: "Error: Provide either last_period_date or cycle_day." },
                ],
                isError: true,
            };
        }
        const irregular = args.irregular_cycle ?? false;
        const phase = (0, cycleLogic_js_1.phaseFromCycleDay)(day, irregular);
        const phaseLabels = {
            menstrual: "Menstrual Phase (Days 1–5)",
            follicular: "Follicular Phase (Days 6–13)",
            ovulatory: "Ovulatory Phase (Days 14–16)",
            luteal_early: "Early Luteal Phase (Days 17–23)",
            luteal_late: "Late Luteal Phase (Days 24–28)",
            irregular: "Irregular Cycle",
            unknown: "Unknown",
        };
        const response = `**Cycle Day:** ${day}
**Current Phase:** ${phaseLabels[phase]}

Use \`get_workout_recommendation\` with this data to get today's training plan.`;
        return { content: [{ type: "text", text: response }] };
    }
    return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Tempo MCP server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
