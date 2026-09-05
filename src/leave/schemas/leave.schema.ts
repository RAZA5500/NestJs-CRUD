import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { LeaveStatus, LeaveType } from '../leave.types.js';

export type LeaveDocument = HydratedDocument<Leave>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Leave {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ enum: LeaveType, required: true })
  type: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  reason: string;

  @Prop({ enum: LeaveStatus, default: LeaveStatus.Pending })
  status: string;
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);
