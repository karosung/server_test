"use strict";

const User = require("../../models/user");
const logger = require("../../utils/logger");
const { popFlash, setFlash } = require("../../utils/flash");

const requireSessionUser = (req, res) => {
  if (!req.session?.user) {
    logger.warn("Profile edit accessed without session");
    res.redirect("/login");
    return { redirect: "/login" };
  }
  return { userId: req.session.user.id };
};

const loadUserOrRedirect = async (req, res) => {
  const sessionCheck = requireSessionUser(req, res);
  if (sessionCheck.redirect) {
    return sessionCheck;
  }

  try {
    const user = await User.findById(sessionCheck.userId).lean();
    if (!user) {
      logger.warn("Profile edit user not found; destroying session", {
        userId: sessionCheck.userId,
      });
      req.session.destroy(() => res.redirect("/login"));
      return { redirect: "/login" };
    }
    return { user };
  } catch (err) {
    logger.error("Failed to load user for profile edit", {
      userId: sessionCheck.userId,
      error: err.message,
    });
    return { error: err };
  }
};

const viewModelFromUser = (user, overrides = {}) => ({
  username: overrides.username ?? user.username ?? "",
  email: overrides.email ?? user.email ?? "",
  fullName: overrides.fullName ?? user.fullName ?? "",
  phoneNumber: overrides.phoneNumber ?? user.phoneNumber ?? "",
});

const renderEditProfileForm = async (req, res, next) => {
  const { redirect, user, error } = await loadUserOrRedirect(req, res);
  if (redirect) {
    return;
  }
  if (error) {
    return next(error);
  }

  const flash = popFlash(req);

  res.render("home/profile-edit", {
    values: viewModelFromUser(user),
    errors: [],
    flash,
  });
};

const handleEditProfile = async (req, res, next) => {
  const { redirect, user, error } = await loadUserOrRedirect(req, res);
  if (redirect) {
    return;
  }
  if (error) {
    return next(error);
  }

  const { username = "", email = "", fullName = "", phoneNumber = "" } = req.body;
  const trimmed = {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    fullName: fullName.trim(),
    phoneNumber: phoneNumber.trim(),
  };

  const errors = [];

  if (!trimmed.username) {
    errors.push("Username is required.");
  }

  if (!trimmed.email) {
    errors.push("Email is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
    errors.push("Please provide a valid email address.");
  }

  if (!trimmed.fullName) {
    errors.push("Full name is required.");
  }

  if (errors.length > 0) {
    logger.warn("Profile update validation failed", {
      userId: user._id.toString(),
      errors,
    });
    return res.status(400).render("home/profile-edit", {
      values: viewModelFromUser(user, trimmed),
      errors,
      flash: popFlash(req),
    });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        username: trimmed.username,
        email: trimmed.email,
        fullName: trimmed.fullName,
        phoneNumber: trimmed.phoneNumber || null,
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      logger.warn("Profile update failed: user missing after update", {
        userId: user._id.toString(),
      });
      setFlash(req, {
        type: "error",
        message: "Unable to update profile. Please log in again.",
      });
      req.session.destroy(() => res.redirect("/login"));
      return;
    }

    req.session.user = {
      id: updatedUser._id.toString(),
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
    };

    logger.info("Profile updated", {
      userId: updatedUser._id.toString(),
    });

    setFlash(req, {
      type: "success",
      message: "Profile updated successfully.",
    });

    res.redirect("/dashboard");
  } catch (err) {
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0] || "field";
      const message =
        duplicateField === "email"
          ? "That email is already in use."
          : duplicateField === "username"
          ? "That username is already taken."
          : "Duplicate value detected.";

      logger.warn("Profile update duplicate key", {
        userId: user._id.toString(),
        duplicateField,
      });

      return res.status(400).render("home/profile-edit", {
        values: viewModelFromUser(user, trimmed),
        errors: [message],
        flash: popFlash(req),
      });
    }

    logger.error("Profile update failed", {
      userId: user._id.toString(),
      error: err.message,
    });
    next(err);
  }
};

module.exports = { renderEditProfileForm, handleEditProfile };
