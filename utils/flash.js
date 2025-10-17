"use strict";

const popFlash = (req) => {
  if (!req?.session) {
    return undefined;
  }
  const flash = req.session.flash;
  delete req.session.flash;
  return flash;
};

const setFlash = (req, flash) => {
  if (!req?.session) {
    return;
  }
  req.session.flash = flash;
};

module.exports = { popFlash, setFlash };
