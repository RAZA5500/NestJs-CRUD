import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { EmploymentStatus } from '../employee.types.js';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Employee {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true, min: 0 })
  basicSalary: number;

  @Prop({ default: 0, min: 0 })
  allowances: number;

  @Prop({ default: 0, min: 0 })
  deductions: number;

  @Prop({ enum: EmploymentStatus, default: EmploymentStatus.Active })
  employmentStatus: string;

  @Prop({ required: true })
  joinDate: Date;

  @Prop({ default: '' })
  bio: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
