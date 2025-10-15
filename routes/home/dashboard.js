"use strict";

const multer = require("multer");
const sharp = require("sharp");
const User = require("../../models/user");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

const popFlash = (req) => {
  if (!req.session) {
    return undefined;
  }
  const flash = req.session.flash;
  delete req.session.flash;
  return flash;
};

const buildAvatarDataUrl = (user) => {
  if (!user?.avatarData || !user?.avatarContentType) {
    return null;
  }
  return `data:${user.avatarContentType};base64,${user.avatarData.toString(
    "base64"
  )}`;
};

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

    res.render("home/dashboard", {
      user,
      avatarDataUrl: buildAvatarDataUrl(user),
      flash: popFlash(req),
    });
  } catch (err) {
    next(err);
  }
};

const uploadPhoto = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  upload.single("photo")(req, res, async (err) => {
    if (err) {
      req.session.flash = {
        type: "error",
        message: err.message || "Failed to upload image.",
      };
      return res.redirect("/dashboard");
    }

    if (!req.file) {
      req.session.flash = {
        type: "error",
        message: "Please choose an image to upload.",
      };
      return res.redirect("/dashboard");
    }

    try {
      const processedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(640, 640, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const user = await User.findById(req.session.user.id);

      if (!user) {
        req.session.flash = {
          type: "error",
          message: "User not found.",
        };
        return res.redirect("/login");
      }

      user.avatarData = processedBuffer;
      user.avatarContentType = "image/jpeg";
      await user.save();

      req.session.flash = {
        type: "success",
        message: "\uD504\uB85C\uD544 \uC0AC\uC9C4\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      };
      res.redirect("/dashboard");
    } catch (uploadErr) {
      next(uploadErr);
    }
  });
};

module.exports = { renderDashboard, uploadPhoto };
