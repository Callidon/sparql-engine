/**
 * Perform the union of two sets
 * @param setA - first set
 * @param setB - second set
 * @return The union of the two sets
 */
export function union(setA: Set<number>, setB: Set<number>): Set<number> {
    let union: Set<number> = new Set(setA);
    setB.forEach(function(value) {
        union.add(value);
    });
    return union;
}

/**
 * Return True if the property is a variable, False otherwise
 * @param property - Path subject or Path object
 * @return True if the property is a variable, False otherwise
 */
export function isVariable(property: string): boolean {
    return property.startsWith('?');
}