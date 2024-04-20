function HandleFacebookGetAction(sender, request, sendResponse)
{
   if (hasTemporaryTab(FB_DATA_NAME) && !isTemporaryTab(sender.tab.id))
   {
      Log_WriteInfo('There is a temporary tab for FacebookScrape and this is not it.');
      sendResponse({action: null});
      return;
   }
   if (!getSyncControl(sender.tab.id, FB_DATA_NAME))
   {
      sendResponse({action: null});
      ActionCheck_Aborting(FB_DATA_NAME);
      return;
   }
   
   let baseUrl = 'https://';
   let domain = Url_GetDomain(sender.url);
   if (domain == 'web.facebook.com' ||
      domain == 'm.facebook.com' ||
      domain == 'mbasic.facebook.com' ||
      domain == 'upload.facebook.com')
      baseUrl += domain;               // stay on current domain as it is supported
   else
      baseUrl += 'www.facebook.com';   // switch to default domain
   let baseMessengerUrl = 'https://www.messenger.com/';
   
   let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
   
   if (request.accountID == null)
   {
      if (fuzzyUrlsMatch(sender.url, baseUrl))
      {
         Log_WriteWarning('We don\'t have a Facebook account ID, assuming browsing as page at ' + sender.url);
         Syncs_SocialNotLoggedIn(baseUrl, baseUrl, Str('You are either logged out of "<0>" or browsing as a page instead of your profile. The "<1>" Chrome extension requires that you be logged in as your main profile in order to function correctly.',
            baseUrl, Environment.ApplicationName));
         sendResponse({action: null});
      }
      else if (sender.url.startsWith(baseMessengerUrl))
      {
         Log_WriteWarning('We don\'t have a Messenger account ID at ' + sender.url);
         Syncs_SocialNotLoggedIn(baseMessengerUrl, baseUrl, Str('You are not logged into "<0>". The "<1>" Chrome extension requires that you be logged in there, so please visit "<0>" and log in.',
            baseMessengerUrl, Environment.ApplicationName));
         sendResponse({action: null});
      }
      else
      {
         Log_WriteWarning('We don\'t have a Facebook account ID, loading with base URL!');
         
         // This happens when logged out of social, or...
         // when scraping FB profiles we don't have an account ID from the content so if we
         // get here it's likely we just scraped a profile and now we need to take the tab to
         // a page where we can get an account ID to continue
         // another situation I saw was a Web page that was empty so the page didn't load
         Log_WriteInfo('Switching from ' + sender.url + ' to ' + baseUrl);
         Tabs.SetTabUrl(sender.tab.id, baseUrl);
      }
      return;
   }
   
   getServerState(FB_DATA_NAME, request.accountID, request.accountName)
      .then(async resp =>
      {
         if (resp == null || resp.IsAutomationPaused)
         {
            if (resp != null)
               Log_WriteInfo('*** Automation is paused ***');
            releaseSyncControl(sender.tab.id, FB_DATA_NAME);
            sendResponse({action: null});
            return;
         }
         
         let actions = QueueFacebookActions(sender, localData, resp);
         
         let action = ActionSelection_ChooseNextAction(FB_DATA_NAME, actions);
         
         let syncData = decodeFacebookSyncData(resp.SyncData);
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
            
            let handled = await InitiateFacebookAction(sender, resp.AccountID, syncData, localData, sendResponse, baseUrl, action);
            
            // localData could be changed by the above call
            Storage.SetLocalVar('BG_FB', localData);
            
            if (handled)
               return;
            
            // syncData could be changed by the above call so fall through to save it below
            saveSync = true;
         }
         else if (initiateContactFetch(sender, FB_DATA_NAME, resp.commands, resp.AccountID,
            constantPaths.Facebook.contactFetchUrls, sendResponse))
         {
            return;
         }
         
         if (!saveSync)
         {
            releaseSyncControl(sender.tab.id, FB_DATA_NAME);
            sendResponse({action: null});
            return;
         }
         
         syncData = encodeFacebookSyncData(syncData);
         
         setServerState(FB_DATA_NAME, request.accountID, null, syncData, null)
            .then(resp =>
            {
               releaseSyncControl(sender.tab.id, FB_DATA_NAME);
               sendResponse({action: null});
            })
            .catch(e =>
            {
               Log_WriteException(e, request.type);
               releaseSyncControl(sender.tab.id, FB_DATA_NAME);
               sendResponse({action: null});
            });
      })
      .catch(e =>
      {
         Log_WriteException(e, request.type);
         releaseSyncControl(sender.tab.id, FB_DATA_NAME);
         sendResponse({action: null});
      });
}
