function HandleInstagramGetAction(sender, request, sendResponse)
{
   if (hasTemporaryTab(IG_DATA_NAME) && !isTemporaryTab(sender.tab.id))
   {
      Log_WriteInfo('There is a temporary tab for InstagramScrape and this is not it.');
      sendResponse({action: null});
      return;
   }
   
   if (!getSyncControl(sender.tab.id, IG_DATA_NAME))
   {
      sendResponse({action: null});
      ActionCheck_Aborting(IG_DATA_NAME);
      return;
   }
   
   let localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
   
   let baseUrl = 'https://www.instagram.com';
   
   if (request.accountID == null)
   {
      if (fuzzyUrlsMatch(sender.url, baseUrl))
      {
         Log_WriteWarning('We don\'t have a Instagram account ID, assuming browsing as page at ' + sender.url);
         Syncs_SocialNotLoggedIn(baseUrl, baseUrl, Str('You are either logged out of "<0>" or browsing as a page instead of your profile. The "<1>" Chrome extension requires that you be logged in as your main profile in order to function correctly.',
            baseUrl, Environment.ApplicationName));
         sendResponse({action: null});
      }
      else
      {
         Log_WriteWarning('We don\'t have a Instagram account ID, loading with base URL!');
         Log_WriteInfo('Switching from ' + sender.url + ' to ' + baseUrl);
         Tabs.SetTabUrl(sender.tab.id, baseUrl);
      }
      return;
   }
   for (let accountID in localData.igAccounts)
   {
      if (localData.igAccounts[accountID].accountName == null)
      {
         let url = "https://www.instagram.com/direct/inbox";
         if (fuzzyUrlsMatch(sender.url, url))
         {
            sendResponse({action: 'getAccountInfo', accountID: accountID});
         }
         else
         {
            Tabs.SetTabUrl(sender.tab.id, url);
         }
         return;
      }
   }
   
   // if it's been a while since we've checked for new accounts let's do that
   let now = Date.now();
   if (localData.igLastAccountsCheck == null || now - localData.igLastAccountsCheck > timings.INSTAGRAM_ACCOUNTS_CHECK_DELAY * 1000)
   {
      let url = "https://www.instagram.com/direct/inbox";
      if (fuzzyUrlsMatch(sender.url, url))
      {
         sendResponse({action: 'getAccounts'});
      }
      else
      {
         Tabs.SetTabUrl(sender.tab.id, url);
      }
      return;
   }
   let account = getOldestCheckedAccount(localData.igAccounts);
   if (account == null)
   {
      releaseSyncControl(sender.tab.id, IG_DATA_NAME);
      sendResponse({action: null});
      return;
   }
   
   getServerState(IG_DATA_NAME, request.accountID, request.accountName)
      .then(async resp =>
      {
         if (resp == null || resp.IsAutomationPaused)
         {
            if (resp != null)
               Log_WriteInfo('*** Automation is paused ***');
            releaseSyncControl(sender.tab.id, IG_DATA_NAME);
            sendResponse({action: null});
            return;
         }
         
         let actions = QueueInstagramActions(sender, localData, resp);
         
         let action = ActionSelection_ChooseNextAction(IG_DATA_NAME, actions);
         
         let syncData = decodeInstagramSyncData(resp.SyncData);
         
         let saveSync = false;
         
         if (action &&
            // this category is handled below
            action.category != 'FetchContact')
         {
            if (action.action !== undefined)
            {
               sendResponse(action);
               return;
            }
            
            account.syncData = resp.SyncData;
            
            localData.igAccounts[account.accountID] = account;
            
            Storage.SetLocalVar('BG_IG', localData);
            
            var lastSynced = resp.LastSynced;
            if (lastSynced != null)
               lastSynced = stringToTimestamp(lastSynced);
            
            if (UserHasFeature(UserFeaturesSyncMessages) &&
               // we aren't waiting for throttling to end
               now >= localData.skipCheckingMessagesUntil &&
               // it's time to scrape again
               now - lastSynced >= timings.MESSAGES_SCRAPE_DELAY * 1000)
            {
               let url = null;
               let urlNot = null;
               if (account.currentTab == PRIMARY_TAB)
               {
                  url = 'https://www.instagram.com/direct/inbox/';
                  urlNot = 'https://www.instagram.com/direct/inbox/general/';
               }
               else
               {
                  url = 'https://www.instagram.com/direct/inbox/general/';
               }
               if (fuzzyUrlStartsWith(sender.url, url) &&
                  (urlNot == null || !fuzzyUrlStartsWith(sender.url, urlNot)))
               {
                  sendResponse({
                     action: 'getNextChat',
                     accountID: account.accountID,
                     checkedChats: account.checkedChats,
                     syncData: account.syncData,
                     currentTab: account.currentTab
                  });
               }
               else
               {
                  Tabs.SetTabUrl(sender.tab.id, url);
               }
               return;
            }
            
            let handled = await InitiateInstagramAction(sender, resp.AccountID, syncData, localData, sendResponse, baseUrl, action);
            
            if (handled)
               return;
            
            // syncData could be changed by the above call so fall through to save it below
            saveSync = true;
         }
         else if (initiateContactFetch(sender, IG_DATA_NAME, resp.commands, resp.AccountID,
            constantPaths.Instagram.contactFetchUrls, sendResponse))
         {
            return;
         }
         
         if (!saveSync)
         {
            releaseSyncControl(sender.tab.id, IG_DATA_NAME);
            sendResponse({action: null});
            return;
         }
         
         syncData = encodeInstagramSyncData(syncData);
         
         setServerState(IG_DATA_NAME, request.accountID, null, syncData, null)
            .then(resp =>
            {
               releaseSyncControl(sender.tab.id, IG_DATA_NAME);
               sendResponse({action: null});
            })
            .catch(e =>
            {
               Log_WriteException(e, request.type);
               releaseSyncControl(sender.tab.id, IG_DATA_NAME);
               sendResponse({action: null});
            });
      })
      .catch(e =>
      {
         Log_WriteException(e, request.type);
         releaseSyncControl(sender.tab.id, IG_DATA_NAME);
         sendResponse({action: null});
      });
}