"use strict";

const $ = require("jquery")
const EventEmitter = require("events")
const Timer = require("./timer")

const Manager = require("./quiz-manager")

class Emitter extends EventEmitter {}
const emitter = new Emitter()

const TIME_TO_ANSWER_TOSS_UP = 5 // for 5 second timer
const TIME_TO_ANSWER_BONUS = 20 // for 20 second timer

const instructionsElement = $("#instructions")
const listeningForElement = $("#listening-for")

function setListeningFor(text) {
	listeningForElement.text(text)
}

$("#judging").hide()

let question = 1
let allQuestions = []
let isBonus = false // either false, "a", or "b"

function getOtherTeam(team) {
	return (team === teamA) ? teamB : teamA
}

const teamA = new Manager.Team("a", $)
const teamB = new Manager.Team("b", $)
teamA.setPointerToOtherTeam(teamB)
teamB.setPointerToOtherTeam(teamA)

const QuizServer = require("./server.js")
const quizServer = new QuizServer(emitter, teamA, teamB)

console.log(quizServer)

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
createTossUpListener(false, false)

function createTossUpListener(excludeTeamA, excludeTeamB) {
	setListeningFor("None")
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

	// listen for interrupts only if the question is available to both teams
	if (!excludeTeamA && !excludeTeamB) {
		emitter.once("team-buzz", handleTossUpInterrupt)
		setListeningFor("Interrupt")
	} else {
		setListeningFor("None")
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

	if (excludeTeamA && !excludeTeamB) {
		setListeningFor("B Buzz")
		instructionsElement.attr("class", "waiting-buzz-team-b")
	} else if (!excludeTeamA && excludeTeamB) {
		setListeningFor("A Buzz")
		instructionsElement.attr("class", "waiting-buzz-team-a")
	} else {
		setListeningFor("Buzz")
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
		setListeningFor("None")
		emitter.removeAllListeners("team-buzz")
		goToNextQuestion()
	})
}

function goToNextQuestion() {
	quizServer.sendScores(question, isBonus)

	setListeningFor("None")
	instructionsElement.attr("class", "read-correct-answer")

	$(document).on("keydown", (event) => {
		if (event.key === "q") {
			$(document).off("keydown")

			incrementQuestion()
			quizServer.sendScores(question, isBonus)
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
		team.addCorrect(new Manager.Question(question, false, team.side))

		// give the team the bonus question
		createBonusListener(team)
	}, function() {
		const otherTeam = getOtherTeam(team)
		otherTeam.addPoints(4)
		quizServer.sendScores(question, isBonus)

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

	setListeningFor("None")

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
		team.addCorrect(new Manager.Question(question, false, team.side))

		// give the team the bonus question
		createBonusListener(team)
	}, function() {
		const otherTeam = getOtherTeam(team)

		// both teams answered wrong
		if ((excludeTeamA && team.side === "b") || (excludeTeamB && team.side === "a")) {
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
	quizServer.sendScores(question, isBonus)
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

	setListeningFor("None")

	// finish reading question
	$("#stop-reading-button").one("click", () => {
		$("#stop-reading-button").hide()

		setListeningFor(team.side.toUpperCase() + " Buzz")

		instructionsElement.attr("class", "waiting-buzz-team-" + team.side)

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
					team.addCorrect(new Manager.Question(question, true, team.side))
					quizServer.sendScores(question, isBonus)
					goToNextQuestion()
				}, function() {
					goToNextQuestion()
				})
			}
		})

		emitter.once("time-end", () => {
			// stop listening for buzzes
			emitter.removeAllListeners("team-buzz")

			setListeningFor("None")
			instructionsElement.attr("class", "read-correct-answer")

			goToNextQuestion()
		})
	})
}

// TODO: Remove this testing part
$(document).on("keypress", (event) => {
	if (event.key === "a") {
		emitter.emit("team-buzz", {
			team: teamA,
			name: "Some A Person"
		})
	} else if (event.key === "b") {
		emitter.emit("team-buzz", {
			team: teamB,
			name: "Some B Person"
		})
	}
})
