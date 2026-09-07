import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AttendanceStatus } from '../attendance.types.js';

export type AttendanceDocument = HydratedDocument<Attendance>;

/**
 * One stretch of the day the employee stepped out for. `end` is missing while
 * they are still away — that is what "currently away" means.
 */
@Schema({ _id: false })
export class AwayPeriod {
  @Prop({ required: true })
  start: Date;

  @Prop()
  end?: Date;
}

export const AwayPeriodSchema = SchemaFactory.createForClass(AwayPeriod);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Attendance {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  checkIn: Date;

  @Prop()
  checkOut?: Date;

  @Prop({ enum: AttendanceStatus, default: AttendanceStatus.Present })
  status: string;

  @Prop()
  workingHours?: number;

  @Prop()
  dayType?: string;

  @Prop({ type: [AwayPeriodSchema], default: [] })
  awayPeriods: AwayPeriod[];

  // Set when the system closed the day itself, because the employee never
  // checked out. Their hours are the capped estimate, not a real check-out.
  @Prop({ default: false })
  autoCheckOut: boolean;

  // Time excluded from workingHours. Counts finished away periods only, so an
  // open one is never baked into a stale number.
  @Prop({ default: 0 })
  awayHours: number;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
