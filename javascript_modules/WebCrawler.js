const fs = require("fs");
const Crawler = require("simplecrawler");
const cheerio = require("cheerio");
const htmlToText = require("html-to-text");

let crawler, fileNamesToLinks = {};

const WebCrawler = {
	initialiseWebCrawler: (url) => {
		// defining the url the crawler should start on
		crawler = new Crawler(url);

		// defining how the crawler indexes the web-pages
		crawler.on("fetchcomplete", (queueItem, responseBuffer) => {
			// console.log("Fetched resource at " + queueItem.url);

			// loading web-page into cheerio/jquery object
			const $ = cheerio.load(responseBuffer.toString());

			// extracting the page's title for file-naming purposes
			let fileName = $("title").text();

			// formatting the title to an appropriate file name
			fileName = fileName.replace(/[^A-Za-z]/g, "").trim() + ".txt";

			// formatting the web-page so that it's readable and searchable
			let fileContents = htmlToText.fromString(responseBuffer.toString(), {
				wordwrap: false,
				ignoreImage: true,
				singleNewLineParagraphs: true,
				linkHrefBaseUrl: "https://www.nottingham.ac.uk"
			});

			// removing unwanted text from formatted html
			fileContents = fileContents.replace(/(browser does not support script.)/gi, "").trim();

			// adding the link at which this page was found to the collection
			fileNamesToLinks[fileName + ".txt"] = queueItem.url;

			// writing this text to a local file for searching
			fs.writeFile("./res/compsciwebsite/" + fileName, fileContents, err => {
				if (err) throw err
			});
		});

		// defining behaviour for when the crawling finishes
		crawler.on("complete", () => {
			fs.writeFile("./res/json/FileNamesToLinks.json", JSON.stringify(fileNamesToLinks), err => {
				if (err) throw err;
				console.log("Finished web crawl.");
			});
		});

		// setting crawler properties
		crawler.interval = 200;
		crawler.maxConcurrency = 5;
		crawler.maxDepth = 2;

		// ensures only <a> tags are returned for crawling
		crawler.discoverResources = buffer => {
			let $ = cheerio.load(buffer.toString("utf8"));
			return $("a[href]").map(function () {
				return $(this).attr("href");
			}).get();
		};

		// narrowing the search to only the computer science/research web-pages
		crawler.addFetchCondition(queueItem => queueItem.url.match(/(ComputerScience)/i));

		// telling the crawler not to index the 'people' page
		crawler.addFetchCondition(queueItem => !queueItem.url.match(/(ComputerScience\/people)/i));

		// excluding pdf files from search
		crawler.addFetchCondition(queueItem => !queueItem.path.match(/\.pdf$/i));

		// starting the crawl
		crawler.start();
	}
};

// exporting the module
module.exports = WebCrawler;