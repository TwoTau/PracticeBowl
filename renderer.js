"use strict";

const $ = require("jquery")
const EventEmitter = require("events")
const Timer = require("./timer")

class Emitter extends EventEmitter {}
const emitter = new Emitter()

const TIME_TO_ANSWER_TOSS_UP = 5 // 5 second timer
const TIME_TO_ANSWER_BONUS = 20 // 20 second timer

const instructionsElement = $("#instructions")

let question = 0
let allQuestions = []
let isBonus = false // either false, "a", or "b"
let listeningFor = "none" // can be "interrupt", "team-buzz", "a-buzz", "b-buzz", "none"

class Question {
	// answeredBy is optional
	constructor(questionNumber, isQuestionBonus, answeredBy) {
		this.questionNumber = questionNumber
		this.isBonus = isQuestionBonus
		this.setAnsweredBy(answeredBy || "n/a")
	}
	// team is either "a", "b", "n/a", or "neither"
	setAnsweredBy(team) {
		this.answeredBy = team
	}
	getId() {
		return this.questionNumber + (this.isBonus ? "B" : "")
	}
}

class Team {
	// side is either "a" or "b"
	constructor(side) {
		this.points = 0
		this.members = []
		this.qCorrect = []
		this.side = side
	}
	addPoints(points) {
		this.points += points
		$(`#team-${this.side} .points`).text(this.points)

		if (this.points > getOtherTeam(this).points) {
			$("#container").attr("class", `team-${this.side}-winning`)
		} else if (this.points === getOtherTeam(this).points) {
			$("#container").attr("class", `neither-winning`)
		}
	}
	addCorrect(questionObject) {
		this.qCorrect.push(questionObject)
		questionObject.setAnsweredBy(this.side)
		$(`<span>${questionObject.getId()}</span>`).appendTo(`#team-${this.side} .questions`)
		$(`#team-${this.side} .questions-header h2`).html(`<span>${this.qCorrect.length}</span> ${(this.qCorrect.length === 1) ? "question" : "questions"}`)

		if (questionObject.isBonus) {
			this.addPoints(10)
		} else {
			this.addPoints(4)
		}
	}
	addMember(member) {
		this.members.push(member)
		this.updateMemberHtml()
	}
	removeMember(member) {
		const index = this.members.indexOf(member)
		if (index !== -1) {
			this.members.splice(index, 1)
			this.updateMemberHtml()
			return true
		}
		return false
	}
	updateMemberHtml() {
		$(`#team-${this.side} .members-header h2`).html(`${this.members.length} ${(this.members.length === 1) ? "member" : "members"}`)
		$(`#team-${this.side} .members`).html(`<span>${this.members.map(member => member.name).sort().join("</span><span>")}</span>`)
	}
	toString() {
		return `Team ${this.side.toUpperCase()}`
	}
}

function getOtherTeam(team) {
	return (team === teamA) ? teamB : teamA
}

const teamA = new Team("a")
const teamB = new Team("b")

// // Testing purposes
// teamA.addCorrect(new Question(1, false))
// teamA.addCorrect(new Question(1, true))
// teamB.addCorrect(new Question(2, false))
// teamB.addCorrect(new Question(3, false))
// teamB.addCorrect(new Question(3, true))

function performTossUpProcess(excludeTeamA, excludeTeamB) {
	instructionsElement.text("Click the STOP reading button when you are finished.")

	listeningFor = "interrupt"

	if (!excludeTeamA && !excludeTeamB) {
		// listen for interrupt buzzes
		emitter.once("team-buzz", handleTossUpInterrupt)
	}

	// second space listener (finish reading question)
	$("#stop-reading-button").one("click", () => {
		$("#stop-reading-button").hide()

		// delete interrupt listener
		emitter.removeListener("team-buzz", handleTossUpInterrupt)

		listeningFor = "team-buzz"

		// start the timer
		let timer = new Timer($("#timer"), emitter, TIME_TO_ANSWER_TOSS_UP)

		// listen for normal buzzes
		emitter.once("team-buzz", function handle(team) {
			if (!(excludeTeamA && team.side === "a") && !(excludeTeamB && team.side === "b")) {
				handleTossUpBuzz(team, timer)
			}
		})

		emitter.once("time-end", () => {
			// stop listening for buzzes
			emitter.removeAllListeners("team-buzz")

			instructionsElement.text("Time is over. Read the correct answer. When you finish, press the \"q\" key once.")

			$(document).on("keydown", (event) => {
				if (event.key === "q") {
					$(document).off("keydown")

					createTossUpListener(false, false)
				}
			})
		})
	})
}

function performBonusProcess(team) {
	instructionsElement.text("Click 'stop reading' when done.")

	listeningFor = "none"

	// (finish reading question)
	$("#stop-reading-button").one("click", () => {
		$("#stop-reading-button").hide()

		listeningFor = "team-buzz"

		// start the timer
		let timer = new Timer($("#timer"), emitter, TIME_TO_ANSWER_BONUS)

		// listen for buzzes from the bonus team
		emitter.on("team-buzz", function handle(buzzedTeam) {
			if (buzzedTeam === team) {
				emitter.removeAllListeners("team-buzz")
				handleBonusBuzz(team, timer)
			}
		})

		emitter.once("time-end", () => {
			// stop listening for buzzes
			emitter.removeAllListeners("team-buzz")

			instructionsElement.text("Time is over. Read the correct answer. When you finish, press the \"q\" key once.")

			$(document).on("keydown", (event) => {
				if (event.key === "q") {
					$(document).off("keydown")

					createTossUpListener(false, false)
				}
			})
		})
	})
}

function createTossUpListener(excludeTeamA, excludeTeamB) {
	question++
	console.log(`Question is now ${question}`)
	isBonus = false
	$("#current-question").text(`Q ${question}`)

	instructionsElement.text("Click the 'start reading' button when you start reading the question. When you finish, click 'stop reading'.")

	$("#start-reading-button").show()
	$("#stop-reading-button").hide()

	$("#start-reading-button").one("click", () => {
		$("#start-reading-button").hide()
		$("#stop-reading-button").show()
		performTossUpProcess(excludeTeamA, excludeTeamB)
	})

	// $(document).on("keydown", (event) => {
	// 	if (event.key === " ") {
	// 		$(document).off("keydown")
	// 		performTossUpProcess(excludeTeamA, excludeTeamB)
	// 	}
	// })
}

function createBonusListener(team) {
	isBonus = true
	$("#current-question").text(`Q ${question} B`)

	instructionsElement.text("Click or something.")

	$("#start-reading-button").show()
	$("#stop-reading-button").hide()

	$("#start-reading-button").one("click", () => {
		$("#start-reading-button").hide()
		$("#stop-reading-button").show()
		performBonusProcess(team)
	})
}

// first space listener
createTossUpListener(false, false)

function handleTossUpInterrupt(team) {
	if (listeningFor === "interrupt") {
		console.log(team.toString() + " INTERRUPT")

		// delete space up listener
		$(document).off("keyup")

		instructionsElement.text(`INTERRUPT by ${team.toString()}. If ${team.toString()} is correct, press "P", otherwise press anything else.`)

		$(document).one("keypress", (event) => {
			if (event.key === "p") {
				team.addCorrect(new Question(question, false, team.side))

				// give the team the bonus question
				createBonusListener(team)
			} else {
				const otherTeam = getOtherTeam(team)
				otherTeam.addPoints(4)

				// restart question
				question-- // because performTossUpProcess auto increments question number
				if (team.side === "a") {
					performTossUpProcess(true, false)
				} else {
					performTossUpProcess(false, true)
				}
			}
		})
	}
}

function handleTossUpBuzz(team, timer) {
	console.log(team.toString() + " normal")
	$(document).off("keyup")

	emitter.removeAllListeners("time-end")
	timer.end()

	instructionsElement.text(`${team.toString()} has buzzed in. If ${team.toString()} is correct, press "P", otherwise press anything else.`)

	$(document).one("keypress", (event) => {
		if (event.key === "p") {
			team.addCorrect(new Question(question, false, team.side))

			// give the team the bonus question
			createBonusListener(team)
		} else {
			const otherTeam = getOtherTeam(team)

			listeningFor = "team-buzz"

			instructionsElement.text(`Waiting for a buzz from ${otherTeam.toString()}.`)

			// start the timer
			let newTimer = new Timer($("#timer"), emitter, TIME_TO_ANSWER_TOSS_UP)

			// listen for normal buzzes
			emitter.on("team-buzz", function handle(buzzedTeam) {
				if (buzzedTeam === otherTeam) {
					newTimer.end()
					emitter.removeAllListeners("time-end")
					emitter.removeAllListeners("team-buzz")

					instructionsElement.text(`${buzzedTeam.toString()} has buzzed in. If ${buzzedTeam.toString()} is correct, press "P", otherwise press anything else.`)

					$(document).one("keypress", (event) => {
						if (event.key === "p") {
							buzzedTeam.addCorrect(new Question(question, false, buzzedTeam.side))

							// give the team the bonus question
							createBonusListener(buzzedTeam)
						} else {
							instructionsElement.text("Read the correct answer. When you finish, press the \"q\" key once.")

							$(document).on("keydown", (event) => {
								if (event.key === "q") {
									$(document).off("keydown")

									createTossUpListener(false, false)
								}
							})
						}
					})
				}
			})

			emitter.once("time-end", () => {
				// stop listening for buzzes
				emitter.removeAllListeners("team-buzz")

				instructionsElement.text("Time is over. Read the correct answer. When you finish, press the \"q\" key once.")

				$(document).on("keydown", (event) => {
					if (event.key === "q") {
						$(document).off("keydown")
						console.log(`In q, the question is ${question}`)
						createTossUpListener(false, false)
					}
				})
			})
		}
	})
}

function handleBonusBuzz(team, timer) {
	console.log(team.toString() + " bonus buzz")
	$(document).off("keyup")

	timer.end()

	instructionsElement.text(`${team.toString()} has buzzed in. If ${team.toString()} is correct, press "P", otherwise press anything else.`)

	$(document).one("keypress", (event) => {
		if (event.key === "p") {
			team.addCorrect(new Question(question, true, team.side))
		}
		createTossUpListener(false, false)
	})
}

$(document).on("keypress", (event) => {
	if (event.key === "a") {
		emitter.emit("team-buzz", teamA)
	} else if (event.key === "b") {
		emitter.emit("team-buzz", teamB)
	}
})

const QuizCoordinator = require("./server.js")
const quizCoordinator = new QuizCoordinator(emitter, teamA, teamB)

console.log(quizCoordinator)
