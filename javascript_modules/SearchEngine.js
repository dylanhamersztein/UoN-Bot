const findInFiles = require("find-in-files");
const fs = require("fs");

let fileNamesToLinks;

const SearchEngine = {
	doSearch: (searchTerm, serverRequest, serverResponse) => {
		// loading the object which maps file names to the URLs from which their contents originated
		if (fileNamesToLinks === undefined) fileNamesToLinks = JSON.parse(fs.readFileSync("./res/json/FileNamesToLinks.json"));

		// doing the search and formatting the results
		findInFiles.find({"term": searchTerm, "flags": "ig"}, "./res/compsciwebsite", '.txt').then((results) => {
			let toReturn;

			// checking if the search returned anything
			if (Object.keys(results).length > 0) {
				// number of documents in the entire corpus
				let numDocs = Object.keys(fileNamesToLinks).length;

				// all files in which the search term was found
				let fileNameArray = Object.keys(results);

				// number of documents where the search term appears
				let totalAppearances = fileNameArray.length;

				// calculating tf-idf for each result and storing it in the object
				fileNameArray.forEach(fileName => {
					let tf = results[fileName].count;
					let idf = Math.log((numDocs / totalAppearances));
					results[fileName]["tf-idf"] = tf * idf;

					// console.log('found "' + results[fileName].matches[0] + '" ' + results[fileName].count + ' times in "' + fileName + '"');
					// console.log(fileName + ":", results[fileName]);
				});

				// sorting the file name array by descending value of tf-idf
				fileNameArray.sort((a, b) => {
					return results[b]["tf-idf"] - results[a]["tf-idf"];
				});

				toReturn = "Your search has returned the following results:\n";

				// compiling all lines with the highest tf-idf score
				results[fileNameArray[0]].line.forEach((foundLine, index, array) => {
					// filtering out unwanted things that the html-to-text library didn't
					if (!/(\[javascript:|search this section|email this page|you are here:|main menu)/gi.test(foundLine) && foundLine !== foundLine.toUpperCase()) {
						toReturn += foundLine.trim() + "\n";
					} // end if
				});

				// return a link to the page on which the match was found
				toReturn += `These results were found at: ${fileNamesToLinks[fileNameArray[0].split("\\")[2]]}`;
			} else {
				toReturn = "Unfortunately your search did not return any results. Please revise your search term.";
			} // end if/else

			// sending a response back to the user back to the user
			serverResponse.writeHead(200, {'Content-Type': 'text/plain'});
			serverResponse.end(toReturn);
		});
	}
};

// exporting the module
module.exports = SearchEngine;