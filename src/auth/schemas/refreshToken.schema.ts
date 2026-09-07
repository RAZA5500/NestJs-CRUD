import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

/**
 * One row per issued refresh token, i.e. per signed-in device. Rows are never
 * capped per user — the shared demo accounts are signed in from many places at
 * once — Mongo drops each one on its own once `expiresAt` passes (TTL index).
 */
@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
