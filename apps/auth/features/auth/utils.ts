export function getSafeNextPath(value: string | undefined, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
