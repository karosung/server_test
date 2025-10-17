"use strict";

const User = require("../../models/user");
const logger = require("../../utils/logger");

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
  if (!req.session?.user) {
    logger.warn("Admin page requested without session", {
      url: req.originalUrl,
    });
    return res.redirect("/login");
  }

  if (req.session.user.role !== "admin") {
    logger.warn("Admin page access denied", {
      userId: req.session.user.id,
      username: req.session.user.username,
    });

    if (req.session) {
      req.session.flash = {
        type: "error",
        message: "Only administrators can view that page.",
      };
    }
    return res.redirect("/dashboard");
  }

  try {
    const rawUsers = await User.find().lean();
    const users = rawUsers.map((user) => ({
      ...user,
      avatarDataUrl: buildAvatarDataUrl(user),
    }));

    logger.info("Admin directory rendered", {
      adminId: req.session.user.id,
      userCount: users.length,
    });

    res.render("home/admin", { users });
  } catch (err) {
    logger.error("Failed to render admin directory", {
      adminId: req.session.user.id,
      error: err.message,
    });
    next(err);
  }
};

module.exports = { renderAdmin };
