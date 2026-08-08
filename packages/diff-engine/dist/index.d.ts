export type Severity = "info" | "warning" | "breaking";
export type DiffChangeType = "added" | "removed" | "changed" | "type_changed" | "nullability_changed" | "status_changed" | "header_changed" | "contract_violation";
export interface DiffChange {
    id: string;
    path: string;
    type: DiffChangeType;
    severity: Severity;
    oldValue?: unknown;
    newValue?: unknown;
    oldType?: string;
    newType?: string;
    message: string;
}
export interface CompareJsonOptions {
    ignorePaths?: string[];
    path?: string;
    /** When true, skip leaf value changes; keep added/removed/type/nullability. */
    schemaOnly?: boolean;
    /**
     * Match object array items by identity keys instead of index.
     * Default true. Falls back to index when items lack stable keys.
     */
    arrayIdentity?: boolean;
}
/**
 * Compare HTTP status codes.
 * Same class (e.g. 200→201) is warning; class change (2xx→4xx) is breaking.
 */
export declare function compareStatusCodes(oldStatus: number, newStatus: number): DiffChange | null;
/** Deep-compare two JSON values and return a list of field-level changes. */
export declare function compareJson(oldValue: unknown, newValue: unknown, options?: CompareJsonOptions): DiffChange[];
export declare function summarizeChanges(changes: DiffChange[]): {
    breakingCount: number;
    warningCount: number;
    infoCount: number;
    added: number;
    removed: number;
    changed: number;
};
