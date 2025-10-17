"use strict";

const multer = require("multer");
const sharp = require("sharp");
const User = require("../../models/user");
const logger = require("../../utils/logger");
const { popFlash, setFlash } = require("../../utils/flash");

const MAX_PHOTOS = 10;
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

const photoToDataUrl = (photo) => {
  if (!photo?.data) {
    return null;
  }

  const contentType = photo.contentType || "image/jpeg";
  return `data:${contentType};base64,${photo.data.toString("base64")}`;
};

const ensurePhotosInitialised = (user) => {
  if (!Array.isArray(user.photos)) {
    user.photos = [];
  }
};

const migrateLegacyAvatarIfNeeded = async (user) => {
  ensurePhotosInitialised(user);
  if (user.photos.length === 0 && user.avatarData && user.avatarContentType) {
    user.photos.push({
      data: user.avatarData,
      contentType: user.avatarContentType || "image/jpeg",
      uploadedAt: new Date(),
    });
    user.avatarData = undefined;
    user.avatarContentType = undefined;
    await user.save();
  }
};

const renderDashboard = async (req, res, next) => {
  if (!req.session.user) {
    logger.warn("Dashboard requested without authenticated session");
    return res.redirect("/login");
  }

  try {
    const userDoc = await User.findById(req.session.user.id);

    if (!userDoc) {
      logger.warn("Dashboard user lookup failed; destroying session", {
        userId: req.session.user.id,
      });
      req.session.destroy(() => {
        res.redirect("/login");
      });
      return;
    }

    await migrateLegacyAvatarIfNeeded(userDoc);

    const user = userDoc.toObject();
    ensurePhotosInitialised(user);

    const photos = user.photos.map(photoToDataUrl).filter(Boolean);
    const avatarDataUrl = photos[0] || null;

    logger.info("Dashboard rendered", {
      userId: user._id.toString(),
      username: user.username,
      photoCount: photos.length,
    });

    res.render("home/dashboard", {
      user,
      avatarDataUrl,
      photos,
      maxPhotos: MAX_PHOTOS,
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
      setFlash(req, {
        type: "error",
        message: err.message || "Failed to upload image.",
      });
      logger.warn("Photo upload rejected", {
        userId: req.session.user.id,
        error: err.message,
      });
      return res.redirect("/dashboard");
    }

    if (!req.file) {
      setFlash(req, {
        type: "error",
        message: "Please choose an image to upload.",
      });
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
        setFlash(req, {
          type: "error",
          message: "User not found.",
        });
        logger.warn("Photo upload failed: user missing during save", {
          userId: req.session.user.id,
        });
        return res.redirect("/login");
      }

      ensurePhotosInitialised(user);

      if (user.photos.length >= MAX_PHOTOS) {
        setFlash(req, {
          type: "error",
          message: "You have reached the maximum of 10 photos.",
        });
        logger.warn("Photo upload rejected: limit reached", {
          userId: req.session.user.id,
        });
        return res.redirect("/dashboard");
      }

      user.photos.push({
        data: processedBuffer,
        contentType: "image/jpeg",
        uploadedAt: new Date(),
      });

      await user.save();

      setFlash(req, {
        type: "success",
        message: "Profile photo added.",
      });
      logger.info("Profile photo added", {
        userId: req.session.user.id,
        filename: req.file.originalname,
        size: req.file.size,
        newCount: user.photos.length,
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

const removePhoto = async (req, res, next) => {
  if (!req.session?.user) {
    logger.warn("Photo delete attempted without session");
    return res.redirect("/login");
  }

  const { index } = req.body;
  const photoIndex = Number.parseInt(index, 10);

  if (Number.isNaN(photoIndex) || photoIndex < 0) {
    setFlash(req, {
      type: "error",
      message: "Invalid photo selection.",
    });
    logger.warn("Photo delete failed: invalid index", {
      userId: req.session.user.id,
      index,
    });
    return res.redirect("/dashboard");
  }

  try {
    const user = await User.findById(req.session.user.id);

    if (!user) {
      setFlash(req, {
        type: "error",
        message: "User not found.",
      });
      logger.warn("Photo delete failed: user missing", {
        userId: req.session.user.id,
      });
      return res.redirect("/login");
    }

    ensurePhotosInitialised(user);

    if (photoIndex >= user.photos.length) {
      setFlash(req, {
        type: "error",
        message: "Photo does not exist.",
      });
      logger.warn("Photo delete failed: index out of range", {
        userId: req.session.user.id,
        index,
      });
      return res.redirect("/dashboard");
    }

    user.photos.splice(photoIndex, 1);
    await user.save();

    setFlash(req, {
      type: "success",
      message: "Photo removed.",
    });

    logger.info("Profile photo removed", {
      userId: req.session.user.id,
      removedIndex: photoIndex,
      remaining: user.photos.length,
    });

    res.redirect("/dashboard");
  } catch (err) {
    logger.error("Photo delete failed", {
      userId: req.session.user.id,
      error: err.message,
    });
    next(err);
  }
};

module.exports = { renderDashboard, uploadPhoto, removePhoto };
