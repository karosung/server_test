"use strict";

const Friendship = require("../../models/friendship");

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

const renderFriends = async (req, res, next) => {
  if (!req.session?.user) {
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

    res.render("home/friends", {
      friends,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { renderFriends };
