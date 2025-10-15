"use strict";

const crypto = require("crypto");
const User = require("../../models/user");

const renderCreateAccountForm = (req, res) => {
  res.render("home/create-account", { error: null, values: {} });
};

const handleCreateAccount = async (req, res, next) => {
  const { username, email, password, fullName, phoneNumber, role } = req.body;
  const values = { username, email, fullName, phoneNumber, role };

  if (!password) {
    return res
      .status(400)
      .render("home/create-account", {
        error: "Password is required.",
        values,
      });
  }

  try {
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    await User.create({
      username,
      email,
      passwordHash,
      fullName,
      phoneNumber,
      role: role || undefined,
    });

    res.redirect("/login");
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).render("home/create-account", {
        error: err.message,
        values,
      });
    }

    if (err.code === 11000) {
      return res.status(400).render("home/create-account", {
        error: "Username or email already exists.",
        values,
      });
    }

    next(err);
  }
};

module.exports = { renderCreateAccountForm, handleCreateAccount };
