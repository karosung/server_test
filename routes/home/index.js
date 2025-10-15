"use strict";

const express = require("express");
const router = express.Router();
const { handleLogin } = require("./login");

router.get("/", function(req, res){
    res.render("home/index");
});

router.get("/login", function(req, res){
    res.render("home/login");
});

router.post("/login", handleLogin);

module.exports = router;
