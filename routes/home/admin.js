"use strict";

const User = require("../../models/user");
const logger = require("../../utils/logger");
const { setFlash } = require("../../utils/flash");

const bufferFrom = (value) => {
  if (!value) {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value.buffer) {
    return Buffer.from(value.buffer);
  }
  if (Array.isArray(value)) {
    return Buffer.from(value);
  }
  if (value.data) {
    return Buffer.from(value.data);
  }
  return null;
};

const buildAvatarDataUrl = (user) => {
  const primaryPhoto = Array.isArray(user?.photos) && user.photos.length > 0 ? user.photos[0] : null;
  const contentType =
    (primaryPhoto && primaryPhoto.contentType) ||
    user?.avatarContentType ||
    "image/jpeg";
  const buffer =
    bufferFrom(primaryPhoto?.data) ||
    bufferFrom(user?.avatarData);

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

    setFlash(req, {
      type: "error",
      message: "Only administrators can view that page.",
    });
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
