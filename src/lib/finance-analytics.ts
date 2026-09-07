export const financePeriods = [
  7,
  30,
  90,
  180,
  365,
] as const;

export type FinancePeriod =
  (typeof financePeriods)[number];

export type FinanceDateRange = {
  days: FinancePeriod;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  dayKeys: string[];
};

export type MoneyLike =
  | {
      toString(): string;
    }
  | string
  | number
  | bigint
  | null
  | undefined;

export type DailySaleInput = {
  paidAt: Date | null;
  payableToman: MoneyLike;
};

export type DailySalesPoint = {
  key: string;
  label: string;
  revenueToman: bigint;
  orderCount: number;
};

export type ReconciliationOrderInput = {
  id: string;
  orderNumber: string;
  expectedToman: MoneyLike;
  paymentAmounts: MoneyLike[];
};

export type PaymentReconciliationMismatch = {
  id: string;
  orderNumber: string;
  expectedToman: bigint;
  receivedToman: bigint;
  differenceToman: bigint;
};

const businessTimeZone =
  "Asia/Tehran";

const dayFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: businessTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

const dateTimeFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: businessTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    },
  );

type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

function partNumber(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const value =
    parts.find(
      part =>
        part.type ===
        type,
    )?.value;

  if (!value) {
    throw new Error(
      `Missing date part: ${type}`,
    );
  }

  return Number(value);
}

function calendarDayAt(
  value: Date,
): CalendarDay {
  const parts =
    dayFormatter.formatToParts(
      value,
    );

  return {
    year: partNumber(
      parts,
      "year",
    ),
    month: partNumber(
      parts,
      "month",
    ),
    day: partNumber(
      parts,
      "day",
    ),
  };
}

function dateTimePartsAt(
  value: Date,
) {
  const parts =
    dateTimeFormatter.formatToParts(
      value,
    );

  return {
    year: partNumber(
      parts,
      "year",
    ),
    month: partNumber(
      parts,
      "month",
    ),
    day: partNumber(
      parts,
      "day",
    ),
    hour: partNumber(
      parts,
      "hour",
    ),
    minute: partNumber(
      parts,
      "minute",
    ),
    second: partNumber(
      parts,
      "second",
    ),
  };
}

function timeZoneOffsetMilliseconds(
  value: Date,
): number {
  const parts =
    dateTimePartsAt(
      value,
    );

  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  ) - value.getTime();
}

function dayStartInBusinessTimeZone(
  day: CalendarDay,
): Date {
  const nominalUtc =
    Date.UTC(
      day.year,
      day.month - 1,
      day.day,
    );

  const firstPass =
    new Date(
      nominalUtc -
        timeZoneOffsetMilliseconds(
          new Date(nominalUtc),
        ),
    );

  return new Date(
    nominalUtc -
      timeZoneOffsetMilliseconds(
        firstPass,
      ),
  );
}

function addCalendarDays(
  day: CalendarDay,
  amount: number,
): CalendarDay {
  const result =
    new Date(
      Date.UTC(
        day.year,
        day.month - 1,
        day.day + amount,
      ),
    );

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function dayKey(
  day: CalendarDay,
): string {
  return [
    day.year.toString().padStart(4, "0"),
    day.month.toString().padStart(2, "0"),
    day.day.toString().padStart(2, "0"),
  ].join("-");
}

function parseDayKey(
  value: string,
): CalendarDay {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    throw new RangeError(
      "Invalid finance day key.",
    );
  }

  const day = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };

  const check =
    new Date(
      Date.UTC(
        day.year,
        day.month - 1,
        day.day,
      ),
    );

  if (
    check.getUTCFullYear() !==
      day.year ||
    check.getUTCMonth() + 1 !==
      day.month ||
    check.getUTCDate() !==
      day.day
  ) {
    throw new RangeError(
      "Invalid finance calendar day.",
    );
  }

  return day;
}

export function parseFinancePeriod(
  value: string | undefined,
): FinancePeriod {
  const numeric =
    Number(value);

  return financePeriods.includes(
    numeric as FinancePeriod,
  )
    ? numeric as FinancePeriod
    : 30;
}

export function createFinanceDateRange(
  days: FinancePeriod,
  now = new Date(),
): FinanceDateRange {
  const today =
    calendarDayAt(now);

  const startDay =
    addCalendarDays(
      today,
      -(days - 1),
    );

  const endDay =
    addCalendarDays(
      today,
      1,
    );

  const previousStartDay =
    addCalendarDays(
      startDay,
      -days,
    );

  const dayKeys =
    Array.from(
      {
        length: days,
      },
      (_, index) =>
        dayKey(
          addCalendarDays(
            startDay,
            index,
          ),
        ),
    );

  return {
    days,
    start: dayStartInBusinessTimeZone(startDay),
    end: dayStartInBusinessTimeZone(endDay),
    previousStart:
      dayStartInBusinessTimeZone(
        previousStartDay,
      ),
    previousEnd:
      dayStartInBusinessTimeZone(
        startDay,
      ),
    dayKeys,
  };
}

export function formatFinancePeriod(
  period: FinancePeriod,
): string {
  const labels: Record<
    FinancePeriod,
    string
  > = {
    7: "۷ روز اخیر",
    30: "۳۰ روز اخیر",
    90: "۹۰ روز اخیر",
    180: "۶ ماه اخیر",
    365: "سال اخیر",
  };

  return labels[period];
}

export function formatFinanceDayLabel(
  key: string,
): string {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: businessTimeZone,
      month: "short",
      day: "numeric",
    },
  ).format(
    dayStartInBusinessTimeZone(
      parseDayKey(key),
    ),
  );
}

export function tomanValue(
  value: MoneyLike,
): bigint {
  if (
    value === null ||
    value === undefined
  ) {
    return 0n;
  }

  const integer =
    value
      .toString()
      .trim()
      .split(".")[0];

  if (
    !integer ||
    !/^-?\d+$/.test(
      integer,
    )
  ) {
    return 0n;
  }

  return BigInt(integer);
}

export function sumToman(
  values: MoneyLike[],
): bigint {
  return values.reduce<bigint>(
    (total, value) =>
      total +
      tomanValue(value),
    0n,
  );
}

export function averageToman(
  total: bigint,
  count: number,
): bigint {
  if (
    count <= 0
  ) {
    return 0n;
  }

  return total /
    BigInt(count);
}

// These calculations intentionally use integer Toman values. Financial
// balances must never depend on floating-point arithmetic.
export function netCashAfterExpenses(
  receivedToman: bigint,
  refundedToman: bigint,
  expenseToman: bigint,
): bigint {
  return receivedToman -
    refundedToman -
    expenseToman;
}

// `profitToman` is the margin captured when an order is priced. This is not
// a substitute for statutory net profit, but it is the correct base for an
// operating-result signal once externally recorded operating costs are known.
export function operatingResult(
  recordedPriceMarginToman: bigint,
  operatingExpenseToman: bigint,
): bigint {
  return recordedPriceMarginToman -
    operatingExpenseToman;
}

export function reconcileOrderPayments(
  orders: ReconciliationOrderInput[],
) {
  const mismatches =
    orders
      .map(order => {
        const expectedToman =
          tomanValue(
            order.expectedToman,
          );

        const receivedToman =
          sumToman(
            order.paymentAmounts,
          );

        return {
          id: order.id,
          orderNumber:
            order.orderNumber,
          expectedToman,
          receivedToman,
          differenceToman:
            receivedToman -
            expectedToman,
        };
      })
      .filter(
        order =>
          order.differenceToman !== 0n,
      );

  return {
    inspectedOrderCount:
      orders.length,
    mismatchCount:
      mismatches.length,
    mismatchToman: mismatches.reduce(
      (total, order) =>
        total +
        (order.differenceToman < 0n
          ? -order.differenceToman
          : order.differenceToman),
      0n,
    ),
    mismatches,
  };
}

export function percentageOf(
  value: bigint,
  total: bigint,
): number | null {
  if (
    total <= 0n
  ) {
    return null;
  }

  return Number(
    (value * 10_000n) /
      total,
  ) / 100;
}

export function percentageChange(
  current: bigint,
  previous: bigint,
): number | null {
  if (
    previous === 0n
  ) {
    return null;
  }

  return Number(
    ((current - previous) *
      10_000n) /
      previous,
  ) / 100;
}

export function buildDailySales(
  range: FinanceDateRange,
  orders: DailySaleInput[],
): DailySalesPoint[] {
  const totals =
    new Map<
      string,
      {
        revenueToman: bigint;
        orderCount: number;
      }
    >(
      range.dayKeys.map(
        key => [
          key,
          {
            revenueToman: 0n,
            orderCount: 0,
          },
        ],
      ),
    );

  for (
    const order of orders
  ) {
    if (!order.paidAt) {
      continue;
    }

    const total =
      totals.get(
        dayKey(
          calendarDayAt(
            order.paidAt,
          ),
        ),
      );

    if (!total) {
      continue;
    }

    total.revenueToman +=
      tomanValue(
        order.payableToman,
      );
    total.orderCount += 1;
  }

  return range.dayKeys.map(
    key => {
      const total =
        totals.get(key) ?? {
          revenueToman: 0n,
          orderCount: 0,
        };

      return {
        key,
        label:
          formatFinanceDayLabel(
            key,
          ),
        ...total,
      };
    },
  );
}
