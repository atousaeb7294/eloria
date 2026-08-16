export function siteBaseUrl(): URL {
  const configured =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim();

  if (configured) {
    const parsed =
      new URL(configured);

    if (
      process.env.NODE_ENV ===
        "production" &&
      parsed.protocol !==
        "https:"
    ) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL در Production باید HTTPS باشد.",
      );
    }

    return parsed;
  }

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL در Production تنظیم نشده است.",
    );
  }

  return new URL(
    "http://localhost:3000",
  );
}
