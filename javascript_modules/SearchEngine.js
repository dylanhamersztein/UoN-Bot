const findInFiles = require("find-in-files");
const fs = require("fs");

let fileNamesToLinks;

const SearchEngine = {
	doSearch: (searchTerm) => {
		// loading the object which maps file names to the URLs from which their contents originated
		if (fileNamesToLinks === undefined) {
			fileNamesToLinks = JSON.parse(fs.readFileSync("./res/json/FileNamesToLinks.json"));
		} // end if

		// doing the search and formatting the results
		findInFiles.find(searchTerm, "./res/compsciwebsite", '.txt').then((results) => {
			// let keys = Object.keys(results);
			//
			// // sorting keys by number of matches
			// keys.sort((a, b) => results[b].count - results[a].count);
			//
			// keys.forEach((key) => {
			// 	console.log(results[key].lines.join("\n"));
			// 	console.log("yes");
			// });

			// return link to the page on which the match was found by accessing:
			// fileNamesToLinks[result];

			for (let result in results) {
				let res = results[result];
				console.log('found "' + res.matches[0] + '" ' + res.count + ' times in "' + result + '"');
				// console.dir(res.line[0]);
			}
		});
	}
};

// exporting the module
module.exports = SearchEngine;