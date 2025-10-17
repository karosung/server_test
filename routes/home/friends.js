"use strict";

const Friendship = require("../../models/friendship");
const logger = require("../../utils/logger");

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
  const primaryPhoto =
    Array.isArray(user?.photos) && user.photos.length > 0
      ? user.photos[0]
      : null;
  const contentType =
    (primaryPhoto && primaryPhoto.contentType) ||
    user?.avatarContentType ||
    "image/jpeg";
  const buffer =
    bufferFrom(primaryPhoto?.data) || bufferFrom(user?.avatarData);

  if (!buffer || buffer.length === 0) {
    return null;
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
};

const renderFriends = async (req, res, next) => {
  if (!req.session?.user) {
    logger.warn("Friends page requested without session");
    return res.redirect("/login");
  }

  try {
    const friendships = await Friendship.find({ user: req.session.user.id })
      .populate({
        path: "friend",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .lean();

    const friends = friendships
      .map((friendship) => friendship.friend)
      .filter(Boolean)
      .map((friend) => ({
        ...friend,
        avatarDataUrl: buildAvatarDataUrl(friend),
      }));

    logger.info("Friends list rendered", {
      userId: req.session.user.id,
      friendCount: friends.length,
    });

    res.render("home/friends", {
      friends,
    });
  } catch (err) {
    logger.error("Failed to render friends list", {
      userId: req.session.user.id,
      error: err.message,
    });
    next(err);
  }
};

module.exports = { renderFriends };
