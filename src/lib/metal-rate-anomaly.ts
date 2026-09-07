export type MetalMaterial =
  | "GOLD"
  | "SILVER";

export type MetalRateAnomalyDecision = {
  safe: boolean;
  reason:
    | "OK"
    | "OUTSIDE_ABSOLUTE_RANGE"
    | "DEVIATION_TOO_HIGH"
    | "INVALID_RATE";
  deviationPercent: number | null;
  minimumToman: number;
  maximumToman: number;
  maximumDeviationPercent: number;
};

function envNumber(
  name: string,
  fallback: number,
): number {
  const raw = Number(
    process.env[name]?.trim() ?? "",
  );

  return Number.isFinite(raw) && raw > 0
    ? raw
    : fallback;
}

function policy(
  material: MetalMaterial,
) {
  if (material === "GOLD") {
    return {
      minimumToman: envNumber(
        "ELORIA_GOLD_RATE_MIN_TOMAN",
        1_000_000,
      ),
      maximumToman: envNumber(
        "ELORIA_GOLD_RATE_MAX_TOMAN",
        1_000_000_000,
      ),
      maximumDeviationPercent: Math.min(
        envNumber(
          "ELORIA_GOLD_RATE_MAX_DEVIATION_PERCENT",
          12,
        ),
        100,
      ),
    };
  }

  return {
    minimumToman: envNumber(
      "ELORIA_SILVER_RATE_MIN_TOMAN",
      1_000,
    ),
    maximumToman: envNumber(
      "ELORIA_SILVER_RATE_MAX_TOMAN",
      10_000_000,
    ),
    maximumDeviationPercent: Math.min(
      envNumber(
        "ELORIA_SILVER_RATE_MAX_DEVIATION_PERCENT",
        20,
      ),
      100,
    ),
  };
}

export function assessMetalRateAnomaly(input: {
  material: MetalMaterial;
  incomingPricePerGramToman: number;
  currentPricePerGramToman?: number | null;
}): MetalRateAnomalyDecision {
  const currentPolicy =
    policy(input.material);
  const incoming =
    input.incomingPricePerGramToman;

  if (
    !Number.isSafeInteger(incoming) ||
    incoming <= 0
  ) {
    return {
      safe: false,
      reason: "INVALID_RATE",
      deviationPercent: null,
      ...currentPolicy,
    };
  }

  if (
    incoming <
      currentPolicy.minimumToman ||
    incoming >
      currentPolicy.maximumToman
  ) {
    return {
      safe: false,
      reason:
        "OUTSIDE_ABSOLUTE_RANGE",
      deviationPercent: null,
      ...currentPolicy,
    };
  }

  const current =
    input.currentPricePerGramToman;

  if (
    current === null ||
    current === undefined ||
    !Number.isFinite(current) ||
    current <= 0
  ) {
    return {
      safe: true,
      reason: "OK",
      deviationPercent: null,
      ...currentPolicy,
    };
  }

  const deviationPercent =
    Math.abs(incoming - current) /
    current *
    100;

  if (
    deviationPercent >
    currentPolicy.maximumDeviationPercent
  ) {
    return {
      safe: false,
      reason:
        "DEVIATION_TOO_HIGH",
      deviationPercent,
      ...currentPolicy,
    };
  }

  return {
    safe: true,
    reason: "OK",
    deviationPercent,
    ...currentPolicy,
  };
}
