"use strict";

const User = require("../../models/user");

const renderDashboard = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(req.session.user.id).lean();

    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    res.render("home/dashboard", { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { renderDashboard };
