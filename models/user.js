const mongoose = require("mongoose");

const schema = mongoose.Schema;

const userSchema = new schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    avatarData: { type: Buffer },
    avatarContentType: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
