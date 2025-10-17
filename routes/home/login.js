"use strict";

const crypto = require("crypto");
const User = require("../../models/user");

const handleLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render("home/login", {
      error: "Email and password are required.",
    });
  }

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(401).render("home/login", {
        error: "Invalid email or password.",
      });
    }

    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    if (user.passwordHash !== passwordHash) {
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

    res.redirect("/dashboard");
  } catch (err) {
    next(err);
  }
};

const handleLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
};

module.exports = { handleLogin, handleLogout };
