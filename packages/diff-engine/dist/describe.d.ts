/**
 * A plain-text account of a change list.
 *
 * The change list is the precise record; this is the version a person reads
 * in a notification, or an agent reads before deciding whether to open the
 * full list. It leads with counts, then names the most severe changes —
 * which is the order anyone triaging a break asks about them in.
 *
 * Values are deliberately left out (old and new types are kept): the text
 * travels to places the response body should not, like chat and agent logs.
 */
/** The subset of a change this reads, so callers with their own type fit. */
export interface DescribableChange {
    path: string;
    type: string;
    severity: string;
    oldType?: string;
    newType?: string;
}
export declare function describeChanges(changes: DescribableChange[], options?: {
    limit?: number;
}): string;
