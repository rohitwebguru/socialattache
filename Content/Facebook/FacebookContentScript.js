async function reqSetChats(dataName, accountID, urls, currentCheck, historySynced)
{
   return Messaging.SendMessageToBackground({
      type: 'setChats',
      dataName: dataName,
      accountID: accountID,
      urls: urls,
      currentCheck: currentCheck,
      historySynced: historySynced
   });
}

// if cursor is not null it indicates that retrieval did not complete and this is where we should resume
async function reqSetMessages(dataName, accountID, url, cursor, messages)
{
   return Messaging.SendMessageToBackground({
      type: 'setMessages',
      dataName: dataName,
      accountID: accountID,
      url: url,
      cursor: cursor,
      messages: messages
   });
}

// if cursor is not null it indicates that retrieval did not complete and this is where we should resume
async function reqSetFriends(dataName, accountID, cursor, friends)
{
   return Messaging.SendMessageToBackground({
      type: 'setFriends',
      dataName: dataName,
      accountID: accountID,
      cursor: cursor,
      friends: friends
   });
}

async function reqSetComments(dataName, accountID, externalPostID, currentCheck, cursor, comments)
{
   return Messaging.SendMessageToBackground({
      type: 'setComments',
      dataName: dataName,
      accountID: accountID,
      externalPostID: externalPostID,
      currentCheck: currentCheck,
      cursor: cursor,
      comments: comments
   });
}

async function reqSetGroupMembers(dataName, accountID, groupId, currentCheck, memberType, groupMembers, syncCommandID, errorMessage)
{
   return Messaging.SendMessageToBackground({
      type: 'setGroupMembers',
      dataName: dataName,
      accountID: accountID,
      groupId: groupId,
      currentCheck: currentCheck,
      memberType: memberType,
      groupMembers: groupMembers,
      command: {
         SyncCommandID: syncCommandID,
         SyncCommand: 'GroupMemberAnswers',   // DRL FIXIT? This is a hack, should be passed in.
         ErrorMessage: errorMessage
      },
   });
}

async function reqSetGroupChatParticipants(dataName, accountID, conversationId, currentCheck, groupChatParticipants)
{
   return Messaging.SendMessageToBackground({
      type: 'setGroupChatParticipants',
      dataName: dataName,
      accountID: accountID,
      conversationId: conversationId,
      currentCheck: currentCheck,
      groupChatParticipants: groupChatParticipants
   });
}

async function reqSetGroupInfo(dataName, accountID, groupInfo)
{
   return Messaging.SendMessageToBackground({
      type: 'setGroupInfo',
      dataName: dataName,
      accountID: accountID,
      data: groupInfo
   });
}

async function reqSetGroupQuestions(dataName, accountID, groupQuestions)
{
   return Messaging.SendMessageToBackground({
      type: 'setGroupQuestions',
      dataName: dataName,
      accountID: accountID,
      data: groupQuestions
   });
}

// members is a hash of {id: name}
async function reqSetCustomList(dataName, accountID, listUid, currentCheck, members)
{
   return Messaging.SendMessageToBackground({
      type: 'setCustomList',
      dataName: dataName,
      accountID: accountID,
      listUid: listUid,
      currentCheck: currentCheck,
      members: members
   });
}

async function reqSetCustomListUpdated(dataName, accountID, syncCommandID, listUid, updateMembers, lastServerUpdated, errorMessage)
{
   return Messaging.SendMessageToBackground({
      type: 'setCustomListUpdated',
      dataName: dataName,
      accountID: accountID,
      command: {
         SyncCommandID: syncCommandID,
         SyncCommand: 'UpdateCustomList',
         ErrorMessage: errorMessage
      },
      listUid: listUid,
      updateMembers: updateMembers,
      lastServerUpdated: lastServerUpdated
   });
}

// I've noticed that when a FB user account is not available (shut down or blocked) the final URL is the same
// as the one we request, whereas an available user will either redirect to their "handle" URL if they have one
// configured or it will redirect to a profile.php style URL.
async function isFacebookAccountAvailable(id)
{
   assert(id != null);
   let url = 'https://www.facebook.com/' + id;
   let result = await Messaging.SendMessageToBackground({type: 'getFinalUrl', url: url});
   return !fuzzyUrlsMatch(url, result);
}


async function loopFacebook()
{
   console.log(DateAndTime_Now() + " loopFacebook()");    // this is here so we can click on it in the console for easier debugging ;-)
   
   try
   {
      if (!await reqInitTab(FB_DATA_NAME))
         return;
      
      let accountInfo = null;
      let noAccountInfoCount = 0;
      let isThrottled = null;
      
      // as soon as the page loads try to pause anything that plays as (1) it may have sound and (2) when it
      // ends it may take us to a different video than the one we want to scrape
      await pauseFacebookVideo();
      await pauseFacebookStory();
      
      while (true)
      {
         let delay = timings.BUSY_LOOP_DELAY;
         
         try
         {
            if (!Storage.IsAllStorageReady())
            {
               Log_WriteWarning('Storage not ready for Facebook, waiting');
               await sleep(2);
               continue;
            }
            
            if (!await reqCheckSocialAttacheLogin(true))
            {
               await pingingSleep(timings.SA_NOT_LOGGED_IN_DELAY);
               continue;
            }
            
            if (accountInfo == null || accountInfo.id == null)
            {
               Log_WriteInfo('Getting Facebook account info');
               accountInfo = getFacebookAccountInfo();
               if (accountInfo != null)
               {
                  Log_WriteInfo('Account info: ' + GetVariableAsString(accountInfo));
                  noAccountInfoCount = 0;
               }
               else
               {
                  Log_WriteWarning('No Account info!');
                  noAccountInfoCount++;
               }
               if (accountInfo == null)
               {
                  // some actions like fetching contacts are using pages where we don't always have the
                  // account info but we can still perform those actions
                  accountInfo = {
                     name: null,
                     id: null
                  };
               }
            }
            
            // DRL FIXIT! For those items below that use this value I suspect the logic should be moved to the
            // background script and we should not pass a currentCheck in our message to the background and
            // have the background script generate a date as needed.
            let currentCheck = Date.now();
            
            // added this to check for a global "throttled/blocked" response from Facebook since we started seeing this on 13 Jul 2022
            // DRL NOTE: I am seeing this for message scraping, and then if I change to the feed I'm not throttled
            // there, and then when I come back to messages I am throttled. So I believe this throttling is specific
            // to certain pages.
            // Sometimes on FB we are sitting at the login screen even after login so if we get no account info after
            // about 5 minutes treat as throttled so the URL will get reset and if that doesn't work we'll get a recreated window.
            let lastIsThrottled = isThrottled;
            isThrottled = !!(noAccountInfoCount >= 30 ||   // about 5 minutes
               findElement(elementPaths.Facebook.throttled));
            
            let resp = await reqGetAction(FB_DATA_NAME, accountInfo.id, accountInfo.name);
            if (resp == null)
            {
               Log_WriteInfo('Background not ready');
            }
            else if (resp.action && isThrottled)
            {
               await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               resp.action = null;
            }
            else if (lastIsThrottled != isThrottled)
               await reqSetThrottled(FB_DATA_NAME, isThrottled, 'generic');
            
            if (resp == null || resp.action == null)
            {
               delay = timings.IDLE_LOOP_DELAY;
            }
            else if (resp.action == 'wait')
            {
               delay = resp.seconds;
            }
            else if (resp.action == 'getChats')
            {
               let [chats, historySynced] = await getChats(resp.lastCheck, resp.historySynced);
               if (chats == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               else
                  await reqSetChats(FB_DATA_NAME, accountInfo.id, chats, currentCheck, historySynced);
            }
            else if (resp.action == 'getMessages')
            {
               assert(resp.url != null);
               const origUrl = window.location.href;
               const conversationId = getConversationIdFromMessengerUrl(resp.url);
               Log_WriteInfo('Processing conversation ' + conversationId);
               // DRL FIXIT? I added the date below as we were getting old conversations here (one year old
               // when we're only going back 4 days) so I suspect there is a bug in getChats() returning old
               // conversations. When that's fixed we could remove this?
               let [found, isRead] = await scrollToConversation(resp.lastCheck, resp.url);
               let [messages, cursor] = [[], null];
               if (found && conversationId)
               {
                  [messages, cursor] = await getMessages(accountInfo, conversationId, isRead, resp.lastCheck, resp.currentCheck);
               }
               let canKeepGoing = false;
               if (isRead === null || messages === null)
               {
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               }
               else
               {
                  canKeepGoing = await reqSetMessages(FB_DATA_NAME, accountInfo.id, resp.url, cursor, messages);
                  
Log_WriteInfo('Cursor: ' + GetVariableAsString(cursor));
                  if (cursor == null)
                  {
Log_WriteInfo('Messages length: ' + GetVariableAsString(messages.length));
if (messages.length > 0)
   Log_WriteInfo('IsChatRoom: ' + GetVariableAsString(messages[0].IsChatRoom));
const feature = UserHasFeature(UserFeaturesWatchedGroupChats);
Log_WriteInfo('Has feature: ' + GetVariableAsString(feature));

                     // when we are finished parsing all the messages in the conversation (do the above
                     // first because that will create the conversation) then we'll get the participants
                     if (messages.length == 1 && messages[0].IsChatRoom && UserHasFeature(UserFeaturesWatchedGroupChats))
                     {
                        // DRL FIXIT? This logic should be handled by the background script in case we have to retry!
                        // DRL FIXIT? We can optimize to do this only if the getMessages() saw a notice about a new participant!
                        let participants = await getGroupChatParticipants(accountInfo, conversationId, false);
Log_WriteInfo('Participants: ' + GetVariableAsString(participants));
                        if (participants == null)
                           /*await reqSetActionThrottled(FB_DATA_NAME, resp.action)*/;
                        else
                           await reqSetGroupChatParticipants(FB_DATA_NAME, accountInfo.id, conversationId, resp.currentCheck, participants);
                     }
                     if (canKeepGoing)   // put a delay between conversations
                        delay = timings.INTER_CONVERSATION_CHECK_DELAY;
                  }
               }
               // make sure when we leave that the conversation is in the correct state, except when we're being
               // throttled as trying will fail anyway
               if (isRead === false && messages != null)
               {
                  Log_WriteInfo('Marking conversation ' + conversationId + ' as unread');
                  await markConversationUnread(resp.url);
               }
               else
               {
                  Log_WriteInfo('Leaving conversation ' + conversationId + ' as read');
                  // don't reload the page if we can keep going as it saves a lot of time
                  if (!canKeepGoing)
                     window.location.href = origUrl; // return to original so if a new message comes into the selected convo it is marked unread
               }
            }
            else if (resp.action == 'skipConversation')
            {
               await reqSetMessages(FB_DATA_NAME, accountInfo.id, resp.url, null, []);
               continue;   // no wait, just check again for next action
            }
            else if (resp.action == 'getFriends')
            { // Get friends action
               let [friends, cursor] = await getFriends(resp.cursor);
               if (friends == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               else if (await reqSetFriends(FB_DATA_NAME, accountInfo.id, cursor, friends))
                  continue;   // no wait, just check again for next action
               
               delay = timings.INTER_FRIENDS_CHECK_DELAY;
            }
               /* Not Used Since - 29/12/2021
               else if (resp.action == 'checkLastId') {
                   await checkLastId(accountInfo, resp.message);
               }*/
            /* Now processed with messages.
                            else if(resp.action == 'getGroupChatParticipants'){
                                let participants = await getGroupChatParticipants(accountInfo, resp.groupChatUid, false);
                                if (participants == null)
                                    await reqSetActionThrottled(FB_DATA_NAME, resp.action);
                                else
                                    await reqSetGroupChatParticipants(FB_DATA_NAME, accountInfo.id, resp.groupChatUid, currentCheck, participants);
                            }
            */
            else if (resp.action == 'sendMessage')
            {
               let [messageID, errorMessage] = await sendMessage(resp.message);
               let from = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>';
               await reqSetMessageId(FB_DATA_NAME, accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, messageID, from, errorMessage);
            }
/* It looks like Facebook disabled the mobile version of Messenger around 2024/03/12
            else if (resp.action == 'sendBasicMessage')
            {
               if (!await sendBasicMessage(resp.message))  // returns false on error
                  await reqSetMessageId(FB_DATA_NAME, accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, ERROR_EXTERNAL_ID, null);
               else
               {
                  // the page will reload and then we'll see if the send was successful
                  await reqPushAction(null, {
                     action: 'checkIfBasicMessageIsSent',
                     message: resp.message
                  });
                  delay = 5;  // just wait long enough for page to reload
               }
            }
            else if (resp.action == 'checkIfBasicMessageIsSent')
            {
               let [messageID, errorMessage] = checkIfBasicMessageIsSent(resp.message);
               // for the basic case we don't usually have the account name and we don't want to use "null" for it
               let from = (accountInfo.name ? accountInfo.name + ' ' : '') +
                  '<' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>';
               await reqSetMessageId(FB_DATA_NAME, accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, messageID, from, errorMessage);
            }
 */
            else if (resp.action == 'makeComment')
            {
               let commentID = null;
               let errorMessage = null;
               if (typeof resp.message.InReplyToBody == 'undefined' || resp.message.InReplyToBody == null)
               {
                  if (window.location.pathname.startsWith('/groups/'))
                     commentID = await commentOnGroupPost(resp.message.Body, resp.message.To)
                  else
                     commentID = await commentOnGeneralPost(resp.message.Body, resp.message.To)
               }
               else
               {
                  let toName = getEmailName(resp.message.To[0]);
                  let toID = getEmailPrefix(resp.message.To[0]);
                  if (accountInfo.id == toID)
                  {
                     // avoid endless loop of replying to our own comment
                     commentID = ERROR_EXTERNAL_ID;
                     errorMessage = Str('Trying to comment on self');
                  }
                  else
                  {
                     [commentID, errorMessage] = await replyComment(toName, resp.message.InReplyToBody, resp.message.Body)
                  }
               }
               let from = (accountInfo.name ? accountInfo.name + ' ' : '') +
                  '<' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>';
               await reqSetCommentId(FB_DATA_NAME, accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, commentID, from, errorMessage);
            }
            else if (resp.action == 'makePost')
            {
               let postID = null;
               let from = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>';
               
               if (resp.post.MessageBoxUid.includes('@fbgroup.socialattache.com'))
               {
                  //TODO Old code for group post
                  postID = await makeGroupPost(accountInfo.id, resp.post);
                  await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, postID, from, null);
               }
               else if (resp.post.MessageBoxUid.includes('@fbpage.socialattache.com'))
               {
                  let res = await openPagePostComposerOnMobileBasicVersion(accountInfo, resp.post);
                  if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
               }
               else if (resp.post.Type == 'fbp_story')
               {
                  let res = await makeStoryPost(accountInfo, resp.post);
                  await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, from, null);
               }
               else
               {
                  let res = await openFeedPostComposerOnMobileBasicVersion(accountInfo, resp.post);
                  if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
               }
            }
            else if (resp.action == 'makeFeedPost_OnComposerOpen')
            {
               let res = await makeFeedPostOnMobileBasicVersion(resp.accountInfo, resp.post)
               if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
            }
            else if (resp.action == 'makeFeedPost_OnPrivacyChange')
            {
               let res = await makeFeedPost_changePrivacy(resp.accountInfo, resp.post)
               if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
            }
            else if (resp.action == 'makeFeedPost_Attachments')
            {
               let res = await makeFeedPost_Attachments(resp.accountInfo, resp.post);
               if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
            }
            else if (resp.action == 'makePagePost_OnComposerOpen')
            {
               let res = await makePagePostOnMobileBasicVersion(resp.accountInfo, resp.post)
               if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
            }
            else if (resp.action == 'makePagePost_Attachments')
            {
               let res = await makePagePost_Attachments(resp.accountInfo, resp.post);
               if (res !== true) await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, res, null, null);
            }
            else if (resp.action == 'makePost_Finalize')
            {
               let from = validateAddress(accountInfo.id + '@fbperid.socialattache.com');
               await reqSetPostId(FB_DATA_NAME, accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, NO_EXTERNAL_ID, from, null);
               window.location.href = "/";
            }
            else if (resp.action == 'getContact')
            {
               let vCard = await getvCardFromFacebookProfileOrPage(resp.contactID);
               if (vCard == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               else
                  delay = await reqSendContact(FB_DATA_NAME, resp.accountID, resp.syncCommandID, vCard);
            }
            else if (resp.action == 'getComments')
            {
               // we need the username in order to identify sent/inbox folder
               if (!accountInfo.hasOwnProperty('username'))
                  accountInfo.username = await getFacebookAddressFromId(accountInfo.id, FacebookAddressFormatUsername, 'fbperid');
               let [comments, cursor, newCurrentCheck] = await getComments(accountInfo, resp.externalPostID,
                  resp.postUrl, resp.lastCheck, resp.cursor, currentCheck);
               if (comments == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               else
                  await reqSetComments(FB_DATA_NAME, accountInfo.id, resp.externalPostID,
                     cursor ? resp.lastCheck : newCurrentCheck, cursor, comments);
               if (cursor) delay = 0;
            }
            else if (resp.action == 'Friend' || resp.action == 'Unfriend')
            {
               let result = await changeFriendship(resp.action == 'Friend');
               await reqCommandCompleted(FB_DATA_NAME, accountInfo.id, resp.syncCommandID, resp.action, null, null, result);
            }
            else if (resp.action == 'GroupAccept' || resp.action == 'GroupDecline')
            {
               let result = await groupJoinRequestAction(resp.action == 'GroupAccept', resp.userID, resp.groupID, resp.reason);
               await reqCommandCompleted(FB_DATA_NAME, accountInfo.id, resp.syncCommandID, resp.action, resp.groupID, null, result);
            }
            else if (resp.action == 'GroupMemberAnswers')
            {
               let member = await getGroupMemberAnswers(accountInfo, resp.groupID, resp.userID);
               if (member == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action, true, 'GroupId', resp.groupId);
               else if (await reqSetGroupMembers(FB_DATA_NAME, accountInfo.id, resp.groupID, currentCheck, 'Answers',
                  member == null ? null : [member], resp.syncCommandID, null))
                  continue;   // no wait, just check again for next action (get next answers)
            }
            else if (resp.action == 'GroupChatInvite')
            {
               let result = await inviteToGroupChat(accountInfo, resp.userID)
               await reqCommandCompleted(FB_DATA_NAME, accountInfo.id, resp.syncCommandID, resp.action, null, null, result);
            }
            else if (resp.action == 'FetchComment')
            {
               let [comment, errorMessage] = await getComment(accountInfo, resp.PostID, resp.PostUrl, resp.CommentID, resp.CommentDate, resp.CommentBody);
               if (comment) comment.MessageID = resp.MessageID; // for efficiency we keep track of the local server ID
               await reqSetComment(FB_DATA_NAME, accountInfo.id, resp.syncCommandID, comment, errorMessage);
            }
            else if (resp.action == 'getGroupRequests')
            {
               let members = await getGroupRequests(accountInfo, resp.groupId, resp.lastCheck, currentCheck);
               if (members == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action, true, 'GroupId', resp.groupId);
               else if (await reqSetGroupMembers(FB_DATA_NAME, accountInfo.id, resp.groupId, currentCheck, 'Requests', members))
                  continue;   // no wait, just check again for next action (get answers)
               delay = timings.INTER_GROUP_CHECK_DELAY;
            }
            else if (resp.action == 'getGroupStaff')
            {
               let members = await getGroupStaff(accountInfo, resp.groupId, resp.lastCheck, currentCheck);
               if (members == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action, true, 'GroupId', resp.groupId);
               else if (await reqSetGroupMembers(FB_DATA_NAME, accountInfo.id, resp.groupId, currentCheck, 'Staff', members))
                  continue;   // no wait, just check again for next action
               delay = timings.INTER_GROUP_CHECK_DELAY;
            }
            else if (resp.action == 'getGroupMembers')
            {
               let [members, cursor] = await getGroupMembers(accountInfo, resp.groupId, resp.lastCheck, currentCheck);
               if (members == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action, true, 'GroupId', resp.groupId);
               else if (await reqSetGroupMembers(FB_DATA_NAME, accountInfo.id, resp.groupId, cursor ? cursor : currentCheck, 'Members', members))
                  continue;   // no wait, just check again for next action
               delay = timings.INTER_GROUP_CHECK_DELAY;
            }
               /* This is now done as a SyncCommand.
                               else if(resp.action == 'getGroupMemberAnswers'){
                                   let member = await getGroupMemberAnswers(accountInfo, resp.groupMember);
                                   if (member == null)
                                       await reqSetActionThrottled(FB_DATA_NAME, resp.action, true, 'GroupId', resp.groupId);
                                   else if (await reqSetGroupMembers(FB_DATA_NAME, accountInfo.id, resp.groupId, currentCheck, 'Answers', member == null ? null : [member]))
                                       continue;   // no wait, just check again for next action
                                   delay = timings.INTER_GROUP_MEMBER_CHECK_DELAY;
                               }
               */
            /*
                            else if(resp.action == 'getGroupQuestions'){
                                let groupQuestions = await getGroupQuestions(resp.groupId);
                                if (groupQuestions == null)
                                    await reqSetActionThrottled(FB_DATA_NAME, resp.action, true, 'GroupId', resp.groupId);
                                else
                                    await reqSetGroupQuestions(FB_DATA_NAME, accountInfo.id, resp.groupId, currentCheck, groupQuestions);
                            }
            */
            else if (resp.action == 'getCustomList')
            {
               let members = await getCustomList(resp.listUid);
               if (members == null)
                  await reqSetActionThrottled(FB_DATA_NAME, resp.action);
               else
                  await reqSetCustomList(FB_DATA_NAME, accountInfo.id, resp.listUid, currentCheck, members);
               delay = timings.INTER_CUSTOM_LIST_CHECK_DELAY;
            }
            else if (resp.action == 'UpdateCustomList')
            {
               let errorMessage = await updateCustomListMembership(resp.listUid, resp.updateMembers);
               // NOTE: the above removes failed items from "updateMembers" so we pass only the successfull
               // items below to be added/removed from the cached list so it always matches the Facebook list
               await reqSetCustomListUpdated(FB_DATA_NAME, accountInfo.id, resp.syncCommandID, resp.listUid, resp.updateMembers, resp.lastServerUpdated, errorMessage);
               delay = timings.INTER_CUSTOM_LIST_UPDATE_DELAY;
            }
            else if (resp.action == 'CreateCustomList')
            {
               let [listUid, errorMessage] = await createCustomList(resp.listName);
               await reqCommandCompleted(FB_DATA_NAME, accountInfo.id, resp.syncCommandID, resp.action, null, listUid, errorMessage);
            }
            else
            {
               assert(0, "Unrecognized action: " + resp.action);
            }
         }
         catch (e)
         {
            accountInfo = null; // in case the exception was due to logging out, try to get account info
            delay = await handleScraperException(FB_DATA_NAME, e, 'https://' + window.location.host);
         }
         
         try
         {
            await pingingSleep(delay);
         }
         catch (e)
         {
            await handleScraperException(FB_DATA_NAME, e, 'https://' + window.location.host);
         }
      }
   }
   catch (e)
   {
      if (e.message.indexOf('Extension context invalidated') != -1 ||
         e.message.indexOf('message channel closed') != -1 ||
         e.message.indexOf('message port closed') != -1)
      {
         window.location.reload();  // background script unloaded or reloaded
      }
      else
         Log_WriteException(e);
   }
}

DocumentLoad.AddCallback(function(rootNodes)
{
   if (rootNodes.length != 1 || rootNodes[0] != document.body)
      return;     // this only needs to be done once on initial page load
   
   loopFacebook();     // this is an async function we are launching and returning right away
});

