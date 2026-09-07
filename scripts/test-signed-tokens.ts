import assert from "node:assert/strict";

process.env.ELORIA_TRACKING_SECRET ||= "test-tracking-secret-test-tracking-secret";
process.env.ELORIA_PAYMENT_RECEIPT_SECRET ||= "test-receipt-secret-test-receipt-secret";

async function main() {
  const { createOrderTrackingToken, verifyOrderTrackingToken } = await import("../src/lib/order-tracking-token");
  const { createPaymentReceiptToken, verifyPaymentReceiptToken } = await import("../src/lib/payment-receipt-token");

  const tracking = createOrderTrackingToken("00000000-0000-0000-0000-000000000001");
  assert.equal(verifyOrderTrackingToken(tracking)?.orderId, "00000000-0000-0000-0000-000000000001");
  assert.equal(verifyOrderTrackingToken(`${tracking}x`), null);

  const receipt = createPaymentReceiptToken({
    orderId: "00000000-0000-0000-0000-000000000001",
    attemptId: "00000000-0000-0000-0000-000000000002",
    outcome: "success",
  });
  assert.equal(verifyPaymentReceiptToken(receipt)?.outcome, "success");
  assert.equal(verifyPaymentReceiptToken(receipt.replace(/.$/, value => value === "a" ? "b" : "a")), null);
  console.log("PASS  Signed tracking and payment receipt tokens");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
