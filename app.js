"use strict";

//module
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

const logger = require("./utils/logger");

const app = express();

//routing
const home = require("./routes/home");
const PORT = process.env.PORT || 8080;

app.set("views", "./views");
app.set("view engine", "ejs");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(function requestLogger(req, res, next) {
  const start = Date.now();
  const userMeta = () => {
    const user = req.session?.user;
    return user ? { id: user.id, username: user.username } : null;
  };

  logger.info("Incoming request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: userMeta(),
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      user: userMeta(),
    };

    if (res.statusCode >= 500) {
      logger.error("Request completed with server error", meta);
    } else if (res.statusCode >= 400) {
      logger.warn("Request completed with client error", meta);
    } else {
      logger.info("Request completed successfully", meta);
    }
  });

  next();
});

app.use(function (req, res, next) {
  const isAuthenticated = Boolean(req.session && req.session.user);
  res.locals.isAuthenticated = isAuthenticated;
  res.locals.homeUrl = isAuthenticated ? "/dashboard" : "/login";
  next();
});

app.use("/", home); // use is to retister middleware

app.use(function errorLogger(err, req, res, next) {
  logger.error("Unhandled error during request", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.session?.user
      ? { id: req.session.user.id, username: req.session.user.username }
      : null,
  });
  next(err);
});

const mongoLocalURI = process.env.MONGODB_URI;
mongoose.connect(mongoLocalURI).then(function(){
    logger.info("Mongoose connected");
}).catch(function(err){
    logger.error("DB connection failed", { error: err.message });
})

app.listen(PORT, function () {
    logger.info("Server listening", { port: PORT });
})
