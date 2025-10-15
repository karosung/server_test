"use strict";

const fs = require("fs/promises");
const path = require("path");
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
  const flash = req.session.flash;
  delete req.session.flash;
  return flash;
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

    res.render("home/dashboard", { user, flash: popFlash(req) });
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

    let outputPath;

    try {
      const user = await User.findById(req.session.user.id);

      if (!user) {
        req.session.flash = {
          type: "error",
          message: "User not found.",
        };
        return res.redirect("/login");
      }

      const avatarsDir = path.join(__dirname, "..", "..", "uploads", "avatars");
      await fs.mkdir(avatarsDir, { recursive: true });

      const filename = `${req.session.user.id}-${Date.now()}.jpg`;
      outputPath = path.join(avatarsDir, filename);

      await sharp(req.file.buffer)
        .rotate()
        .resize(640, 640, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      if (user.avatarPath) {
        const oldPath = path.join(
          __dirname,
          "..",
          "..",
          user.avatarPath.replace(/^\//, "")
        );
        try {
          await fs.unlink(oldPath);
        } catch (unlinkErr) {
          if (unlinkErr.code !== "ENOENT") {
            throw unlinkErr;
          }
        }
      }

      const publicPath = `/uploads/avatars/${filename}`;
      user.avatarPath = publicPath;
      await user.save();
      req.session.user.avatarPath = publicPath;

      req.session.flash = {
        type: "success",
        message: "Profile photo updated.",
      };
      res.redirect("/dashboard");
    } catch (uploadErr) {
      if (outputPath) {
        try {
          await fs.unlink(outputPath);
        } catch (cleanupErr) {
          if (cleanupErr.code !== "ENOENT") {
            return next(cleanupErr);
          }
        }
      }
      next(uploadErr);
    }
  });
};

module.exports = { renderDashboard, uploadPhoto };
