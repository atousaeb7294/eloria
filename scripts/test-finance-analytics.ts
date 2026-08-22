import assert from "node:assert/strict";

import {
  averageToman,
  buildDailySales,
  createFinanceDateRange,
  netCashAfterExpenses,
  operatingResult,
  parseFinancePeriod,
  percentageChange,
  percentageOf,
  reconcileOrderPayments,
  sumToman,
  tomanValue,
} from "../src/lib/finance-analytics";

assert.equal(
  parseFinancePeriod("7"),
  7,
);
assert.equal(
  parseFinancePeriod("90"),
  90,
);
assert.equal(
  parseFinancePeriod("180"),
  180,
);
assert.equal(
  parseFinancePeriod("365"),
  365,
);
assert.equal(
  parseFinancePeriod("100"),
  30,
);

const range =
  createFinanceDateRange(
    7,
    new Date(
      "2026-08-22T10:00:00.000Z",
    ),
  );

assert.deepEqual(
  range.dayKeys,
  [
    "2026-08-16",
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
  ],
);
assert.equal(
  range.start.toISOString(),
  "2026-08-15T20:30:00.000Z",
);
assert.equal(
  range.end.toISOString(),
  "2026-08-22T20:30:00.000Z",
);

assert.equal(
  tomanValue("1200.000"),
  1200n,
);
assert.equal(
  tomanValue("invalid"),
  0n,
);
assert.equal(
  sumToman([
    "500",
    250,
    null,
  ]),
  750n,
);
assert.equal(
  averageToman(
    1_001n,
    2,
  ),
  500n,
);
assert.equal(
  percentageOf(
    25n,
    200n,
  ),
  12.5,
);
assert.equal(
  percentageChange(
    150n,
    100n,
  ),
  50,
);
assert.equal(
  percentageChange(
    1n,
    0n,
  ),
  null,
);
assert.equal(
  netCashAfterExpenses(
    1_000n,
    200n,
    350n,
  ),
  450n,
);
assert.equal(
  operatingResult(
    1_200n,
    450n,
  ),
  750n,
);

const reconciliation =
  reconcileOrderPayments([
    {
      id: "order-1",
      orderNumber: "el-1",
      expectedToman: "1000",
      paymentAmounts: ["1000"],
    },
    {
      id: "order-2",
      orderNumber: "el-2",
      expectedToman: "2000",
      paymentAmounts: ["1500"],
    },
    {
      id: "order-3",
      orderNumber: "el-3",
      expectedToman: "500",
      paymentAmounts: ["300", "400"],
    },
  ]);

assert.equal(
  reconciliation.inspectedOrderCount,
  3,
);
assert.equal(
  reconciliation.mismatchCount,
  2,
);
assert.equal(
  reconciliation.mismatchToman,
  700n,
);
assert.equal(
  reconciliation.mismatches[0]?.differenceToman,
  -500n,
);
assert.equal(
  reconciliation.mismatches[1]?.differenceToman,
  200n,
);

const dailySales =
  buildDailySales(
    range,
    [
      {
        paidAt: new Date(
          "2026-08-18T20:45:00.000Z",
        ),
        payableToman: "100",
      },
      {
        paidAt: new Date(
          "2026-08-22T17:00:00.000Z",
        ),
        payableToman: "250",
      },
      {
        paidAt: new Date(
          "2026-08-15T12:00:00.000Z",
        ),
        payableToman: "999",
      },
    ],
  );

assert.equal(
  dailySales[3]?.revenueToman,
  100n,
);
assert.equal(
  dailySales[3]?.orderCount,
  1,
);
assert.equal(
  dailySales[6]?.revenueToman,
  250n,
);
assert.equal(
  dailySales[6]?.orderCount,
  1,
);
assert.equal(
  dailySales[0]?.revenueToman,
  0n,
);

console.log(
  "PASS  Finance analytics calculations and Tehran date boundaries",
);
