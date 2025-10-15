"use strict";

const User = require("../../models/user");

const buildAvatarDataUrl = (user) => {
  if (!user?.avatarData) {
    return null;
  }

  const contentType = user.avatarContentType || "image/jpeg";
  let buffer;

  if (Buffer.isBuffer(user.avatarData)) {
    buffer = user.avatarData;
  } else if (user.avatarData?.buffer) {
    buffer = Buffer.from(user.avatarData.buffer);
  } else if (Array.isArray(user.avatarData)) {
    buffer = Buffer.from(user.avatarData);
  } else {
    return null;
  }

  if (!buffer || buffer.length === 0) {
    return null;
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
};

const renderAdmin = async (req, res, next) => {
  try {
    const rawUsers = await User.find().lean();
    const users = rawUsers.map((user) => ({
      ...user,
      avatarDataUrl: buildAvatarDataUrl(user),
    }));
    res.render("home/admin", { users });
  } catch (err) {
    next(err);
  }
};

module.exports = { renderAdmin };
