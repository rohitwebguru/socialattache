function BackGroundTikTokInit()
{
   return {
      tiktokAccountID: null,
      tiktokAccountName: null,
      tiktokCheckLastId: null,
      lastTikTokUrl: null
   };
}

function onMessageTikTok(request, sender, sendResponse)
{
   let now = Date.now();
   Log_WriteInfo('backgroundTikTok got request from tab ' + sender.tab.id + ': ' + request.type);
   
   if (request.type == 'setActionThrottled')
   {
      ActionCheck_Aborting(TT_DATA_NAME);
      
      Log_WriteWarning(request.action + ' is being throttled at ' + sender.url);

//      let localData = Storage.GetLocalVar('BG_TT', BackGroundTikTokInit());
      
      if (request.action == 'getContact')
         contactFetchThrottled(TT_DATA_NAME);
      else if (request.action == 'wait')
         Log_WriteInfo('Ignoring throttled action "' + request.action + '"');
      else
         Log_WriteError('Unexpected throttled action "' + request.action + '"');

//      Storage.SetLocalVar('BG_TT', localData);
      
      if (request.action != 'wait')
         setTabThrottled(sender.tab.id, true, request.type);
      
      sendResponse();
   }
   else if (request.type == 'getAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_TT', BackGroundTikTokInit());
      sendResponse({
         id: localData.tiktokAccountID,
         name: localData.tiktokAccountName,
      });
   }
   else if (request.type == 'setAccountInfo')
   {
      let localData = Storage.GetLocalVar('BG_TT', BackGroundTikTokInit());
      
      localData.tiktokAccountID = request.id;
      localData.tiktokAccountName = request.name;
      localData.tiktokCheckLastId = null;
      
      Storage.SetLocalVar('BG_TT', localData);
      
      sendResponse();
   }
   else if (request.type == 'setContact')
   {
      completeContactFetch(sender, request, sendResponse);
   }
   else if (request.type == 'setChats')
   {
      getServerState('TikTokScrape', request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse();
               return;
            }
            
            let syncData = resp.SyncData;
            if (syncData && syncData.indexOf('conversationsLeft') != -1)
               syncData = Json_FromString(syncData);
            else // first initialization or update legacy format
               syncData = {
                  messages: {
                     lastSynced: getLatestSyncTimestamp(),
                     currentSync: null,
                     conversationsLeft: [],
                     conversationCursor: null
                  },
               };
            
            if (request.currentCheck <= syncData.messages.lastSynced)
               Log_WriteError('currentCheck ' + request.currentCheck + ' should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
            syncData.messages.currentSync = request.currentCheck;
            syncData.messages.conversationsLeft = request.chats;
            syncData.messages.conversationCursor = null;
            
            let lastCheck = null;
            if (syncData.messages.conversationsLeft.length == 0)
            {
               // no conversations, finished this pass
               lastCheck = Date.now();
               if (syncData.messages.currentSync <= syncData.messages.lastSynced)
                  Log_WriteError('currentSync 3 should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
               syncData.messages.lastSynced = syncData.messages.currentSync;
               syncData.messages.currentSync = null;
            }
            
            assert(typeof syncData !== 'string'); // must not already be encoded
            syncData = Json_ToString(syncData);
            
            setServerState('TikTokScrape', request.accountID, lastCheck, syncData, null)
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
      getServerState('TikTokScrape', request.accountID, null)
         .then(resp =>
         {
            if (resp == null)
            {
               sendResponse(false);
               return;
            }
            
            let syncData = resp.SyncData;
            assert(syncData && syncData.indexOf('conversationsLeft') != -1);
            syncData = Json_FromString(syncData);
            
            startingLongRunningOperation('TikTokScrape');  // processing messages will take a while

// DRL FIXIT! Dominique, in my case the conversationsLeft contains "@socialattache" and the URL
// is "https://www.tiktok.com/messages/?lang=en&u=6804232433502241798" which I believe is the
// expected state when the messages have been parsed so this check does not seem correct?
            /*                if (syncData.messages.conversationsLeft.length && sender.url != syncData.messages.conversationsLeft[0]) {
                                // saw this happen but not sure the circumstances, we need to retry this conversation I think
                                Log_WriteError('Conversation URL ' + sender.url+ ' doesn\'t match expected ' +
                                    syncData.messages.conversationsLeft[0] + ', will try again');
                            }
                            else*/
            if (request.cursor == null)
            {
               // we've retrieved all new messages for this conversation so we can remove it from the list to check
               syncData.messages.conversationsLeft.shift();
               syncData.messages.conversationCursor = null;
            }
            else
            {
               // we still have more messages to get from this conversation
               syncData.messages.conversationCursor = request.cursor;
            }
            
            let hasMoreMessages = request.cursor != null;
            let lastCheck = null;
            if (request.cursor == null && syncData.messages.conversationsLeft.length == 0)
            {
               // finished this pass
               lastCheck = Date.now();
               if (syncData.messages.currentSync <= syncData.messages.lastSynced)
                  Log_WriteError('currentSync 4 should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
               syncData.messages.lastSynced = syncData.messages.currentSync;
               syncData.messages.currentSync = null;
            }
            
            assert(typeof syncData !== 'string'); // must not already be encoded
            syncData = Json_ToString(syncData);
            
            setServerState('TikTokScrape', request.accountID, lastCheck, syncData, request.messages)
               .then(resp =>
               {
                  finishedLongRunningOperation('TikTokScrape');
                  
                  // if we have been scraping for too long this is a good time to break out
                  if (getSyncControlDuration('TikTokScrape') > timings.SYNC_MAX_SCRAPE_TIME)
                  {
                     releaseSyncControl(sender.tab.id, 'TikTokScrape');
                  }
                  
                  sendResponse(hasMoreMessages);
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  finishedLongRunningOperation('TikTokScrape');
                  sendResponse(false);
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            finishedLongRunningOperation('TikTokScrape');
            sendResponse(false);
         });
   }
   else if (request.type == 'setPostId')
   {
      if (request.externalPostID === NO_EXTERNAL_ID)
      {
         let localData = Storage.GetLocalVar('BG_TT', BackGroundTikTokInit());
         assert(localData.tiktokCheckLastId == null);
         
         Tabs.SetTabUrl(sender.tab.id, 'https://www.tiktok.com/@' + request.accountID);
         localData.lastTikTokUrl = 'https://www.tiktok.com/@' + request.accountID;
         
         Storage.SetLocalVar('BG_TT', localData);
      }
      else
      {
         setServerState('TikTokScrape', request.accountID, null, null,
            [{'MessageID': request.postID, 'ExternalMessageID': request.externalPostID, 'From': request.from}])
            .then(resp =>
            {
               let localData = Storage.GetLocalVar('BG_TT', BackGroundTikTokInit());
               
               assert(localData.tiktokCheckLastId == null || localData.tiktokCheckLastId == request.postID);
               localData.tiktokCheckLastId = null;
               
               Storage.SetLocalVar('BG_TT', localData);
               
               sendResponse();
            })
            .catch(e =>
            {
               Log_WriteException(e, request.type);
               sendResponse();
            });
      }
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
   
      setServerState('TikTokScrape', request.accountID, null, null, [message])
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
      console.log('getAction')
      
      let baseUrl = 'https://www.tiktok.com';
      
      if (!getSyncControl(sender.tab.id, 'TikTokScrape'))
      {
         sendResponse({action: null});
         return;
      }
      
      getServerState('TikTokScrape', request.accountID, request.accountName)
         .then(resp =>
         {
            if (resp == null || resp.IsAutomationPaused)
            {
               if (resp != null)
                  Log_WriteInfo('*** Automation is paused ***');
               releaseSyncControl(sender.tab.id, 'TikTokScrape');
               sendResponse({action: null});
               return;
            }
            
            let localData = Storage.GetLocalVar('BG_TT', BackGroundTikTokInit());
            
            if (resp.messages.length > 0)
            {
               let post = resp.messages[0];
               
               if (localData.tiktokCheckLastId)
               {
                  let url = "https://www.tiktok.com/@" + request.accountID;
                  if (fuzzyUrlsMatch(sender.url, url))
                  {
                     assert(localData.tiktokCheckLastId == post.Uid);
                     sendResponse({action: 'checkLastId', post: post});
                  }
                  else
                  {
                     Tabs.SetTabUrl(sender.tab.id, url);
                     localData.lastTikTokUrl = 'https://www.tiktok.com/@' + request.accountID;
                  }
               }
               else if (post.Type == 'tt_post')
               {
                  let url = 'https://www.tiktok.com/upload';
                  if (fuzzyUrlsMatch(sender.url, url))
                  {
                     sendResponse({action: 'makePost', post: post});
                  }
                  else
                  {
                     Tabs.SetTabUrl(sender.tab.id, url);
                     localData.lastTikTokUrl = url;
                  }
               }
               else if (post.Type == 'tt_msg')
               {
                  try
                  {
                     // First check if the tab is the username homepage https://www.tiktok.com/@messageToThisUsername
                     // if is not will send to that page and request actions redirectToUserMessagesPage
                     // check if the lastTikTokUrl was https://www.tiktok.com/@messageToThisUsername and if this url is a messaging page
                     // then execute sendMessage
                     let toParts = post.To[0].split(/(<|>|@)/g);
                     let url = 'https://www.tiktok.com/@' + toParts[2];
                     let senderUrl = sender.url;
                     
                     //Is checking if is on the 'https://www.tiktok.com/@messageToThisUsername' already and if is not a step ahead
                     if ((!senderUrl.includes(toParts[2]) && !senderUrl.includes('u=') && !senderUrl.includes('messages')) || !lastTikTokUrl)
                     {
                        Log_WriteInfo('Action(tt_msg): Opening the url on tab ' + sender.tab.id)
                        Tabs.SetTabUrl(sender.tab.id, url);
                        localData.lastTikTokUrl = url;
                     }
                     else
                        //Is checking if is on the 'https://www.tiktok.com/@messageToThisUsername' and if is asking to redirect to the messaging page
                     if (senderUrl.includes(toParts[2]) && !senderUrl.includes('u=') && !senderUrl.includes('messages'))
                     {
                        Log_WriteInfo('Action(tt_msg): Sending res -> redirectToUserMessagingFromProfilePage')
                        showSyncWindowAndTab(sender.tab.id, 2, constants.MINIMUM_TAB_WIDTH)
                        sendResponse({action: 'redirectToUserMessagingFromProfilePage', post: post});
                     }
                     else
                        // Is checking if the last page was the https://www.tiktok.com/@messageToThisUsername and if is in the tiktok messages/?u=
                     if (localData.lastTikTokUrl != null && localData.lastTikTokUrl.includes('@' + toParts[2]) && (senderUrl.includes('u=')) && senderUrl.includes('messages'))
                     {
                        Log_WriteInfo('Action(tt_msg): Sending res -> sendMessage')
                        showSyncWindowAndTab(sender.tab.id, 5, constants.MINIMUM_TAB_WIDTH)
                        sendResponse({action: 'sendMessage', post: post});
                     }
                     
                     
                  }
                  catch (e)
                  {
                     console.log(e)
                  }
               }
               
               Storage.SetLocalVar('BG_TT', localData);
               
               return;
            }
            
            //Sync Data
            let syncData = resp.SyncData;
            if (syncData && syncData.indexOf('conversationsLeft') != -1)
               syncData = Json_FromString(syncData);
            else // first initialization or update legacy format
               syncData = {
                  messages: {
                     lastSynced: getLatestSyncTimestamp(),
                     currentSync: null,
                     conversationsLeft: [],
                     conversationCursor: null
                  },
               };
            
            if (ActionSelection_IsSyncIdleTime(TT_DATA_NAME))
            {
               sendResponse({action: 'wait', seconds: timings.SYSTEM_IDLE_DELAY});
               return;
            }
            
            let lastSynced = syncData.messages.lastSynced;
            now = Date.now();
            //End of Sync Data
            
            if (UserHasFeature(UserFeaturesSyncMessages) &&
               // it's time to scrape again
               now - lastSynced >= timings.MESSAGES_SCRAPE_DELAY * 1000)
            {
               if (syncData.messages.currentSync == null)
               {
                  // Start of new sync
                  
                  if (sender.url.startsWith(baseUrl + '/messages/'))
                  {
                     sendResponse({action: 'getChats', lastCheck: syncData.messages.lastSynced});
                  }
                  else
                  {
                     let url = baseUrl + '/messages/';
                     Tabs.SetTabUrl(sender.tab.id, url);
                     lastTikTokUrl = url;
                  }
               }
               else
               {
                  let username = syncData.messages.conversationsLeft[0];
                  let url = 'https://www.tiktok.com/' + username
                  if (sender.url.includes('messages') && sender.url.includes('u='))
                  {
                     // continue where we left off
                     
                     let lastSynced = syncData.messages.lastSynced;
                     let cursor = syncData.messages.conversationCursor;
                     sendResponse({
                        action: 'getMessages', lastCheck: cursor ? cursor : lastSynced,
                        currentCheck: syncData.messages.currentSync
                     });
                     lastTikTokUrl = null;
                  }
                  else if (lastTikTokUrl == url && !sender.url.includes('messages'))
                  {
                     sendResponse({action: 'redirectToUserMessagingFromProfilePage'});
                  }
                  else if (lastTikTokUrl != url)
                  {
                     Tabs.SetTabUrl(sender.tab.id, url);
                     lastTikTokUrl = url;
                  }
                  else
                  {
                     // the conversation has been removed, skip it
                     
                     Log_WriteError('Skipping conversation as the URL is bad: ' + url);
                     sendResponse({action: 'skipConversation', currentCheck: syncData.messages.currentSync});
                  }
               }
               return;
            }
            
            // fetch contacts only if we have nothing else to do
            if (initiateContactFetch(sender, 'TikTokScrape', resp.commands, resp.AccountID,
               constantPaths.TikTok.contactFetchUrls, sendResponse))
            {
               return;
            }
            
            setServerState('TikTokScrape', request.accountID, Date.now())
               .then(resp =>
               {
                  releaseSyncControl(sender.tab.id, 'TikTokScrape');
                  sendResponse({action: null});
               })
               .catch(e =>
               {
                  Log_WriteException(e, request.type);
                  releaseSyncControl(sender.tab.id, 'TikTokScrape');
                  sendResponse({action: null});
               });
         })
         .catch(e =>
         {
            Log_WriteException(e, request.type);
            releaseSyncControl(sender.tab.id, 'TikTokScrape');
            sendResponse({action: null});
         });
   }
   else
   {
      Log_WriteError("Got unrecognized request:\n" + GetVariableAsString(request));
   }
}