function BackGroundPinterestInit()
{
   return {
      pinterestAccountID: null,
      pinterestAccountName: null,
      pinterestAccountUsername: null
   };
}

function onMessagePinterest(request, sender, sendResponse)
{
   Log_WriteInfo('backgroundPinterest got request from tab ' + sender.tab.id + ': ' + request.type);
   
   if (request.type == 'setActionThrottled')
   {
      ActionCheck_Aborting(PINT_DATA_NAME);
      
      Log_WriteWarning(request.action + ' is being throttled at ' + sender.url);

//        let localData = Storage.GetLocalVar('BG_PINT', BackGroundPinterestInit());
      
      if (request.action == 'getContact')
         contactFetchThrottled(PINT_DATA_NAME);
      else if (request.action == 'wait')
         Log_WriteInfo('Ignoring throttled action "' + request.action + '"');
      else
         Log_WriteError('Unexpected throttled action "' + request.action + '"');

//        Storage.SetLocalVar('BG_PINT', localData);
      
      if (request.action != 'wait')
         setTabThrottled(sender.tab.id, true, request.type);
      
      sendResponse();
   }
   else if (request.type == 'getAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_PINT', BackGroundPinterestInit());
      
      sendResponse({
         id: localData.pinterestAccountID,
         name: localData.pinterestAccountName,
         username: localData.pinterestAccountUsername
      });
   }
   else if (request.type == 'setAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_PINT', BackGroundPinterestInit());
      
      localData.pinterestAccountID = request.id;
      localData.pinterestAccountName = request.name;
      localData.pinterestAccountUsername = request.username;
      
      Storage.SetLocalVar('BG_PINT', localData);
      
      sendResponse();
   }
   else if (request.type == 'setContact')
   {
      completeContactFetch(sender, request, sendResponse);
   }
   else if (request.type == 'setMessages')
   {
      setServerState('PinterestScrape', request.accountID, request.currentCheck, request.syncData, request.messages)
         .then(resp =>
         {
            // DRL FIXIT? With Pinterest we get all the messages in one chunk, so when we send
            // them to the server that's the end of our run.
            releaseSyncControl(sender.tab.id, 'PinterestScrape');
            sendResponse(false);
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            sendResponse(false);
         });
   }
   else if (request.type == 'setPostId')
   {
      setServerState('PinterestScrape', request.accountID, null, null,
         [{'MessageID': request.postID, 'ExternalMessageID': request.externalPostID, 'From': request.from}])
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
   else if (request.type == 'setMessageId')
   {
      let message = {
         'MessageBoxUid': request.messageBoxUid,
         'MessageID': request.messageID,
         'ExternalMessageID': request.externalMessageID,
         'From': request.from,
         'ErrorMessage': request.errorMessage
      };
   
      setServerState('PinterestScrape', request.accountID, null, null, [message])
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
   else if (request.type == 'getAction')
   {
      if (!getSyncControl(sender.tab.id, 'PinterestScrape'))
      {
         sendResponse({action: null});
         return;
      }
      
      let url = 'https://www.pinterest.com';
      if (!fuzzyUrlsMatch(sender.url, url))
      {
         Tabs.SetTabUrl(sender.tab.id, url);
         return;
      }
      
      getServerState('PinterestScrape', request.accountID, request.accountName)
         .then(resp =>
         {
            if (resp == null || resp.IsAutomationPaused)
            {
               if (resp != null)
                  Log_WriteInfo('*** Automation is paused ***');
               releaseSyncControl(sender.tab.id, 'PinterestScrape');
               sendResponse({action: null});
               return;
            }
            
            let lastSynced = resp.LastSynced;
            if (lastSynced != null)
               lastSynced = stringToTimestamp(lastSynced);
            
            if (UserHasFeature(UserFeaturesSyncMessages) && resp.messages.length > 0)
            {
               let message = resp.messages[0];
               
               if (message.Type == 'pint_post')
               {
                  sendResponse({
                     action: 'makePost',
                     post: message
                  });
                  return;
               }
               else if (message.Type == 'pint_msg')
               {
                  sendResponse({
                     action: 'sendMessage',
                     message: message
                  });
                  return;
               }
               else
               {
                  Log_WriteError("Unexpected Pinterest message type " + message.Type);
               }
            }
            
            if (ActionSelection_IsSyncIdleTime(PINT_DATA_NAME))
            {
               sendResponse({action: 'wait', seconds: timings.SYSTEM_IDLE_DELAY});
               return;
            }
            
            let now = Date.now();
            if (UserHasFeature(UserFeaturesSyncMessages) &&
               // it's time to scrape again
               now - lastSynced >= timings.MESSAGES_SCRAPE_DELAY * 1000)
            {
               sendResponse({
                  action: 'getMessages',
                  lastCheck: lastSynced,
                  lastMessageIds: resp.SyncData
               });
               return;
            }
            
            // fetch contacts only if we have nothing else to do
            if (initiateContactFetch(sender, 'PinterestScrape', resp.commands, resp.AccountID,
               constantPaths.Pinterest.contactFetchUrls, sendResponse))
            {
               return;
            }
            
            setServerState('PinterestScrape', request.accountID, now)
               .then(resp =>
               {
                  releaseSyncControl(sender.tab.id, 'PinterestScrape');
                  sendResponse({action: null});
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  releaseSyncControl(sender.tab.id, 'PinterestScrape');
                  sendResponse({action: null});
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            releaseSyncControl(sender.tab.id, 'PinterestScrape');
            sendResponse({action: null});
         });
   }
   else
   {
      Log_WriteError("Got unrecognized request:\n" + GetVariableAsString(request));
   }
}