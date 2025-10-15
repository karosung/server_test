"use strict";

const express = require("express");
const router = express.Router();
const { handleLogin, handleLogout } = require("./login");
const { renderAdmin } = require("./admin");
const {
    renderCreateAccountForm,
    handleCreateAccount,
} = require("./createAccount");
const { renderDashboard } = require("./dashboard");

router.get("/", function(req, res){
    res.render("home/index");
});

router.get("/login", function(req, res){
    res.render("home/login", { error: null });
});

router.post("/login", handleLogin);
router.get("/dashboard", renderDashboard);
router.post("/logout", handleLogout);

router.get("/admin", renderAdmin);

router.get("/create-account", renderCreateAccountForm);
router.post("/create-account", handleCreateAccount);

module.exports = router;
