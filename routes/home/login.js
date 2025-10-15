"use strict";

const handleLogin = (req, res) => {
    const { id, password } = req.body;
    console.log(`Login request - id: ${id}, password: ${password}`);
    res.redirect("/login");
};

module.exports = { handleLogin };
