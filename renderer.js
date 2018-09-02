"use strict";

const $ = require("jquery")
const EventEmitter = require("events")
const Timer = require("./timer")

class Emitter extends EventEmitter {}
const emitter = new Emitter()

const TIME_TO_ANSWER_TOSS_UP = 5 // 5 second timer
const TIME_TO_ANSWER_BONUS = 20 // 20 second timer

const instructionsElement = $("#instructions")
$("#judging").hide()

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

		quizCoordinator.sendScores()
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
	removeMember(socket) {
		const index = this.members.findIndex((member) => {
			return member.socket === socket;
		})
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

const QuizCoordinator = require("./server.js")
const quizCoordinator = new QuizCoordinator(emitter, teamA, teamB)

console.log(quizCoordinator)

function incrementQuestion() {
	question++
	console.log(`Question is now ${question}`)
	isBonus = false

	$("#current-question").text(`Q ${question}`)
}
function setBonusTrue() {
	isBonus = true
	$("#current-question").text(`Q ${question} B`)
}

// first question listener
incrementQuestion()
createTossUpListener(false, false)

function createTossUpListener(excludeTeamA, excludeTeamB) {
	instructionsElement.attr("class", "start-reading-toss-up")

	$("#start-reading-button").show()
	$("#stop-reading-button").hide()

	$("#start-reading-button").one("click", () => {
		performTossUpProcess(excludeTeamA, excludeTeamB)
	})
}

function performTossUpProcess(excludeTeamA, excludeTeamB) {
	$("#start-reading-button").hide()
	$("#stop-reading-button").show()

	instructionsElement.attr("class", "stop-reading-toss-up")

	listeningFor = "interrupt"

	// listen for interrupts only if the question is available to both teams
	if (!excludeTeamA && !excludeTeamB) {
		emitter.once("team-buzz", handleTossUpInterrupt)
	}

	// listener for finish reading question
	$("#stop-reading-button").one("click", () => {
		startListeningForBuzzes(excludeTeamA, excludeTeamB)
	})
}

// PRE: start reading button is hidden, no timer, no team-buzz or time-end listeners
function startListeningForBuzzes(excludeTeamA, excludeTeamB) {
	$("#stop-reading-button").hide()

	// delete interrupt listener
	emitter.removeAllListeners("team-buzz")

	listeningFor = "team-buzz"

	if (excludeTeamA && !excludeTeamB) {
		instructionsElement.attr("class", "waiting-buzz-team-b")
	} else if (!excludeTeamA && excludeTeamB) {
		instructionsElement.attr("class", "waiting-buzz-team-a")
	} else {
		instructionsElement.attr("class", "waiting-buzz-team-either")
	}

	// start the 5 second timer
	let timer = new Timer($("#timer"), emitter, TIME_TO_ANSWER_TOSS_UP)

	// listen for normal buzzes
	emitter.on("team-buzz", function handle(data) {
		const team = data.team
		// if the buzzed team is not excluded, handle the buzz
		if (!(excludeTeamA && team.side === "a") && !(excludeTeamB && team.side === "b")) {
			// remove timer end listener
			emitter.removeAllListeners("time-end")
			timer.end()
			emitter.removeAllListeners("team-buzz")

			handleTossUpBuzz(excludeTeamA, excludeTeamB, data)
		}
	})

	emitter.once("time-end", () => {
		// stop listening for buzzes
		emitter.removeAllListeners("team-buzz")
		goToNextQuestion()
	})
}

function goToNextQuestion() {
	instructionsElement.attr("class", "read-correct-answer")

	$(document).on("keydown", (event) => {
		if (event.key === "q") {
			$(document).off("keydown")

			incrementQuestion()
			createTossUpListener(false, false)
		}
	})
}

function handleTossUpInterrupt(data) {
	const team = data.team

	console.log(team.toString() + " INTERRUPT")

	// delete space up listener

	$("#stop-reading-button").hide()
	$("#stop-reading-button").off("click")

	instructionsElement.attr("class", `interrupt-team-${team.side}`)
	$(`#interrupt-team-${team.side} .team-highlight-${team.side}`).text(`${data.name} (${team.toString()})`)

	askJudging(function() {
		team.addCorrect(new Question(question, false, team.side))

		// give the team the bonus question
		createBonusListener(team)
	}, function() {
		const otherTeam = getOtherTeam(team)
		otherTeam.addPoints(4)

		// restart question
		if (team.side === "a") {
			performTossUpProcess(true, false)
		} else {
			performTossUpProcess(false, true)
		}
	})
}

function askJudging(correctHandler, incorrectHandler) {
	$("#judging").show()

	$("#correct-button").one("click", () => {
		$("#incorrect-button").off("click")
		$("#judging").hide()

		correctHandler()
	})

	$("#incorrect-button").one("click", () => {
		$("#correct-button").off("click")
		$("#judging").hide()

		incorrectHandler()
	})
}

function handleTossUpBuzz(excludeTeamA, excludeTeamB, data) {
	const team = data.team

	console.log(team.toString() + " normal")

	instructionsElement.attr("class", `buzz-team-${team.side}`)
	$(`#buzz-team-${team.side} .team-highlight-${team.side}`).text(`${data.name} (${team.toString()})`)

	askJudging(function() {
		team.addCorrect(new Question(question, false, team.side))

		// give the team the bonus question
		createBonusListener(team)
	}, function() {
		const otherTeam = getOtherTeam(team)

		// both teams answered wrong
		if ((excludeTeamA && otherTeam.side === "a") || (excludeTeamB && otherTeam.side === "b")) {
			goToNextQuestion()
		} else {
			if (otherTeam.side === "a") { // exclude Team B
				startListeningForBuzzes(false, true)
			} else { // exclude Team A
				startListeningForBuzzes(true, false)
			}
		}
	})
}

function createBonusListener(team) {
	setBonusTrue()

	instructionsElement.attr("class", "start-reading-bonus")

	$("#start-reading-button").show()
	$("#stop-reading-button").hide()

	$("#start-reading-button").one("click", () => {
		$("#start-reading-button").hide()
		$("#stop-reading-button").show()
		performBonusProcess(team)
	})
}

function performBonusProcess(team) {
	instructionsElement.attr("class", "stop-reading-bonus")

	listeningFor = "none"

	// finish reading question
	$("#stop-reading-button").one("click", () => {
		$("#stop-reading-button").hide()

		listeningFor = "team-buzz"

		// start the timer
		let timer = new Timer($("#timer"), emitter, TIME_TO_ANSWER_BONUS)

		// listen for buzzes from the bonus team
		emitter.on("team-buzz", (data) => {
			if (data.team === team) {
				emitter.removeAllListeners("team-buzz")
				emitter.removeAllListeners("timer-end")
				timer.end()

				instructionsElement.attr("class", `buzz-team-${team.side}`)
				$(`#buzz-team-${team.side} .team-highlight-${team.side}`).text(`${data.name} (${team.toString()})`)

				askJudging(function() {
					team.addCorrect(new Question(question, true, team.side))
					goToNextQuestion()
				}, function() {
					goToNextQuestion()
				})
			}
		})

		emitter.once("time-end", () => {
			// stop listening for buzzes
			emitter.removeAllListeners("team-buzz")

			instructionsElement.attr("class", "read-correct-answer")

			goToNextQuestion()
		})
	})
}

// TODO: Remove this testing part
// $(document).on("keypress", (event) => {
// 	if (event.key === "a") {
// 		emitter.emit("team-buzz", {
// 			team: teamA,
// 			name: "Some A Person"
// 		})
// 	} else if (event.key === "b") {
// 		emitter.emit("team-buzz", {
// 			team: teamB,
// 			name: "Some B Person"
// 		})
// 	}
// })
