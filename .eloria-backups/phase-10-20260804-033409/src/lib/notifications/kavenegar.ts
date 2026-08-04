export type SmsResult = { configured: boolean; successful: boolean; messageId?: string; message: string };
function config() { return { apiKey: process.env.KAVENEGAR_API_KEY?.trim() ?? "", sender: process.env.KAVENEGAR_SENDER?.trim() ?? "" }; }
export function isKavenegarConfigured() { return config().apiKey.length >= 16; }
export async function sendSms(receptor: string, message: string, localId?: string): Promise<SmsResult> {
  const { apiKey, sender } = config();
  if (!isKavenegarConfigured()) return { configured: false, successful: false, message: "سامانه پیامک پیکربندی نشده است." };
  const params = new URLSearchParams({ receptor, message });
  if (sender) params.set("sender", sender);
  if (localId && /^\d+$/.test(localId)) params.set("localid", localId);
  try {
    const response = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params, cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as { return?: { status?: number; message?: string }; entries?: Array<{ messageid?: number | string }> } | null;
    const status = Number(payload?.return?.status ?? response.status);
    if (!response.ok || status !== 200) return { configured: true, successful: false, message: String(payload?.return?.message ?? "ارسال پیامک ناموفق بود.") };
    return { configured: true, successful: true, messageId: payload?.entries?.[0]?.messageid === undefined ? undefined : String(payload.entries[0].messageid), message: "پیامک ارسال شد." };
  } catch (error) { return { configured: true, successful: false, message: error instanceof Error ? error.message : "خطای ارتباط با سامانه پیامک." }; }
}
