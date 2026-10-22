let pending: Promise<void> | null = null;

/** Share the official SDK request across forms; failed requests may be retried. */
export function loadTurnstileSdk(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (pending) return pending;
  const request = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("Security verification could not load"));
    };
    const timeout = window.setTimeout(fail, 15_000);
    script.addEventListener("error", fail, { once: true });
    script.addEventListener("load", () => {
      if (!window.turnstile) { fail(); return; }
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
    document.head.appendChild(script);
  });
  pending = request;
  void request.catch(() => { if (pending === request) pending = null; });
  return request;
}
