const findInFiles = require("find-in-files");

const SearchEngine = {
	doSearch: (searchTerm) => {
		findInFiles.find(searchTerm, "./res/compsciwebsite", '.txt').then((results) => {
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