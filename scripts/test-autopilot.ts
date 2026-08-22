import assert from "node:assert/strict";

import { getContentAutopilotSettings } from "@/lib/content-autopilot";
import {
  dailyBriefingNeedsAttention,
  tehranDateKey,
} from "@/lib/store-autopilot";

assert.deepEqual(getContentAutopilotSettings({}), {
  enabled: true,
  dailyLimit: 1,
});
assert.deepEqual(
  getContentAutopilotSettings({
    ELORIA_CONTENT_AUTOPILOT_ENABLED: "false",
    ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT: "99",
  }),
  { enabled: false, dailyLimit: 3 },
);
assert.deepEqual(
  getContentAutopilotSettings({
    ELORIA_CONTENT_AUTOPILOT_ENABLED: "true",
    ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT: "invalid",
  }),
  { enabled: true, dailyLimit: 1 },
);
assert.equal(
  tehranDateKey(new Date("2026-08-22T20:31:00.000Z")),
  "2026-08-23",
);
assert.equal(
  dailyBriefingNeedsAttention(
    new Date("2026-08-22T00:00:00.000Z"),
    new Date("2026-08-23T05:00:00.000Z"),
  ),
  false,
);
assert.equal(
  dailyBriefingNeedsAttention(
    new Date("2026-08-22T00:00:00.000Z"),
    new Date("2026-08-23T07:00:01.000Z"),
  ),
  true,
);

console.log("PASS  eloria autopilot settings and daily briefing boundaries");
