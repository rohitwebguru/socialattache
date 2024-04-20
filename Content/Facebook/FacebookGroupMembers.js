// ==============  Facebook API ================= //

async function getGroupMembersAPIParams(command, queryId) {
   return new Promise(async function(resolve) {
      Messaging.SendMessageToBackground({
            type: 'apiAction',
            command,
         })
         .then(formDataCheck =>
         {
            if (formDataCheck.status !== 'success' && formDataCheck.status !== 'timeout') {
               // DRL FIXIT? I'm not quite sure about this here since Log_WriteError() doesn't return anything
               // and also I think that if we simply return this Promise will never get resolved?
               return Log_WriteError('There was an error getting the next page data');
            }
            let totalMembers = 0;
            let currentPage = 1
            let groupMembers = [];
            let formDataStr = "";
   
            window.scrollTo(0, 0);
   
            if (formDataCheck.status === 'success') {
               // NOTE: These changes to formData are necessary to obtain the first members on the initial request.
               if (formDataCheck.formData?.variables) {
                  const variables = JSON.parse(formDataCheck.formData.variables[0]) ?? {};
                  const newVariables = {
                     "groupID": variables['groupID'],
                     "id": variables['groupID'],
                     "scale": 1,
                     "recruitingGroupFilterNonCompliant": false,
                     "__relay_internal__pv__VideoPlayerRelayReplaceDashManifestWithPlaylistrelayprovider":false,
                  }
                  formDataCheck.formData.variables[0] = JSON.stringify(newVariables);
               }
               if(queryId) {
                  formDataCheck.formData['doc_id'] = queryId;
               }
               formDataCheck.formData['fb_api_req_friendly_name'] = "GroupsCometMembersRootQuery";
      
               const sp = new URLSearchParams(Object.entries(formDataCheck.formData));
               formDataStr = sp.toString();
            }
   
            if (formDataCheck.status === 'success') {
               const params = {
                  formDataObj:formDataCheck.formData,
                  formDataStr,
                  currentPage,
                  totalMembers,
                  groupMembers,
                  hasNextPage: true
               }
               resolve(params)
            }
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });

      if (command === 'scroll_form_check') {
         _setTimeout(function() {
            window.scrollTo(0, document.body.scrollHeight);
         }, 1000);
      } else if (command === 'visible_member_check') {
         // NOTE: Wait for 35 seconds; the request can be sent ~30 seconds after the page loads.
         _setTimeout(function() {
            document.querySelector(`a[href="${window.location.pathname}/"]`).click();
         }, 35000);
      }
   });
}

async function fetchJSON(url, options = {}){
   // Do the initial fetch
   return await fetch(url, options)
       // Turn it into json
       .then(async res => {
          if (!res.ok){
             throw new Error(`The HTTP status of the response: ${res.status} (${res.statusText})`);
          }
          return res.json()
       })
       // If we can do that
       .then(data => {
          // Return that json as data
          return {
             data,
             error: undefined
          }
       })
       // If something failed along the way
       .catch(err => {
          // Return that error
          return {
             data: undefined,
             error: {
                status: 'error',
                message: err?.toString() ?? ''
             }
          }
       });
}

function getNextMembersPage(params) {
   let {formDataStr, formDataObj, currentPage, totalMembers, groupMembers} = params;
   const subdomain = window.location.host.split('.')[0];

   return new Promise(async function(resolve) {
      let url = `https://${subdomain}.facebook.com/api/graphql/?${formDataStr}`;
      let {data, error} = await fetchJSON(url, {
         method: "POST",
         headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
         }
      })

      if (error){
         Log_WriteError(error.message);
         return;
      }

      let nextPageCursor = '';
      let processPage = false;
      let hasNextPage = false;
      let collection = '';

      if(data?.data?.group) {
         data.data.node = data?.data?.group;
      }
      if (data?.data?.node) {
         if (data.data.node.new_forum_members) {
            collection = 'new_forum_members';
            processPage = true;
         } else if (data.data.node.new_members) {
            collection = 'new_members';
            processPage = true;
         } else if (data.data.node.group_friend_members) {
            collection = 'group_friend_members';
            processPage = true;
         } else if (data.data.node.group_member_discovery) {
            collection = 'group_member_discovery';
            processPage = true;
         } else if (data.data.node.group_admin_profiles) {
            collection = 'group_admin_profiles';
            processPage = true;
         }
      }

      if (processPage) {
         if (data?.data?.node?.[collection]?.edges?.length > 0) {
            // PROCESS MEMBERS FOR THIS PAGE...
            const groupId = data.data.node.id;
            for (const member of data.data.node[collection].edges) {
               let processMember = true;
               let bioText = '';
               let addedByID = '';

               if (!member.node) {
                  processMember = false;
               } else {
                  if (member.invite_status_text) {
                     addedByID = member?.invite_status_text?.ranges?.[0]?.entity?.id ?? '';
                  } else {
                     addedByID = member?.join_status_text?.ranges?.[0]?.entity?.id ?? '';
                  }
                  if (member.node && member.node.invitee_profile) {
                     bioText = member?.node?.invitee_profile?.bio_text?.text ?? '';
                  } else {
                     bioText = member?.node?.bio_text?.text ?? '';
                  }
               }
               if ((member.node.url || (member.node.invitee_profile && member.node.invitee_profile.url)) && processMember) {
                  const memberNode = member?.node?.invitee_profile ?? member.node;
                  const profilePic = memberNode?.profile_picture?.uri ?? null;

                  let groupRole = 'InvitedOnly';
                  if (memberNode["__isGroupMember"]) {
                     groupRole = 'GroupMember';
                  }

                  let memberText = member.invite_status_text?.text ?? member.join_status_text?.text ?? null;
                  let timestampStr = null;
                  let isGroupCreator = false;
                  if(memberText) {
                     const memberDateMatch = memberText.match(new RegExp(keywordFBG('MemberDateMatch'), 'i'));
                     if(memberDateMatch) {
                        timestampStr = memberDateMatch[1];
                     }

                     const createdGroup = memberText.match(new RegExp(keywordFBG('CreatedGroup'), 'i'));
                     if(createdGroup) {
                        isGroupCreator = true;
                     }
                  }
                  const timestamp = parseGroupLatestTimestamp(timestampStr);
                  const groupUid = 'fbp:' + validateAddress(groupId + '@fbgroup.socialattache.com');

                  // This significantly slows down
                  //const uid = await getFacebookAddressFromId(memberNode.id, FacebookAddressFormatNumeric);
                  const uid = memberNode.id + '@fbperid.socialattache.com';

                  const data = {
                     GroupUid: groupUid,
                     Uid: uid,
                     Name: memberNode.name,
                     ReferredBy: null,
                     GroupRoles: [groupRole],
                     JoinDate: timestampToString(timestamp),
                     // new data from API
                     bioText: bioText,
                     profilePic: profilePic,
                     addedByID: addedByID,
                     timestampStr,
                     isGroupCreator,
                  }
                  groupMembers.push(data);
                  totalMembers++;

                  // Update API params
                  params.groupMembers = groupMembers;
                  params.totalMembers = totalMembers;
               }
            }

            Log_WriteInfo('Finished Processing Page:  ' + currentPage + ' | Total New Members Added: ' + totalMembers);

            // GO TO THE NEXT PAGE IF THERE IS ONE
            if (data.data.node[collection].page_info && data.data.node[collection].page_info.end_cursor && data.data.node[collection].page_info.has_next_page) {
               nextPageCursor = data.data.node[collection].page_info.end_cursor;
               hasNextPage = true;
               let formDataStr = "";
               for (const [key, value] of Object.entries(formDataObj)) {
                  if (value.key) {
                     if (value.key === "variables") {
                        let _json = JSON.parse(value.value);
                        _json.count = 10;
                        _json.cursor = nextPageCursor;
                        formDataStr += value.key + "=" + encodeURIComponent(JSON.stringify(_json)) + "&";
                     } else if (value.key === "fb_api_req_friendly_name") {
                        formDataStr += value.key + "=" + encodeURIComponent("GroupsCometMembersPageNewMembersSectionRefetchQuery") + "&";
                     } else {
                        formDataStr += value.key + "=" + encodeURIComponent(value.value) + "&";
                     }
                  } else {
                     if (key === "variables") {
                        let _json = JSON.parse(value);
                        _json.count = 10;
                        _json.cursor = nextPageCursor;
                        formDataStr += key + "=" + encodeURIComponent(JSON.stringify(_json)) + "&";
                     } else if (key === "fb_api_req_friendly_name") {
                        formDataStr += key + "=" + encodeURIComponent("GroupsCometMembersPageNewMembersSectionRefetchQuery") + "&";
                     } else {
                        formDataStr += key + "=" + encodeURIComponent(value) + "&";
                     }
                  }
               }

               currentPage++
               Log_WriteInfo('Processing Page ' + currentPage + ' | Total New Members Added ' + totalMembers);

               // Update API params
               params.formDataStr = formDataStr;
               params.currentPage = currentPage;
            }
         }
      }

      params.hasNextPage = hasNextPage;
      resolve(groupMembers);
   });
}

function background_timeout(duration_ms){
   return new Promise(resolve => {
      chrome.runtime.sendMessage({
         type: 'apiAction',
         command: 'wait_a_bit',
         data: {
            delay: duration_ms
         }
      }, function(response) {
         return resolve();
      });
   });
}

async function _setTimeout(callback, delay) {
   await background_timeout(delay);
   callback.call();
}

function getQueryId() {
   let match = null;
   let scriptElems = document.body.querySelectorAll('script[type="application/json"]');
   for (const el of [...scriptElems]) {
      match = _MultiRegexpMatch(el.innerText, localizedKeywords.FacebookApi.MembersQueryID);
      if (match) {
         break;
      }
   }

   if ((match == null || match.length < 2))
   {
      Log_WriteError('getQueryId(): could not find queryID of GroupsCometMembersRootQueryRelayPreloader');
      return null;
   }

   return match[1];
}
// ==============  Facebook API ================= //

function getGroupRequestTimestamp(groupMemberRequestsContainer)
{
   let timestampStr = findElement(srchPathFBG("memberRequestContainerDate"), null, groupMemberRequestsContainer);
   if (timestampStr == null)
   {
      Log_WriteError('getGroupRequestTimestamp failed to find memberRequestContainerDate at ' + window.location.href);
      Log_WriteDOM(groupMemberRequestsContainer);
      return null;
   }
   return parseGroupLatestTimestamp(timestampStr);
}

async function parseGroupJoinRequest(memberRequestElement, groupId)
{
   let userName = findElement(srchPathFBG('memberRequestContainerName'), null, memberRequestElement);
   if (userName == null)
   {
      Log_WriteWarning('Username not found for profile, perhaps the account has been shut down.');
      return null;
   }
   let url = findElement(srchPathFBG('memberRequestsProfileUrl'), null, memberRequestElement)
   if (url == null)
   {
      Log_WriteError('parseGroupJoinRequest did not find memberRequestsProfileUrl at ' + window.location.href);
      Log_WriteDOM(memberRequestElement);
      return null;
   }
   let uid = await getFacebookAddressFromUrl(url, FacebookAddressFormatNumeric);
   
   const timestamp = getGroupRequestTimestamp(memberRequestElement);
   
   let referrerByUrl = findElement(srchPathFBG("memberRequestReferrerUrl"), null, memberRequestElement);
   let referrerUid = null;
   if (referrerByUrl != null)
   {
      referrerUid = await getFacebookAddressFromUrl(referrerByUrl, FacebookAddressFormatNumeric);
   }
   
   // DRL FIXIT! We need to handle these cases: We find the answer(s), the person did not answer the questions,
   // the group has no questions, our selector is bad (this is very important).
   let questionsElements = findElements(srchPathFBG('memberRequestQuestionElement'), null, memberRequestElement)
   let questions = [];
   
   for (let i = 0; i < questionsElements.length; i++)
   {
      let questionAnswer = findElements(srchPathFBG('memberRequestQuestionElementQuestionAnswerText'), null, questionsElements[i])
      questions.push({
         Question: questionAnswer[0].innerText,
         Answer: questionAnswer[1].innerText,
      })
   }
   return {
      GroupUid: 'fbp:' + validateAddress(groupId + '@fbgroup.socialattache.com'),
      Uid: uid,
      Name: userName,
      ReferredBy: referrerUid,
      GroupRoles: ['JoinRequested'],
      RequestDate: timestampToString(timestamp),
      Questions: questions,
   }
}

// returns false if the logged in user doesn't have access to the group
// returns null if we suspect throttling
// DRL FIXIT? this could be slightly improved by passing the timestamp or the user ID we seek so we can stop scrolling earlier
async function scrollGroupRequestsIntoView(groupId)
{
   let container = await waitForElement(srchPathFBG('memberRequestContainer'));
   if (container == null)
   {
      container = findElement(srchPathFBG("memberRequestsNone"));
      if (container)
      {
         // success, we are not returning the actual container but the caller should get no
         // matching children and we don't want to return "null" as that's for throttling
      }
      else if (findElement(srchPathFBG("facebookGroupContentUnavailable")))
      {
         Log_WriteInfo('No group member requests container found for group ' + groupId + ' at ' + window.location.href + ' and content unavailable message found.');
         return false;
      }
      else if (!findElement(srchPathFBG("facebookGroupHasLoaded")))
      {
         Log_WriteError('No group member requests container found for group ' + groupId + ' at ' + window.location.href + ' possible throttling?');
      }
      else if (!findElement(srchPathFBG("facebookGroupCanAdminister")))
      {
         Log_WriteWarning('No group member requests container found for group ' + groupId + ' at ' + window.location.href + ' possible non-member or non-admin?');
      }
      else
         Log_WriteError('No group member requests container found for group ' + groupId + ' at ' + window.location.href);
      return container;
   }
   
   let scrollable = Utilities_GetScrollableParentElement(container);
   
   let noScrollCount = 0;
   let lastHeight = scrollable.scrollHeight
   while (true)
   {
      scrollable.scrollTo(0, scrollable.scrollHeight);
      
      await sleepRand(timings.FB_WATCHED_GROUP_REQUESTS_SCROLL_DELAY)
      reqPing();
      
      if (lastHeight == scrollable.scrollHeight)
      {
         noScrollCount++;
         if (noScrollCount > 3)
            break;
      }
      else
         noScrollCount = 0;
      
      lastHeight = scrollable.scrollHeight
   }
   
   return container;
}

// lastCheck is 0 for the first check, it is never null
async function getGroupRequests(accountInfo, groupId, lastCheck, currentCheck)
{
   let container = await scrollGroupRequestsIntoView(groupId);
   if (container == false) // the above logs for us
      return [];          // no access
   if (container == null)  // the above logs for us
      return null;        // throttling
   
   let groupMemberRequestsContainers = findElements(srchPathFBG('memberRequestContainers'), null, container);
   if (groupMemberRequestsContainers.length == 0)
   {
      if (findElement(srchPathFBG("memberRequestsNone")) ||    // no member requests
         findElement(srchPathFBG("facebookGroupHasLoaded")))   // temporary broken page, treat as no requests so we don't treat as all groups throttled
      {
         return [];
      }
      
      Log_WriteError('No group member requests found for group ' + groupId + ' at ' + window.location.href);
      return null;
   }
   
   let groupMemberRequests = [];
   await sleep(2)
   
   for (let i = 0; i < groupMemberRequestsContainers.length; i++)
   {
      const timestamp = getGroupRequestTimestamp(groupMemberRequestsContainers[i]);
      if (timestamp > lastCheck && timestamp <= currentCheck)
      {
         let member = await parseGroupJoinRequest(groupMemberRequestsContainers[i], groupId);
         if (member != null)
            groupMemberRequests.push(member);
         
         reqPing();
      }
   }
   
   return groupMemberRequests;
}

async function parseStaffGroupMember(staffMemberElement, groupId)
{
   let name = findElement(srchPathFBG('staffMemberName'), null, staffMemberElement)
   if (name == null)
   {
      Log_WriteError('parseStaffGroupMember did not find staffMemberName at ' + window.location.href);
      Log_WriteDOM(staffMemberElement);
      return null;
   }
   let url = findElement(srchPathFBG('staffMemberProfileUrl'), null, staffMemberElement);
   if (url == null)
   {
      Log_WriteError('parseStaffGroupMember did not find staffMemberProfileUrl at ' + window.location.href);
      Log_WriteDOM(staffMemberElement);
      return null;
   }
   let address = await getFacebookAddressFromUrl(url, FacebookAddressFormatNumeric);
   let roles = findElements(srchPathFBG('staffMemberRoles'), null, staffMemberElement);
   if (roles == null)
   {
      Log_WriteError('parseStaffGroupMember did not find staffMemberRoles at ' + window.location.href);
      Log_WriteDOM(staffMemberElement);
      return null;
   }
   roles = massageFromRoles(roles);  // "from" roles include the group roles so we can use this method
   Utilities_AddToArray(roles, 'GroupMember'); // make sure we have this as minimum
   return {
      GroupUid: 'fbp:' + validateAddress(groupId + '@fbgroup.socialattache.com'),
      Uid: address,
      Name: name,
      GroupRoles: roles
      // Questions left out intentionally
   };
}

// lastCheck is 0 for the first check, it is never null
async function getGroupStaff(accountInfo, groupId, lastCheck, currentCheck)
{
   let staffMembersContainer = await waitForElement(srchPathFBG('staffMembersContainer'))
   if (staffMembersContainer == null)
   {
      if (!findElement(srchPathFBG("facebookGroupHasLoaded")))
      {
         Log_WriteError('No staff members container found for group ' + groupId + ' at ' + window.location.href + ' possible throttling?');
         return null;    // return throttling
      }
      if (!findElement(srchPathFBG("facebookGroupCanAdminister")))
      {
         Log_WriteWarning('No staff members container found for group ' + groupId + ' at ' + window.location.href + ' possible non-member or non-admin?');
      }
      else
         Log_WriteError('No staff members container found for group ' + groupId + ' at ' + window.location.href);
      return [];  // return no members
   }
   
   let staffMembers = [];
   let scrollable = Utilities_GetScrollableParentElement(staffMembersContainer);
   
   let noScrollCount = 0;
   let lastHeight = scrollable.scrollHeight
   while (true)
   {
      scrollable.scrollTo(0, scrollable.scrollHeight)
      
      await sleepRand(timings.FB_WATCHED_GROUP_STAFF_SCROLL_DELAY)
      reqPing();
      
      if (lastHeight == scrollable.scrollHeight)
      {
         noScrollCount++;
         if (noScrollCount > 3)
            break;
      }
      else
         noScrollCount = 0;
      
      lastHeight = scrollable.scrollHeight
   }
   let staffMembersElements = findElements(srchPathFBG('staffMemberContainerElement'), null, staffMembersContainer)
   
   for (let i = 0; i < staffMembersElements.length; i++)
   {
      let member = await parseStaffGroupMember(staffMembersElements[i], groupId);
      if (member)
         staffMembers.push(member);
      
      reqPing();
   }
   
   return staffMembers;
}

let groupMembersCache = null;   // cache 
// lastCheck is 0 for the first check, it is never null
async function getGroupMembers(accountInfo, groupId, lastCheck, currentCheck)
{
   const useApi = constants.USE_FACEBOOK_GROUP_MEMBER_IMPORT_API;
   
   let memberCount = await waitForElement(srchPathFBG("memberCount"));
   if (memberCount == null)
   {
      Log_WriteError('Missing member count for group ' + groupId + ' at ' + window.location.href);
      return [[], null];  // return no members
   }
   
   let container = await waitForElement(srchPathFBG("memberGatherContainer"));
   if (container == null)
   {
      if (!findElement(srchPathFBG("facebookGroupHasLoaded")))
      {
         Log_WriteError('No group members container found for group ' + groupId + ' at ' + window.location.href + ' possible throttling?');
         return [null, null];    // return throttling
      }
      if (!findElement(srchPathFBG("facebookGroupCanAdminister")))
      {
         Log_WriteWarning('No group members container found for group ' + groupId + ' at ' + window.location.href + ' possible non-member or non-admin?');
      }
      else
         Log_WriteError('No group members container found for group ' + groupId + ' at ' + window.location.href);
      return [[], null];  // return no members
   }
   
   Log_WriteInfo('getGroupMembers: ' + groupId + ' with cursor ' + lastCheck + ' and current check ' + currentCheck);
   
   const MilliSecondsPerMonth = SecondsPerWeek * 4 * 1000;
   const start = Date.now();
   let lastScrollTime = start;
   let groupMembersToScrape = null;
   let scrollable = Utilities_GetScrollableParentElement(container);
   let lastHeight = scrollable.scrollHeight;
   let lastMemberCount = 0;
   let timestamp = null;
   let lastTimestamp = start;
   let oneMonthIndex = null;
   let oneMonthTimestamp = start - MilliSecondsPerMonth;
   let index = null;
   let lastCheckMore = lastCheck;
   let i = (lastCheck + '').indexOf('.');
   if (i != -1) {
      const lastCheckArr = lastCheck.split(".");
      lastCheckMore = parseInt(lastCheckArr[0]);
      index = parseInt(lastCheckArr[1]);
   }
   else if (lastCheck > 0)
   {
      // when checking for group new members we have to go farther back to catch people who were invited but
      // joined later, because I don't think those get moved to the top of the list when they join, but if we
      // go too far back it'll really slow things down for very active groups
      lastCheckMore -= (SecondsPerWeek * 2) * 1000;
   }
   let lastCheckMoreStr = DateAndTime_FromEpochMilli(lastCheckMore).ToFormat(DateAndTime_ShortFormat);
   
   Log_WriteInfo('getGroupMembers: Scroll loop with index ' + index + ' and cursor ' + lastCheck +
      ' (lastCheckMore ' + lastCheckMore + ') and current check ' + currentCheck);


   let apiParams = null;
   if (useApi)
   {
      if (groupMembersCache)
      {
         groupMembersToScrape = groupMembersCache;
         lastMemberCount = groupMembersToScrape.length;
      }
      else
      {
         if (memberCount > 10)
         {
            // in this case the page will have scrolling
            apiParams = await getGroupMembersAPIParams('scroll_form_check');
         }
         else
         {
            // in this case the page will not scroll as there aren't enough members
            const queryId = getQueryId();
            apiParams = await getGroupMembersAPIParams('visible_member_check', queryId);
         }
      }
   }

   let triedFocus = false;
   do
   {
      // when the Chrome extension is running in the background this can take a minute
      if (!useApi)
         scrollable.scrollTo(0, scrollable.scrollHeight);

      await sleepRand(triedFocus
         // if we just gave the focus lets wait a bit longer to let the scroll happen
         ? timings.FB_WATCHED_GROUP_MEMBERS_SCROLL_AFTER_FOCUS_DELAY
         : timings.FB_WATCHED_GROUP_MEMBERS_SCROLL_DELAY)
      reqPing();

      if (apiParams)
         groupMembersToScrape = await getNextMembersPage(apiParams);
      else if (!useApi)
         groupMembersToScrape = findElements(srchPathFBG("allMembersGatheredToScrape"), null, container);

      if (groupMembersToScrape.length == 0)
      {
         Log_WriteError('getGroupMembers: Failed to find allMembersGatheredToScrape at ' + window.location.href);
         Log_WriteDOM(container);
         return [[], null];  // return no members
      }
      
      // in the non-API case the last few items are usually the "loading" items and are empty so skip over those
      let lastElem = null;
      let timestampStr = null;
      let i = groupMembersToScrape.length - 1;
      while (timestampStr == null && i >= 0 && i >= groupMembersToScrape.length - (useApi ? 1 : 5))
      {
         lastElem = groupMembersToScrape[i--];
         timestampStr = useApi
            ? lastElem.timestampStr
            : findElement(srchPathFBG("memberGatherContainerDate"), null, lastElem);
      }
      
      if (timestampStr == null)
      {
         Log_WriteError('getGroupMembers: Failed to find memberGatherContainerDate 1 at ' + window.location.href);
         Log_WriteDOM(lastElem);
         return [[], null];  // return no members
      }
      
      timestamp = parseGroupLatestTimestamp(timestampStr);
      
      if (lastTimestamp >= oneMonthTimestamp && oneMonthTimestamp >= timestamp)
      {
         // parsing members takes long enough that our throttling management code would reset the URL and
         // eventually recreate the tab before we were done so we let that code know that we're making progress
         // and we do it here as this seems to be a spot where we are confident things are looking up
         await reqSetActionThrottled(FB_DATA_NAME, 'getGroupMembers', false,
            'GroupId', groupId);
         
         // our check above was an overshoot so start we go back and find the actual month boundary so our index
         // moving forward is accurate
         let timestamp = null;
         i++;
         do
         {
            i--;
            timestamp = useApi
               ? groupMembersToScrape[i]['timestampStr']
               : findElement(srchPathFBG("memberGatherContainerDate"), null, groupMembersToScrape[i]);
            if (timestamp != null)
               timestamp = parseGroupLatestTimestamp(timestamp);
         } while ((timestamp == null || timestamp < oneMonthTimestamp) && i > 0);
         
         oneMonthIndex = i;
         
         // We have passed the first month boundary. From this point we no longer count dates and simply use
         // an index since the one month boundary. In this pass we're not worried about being exact, we just
         // want to load enough to get started and so we're going to overshoot if anything.
      }
      if (index !== null && oneMonthIndex !== null && groupMembersToScrape.length > oneMonthIndex + index)
      {
         // We have passed the one month boundary and found our starting point
         break;
      }
      
      const now = Date.now();
      let noScrollDelta = now - lastScrollTime;
      if (useApi ? (apiParams && apiParams.hasNextPage) : (lastHeight < scrollable.scrollHeight))
      {
         triedFocus = false;
   
         lastMemberCount = groupMembersToScrape.length;
         lastHeight = scrollable.scrollHeight;
         lastScrollTime = now;
   
         // average seconds for one item thus far
         let curDuration = (Date.now() - start) / groupMembersToScrape.length / 1000;
         // when we get to the end we have to import members in chunks of 200 and send them to the server
         // and I think each chunk will take about 2 minutes to send and process
         let estLeft = ((memberCount - groupMembersToScrape.length) * curDuration) +// yet to be parsed
            (memberCount / 200 * SecondsPerMinute * 2);                             // time to upload
         let endDate = DateAndTime_Now().Add(estLeft);
         let msg = Str(lastCheck == 0
            ? 'Found approximately <0> of <1> members. Estimated completion for phase one is <2> (plus any sleep and idle periods).'
            : 'Found approximately <0> members, going back to <3>.',
            groupMembersToScrape.length, memberCount, endDate.ToFormat('%/D %:T'), lastCheckMoreStr);
         Log_WriteInfo(msg);
         DisplayMessage(msg, 'warning', 'top_large');
      }
      else if ((apiParams && !apiParams.hasNextPage) ||
         noScrollDelta >= timings.FB_WATCHED_GROUP_MEMBERS_NO_CHANGE_TIMEOUT * 1000)
      {
         // Facebook includes "invited" people in this list so the member count must only check actual members.
         let parsedMemberCount = 0;
         let groupCreator = null;
         for (let elem of groupMembersToScrape)
         {
            let member = useApi
               ? elem
               : await parseGroupMemberFromSelector(elem, groupId);
            if (member && member.GroupRoles.includes('GroupMember'))
               parsedMemberCount++;
   
            if (parsedMemberCount % 100 == 0) reqPing();

            if (!groupCreator)
            {
            
               if (useApi && member.isGroupCreator)
                  groupCreator = member;
               else if (!useApi)
                  groupCreator = findElement(srchPathFBG("memberCreatedGroup"), null, elem);
            }
         }
         
         // allow a fudge factor on the member count to allow for it sometimes being off
         let allowedFudge = memberCount * .05;  // 5%
         
         let isThrottled = false;
         // if we are looking for all the members, we should have the group member count,
         // otherwise we don't have all the members, unless the member count is off (which
         // it sometimes is) so if we have a close enough amount with the fidge or we have
         // the group creator entry we should be good
         if (lastCheck == 0 && parsedMemberCount + allowedFudge < memberCount && !groupCreator)
         {
            Log_WriteWarning('getGroupMembers: Got only ' + parsedMemberCount + ' actual members from ' +
               groupMembersToScrape.length + ' entries of the reported ' + memberCount +
               ' members for group ' + groupId + ' at ' + window.location.href);
            if (!useApi) Log_WriteDOM(lastElem);
            isThrottled = true;  // treat as throttling so we try again later
         }
         // if we are NOT looking for all the members we should have reached the desired timestamp unless
         // when we added more time to it we went past the earliest member date so we also check the count
         else if (lastCheck != 0 && timestamp > lastCheckMore && parsedMemberCount < memberCount)
         {
            Log_WriteWarning('getGroupMembers: Got ' + groupMembersToScrape.length + ' of ' + memberCount +
               ' members but failed to find the group ' + groupId + ' member date ' + lastCheck + ', got latest of ' + timestamp + ' instead at ' + window.location.href);
            isThrottled = true;  // treat as throttling so we try again later
         }
         else if (index !== null && (oneMonthIndex === null || oneMonthIndex + index > groupMembersToScrape.length))
         {
            Log_WriteWarning('getGroupMembers: Got ' + groupMembersToScrape.length + ' of ' + memberCount +
               ' members but failed to find the group ' + groupId + ' item, one month index ' + oneMonthIndex + ' and index ' + index + ', got ' + groupMembersToScrape.length + ' members instead at ' + window.location.href);
            isThrottled = true;  // treat as throttling so we try again later
         }
         
         if (isThrottled)
         {
            if (triedFocus)
               return [null, null];  // treat as throttling so we try again later
   
            // push it to the foreground for 10 seconds
            Log_WriteInfo('Getting focus for 10 seconds to getGroupMembers()');
            if (await reqShowSyncWindowAndTab(10))
            {
               Log_WriteWarning('getGroupMembers: Focusing extension tab to try and get scrolling going');
               // let it sit 5 seconds before we try scrolling again
               await sleep(5);
            }
            else
               Log_WriteWarning('getGroupMembers: Focusing is disabled or failed so trying again (to likely fail and throttle)');
            triedFocus = true;
         }
         else
         {
            Log_WriteInfo('getGroupMembers: Waited ' + (noScrollDelta / 1000) + ' seconds without scrolling');
            break;
         }
      }
      else
      {
         continue;
      }
      
      lastTimestamp = timestamp;
      
   } while (index != null || lastCheckMore < timestamp);
   
   Log_WriteInfo('getGroupMembers: Loop exit');
   
   currentCheck = roundCheckTimeUp(currentCheck);
   if (useApi)
   {
      if (groupMembersCache == null)
         groupMembersCache = groupMembersToScrape;
   }
   else
   {
      if (groupMembersToScrape == null)
         groupMembersToScrape = findElements(srchPathFBG("allMembersGatheredToScrape"), null, container);
   }

   if (index !== null)
   {
      assert(oneMonthIndex !== null);
   }
   else
   {
      if (oneMonthIndex === null || oneMonthIndex < 0)    // it's < 0 when there are no members added in an old group
         oneMonthIndex = 0;
      
      index = groupMembersToScrape.length - oneMonthIndex - 1;
      
      if (lastCheck != 0)
      {
         let timestamp = null;
         do
         {
            // note that often the last item will be the "loading" item so it will have no date (treating as 0 here)
            timestamp = useApi
               ? groupMembersToScrape[oneMonthIndex + index]['timestampStr']
               : findElement(srchPathFBG("memberGatherContainerDate"), null,
                  groupMembersToScrape[oneMonthIndex + index]);
            if (timestamp != null)
               timestamp = parseGroupLatestTimestamp(timestamp);
   
            if (index % 100 == 0) reqPing();
            
            // we used to round up the timestamp below but this would sometimes get us stuck if the group had a lot
            // of new members in the past month since it would round up pushing us past where we started each chunk
         } while ((timestamp == null || timestamp < lastCheck) && --index > -oneMonthIndex);
      }
   }
   
   let groupMembers = []
   let cursor = lastCheck;
   let startIndex = oneMonthIndex + index;
   Log_WriteInfo('getGroupMembers: With index ' + index + ' and one month at ' + oneMonthIndex + ' starting at ' + startIndex + ' with total ' + groupMembersToScrape.length);
   for (i = startIndex; i >= 0; i--)
   {   // go through group members oldest first
      let elem = groupMembersToScrape[i];
   
      if (i % 100 == 0) reqPing();

      let timestamp = useApi
         ? elem.timestampStr
         : findElement(srchPathFBG("memberGatherContainerDate"), null, elem);
      if (timestamp == null)
      {
         Log_WriteError('getGroupMembers: Failed to find memberGatherContainerDate 2 at ' + window.location.href);
         if (!useApi) Log_WriteDOM(elem);
         timestamp = lastTimestamp;    // use the last timestamp to include this member as appropriate
      }
      else
         timestamp = parseGroupLatestTimestamp(timestamp);
      
      if (timestamp <= currentCheck)
      {
         let member = useApi
            ? elem
            : await parseGroupMemberFromSelector(elem, groupId);
         if (member)
         {   // the above should log any errors
            let found = false;
            for (let m of groupMembers)
            {
               if (m.Uid == member.Uid)
               {
                  Log_WriteError('getGroupMembers: Got duplicate group member ' + m.Uid + ' at index ' + i);
                  found = true;
               }
            }
            if (!found)
            {
               groupMembers.push(member);
   
               // we need to break out after we get too many members to keep things efficient, BUT we need to
               // break at a point where we have a timestamp that will allow us to resume at the correct spot
               // since our timestamps are not very accurate (especially the older they get), or if it's over
               // a month ago we'll use a fairly accurate index
               if (groupMembers.length >= constants.MAXIMUM_MEMBERS_PER_CHUNK &&
                  ((oneMonthIndex && i >= oneMonthIndex) ||                   // we can break out anywhere when using indices
                     // because the timestamps are a combination of vague (Joined about 2 months ago) and specific
                     // (Added by X on December 24) we have to stop when the new timestamp is later than the last one
                     // otherwise we can get stuck in a loop re-parsing the same chunk
                     (lastTimestamp != timestamp && timestamp > lastCheck))) // we have to break out when the timestamp is different
               {
                  cursor = timestamp;
                  if (oneMonthIndex && i >= oneMonthIndex)
                     cursor += '.' + (i - oneMonthIndex); // the cursor will contain the timestamp (one or more months ago) and the index from the one month point
                  Log_WriteInfo('getGroupMembers: Early exit with ' + groupMembers.length + ' members retrieved. New cursor: ' + cursor);
                  break;
               }
            }
         }
      }
      
      lastTimestamp = timestamp;
   }
   
   if (i < 0)
   {
      cursor = currentCheck;  // we've imported all the members
      groupMembersCache = null;
   }

   Log_WriteInfo('getGroupMembers: Imported ' + groupMembers.length + ' members from ' + (startIndex - (groupMembers.length - 1)) + ' to ' + startIndex + ' for group ' + groupId);
   
   return [groupMembers, cursor];
}

async function parseGroupMemberFromSelector(element, groupId)
{
   // use the cached data if found
   if (element.hasAttribute('data-membercache'))
      return Json_FromString(element.getAttribute('data-membercache'));
   
   let name = findElement(srchPathFBG("memberGatherContainerName"), null, element)
   if (name == null)
   {
      Log_WriteError('parseGroupMemberFromSelector failed to find memberGatherContainerName at ' + window.location.href);
      Log_WriteDOM(element);
      return null;
   }
   let url = findElement(srchPathFBG("memberGatherContainerUrl"), null, element)
   if (url == null)
   {
      setSelectorVariables({MemberName: name});
      if (!findElement(srchPathFBG("memberGatherContainerNoUrl"), null, element))
      {
         Log_WriteError('parseGroupMemberFromSelector failed to find memberGatherContainerUrl at ' + window.location.href);
         Log_WriteDOM(element);
      }
      else
         Log_WriteInfo('parseGroupMemberFromSelector(): Member ' + name + ' appears to be a closed account, from ' + document.location.href);
      clearSelectorVariables();
      return null;
   }
   let groupRole = 'GroupMember';
   let isInvitedOnly = findElement(srchPathFBG("memberGatherContainerInvitedOnly"), null, element)
   if (isInvitedOnly)
      groupRole = 'InvitedOnly';
   let referrerByUrl = findElement(srchPathFBG("memberReferrerUrl"), null, element);
   let referrerUid = null;
   if (referrerByUrl != null)
   {
      referrerUid = await getFacebookAddressFromUrl(referrerByUrl, FacebookAddressFormatNumeric);
   }
   let timestamp = findElement(srchPathFBG("memberGatherContainerDate"), null, element);
   if (timestamp == null)
   {
      Log_WriteError('parseGroupMemberFromSelector failed to find memberGatherContainerDate at ' + window.location.href);
      Log_WriteDOM(element);
      return null;
   }
   timestamp = parseGroupLatestTimestamp(timestamp);
   let uid = await getFacebookAddressFromUrl(url, FacebookAddressFormatNumeric);
   if (uid == null)
   {
      Log_WriteError('parseGroupMemberFromSelector failed to get numeric group member ID for ' + name + ' from ' + url);
      return null;
   }
   let groupUid = 'fbp:' + validateAddress(groupId + '@fbgroup.socialattache.com');
   assert(uid != groupUid);    // saw a member UID that matched the group UID
   let data = {
      GroupUid: groupUid,
      Uid: uid,
      Name: name,
      ReferredBy: referrerUid,
      GroupRoles: [groupRole],
      JoinDate: timestampToString(timestamp),
      // Questions left out intentionally
   }
   
   // cache it since this method can be called repeatedly for the same element
   element.setAttribute('data-membercache', Json_ToString(data));
   
   return data;
}

// this clean date string before converting it
function parseGroupLatestTimestamp(timestampString)
{
   // DRL FIXIT! We need to make "a few seconds ago" work in other languages.
   timestampString = timestampString.replace('a few', '5');
   
   // the date string could be preceded with things like "Joined about" or "Invited by Dominique Lacerte"
   // which are supposed to be stripped off by the selector, but just in case we try the longest string
   // and keep taking parts off the front until we can parse it
   let parts = timestampString.split(' ');
   let i = parts.length;
   do
   {
      let string = parts.slice(parts.length - i, parts.length).join(' ');
      let timestamp = convertTimeAgoToTimestamp(string, true);
      if (timestamp != null)
      {
         if (i < parts.length)
         {
            // we want the selector to do this work for us as much as possible
            Log_WriteWarning('Passed group time of "' + timestampString + '" had to be reduced to "' + string + '" before it could be parsed.');
         }
         return timestamp;
      }
      i--;
   } while (i >= 0);
   
   Log_WriteError('Unable to decode group time ago from "' + timestampString + '" at ' + window.location.href);
   return null;
}

// this parses the answers from the profile page after they have become a group member
async function getGroupMemberAnswers(accountInfo, groupId, userId)
{
   let groupMember =
      {
         GroupUid: groupId,
         Uid: userId,
         Questions: [],
      };
   
   let container = await waitForElement(srchPathFBG("memberAnswersContainer"));
   if (container == null)
   {
      if (findElement(srchPathFBG('memberProfileUnavailable')))
      {
         Log_WriteInfo("Facebook member profile is not available at " + window.location.href);
         return groupMember;
      }
      if (findElement(srchPathFBG('memberProfileLoaded')))
      {
         Log_WriteInfo("Facebook member profile has no answers container at " + window.location.href);
         return groupMember;
      }
      
      Log_WriteError('No group member answers container found at ' + window.location.href);
      return null;    // return throttling
   }
   
   let buttonOpenAnswers = await waitForElement(srchPathFBG('memberViewAnswersButton'), 4, container);
   let buttonNoAnswersYet = findElement(srchPathFBG('memberViewNoAnswersYetButton'), null, container);
   if (buttonOpenAnswers == null)
   {
      if (buttonNoAnswersYet == null)
      {
         Log_WriteError('getGroupMemberAnswers failed to find memberViewAnswersButton and memberViewNoAnswersYetButton at ' + window.location.href);
         Log_WriteDOM(container);
      }
      return groupMember;
   }
   buttonOpenAnswers.click()
   
   let questionsDialog = await waitForElement(srchPathFBG('memberQuestionsDialog'))
   
   let questionContainers = findElements(srchPathFBG('memberQuestionsContainer'), null, questionsDialog);
   for (let questionContainer of questionContainers)
   {
      let question = findElement(srchPathFBG('memberQuestionsContainerQuestion'), null, questionContainer);
      if (question == null)
      {
         Log_WriteError('getGroupMemberAnswers failed to find memberQuestionsContainerQuestion at ' + window.location.href);
         Log_WriteDOM(questionContainer);
      }
      
      let answer = null;
      
      // The rules checkbox comes in as a question so let's turn it into a common format
      if ((new RegExp(keywordFBG('AgreedToGroupRules'), 'i')).test(question))
      {
         question = 'Agreed to group rules';
         answer = 'true';
      }
      else if ((new RegExp(keywordFBG('DidntAgreeToGroupRules'), 'i')).test(question))
      {
         question = 'Agreed to group rules';
         answer = 'false';
      }
      else
      {
         answer = findElement(srchPathFBG('memberQuestionsContainerAnswer'), null, questionContainer);
         if (answer == null)
         {
            Log_WriteError('getGroupMemberAnswers failed to find memberQuestionsContainerAnswer at ' + window.location.href);
            Log_WriteDOM(questionContainer);
         }
         
         // Facebook returns a common response for questions not answered
         if ((new RegExp(keywordFBG('NoAnswer'), 'i')).test(answer))
            answer = '';
      }
      
      groupMember.Questions.push({
         Question: question,
         Answer: answer,
      })
   }
   
   return groupMember;
}
