// for reading in the question fil
const fs = require("fs");

// for manipulating cookies
const Cookies = require("cookies");

// holds contents of the relevant JSON file
let questionsObject;

const DegreeProgression = {
	cookieName: "degreeProgression",

	userCommand: "DEGREE PROGRESSION",

	initialise: () => {
		fs.readFile("./res/json/DegreeProgressionQuestions.json", (err, data) => {
			if (err) throw err;
			questionsObject = JSON.parse(data);
		});
	}, // end initialise

	getFirstQuestion: (serverRequest, serverResponse) => {
		let cookies = new Cookies(serverRequest, serverResponse);

		// setting a cookie for next input so that this module can be used
		cookies.set(DegreeProgression.cookieName, true, {httpOnly: false});

		// setting a cookie indicating which question the user is on
		cookies.set("currQuestion", "q".concat(questionsObject.q1.number), {httpOnly: false});

		// sending the first question to the user
		serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
		serverResponse.end(questionsObject.q1.question);
	}, // end getFirstQuestion

	getNextQuestion: (userInput, serverRequest, serverResponse) => {
		// for manipulating cookies
		let cookies = new Cookies(serverRequest, serverResponse);

		if (userInput === "Y" || userInput === "N") {
			// getting a reference to the user's current question
			let currentQuestion = questionsObject[cookies.get("currQuestion")];

			// getting a reference to the current question's follow-up
			let nextQuestion = questionsObject[currentQuestion[userInput]];

			// if the above statement undefined then this cookie is deleted
			cookies.set("currQuestion", "q".concat(nextQuestion.number), {httpOnly: false});

			// deleting module cookies if there is no follow-up question
			if (nextQuestion[userInput] === false) {
				cookies.set(DegreeProgression.cookieName, "", {"expires": new Date(0)});
				cookies.set("currQuestion", "", {"expires": new Date(0)});
			} // end if

			// sending the next question to the user
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
			serverResponse.end(nextQuestion.question);
		} else if (userInput === "EXIT") {
			// user has chosen to exit this process so all cookies are deleted
			cookies.set(DegreeProgression.cookieName, "", {"expires": new Date(0)});
			cookies.set("currQuestion", "", {"expires": new Date(0)});

			// confirming to the user that the process is over
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
			serverResponse.end("Degree progression module exited. Is there anything else you want to ask me?");
		} else {
			// sending error message
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
			serverResponse.end("Please answer the question with only Y or N.");
		} // end if/else
	} // end getNextQuestion
}; // end DegreeProgression

// exporting DegreeProgression as a module
module.exports = DegreeProgression;