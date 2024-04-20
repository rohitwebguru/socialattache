function BackGroundFacebookInit()
{
   return {
      groupMembersNeedingAnswersGroupId: null,
      groupMembersNeedingAnswersCurrentCheck: null,
      groupMembersNeedingAnswers: [],
      skipSendingBasicMessengerMessagesUntil: 0,
      skipSendingAnyMessengerMessagesUntil: 0,
      skipCheckingMessagesUntil: 0,
      skipCheckingPostsUntil: 0,
      skipCheckingGroupsUntil: {},
      skipCheckingFriendsUntil: 0,
      skipCheckingCustomListsUntil: 0,
      skipActionUntil: {}    // index by command such as 'Friend'
   };
}

function onMessageFacebook(request, sender, sendResponse)
{
   Log_WriteInfo('backgroundFacebook got request from tab ' + sender.tab.id + ': ' + request.type);
   
   if (request.type == 'getAction')
   {
      HandleFacebookGetAction(sender, request, sendResponse);
   }
   else if (request.type === 'apiAction')
   {
      HandleFacebookApiAction(request, sender, sendResponse)
   }
   else if (!HandleFacebookActionResult(sender, request, sendResponse))
   {
      Log_WriteError("Got unrecognized request:\n" + GetVariableAsString(request));
   }
}

function encodeFacebookSyncData(syncData)
{
   assert(typeof syncData !== 'string'); // must not already be encoded
   return Json_ToString(syncData);
}

function decodeFacebookSyncData(syncData)
{
   assert(syncData == null || typeof syncData === 'string'); // must be encoded
   let data = syncData ? Json_FromString(syncData) : null;
   if (data == null)
   {
      if (syncData)
      {
         Log_WriteError('Error deserializing sync data: ' + syncData);
      }
      data = {};
   }
   
   // initialize a new sync and migrate legacy data by adding missing pieces
   if (!data.hasOwnProperty('messages'))
      data['messages'] = {
         lastSynced: 0,
         currentSync: null,
         historySynced: null, // this is a date we use to keep track of how far back into older conversations we've been
         conversationsLeft: [],
         conversationCursor: null
      };
   
   // initialize a new sync and migrate legacy data by adding missing pieces
   if (!data.hasOwnProperty('friends'))
      data['friends'] = {
         lastSynced: 0,
         currentSync: null,
         cursor: 0
      };
   
   if (!data.hasOwnProperty('watchedPosts')) data['watchedPosts'] = {};
   if (!data.hasOwnProperty('watchedGroupChats')) data['watchedGroupChats'] = {};
   if (!data.hasOwnProperty('watchedGroupRequestsLastSynced')) data['watchedGroupRequestsLastSynced'] = {};
   if (!data.hasOwnProperty('watchedGroupStaffLastSynced')) data['watchedGroupStaffLastSynced'] = {};
   if (!data.hasOwnProperty('watchedGroupMembersLastSynced')) data['watchedGroupMembersLastSynced'] = {};
   if (!data.hasOwnProperty('watchedGroupQuestionsLastSynced')) data['watchedGroupQuestionsLastSynced'] = {};
   if (!data.hasOwnProperty('watchedCustomLists')) data['watchedCustomLists'] = {};
   
   return data;
}
