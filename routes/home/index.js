"use strict";

const express = require("express");
const router = express.Router();
const { handleLogin } = require("./login");
const { renderAdmin } = require("./admin");
const {
    renderCreateAccountForm,
    handleCreateAccount,
} = require("./createAccount");

router.get("/", function(req, res){
    res.render("home/index");
});

router.get("/login", function(req, res){
    res.render("home/login");
});

router.post("/login", handleLogin);

router.get("/admin", renderAdmin);

router.get("/create-account", renderCreateAccountForm);
router.post("/create-account", handleCreateAccount);

module.exports = router;
