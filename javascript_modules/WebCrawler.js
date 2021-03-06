// for reading in JSON file
const fs = require("fs");

// for crawling the CS pages
const Crawler = require("simplecrawler");

// for extracting formatted text from web-pages
const htmlToText = require("html-to-text");

// for determining types of HTML tags in fetched pages
const cheerio = require("cheerio");

const WebCrawler = {
	startCrawlAt: url => {
		// defining the url the crawler should start on
		let crawler = new Crawler(url);

		// maps file names to web-site URLs
		let fileNamesToLinks = {};

		// defining paths to directories/files
		let webPageDirectoryPath = "./res/compsciwebsite/", fileNameToLinksPath = "./res/json/FileNamesToLinks.json";

		// defining how the crawler indexes the web-pages
		crawler.on("fetchcomplete", (queueItem, responseBuffer) => {
			let splitURL = queueItem.url.split("/");
			let fileName = `${splitURL[splitURL.length - 1].split(".")[0]}.txt`;

			// formatting the web-page so that it's readable and searchable
			let fileContents = htmlToText.fromString(responseBuffer.toString(), {
				wordwrap: false,
				ignoreImage: true,
				singleNewLineParagraphs: true,
				linkHrefBaseUrl: "https://www.nottingham.ac.uk",
				hideLinkHrefIfSameAsText: true
			});

			// removing multiple newline characters from formatted html
			fileContents = fileContents.replace(/\n{3,}/g, "\n");

			// removing unwanted text from formatted html
			fileContents = fileContents.replace(/(browser does not support script.)/gi, "");

			// adding the link at which this page was found to the collection
			fileNamesToLinks[fileName] = queueItem.url;

			// writing this text to a local file for searching
			fs.writeFile(webPageDirectoryPath + fileName, fileContents.trim(), err => {
				if (err) throw err;
				console.log("Fetched resource at " + queueItem.url);
			});
		});

		// defining behaviour for when the crawling finishes
		crawler.on("complete", () => {
			fs.writeFile(fileNameToLinksPath, JSON.stringify(fileNamesToLinks), err => {
				if (err) throw err;
				console.log("Finished web crawl.");
			});
		});

		// setting crawler properties
		crawler.interval = 200;
		crawler.maxConcurrency = 20;
		crawler.maxDepth = 3;

		// ensures only <a> tags are returned for crawling
		crawler.discoverResources = buffer => {
			let $ = cheerio.load(buffer.toString("utf8"));
			return $("a[href]").map(function () {
				return $(this).attr("href");
			}).get();
		};

		// narrowing the search to only the computer science/research web-pages
		crawler.addFetchCondition(queueItem => queueItem.url.match(/(ComputerScience)/i));

		// telling the crawler not to index the 'people' subdirectory
		crawler.addFetchCondition(queueItem => !queueItem.url.match(/(ComputerScience\/people)/i));

		// telling the crawler not to index the 'people' subdirectory
		crawler.addFetchCondition(queueItem => !queueItem.url.match(/(documents)/i));

		// excluding pdf files from search
		crawler.addFetchCondition(queueItem => !queueItem.path.match(/\.pdf$/i));

		// starting the crawl
		crawler.start();
	} // end startCrawlAt
};

// exporting the module
module.exports = WebCrawler;