module.exports = {
    Question: class {
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
        toString() {
            return this.getId()
        }
    },

    Team: class {
        // side is either "a" or "b"
    	constructor(side, $) {
    		this.points = 0
    		this.members = []
    		this.qCorrect = []
    		this.side = side
            this.$ = $
    	}
        setPointerToOtherTeam(otherTeam) {
            this.otherTeam = otherTeam
        }
    	addPoints(points) {
    		this.points += points
    		this.$(`#team-${this.side} .points`).text(this.points)

    		if (this.points > this.otherTeam.points) {
    			this.$("#container").attr("class", `team-${this.side}-winning`)
    		} else if (this.points === this.otherTeam.points) {
    			this.$("#container").attr("class", `neither-winning`)
    		}
    	}
    	addCorrect(questionObject) {
    		this.qCorrect.push(questionObject)
    		questionObject.setAnsweredBy(this.side)
    		this.$(`<span>${questionObject.getId()}</span>`).appendTo(`#team-${this.side} .questions`)
    		this.$(`#team-${this.side} .questions-header h2`).html(`<span>${this.qCorrect.length}</span> ${(this.qCorrect.length === 1) ? "question" : "questions"}`)

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
    			return member.socket === socket
    		})
    		if (index !== -1) {
    			this.members.splice(index, 1)
    			this.updateMemberHtml()
    			return true
    		}
    		return false
    	}
    	updateMemberHtml() {
    		this.$(`#team-${this.side} .members-header h2`).html(`${this.members.length} ${(this.members.length === 1) ? "member" : "members"}`)
    		this.$(`#team-${this.side} .members`).html(`<span>${this.members.map(member => member.name).sort().join("</span><span>")}</span>`)
    	}
    	toString() {
    		return "Team " + this.side.toUpperCase()
    	}
    }
}
