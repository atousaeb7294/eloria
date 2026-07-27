export type MetalRateFreshnessReason =
  | "FRESH"
  | "STALE"
  | "SOURCE_TIME_MISSING"
  | "SOURCE_TIME_INVALID"
  | "SOURCE_TIME_IN_FUTURE";

type SourceTimeUnix =
  | bigint
  | number
  | string
  | null
  | undefined;

type GetMetalRateFreshnessInput = {
  sourceTimeUnix: SourceTimeUnix;
  staleAfterMinutes: number;
  now?: Date;
};

export type MetalRateFreshness = {
  marketTimestamp: Date | null;
  ageSeconds: number | null;
  isStale: boolean;
  reason: MetalRateFreshnessReason;
};

/*
 * Unix timestamps are normally provided in seconds.
 * Some providers return milliseconds instead.
 */
const UNIX_MILLISECONDS_THRESHOLD =
  100_000_000_000;

/*
 * Small clock differences between servers are acceptable.
 * A market timestamp more than 5 minutes in the future is invalid.
 */
const MAX_FUTURE_CLOCK_SKEW_SECONDS =
  5 * 60;

function toFinitePositiveInteger(
  value: SourceTimeUnix,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value === "bigint") {
    if (
      value <= BigInt(0) ||
      value >
        BigInt(
          Number.MAX_SAFE_INTEGER,
        )
    ) {
      return null;
    }

    return Number(value);
  }

  const numericValue =
    typeof value === "string"
      ? Number(value.trim())
      : value;

  if (
    !Number.isFinite(
      numericValue,
    ) ||
    !Number.isInteger(
      numericValue,
    ) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

export function parseSourceTimeUnix(
  value: SourceTimeUnix,
): Date | null {
  const numericValue =
    toFinitePositiveInteger(
      value,
    );

  if (numericValue === null) {
    return null;
  }

  const milliseconds =
    numericValue <
    UNIX_MILLISECONDS_THRESHOLD
      ? numericValue * 1000
      : numericValue;

  if (
    !Number.isSafeInteger(
      milliseconds,
    )
  ) {
    return null;
  }

  const date = new Date(
    milliseconds,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

export function getMetalRateFreshness({
  sourceTimeUnix,
  staleAfterMinutes,
  now = new Date(),
}: GetMetalRateFreshnessInput): MetalRateFreshness {
  const marketTimestamp =
    parseSourceTimeUnix(
      sourceTimeUnix,
    );

  if (!marketTimestamp) {
    return {
      marketTimestamp: null,
      ageSeconds: null,
      isStale: true,
      reason:
        sourceTimeUnix === null ||
        sourceTimeUnix === undefined
          ? "SOURCE_TIME_MISSING"
          : "SOURCE_TIME_INVALID",
    };
  }

  const rawAgeSeconds =
    Math.floor(
      (now.getTime() -
        marketTimestamp.getTime()) /
        1000,
    );

  if (
    rawAgeSeconds <
    -MAX_FUTURE_CLOCK_SKEW_SECONDS
  ) {
    return {
      marketTimestamp,
      ageSeconds: 0,
      isStale: true,
      reason:
        "SOURCE_TIME_IN_FUTURE",
    };
  }

  const ageSeconds = Math.max(
    0,
    rawAgeSeconds,
  );

  const maximumAgeSeconds =
    staleAfterMinutes * 60;

  const isStale =
    !Number.isFinite(
      maximumAgeSeconds,
    ) ||
    maximumAgeSeconds <= 0 ||
    ageSeconds >
      maximumAgeSeconds;

  return {
    marketTimestamp,
    ageSeconds,
    isStale,
    reason: isStale
      ? "STALE"
      : "FRESH",
  };
}
