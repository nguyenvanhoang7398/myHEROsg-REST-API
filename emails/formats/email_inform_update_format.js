module.exports = function(oldRequest, updatedRequest) {
	var oldDateObject = new Date(oldRequest.appointmentTime);
	var updatedDateObject = new Date(updatedRequest.appointmentTime);
	var isDifferent = function(newString, updatedString) {
		if (newString !== updatedString) {
			return "<strong>" + updatedString + "</strong>";
		} else {
			return updatedString;
		}
	}

	var format = {
		service: "Gmail",
		user: "emailverifymyherosg",
		pass: "myhero123!@#",
		subject: "<Do not reply> A check-up request has been updated",
		html: 
		"<h1>Hello! There is a new update for request with ID " + updatedRequest.id + " </h1>"
		+ "<p>Here is the previous request:</p>"

		+ "<blockquote >"
			+ "<br>Update from: " + oldRequest.lastUpdater + " <br>"
			+ "<br>Description: " + oldRequest.description + " <br>"
			+ "<br>GPResponse: " + oldRequest.GPResponse + " <br>"
			+ "<br>Appointment time: " + oldDateObject.toDateString() + " <br>"
			+ "<br>Status: " + oldRequest.status + " <br>" 
		+ "</blockquote>"

		+ "<p>Here is the updated request:</p>"
			+ "<blockquote >"
			+ "<br>Update from: " + isDifferent(oldRequest.lastUpdater, updatedRequest.lastUpdater) + " <br>"
			+ "<br>Description: " + isDifferent(oldRequest.description, updatedRequest.description) + " <br>"
			+ "<br>GPResponse: " + isDifferent(oldRequest.GPResponse, updatedRequest.GPResponse) + " <br>"
			+ "<br>Appointment time: " + isDifferent(oldDateObject.toDateString(), updatedDateObject.toDateString()) + " <br>"
			+ "<br>Status: " + isDifferent(oldRequest.status, updatedRequest.status) + " <br>"
		+ "</blockquote>"
	}
	return format;
}