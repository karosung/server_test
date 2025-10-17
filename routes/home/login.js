"use strict";

const crypto = require("crypto");
const User = require("../../models/user");
const logger = require("../../utils/logger");

const handleLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Login attempt with missing credentials", {
      email: email || null,
      hasPassword: Boolean(password),
    });

    return res.status(400).render("home/login", {
      error: "Email and password are required.",
    });
  }

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      logger.warn("Login failed: user not found", { email });
      return res.status(401).render("home/login", {
        error: "Invalid email or password.",
      });
    }

    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    if (user.passwordHash !== passwordHash) {
      logger.warn("Login failed: incorrect password", { userId: user._id.toString() });
      return res.status(401).render("home/login", {
        error: "Invalid email or password.",
      });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    logger.info("User authenticated successfully", {
      userId: user._id.toString(),
      username: user.username,
    });

    res.redirect("/dashboard");
  } catch (err) {
    logger.error("Login handling failed", {
      email,
      error: err.message,
    });
    next(err);
  }
};

const handleLogout = (req, res, next) => {
  const sessionUser = req.session?.user;
  req.session.destroy((err) => {
    if (err) {
      logger.error("Logout failed", {
        userId: sessionUser?.id || null,
        error: err.message,
      });
      return next(err);
    }

    logger.info("User logged out", {
      userId: sessionUser?.id || null,
      username: sessionUser?.username || null,
    });

    res.redirect("/login");
  });
};

module.exports = { handleLogin, handleLogout };
