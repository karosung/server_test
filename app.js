"use strict";

//module
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/", home); // use is to retister middleware

const mongoLocalURI = process.env.MONGODB_LOCAL;
mongoose.connect(mongoLocalURI).then(function(){
    console.log("mongoose connected");
}).catch(function(err){
    console.log("db connected fail", err);
})

app.listen(PORT, function () {
    console.log("listening on 8080");
})
