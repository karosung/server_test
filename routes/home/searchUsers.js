"use strict";

const mongoose = require("mongoose");
const User = require("../../models/user");
const Friendship = require("../../models/friendship");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const popFlash = (req) => {
  if (!req.session) {
    return undefined;
  }
  const flash = req.session.flash;
  delete req.session.flash;
  return flash;
};

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

const renderUserSearch = async (req, res, next) => {
  if (!req.session?.user) {
    return res.redirect("/login");
  }

  const flash = popFlash(req);
  const query = (req.query.q || "").trim();
  const hasSearched = query.length > 0;

  if (!hasSearched) {
    return res.render("home/user-search", {
      query: "",
      hasSearched: false,
      users: [],
      flash,
    });
  }

  try {
    const regex = new RegExp(escapeRegex(query), "i");
    const rawUsers = await User.find({
      $or: [{ username: regex }, { email: regex }],
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const currentUserId = req.session.user.id;
    const userIds = rawUsers.map((user) => user._id);
    const friendships = await Friendship.find({
      user: currentUserId,
      friend: { $in: userIds },
    })
      .select("friend")
      .lean();

    const friendSet = new Set(
      friendships.map((friendship) => friendship.friend.toString())
    );

    const users = rawUsers.map((user) => {
      const idAsString = user._id.toString();
      return {
        ...user,
        avatarDataUrl: buildAvatarDataUrl(user),
        isSelf: idAsString === currentUserId,
        isFriend: friendSet.has(idAsString),
      };
    });

    res.render("home/user-search", {
      query,
      hasSearched: true,
      users,
      flash,
    });
  } catch (err) {
    next(err);
  }
};

const addFriend = async (req, res, next) => {
  if (!req.session?.user) {
    return res.redirect("/login");
  }

  const { friendId, q } = req.body;
  const redirectUrl = `/users/search${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const currentUserId = req.session.user.id;

  if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
    if (req.session) {
      req.session.flash = {
        type: "error",
        message: "Invalid friend request.",
      };
    }
    return res.redirect(redirectUrl);
  }

  if (friendId === currentUserId) {
    req.session.flash = {
      type: "error",
      message: "You cannot add yourself as a friend.",
    };
    return res.redirect(redirectUrl);
  }

  try {
    const friendUser = await User.findById(friendId).lean();

    if (!friendUser) {
      req.session.flash = {
        type: "error",
        message: "User not found.",
      };
      return res.redirect(redirectUrl);
    }

    try {
      await Friendship.create({
        user: currentUserId,
        friend: friendId,
      });

      req.session.flash = {
        type: "success",
        message: `${friendUser.fullName || friendUser.username} has been added to your friends.`,
      };
    } catch (err) {
      if (err.code === 11000) {
        req.session.flash = {
          type: "error",
          message: "You are already friends.",
        };
      } else {
        throw err;
      }
    }

    return res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
};

module.exports = { renderUserSearch, addFriend };
