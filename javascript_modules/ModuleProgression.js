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
    "[name of assessment] [value of assessment in module] [target grade for module]",

    // function to fill the grades array
    calculateProgression: (input) => {
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
        let toReturn = "Your current progress for this module is " + currentProgress + "%.";

        // calculating required grade on final assessment if the information to do so exists
        if (toCalcName !== "" && toCalcWeight > 0 && desiredModuleGrade > 0) {
            // calculating what grade user needs to get in specified assessment to achieve desired grade
            toCalcGrade = (desiredModuleGrade - currentProgress) / (toCalcWeight / 100);

            toCalcGrade <= 100 ?
                toReturn += " In order to achieve " + desiredModuleGrade +
                    "% overall, you must get " + toCalcGrade + "% in " + toCalcName + "."
                :
                toReturn += " Unfortunately it is not possible for you to reach your desired grade of " + desiredModuleGrade
                    + "% with the remaining assessment, as you would need to achieve " + toCalcGrade + "% in " + toCalcName + ".";
        } // end if

        return toReturn;
    } // end calculateProgression
}; // end ModuleProgression

// exporting ModuleProgression as a module
module.exports = ModuleProgression;