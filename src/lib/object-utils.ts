
/**
 * Safely retrieves a nested value from an object using a dot-notation path.
 * @param obj The object to query
 * @param path The dot-notation path (e.g., "employee.email")
 * @returns The value at the path, or undefined if not found
 */
export function getDeepValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    return path.split('.').reduce((acc, part) => {
        return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
}
