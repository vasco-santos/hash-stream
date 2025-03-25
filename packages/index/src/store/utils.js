/**
 * @param {any} input
 * @returns {any}
 */
export function removeUndefinedRecursively(input) {
  if (Array.isArray(input)) {
    // Process arrays recursively but do NOT touch non-undefined values like Uint8Array
    return input.map(removeUndefinedRecursively).filter((v) => v !== undefined)
  }

  if (
    input &&
    typeof input === 'object' &&
    Object.getPrototypeOf(input) === Object.prototype
  ) {
    // Only process plain objects, ignoring things like Uint8Array
    return Object.fromEntries(
      Object.entries(input)
        .map(([key, value]) => [key, removeUndefinedRecursively(value)])
        .filter(([_, value]) => value !== undefined)
    )
  }

  // Return all other types as they are
  return input
}
