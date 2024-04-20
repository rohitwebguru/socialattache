function HandleFacebookApiAction(request, sender, sendResponse) {
	if (request.command === 'wait_a_bit') {
		Log_WriteInfo('Waiting a bit');
		setTimeout(function () {
			sendResponse();
		}, request.data.delay);
	} else if (request.command === 'scroll_form_check') {
		if (request.skip) {
			Log_WriteInfo('Skipping scroll event listener');
			sendResponse({
				status: 'success'
			});
		} else {
			function scrollListenera(details) {
				Log_WriteInfo("Request details: " + GetVariableAsString(details));
				let signals = ['GroupsCometMemberRequestsContentPaginationQuery', 'GroupsCometMembersWithThingsInCommonCardPaginationQuery', 'GroupsCometMembersPageNewMembersSectionRefetchQuery', 'GroupsCometMembersPageNewForumMembersSectionRefetchQuery', 'GroupsCometFriendsCardPaginationQuery', 'GroupsCometMembersPageAdminsSectionPaginationQuery', 'FriendingCometFriendsListPaginationQuery', 'ProfileCometAppCollectionListRendererPaginationQuery'];
				if (details.requestBody.formData && details.requestBody.formData.fb_api_req_friendly_name && signals.includes(details.requestBody.formData.fb_api_req_friendly_name[0])) {
					Log_WriteInfo('Scroll formData request initiated');
					sendResponse({
						status: 'success',
						formData: details.requestBody.formData
					});
					chrome.webRequest.onBeforeRequest.removeListener(scrollListenera);
					scrollListenera = null;
				}
			}
			
			Log_WriteInfo('Waiting 2 seconds for scroll event');
			chrome.webRequest.onBeforeRequest.addListener(
				scrollListenera, {urls: ["*://www.facebook.com/api/graphql/*"]}, ['requestBody']
			)

			setTimeout(function () {
				Log_WriteInfo('No scroll detected!');
				chrome.webRequest.onBeforeRequest.removeListener(scrollListenera);
				scrollListenera = null;
				sendResponse({
					status: 'timeout',
					message: 'No scroll detected'
				});
			}, 2000);
		}
	} else if (request.command === 'visible_member_check') {
		function navigationListener(details) {
			Log_WriteInfo("Request details: " + GetVariableAsString(details));
			let signals = ['CometGroupRootQuery'];
			if (details.requestBody.formData && details.requestBody.formData.fb_api_req_friendly_name && signals.includes(details.requestBody.formData.fb_api_req_friendly_name[0])) {
				Log_WriteInfo('Navigation click formData request initiated');
				sendResponse({
					status: 'success',
					formData: details.requestBody.formData
				});
				chrome.webRequest.onBeforeRequest.removeListener(navigationListener);
				navigationListener = null;
			}
		}

		Log_WriteInfo('Waiting 40 seconds for Navigation click event');
		chrome.webRequest.onBeforeRequest.addListener(
			navigationListener, {urls: ["*://www.facebook.com/api/graphql/*"]}, ['requestBody']
		)

		setTimeout(function () {
			Log_WriteInfo('No navigation click detected!');
			chrome.webRequest.onBeforeRequest.removeListener(scrollListenera);
			scrollListenera = null;
			sendResponse({
				status: 'timeout',
				message: 'No navigation click detected'
			});
		}, 40000);
	}
	else
		assert(0);
}
