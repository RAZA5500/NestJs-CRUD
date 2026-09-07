export enum AttendanceStatus {
    Present = "PRESENT",
    Absent = "ABSENT",
    HalfDay = "HALF_DAY",
}

export const DAY_TYPE = {
    FULL: "Full Day",
    THREE_QUARTER: "Three Quarter Day",
    HALF: "Half Day",
    SHORT: "Short Day",
} as const;

export function computeDayType(workingHours: number): string {
    if (workingHours >= 7) return DAY_TYPE.FULL;
    if (workingHours >= 5) return DAY_TYPE.THREE_QUARTER;
    if (workingHours >= 3) return DAY_TYPE.HALF;
    return DAY_TYPE.SHORT;
}

/**
 * Longest a single shift can ever be credited. Someone who checks in and then
 * closes the tab is not paid for the night — their day is capped here.
 * Override with the MAX_SHIFT_HOURS env var.
 */
export const MAX_SHIFT_HOURS = Number(process.env.MAX_SHIFT_HOURS) || 12;

export function endOfDay(date: Date): Date {
    const d = startOfDay(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * When a session nobody closed should be considered over: after a full shift,
 * or at midnight of the day it started — whichever comes first.
 */
export function autoCheckOutTime(checkIn: Date): Date {
    const cappedShift = new Date(
        checkIn.getTime() + MAX_SHIFT_HOURS * 60 * 60 * 1000,
    );
    const dayEnd = endOfDay(checkIn);

    return cappedShift < dayEnd ? cappedShift : dayEnd;
}

export function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export type AwaySpan = { start: Date; end?: Date | null };

/** The stretch the employee is away for right now, if any. */
export function findOpenAwayPeriod<T extends AwaySpan>(
    periods: T[] = [],
): T | undefined {
    return periods.find((period) => !period.end);
}

/**
 * Hours spent away. A period that is still open counts up to `until` when one
 * is given (check-out time), and is ignored otherwise — the stored total only
 * ever covers time the employee has actually come back from.
 */
export function sumAwayHours(periods: AwaySpan[] = [], until?: Date): number {
    const limit = until ? new Date(until).getTime() : null;

    const totalMs = periods.reduce((ms, period) => {
        const periodEnd = period.end ? new Date(period.end).getTime() : limit;
        if (periodEnd === null) return ms;

        // never past `until`: an auto check-out can land before a break ended
        const end = limit === null ? periodEnd : Math.min(periodEnd, limit);
        const span = end - new Date(period.start).getTime();
        return ms + Math.max(0, span);
    }, 0);

    return totalMs / (1000 * 60 * 60);
}

/** Hours, rounded the way they are stored on a record. */
export function roundHours(hours: number): number {
    return Math.round(hours * 100) / 100;
}
