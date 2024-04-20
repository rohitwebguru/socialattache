function HandleInstagramActionResult(sender, request, sendResponse)
{
   if (request.type == 'setActionThrottled' && request.isThrottled)
   {
      ActionCheck_Aborting(IG_DATA_NAME);
      
      Log_WriteWarning(request.action + ' is being throttled at ' + sender.url)
      
      let localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
      let now = Date.now();
      
      if (request.action == 'getContact')
         contactFetchThrottled(IG_DATA_NAME);
      else if (request.action == 'getNextChat')
         localData.skipCheckingMessagesUntil = now + timings.THROTTLED_DELAY * 1000;
      else if (request.action == 'wait')
         Log_WriteInfo('Ignoring throttled action "' + request.action + '"');
      else
         Log_WriteError('Unexpected throttled action "' + request.action + '"');
      
      Storage.SetLocalVar('BG_IG', localData);
      
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
   else if (request.type == 'setMessageId')
   {
      ActionCheck_Completed(IG_DATA_NAME, sender.tab.id, 'sendMessage');
      
      let message = {
         'MessageBoxUid': request.messageBoxUid,
         'MessageID': request.messageID,
         'ExternalMessageID': request.externalMessageID,
         'From': request.from,
         'ErrorMessage': request.errorMessage
      };
      
      setServerState(IG_DATA_NAME, request.accountID, null, null, [message])
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
   else if (request.type == 'setPostId')
   {
      ActionCheck_Completed(IG_DATA_NAME, sender.tab.id, 'makePost');
      
      // DRL FIXIT? This is currently here for testing, remove if not used.
      if (isTemporaryTab(sender.tab.id))
      {
         Log_WriteInfo('Removing temporary tab ' + sender.tab.id + ' now that message was sent (' +
            (request.externalMessageID == ERROR_EXTERNAL_ID || request.externalMessageID == RETRY_EXTERNAL_ID || request.externalMessageID == LIMITED_EXTERNAL_ID
               ? 'failure' : 'success') + ')');
         Tabs.RemoveTab(sender.tab.id);
      }
      
      // it is important to set a standard URL so that the code in getAction doesn't think we're
      // ready to post as the last page of the posting isn't the same as the necessary first page
      // but they have similar URLs
      let baseUrl = 'https://www.instagram.com';
      Tabs.SetTabUrl(sender.tab.id, baseUrl);
      
      let localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
      
      let waitUntil = Date.now() + timings.Commands['MakePost'].ActionDelay * 1000;
      if (waitUntil > localData.skipMakingPostsUntil)
         localData.skipMakingPostsUntil = waitUntil;
      
      Storage.SetLocalVar('BG_IG', localData);
      
      let message = {
         'MessageID': request.postID,
         'ExternalMessageID': request.externalPostID,
         'From': request.from,
         'ErrorMessage': request.errorMessage
      };
      
      setServerState(IG_DATA_NAME, request.accountID, null, null, [message])
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
   else if (request.type == 'sendConversation')
   {
      let localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
      
      localData.igAccounts[request.accountID].checkedChats = request.checkedChats;
      localData.igAccounts[request.accountID].syncData = request.syncData;
      
      Storage.SetLocalVar('BG_IG', localData);
      
      // the server just wants a list of messages but we accumulate them per conversation
      let messages = [];
      for (let conversation of request.conversations)
      {
         messages = messages.concat(conversation.messages);
      }
      
      setServerState(IG_DATA_NAME, request.accountID, Date.now(), request.syncData, messages)
         .then(resp => sendResponse())
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse();
         });
   }
   else if (request.type == 'setAccounts')
   {
      let localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
      
      for (let accountID of request.accounts)
      {
         if (!localData.igAccounts.hasOwnProperty(accountID))
         {
            localData.igAccounts[accountID] = {
               accountID: accountID,
               accountName: null,
               checkedChats: [],
               syncData: null,    // this is JSON encoded: {recipient: {timestamp: 0, messageCount: 0}}
               lastCheck: 0,
               currentTab: PRIMARY_TAB
            };
         }
      }
      localData.igLastAccountsCheck = Date.now();
      
      Storage.SetLocalVar('BG_IG', localData);
      
      sendResponse();
   }
   else if (request.type == 'setAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
      
      if (!localData.igAccounts.hasOwnProperty(request.id))
      {
         assert(0); // the account should have already been added
         sendResponse(null);
         return;
      }
      
      localData.igAccounts[request.id].accountName = request.name;
      
      Storage.SetLocalVar('BG_IG', localData);
      
      sendResponse();
   }
   else
      return false;
   
   return true;
}