"use strict";

const express = require("express");
const router = express.Router();

router.get("/", function(req, res){
    res.render("home/index");
})

router.get("/login", function(req, res){
    res.render("home/login");
})

module.exports = router;