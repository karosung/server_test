"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const friendshipSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    friend: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

friendshipSchema.index({ user: 1, friend: 1 }, { unique: true });

module.exports = mongoose.model("Friendship", friendshipSchema);
