"use strict";

const $ = require("jquery")

$(".members-header, .questions-header").click(function() {
    $(this).find(".collapse-icon-container > svg").toggle()
    $(this).next("div").slideToggle(200)
})
