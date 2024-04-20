function SyncsInit()
{
   // DRL FIXIT? The arrays inside this structure (i.e. PollingSyncs and ScraperSyncs, etc.) were for
   // supporting multiple syncs per third party provider but so far it looks like this feature isn't
   // needed (only one polling and one scraper sync needed) so we could remove this additional complexity.
   return {
      'Syncs': {
         'Facebook': {
            scraperTabs: [null],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'Instagram': {
            scraperTabs: [null],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'Pinterest': {
            scraperTabs: [null],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'TikTok': {
            scraperTabs: [null],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'Twitter': {
            scraperTabs: [null],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'Google': {
            scraperTabs: [],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'Microsoft': {
            scraperTabs: [],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
         'Apple': {
            scraperTabs: [],
            lastLinkOfferRefused: 0,
            lastCheck: 0,
//                pauseUntil: 0,
            syncState: null,
            existingDataNames: []
         },
      },
      lastAlarm: null,
      longRunningOperationName: null,
      isAutomationPaused: false,
      
      // only one sync has control at a time
      nextDataName: null,        // this is who's turn it is next
      activeDataName: null,      // this is set once the sync has accepted their turn, and cleared when they finish
      lastSyncEnded: 0,          // when did the last sync end
      curSyncStarted: null,      // when did the current sync start
      mappedAccountID: null,     // what's the AccountID for the current sync, only used for an assistant login
   };
}

const Syncs = {
   'Facebook': {
      PollingSyncs: ['Facebook'],
      ScraperSyncs: ['FacebookScrape'],
      InitialScraperUrls: ['https://www.facebook.com'],
      RequiresFeature: UserFeaturesFacebookSync,
   },
   'Instagram': {
      PollingSyncs: [],
      ScraperSyncs: ['InstagramScrape'],
      InitialScraperUrls: ['https://www.instagram.com'],
      RequiresFeature: UserFeaturesInstagramSync,
   },
   'Pinterest': {
      PollingSyncs: [],
      ScraperSyncs: ['PinterestScrape'],
      InitialScraperUrls: ['https://www.pinterest.com'],
      RequiresFeature: UserFeaturesPinterestSync,
   },
   'TikTok': {
      PollingSyncs: [],
      ScraperSyncs: ['TikTokScrape'],
      InitialScraperUrls: ['https://tiktok.com'],
      RequiresFeature: UserFeaturesTikTokSync,
   },
   'Twitter': {
      PollingSyncs: [],
      ScraperSyncs: ['TwitterScrape'],
      InitialScraperUrls: ['https://twitter.com'],
      RequiresFeature: UserFeaturesTwitterSync,
   },
   'Google': {
      PollingSyncs: ['Google'],
      ScraperSyncs: [],
      InitialScraperUrls: [],
      RequiresFeature: UserFeaturesGoogleSync,
   },
   'Microsoft': {
      PollingSyncs: ['Microsoft'],
      ScraperSyncs: [],
      InitialScraperUrls: [],
      RequiresFeature: UserFeaturesMicrosoftSync,
   },
   'Apple': {
      PollingSyncs: ['Apple'],
      ScraperSyncs: [],
      InitialScraperUrls: [],
      RequiresFeature: UserFeaturesAppleSync,
   },
};

// when the extension is launched (app or browser is opened, or the extension has just been installed or updated)
Environment.AddStartupListener(function()
{
   Log_WriteInfo('Syncs app startup');
   
   Storage.AddSharedValuesLoadedListener(function()
   {
      let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
      
      // DRL FIXIT? These should be in session storage instead so we don't have to manually reset them.
      sharedData.lastAlarm = null;
      sharedData.longRunningOperationName = null;
      sharedData.nextDataName = null;
      sharedData.activeDataName = null;
      sharedData.lastSyncEnded = 0;
      sharedData.curSyncStarted = null;
      sharedData.mappedAccountID = null;
      
      Storage.SetSharedVar('Syncs', sharedData);
   });
});

Timers.AddRepeatingTimer(60, function()
{
   if (ActionSelection_IsSystemIdleTime())
      return;
   Log_WriteInfo('Syncs alarm');
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   let now = Date.now();
   let lastAlarm = sharedData.lastAlarm;
   sharedData.lastAlarm = now;    // set here in case we get a crash below
   
   Storage.SetSharedVar('Syncs', sharedData);
   
   let wokeFromSleep = lastAlarm != null && (now - lastAlarm > SecondsPerMinute * 5 * 1000);  // alarm is 1 minute so check for 5 minutes to be sure
   if (wokeFromSleep)
   {
      _wokeFromSleep();
      sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   }
   
   if (sharedData.longRunningOperationName != null)
   {
      // a long running operation is a background script state so it should never get stuck
      // but we won't be receiving pings from the content script while it's waiting on the
      // background script so we skip any checks
      Log_WriteInfo('Skipping sync checks due to long running ' + sharedData.longRunningOperationName + ' operation');
   }
   else if (sharedData.activeDataName)
   {
      // if we have an active sync we don't want to muck with the tabs so we skip that but
      // we do want to check that the content script isn't stuck
      if (!_prepareAndCheckSync(sharedData.activeDataName))
      {
         Log_WriteError('The active sync ' + sharedData.activeDataName + ' appears to be in a bad state, removing as active');
         
         sharedData.activeDataName = null;
         
         Storage.SetSharedVar('Syncs', sharedData);
      }
   }
   else
   {
      _calculateNextSyncTurn();
      
      _createReadySyncTabs(); // this is async
   }
});


function getSyncUri()
{
   return Form_RootUri + '/v2/Syncs/';
}


function isAutomationPaused()
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   return sharedData.isAutomationPaused;
}

function setAutomationPaused(value)
{
   ajax.post(Form_RootUri + '/v2/Users/me', {'IsAutomationPaused': value ? '1' : '0'}, function(resp, httpCode)
   {
      if (httpCode == 200)
      {
         let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
         
         sharedData.isAutomationPaused = value;
         
         Storage.SetSharedVar('Syncs', sharedData);
      }
   });
}

function startingLongRunningOperation(dataName)
{
   Log_WriteInfo('Starting long running operation ' + dataName);
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   assert(sharedData.longRunningOperationName == null);
   sharedData.longRunningOperationName = dataName;
   
   Storage.SetSharedVar('Syncs', sharedData);
}

function finishedLongRunningOperation(dataName)
{
   Log_WriteInfo('Finished long running operation ' + dataName);
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   assert(sharedData.longRunningOperationName == dataName);
   sharedData.longRunningOperationName = null;

   Storage.SetSharedVar('Syncs', sharedData);
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (Syncs[sourceName].ScraperSyncs[i] == dataName)
         {
            if (sharedData.Syncs[sourceName].scraperTabs[i])
            {
               updateTabActivity(sharedData.Syncs[sourceName].scraperTabs[i].tabID);
            }
         }
      }
   }
}

function hasLongRunningOperation()
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   return sharedData.longRunningOperationName != null;
}

function updateTabActivity(tabID)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i] && sharedData.Syncs[sourceName].scraperTabs[i].tabID == tabID)
         {
            sharedData.Syncs[sourceName].scraperTabs[i].lastActivity = Date.now();
            // if we're being throttled we use the stage for throttling and not activity
            if (!sharedData.Syncs[sourceName].scraperTabs[i].throttledSince)
               sharedData.Syncs[sourceName].scraperTabs[i].lastActivityStage = 0;
            Storage.SetSharedVar('Syncs', sharedData);
            return;
         }
      }
   }
   
   // if we don't find it then it's likely a user tab (not a scraper tab)
}

// throttled is bool, type is a string identifying the type of throttling (messages, posts, etc.)
function setTabThrottled(tabID, throttled, category)
{
   if (isTemporaryTab(tabID))
      return;
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i] && sharedData.Syncs[sourceName].scraperTabs[i].tabID == tabID)
         {
            let tabName = Syncs[sourceName].ScraperSyncs[i] + ' (' + tabID + ')';
            
            // we ignore some categories that are for utility purposes and therefore aren't the real
            // throttling reason and also wouldn't have a call here to turn the throttling off for them
            if (throttled && !Utilities_ArrayContains(['wait'], category))
            {
               let added = Utilities_AddToArray(sharedData.Syncs[sourceName].scraperTabs[i].throttledCategories, category);
               if (sharedData.Syncs[sourceName].scraperTabs[i].throttledSince == null)
               {
                  sharedData.Syncs[sourceName].scraperTabs[i].throttledSince = Date.now();
                  Log_WriteWarning('Tab ' + tabName + ' is now being throttled for ' + category);
               }
               else if (added)
                  Log_WriteWarning('Tab ' + tabName + ' is also being throttled for ' + category);
               else
                  Log_WriteWarning('Tab ' + tabName + ' is still being throttled for ' + category);
            }
            else
            {
               if (Utilities_RemoveFromArray(sharedData.Syncs[sourceName].scraperTabs[i].throttledCategories, category))
               {
                  if (sharedData.Syncs[sourceName].scraperTabs[i].throttledCategories.length == 0)
                  {
                     sharedData.Syncs[sourceName].scraperTabs[i].throttledSince = null;
                     Log_WriteWarning('Tab ' + tabName + ' is no longer being throttled');
                  }
                  else
                     Log_WriteWarning('Tab ' + tabName + ' is no longer being throttled for ' + category);
               }
            }
            
            Storage.SetSharedVar('Syncs', sharedData);
            return;
         }
      }
   }
   
   Log_WriteError('Tab ' + tabID + ' not found for updating throttled!');
}

function isScraperTab(tabID)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i] && sharedData.Syncs[sourceName].scraperTabs[i].tabID == tabID)
         {
            return true;
         }
      }
   }
   
   return false;
}

function isScraperTabName(name)
{
   return name != null && name.indexOf('Scrape') == name.length - 6;
}

function syncTabRemoved(tabID)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i] && sharedData.Syncs[sourceName].scraperTabs[i].tabID == tabID)
         {
            let dataName = Syncs[sourceName].ScraperSyncs[i];
            
            Log_WriteInfo('Scraper tab has been removed for: ' + dataName);
            
            if (sharedData.nextDataName == dataName)
            {
               // this handles the case where the scraper tab is closed, and we clear it so we'll calculate who
               // the next tab should be instead, otherwise we'll get stuck
               Log_WriteInfo('Next sync turn being cleared, was: ' + sharedData.nextDataName);
               sharedData.nextDataName = null;
            }
            
            if (sharedData.activeDataName == dataName)
            {
               // this handles the case where it's the active scraper tab that is being closed
               releaseSyncControl(tabID, dataName);
            }
            
            sharedData.Syncs[sourceName].scraperTabs[i] = null;
            
            Storage.SetSharedVar('Syncs', sharedData);
            return;
         }
      }
   }
   
   // if we don't find it then it's likely a user tab (not a scraper tab)
}

function updateSyncTabID(oldTabID, newTabID)
{
   assert(oldTabID != null);
   assert(newTabID != null);
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i] && sharedData.Syncs[sourceName].scraperTabs[i].tabID == oldTabID)
         {
            Log_WriteInfo('Syncs replacing tab ID ' + oldTabID + ' with ' + newTabID);
            sharedData.Syncs[sourceName].scraperTabs[i].tabID = newTabID;
            
            Storage.SetSharedVar('Syncs', sharedData);
            return;
         }
      }
   }
   
   // if we don't find it then it's likely a user tab (not a scraper tab)
}

function _wokeFromSleep()
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   Log_WriteInfo('***** System wake from sleep or network has resumed');
   
   OutstandingProcessing_WakeFromSleep();
   SyncStatistics_WakeFromSleep();
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i] == null)
            continue;
         
         let dataName = Syncs[sourceName].ScraperSyncs[i];
         
         if (sharedData.Syncs[sourceName].scraperTabs[i].tabID == null)
         {
            Log_WriteError("Got unexpected null tabID for " + dataName + ": " + GetVariableAsString(Syncs[sourceName].scraperTabs[i]));
            sharedData.Syncs[sourceName].scraperTabs[i] = null;
            Storage.SetSharedVar('Syncs', sharedData);
            continue;
         }
         
         ActionCheck_WakeFromSleep(dataName);
         
         let tabID = sharedData.Syncs[sourceName].scraperTabs[i].tabID;
         let tabName = dataName + ' (' + tabID + ')';
         let initialUrl = Syncs[sourceName].InitialScraperUrls[i];
         
         Log_WriteInfo('Resetting tab ' + tabName + ' time and setting to initial URL due to system wake from sleep or network resumed');
         updateTabActivity(tabID);
         Tabs.SetTabUrl(tabID, initialUrl);
      }
   }
}

function _calculateNextSyncTurn()
{
   if (!navigator.onLine)
   {
      Log_WriteInfo('The browser appears to be offline, skipping sync checks.');
      return;
   }
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   if (sharedData.nextDataName != sharedData.activeDataName && sharedData.activeDataName != null)
      return; // we already know who is next
   
   // calculate who's turn it is next on first init and when the current sync has started, completed, or didn't take their turn
   
   // find available scrapers
   let availableScrapers = {};
   for (let sourceName in Syncs)
   {
      // only give a turn to syncs that are not being skipped
      if (sharedData.Syncs[sourceName].syncState == 'sync_ready')
      {
         for (let i in Syncs[sourceName].ScraperSyncs)
         {
            // we only want scrapers with a tab
            if (sharedData.Syncs[sourceName].scraperTabs[i])
            {
               // the tab may have been removed
               if (hasExistingTab(sharedData.Syncs[sourceName].scraperTabs[i].tabID))
                  availableScrapers[Syncs[sourceName].ScraperSyncs[i]] = sharedData.Syncs[sourceName].scraperTabs[i].lastRunTime;
               else
               {
                  // this should have been handled by syncTabRemoved()
                  Log_WriteError('Scraper tab has gone away for: ' + Syncs[sourceName].ScraperSyncs[i]);
                  sharedData.Syncs[sourceName].scraperTabs[i] = null;
               }
            }
         }
      }
   }
   
   // if we have multiple choices choose the one that has been the longest since running
   while (Object.keys(availableScrapers).length > 1)
   {
      if (Object.values(availableScrapers)[0] <= Object.values(availableScrapers)[1])
         delete availableScrapers[Object.keys(availableScrapers)[1]];
      else
         delete availableScrapers[Object.keys(availableScrapers)[0]];
   }
   
   if (Object.keys(availableScrapers).length == 1)
   {
      sharedData.nextDataName = Object.keys(availableScrapers)[0];
      Log_WriteInfo('Next sync turn: ' + sharedData.nextDataName);
//        Log_SetMetaLogging('Syncs', Json_ToString(sharedData.Syncs, null, 3))
      
      // if there's no active sync, give the new one the focus to help speed things along
      if (sharedData.activeDataName == null && !_prepareAndCheckSync(sharedData.nextDataName))
      {
         Log_WriteError('The next sync ' + sharedData.nextDataName + ' appears to be in a bad state, removing as next active');
         sharedData.nextDataName = null;
      }
   }
   
   Storage.SetSharedVar('Syncs', sharedData);
}

function _prepareAndCheckSync(checkDataName)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   let now = Date.now();
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (Syncs[sourceName].ScraperSyncs[i] == checkDataName)
         {
            if (sharedData.Syncs[sourceName].scraperTabs[i] == null)
            {
               Log_WriteError('While preparing/checking ' + checkDataName + ' found that it has no tab!');
               return false;
            }
            
            Tabs.SetActiveTab(sharedData.Syncs[sourceName].scraperTabs[i].tabID, function(tabID)
            {
               sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
               let scraperTab = sharedData.Syncs[sourceName].scraperTabs[i];
               if (tabID == null)
               {
                  if (scraperTab != null)
                     Log_WriteError('Scraper tab ' + scraperTab.tabID + ' has gone away for: ' + Syncs[sourceName].ScraperSyncs[i]);
                  else
                     Log_WriteError('A scraper tab has gone away for: ' + Syncs[sourceName].ScraperSyncs[i]);
                  sharedData.Syncs[sourceName].scraperTabs[i] = null;
                  Storage.SetSharedVar('Syncs', sharedData);
                  return;
               }
               assert(tabID == scraperTab.tabID);
               let tabName = Syncs[sourceName].ScraperSyncs[i] + ' (' + tabID + ')';
               
               let initialUrl = Syncs[sourceName].InitialScraperUrls[i];
               let refreshDelay = scraperTab.throttledSince
                  ? timings.THROTTLED_REFRESH_DELAY
                  : timings.SCRAPER_INACTIVITY_REFRESH_DELAY;
               let idleTime = scraperTab.throttledSince
                  ? now - scraperTab.throttledSince
                  : (scraperTab.lastActivity
                     ? now - scraperTab.lastActivity
                     : 0);
               let stage = Utilities_Div(idleTime, refreshDelay * 1000);
               let lastStage = scraperTab.lastActivityStage;
               
               if (stage > lastStage)
               {
                  stage = lastStage + 1;    // don't skip stages
                  scraperTab.lastActivityStage = stage;
                  Storage.SetSharedVar('Syncs', sharedData);
                  
                  Log_WriteInfo('Tab ' + tabName + ' has been ' + (scraperTab.throttledSince ? 'throttled' : 'idle') +
                     ' for ' + Utilities_Div(idleTime, 1000) + ' seconds');
                  Tabs.GetTab(tabID, function(tab)
                  {
                     if (tab == null)
                     {
                        Log_WriteError('_prepareAndCheckSync getting tab ' + tabName + ' returned null!');
                        return;
                     }
                     
                     let dueTo = scraperTab.throttledSince ? 'throttling' : 'inactivity';
/*
                     if (stage == 1) {
                        Log_WriteWarning('Stage ' + stage + ': Reloading tab ' + tabName + ' at url "' + tab.url + '" due to ' + dueTo);
                        Tabs.ReloadTab(tabID);
                     }
                     else*/
                     if (stage == 1)
                     {
                        if (tab.url == undefined || !fuzzyUrlsMatch(tab.url, initialUrl))
                        {
                           Log_WriteWarning('Stage ' + stage + ': Updating tab ' + tabName + ' url from "' + tab.url + '" to "' +
                              initialUrl + '" due to ' + dueTo);
                           Tabs.SetTabUrl(tabID, initialUrl);
                        }
                     }
/* Focusing didn't seem to provide much help in some cases and it really bothers the user so we only do it in specific cases now.
                     else if (stage == 2) {
                        Log_WriteWarning('Stage ' + stage + ': Focusing tab ' + tabName + ' and updating url from "' + tab.url + '" to "' +
                           initialUrl + '" due to ' + dueTo);
                        // push it to the foreground for 3 seconds
                        showSyncWindowAndTab(tabID, 3, constants.MINIMUM_TAB_WIDTH);
                        Tabs.SetTabUrl(tabID, initialUrl);
                     }
*/
                     else if (stage >= 2)
                     {
                        Log_WriteWarning('Stage ' + stage + ': Removing tab ' + tabName + ' due to ' + dueTo);
   
                        ActionCheck_Aborting(checkDataName);

                        Tabs.RemoveTab(tabID);
                     }
                  });
               }
            });
            
            return true;
         }
      }
   }
   
   return false;
}

function getInitialScraperUrl(dataName)
{
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (Syncs[sourceName].ScraperSyncs[i] == dataName)
         {
            return Syncs[sourceName].InitialScraperUrls[i];
         }
      }
   }
   
   assert(0);
   return null;
}

function getSyncControl(tabID, dataName)
{
   assert(tabID != null);
   
   let now = Date.now();
   let isTempTab = isTemporaryTab(tabID);
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   if (sharedData.activeDataName == dataName ||
      // if this is a temporary tab and there's no active sync we let the temporary tab run so it can shut down
      (sharedData.activeDataName == null && isTempTab))
   {
      Log_WriteInfo('Sync ' + dataName + ' already controlled by ' + getTabNameNoCheck(tabID));
      
      if (!isTemporaryTab(tabID))
      {        // don't steal focus from the temporary window
         // in case user changed the tab or minimized the window
         showSyncWindowAndTab(tabID, false, constants.MINIMUM_TAB_WIDTH);
      }
      
      return true;
   }
   
   if (isTempTab)
   {
      Log_WriteError('Tab ' + tabID + ' is the temporary window for ' + dataName + ' but the active sync is ' + activeDataName + '!');
      return false;
   }
   
   // update the tab ID
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         let scraperTab = sharedData.Syncs[sourceName].scraperTabs[i];
         
         if (Syncs[sourceName].ScraperSyncs[i] == dataName)
         {
            if (scraperTab == null)
            {
               sharedData.Syncs[sourceName].scraperTabs[i] = {
                  tabID: tabID,
                  lastRunTime: 0,
                  lastActivity: now,
                  lastActivityStage: 0,
                  throttledCategories: [],
                  throttledSince: null
               };
               Storage.SetSharedVar('Syncs', sharedData);
            }
            else if (scraperTab.tabID != tabID)
            {
               if (hasExistingTab(scraperTab.tabID))
               {
                  Log_WriteError('Scraper tab ' + scraperTab.tabID + ' still around and tab ' + tabID + ' is also for ' + dataName + ' so closing ' + tabID + '!');
                  Tabs.RemoveTab(tabID);
                  return false;
               }
               else
               {
                  Log_WriteError('Scraper tab ' + scraperTab.tabID + ' is being replaced by tab ' + tabID + ' for ' + dataName + ' so assuming ' + tabID + '??');
                  sharedData.Syncs[sourceName].scraperTabs[i].tabID = tabID;
                  Storage.SetSharedVar('Syncs', sharedData);
               }
            }
         }
      }
   }
   
   if (!navigator.onLine || sharedData.activeDataName != null || (sharedData.nextDataName != null && sharedData.nextDataName != dataName) ||
      !_hasAccessToSync(dataName) || now - sharedData.lastSyncEnded < timings.INTER_SYNC_RUN_DELAY * 1000)
      return false;
   
   // check the run time
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (Syncs[sourceName].ScraperSyncs[i] == dataName)
         {
            if (now - sharedData.Syncs[sourceName].scraperTabs[i].lastRunTime < timings.SYNC_RUN_FREQUENCY * 1000 /*||
                    sharedData.Syncs[sourceName].pauseUntil > now*/)
               return false;   // it hasn't been long enough since the last check, or the sync is paused
            
            // update the last run time
            sharedData.Syncs[sourceName].scraperTabs[i].lastRunTime = now;
         }
      }
   }
   
   Log_WriteInfo('***** Giving ' + dataName + ' sync control to ' + getTabNameNoCheck(tabID));
   sharedData.activeDataName = dataName;
   sharedData.curSyncStarted = now;
   
   Storage.SetSharedVar('Syncs', sharedData);

//    Log_SetMetaLogging('Syncs', Json_ToString(sharedData.Syncs, null, 3))
   
   showSyncWindowAndTab(tabID, false, constants.MINIMUM_TAB_WIDTH);
   
   return true;
}

function releaseSyncControl(tabID, dataName)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   if (sharedData.activeDataName != dataName)
   {
      return;
   }
   
   Log_WriteInfo('***** Releasing ' + dataName + ' sync control from ' + getTabNameNoCheck(tabID));
   sharedData.activeDataName = null;
   sharedData.curSyncStarted = null;
   sharedData.mappedAccountID = null;
   sharedData.lastSyncEnded = Date.now();
   
   Storage.SetSharedVar('Syncs', sharedData);
   
   _calculateNextSyncTurn();    // who's next after me?
}

// returns seconds
function getSyncControlDuration(dataName)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   if (sharedData.activeDataName != dataName)
   {
      assert(0);
   }
   if (sharedData.curSyncStarted == null)
   {
      assert(0);
   }
   
   return (Date.now() - sharedData.curSyncStarted) / 1000;
}

/*
function pauseSyncFor(tabID, dataName, delay) {
    let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());

    if (sharedData.activeDataName == dataName) {
        ActionCheck_Aborting(dataName);
        releaseSyncControl(tabID, dataName);
    }

    for (let sourceName in Syncs) {
        for (let i in Syncs[sourceName].ScraperSyncs) {
            if (Syncs[sourceName].ScraperSyncs[i] == dataName) {
                sharedData.Syncs[sourceName].pauseUntil = Date.now() + (delay * 1000);
                Storage.SetSharedVar('Syncs', sharedData);
                Log_WriteInfo('***** Pausing ' + sourceName + ' for ' + delay + ' seconds');
                return;
            }
        }
    }

    assert(0);
}
*/

const FirstMatchingAccountID = 'FIRST_MATCHING_ACCOUNT'; // special value used by assistant login

// this is used in the local developer setup with no server, we store some data here to simulate the server
var SimulatedServer = {};

// returns null on error or {} if the sync does not exist, accountName can be left out if we know the
// account exists on the server
async function _getSync(dataName, accountID, accountName)
{
   assert(accountID != null);
   
   return new Promise((resolve, reject) =>
   {
      let params = {
         'DataName': dataName,
         // in the case of an assistant the social account being used won't match the one from the sync
         // but that's fine because we're only using it to perform import of non-account specific data
         'AccountID': accountID,
         'AccessToken': 'unused',
         'SkipMessages': ActionSelection_GetSkippedMessageTypes(dataName),
         'SkipSyncCommands': ActionSelection_GetSkippedSyncCommandTypes(dataName)
      };
      // in case the server is going to create an account we want to provide this, but it's not provided
      // in those cases where we know the account already exists
      if (accountName)
         params['AccountName'] = accountName;
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/' + dataName + '_' + accountID + '.json')
         : getSyncUri();
      
      ajax.get(url, params, function(resp, httpCode)
      {
         if (httpCode == 404)
         {
            resolve({});    // no result
            return;
         }
         
         if (httpCode != 200 || resp == null)
         {  // don't know why when I hit a breakpoint on the server I got back 200 and null?
            if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 403 || httpCode == 404 || httpCode == 480)
               Log_WriteWarning('Response ' + httpCode + ' from server for sync ' + dataName + ' account ' + accountID + ' _getSync: ' + (resp ? resp : 'null'));
            else
               Log_WriteError('Response ' + httpCode + ' from server for sync ' + dataName + ' account ' + accountID + ' _getSync: ' + resp);
            resolve(null);  // error
            return;
         }
         
         let temp = Json_FromString(Json_ConvertJavaScriptToJson(resp)); // Json_ConvertJavaScriptToJson() allows comments in our Data/*.json files
         if (temp == null)
         {
            Log_WriteError('Error converting ' + dataName + ' sync state from server: ' + resp);
            return;
         }
         resp = temp.data;
         
         if (resp.UserID != sessionUserID())
         {
            Session_OnUserChanged();
            resolve(null);
            return;
         }
         
         // added these so the content code doesn't need to check if they exist
         if (!resp.hasOwnProperty('messages'))
         {
            resp.messages = [];
         }
         if (!resp.hasOwnProperty('commands'))
         {
            resp.commands = [];
         }
         if (!resp.hasOwnProperty('watched_posts'))
         {
            resp.watched_posts = [];
         }
         if (!resp.hasOwnProperty('watched_custom_lists'))
         {
            resp.watched_custom_lists = [];
         }
         
         if (getBrandID() == BrandID_LocalFile)
         {
            let syncKey = dataName + accountID;
            if (!SimulatedServer.hasOwnProperty(syncKey))
            {
               SimulatedServer[syncKey] = {
                  SentMessageIDs: [],
                  HandledCommandIDs: [],
                  LastSynced: null,
                  SyncData: null
               };
            }
            let sync = SimulatedServer[syncKey];
            
            // in the local case we filter out items that have been handled and would have been removed by the live server
            resp.messages = resp.messages.filter(x => !sync.SentMessageIDs.includes(x.Uid));
            resp.commands = resp.commands.filter(x => !sync.HandledCommandIDs.includes(x.SyncCommandID));
            
            // in the local case we use saved items that would have come back to us from a live server
            resp.LastSynced = sync.LastSynced;
            resp.SyncData = sync.SyncData;
         }
         
         resolve(resp);
      }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// NOTE: accountID only used in local dev case!
async function _getSyncsOfType(dataName, accountID)
{
   return new Promise((resolve, reject) =>
   {
      let params = {
         'DataName': dataName
      };
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/' + dataName + '_' + accountID + '.json')
         : getSyncUri();
      
      ajax.get(url, params, function(resp, httpCode)
      {
         if (httpCode != 200)
         {
            if (httpCode != 0 &&    // server not available - usually this is due to recent wake from sleep
               httpCode != 401)    // logged out
               Log_WriteError('Response ' + httpCode + ' from server for sync ' + dataName + ' account ' + accountID + ' _getSyncsOfType: ' + resp);
            resolve(null);  // error
            return;
         }
         
         resp = Json_FromString(Json_ConvertJavaScriptToJson(resp)); // Json_ConvertJavaScriptToJson() allows comments in our Data/*.json files
         resp = resp.data;
         
         resolve(resp);
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function _createSync(dataName, accountID, accountName)
{
   assert(accountID != null);
   
   return new Promise((resolve, reject) =>
   {
      let params = {
         DataName: dataName,
         AccountID: accountID,
         AccountName: accountName,
         AccessToken: 'unused'
      };
      ajax.post(getSyncUri(), params, function(resp, httpCode)
      {
         resp = Json_FromString(resp);
         resp = resp.data;
         
         resolve(resp);
      });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function getServerState(dataName, accountID, accountName)
{
   const isAssistant = isSocialAttacheLoggedInAsAssistant();
   if (isAssistant)
   {
      // in the assistant case we use the first account matching by dataName and we never create
      // a new account so we don't need an accountName (it would never match anyway)
      accountID = FirstMatchingAccountID;
      accountName = null;
   }
   
   // let's see if we have a matching sync
   let sync = await _getSync(dataName, accountID, accountName);
   // the above returns null on error, empty object if there's no match
   
   if (sync === null)
      return null;
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   if (sync.hasOwnProperty('SyncID'))
   {
      sharedData.isAutomationPaused = sync.IsAutomationPaused;
      
      if (isAssistant)    // save the mapping for when we send data back to the server
         sharedData.mappedAccountID = sync.AccountID;
      else
         sharedData.mappedAccountID = null;
      
      Storage.SetSharedVar('Syncs', sharedData);
   }
   else
   {
      Log_WriteWarning(dataName + ' sync not found with account ID ' + accountID + ' (' + accountName + ')');
      sync = null;    // what we'll return if the below fails
      
/* I removed this so that if Carla is logged into her own FB account and also Cathy's SA account we don't
   automatically create a link to Carla's FB account in Cathy's SA account (we'll ask first).
        // if we don't have a matching sync let's see if we have any syncs of this type
        let syncs = await _getSyncsOfType(dataName, accountID);
        // Returns an object with the SyncIDs as properties and the values are objects with more properties.

        // if we have at least one sync of this type then we're OK to create others of the same type without
        // asking the user - this is important for example with Instagram where you can have multiple accounts
        // linked together
        if (syncs && Object.keys(syncs).length > 0) {
            sync = await _createSync(dataName, accountID, accountName);
        }
        else
 */
      {
         // the last sync for this data name was removed on the server, or the user switched social accounts
         
         for (let sourceName in Syncs)
         {
            for (let i in Syncs[sourceName].ScraperSyncs)
            {
               if (Syncs[sourceName].ScraperSyncs[i] == dataName)
               {
                  Log_WriteInfo('Removing sync ' + dataName + ' account ' + accountID + ' due to sync removal on server, or user changing social accounts.');
   
                  sharedData.Syncs[sourceName].lastCheck = 0;
                  sharedData.Syncs[sourceName].syncState = null;
                  Utilities_RemoveFromArray(sharedData.Syncs[sourceName].existingDataNames, dataName);
                  Storage.SetSharedVar('Syncs', sharedData);
   
                  ActionCheck_Aborting(dataName);
                  
                  if (sharedData.Syncs[sourceName].scraperTabs[i] != null)
                  {
                     Log_WriteInfo('Removing tab for sync ' + dataName + ' account ' + accountID + ' due to sync removal on server, or user changing social accounts.');
                     Tabs.RemoveTab(sharedData.Syncs[sourceName].scraperTabs[i].tabID);
                  }
               }
            }
         }
      }
   }
   
   return sync;
}

// syncData should be a JSON encoded string at this point, whereas the following parameters are objects
// DRL FIXIT? Maybe we should change the above so we're doing the encoding inside this method?
async function setServerState(dataName, accountID, currentCheck, syncData, messages, contacts, command,
   groupMembers, groupInfo, groupChatParticipants, customListUpdate)
{
   assert(syncData == null || typeof syncData === 'string' || syncData instanceof String);
   return new Promise((resolve, reject) =>
   {
      if (getBrandID() == BrandID_LocalFile)
      {
         let syncKey = dataName + (accountID ? accountID : 'any');
         if (!SimulatedServer.hasOwnProperty(syncKey))
         {
            SimulatedServer[syncKey] = {
               SentMessageIDs: [],
               HandledCommandIDs: [],
               LastSynced: null,
               SyncData: null
            };
         }
         let sync = SimulatedServer[syncKey];
         
         // in the local case we save some items that would come back to us from a live server
         if (messages != null)
         {
            for (let message of messages)
            {
               if (message.hasOwnProperty('MessageID'))    // won't be there for incoming message being sent to server
                  sync.SentMessageIDs.push(message.MessageID);
            }
         }
         if (command != null)
            sync.HandledCommandIDs.push(command.SyncCommandID);
         if (currentCheck != null)
            sync.LastSynced = timestampToString(currentCheck);
         if (syncData != null)
            sync.SyncData = syncData;
         
         SimulatedServer[syncKey] = sync;
         
         resolve(null);
         return;
      }
      
      if (!navigator.onLine)
      {
         Log_WriteInfo('The browser appears to be offline, skipping sending server state.');
         resolve(null);
         return;
      }
      
      // I believe downloading posts is the only time we don't need an account ID
      assert(accountID != null || messages != null);
      
      const isAssistant = isSocialAttacheLoggedInAsAssistant();
      let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
      assert(isAssistant == (sharedData.mappedAccountID != null));
      let mappedAccountID = (accountID && sharedData.mappedAccountID) ? sharedData.mappedAccountID : accountID;
      
      let syncDevice = getSyncDevice();
      let url = getSyncUri();
      let params = {
         'SyncDeviceID': syncDevice.SyncDeviceID,
         'SyncDeviceIsActive': syncDevice.IsActive,
//            'SyncDeviceIsExclusive': syncDevice.IsExclusive,
         'DataName': dataName,
      };
      if (mappedAccountID != null)
         params.AccountID = mappedAccountID;
      if (currentCheck != null)
         params.LastSynced = timestampToString(currentCheck);
      if (syncData != null)
         params.SyncData = syncData;
      if (messages != null)
      {
         let date = SyncStatistics_GetNowDateOnly();
         let count = 0;
         for (let message of messages)
         {
            // count any sent messages (not posts, or comments, etc.) that occurred today
            if (message.hasOwnProperty('Folder') && message['Folder'] == 'sent' &&
               message['Type'].endsWith('_msg') &&
               message['Date'].startsWith(date))
               count++;
         }
         if (count > 0)
            SyncStatistics_ActionTaken(dataName, 'SendMessage', count);
         params.messages = Json_ToString(messages);
      }
      if (contacts != null)
         params.contacts = Json_ToString(contacts);
      if (command != null)
         params.commands = Json_ToString([command]);
      if (groupMembers != null)
         params.groupMembers = Json_ToString(groupMembers);
      if (groupInfo != null)
         params.groupInfo = Json_ToString(groupInfo);
      if (groupChatParticipants != null)
         params.groupChatParticipants = Json_ToString(groupChatParticipants);
      if (customListUpdate != null)
         params.customListUpdate = Json_ToString(customListUpdate);
      
      // do this last as the messages processing above may affect the statistics
      let syncStatistics = SyncStatistics_GetForUpdate(dataName);
      if (syncStatistics)
         params['SyncStatistics'] = Json_ToString(syncStatistics);
      
      ajax.post(url, params, function(resp, httpCode)
      {
         if (httpCode != 200)
         {
            if (getBrandID() == BrandID_LocalFile ||
               httpCode == null || httpCode == 0 ||    // server not available - usually this is due to recent wake from sleep
               httpCode == 401 ||   // logged out
               httpCode == 480)     // timeout
               Log_WriteWarning('Response ' + httpCode + ' from server for sync ' + dataName + ' account ' + mappedAccountID + ' setServerState: ' + resp);
            else
               Log_WriteError('Response ' + httpCode + ' from server for sync ' + dataName + ' account ' + mappedAccountID + ' setServerState: ' + resp);
            resolve(null);
            return;
         }
         
         resp = Json_FromString(resp);

         // if this is a group import (and not import of group questions) add it to update the UI quicker
         if (groupInfo && groupInfo.hasOwnProperty('IsAdmin'))
            reloadGroupInfos();
         
         resolve(resp);
      });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

var isCreatingTab = 0;  // we use a timestamp to avoid getting stuck
async function _createSyncTabs(sourceName, dataNames)
{
   Log_WriteInfo('_createSyncTabs ' + sourceName + ' (' + dataNames.join(',') + ')');
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   if (Utilities_ArrayContains(Syncs[sourceName].ScraperSyncs, sharedData.activeDataName))
   {
      Log_WriteInfo('Skipping creating sync tabs because one of them is the active tab (' + sharedData.activeDataName + ') and therefore busy.');
      return;
   }
   if (isCreatingTab > 0)
   {
      if (Date.now() - isCreatingTab < SecondsPerMinute * 5 * 1000)
      {
         Log_WriteWarning('Skipping creating sync tabs because we are in the process of creating one!');
         return;
      }
      Log_WriteError('We were stuck creating a sync tab!');
   }
   
   for (let i in Syncs[sourceName].ScraperSyncs)
   {
      let dataName = Syncs[sourceName].ScraperSyncs[i];
      let url = Syncs[sourceName].InitialScraperUrls[i] + '*';    // use substring matching
      
      if (Utilities_ArrayContains(dataNames, dataName))
      {
         // we want the tabs created in sequence in case the window needs to be created in which
         // case we don't want to accidentally end up with multiple windows created
         isCreatingTab = Date.now();
         createTab(dataName, 'GET', url, {}, true, false)
            .then(tabID =>
            {
               if (tabID != null)
               {
                  let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
                  let isReplacing = sharedData.Syncs[sourceName].scraperTabs[i] != null &&
                     sharedData.Syncs[sourceName].scraperTabs[i].tabID != tabID;
                  if (isReplacing)
                     Log_WriteWarning('Existing ' + dataName + ' tab doesn\'t match on tabID, replacing:' +
                        GetVariableAsString(sharedData.Syncs[sourceName].scraperTabs[i]));
   
                  Log_WriteInfo('Using tab ' + tabID + ' for ' + dataName);
                  if (tabID && (isReplacing || sharedData.Syncs[sourceName].scraperTabs[i] == null))
                  {
                     sharedData.Syncs[sourceName].scraperTabs[i] = {
                        tabID: tabID,
                        lastRunTime: 0,
                        lastActivity: Date.now(),
                        lastActivityStage: 0,
                        throttledCategories: [],
                        throttledSince: null
                     };
                     Storage.SetSharedVar('Syncs', sharedData);
                  }
               }
               else // the error will have been logged by the caller so we can use info logging here
                  Log_WriteInfo('There was an error creating the sync tab for ' + dataName + ', will try again later.');

               isCreatingTab = 0;
            })
            .catch(e =>
            {
               Log_WriteException(e);
               isCreatingTab = 0;
               throw e;
            });
      }
   }
}

async function _createReadySyncTabs()
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   for (let sourceName in Syncs)
   {
      if (sharedData.Syncs[sourceName].syncState == 'sync_ready' && userHasFeature(Syncs[sourceName].RequiresFeature))
      {
         // we want the tabs created in sequence in case the window needs to be created in which
         // case we don't want to accidentally end up with multiple windows created
         _createSyncTabs(sourceName, sharedData.Syncs[sourceName].existingDataNames)
            .then(response =>
            {
            })
            .catch(e =>
            {
               Log_WriteException(e);
               throw e;
            });
      }
   }
}

function _hasAccessToSyncSource(sourceName)
{
   return getBrandID() == BrandID_LocalFile || userHasFeature(Syncs[sourceName].RequiresFeature);
}

function _hasAccessToSync(dataName)
{
   if (getBrandID() == BrandID_LocalFile) return true;
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (Syncs[sourceName].ScraperSyncs[i] == dataName)
         {
            return userHasFeature(Syncs[sourceName].RequiresFeature);
         }
      }
   }
   
   assert(0);
   return false;
}

async function checkDataSource(sourceName)
{
   return new Promise((resolve, reject) =>
   {
      if (!isBrandingInitialized())
      {
         Log_WriteInfo('Branding not enabled for syncs');
         let result = {
            brandName: 'No Brand Selected',
            displayName: userDisplayName(),
            sourceName: sourceName,
            type: 'sync_skip'
         };
         resolve(result);
         return;
      }
      if (getBrandID() == BrandID_LocalFile)
      {
         let result = {
            brandName: getBrand().Name,
            displayName: userDisplayName(),
            sourceName: sourceName
         };
         // if there's a busy sync skip any checks
         let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
         if (sharedData.activeDataName)
         {
            if (sharedData.Syncs[sourceName].syncState != null)
               result.type = sharedData.Syncs[sourceName].syncState;
            else
               result.type = 'sync_skip';
            Storage.SetSharedVar('Syncs', sharedData);
            resolve(result);
            return;
         }
         
         // local development case, create them all
         _createSyncTabs(sourceName, Syncs[sourceName].ScraperSyncs)
            .then(response =>
            {
               sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
               result.type = sharedData.Syncs[sourceName].syncState = 'sync_ready';
               Storage.SetSharedVar('Syncs', sharedData);
               resolve(result);
            })
            .catch(e =>
            {
               Log_WriteException(e);
               sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
               result.type = 'sync_skip';
               sharedData.Syncs[sourceName].syncState = null;
               Storage.SetSharedVar('Syncs', sharedData);
               resolve(result);
            });
         return;
      }
      
      let now = Date.now();
      let result = {
         brandName: getBrand().Name,
         displayName: userDisplayName(),
         sourceName: sourceName
      };
      
      let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
      
      if (!_hasAccessToSyncSource(sourceName))
      {
         Log_WriteInfo('No access to sync ' + sourceName);
         result.type = sharedData.Syncs[sourceName].syncState = 'sync_skip';
         Storage.SetSharedVar('Syncs', sharedData);
         resolve(result);
         return;
      }
      
      // for a ready sync check less often in case anything got removed, otherwise check more
      // often, and when not checking just return the previous state
      let delay = sharedData.Syncs[sourceName].existingDataNames.length == Syncs[sourceName].ScraperSyncs.length &&
      sharedData.Syncs[sourceName].syncState == 'sync_ready'
         ? timings.READY_SYNC_CHECK_DELAY
         : timings.MISSING_SYNC_CHECK_DELAY;
      if (now - sharedData.Syncs[sourceName].lastCheck <= delay * 1000)
      {
         result.type = sharedData.Syncs[sourceName].syncState;
         if (result.type == null) result.type = 'sync_skip';
         Storage.SetSharedVar('Syncs', sharedData);
         resolve(result);
         return;
      }
      // don't recheck right away but if there's an error don't wait the full time to retry
      sharedData.Syncs[sourceName].lastCheck = now - (delay / 5 * 1000);
      Storage.SetSharedVar('Syncs', sharedData);
      
      // DRL FIXIT! This handling assumes one social media account per type, but a user is very likely
      // to have more than one Instagram account for example!
      // DRL NOTE: I believe the multiple account case is now handled automatically in that when a
      // sync is requested but we don't have one for that account but we do have one for another account
      // we create the sync for that account automatically on the server?
      
      let params = {
         DataNames: Syncs[sourceName].ScraperSyncs.concat(Syncs[sourceName].PollingSyncs).join(',')
      };
      
      ajax.get(getSyncUri(), params, function(resp, httpCode)
      {
         resp = Json_FromString(resp);
         
         sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
         
         sharedData.Syncs[sourceName].lastCheck = now;
         
         if (resp && (resp.result_code == 200 || resp.result_code == 404))
         {
            let dataNames = [];
            if (resp.result_code == 200)
            {
               for (let syncID in resp.data)
               {
                  // we add it here even if the AccountID is null as it'll get set after we create the tab for it
                  dataNames.push(resp.data[syncID].DataName);
               }
            }
            Utilities_ArrayRemoveDuplicates(dataNames);
            sharedData.Syncs[sourceName].existingDataNames = dataNames;
            Storage.SetSharedVar('Syncs', sharedData);
            
            // create the tabs for the syncs we have
            _createSyncTabs(sourceName, sharedData.Syncs[sourceName].existingDataNames)
               .then(response =>
               {
                  sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
                  
                  // the sync is ready if we have any scrapers ready
                  result.type = Utilities_ArraysMeet(Syncs[sourceName].ScraperSyncs, dataNames)
                     ? 'sync_ready'
                     : 'sync_skip';
                  if (result.type == 'sync_ready')
                     sharedData.Syncs[sourceName].syncState = 'sync_ready';
                  else
                     sharedData.Syncs[sourceName].syncState = null;
                  
                  // if we are missing some syncs for this source we can ask the user if he wants to add them
                  let temp = Syncs[sourceName].ScraperSyncs.concat(Syncs[sourceName].PollingSyncs);
                  Utilities_RemoveFromArray(temp, dataNames);
                  
                  // never create a sync when running as assistant, we only use the existing syncs from the host account
                  if (!isSocialAttacheLoggedInAsAssistant() && temp.length > 0 &&
                     // the user hasn't refused to link this sync in the past day
                     now - sharedData.Syncs[sourceName].lastLinkOfferRefused > timings.LINK_SYNC_REFUSED_REOFFER * 1000)
                  {
                     result.type = sharedData.Syncs[sourceName].syncState = 'offer_sync';
                  }
                  
                  Storage.SetSharedVar('Syncs', sharedData);
                  resolve(result);
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  resolve(null);
               });
         }
         else
         {
            if (resp == null || httpCode == 0)
            {
               // server unavailable, network error, etc.
               Log_WriteWarning('Server is not available when requesting syncs ' + params.DataNames);
            }
            else if (resp.result_code != 401)
               Log_WriteError('Syncs got ' + (resp ? resp.result_code : 'null') + ' result when requesting ' + params.DataNames);
            result.type = 'sync_skip';
            sharedData.Syncs[sourceName].syncState = null;
            Storage.SetSharedVar('Syncs', sharedData);
            resolve(result);
         }
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function linkDataSourceRefused(sourceName)
{
   Log_WriteError('Refused to link ' + sourceName);
   
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   sharedData.Syncs[sourceName].lastLinkOfferRefused = Date.now();
   
   // the sync is ready if we have any scrapers ready
   sharedData.Syncs[sourceName].syncState = Utilities_ArraysMeet(Syncs[sourceName].ScraperSyncs, sharedData.Syncs[sourceName].existingDataNames)
      ? 'sync_ready' : 'sync_skip';
   
   Storage.SetSharedVar('Syncs', sharedData);
}

function _linkScraperSyncsOnly(sourceName, dataNames, resolve)
{
   if (Utilities_ArraysMeet(dataNames, Syncs[sourceName].ScraperSyncs))
   {
      // exclude polling syncs as they are handled separately
      Utilities_RemoveFromArray(dataNames, Syncs[sourceName].PollingSyncs);
      // this creates the syncs "empty" so the next time the scraper tries to access each one it will
      // take it over and fill in the account ID and name
      let params = {
         DataNames: dataNames.join(',')
      };
      ajax.post(getSyncUri(), params, function(resp, httpCode)
      {
         resp = Json_FromString(resp);
         
         let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
         sharedData.Syncs[sourceName].lastCheck = null; // allow the sync to be loaded right away without a delay
         Storage.SetSharedVar('Syncs', sharedData);
         
         // load the sync(s) just created so the tab(s) will be created on the timer
         checkDataSource(sourceName)
            .then(resp => resolve(null))
            .catch(e =>
            {
               Log_WriteException(e);
               resolve(null);
            });
      });
   }
   else
      resolve(null);
}

async function linkDataSource(sourceName)
{
   return new Promise((resolve, reject) =>
   {
      let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
      
      sharedData.Syncs[sourceName].lastLinkOfferRefused = 0;
      sharedData.Syncs[sourceName].syncState = 'sync_ready';
      
      // if we are creating the sync let's wait an extra 5 min so we're not asking again
      // while the user is going through the process of adding the sync
      sharedData.Syncs[sourceName].lastCheck = Date.now() + (300 * 1000);
      
      Storage.SetSharedVar('Syncs', sharedData);
      
      let dataNames = Syncs[sourceName].ScraperSyncs.concat(Syncs[sourceName].PollingSyncs);
      Utilities_RemoveFromArray(dataNames, sharedData.Syncs[sourceName].existingDataNames);
      
      if (Utilities_ArraysMeet(dataNames, Syncs[sourceName].PollingSyncs))
      {
         // if a polling sync is one of the missing ones we will send the user to the login page for it
         createTab('SyncPage', 'GET', Form_MainUri, {
            'FormProcessor': 'SyncPreLogin',
            'DataName': sourceName,
            'ReferralUrl': syncsPageUrl()
         }, false, false)
            .then(resp =>
            {
               // also handle scraper syncs
               _linkScraperSyncsOnly(sourceName, dataNames, resolve);
            })
            .catch(e =>
            {
               Log_WriteException(e);
               resolve(null);
            });
      }
      else
      {
         _linkScraperSyncsOnly(sourceName, dataNames, resolve);
      }
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function getSyncAccountID(dataName)
{
   return new Promise((resolve, reject) =>
   {
      if (getBrandID() == BrandID_LocalFile)
      {
         // local development case
         resolve('acct_' + dataName);
         return;
      }
      
      // DRL FIXIT! We should cache this request and only re-check every minute or so!
      
      const params = {
         DataName: dataName
      };
      ajax.get(getSyncUri(), params, function(resp, httpCode)
      {
         resp = Json_FromString(resp);
         
         if (!resp.hasOwnProperty('data'))
         {
            resolve(null);
            return;
         }
         
         // the data contains properties for each account
         assert(resp.data.length == 1);  // should never have more than one account
         for (let accountId in resp.data)
         {
            resolve(accountId);
         }
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function sendCommandError(dataName, accountID, syncCommandID, errorMessage)
{
   setServerState(dataName, accountID, null, null, null, null, {
      SyncCommandID: syncCommandID,
      ErrorMessage: errorMessage
   })
      .then(response =>
      {
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Syncs_SocialNotLoggedIn(referenceUrl, displayUrl, message)
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   // DRL FIXIT? This should have been handled by the migration but some users don't have it?
   if (!sharedData.hasOwnProperty('socialLoggedOutTimes'))
      sharedData.socialLoggedOutTimes = {};
   
   let now = Date.now();
   if (!sharedData.socialLoggedOutTimes.hasOwnProperty(referenceUrl) ||
      now - sharedData.socialLoggedOutTimes[referenceUrl] > timings.SOCIAL_LOGIN_REMINDER_REOFFER * 1000)
   {
      
      Tabs.GetAllTabs(function(tabs)
      {
         try
         {
            for (let tab of tabs)
            {
               // display the warning on all the tabs that have loaded and match the display URL
               if (tab.url && fuzzyUrlStartsWith(tab.url, displayUrl) && !isScraperTab(tab.id))
               {
                  let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
                  sharedData.socialLoggedOutTimes[referenceUrl] = now;
                  Storage.SetSharedVar('Syncs', sharedData);
                  
                  pushTabNextAction(tab.id, {
                     action: 'displayMessage',
                     message: message,
                     messageType: 'warning',
                     displayType: 'center',
                     timeoutSeconds: timings.SOCIAL_LOGIN_REMINDER_TIMEOUT,
                     resp: null
                  });
               }
            }
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      });
   }
}

function Syncs_OnUserChanged()
{
   let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
   
   for (let sourceName in Syncs)
   {
      for (let i in Syncs[sourceName].ScraperSyncs)
      {
         if (sharedData.Syncs[sourceName].scraperTabs[i])
         {
            let dataName = Syncs[sourceName].ScraperSyncs[i];
            
            Log_WriteInfo('Removing ' + dataName + ' tab ' + sharedData.Syncs[sourceName].scraperTabs[i].tabID + ' due to user account change');
   
            ActionCheck_Aborting(dataName);

            sharedData.Syncs[sourceName].lastLinkOfferRefused = 0;
            sharedData.Syncs[sourceName].lastCheck = 0;
//                sharedData.Syncs[sourceName].pauseUntil = 0;
            sharedData.Syncs[sourceName].syncState = null;
            sharedData.Syncs[sourceName].existingDataNames = [];
            Storage.SetSharedVar('Syncs', sharedData);
            
            Tabs.RemoveTab(sharedData.Syncs[sourceName].scraperTabs[i].tabID);
         }
      }
   }
}
