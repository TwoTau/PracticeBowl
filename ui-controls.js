"use strict";

const $ = require("jquery")
const electron = require("electron")
const remote = electron.remote
const shell = electron.shell

$(".members-header, .questions-header").click(function() {
	$(this).find(".collapse-icon-container > svg").toggle()
	$(this).next("div").slideToggle(200)
})

$("#refresh-link").click(() => {
	remote.getCurrentWindow().reload()
})
$("#devtools-link").click(() => {
	remote.getCurrentWindow().toggleDevTools()
})
$("#pin-top-link").click(() => {
	const window = remote.getCurrentWindow()
	const textElement = $("#pin-top-link span")
	if (window.isAlwaysOnTop()) {
		window.setAlwaysOnTop(false)
		textElement.text("Pin")
	} else {
		window.setAlwaysOnTop(true)
		textElement.text("Unpin")
	}
})
$("#info-link").click(() => {
	shell.openExternal("https://github.com/TwoTau/PracticeBowl")
})

$("#min-btn").click(() => {
	remote.getCurrentWindow().minimize()
})
$("#max-btn, #restore-btn").click(() => {
	const window = remote.getCurrentWindow()
	// toggle maximization
	if (window.isMaximized()) {
		window.unmaximize()
	} else {
		window.maximize()
	}
})
$("#close-btn").click(() => {
	remote.getCurrentWindow().close()
})

remote.getCurrentWindow().on("maximize", toggleMaxRestoreButtons)
remote.getCurrentWindow().on("unmaximize", toggleMaxRestoreButtons)

function toggleMaxRestoreButtons() {
	$("#max-btn").toggle()
	$("#restore-btn").toggle()
}

$("#ip-address").text(getLocalIp() + ":3000")

function getLocalIp() {
    const allAddresses = Object.values(require("os").networkInterfaces())

    for (let addresses of allAddresses) {
        for (let address of addresses) {
            if(address.address.startsWith('192.168.')) {
                return address.address
            }
        }
    }
}

let totalPlayers = 0;

module.exports = {
	incrementConnectedUsers: function(numPlayers) {
		totalPlayers += numPlayers
		$("#total-players").text(totalPlayers + " player" + (totalPlayers === 1 ? "" : "s"))
	}
}
