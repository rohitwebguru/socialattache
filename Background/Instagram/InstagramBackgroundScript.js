function BackGroundInstagramInit()
{
   return {
      igAccounts: {},
      igLastAccountsCheck: null,
      skipCheckingMessagesUntil: 0,
      skipCheckingPostsUntil: 0,
      skipActionUntil: {}
   };
}

function onMessageInstagram(request, sender, sendResponse)
{
   Log_WriteInfo('backgroundInstagram got request from tab ' + sender.tab.id + ': ' + request.type);
   
   if (request.type == 'getAction')
   {
      HandleInstagramGetAction(sender, request, sendResponse);
   }
   else if (!HandleInstagramActionResult(sender, request, sendResponse))
   {
      Log_WriteError("Got unrecognized request:\n" + GetVariableAsString(request));
   }
}

function encodeInstagramSyncData(syncData)
{
   assert(typeof syncData !== 'string'); // must not already be encoded
   return Json_ToString(syncData);
}

function decodeInstagramSyncData(syncData)
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
   
   if (!data.hasOwnProperty('watchedPosts')) data['watchedPosts'] = {};
   
   return data;
}

function getOldestCheckedAccount(accounts)
{
   let result = null;
   
   for (let accountID in accounts)
   {
      if (result == null || accounts[accountID].lastCheck < result.lastCheck)
      {
         result = accounts[accountID];
      }
   }
   return result;
}