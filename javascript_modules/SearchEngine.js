const findInFiles = require("find-in-files");

const SearchEngine = {
    doSearch: (searchTerm) => {
        // TODO run three searches with all lower-case, all upper-case, and title case search term somehow
        searchTerm = searchTerm.toLowerCase();

        findInFiles.find(searchTerm, "./res/html", '.txt').then((results) => {
            // do something with results
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