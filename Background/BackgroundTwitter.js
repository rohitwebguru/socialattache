function BackGroundTwitterInit()
{
   return {
      twitterAccountID: null,
      twitterAccountName: null,
      twitterAccountUsername: null
   };
}

function onMessageTwitter(request, sender, sendResponse)
{
   Log_WriteInfo('backgroundTwitter got request from tab ' + sender.tab.id + ': ' + request.type);
   
   if (request.type == 'setActionThrottled')
   {
      ActionCheck_Aborting(TWIT_DATA_NAME);
      
      Log_WriteWarning(request.action + ' is being throttled at ' + sender.url);

//        let localData = Storage.GetLocalVar('BG_TWIT', BackGroundTikTokInit());
      
      if (request.action == 'getContact')
         contactFetchThrottled(TWIT_DATA_NAME);
      else if (request.action == 'wait')
         Log_WriteInfo('Ignoring throttled action "' + request.action + '"');
      else
         Log_WriteError('Unexpected throttled action "' + request.action + '"');

//        Storage.SetLocalVar('BG_TWIT', localData);
      
      if (request.action != 'wait')
         setTabThrottled(sender.tab.id, true, request.type);
      
      sendResponse();
   }
   else if (request.type == 'getAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_TWIT', BackGroundTikTokInit());
      sendResponse({
         id: localData.twitterAccountID,
         name: localData.twitterAccountName,
         username: localData.twitterAccountUsername
      });
   }
   else if (request.type == 'setAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_TWIT', BackGroundTikTokInit());
      
      localData.twitterAccountID = request.id;
      localData.twitterAccountName = request.name;
      localData.twitterAccountUsername = request.username;
      
      Storage.SetLocalVar('BG_TWIT', localData);
      sendResponse();
   }
   else if (request.type == 'setContact')
   {
      completeContactFetch(sender, request, sendResponse);
   }
   else if (request.type == 'setMessages')
   {
      setServerState('TwitterScrape', request.accountID, request.currentCheck, null, request.messages)
         .then(resp =>
         {
            // DRL FIXIT? With Twitter we get all the messages in one chunk, so when we send
            // them to the server that's the end of our run.
            releaseSyncControl(sender.tab.id, 'TwitterScrape');
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
      setServerState('TwitterScrape', request.accountID, null, null,
         [{'MessageID': request.postID, 'ExternalMessageID': request.externalPostID, 'From': request.from}])
         .then(resp =>
         {
            sendResponse();
         })
         .catch(error =>
         {
            Log_WriteError("Error handling setPostId(): " + error);
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
   
      setServerState('TwitterScrape', request.accountID, null, null, [message])
         .then(resp =>
         {
            sendResponse();
         })
         .catch(error =>
         {
            Log_WriteError("Error handling setMessageId(): " + error);
            sendResponse();
         });
   }
   else if (request.type == 'getAction')
   {
      if (!getSyncControl(sender.tab.id, 'TwitterScrape'))
      {
         sendResponse({action: null});
         return;
      }
      
      let url = 'https://twitter.com';
      if (!fuzzyUrlsMatch(sender.url, url))
      {
         Tabs.SetTabUrl(sender.tab.id, url);
         return;
      }
      
      getServerState('TwitterScrape', request.accountID, request.accountName)
         .then(resp =>
         {
            if (resp == null || resp.IsAutomationPaused)
            {
               if (resp != null)
                  Log_WriteInfo('*** Automation is paused ***');
               releaseSyncControl(sender.tab.id, 'TwitterScrape');
               sendResponse({action: null});
               return;
            }
            
            if (UserHasFeature(UserFeaturesSyncMessages) && resp.messages.length > 0)
            {
               let message = resp.messages[0];
               
               if (message.Type == 'twit_post')
               {
                  sendResponse({
                     action: 'makePost',
                     post: message
                  });
                  return;
               }
               else if (message.Type == 'twit_msg')
               {
                  sendResponse({
                     action: 'sendMessage',
                     message: message
                  });
                  return;
               }
               else
               {
                  Log_WriteError("Unexpected Twitter message type " + message.Type);
               }
            }
            
            if (ActionSelection_IsSyncIdleTime(TWIT_DATA_NAME))
            {
               sendResponse({action: 'wait', seconds: timings.SYSTEM_IDLE_DELAY});
               return;
            }
            
            var lastSynced = resp.LastSynced;
            if (lastSynced != null)
               lastSynced = stringToTimestamp(lastSynced);
            
            let now = Date.now();
            if (UserHasFeature(UserFeaturesSyncMessages) &&
               // it's time to scrape again
               now - lastSynced >= timings.MESSAGES_SCRAPE_DELAY * 1000)
            {
               sendResponse({
                  action: 'getMessages',
                  lastCheck: lastSynced,
               });
               return;
            }
            
            // fetch contacts only if we have nothing else to do
            if (initiateContactFetch(sender, 'TwitterScrape', resp.commands, resp.AccountID,
               constantPaths.Twitter.contactFetchUrls, sendResponse))
            {
               return;
            }
            
            setServerState('TwitterScrape', request.accountID, now)
               .then(resp =>
               {
                  releaseSyncControl(sender.tab.id, 'TwitterScrape');
                  sendResponse({action: null});
               })
               .catch(error =>
               {
                  Log_WriteError("Error setting final server state in getAction(): " + error);
                  releaseSyncControl(sender.tab.id, 'TwitterScrape');
                  sendResponse({action: null});
               });
         })
         .catch(error =>
         {
            Log_WriteError("Error handling getAction(): " + error);
            releaseSyncControl(sender.tab.id, 'TwitterScrape');
            sendResponse({action: null});
         });
   }
   else
   {
      Log_WriteError("Got unrecognized request:\n" + GetVariableAsString(request));
   }
}