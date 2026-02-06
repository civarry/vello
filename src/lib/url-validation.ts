/**
 * URL validation utilities for preventing open redirect vulnerabilities.
 */

/**
 * Allowed path prefixes for redirects.
 * Only paths starting with these prefixes are considered safe.
 */
const ALLOWED_PATH_PREFIXES = [
  "/templates",
  "/payslips",
  "/employees",
  "/settings",
  "/invite",
  "/onboarding",
] as const;

/**
 * Validates and sanitizes a redirect URL to prevent open redirect attacks.
 *
 * Security measures:
 * - Only allows paths starting with /
 * - Blocks protocol-relative URLs (//evil.com)
 * - Validates against allowed path prefixes
 * - Returns default path for invalid URLs
 *
 * @param path - The redirect path to validate (from query param)
 * @param defaultPath - Fallback path if validation fails (default: /templates)
 * @returns A safe redirect path
 *
 * @example
 * getSafeRedirectUrl("/settings")           // returns "/settings"
 * getSafeRedirectUrl("https://evil.com")    // returns "/templates"
 * getSafeRedirectUrl("//evil.com")          // returns "/templates"
 * getSafeRedirectUrl(null)                  // returns "/templates"
 */
export function getSafeRedirectUrl(
  path: string | null | undefined,
  defaultPath = "/templates"
): string {
  // Return default if no path provided
  if (!path) {
    return defaultPath;
  }

  // Trim whitespace
  const trimmedPath = path.trim();

  // Block empty paths
  if (!trimmedPath) {
    return defaultPath;
  }

  // Must start with a single forward slash (not //)
  // This blocks absolute URLs and protocol-relative URLs
  if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
    return defaultPath;
  }

  // Block URLs with embedded protocols (javascript:, data:, etc.)
  if (trimmedPath.includes(":")) {
    return defaultPath;
  }

  // Validate against allowed path prefixes
  const isAllowedPath = ALLOWED_PATH_PREFIXES.some(
    (prefix) => trimmedPath === prefix || trimmedPath.startsWith(`${prefix}/`)
  );

  if (!isAllowedPath) {
    return defaultPath;
  }

  return trimmedPath;
}
