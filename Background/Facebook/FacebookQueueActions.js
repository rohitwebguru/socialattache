const ActionRequiresFeature = {
   'FetchContact': UserFeaturesSyncContacts,
   'Friend': UserFeaturesFriendUnfriend,
   'Unfriend': UserFeaturesFriendUnfriend,
   'GroupAccept': UserFeaturesGroupAcceptDecline,
   'GroupDecline': UserFeaturesGroupAcceptDecline,
   'GroupMemberAnswers': UserFeaturesFacebookGroupMembersAdmin,
   'GroupChatInvite': UserFeaturesGroupChatInvite,
   'UpdateCustomList': UserFeaturesWatchedFriendsLists,
   'CreateCustomList': UserFeaturesWatchedFriendsLists,
   'FetchComment': UserFeaturesSyncMessages,
   'SendMessage': UserFeaturesSyncMessages,  // DRL FIXIT? Check UserFeaturesSendMessages and UserFeaturesSendSocialPosts as appropriate?
   'MakePost': UserFeaturesSyncMessages,  // DRL FIXIT? Check UserFeaturesSendMessages and UserFeaturesSendSocialPosts as appropriate?
   'MakeComment': UserFeaturesSyncMessages,  // DRL FIXIT? Check UserFeaturesSendMessages and UserFeaturesSendSocialPosts as appropriate?
   'Friends': UserFeaturesSyncFriends,
   'Messages': UserFeaturesSyncMessages,
   'WatchedPosts': UserFeaturesWatchedPosts,
//   'WatchedGroupChats': UserFeaturesWatchedGroupChats,
//   'WatchedGroupQuestions': UserFeaturesFacebookGroupMembersAdmin,
   'WatchedGroupStaff': UserFeaturesFacebookGroupMembersAdmin,
   'WatchedGroupRequests': UserFeaturesFacebookGroupMembersAdmin,
   'WatchedGroupMembers': UserFeaturesFacebookGroupMembersAdmin,
   'WatchedCustomLists': UserFeaturesWatchedFriendsLists,
};

function isAllowedAction(action, isAssistant, syncDevice)
{
   const isResponsibility = Utilities_ArrayContains(SyncDeviceResponsibilities, action);
   
   // assistants may only perform assigned responsibilities, so non-responsibilities can't be handled
   if (isAssistant && !isResponsibility)
      return false;
   
   // if it's a responsibility, does the host device have the responsibility assigned?
   if (isResponsibility && !Utilities_ArrayContains(syncDevice.Responsibilities, action))
      return false;
   
   // does the user have access to the feature?
   assert(ActionRequiresFeature.hasOwnProperty(action));
   if (Utilities_ArrayContains(ActionRequiresFeature, action) && !UserHasFeature(ActionRequiresFeature[action]))
      return false;
   
   return true;
}

function QueueFacebookActions(sender, localData, server)
{
   const now = Date.now();
   const isTempTab = isTemporaryTab(sender.tab.id);
   const syncData = decodeFacebookSyncData(server.SyncData);
   const lastUrl = ActionCheck_GetUrl(FB_DATA_NAME);
   let actions = {};
   
   let isAssistant = isSocialAttacheLoggedInAsAssistant();
   let syncDevice = getSyncDevice();
   
   if (!syncDevice.IsActive)
      return actions;
   
   if (is_array(server.commands))
   {
      for (const command of server.commands)
      {
         if (localData.skipActionUntil.hasOwnProperty(command.SyncCommand) && now < localData.skipActionUntil[command.SyncCommand])
            continue;
      
         // if this device has access to the action
         if (!isAllowedAction(command.SyncCommand, isAssistant, syncDevice))
            continue;
      
         actions[command.SyncCommand] = {
            command: command
         };
      
         // we can only process one command at a time, and the server provides them already sorted by priority
         break;
      }
   }
   else
      Log_WriteError('Got server.commands that is not an array: ' + GetVariableAsString(server));
   
   // if we have a message queued it means we need to send it soon so we will disable other automations until
   // we send it so that it does not go out late
   let hasQueuedMessage = false;
   
   // if this device has access to the action
   if (isAllowedAction('SendMessage', isAssistant, syncDevice))
   {
      let now = Date.now();
      let dtNow = DateAndTime_Now();
      let cutoff = now + SecondsPerMinute * 10 * 1000;   // throttling ends within 10 minutes
      
      // we only process the first message, and we'll get any other messages on the next request,
      // and sometimes we're not sending messenger messages
      let focusAllowed = getIsScrapingFocusAllowed();
      let message = null;
      for (let msg of server.messages)
      {
         let skipUntil = 0;
         if (msg.Type.includes('msg'))
            skipUntil = localData.skipSendingAnyMessengerMessagesUntil;
         else if (msg.Type.includes('post'))
            skipUntil = localData.skipMakingPostsUntil;
         else if (msg.Type.includes('comment'))
            skipUntil = localData.skipMakingCommentsUntil;

         if (skipUntil < cutoff) // if we will be sending it within the next 10 minutes (to allow for some skipping)
         {
            Log_WriteInfo('There is a ' + msg.Type + ' queued to be sent ' + msg.Date + ' so pausing other actions.');
            hasQueuedMessage = true;
         }
   
         if (msg.Date && DateAndTime_FromString(msg.Date).GreaterThan(dtNow))
            continue;            // it's too early to send this message

         if (now < skipUntil)    // if we are currently skipping this message type
         {
            Log_WriteInfo('There is a ' + msg.Type + ' ready to be sent but we are skipping for a while.');
            continue;
         }
         
         if (isTempTab && msg.Type != 'fbp_msg')
            continue;            // temp tab is only used for Messenger, this isn't it
   
         if (!focusAllowed)
         {
            if (
               // the fbp_msg type NOT sent via API requires a temporary tab that grabs the focus
               (!constants.USE_FACEBOOK_MSG_SEND_API && msg.Type == 'fbp_msg' && !isTempTab) ||
               // the fbp_gpost type NOT sent via API requires grabbing the focus
               (!constants.USE_FACEBOOK_GROUP_POST_API && msg.Type == 'fbp_gpost'))
            {
               Log_WriteInfo('There is a ' + msg.Type + ' ready to be sent but we are not allowed to borrow the focus now.');
               continue;
            }
         }
   
         // if we find a message that will use the existing page use it next so we can cache
         // some work on the client side such as parsing comments on a post for replying
         if (msg.hasOwnProperty('Url') && fuzzyUrlsMatch(sender.url, msg.Url))
         {
            message = msg;
            break;
         }
         
         if (message == null || msg.Uid < message.Uid)
            message = msg;  // oldest first
      }
      
      if (isTempTab && (message == null || message.Type != 'fbp_msg'))
      {
         Log_WriteError('Closing temporary message/post send tab ' + sender.tab.id + ', should have been closed!');
         Tabs.RemoveTab(sender.tab.id);
         return actions;
      }
      
      if (message != null)
      {
         let category = null;
         if (message.Type.includes('msg'))
            category = 'SendMessage';
         else if (message.Type.includes('post') || message.Type.includes('story'))
            category = 'MakePost';
         else if (message.Type.includes('comment'))
            category = 'MakeComment';
         else
            assert(0);
         actions[category] = {
            message: message
         };
      }
   }
   
/* We no longer import friends, as we will be importing friend lists individually.
   if (
      // we aren't waiting for throttling to end
      now >= localData.skipCheckingFriendsUntil &&
      // it's time to scrape again
      now - syncData.friends.lastSynced >= timings.FRIENDS_SCRAPE_DELAY * 1000 &&
      // this device has access to the action
      isAllowedAction('Friends', isAssistant, syncDevice))
   {
      actions['Friends'] = {
         lastSynced: syncData.friends.lastSynced,
         cursor: syncData.friends.cursor
      };
   }
*/
   
   if (false &&
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // we aren't waiting for throttling to end
      now >= localData.skipCheckingMessagesUntil &&
      // it's time to scrape again
      now - syncData.messages.lastSynced >= timings.MESSAGES_SCRAPE_DELAY * 1000 &&
      // this device has access to the action
      isAllowedAction('Messages', isAssistant, syncDevice))
   {
      actions['Messages'] = {
         lastSynced: syncData.messages.lastSynced
      };
   }
   
   // find the post we should be working on, either the last one we started working on or the one
   // that has not been checked for the longest time
   // NOTE: we are not saving this back to the server here, the new items will be added and saved
   // back to the server when we handle the comments that are retrieved
   if (false &&
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // we aren't waiting for throttling to end
      now >= localData.skipCheckingPostsUntil &&
      // this device has access to the action
      isAllowedAction('WatchedPosts', isAssistant, syncDevice))
   {
      let postUid = null;
      let postUrl = null;
      for (const i in server.watched_posts)
      {
         let uid = server.watched_posts[i].Uid;
         
         if (!syncData.watchedPosts.hasOwnProperty(uid))
            syncData.watchedPosts[uid] = {
               lastSynced: 0,
               cursor: 0
            };
         
         if (postUid == null || syncData.watchedPosts[uid].lastSynced < syncData.watchedPosts[postUid].lastSynced)
         {
            postUid = uid;
            postUrl = server.watched_posts[i].Url;
            assert(postUrl != null); // the URL was null below so trying to track this down
            
            // a post that hasn't finished parsing takes precedence because we've cached
            // the unparsed bits in the client for efficiency (as long as the page wasn't
            // reloaded)
            if (server.watched_posts[i].Url == lastUrl)
            {
               Log_WriteInfo('URL still points to post ' + uid + ' so resuming...');
               break;   // finished searching
            }
         }
      }
      if (postUid && now - syncData.watchedPosts[postUid].lastSynced >= timings.WATCHED_POSTS_CHECK_DELAY * 1000)
         actions['WatchedPosts'] = {
            lastSynced: syncData.watchedPosts[postUid].lastSynced,
            cursor: syncData.watchedPosts[postUid].cursor,
            postUid: postUid,
            postUrl: postUrl
         };
   }
   
/* DRL Group chat members are parsed when parsing the group chat for new messages.
   if (
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // we aren't waiting for throttling to end
      now >= localData.skipCheckingMessagesUntil &&
      // this device has access to the action
      isAllowedAction('WatchedGroupChats', isAssistant, syncDevice))
   {
      let groupChatUid = null;
      for (const i in server.watched_group_chats)
      {
         let uid = server.watched_group_chats[i].ExternalItemID;
         
         if (!syncData.watchedGroupChats.hasOwnProperty(uid))
            syncData.watchedGroupChats[uid] = {
               lastSynced: 0
            };
         
         if (groupChatUid == null || syncData.watchedGroupChats[uid].lastSynced < syncData.watchedGroupChats[groupChatUid].lastSynced)
         {
            groupChatUid = uid;
         }
      }
      if (groupChatUid && now - syncData.watchedGroupChats[groupChatUid].lastSynced >= timings.WATCHED_GROUP_CHATS_CHECK_DELAY * 1000)
      {
         actions['WatchedGroupChats'] = {
            lastSynced: syncData.watchedGroupChats[groupChatUid].lastSynced,
            groupChatUid: groupChatUid
         };
      }
   }
*/
   // find the group we should be working on, either the last one we started working on or the one
   // that has not been checked for the longest time
   // NOTE: we are not saving this back to the server here, the new items will be added and saved
   // back to the server when we handle the items that are retrieved
   let groupInfos = getGroupInfos();
   
   // NOTE: Order of the below is important!
   
   let groupId = null;
/* Group questions are now a manual import.
   if (
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // if this device has access to the action
      isAllowedAction('WatchedGroupQuestions', isAssistant, syncDevice)) {
      for (const id in groupInfos)
      {
         if (!groupInfos[id].IsAdmin ||
            (localData.skipCheckingGroupsUntil.hasOwnProperty(id) && now < localData.skipCheckingGroupsUntil[id]))
            continue;  // we only import group questions from groups the user administers
         
         if (!syncData.watchedGroupQuestionsLastSynced.hasOwnProperty(id))
            syncData.watchedGroupQuestionsLastSynced[id] = 0;
         
         if (groupId == null || syncData.watchedGroupQuestionsLastSynced[id] < syncData.watchedGroupQuestionsLastSynced[groupId])
         {
            groupId = id;
         }
      }
      let delay = timings.WATCHED_GROUP_QUESTIONS_DELAY;
      if (groupId && !groupInfos[groupId].ImportMembers)
         delay *= timings.WATCHED_GROUP_QUESTIONS_NO_IMPORT_MULTIPLIER;
      if (groupId && now - syncData.watchedGroupQuestionsLastSynced[groupId] >= delay * 1000)
      {
         actions['WatchedGroupQuestions'] = {
            lastSynced: syncData.watchedGroupQuestionsLastSynced[groupId],
            groupId: groupId
         };
      }
   }
*/
   if (false &&
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // if this device has access to the action
      isAllowedAction('WatchedGroupStaff', isAssistant, syncDevice))
   {
      groupId = null;
      for (const id in groupInfos)
      {
         // we only import staff members for administered groups
         if (!groupInfos[id].IsAdmin || !groupInfos[id].ImportMembers ||
            (localData.skipCheckingGroupsUntil.hasOwnProperty(id) && now < localData.skipCheckingGroupsUntil[id]))
            continue;  // we only import group members from groups the user administers and that have automation configured
         
         if (!syncData.watchedGroupStaffLastSynced.hasOwnProperty(id))
            syncData.watchedGroupStaffLastSynced[id] = 0;   // never null
         
         if (groupId == null || syncData.watchedGroupStaffLastSynced[id] < syncData.watchedGroupStaffLastSynced[groupId])
         {
            groupId = id;
         }
      }
      if (groupId && now - syncData.watchedGroupStaffLastSynced[groupId] >= timings.WATCHED_GROUP_STAFF_DELAY * 1000)
      {
         actions['WatchedGroupStaff'] = {
            lastSynced: syncData.watchedGroupStaffLastSynced[groupId],
            groupId: groupId
         };
      }
   }
   
   if (false &&
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // if this device has access to the action
      isAllowedAction('WatchedGroupRequests', isAssistant, syncDevice))
   {
      groupId = null;
      for (const id in groupInfos)
      {
         // we only import join requests for administered groups
         if (!groupInfos[id].IsAdmin || !groupInfos[id].ImportMembers ||
            (localData.skipCheckingGroupsUntil.hasOwnProperty(id) && now < localData.skipCheckingGroupsUntil[id]))
            continue;  // we only import group members from groups the user administers and that have automation configured
         
         if (!syncData.watchedGroupRequestsLastSynced.hasOwnProperty(id))
            syncData.watchedGroupRequestsLastSynced[id] = 0;   // never null
         
         if (!Utilities_IsInteger(syncData.watchedGroupRequestsLastSynced[id]))
         {
            Log_WriteError('last synced of group ' + id + ' requests was non-numeric: ' + syncData.watchedGroupRequestsLastSynced[id]);
            assert(Utilities_IsInteger(now));
            syncData.watchedGroupRequestsLastSynced[id] = now;
         }
         
         if (groupId == null || syncData.watchedGroupRequestsLastSynced[id] < syncData.watchedGroupRequestsLastSynced[groupId])
         {
            groupId = id;
         }
      }
      if (groupId && now - syncData.watchedGroupRequestsLastSynced[groupId] >= timings.WATCHED_GROUP_REQUESTS_DELAY * 1000)
      {
         actions['WatchedGroupRequests'] = {
            lastSynced: syncData.watchedGroupRequestsLastSynced[groupId],
            groupId: groupId
         };
      }
   }
   
   if (false &&
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // if this device has access to the action
      isAllowedAction('WatchedGroupMembers', isAssistant, syncDevice))
   {
      groupId = null;
      for (const id in groupInfos)
      {
         if (!groupInfos[id].ImportMembers ||
            (localData.skipCheckingGroupsUntil.hasOwnProperty(id) && now < localData.skipCheckingGroupsUntil[id]))
            continue;  // we only import group members from groups the user administers and that have automation configured
         
         if (!syncData.watchedGroupMembersLastSynced.hasOwnProperty(id))
            syncData.watchedGroupMembersLastSynced[id] = 0; // never null
         
         if (groupId == null || syncData.watchedGroupMembersLastSynced[id] < syncData.watchedGroupMembersLastSynced[groupId])
         {
            groupId = id;
         }
      }
      if (groupId && now - syncData.watchedGroupMembersLastSynced[groupId] >= timings.WATCHED_GROUP_MEMBERS_DELAY * 1000)
      {
         actions['WatchedGroupMembers'] = {
            lastSynced: syncData.watchedGroupMembersLastSynced[groupId],
            groupId: groupId,
            memberCount: groupInfos[groupId].MemberCount
         };
      }
   }
   
   if (false &&
      // we don't have anything pressing coming up
      !hasQueuedMessage &&
      // we aren't waiting for throttling to end
      now >= localData.skipCheckingCustomListsUntil &&
      // this device has access to the action
      isAllowedAction('WatchedCustomLists', isAssistant, syncDevice))
   {
      let listUid = null;
      for (const uid of server.watched_custom_lists)
      {
         if (!syncData.hasOwnProperty('watchedCustomLists'))
            syncData.watchedCustomLists = {};
         if (!syncData.watchedCustomLists.hasOwnProperty(uid))
            syncData.watchedCustomLists[uid] = {
               memberUids: [],
               lastSynced: 0,
               lastServerSynced: null  // string format
            };
         
         if (listUid == null || syncData.watchedCustomLists[uid].lastSynced < syncData.watchedCustomLists[listUid].lastSynced)
         {
            listUid = uid;
         }
      }
      if (listUid && now - syncData.watchedCustomLists[listUid].lastSynced >= timings.WATCHED_CUSTOM_LISTS_CHECK_DELAY * 1000)
         actions['WatchedCustomLists'] = {
            listUid: listUid,
            lastSynced: syncData.watchedCustomLists[listUid].lastSynced
         };
   }
   
   return actions;
}
