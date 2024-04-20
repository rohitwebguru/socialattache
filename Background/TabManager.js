function TabManagerInit()
{
   return {
      syncWindowID: null,
      // we keep a copy of the data so we don't have to access it async
      tabsUsed: {},           // indexed by tab ID, the value is an array containing
                              //      the "tabName" either the scraper name or for a user tab the target name or null
                              //      the "isTemporary" flag
                              //      the "url" is what we use when we have to reload the tab
                              //      the "index" (across all window)s where this tab appears when we query Chrome - used
                              //          to find the tab on reload because all the IDs change so we can't use those
      queuedActions: {},      // an array (by tab ID), each value containing a queue of actions that can be provided for
                              // the content script to use when it loads
      
      scraperConstants: null, // as a JSON string
   };
}

// when the browser is closed then launched, or the extension is installed/updated and launched
Environment.AddStartupListener(function()
{
   Log_WriteInfo('TabManager app startup');
   
   Storage.AddSharedValuesLoadedListener(function()
   {
      reloadTabInfo();
   });
});

Tabs.AddTabAttachedListener(function(tabId)
{
   Log_WriteInfo('Tab Attached(' + getTabNameNoCheck(tabId) + ', attachInfo)');
   updateTabIndices(false);
});

Tabs.AddTabDetachedListener(function(tabId)
{
   Log_WriteInfo('Tab Detached(' + getTabNameNoCheck(tabId) + ', detachInfo)');
   updateTabIndices(false);
});

var tabCreatedTimerID = null;
Tabs.AddTabCreatedListener(function(tabId)
{
   Log_WriteInfo('Tab Created(' + getTabNameNoCheck(tabId) + ')');
   
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   if (Object.keys(sharedData.tabsUsed).length == 0)
   {
      if (tabCreatedTimerID != null)
         clearTimeout(tabCreatedTimerID);
      
      // DRL FIXIT? Timers not safe to use in Manifest v3?
      // we allow a little time because there's likely a bunch of tabs being created
      tabCreatedTimerID = setTimeout(function()
      {
         try
         {
            tabCreatedTimerID = null;
            // this may be the case where the browser was launched and the user selected to have the old tabs restored
            Log_WriteInfo('No tabs used so reloading the tab info');
            reloadTabInfo();
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      }, 5000);
   }
   else
      updateTabIndices(false);
});

Tabs.AddTabRemovedListener(function(tabId)
{
   Log_WriteInfo('Tab Removed(' + getTabNameNoCheck(tabId) + ', removeInfo)');
   
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   delete sharedData.queuedActions[tabId];
   Storage.SetSharedVar('TabManager', sharedData);
   
   syncTabRemoved(tabId);
   
   updateTabIndices(false);
});

Tabs.AddTabMovedListener(function(tabId)
{
   Log_WriteInfo('Tab Moved(' + getTabNameNoCheck(tabId) + ', moveInfo)');
   updateTabIndices(false);
});

Tabs.AddTabReplacedListener(function(addedTabId, removedTabId)
{
   Log_WriteInfo('Tab Replaced(' + getTabNameNoCheck(addedTabId) + ', ' + getTabNameNoCheck(removedTabId) + ')');
   
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   if (sharedData.tabsUsed.hasOwnProperty(removedTabId))
   {
      Log_WriteInfo('TabManager replacing tab ID ' + removedTabId + ' with ' + addedTabId);
      assert(!sharedData.tabsUsed.hasOwnProperty(addedTabId));
      
      sharedData.tabsUsed[addedTabId] = sharedData.tabsUsed[removedTabId];
      delete sharedData.tabsUsed[removedTabId];
      
      Storage.SetSharedVar('TabManager', sharedData);
      
      updateSyncTabID(removedTabId, addedTabId)
   }
   
   updateTabIndices(false);
});

Tabs.AddWindowCreatedListener(function(windowId)
{
   Log_WriteInfo('Window Created(' + windowId + ')');
   updateTabIndices(false);
});

Tabs.AddWindowRemovedListener(function(windowId)
{
   Log_WriteInfo('Window Removed(' + windowId + ')');
   updateTabIndices(false);
   
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   if (sharedData.syncWindowID == windowId)
   {
      Log_WriteError('Sync window closed!');
      sharedData.syncWindowID = null;
      Storage.SetSharedVar('TabManager', sharedData);
   }
});

Timers.AddRepeatingTimer(60, function()
{
   if (ActionSelection_IsSystemIdleTime())
      return;
   Log_WriteInfo('Tabs alarm');
   
   if (!hasLongRunningOperation())   // skip while we're busy with the server
      checkScraperConstants();
   else
      Log_WriteInfo('Skipping scraper constants check due to long running operation');
   
   updateTabIndices(true)  // check for bugs
});


// used for logging
function getTabNameNoCheck(tabID)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   if (sharedData.tabsUsed.hasOwnProperty(tabID))
      return (sharedData.tabsUsed[tabID].tabName == null ? 'user' : sharedData.tabsUsed[tabID].tabName) + ' (' + tabID + ')';
   
   return 'unknown (' + tabID + ')';
}

function reloadTabInfo()
{
   Storage.GetStorage('TabManager', 'tabsUsed', function(data)
   {
      if (!data.hasOwnProperty('tabsUsed'))
      {
         Log_WriteInfo('No saved tabs to restore');
         data.tabsUsed = {};
      }
      
      Tabs.GetAllTabs(function(tabs)
      {
         try
         {
            Log_WriteInfo('Reloading tab info: ' + Json_ToString(tabs));
            Log_SetMetaLogging('Browser Tabs', Json_ToString(tabs, null, 3));
            
            // when the browser is reloaded we need to find the window used by the scrapers, and we do
            // this by looking for a tab with a special URL that identifies the scraper window

//                    let firstRun = Object.keys(tabsUsed).length == 0;
            
            let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
            
            let removeSyncWindows = [];
            let indicatorTabId = null;
            sharedData.syncWindowID = null;
            for (let tab of tabs)
            {
               assert(tab.windowId != null);
               if (tab.url == ExtensionInfoUrl)
               {
                  if (sharedData.syncWindowID != null && sharedData.syncWindowID != tab.windowId)
                  {
                     Log_WriteError('Another ExtensionInfoUrl tab found so we will close the old one (' + sharedData.syncWindowID + ')!');
                     removeSyncWindows.push(sharedData.syncWindowID);
                  }
                  Log_WriteInfo('ExtensionInfoUrl tab found (' + tab.id + '), setting sync window ID to ' + tab.windowId);
                  sharedData.syncWindowID = tab.windowId;
                  indicatorTabId = tab.id;
               }
            }
            
            sharedData.tabsUsed = {};
            if (sharedData.syncWindowID)
            {
               Log_WriteInfo('Sync window ID is ' + sharedData.syncWindowID);
               
               // when the browser is reloaded the tab IDs may be different so we have to re-map them by
               // looking for them by index which spans all the windows so it is unique across windows
               
               for (let tabID in data.tabsUsed)
               {
                  let info = data.tabsUsed[tabID];
                  if (info.tabName == null)
                     continue;   // we don't reload user tabs, they'll call initTab() and get added to our list
                  
                  for (let i = 0; i < tabs.length; i++)
                  {
                     let tab = tabs[i];
                     if (tab.windowId == sharedData.syncWindowID && tab.id != indicatorTabId && info.index == tab.index)
                     {
                        Log_WriteInfo('Using new tab:' + Json_ToString(tab));
                        Log_WriteInfo('For old tab:' + Json_ToString(info));
                        
                        let tabID = tab.id;
                        
                        // put the tab into the array using the new tab ID
                        sharedData.tabsUsed[tabID] = info;

// DRL FIXIT! Need to revisit this as it seemed to be stealing the focus from the temporary window, but it shouldn't?
//                                    // if this is a fresh start give each sync tab a five second poke to wake it up, starting in five seconds
//                                    if (firstRun && isScraperTabName(info.tabName))
//                                        setTimeout(function() {
//                                            Log_WriteInfo('TabManager giving focus to ' + getTabNameNoCheck(tabID));
//                                            Tabs.SetActiveTab(tabID);
//                                        }, 5000 + (5000 * Object.keys(tabsUsed).length))
                        
                        info = null; // we found it
                        
                        // note that this doesn't change the array indices
                        delete tabs[i]; // remove it from the list so we don't delete the tab below
                        break;
                     }
                  }
                  
                  // the delete operator above doesn't update indices or array length so we have to re-index
                  tabs = Object.values(tabs);
                  
                  if (info)
                  {
                     Log_WriteWarning('Tab not found ' + tabID);
                  }
               }
               
               // delete unused tabs in our list
               for (let tab of tabs)
               {
                  if (tab.windowId == sharedData.syncWindowID && tab.id != indicatorTabId)
                  {
                     Log_WriteWarning('Removing unmatched tab ' + tab.id + ' at ' + tab.url);
                     Tabs.RemoveTab(tab.id);
                  }
               }
            }
            else
               Log_WriteInfo('Sync window not found');
            
            Storage.SetSharedVar('TabManager', sharedData);
            
            Utilities_ArrayRemoveDuplicates(removeSyncWindows);
            for (let windowID of removeSyncWindows)
            {
               Log_WriteWarning('Removing old sync window: ' + windowID);
               Tabs.RemoveWindow(windowID, function()
               {
               });
            }

//                Log_SetMetaLogging('Tabs Used', Json_ToString(sharedData.tabsUsed, null, 3));
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      });
   });
}

let tabUpdateTimerID = null;
let tabLogChangesAsErrors = null;

function updateTabIndices(logChangesAsErrors)
{
   if (tabUpdateTimerID != null)
      clearTimeout(tabUpdateTimerID);
   
   // if there is any request to NOT log as errors then we shouldn't because changes are expected
   if (tabLogChangesAsErrors === null || logChangesAsErrors == false)
      tabLogChangesAsErrors = logChangesAsErrors;
   
   // DRL FIXIT? Timers not safe to use in Manifest v3?
   tabUpdateTimerID = setTimeout(function()
   {
      try
      {
         tabUpdateTimerID = null;
         logChangesAsErrors = tabLogChangesAsErrors;
         tabLogChangesAsErrors = null;
         
         _updateTabIndices(logChangesAsErrors);
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   }, 1000);
}

function _updateTabIndices(logChangesAsErrors)
{
   try
   {
      Tabs.GetAllTabs(function(tabs)
      {
         try
         {
            Log_WriteInfo('Checking tabs - start');
            Log_SetMetaLogging('Browser Tabs', Json_ToString(tabs, null, 3));
            
            let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
            
            let changed = false;
            for (let tabID in sharedData.tabsUsed)
            {
               let info = sharedData.tabsUsed[tabID];
               for (let tab of tabs)
               {
                  if (tab.id == tabID)
                  {
                     if (info.index != tab.index)
                     {
                        if (info.index != -1 && logChangesAsErrors)
                        {
                           Log_WriteError('While checking tabs found a tab with the wrong index! ' + Json_ToString(sharedData.tabsUsed[tabID]));
                        }
                        Log_WriteInfo('Updating tab ' + getTabNameNoCheck(tabID) + ' index from ' +
                           info.index + ' to ' + tab.index);
                        sharedData.tabsUsed[tabID].index = tab.index;
                        changed = true;
                     }
                     
                     info = null; // found it
                     break;
                  }
               }
               
               if (info)
               {
                  if (logChangesAsErrors)
                     Log_WriteError('Tab removed (not found) ' + tabID);
                  else
                     Log_WriteInfo('Tab removed (not found) ' + tabID);
                  delete sharedData.tabsUsed[tabID];
                  changed = true;
               }
            }
            
            if (changed)
            {
               Storage.SetSharedVar('TabManager', sharedData);
               Storage.SetStorage('TabManager', {tabsUsed: sharedData.tabsUsed});
               Log_WriteInfo('Saved tabsUsed');
//                    Log_SetMetaLogging('Tabs Used', Json_ToString(sharedData.tabsUsed, null, 3));
            }
            Log_WriteInfo('Checking tabs - end');
         }
         catch (e)
         {
            Log_WriteException(e, 'updateTabIndices() 2');
         }
      });
   }
   catch (e)
   {
      Log_WriteException(e, 'updateTabIndices() 1');
   }
}

var initialCheck = true; // we want to load as soon as possible after the branding has been sorted out
function checkScraperConstants()
{
   if (!OutstandingProcessing_Start('ScraperConstants', initialCheck ? 0 : timings.CHECK_FOR_UPDATED_CONSTANTS))
      return;
   
   const url = Form_RootUri
      ? Form_RootUri + '/v2/Skins/ScraperConstants'
      : Environment.GetAssetUrl('Constants.js');
   
   ajax.get(url, {}, function(resp, httpCode)
   {
      if (resp && httpCode == 200)
      {
         let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
         
         let newVersion = resp.match(/.*CONSTANTS_VERSION[ =]+"([\d\.]+)"/)[1];
         if (initialCheck || CONSTANTS_VERSION != newVersion)
         {
            Log_WriteInfo('Updating constants v' + CONSTANTS_VERSION + ' with constants v' + newVersion + ' from server');
            
            initialCheck = false;
            
            // store the constants so we can send them to the client code
            sharedData.scraperConstants = loadConstantsFromJson(resp);
            
            // update our version number to match so we don't keep loading it
            CONSTANTS_VERSION = newVersion;
            
            Storage.SetSharedVar('TabManager', sharedData);
            
            // store the constants in the global namespace, overwriting the original Constants.js versions
            for (let name of Object.keys(sharedData.scraperConstants))
               window[name] = sharedData.scraperConstants[name];

// This will interrupt scraping and is very detrimental to long operations like group member import.
//                // reload scraper tabs so they make use of the new values immediately, whereas user
//                // tabs are already getting reloaded periodically when the browser is idle
//                for (let usedTabID in sharedData.tabsUsed)
//                {
//                    if (isScraperTabName(sharedData.tabsUsed[usedTabID].tabName))
//                        Tabs.ReloadTab(usedTabID);
//                }
         }
      }
      else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
      {
         // server unavailable, network error, etc.
         Log_WriteWarning('Server is not available to get scraper constants: ' + httpCode);
      }
      else
      {
         Log_WriteError('Error getting scraper constants: ' + httpCode);
      }
      
      OutstandingProcessing_End('ScraperConstants');
   }, true, timings.SHORT_AJAX_REQUEST * 1000);
}

// pass null sync data name for user controlled tab, otherwise the data name for the sync, returns some
// initialization data if this tab can be used, otherwise null
async function initTab(tabID, tabName)
{
   return new Promise((resolve, reject) =>
   {
      Tabs.GetTab(tabID, function(tab)
      {
         if (tab == null)
         {
            Log_WriteError('initTab getting tab ' + tabName + ' (' + tabID + ') returned null!');
            resolve(null);
            return;
         }
         
         try
         {
            // when a script is connected to a tab it will call "init" to check if it should use the tab or if it
            // should ignore the tab and let the user have it because we already have a tab for that processor
            
            let canUse = true;
            let prettyTabName = tabName != null ? tabName : 'user';
            
            let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
            
            if (sharedData.tabsUsed.hasOwnProperty(tabID))
            {
               // only user tabs can be re-used, and scraper tabs should be setup via createTab(), not here
               if (sharedData.tabsUsed[tabID].tabName != tabName &&
                  (isScraperTabName(sharedData.tabsUsed[tabID].tabName) || isScraperTabName(tabName)))
               {
                  Log_WriteInfo('Tab ' + tabID + ' can\'t be used for ' + prettyTabName +
                     ' as it\'s already being used for ' + (sharedData.tabsUsed[tabID].tabName ? sharedData.tabsUsed[tabID].tabName : 'user'));
                  canUse = false;
               }
            }
            else if (isScraperTabName(tabName))
            {
               Log_WriteInfo('Tab ' + tabID + ' is not set up for ' + prettyTabName);
               canUse = false;
            }
            
            Log_WriteInfo('Init tab ' + tabID + ' for ' + prettyTabName + ' canUse ' +
               (canUse ? 'yes' : 'no'));
            
            // keep track of the usage for the tab if it's new or it changes
            if (canUse && (!sharedData.tabsUsed.hasOwnProperty(tabID) || sharedData.tabsUsed[tabID].tabName != tabName))
            {
               Log_WriteInfo('Init tab ' + tabID + ' for ' + prettyTabName);
               
               sharedData.tabsUsed[tabID] = {
                  tabName: tabName,
                  url: null,
                  index: tab.index,
                  isTemporary: false
               };

//                    Log_SetMetaLogging('Tabs Used', Json_ToString(sharedData.tabsUsed, null, 3));
            }
            
            Storage.SetSharedVar('TabManager', sharedData);
            
            if (!canUse && isScraperTabName(tabName) && tab.windowId == sharedData.syncWindowID)
            {
               Log_WriteError('Closing scraper tab ' + tabID + ' that is not set up!');
               assert(!sharedData.tabsUsed.hasOwnProperty(tabID));
               Tabs.RemoveTab(tabID);
            }
            
            if (!canUse)
            {
               resolve(null);
               return;
            }
            
            let languageCode = getSessionLanguage();
            const url = Environment.GetAssetUrl('Strings/StringsForExtension-' + languageCode + '.json');
            
            ajax.get(url, {}, function(resp, httpCode)
            {
               let translations = Json_FromString(resp);
               assert(translations != null);
               
               let brand = getBrand();
               let rootUrl = null;
               let loginUrl = null;
               if (brand)
               {
                  rootUrl = brand.RootURL;
                  loginUrl = brand.ExtensionLoginResourceID
                     ? brand.RootURL + '/Main.php?FormProcessor=FlowChartVisit&ResourceID=' + brand.ExtensionLoginResourceID + '&Restart=1'
                     : brand.RootURL + '/Main.php';
               }
               let result = {
                  brandRootURL: rootUrl,
                  brandLoginURL: loginUrl,
                  // in dev environment we use the scraper constants unchanged so this would be null in that case
                  scraperConstants: getBrandID() == BrandID_LocalFile ? null : sharedData.scraperConstants,
                  languageCode: languageCode,
                  translations: translations
               }
               resolve(result);
            });
         }
         catch (e)
         {
            Log_WriteException(e, 'initTab()');
            resolve(null);
         }
      });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function getTabName(tabID)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   if (sharedData.tabsUsed.hasOwnProperty(tabID))
      return sharedData.tabsUsed[tabID].tabName;
   
   let str = '';
   for (let usedTabID in tabsUsed)
   {
      str += "Tab: " + usedTabID + " for " + sharedData.tabsUsed[usedTabID].tabName + "\r\n";
   }
   Log_WriteError("Tab " + tabID + " not found in:\r\n" + str);
   return null;
}

function hasExistingTab(tabID)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   return sharedData.tabsUsed.hasOwnProperty(tabID);
}

function isTemporaryTab(tabID)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   if (!sharedData.tabsUsed.hasOwnProperty(tabID))
   {
      Log_WriteError('Tab ' + tabID + ' not found when checking for temporary tab!');
      return false;
   }
   return sharedData.tabsUsed[tabID].isTemporary;
}

function hasTemporaryTab(tabName)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   for (let usedTabID in sharedData.tabsUsed)
   {
      if (sharedData.tabsUsed[usedTabID].tabName == tabName && sharedData.tabsUsed[usedTabID].isTemporary)
         return true;
   }
   return false;
}

function pushTabNextAction(tabID, nextAction)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   if (!sharedData.queuedActions.hasOwnProperty(tabID))
      sharedData.queuedActions[tabID] = [nextAction];
   else
      sharedData.queuedActions[tabID].push(nextAction);
   
   Storage.SetSharedVar('TabManager', sharedData);
   return true;
}

function popTabNextAction(tabID)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   if (!sharedData.tabsUsed.hasOwnProperty(tabID))
   {
      // If this method is being called then our client script is running which means initTab() must have been
      // called, but for some reason it doesn't appear in our list. We will reload the tab in the hopes initTab()
      // gets called again to correct this.
      Log_WriteError('Tab ' + tabID + ' not found when getting next action!');
      Tabs.ReloadTab(tabID);
      return {action: 'wait', seconds: 60};
   }
   let result = sharedData.queuedActions.hasOwnProperty(tabID) && sharedData.queuedActions[tabID].length > 0
      ? sharedData.queuedActions[tabID].shift()
      : null;
   
   Storage.SetSharedVar('TabManager', sharedData);
   return result;
}

// tabName can be a scraper name or for a user tab can be null or some other name (allows re-use)
// the URL can be terminated with a "*" in order to re-use any existing URL that starts the same
async function createTab(tabName, method, url, params, forScraping, isTemporary = false, focused = true, _queuedActions = null)
{
   assert(_queuedActions == null || Array.isArray(_queuedActions));
   
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   let tabID = null;
   
   if (tabName != null)
   {
      for (let usedTabID in sharedData.tabsUsed)
      {
         if (sharedData.tabsUsed[usedTabID].tabName == tabName && sharedData.tabsUsed[usedTabID].isTemporary == isTemporary)
         {
            tabID = usedTabID;
            Log_WriteInfo('Using existing tab ' + tabID + ' for ' + tabName + (isTemporary ? ' temporary tab' : ''));
            break;
         }
      }
   }
   
   let substringMatch = false;
   if (url.endsWith('*'))
   {
      url = url.slice(0, -1);
      substringMatch = true;
   }
   let redirectUrl = null;
   if (method.toUpperCase() == 'POST')
   {
      redirectUrl = Environment.GetAssetUrl('RedirectPost/post.html');
   }
   else
   {
      redirectUrl = url;
      let query = (new URLSearchParams(params)).toString();
      if (query.length > 0)
      {
         assert(!url.endsWith('*'));
         redirectUrl += '?' + query;
      }
   }
   
   return new Promise((resolve, reject) =>
   {
      if (tabID && forScraping)
      {
         if (isTemporary)
         {
            // there's only ever one temporary tab and we don't re-use it (it should have been removed already)
            Log_WriteError('Removing ' + tabName + ' temporary tab before creating another');
            Tabs.RemoveTab(tabID);
            tabID = null;
         }
      }
      
      let handleTabLoaded = function(tab)
      {
         // CreateTab() return null on error whereas SetTabUrl() returns null windowId
         if (tab == null || tab.windowId == null)
         {
            Log_WriteError('Error creating tab for ' + (forScraping ? 'scraping' : 'user') + ' with url: ' + url);
            resolve(null);
            return;
         }
         
         let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
         
         if (forScraping && !isTemporary)
         {
            if (sharedData.syncWindowID != null && sharedData.syncWindowID != tab.windowId)
            {
               // added this because I saw one case where things got held up and that resulted in multiple
               // calls to create the same initial tab resulting in a lot of sync windows being created so
               // we'll close the extras if we get into that state again
               Log_WriteError('There is already a sync window with ID ' + sharedData.syncWindowID + ' therefore closing new window ' + tab.windowId);
               Tabs.RemoveWindow(tab.windowId, function()
               {
               });
               resolve(null);
               return;
            }
            
            assert(tab.windowId != null);
            if (sharedData.syncWindowID == null)
            {
               Log_WriteInfo('Tab loaded, setting sync window ID from null to ' + tab.windowId);
               sharedData.syncWindowID = tab.windowId;
               Storage.SetSharedVar('TabManager', sharedData);
               
               // we create a tab with a special URL for the sole purpose of identifying the scraper
               // window when the browser or Chrome extension are reloaded
               Tabs.CreateTab(sharedData.syncWindowID, ExtensionInfoUrl, false, function(tab)
               {
               });
            }
         }
         
         if (tabID == null)
         {
            // scraper tabs could bring up an auto-play video so we mute them
            if (forScraping)
               Tabs.SetTabMuted(tab.id, true);
            
            sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
            sharedData.tabsUsed[tab.id] = {
               tabName: tabName,
               isTemporary: isTemporary,
               url: forScraping ? url : null,
               index: -1,  // set by updateTabIndices() below
            };
            if (_queuedActions != null)
               sharedData.queuedActions[tab.id] = _queuedActions;
            Storage.SetSharedVar('TabManager', sharedData);
            
            Log_WriteInfo('Using new tab ' + tab.id + ' for ' + tabName + (isTemporary ? ' temporary tab' : ''));
            updateTabIndices(false);
         }
         
         // DRL FIXIT? Timers not safe to use in Manifest v3?
         // some sites (like Twitter) still haven't loaded the page content so we wait a little longer
         setTimeout(function()
         {
            try
            {
               // if this was a post we have to tell the redirect page to perform the post
               if (method.toUpperCase() == 'POST')
                  Messaging.SendMessageToTab(tab.id, {url: url, params: params});
            }
            catch (e)
            {
               Log_WriteException(e);
            }
            
            resolve(tab.id);
         }, 1000);
      }
      
      if (tabID)
      {
         Tabs.GetTab(tabID, function(tab)
         {
            if (tab == null)
            {
               Log_WriteError('createTab getting tab ' + tabID + ' returned null!');
               resolve(null);
               return;
            }
            
            try
            {
               if (!forScraping && !tab.active)
               {
                  Log_WriteInfo('Updating tab ' + tab.id + ' in window ' + tab.windowId + ' for ' + (forScraping ? 'scraping' : 'user') + ' as active');
                  Tabs.SetActiveTab(tabID);
               }
               
               let matches = tab.url == undefined
                  ? false  // added this to avoid a warning in the below, since we'll get this state with a new tab
                  : (substringMatch
                     ? fuzzyUrlStartsWith(tab.url, redirectUrl)
                     : fuzzyUrlsMatch(tab.url, redirectUrl));
               if (matches && method.toUpperCase() != 'POST')
                  resolve(tabID);
               else
               {
                  Log_WriteInfo('Updating tab ' + tab.id + ' in window ' + tab.windowId + ' for ' + (forScraping ? 'scraping' : 'user') + ' with url: ' + redirectUrl);
                  Tabs.SetTabUrl(tabID, redirectUrl, handleTabLoaded);
               }
            }
            catch (e)
            {
               Log_WriteException(e, 'createTab()');
               resolve(null);
            }
         });
      }
      else if (!forScraping)
      {
         // DRL FIXIT? We should make sure we're not using the sync window!
         Log_WriteInfo('Creating user tab in active window with url: ' + redirectUrl);
         Tabs.CreateTab(Tabs.ACTIVE_WINDOW, redirectUrl, focused, handleTabLoaded);
      }
      else if (isTemporary)
      {
         Log_WriteInfo('Creating temporary window/tab with url: ' + redirectUrl);
         Tabs.CreateTab(Tabs.CREATE_WINDOW, redirectUrl, focused, handleTabLoaded);
      }
      else if (sharedData.syncWindowID)
      {
         Log_WriteInfo('Creating scraping tab in sync window ' + sharedData.syncWindowID + ' with url: ' + redirectUrl);
         Tabs.CreateTab(sharedData.syncWindowID, redirectUrl, false, handleTabLoaded);
      }
      else
      {
         Log_WriteInfo('Creating scrapers window');
         Tabs.CreateTab(Tabs.CREATE_WINDOW, redirectUrl, false, handleTabLoaded);
      }
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// intended to be used in an extreme case where a scraper tab is no longer going to be used
function removeTab(tabID)
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   Log_WriteError('Removing tab ' + tabID + ' with saved tabs:' + Json_ToString(sharedData.tabsUsed));
   Tabs.RemoveTab(tabID);
}

// focusedSecondsOrBool controls the window focus (true, false, or number of seconds)
async function showSyncWindowAndTab(tabID, focusedSecondsOrBool, minWidth)
{
   return new Promise((resolve, reject) =>
   {
      let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
      assert(sharedData.syncWindowID != null);
      
      Tabs.SetWindowNormal(sharedData.syncWindowID, focusedSecondsOrBool, minWidth, function()
      {
         Tabs.SetActiveTab(tabID, function(tabId)
         {
            resolve();
         });
      });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function TabManager_OnUserChanged()
{
   let sharedData = Storage.GetSharedVar('TabManager', TabManagerInit());
   
   // when the brand changes, so do the global URLs, so we reload the tabs that will care
   for (let tabID in sharedData.tabsUsed)
   {
      Tabs.ReloadTab(tabID);
   }
}
