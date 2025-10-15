const express = require("express");
const app = express();

app.get('/', function(req, res){
    res.send("김영석 바보");
})

app.listen(8080, function () {
    console.log("listening on 8080");
})