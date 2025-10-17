"use strict";

const multer = require("multer");
const sharp = require("sharp");
const User = require("../../models/user");
const logger = require("../../utils/logger");

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
    logger.warn("Dashboard requested without authenticated session");
    return res.redirect("/login");
  }

  try {
    const user = await User.findById(req.session.user.id).lean();

    if (!user) {
      logger.warn("Dashboard user lookup failed; destroying session", {
        userId: req.session.user.id,
      });
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    logger.info("Dashboard rendered", {
      userId: user._id.toString(),
      username: user.username,
    });

    res.render("home/dashboard", {
      user,
      avatarDataUrl: buildAvatarDataUrl(user),
      flash: popFlash(req),
    });
  } catch (err) {
    logger.error("Failed to render dashboard", {
      userId: req.session.user.id,
      error: err.message,
    });
    next(err);
  }
};

const uploadPhoto = (req, res, next) => {
  if (!req.session.user) {
    logger.warn("Photo upload attempted without session");
    return res.redirect("/login");
  }

  upload.single("photo")(req, res, async (err) => {
    if (err) {
      req.session.flash = {
        type: "error",
        message: err.message || "Failed to upload image.",
      };
      logger.warn("Photo upload rejected", {
        userId: req.session.user.id,
        error: err.message,
      });
      return res.redirect("/dashboard");
    }

    if (!req.file) {
      req.session.flash = {
        type: "error",
        message: "Please choose an image to upload.",
      };
      logger.warn("Photo upload missing file", {
        userId: req.session.user.id,
      });
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
        logger.warn("Photo upload failed: user missing during save", {
          userId: req.session.user.id,
        });
        return res.redirect("/login");
      }

      user.avatarData = processedBuffer;
      user.avatarContentType = "image/jpeg";
      await user.save();

      req.session.flash = {
        type: "success",
        message: "\uD504\uB85C\uD544 \uC0AC\uC9C4\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      };
      logger.info("Profile photo updated", {
        userId: req.session.user.id,
        filename: req.file.originalname,
        size: req.file.size,
      });
      res.redirect("/dashboard");
    } catch (uploadErr) {
      logger.error("Photo upload processing failed", {
        userId: req.session.user.id,
        error: uploadErr.message,
      });
      next(uploadErr);
    }
  });
};

module.exports = { renderDashboard, uploadPhoto };
