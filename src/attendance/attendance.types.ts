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

export function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
