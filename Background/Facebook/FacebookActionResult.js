function HandleFacebookActionResult(sender, request, sendResponse)
{
   if (request.type == 'setActionThrottled' && request.isThrottled)
   {
      ActionCheck_Aborting(FB_DATA_NAME);
      ActionSelection_ActionThrottled(FB_DATA_NAME, request.action);
      
      Log_WriteWarning(request.action + ' is being throttled at ' + sender.url)
      
      let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
      let now = Date.now();
      
      if (request.action == 'getContact')
         contactFetchThrottled(FB_DATA_NAME);
      else if (request.action == 'getChats' || request.action == 'getMessages' /*|| request.action == 'getGroupChatParticipants'*/)
         localData.skipCheckingMessagesUntil = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'getFriends')
         localData.skipCheckingFriendsUntil = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'getComments')
         localData.skipCheckingPostsUntil = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'getGroupRequests' || request.action == 'getGroupStaff' || request.action == 'getGroupMembers' ||
         request.action == 'getGroupQuestions')
      {
// We now treat all groups throttling together, because checking a number of groups periodically to see if
// they can be accessed was preventing other actions from being processed.
//         if (request.GroupId != undefined) {
//            localData.skipCheckingGroupsUntil[request.GroupId] = now + timings.THROTTLED_DELAY * 1000;
//         }
//         else
         {
            // throttling caught by the generic code so no group ID provided, pause them all
            let groupInfos = getGroupInfos();
            for (let id of Object.keys(groupInfos))
               localData.skipCheckingGroupsUntil[id] = now + timings.THROTTLED_DELAY * 1000;
         }
      }
      else if (request.action == 'GroupMemberAnswers')
         localData.skipActionUntil[request.action] = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'getCustomList')
         localData.skipCheckingCustomListsUntil = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'sendBasicMessage')
         localData.skipSendingBasicMessengerMessagesUntil = now + timings.BLOCKED_MESSAGE_DELAY * 1000;
      else if (request.action == 'sendMessage')
         localData.skipSendingAnyMessengerMessagesUntil = now + timings.BLOCKED_MESSAGE_DELAY * 1000;
      else if (request.action == 'makeComment')
         localData.skipMakingCommentsUntil = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'wait')
         Log_WriteInfo('Ignoring throttled action "' + request.action + '"');
      else
         Log_WriteError('Unexpected throttled action "' + request.action + '"');
      
      Storage.SetLocalVar('BG_FB', localData);
      
      if (request.action != 'wait')
         setTabThrottled(sender.tab.id, true, request.action);
      
      sendResponse();
   }
   else if (request.type == 'setActionThrottled')
   {
      assert(request.isThrottled == false);
      setTabThrottled(sender.tab.id, false, request.action);
      sendResponse();
   }
   else if (request.type == 'setSyncCommand')
   {
      let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
      
      let now = Date.now();
      localData.skipActionUntil[request.command.SyncCommand] = now + timings.Commands[request.command.SyncCommand].ActionDelay * 1000;
      
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, request.command.SyncCommand);
      
      Storage.SetLocalVar('BG_FB', localData);
      
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse(true);
               return;
            }
            
            let syncData = null;    // default is no change
            if (request.command.SyncCommand == 'GroupAccept')
            {
               // if we have accepted a group member, we should check for new group members within 5 minutes
               // to avoid delay onboarding the new member (which may include a timely welcome message)
               
               syncData = decodeFacebookSyncData(resp.SyncData);
               
               let groupID = Url_GetEmailPrefix(request.command.ExternalItemID);
               let checkTime = (now - timings.WATCHED_GROUP_REQUESTS_DELAY * 1000) + (SecondsPerMinute * 4 * 1000);
               if (!syncData.watchedGroupMembersLastSynced.hasOwnProperty(groupID) ||
                  syncData.watchedGroupMembersLastSynced[groupID] > checkTime)
               {
                  Log_WriteInfo('GroupAccept setting watchedGroupMembersLastSynced for group ' + groupID + ': ' + checkTime);
                  syncData.watchedGroupMembersLastSynced[groupID] = checkTime;
               }
               else
                  syncData = null;  // no change
   
               if (syncData !== null)
                  syncData = encodeFacebookSyncData(syncData);
            }
            
            setServerState(FB_DATA_NAME, request.accountID, null, syncData, null, null, request.command)
               .then(resp => sendResponse(true))
               .catch(error =>
               {
                  Log_WriteError("Error handling setSyncCommand(): " + error);
                  sendResponse(false);
               });
         })
         .catch(error =>
         {
            Log_WriteError("Error handling getSyncCommand(): " + error);
            sendResponse(false);
         });
   }
   else if (request.type == 'setMessageId')
   {
      if (!request.hasOwnProperty('usingApi') || !request.usingApi)
      {
         if (isTemporaryTab(sender.tab.id))
         { // in the basic case we don't use a temporary tab so we check first
            ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'sendMessage');
            
            Log_WriteInfo('Removing temporary tab ' + sender.tab.id + ' now that message was sent (' +
               (request.externalMessageID == ERROR_EXTERNAL_ID || request.externalMessageID == RETRY_EXTERNAL_ID || request.externalMessageID == LIMITED_EXTERNAL_ID
                  ? 'failure' : 'success') + ')');
            Tabs.RemoveTab(sender.tab.id);
         }
         else
         {
            ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'sendBasicMessage');
            
            // it is important to set a standard URL so that the code in getAction doesn't think we're
            // still processing a message send
            let baseUrl = 'https://www.facebook.com/';
            Tabs.SetTabUrl(sender.tab.id, baseUrl);
         }
      }
      
      let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
      
      let now = Date.now();
      if (request.externalMessageID == LIMITED_EXTERNAL_ID)
      {
         if (localData.skipSendingBasicMessengerMessagesUntil <= now)
         {
            localData.skipSendingBasicMessengerMessagesUntil = now + timings.BLOCKED_MESSAGE_DELAY * 1000;
            Log_WriteError('Sending via basic messaging is blocked. Switching to regular messaging for a while.')
         }
         else
         {
            localData.skipSendingAnyMessengerMessagesUntil = now + timings.BLOCKED_MESSAGE_DELAY * 1000;
            Log_WriteError('Sending via regular messaging is blocked. Stop sending messages for a while.')
         }
         
         // don't send LIMITED_EXTERNAL_ID constant to server, it doesn't know about it
         request.externalMessageID = RETRY_EXTERNAL_ID;
      }
      else
      {
         let waitUntil = now + timings.Commands['SendMessage'].ActionDelay * 1000;
         if (waitUntil > localData.skipSendingAnyMessengerMessagesUntil)
            localData.skipSendingAnyMessengerMessagesUntil = waitUntil;
      }
      
      Storage.SetLocalVar('BG_FB', localData);
      
      let message = {
         'MessageBoxUid': request.messageBoxUid,
         'MessageID': request.messageID,
         'ExternalMessageID': request.externalMessageID,
         'From': request.from,
         'ErrorMessage': request.errorMessage
      };
      
      setServerState(FB_DATA_NAME, request.accountID, null, null, [message])
         .then(resp =>
         {
            if (sendResponse) sendResponse();
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            if (sendResponse) sendResponse();
         });
   }
   else if (request.type == 'setPostId')
   {
      if (!request.hasOwnProperty('usingApi') || !request.usingApi)
      {
         ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'makePost');
      }
      
      // it is important to set a standard URL so that the code in getAction doesn't think we're
      // ready to post as the last page of the posting isn't the same as the necessary first page
      // but they have similar URLs
      let baseUrl = 'https://www.facebook.com/';
      Tabs.SetTabUrl(sender.tab.id, baseUrl);
      
      let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
      
      let waitUntil = Date.now() + timings.Commands['MakePost'].ActionDelay * 1000;
      if (waitUntil > localData.skipMakingPostsUntil)
         localData.skipMakingPostsUntil = waitUntil;
      
      Storage.SetLocalVar('BG_FB', localData);
      
      let message = {
         'MessageBoxUid': request.messageBoxUid,
         'MessageID': request.postID,
         'ExternalMessageID': request.externalPostID,
         'From': request.from,
         'Url': request.url,
         'ErrorMessage': request.errorMessage
      };
      
      setServerState(FB_DATA_NAME, request.accountID, null, null, [message])
         .then(resp =>
         {
            if (sendResponse) sendResponse();
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            if (sendResponse) sendResponse();
         });
   }
   else if (request.type == 'setCommentId')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'makeComment');
      
      let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
      
      let waitUntil = Date.now() + timings.Commands['MakeComment'].ActionDelay * 1000;
      if (waitUntil > localData.skipMakingCommentsUntil)
         localData.skipMakingCommentsUntil = waitUntil;
      
      Storage.SetLocalVar('BG_FB', localData);
      
      let message = {
         'MessageBoxUid': request.messageBoxUid,
         'MessageID': request.commentID,
         'ExternalMessageID': request.externalCommentID,
         'From': request.from,
         'ErrorMessage': request.errorMessage
      };
      
      setServerState(FB_DATA_NAME, request.accountID, null, null, [message])
         .then(resp => sendResponse())
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setComment')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'FetchComment');
      
      let messages = request.comment ? [request.comment] : null;
      
      setServerState(FB_DATA_NAME, request.accountID, null, null, messages, null, request.command)
         .then(resp => sendResponse())
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setContact')
   {
      completeContactFetch(sender, request, sendResponse);
   }
   else if (request.type == 'setFriends')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getFriends');
      
      // upload friends list
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse(true);
               return;
            }
            
            let now = Date.now();
            let syncData = decodeFacebookSyncData(resp.SyncData);
            syncData.friends.cursor = request.cursor;
            
            // DRL FIXIT! I suspect we can remove the "currentSync" from those actions that don't need it
            // as it serves no purpose.
            // since we don't have date filtering of friends we use current date
            if (syncData.friends.currentSync == null)
               syncData.friends.currentSync = now;
            
            // Check more friends
            let lastCheck = null;
            let hasMoreFriends = request.cursor != null;
            if (!hasMoreFriends)
            {
               // finished this pass
               lastCheck = now;
               assert(syncData.friends.currentSync != null);
               syncData.friends.lastSynced = syncData.friends.currentSync;
               syncData.friends.currentSync = null;
            }
            
            syncData = encodeFacebookSyncData(syncData);
            
            // set friends list server state
            startingLongRunningOperation(FB_DATA_NAME);  // processing friends will take a while
            
            setServerState(FB_DATA_NAME, request.accountID, lastCheck, syncData, null, request.friends)
               .then(resp =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  
                  // if we have been scraping for too long this is a good time to break out
                  if (getSyncControlDuration(FB_DATA_NAME) > (request.cursor ? timings.SYNC_MAX_SCRAPE_TIME_LONG : timings.SYNC_MAX_SCRAPE_TIME))
                  {
                     releaseSyncControl(sender.tab.id, FB_DATA_NAME);
                  }
                  
                  sendResponse(hasMoreFriends);
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  finishedLongRunningOperation(FB_DATA_NAME);
                  sendResponse(true);
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            finishedLongRunningOperation(FB_DATA_NAME);
            sendResponse(true);
         });
   }
   else if (request.type == 'setChats')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getChats');
      
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse();
               return;
            }
            
            let now = Date.now();
            let syncData = decodeFacebookSyncData(resp.SyncData);
            
            if (request.currentCheck <= syncData.messages.lastSynced)
               Log_WriteError('New currentCheck ' + request.currentCheck + ' should be greater than current lastSynced:' + GetVariableAsString(syncData.messages));
            if (request.historySynced > syncData.messages.historySynced)
               Log_WriteError('New historySynced ' + request.historySynced + ' should be less than current:' + GetVariableAsString(syncData.messages));
            syncData.messages.currentSync = request.currentCheck;
            syncData.messages.historySynced = request.historySynced;
            syncData.messages.conversationsLeft = request.urls;
            syncData.messages.conversationCursor = null;
            
            let lastCheck = null;
            if (syncData.messages.conversationsLeft.length == 0)
            {
               // no conversations, finished this pass
               lastCheck = now;
               if (syncData.messages.currentSync <= syncData.messages.lastSynced)
                  Log_WriteError('currentSync 2 should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
               if (syncData.messages.currentSync != null)
                  syncData.messages.lastSynced = syncData.messages.currentSync;
               syncData.messages.currentSync = null;
            }
            
            syncData = encodeFacebookSyncData(syncData);
            
            setServerState(FB_DATA_NAME, request.accountID, lastCheck, syncData, null)
               .then(resp =>
               {
                  sendResponse();
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  sendResponse();
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setMessages')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getMessages');
      
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse(true);
               return;
            }
            
            let now = Date.now();
            let syncData = resp.SyncData;
            syncData = Json_FromString(syncData);
            
            let convoIndex = syncData.messages.conversationsLeft.indexOf(request.url);
            if (convoIndex == -1)
            {
               Log_WriteError('Conversation ' + request.url + ' was not found in:' + GetVariableAsString(syncData.messages));
               request.cursor = null;
            }
            else if (request.cursor == null)
            {
               // we've retrieved all new messages for this conversation so we can remove it from the list to check
               assert(request.messages != null);   // DRL FIXIT? This scenario no longer used now that we have throttling support?
               if (request.messages == null)
               {
                  Log_WriteError('Conversation URL ' + syncData.messages.conversationsLeft[convoIndex] + ' is being skipped!');
                  request.messages = [];
               }
               syncData.messages.conversationsLeft.splice(convoIndex, 1);
            }
            syncData.messages.conversationCursor = request.cursor;
            
            let canKeepGoing = true;
            let lastCheck = null;
            if (syncData.messages.conversationsLeft.length == 0)
            {
               // finished this pass
               lastCheck = now;
               if (syncData.messages.currentSync <= syncData.messages.lastSynced)
                  Log_WriteError('currentSync 1 should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
               if (syncData.messages.currentSync != null)
                  syncData.messages.lastSynced = syncData.messages.currentSync;
               syncData.messages.currentSync = null;
               canKeepGoing = false;
            }
            
            syncData = encodeFacebookSyncData(syncData);
            
            startingLongRunningOperation(FB_DATA_NAME);  // processing messages will take a while
            
            setServerState(FB_DATA_NAME, request.accountID, lastCheck, syncData, request.messages)
               .then(resp =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  
                  // if we have been scraping for too long this is a good time to break out
                  if (getSyncControlDuration(FB_DATA_NAME) > (request.cursor ? timings.SYNC_MAX_SCRAPE_TIME_LONG : timings.SYNC_MAX_SCRAPE_TIME))
                  {
                     releaseSyncControl(sender.tab.id, FB_DATA_NAME);
                     canKeepGoing = false;
                  }
                  
                  sendResponse(canKeepGoing);
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  finishedLongRunningOperation(FB_DATA_NAME);
                  sendResponse(true);
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            finishedLongRunningOperation(FB_DATA_NAME);
            sendResponse(true);
         });
   }
   else if (request.type == 'setComments')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getComments');
      
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse();
               return;
            }
            
            let syncData = decodeFacebookSyncData(resp.SyncData);
            
            syncData.watchedPosts[request.externalPostID] = {
               lastSynced: request.currentCheck,
               cursor: request.cursor
            };
            
            // remove posts that are no longer being watched (could include the above)
            let ids = [];
            for (const i in resp.watched_posts)
               ids.push(resp.watched_posts[i].Uid);
            Utilities_TrimArrayByKey(syncData.watchedPosts, ids);
            
            syncData = encodeFacebookSyncData(syncData);
            
            startingLongRunningOperation(FB_DATA_NAME);  // processing comments will take a while
            
            setServerState(FB_DATA_NAME, request.accountID, null, syncData, request.comments)
               .then(resp =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  
                  // if we have been scraping for too long this is a good time to break out
                  if (getSyncControlDuration(FB_DATA_NAME) > (request.cursor ? timings.SYNC_MAX_SCRAPE_TIME_LONG : timings.SYNC_MAX_SCRAPE_TIME))
                  {
                     releaseSyncControl(sender.tab.id, FB_DATA_NAME);
                  }
                  
                  sendResponse();
               })
               .catch(e =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  
                  Log_WriteException(e, request.type);
                  sendResponse();
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setGroupChatParticipants')
   {
      /* This is now performed via getMessages action.
            ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getGroupChatParticipants');
            
            getServerState(FB_DATA_NAME, request.accountID, null)
               .then(resp =>
               {
                  if (resp == null)
                  {
                     sendResponse();
                     return;
                  }
                  
                  let syncData = decodeFacebookSyncData(resp.SyncData);
                  
                  syncData.watchedGroupChats[request.conversationId] = {
                     lastSynced: request.currentCheck
                  };
                  
                  // remove group chats that are no longer being watched (could include the above)
                  let ids = [];
                  for (const i in resp.watched_group_chats)
                     ids.push(resp.watched_group_chats[i].ExternalItemID);
                  Utilities_TrimArrayByKey(syncData.watchedGroupChats, ids);
                  
                  syncData = encodeFacebookSyncData(syncData);
      */
      startingLongRunningOperation(FB_DATA_NAME);  // processing comments will take a while
      
      setServerState(FB_DATA_NAME, request.accountID, null, null/*syncData*/,
         null, null, null, null, null,
         request.groupChatParticipants)
         .then(resp =>
         {
            finishedLongRunningOperation(FB_DATA_NAME);
            /*
                              // if we have been scraping for too long this is a good time to break out
                              if (getSyncControlDuration(FB_DATA_NAME) > timings.SYNC_MAX_SCRAPE_TIME)
                              {
                                 releaseSyncControl(sender.tab.id, FB_DATA_NAME);
                              }
            */
            sendResponse();
         })
         .catch(e =>
         {
            finishedLongRunningOperation(FB_DATA_NAME);
            
            Log_WriteException(e, request.type);
            sendResponse();
         });
      /*
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  sendResponse();
               });
      */
   }
   else if (request.type == 'setGroupMembers')
   {
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse(false);
               return;
            }
            
            let syncData = decodeFacebookSyncData(resp.SyncData);
            let groupInfos = getGroupInfos();
            let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
            let command = null;
            
            assert(request.groupMembers != null);  // I believe this is no longer used, we now use "action" throttling logic.
            
            Log_WriteInfo('Retrieved ' + request.groupMembers.length + ' ' + request.memberType);
            
            // if this is the initial import of group members we want to import them all uninterrupted to avoid issues
            let continueWithNextChunkNow = request.memberType == 'Members' &&
               (!syncData.watchedGroupMembersLastSynced.hasOwnProperty(request.groupId) ||
                  syncData.watchedGroupMembersLastSynced[request.groupId] == 0);
            
            ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, request.memberType == 'Requests'
               ? 'getGroupRequests'
               : (request.memberType == 'Staff'
                  ? 'getGroupStaff'
                  : (request.memberType == 'Members'
                     ? 'getGroupMembers'
                     : (request.memberType == 'Answers'
                        ? 'GroupMemberAnswers'
                        : null))), continueWithNextChunkNow);
            
            // add or update the group members
            if (request.memberType == 'Requests')
            {
               syncData.watchedGroupRequestsLastSynced[request.groupId] = request.currentCheck;
               // remove groups that are no longer being watched (could include the above)
               Utilities_TrimArrayByKey(syncData.watchedGroupRequestsLastSynced, Object.keys(groupInfos));
            }
            else if (request.memberType == 'Staff')
            {
               syncData.watchedGroupStaffLastSynced[request.groupId] = request.currentCheck;
               // remove groups that are no longer being watched (could include the above)
               Utilities_TrimArrayByKey(syncData.watchedGroupStaffLastSynced, Object.keys(groupInfos));
            }
            else if (request.memberType == 'Members')
            {
               Log_WriteInfo('setGroupMembers length ' + request.groupMembers.length + ' for group ' + request.groupId + ' with currentCheck ' + request.currentCheck);
               Log_WriteInfo('setGroupMembers setting watchedGroupMembersLastSynced for group ' + request.groupId + ': ' + request.currentCheck);
               syncData.watchedGroupMembersLastSynced[request.groupId] = request.currentCheck;
               // remove groups that are no longer being watched (could include the above)
               Utilities_TrimArrayByKey(syncData.watchedGroupMembersLastSynced, Object.keys(groupInfos));
            }
            else if (request.memberType == 'Answers')
            {  // this is performed via SyncCommands
               for (let groupMember of request.groupMembers)
               { // should be only one item (or none on error)
                  Log_WriteInfo('XYZ: setGroupMembers got answers for ' + groupMember.Uid);
               }
               command = request.command;
            }
            else
               assert(0);
            
            Storage.SetLocalVar('BG_FB', localData);
            
            syncData = encodeFacebookSyncData(syncData);
//            Log_WriteInfo('XYZ: setGroupMembers saving' + syncData);
            
            startingLongRunningOperation(FB_DATA_NAME);  // processing members will take a while
            
            setServerState(FB_DATA_NAME, request.accountID, null, syncData, null, null, command,
               request.groupMembers)
               .then(resp =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  
                  sendResponse(true);   // more to do?
               })
               .catch(e =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  Log_WriteException(e, request.type);
                  sendResponse(false);
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse(false);
         });
   }
   else if (request.type == 'setGroupInfo' || request.type == 'setGroupQuestions')
   {
// This is a user generated action.
//      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getGroupQuestions');
   
      setServerState(FB_DATA_NAME, request.accountID, null, null, null, null, null, null, request.data)
         .then(resp =>
         {
            sendResponse();
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setCustomList')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'getCustomList');
      
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse();
               return;
            }
            
            assert(request.members != null);  // I believe this is no longer used, we now use "action" throttling logic.
            
            let syncData = decodeFacebookSyncData(resp.SyncData);
            
            if (!syncData.hasOwnProperty('watchedCustomLists'))
               syncData.watchedCustomLists = {};
            if (!syncData.watchedCustomLists.hasOwnProperty(request.listUid))
               syncData.watchedCustomLists[request.listUid] = {
                  memberUids: [],
                  lastSynced: 0,
                  lastServerSynced: null,    // string format
               };
            
            let customListUpdate = {
               CustomListUid: request.listUid,
               AddedMembers: {},
               RemovedMemberUids: [],
               // this is a request for the server to send us updates
               LastServerUpdated: syncData.watchedCustomLists[request.listUid].lastServerSynced
            }
            
            let oldMemberUids = syncData.watchedCustomLists[request.listUid].memberUids;
            let newMemberUids = Object.keys(request.members);
            for (let newMemberUid of newMemberUids)
            {
               if (!oldMemberUids.includes(newMemberUid))
                  customListUpdate.AddedMembers[newMemberUid] = request.members[newMemberUid];
            }
            for (let oldMemberUid of oldMemberUids)
            {
               if (!newMemberUids.includes(oldMemberUid))
                  customListUpdate.RemovedMemberUids.push(oldMemberUid);
            }
            
            syncData.watchedCustomLists[request.listUid].memberUids = newMemberUids;
            syncData.watchedCustomLists[request.listUid].lastSynced = request.currentCheck;
            
            // remove lists that are no longer being watched
            Utilities_TrimArrayByKey(syncData.watchedCustomLists, resp.watched_custom_lists);
            
            syncData = encodeFacebookSyncData(syncData);
            
            startingLongRunningOperation(FB_DATA_NAME);  // processing members will take a while
            
            setServerState(FB_DATA_NAME, request.accountID, null, syncData, null, null, null, null,
               null, null, customListUpdate)
               .then(resp =>
               {
                  finishedLongRunningOperation(FB_DATA_NAME);
                  
                  sendResponse();
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  sendResponse();
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setCustomListUpdated')
   {
      ActionCheck_Completed(FB_DATA_NAME, sender.tab.id, 'UpdateCustomList');
      
      getServerState(FB_DATA_NAME, request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse();
               return;
            }
            
            let syncData = decodeFacebookSyncData(resp.SyncData);
            
            if (syncData.hasOwnProperty('watchedCustomLists') && syncData.watchedCustomLists.hasOwnProperty(request.listUid))
            {
               
               // NOTE: The items we receive here are only the successful items, so we add/remove the successful
               // items from our cache so the next time we check the Facebook version we don't trigger updates.
               
               for (let member of request.updateMembers)
               {
                  if (member[1]) // if displayName is provided then this is an "add"
                     Utilities_AddToArray(syncData.watchedCustomLists[request.listUid].memberUids, member[0]);
                  else
                     Utilities_RemoveFromArray(syncData.watchedCustomLists[request.listUid].memberUids, member[0]);
               }
               syncData.watchedCustomLists[request.listUid].lastServerSynced = request.lastServerUpdated;
            }
            else
               Log_WriteError('Custom list ' + request.listUid + ' not existing in server state!');
            
            syncData = encodeFacebookSyncData(syncData);
            
            setServerState(FB_DATA_NAME, request.accountID, null, syncData, null, null, request.command)
               .then(resp =>
               {
                  sendResponse();
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  sendResponse();
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else
      return false;
   
   return true;
}
