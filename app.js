"use strict";

//module
const express = require("express");
const app = express();

const PORT = 8080;

//routing
const home = require("./routes/home");

app.set("views", "./views");
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use("/", home); // use is to retister middleware

app.listen(PORT, function () {
    console.log("listening on 8080");
})
