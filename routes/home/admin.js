"use strict";

const User = require("../../models/user");

const renderAdmin = async (req, res, next) => {
  try {
    const users = await User.find().lean();
    res.render("home/admin", { users });
  } catch (err) {
    next(err);
  }
};

module.exports = { renderAdmin };
