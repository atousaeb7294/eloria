import assert from "node:assert/strict";

import {
  measurementRouteEvent,
  normalizeSiteMeasurementEvent,
} from "@/lib/site-measurement";

const event = normalizeSiteMeasurementEvent({
  event_key: "smartoperationscheck0001",
  event_type: "web_vital",
  locale: "fa",
  path: "/fa/products/eloria-ring",
  session_id: "smartoperationssession0001",
  metric_name: "LCP",
  metric_value: 2450,
  metric_rating: "good",
  navigation_type: "navigate",
  occurred_at: new Date().toISOString(),
});

assert.ok(event, "valid consented web vital must normalize");
assert.equal(event?.metricName, "LCP");
assert.equal(measurementRouteEvent("/fa/checkout"), "begin_checkout");
assert.equal(measurementRouteEvent("/en/products/eloria-ring"), "view_item");
assert.equal(
  normalizeSiteMeasurementEvent({
    event_key: "smartoperationscheck0002",
    event_type: "page_view",
    locale: "fa",
    path: "/fa/products/eloria-ring?mobile=0912",
    session_id: "smartoperationssession0002",
  }),
  null,
  "query strings must never enter privacy-first telemetry",
);
assert.equal(
  normalizeSiteMeasurementEvent({
    event_key: "smartoperationscheck0003",
    event_type: "web_vital",
    locale: "fa",
    path: "/fa",
    session_id: "smartoperationssession0003",
    metric_name: "LCP",
    metric_value: -1,
    metric_rating: "good",
  }),
  null,
  "invalid web vital values must be rejected",
);

console.log("PASS  Smart operations measurement contracts");
