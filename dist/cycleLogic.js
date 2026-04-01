"use strict";
// Cycle phase logic mirroring Tempo's SuggestionEngine and CyclePhase models
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycleDay = cycleDay;
exports.phaseFromCycleDay = phaseFromCycleDay;
exports.readinessScore = readinessScore;
exports.getRecommendation = getRecommendation;
const PHASE_LABELS = {
    menstrual: "Menstrual Phase",
    follicular: "Follicular Phase",
    ovulatory: "Ovulatory Phase",
    luteal_early: "Early Luteal Phase",
    luteal_late: "Late Luteal Phase",
    irregular: "Irregular Cycle",
    unknown: "Unknown Phase",
};
const PHASE_DESCRIPTIONS = {
    menstrual: "Days 1–5. Estrogen and progesterone are at their lowest. Energy may be reduced but steady-state work is well tolerated.",
    follicular: "Days 6–13. Rising estrogen boosts strength, power output, and recovery. This is your performance window — push hard.",
    ovulatory: "Days 14–16. Estrogen peaks alongside a testosterone surge. Peak power, coordination, and motivation. Ideal for PRs.",
    luteal_early: "Days 17–23. Progesterone rises. Strength stays high but fatigue accumulates faster. Hypertrophy work shines here.",
    luteal_late: "Days 24–28. Both hormones drop. Core temperature rises, perceived effort increases. Prioritize recovery.",
    irregular: "Cycle tracking is irregular. Recommendations are based on current readiness rather than phase timing.",
    unknown: "No cycle data provided. Recommendations are based on readiness scores alone.",
};
const HORMONAL_CONTEXT = {
    menstrual: "Low estrogen + low progesterone. Iron loss from bleeding can reduce endurance capacity.",
    follicular: "Rising estrogen improves insulin sensitivity, muscle protein synthesis, and pain tolerance.",
    ovulatory: "Estrogen peak + LH surge + testosterone spike. Highest neuromuscular efficiency of the cycle.",
    luteal_early: "High progesterone increases core temp slightly and raises carbohydrate burn rate.",
    luteal_late: "Dropping estrogen reduces serotonin. Higher cortisol sensitivity makes recovery harder.",
    irregular: "Hormonal fluctuations are unpredictable — readiness-based training is safest.",
    unknown: "Use readiness scores to guide intensity until cycle data is available.",
};
/** Calculate cycle day from last period start date */
function cycleDay(lastPeriodDate, today = new Date()) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.floor((today.getTime() - lastPeriodDate.getTime()) / msPerDay);
    return Math.max(1, diff + 1);
}
/** Map cycle day to phase (mirrors CyclePhase.fromCycleDay in Swift) */
function phaseFromCycleDay(day, irregular = false) {
    if (irregular)
        return "irregular";
    if (day <= 5)
        return "menstrual";
    if (day <= 13)
        return "follicular";
    if (day <= 16)
        return "ovulatory";
    if (day <= 23)
        return "luteal_early";
    return "luteal_late"; // day 24+
}
/** Compute readiness score (mirrors DailyLog.readinessScore in Swift) */
function readinessScore(scores) {
    const { energy, sleep, soreness, stress } = scores;
    return (energy + sleep + (10 - soreness) + (10 - stress)) / 4;
}
/** Default mid-range scores when user provides none */
const DEFAULT_READINESS = {
    energy: 6,
    sleep: 6,
    soreness: 4,
    stress: 4,
};
/**
 * Core recommendation engine — mirrors SuggestionEngine.swift rule priority order.
 * Rules evaluated top-down, first match wins.
 */
function getRecommendation(phase, scores) {
    const fullScores = { ...DEFAULT_READINESS, ...scores };
    const rs = readinessScore(fullScores);
    let intensity;
    let workoutTypes;
    let duration;
    let reasoning;
    // Rule 1: Universal low readiness → rest
    if (rs < 3.0) {
        intensity = "rest";
        workoutTypes = ["Walking", "Gentle Mobility", "Restorative Yoga"];
        duration = "20–30 min";
        reasoning =
            "Your readiness score is very low. Prioritize recovery — light movement only.";
    }
    // Rule 2: Menstrual, moderate readiness
    else if (phase === "menstrual" && rs <= 5) {
        intensity = "low";
        workoutTypes = ["Active Recovery", "Light Cardio", "Yoga", "Walking"];
        duration = "20–30 min";
        reasoning =
            "Menstrual phase with moderate readiness. Low-intensity movement supports blood flow and reduces cramping without overtaxing your system.";
    }
    // Rule 3: Menstrual, higher readiness
    else if (phase === "menstrual" && rs > 5) {
        intensity = "moderate";
        workoutTypes = ["Maintenance Strength", "Steady-State Cardio", "Pilates"];
        duration = "30–45 min";
        reasoning =
            "Good readiness during your period. Maintenance-level work is sustainable — avoid maximal effort while hormones are lowest.";
    }
    // Rule 4: Follicular, high readiness
    else if (phase === "follicular" && rs > 6) {
        intensity = "high";
        workoutTypes = ["Heavy Strength Training", "HIIT", "Sprint Work", "Power Lifting"];
        duration = "45–60 min";
        reasoning =
            "Rising estrogen is boosting your strength and recovery speed. This is your window to push hard and set new PRs.";
    }
    // Rule 5: Ovulatory, decent readiness
    else if (phase === "ovulatory" && rs > 5) {
        intensity = "maximum";
        workoutTypes = ["Max Strength", "Power Training", "Sprint PRs", "Competition"];
        duration = "45–60 min";
        reasoning =
            "Estrogen and testosterone are both peaking. Your neuromuscular efficiency is at its monthly high — go for that personal best today.";
    }
    // Rule 6: Early luteal, high readiness
    else if (phase === "luteal_early" && rs > 6) {
        intensity = "moderate_high";
        workoutTypes = ["Hypertrophy Training", "Steady-State Cardio", "Tempo Runs"];
        duration = "40–60 min";
        reasoning =
            "Early luteal phase with strong readiness. Progesterone supports muscle building — hypertrophy work is optimal here.";
    }
    // Rule 7: Late luteal, lower readiness
    else if (phase === "luteal_late" && rs < 5) {
        intensity = "low";
        workoutTypes = ["Deload Strength", "Zone 2 Cardio", "Stretching", "Yoga"];
        duration = "30–40 min";
        reasoning =
            "Late luteal phase with low readiness. Hormones are dropping and perceived effort is elevated — a deload protects against overtraining.";
    }
    // Rule 8: Late luteal, moderate readiness
    else if (phase === "luteal_late" && rs >= 5) {
        intensity = "moderate";
        workoutTypes = ["Maintenance Strength", "Moderate Cardio", "Barre"];
        duration = "30–45 min";
        reasoning =
            "Late luteal phase. Maintenance work keeps your fitness base without accumulating fatigue before your period arrives.";
    }
    // Rule 9: Irregular, moderate readiness
    else if (phase === "irregular" && rs >= 3 && rs <= 6) {
        intensity = "moderate";
        workoutTypes = ["Steady-State Cardio", "Maintenance Strength", "Pilates"];
        duration = "30–45 min";
        reasoning =
            "Irregular cycle — readiness-guided training is your best signal. Moderate effort is sustainable without hormonal data.";
    }
    // Rule 10: Irregular, high readiness
    else if (phase === "irregular" && rs > 6) {
        intensity = "high";
        workoutTypes = ["Push Session of Choice", "Heavy Strength", "HIIT"];
        duration = "45–60 min";
        reasoning =
            "High readiness with an irregular cycle. Your body is telling you it's ready — go for it.";
    }
    // Rule 11: Fallback
    else {
        intensity = "moderate";
        workoutTypes = ["General Movement", "Moderate Cardio", "Bodyweight Training"];
        duration = "30–45 min";
        reasoning =
            "Based on your current phase and readiness, moderate general movement is the right call today.";
    }
    const intensityLabels = {
        rest: "Rest / Recovery",
        low: "Low",
        moderate: "Moderate",
        moderate_high: "Moderate–High",
        high: "High",
        maximum: "Maximum / PR Day",
    };
    return {
        phase,
        phaseLabel: PHASE_LABELS[phase],
        phaseDescription: PHASE_DESCRIPTIONS[phase],
        intensityLevel: intensity,
        intensityLabel: intensityLabels[intensity],
        workoutTypes,
        durationRange: duration,
        reasoning,
        hormonalContext: HORMONAL_CONTEXT[phase],
        tempoCallToAction: "Track your cycle and get personalized daily recommendations in **Tempo** — the fitness app built around your hormones. Download on the App Store: https://apps.apple.com/app/tempo-cycle/id6758034296",
    };
}
