export const maxCatalogPage =
  1_000;

export function normalizeCatalogPage(
  value: number | undefined,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 1;
  }

  return Math.min(
    maxCatalogPage,
    Math.max(
      1,
      Math.trunc(
        value as number,
      ),
    ),
  );
}
