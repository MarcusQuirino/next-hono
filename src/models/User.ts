/* eslint-disable @typescript-eslint/consistent-generic-constructors */
import type { Document, Model } from "mongoose";
import { Schema, model, models } from "mongoose";

interface IUser extends Document {
  id: string | number;
  name: string;
  email: string;
  password: string;
  level: 1 | 2 | 3 | 4 | 5;
}

const UserSchema: Schema<IUser> = new Schema({
  id: { type: Schema.Types.Mixed, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  level: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
});

const UserModel: Model<IUser> = models.User ?? model<IUser>("User", UserSchema);

export default UserModel;
