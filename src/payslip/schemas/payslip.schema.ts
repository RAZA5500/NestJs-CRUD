import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type PayslipDocument = HydratedDocument<Payslip>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Payslip {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 12 })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, min: 0 })
  basicSalary: number;

  @Prop({ default: 0, min: 0 })
  allowances: number;

  @Prop({ default: 0, min: 0 })
  deductions: number;

  @Prop({ required: true })
  netSalary: number;
}

export const PayslipSchema = SchemaFactory.createForClass(Payslip);
PayslipSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
