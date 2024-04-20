// localData can be changed by this code so the caller needs to save it, and if this method returns
// false then it likely changed syncData so that will need to be saved, and it also didn't call sendResponse
// so the caller needs to do it
async function InitiateInstagramAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   if (action.category == 'SendMessage' || action.category == 'MakePost' || action.category == 'MakeComment')
   {
      return await _InitiateInstagramMessageAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'Messages')
   {
      return _InitiateInstagramMessagesAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   assert(0);
   return false;
}

async function _InitiateInstagramMessageAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const message = action.message;
   const isTempTab = isTemporaryTab(sender.tab.id);
   
   if (message.Type == 'ig_msg')
   {
      let url = baseUrl + "/direct/inbox";
      if (isTempTab && sender.url == url)
      {
         ActionCheck_SendResponse(IG_DATA_NAME, 'SendMessage', url, sendResponse, {
            action: 'sendMessage',
            message: message
         }, message.Uid);
         return true;
      }
      
      if (!hasTemporaryTab(IG_DATA_NAME))
      {
         createTab(IG_DATA_NAME, 'GET', url, {}, true, true)
            .then(resp =>
            {
               sendResponse({action: null});
            })
            .catch(e =>
            {
               Log_WriteException(e, request.type);
               sendResponse({action: null});
            });
         return true;
      }
      // we don't want the main scraper tab doing anything while another is sending a message
      sendResponse({action: null});
      return true;
   }
   else if (message.Type == 'ig_post')
   {
      
      let url = baseUrl;
      
      if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(IG_DATA_NAME, sender))
      {
         // DRL FIXIT? Can we safely reduce the time?
         showSyncWindowAndTab(sender.tab.id, 15, constants.MINIMUM_TAB_WIDTH);
         ActionCheck_SendResponse(IG_DATA_NAME, 'MakePost', url, sendResponse, {
            action: 'makePost',
            post: message
         }, message.Uid);
      }
      else if (ActionCheck_OK(IG_DATA_NAME, sender))
      {
         ActionCheck_SetUrl(IG_DATA_NAME, 'MakePost', 'makePost', message.Uid, sender, url, sendResponse);
      }
      else
      {
         Log_WriteInfo('Setting URL for makePost is failing!');
         ActionCheck_Aborting(IG_DATA_NAME);
         setServerState(IG_DATA_NAME, accountID, null, null,
            [{'MessageID': message.postID, 'ExternalMessageID': ERROR_EXTERNAL_ID, 'From': message.from}])
            .then(resp =>
            {
               sendResponse({action: null});
            })
            .catch(e =>
            {
               Log_WriteException(e);
               sendResponse({action: null});
            });
      }
      return true;
   }
   else
   {
      Log_WriteError("Unexpected Instagram message type " + message.Type);
   }
   
   return false;
}

function _InitiateInstagramMessagesAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
// this is a new property added to keep track of how far back we went, and with the older code we
// always tried to go back one year, so if it's not there we'll add it and return so it gets saved
   if (!syncData.messages.hasOwnProperty('historySynced'))
   {
      let latestSync = getLatestSyncTimestamp();
      
      syncData.messages.historySynced = syncData.messages.lastSynced < latestSync
         ? null         // new code will try to go back as far as possible up to one year, so allow going back as available
         : latestSync;  // old code always went back one (or two years for even older code) so nothing to do
      
      // start over with the last getChats so we can process using the new logic
      syncData.messages.currentSync = null;
      syncData.messages.conversationsLeft = [];
      
      return false;
   }
   
   if (syncData.messages.currentSync == null ||
      // this happened once and was an edge case I think
      syncData.messages.conversationsLeft.length == 0)
   {
      // start of new sync
      
      if (sender.url.startsWith(baseUrl + '/direct/t/') && ActionCheck_OK(IG_DATA_NAME, sender))
      {
         ActionCheck_SendResponse(IG_DATA_NAME, 'Messages', sender.url, sendResponse, {
            action: 'getChats',
            lastCheck: syncData.messages.lastSynced,
            historySynced: syncData.messages.historySynced
         }, null);
      }
      else if (ActionCheck_OK(IG_DATA_NAME, sender))
      {
         // when we get blocked it looks like we can get around it by providing an ID
         let url = baseUrl + '/direct/t/' + Utilities_IntRand(10000, 1000000);
         ActionCheck_SetUrl(IG_DATA_NAME, action.category, 'getChats', null, sender, url, sendResponse);
      }
      else
      {
         Log_WriteInfo('Setting URL for getChats is failing!')
         ActionCheck_Aborting(IG_DATA_NAME);
         localData.skipCheckingMessagesUntil = Date.now() + timings.THROTTLED_DELAY * 1000;
         
         setTabThrottled(sender.tab.id, true, action.category);
         
         sendResponse({action: null});
      }
   }
   else
   {
      let url = syncData.messages.conversationsLeft[0];
      
      // we use a generic messaging address here because we don't want the page to reload, and the content
      // script will choose the conversation from the list so it's not necessary to set the url here
      if (sender.url.startsWith(baseUrl + '/direct/t/') && ActionCheck_OK(IG_DATA_NAME, sender))
      {
         // continue where we left off
         
         assert(syncData.messages.currentSync != null);
         if (syncData.messages.currentSync <= syncData.messages.lastSynced)
            Log_WriteError('currentSync should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
         let lastSynced = syncData.messages.lastSynced;
         let cursor = syncData.messages.conversationCursor;
         ActionCheck_SendResponse(IG_DATA_NAME, 'Messages', url, sendResponse, {
            action: 'getMessages',
            url: url,
            lastCheck: cursor ? cursor : lastSynced,
            currentCheck: syncData.messages.currentSync
         }, url, cursor ? cursor : lastSynced);
      }
      else if (ActionCheck_OK(IG_DATA_NAME, sender))
      {
         ActionCheck_SetUrl(IG_DATA_NAME, action.category, 'getMessages', url, sender, url, sendResponse);
      }
      else
      {
         // the conversation has been removed, or for some reason we're in a processing loop, skip it
         Log_WriteError('Skipping conversation as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
         ActionCheck_Aborting(IG_DATA_NAME);
         sendResponse({action: 'skipConversation', url: url});
      }
   }
   
   return true;
}