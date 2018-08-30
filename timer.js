module.exports = class Timer {
    constructor(timeElement, emitter, timeLimit) {
        const TIME_STEP_INTERVAL = 0.1
    	this.secondsLeft = timeLimit
        this.timeElement = timeElement
        this.showElement()
        if (timeLimit > 10) {
            timeElement.find(".moving").addClass("start-bonus")
        } else {
            timeElement.find(".moving").addClass("start-tossup")
        }
        const textElement = timeElement.find("text")
    	this.timer = setInterval(() => {
            this.secondsLeft -= TIME_STEP_INTERVAL
            if (this.secondsLeft < 0) {
                this.secondsLeft = 0
    			emitter.emit("time-end", timeLimit)
    			this.end()
    		}
    		textElement.text(this.round(this.secondsLeft, TIME_STEP_INTERVAL))
    	}, 1000 * TIME_STEP_INTERVAL)
    }

    round(number, interval) {
        const NUM_DECIMALS = Math.ceil(-Math.log(interval) / Math.log(10))
        const ROUNDING_HELPER = Math.pow(10, NUM_DECIMALS)
        return Number.parseFloat(Math.round(number * ROUNDING_HELPER) / ROUNDING_HELPER).toFixed(NUM_DECIMALS)
    }

    // ends the timer process and hides the element
    end() {
        clearInterval(this.timer)
        this.timeElement.find(".moving").removeClass("start-tossup")
        this.timeElement.find(".moving").removeClass("start-bonus")
        this.hideElement()
    }

    showElement() {
        this.timeElement.slideDown(100)
    }

    hideElement() {
        this.timeElement.slideUp(100)
    }
}
