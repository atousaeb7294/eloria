export async function register() {
  if (
    process.env.NEXT_RUNTIME ===
    "nodejs"
  ) {
    /*
     * CI validates the complete Production contract in an explicit
     * check:env step. The following marker only suppresses the duplicate
     * startup assertion during `next build`, where the CI PostgreSQL service
     * intentionally uses non-TLS localhost settings.
     *
     * In a real Production runtime this escape hatch is ignored unless both
     * CI=true and the marker are present.
     */
    const validatedCiBuild =
      process.env.CI === "true" &&
      process.env
        .ELORIA_CI_BUILD_ENV_ASSERTED ===
        "true";

    if (!validatedCiBuild) {
      const {
        assertProductionEnvironment,
      } = await import(
        "@/lib/env-validation"
      );

      assertProductionEnvironment();
    }
  }
}
