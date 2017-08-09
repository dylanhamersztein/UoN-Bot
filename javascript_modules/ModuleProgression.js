const Cookies = require("cookies");

const ModuleProgression = {
	// name of the cookie used by this module
	cookieName: "moduleProgression",

	// user command for using this module
	userCommand: "MODULE PROGRESSION",

	// instructions text for usage of this module
	instructionText: "Please enter your grades and their value in the module in the following format, " +
	"with each assessment being a new line in the format below.\n" +
	"[achieved grade] [value of grade in module]\n" +
	"If you want to know what you need to get in the final assessment of a module to reach a particular grade, " +
	"enter the following additional information on a new line and press 'Submit'.\n" +
	"[name of assessment] [value of assessment in module] [target grade for module]\n" +
	"You can also stop using this module at any time by typing 'EXIT'.",

	// function to send the instructional text found above to the user
	getInstructionText: (serverRequest, serverResponse) => {
		// creating a cookie object to keep track of state
		let cookies = new Cookies(serverRequest, serverResponse);

		// setting a cookie for their next input
		cookies.set(ModuleProgression.cookieName, true, {httpOnly: false});

		// sending the module's instructional text to the user
		serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
		serverResponse.end(ModuleProgression.instructionText);
	},

	// function to fill the grades array
	calculateProgression: (input, serverRequest, serverResponse) => {
		// creating a cookie object to keep track of state
		let cookies = new Cookies(serverRequest, serverResponse);

		if (input !== "EXIT") {
			// stores user's current module grade
			let currentProgress = 0;

			// variables to facilitate calculations
			let toCalcName = "";
			let toCalcGrade = 0;
			let toCalcWeight = 0;
			let desiredModuleGrade = 0;

			// splitting the input into individual assessments
			let assessments = input.split('\n');

			// splitting the grades from their values in the module
			// and adding weighted result to cumulative total
			for (let i in assessments) {
				// splitting each line into its component numbers
				let results = assessments[i].split(' ');

				// checking whether the current line starts with the name of an assessment or just a number
				if (String(results[0].match(/^\d/)) > 0) {
					currentProgress += (Number(results[0]) * Number(results[1])) / 100;
				} else {
					toCalcName = String(results[0]);
					toCalcWeight = Number(results[1]);
					desiredModuleGrade = Number(results[2]);
				} // end if/else
			} // end for

			// showing user's current progress in module by default
			let responseString = "Your current progress for this module is " + currentProgress + "%.";

			// calculating required grade on final assessment if the information to do so exists
			if (toCalcName !== "" && toCalcWeight > 0 && desiredModuleGrade > 0) {
				// calculating what grade user needs to get in specified assessment to achieve desired grade
				toCalcGrade = (desiredModuleGrade - currentProgress) / (toCalcWeight / 100);

				toCalcGrade <= 100 ?
					responseString += " In order to achieve " + desiredModuleGrade +
						"% overall, you must get " + toCalcGrade + "% in " + toCalcName + "."
					:
					responseString += " Unfortunately it is not possible for you to reach your desired grade of " + desiredModuleGrade
						+ "% with the remaining assessment, as you would need to achieve " + toCalcGrade + "% in " + toCalcName + ".";
			} // end if

			// deleting the relevant cookie
			cookies.set(ModuleProgression.cookieName, "", {"expires": new Date(0)});

			// calculating and sending user's progression back to client
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
			serverResponse.end(responseString);
		} else {
			// deleting the relevant cookie
			cookies.set(ModuleProgression.cookieName, "", {"expires": new Date(0)});

			// calculating and sending user's progression back to client
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
			serverResponse.end("Module progression exited. Is there anything else you want to ask me?");
		} // end if/else
	} // end calculateProgression
}; // end ModuleProgression

// exporting ModuleProgression as a module
module.exports = ModuleProgression;