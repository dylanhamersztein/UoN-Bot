let chatboxDiv, userInput;

const USER_MESSAGE = "userMessage";
const BOT_MESSAGE = "botMessage";
const GEOLOCATION_DENIED_MESSAGE = "Please accept location access in order to use this feature. Try asking the same question again, but if this doesn't work you may have to reload the page.";

function getUserInput() {
	if (userInput.value !== "") {
		// adding user's input to chat screen.
		addChat(userInput.value.trim(), USER_MESSAGE);

		// sending user input to the server and adding the bot's reply to the chat screen
		getBotReply(userInput.value, data => {
			if (data !== undefined) {
				// splitting response into separate messages
				let responses = data.split("\n");

				// adding all of them to the chat window
				responses.forEach(message => addChat(message, BOT_MESSAGE));

				if (document.cookie === "requestLocation=true" && navigator.geolocation) navigator.geolocation.getCurrentPosition(position => {
					// adding a new cookie to the request
					document.cookie = "findNearestPC=true";

					// deleting the old cookie
					document.cookie = "requestLocation=true;expires=Thu, 01 Jan 1970 00:00:01 GMT;";

					// // sending user coordinates to server
					getBotReply(`${position.coords.latitude}, ${position.coords.longitude}`, (data) => {
						// splitting response into separate messages and adding all of them to the chat window
						data.split('\n').forEach((message) => addChat(message, BOT_MESSAGE));
					});
				}, error => {
					// deleting the old cookie
					document.cookie = "requestLocation=true;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
					addChat(GEOLOCATION_DENIED_MESSAGE, BOT_MESSAGE);

					console.log(error);
				});
			} else {
				addChat("Sorry, I didn't quite understand what you were saying there.", BOT_MESSAGE);
			} // end if/else
		});
	} // end if

	userInput.focus();
	userInput.value = "";
} // end getUserInput

function getBotReply(input, callback) {
	$.ajax({
		type: "POST",
		url: "localhost",
		async: true,
		data: String(input).trim().toUpperCase(),
		contentType: "text",
		dataType: "text",
		success: message => callback(message)
	});
} // end getBotReply

function addChat(chatString, messageType) {
	// used to indicate who sent the message in the chat
	let textToDisplay;

	// creating a row to add into the table and setting its padding
	let chatBubbleDiv = document.createElement("div");
	chatBubbleDiv.setAttribute("padding-bottom", "10px");

	// determining where to align the message in the chatbox
	if (messageType === USER_MESSAGE) {
		chatBubbleDiv.setAttribute("align", "right");

		// creating a paragraph element and adding user input into it
		textToDisplay = document.createElement("p");
		textToDisplay.appendChild(document.createTextNode(`User: ${chatString}`));
	} else if (messageType === BOT_MESSAGE) {
		chatBubbleDiv.setAttribute("align", "left");

		// creating element from UoN-Bot's HTML string response
		textToDisplay = new DOMParser().parseFromString(chatString, 'text/html').body.firstChild;
	} // end if/else

	// setting attributes of displayed text
	textToDisplay.setAttribute("id", messageType);
	textToDisplay.setAttribute("class", "message");

	// chaining new nodes together
	chatBubbleDiv.appendChild(textToDisplay);

	// displaying user input in the chatbox div on a new line each time
	chatboxDiv.appendChild(chatBubbleDiv);

	// scrolling to the bottom of the chatbox automatically
	chatboxDiv.scrollTop = chatboxDiv.scrollHeight;
} // end addChat

function exit() {// clearing chatbox
	while (chatboxDiv.hasChildNodes()) {
		chatboxDiv.removeChild(chatboxDiv.lastChild);
	} // end while
} // end exit

// getting references to objects once DOM content has loaded
document.addEventListener('DOMContentLoaded', () => {
	userInput = document.getElementById('userInput');
	chatboxDiv = document.getElementById('chatbox');
});