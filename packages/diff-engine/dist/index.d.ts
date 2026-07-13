export type Severity = "info" | "warning" | "breaking";
export type DiffChangeType = "added" | "removed" | "changed" | "type_changed" | "status_changed" | "header_changed";
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
/** Deep-compare two JSON values and return a list of field-level changes. */
export declare function compareJson(oldValue: unknown, newValue: unknown, options?: {
    ignorePaths?: string[];
    path?: string;
}): DiffChange[];
export declare function summarizeChanges(changes: DiffChange[]): {
    breakingCount: number;
    warningCount: number;
    infoCount: number;
    added: number;
    removed: number;
    changed: number;
};
