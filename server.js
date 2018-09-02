const express = require("express")
const path = require("path")
const app = express()
const http = require("http").Server(app)
const io = require("socket.io")(http)

class TeamMember {
	constructor(name, socket) {
		this.name = name
		this.socket = socket
	}
}

module.exports = class QuizCoordinator {
	constructor(emitter, teamA, teamB) {
		this.teamA = teamA
		this.teamB = teamB

		this.io = io

		app.use(express.static(path.join(__dirname, "client")))

		io.on("connection", (socket) => {
			console.log("A user connected")

			socket.on("new-member", (data) => {
				console.log(`New member ${data.name} on Team ${data.team.toUpperCase()}`)
				const member = new TeamMember(data.name, socket)

				if (data.team === "a") { // Team A
					teamA.addMember(member)
				} else { // Team B
					teamB.addMember(member)
				}
			})

			socket.on("buzz", (data) => {
				const team = (data.team === "a") ? teamA : teamB
				const name = data.name || "???"
				emitter.emit("team-buzz", {
					team: team,
					name: name
				})
			})

			socket.on("disconnect", () => {
				console.log("A user disconnected")
				teamA.removeMember(socket)
				teamB.removeMember(socket)
			})
		});

		http.listen(3000, () => console.log("Example app listening on port 3000!"))
	}

	sendScores() {
		this.io.emit("scores", {
			aScore: this.teamA.points,
			bScore: this.teamB.points
		})
	}
}
