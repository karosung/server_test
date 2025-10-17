"use strict";

const express = require("express");
const router = express.Router();
const { handleLogin, handleLogout } = require("./login");
const { renderAdmin } = require("./admin");
const {
    renderCreateAccountForm,
    handleCreateAccount,
} = require("./createAccount");
const { renderDashboard, uploadPhoto } = require("./dashboard");
const { renderUserSearch, addFriend } = require("./searchUsers");
const { renderFriends } = require("./friends");

router.get("/", function(req, res){
    res.render("home/index");
});

router.get("/login", function(req, res){
    res.render("home/login", { error: null });
});

router.post("/login", handleLogin);
router.get("/dashboard", renderDashboard);
router.post("/dashboard/photo", uploadPhoto);
router.get("/users/search", renderUserSearch);
router.post("/users/search/add", addFriend);
router.get("/friends", renderFriends);
router.post("/logout", handleLogout);

router.get("/admin", renderAdmin);

router.get("/create-account", renderCreateAccountForm);
router.post("/create-account", handleCreateAccount);

module.exports = router;
