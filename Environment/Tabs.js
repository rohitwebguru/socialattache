var Tabs =
   {
      ACTIVE_WINDOW: -1,
      CREATE_WINDOW: null,
      
      _forceActiveWindowID: null,
      _forceActiveWindowCount: 0,
      
      _lastClosedTabID: null,    // used to ignore pending messages still around after the tab is closed
      LastClosedTabID: function()
      {
         return Tabs._lastClosedTabID;
      },
      
      _activeTabChangedHandlers: {},
      _ActiveTabChangedHandler: function(activeInfo)
      {
         Log_WriteInfo('Active tab changed in window ' + activeInfo.windowId + ' to tab ' + activeInfo.tabId);
         if (Tabs._activeTabChangedHandlers.hasOwnProperty(activeInfo.tabId))
         {
            Tabs._activeTabChangedHandlers[activeInfo.tabId](activeInfo.tabId);
            delete Tabs._activeTabChangedHandlers[activeInfo.tabId];
         }
      },
      
      _focusedWindowChangedHandlers: {},
      _FocusedWindowChangedHandler: function(windowId)
      {
         Log_WriteInfo('Focused window changed to ' + windowId);
         if (Tabs._focusedWindowChangedHandlers.hasOwnProperty(windowId))
         {
            Tabs._focusedWindowChangedHandlers[windowId](windowId);
            Log_WriteInfo('Window ' + windowId + ' focus handler removed');
            delete Tabs._focusedWindowChangedHandlers[windowId];
         }
         else
            Log_WriteInfo('Window ' + windowId + ' focus handler not set');
         
         if (Tabs._forceActiveWindowID && windowId != Tabs._forceActiveWindowID)
         {
            Tabs._forceActiveWindowCount++;
            if (Tabs._forceActiveWindowCount >= 4) // allow three times to set active then we're probably in a bad state
            {
               Log_WriteError('Forced focus window ' + Tabs._forceActiveWindowID + ' still active after ' + Tabs._forceActiveWindowCount + ' focus changes');
               Tabs._forceActiveWindowID = null;
            }
            else
            {
               Log_WriteInfo('Setting focus back to main window ' + Tabs._forceActiveWindowID + ' for attempt ' + Tabs._forceActiveWindowCount);
               chrome.windows.update(Tabs._forceActiveWindowID, {focused: true}, function()
               {
                  let lastError = chrome.runtime.lastError;
                  if (lastError != null)
                  {
                     Log_WriteError('Got error in _FocusedWindowChangedHandler() when activating window: ' + lastError.message);
                  }
               });
            }
         }
      },
      
      // DRL FIXIT? This does not appear to be called by the extension code?
      TabCreatedCallbackInvoker: function(tabId)
      {
         // console.log("TabCreatedCallbackInvoker", AddTabCreatedHandlers);
         // DRL FIXIT? AddTabCreatedHandlers is declared in App.js, not sure why not here???
         for (let handler of AddTabCreatedHandlers)
         {
            try
            {
               handler(tabId);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      TabRemovedCallbackInvoker: function(tabId)
      {
         Tabs._lastClosedTabID = tabId;
         
         // console.log("TabRemovedCallbackInvoker", AddTabRemovedHandlers);
         // DRL FIXIT? AddTabRemovedHandlers is declared in App.js, not sure why not here???
         for (let handler of AddTabRemovedHandlers)
         {
            try
            {
               handler(tabId);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      WindowCreatedCallbackInvoker: function(windowId)
      {
         // console.log("AddWindowCreatedHandlers", AddWindowCreatedHandlers);
         // DRL FIXIT? AddWindowCreatedHandlers is declared in App.js, not sure why not here???
         for (let handler of AddWindowCreatedHandlers)
         {
            try
            {
               handler(windowId);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      WindowRemovedCallbackInvoker: function(windowId)
      {
         // console.log("AddWindowRemovedHandlers", AddWindowRemovedHandlers);
         // DRL FIXIT? AddWindowRemovedHandlers is declared in App.js, not sure why not here???
         for (let handler of AddWindowRemovedHandlers)
         {
            try
            {
               handler(windowId);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      AddTabAttachedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.onAttached.addListener(function(tabId, attachInfo)
            {
               try
               {
                  handler(tabId);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script: we don't attach tabs in this case
         }
      },
      
      AddTabDetachedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.onAttached.addListener(function(tabId, detachInfo)
            {
               try
               {
                  handler(tabId);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script: we don't attach tabs in this case
         }
      },
      
      AddTabCreatedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.onCreated.addListener(function(tab)
            {
               try
               {
                  handler(tab.id);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('AddTabCreatedListener() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      AddTabRemovedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.onRemoved.addListener(function(tabId, removeInfo)
            {
               try
               {
                  handler(tabId);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('AddTabRemovedListener() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      AddTabMovedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.onMoved.addListener(function(tabId, moveInfo)
            {
               try
               {
                  handler(tabId);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script: we don't move tabs in this case
         }
      },
      
      AddTabReplacedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId)
            {
               try
               {
                  handler(addedTabId, removedTabId);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script: we don't replace tabs in this case
         }
      },
      
      AddWindowCreatedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.windows.onCreated.addListener(function(window)
            {
               try
               {
                  handler(window.id);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('AddWindowCreatedListener() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      AddWindowRemovedListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.windows.onRemoved.addListener(function(windowId)
            {
               try
               {
                  handler(windowId);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('AddWindowRemovedListener() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      // windowID can also be ACTIVE_WINDOW or CREATE_WINDOW
      // new tab should be created such that if it is closed the old tab is shown when possible
      CreateTab: function(windowID, url, focused, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            
            let handleTabLoaded = function(tab)
            {
               if (tab == null)
               {
                  Log_WriteError('Error creating tab with url: ' + url);
                  
                  if (Tabs._forceActiveWindowID != null)
                  {
                     Log_WriteInfo('Error creating tab, clearing Tabs._forceActiveWindowID');
                     Tabs._forceActiveWindowID = null;
                  }
                  
                  try
                  {
                     if (handler) handler(null);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  return;
               }
               
               Log_WriteInfo('Tab ' + tab.id + ' loaded 1');
               
               // we notify here that the tab is created because we need to have things set up before the scripts
               // in the tab start running
               let info = {
                  id: tab.id,
                  windowId: tab.windowId,
                  url: tab.url
               }
               try
               {
                  if (handler) handler(info);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
               
               // we continue to manage the focus of the window until it is fully loaded
               let updateHandler = function(tabID, changeInfo, tab2)
               {
                  Log_WriteInfo('Update ' + tabID + ' handler 1 status ' + changeInfo.status);
                  let lastError = chrome.runtime.lastError;
                  if (lastError != null)
                  {
                     Log_WriteError('Tab ' + tabID + ' got error in CreateTab() updating tab: ' + lastError.message);
                  }
                  
                  // it looks like the tab status of undefined also means complete??
                  if (tabID == tab.id && (changeInfo.status === undefined || changeInfo.status === 'complete'))
                  {
                     Log_WriteInfo('Update handler 2: ' + changeInfo.status);
                     if (Tabs._forceActiveWindowID != null)
                     {
                        Log_WriteInfo('Tab created, clearing Tabs._forceActiveWindowID in callback');
                        Tabs._forceActiveWindowID = null;
                     }
                     
                     chrome.tabs.onUpdated.removeListener(updateHandler);
                  }
               }
               
               // in case we're faster than page load (usually):
               chrome.tabs.onUpdated.addListener(updateHandler);
               
               // just in case we're too late with the listener, or the tab was pre-existing:
               if (tab.status == 'complete')
               {
                  if (Tabs._forceActiveWindowID != null)
                  {
                     Log_WriteInfo('Tab created, clearing Tabs._forceActiveWindowID inline');
                     Tabs._forceActiveWindowID = null;
                  }
                  
                  chrome.tabs.onUpdated.removeListener(updateHandler);
               }
            }
            
            let handleWindowCreated = function(window)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Got error in CreateTab() when creating window: ' + lastError.message);
               }
               
               if (Tabs._forceActiveWindowID != null)
               {
                  Log_WriteInfo('Window created, clearing Tabs._forceActiveWindowID');
                  Tabs._forceActiveWindowID = null;
               }
               
               if (window == null)
               {
                  Log_WriteError('Error creating window with url: ' + url);
                  try
                  {
                     if (handler) handler(null);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  return;
               }
               
               let info = {
                  id: window.tabs[0].id,
                  windowId: window.id,
                  url: window.tabs[0].url
               }
               
               try
               {
                  if (handler) handler(info);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }
            
            // get the active window so we can restore it to workaround a Windows issue
            chrome.windows.getLastFocused(function(window)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Got error in CreateTab() when getting focused window: ' + lastError.message);
               }
               
               if (window && window.id != windowID)
               {    // this check catches case where multiple tabs are being created in
                  Tabs._forceActiveWindowID = window.id; // the scraper window so it may temporarily be the active one
                  Tabs._forceActiveWindowCount = 0;
                  Log_WriteInfo('Focused main window is ' + window.id + ' in state ' + window.state);
               }
               else
                  Log_WriteInfo('Skipping currently focused window');
               
               if (windowID == Tabs.CREATE_WINDOW)
               {
                  chrome.windows.create({
                     focused: focused,
                     type: 'normal',
                     state: 'normal',
                     url: url
                  }, handleWindowCreated);
               }
               else if (windowID == Tabs.ACTIVE_WINDOW)
               {
                  // we want the new tab to be opened before the current active tab so that when it
                  // is closed the old active tab becomes the active one again
                  chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
                  {
                     let lastError = chrome.runtime.lastError;
                     if (lastError != null)
                     {
                        Log_WriteError('Got error in CreateTab() when getting active tab: ' + lastError.message);
                     }
                     
                     if (tabs.length == 0) Log_WriteError('While creating new tab couldn\'t get current tab!');
                     let index = tabs.length > 0 ? tabs[0].index : 0;
                     chrome.tabs.create({/*autoDiscardable: false,*/
                        active: focused,
                        url: url,
                        index: index
                     }, handleTabLoaded);
                  });
               }
               else
               {
                  chrome.tabs.create({windowId: windowID, active: focused, url: url}, handleTabLoaded);
               }
            });
         }
         else
         {
            // this is the app background script
            Messaging.SendMessageToNativeApp({type: 'native-createTab', value: 'facebook'}, function(data)
            {
               Log_WriteInfo('Created tab is: ' + GetVariableAsString(data.value));
               try
               {
                  if (handler) handler(data.value);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
      },
      
      SetTabUrl: function(tabID, url, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.update(parseInt(tabID), {url: url}, function(tab)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Tab ' + tabID + ' got error in SetTabUrl(): ' + lastError.message);
               }
               
               if (tab == null)
               {
                  try
                  {
                     if (handler) handler({id: tabID, windowId: null, url: null});
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  return;
               }
               
               let info = {
                  id: tabID,
                  windowId: tab.windowId,
                  url: tab.url   // NOTE: The tab won't have been loaded with the new URL yet, so this will be the old one.
               }
               try
               {
                  if (handler) handler(info);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Messaging.SendMessageToNativeApp({type: 'native-setTabUrl', value: url}, function()
            {
               try
               {
                  if (handler) handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
      },
      
      SetTabMuted: function(tabID, muted)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            // DRL FIXIT! This doesn't appear to work? It's still not muted and the "muted" flag isn't set when we check it.
            chrome.tabs.update(parseInt(tabID), {muted: muted});
         }
         else
         {
            // this is the app background script
            Log_WriteError('SetTabMuted() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      ReloadTab: function(tabID, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.reload(parseInt(tabID), function()
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Tab ' + tabID + ' got error in ReloadTab(): ' + lastError.message);
               }
               
               try
               {
                  if (handler) handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('ReloadTab() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      SetActiveTab: function(tabID, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            
            if (handler)
               Tabs._activeTabChangedHandlers[tabID] = handler;
            
            Log_WriteInfo('Setting focus to tab ' + tabID);
            chrome.tabs.update(parseInt(tabID), {active: true}, function(tab)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  let errorTabID = tabID;
                  if (lastError.message.includes('user may be dragging'))
                     Log_WriteWarning('Tab ' + tabID + ' got error during SetActiveTab: ' + lastError.message);
                  else
                  {
                     Log_WriteError('Tab ' + tabID + ' got error during SetActiveTab: ' + lastError.message);
                     errorTabID = null;
                  }
                  if (Tabs._activeTabChangedHandlers.hasOwnProperty(tabID))
                  {
                     Tabs._activeTabChangedHandlers[tabID](errorTabID); // send null TabID only when it's an error
                     delete Tabs._activeTabChangedHandlers[tabID];
                  }
               }
               if (tab && tab.active)
               {
                  // tab was already active, so the active changed handler won't fire, so do this here instead
                  if (Tabs._activeTabChangedHandlers.hasOwnProperty(tabID))
                  {
                     Tabs._activeTabChangedHandlers[tabID](tabID);
                     delete Tabs._activeTabChangedHandlers[tabID];
                  }
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('SetActiveTab() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      RemoveTab: function(tabID, handler)
      {
         Log_WriteInfo('Tabs.RemoveTab(' + tabID + ') called');
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.remove(parseInt(tabID), function()
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Tab ' + tabID + ' got error in RemoveTab(): ' + lastError.message);
               }
               
               try
               {
                  if (handler) handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            
            Messaging.SendMessageToNativeApp({type: "#SA#-native-removeTab", value: tabID}, function(response)
            {
               if (response.value.deleted === true)
               {
                  // console.log(`Tab with id ${tabID} removed.`);
                  try
                  {
                     if (handler) handler();
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  Tabs.TabRemovedCallbackInvoker(tabID);
                  if (response.value.isWindowDeleted === true)
                  {
                     Tabs.WindowRemovedCallbackInvoker(response.value.windowId)
                  }
               }
               else
               {
                  Log_WriteError("Tab " + tabID + " could not be removed.");
               }
            });
         }
      },
      
      RemoveWindow: function(windowID, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.windows.remove(parseInt(windowID), function()
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Window ' + windowID + ' got error in RemoveWindow(): ' + lastError.message);
               }
               
               try
               {
                  if (handler) handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('RemoveWindow() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
      
      // returns id, url and active only for now
      GetTab: function(tabID, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            
            // we have to get all the windows so we can calculate the index
            chrome.tabs.query({windowType: 'normal'}, function(tabs)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Tab ' + tabID + ' got error in GetTab(), will reschedule and try again later: ' + lastError.message);
                  Tabs.GetTab(tabID, handler);
                  return;
               }
               
               // NOTE: We don't use the Chrome tab index as this restarts at 0 for each window, instead we use
               // our own index which spans across all windows so it's unique.
               let index = 0;
               
               let info = null;
               
               for (let tab of tabs)
               {
                  if (tab.id == tabID)
                  {
                     info = {
                        id: tab.id,
                        windowId: tab.windowId,
                        index: index,
                        url: tab.url,
                        active: tab.active
                     };
                  }
                  index++;
               }
               
               try
               {
                  if (handler) handler(info);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            
            Messaging.SendMessageToNativeApp({type: "#SA#-native-getTab", value: tabID}, function(response)
            {
               if (response.value)
               {
                  Log_WriteInfo('Got tab info: ' + GetVariableAsString(response.value));
                  try
                  {
                     if (handler) handler(response.value);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }
               else
               {
                  Log_WriteError("Tab " + tabID + " not found to remove.");
               }
            });
         }
      },
      
      // returns array of tabs each with id, url, active, windowId and a unique index
      GetAllTabs: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.query({windowType: 'normal'}, function(tabs)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Error querying tabs, will reschedule and try again later: ' + lastError.message);
                  Tabs.GetAllTabs(handler);
                  return;
               }
               
               // NOTE: We don't use the Chrome tab index as this restarts at 0 for each window, instead we use
               // our own index which spans across all windows so it's unique.
               let index = 0;
               
               let data = [];
               
               for (let tab of tabs)
               {
                  let info = {
                     id: tab.id,
                     windowId: tab.windowId,
                     index: index,
                     url: tab.url,
                     active: tab.active
                  };
                  data.push(info);
                  index++;
               }
               
               try
               {
                  if (handler) handler(data);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            
            Messaging.SendMessageToNativeApp({type: "#SA#-native-getAllTabs"}, function(response)
            {
               if (response.value)
               {
                  try
                  {
                     if (handler) handler(response.value);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }
               else
               {
                  Log_WriteError("No tabs found.");
               }
            });
         }
      },
      /* Not needed.
         // returns array of windows each with windowId, focused and state
         GetAllWindows: function(handler)
         {
            if (Browser.IsExtensionContent())
            {
               // this is the Chrome extension content script
               assert(0);
            }
            else if (Browser.IsExtensionBackground())
            {
               // this is the Chrome extension background script
               chrome.windows.getAll(function(windows)
               {
                  let data = [];
                  
                  for (let window of windows)
                  {
                     let info = {
                        windowId: window.id,
                        focused: window.focused,
                        state: window.state
                     };
                     data.push(info);
                  }
                  try
                  {
                     if (handler) handler(data);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               });
            }
            else
            {
               // this is the app background script
               
               Messaging.SendMessageToNativeApp({type: "#SA#-native-getAllWindows"}, function (response)
               {
                  if (response.value)
                  {
                     try
                     {
                        if (handler) handler(response.value);
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
                  else
                  {
                     Log_WrieError("No windows found.");
                  }
               });
            }
         },
      */
      // focusedSecondsOrBool controls the window focus (true, false, or number of seconds)
      // handlerFocused is not called if focusedSecondsOrBool is false
      // handlerRestored is not called if focusedSecondsOrBool is a bool
      SetWindowNormal: function(windowID, focusedSecondsOrBool, minWidth, handlerFocused, handlerRestored)
      {
         Log_WriteInfo('Setting window ' + windowID + ' with focus: ' + focusedSecondsOrBool);
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.windows.getAll(function(windows)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Got error in SetWindowNormal() when getting all windows: ' + lastError.message);
               }
               
               let focused = focusedSecondsOrBool === true ||
                  (focusedSecondsOrBool !== false && focusedSecondsOrBool > 0);
               
               // find the currently focused window, or any other window if the sync window is focused
               let focusedID = null;
               let anyID = null;
               for (let i in windows)
               {
                  if (windows[i].focused)
                     focusedID = windows[i].id;
                  else if (windows[i].id != anyID && windows[i].id != windowID)
                     anyID = windows[i].id;
                  
                  if (windows[i].id == windowID)
                  {
                     Log_WriteInfo('Found target window: ' + GetVariableAsString(windows[i]));
                     // DRL I change here from checking for 'normal' since in some cases I was seeing 'maximized' even
                     // for a window that is not the full size of the screen.
                     if (windows[i].state != 'minimized' && windows[i].focused == focused &&
                        // if we're not careful about positioning the window we can get an error:
                        //    Invalid value for bounds. Bounds must be at least 50% within visible screen space.
                        windows[i].top < 100 && windows[i].left < 100 && windows[i].width >= minWidth)
                     {
                        // the requested window is already in an acceptable state
                        Log_WriteInfo('The window is already in the requested state');
                        try
                        {
                           if (handlerFocused) handlerFocused(windowID);
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                        try
                        {
                           if (handlerRestored) handlerRestored(windowID);
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                        return;
                     }
                     
                     if (minWidth == null || windows[i].width > minWidth)
                        minWidth = windows[i].width;
                     else
                        Log_WriteInfo('Will be applying width of ' + minWidth + ' due to lesser window width of ' + windows[i].width);
                  }
               }
               if (focusedID == null)
               {
                  Log_WriteInfo('Did not find a previous focused window so will be using ' + anyID + ' if needed');
                  focusedID = anyID;
               }
               
               if (handlerFocused && focused)
               {
                  Log_WriteInfo('Window ' + windowID + ' focus handler added');
                  Tabs._focusedWindowChangedHandlers[windowID] = handlerFocused;
               }
               
               if (focused)
                  Log_WriteInfo('Giving focus to window ' + windowID);
               else
                  Log_WriteInfo('Removing focus from window ' + windowID);
               // if we're not careful about positioning the window we can get an error:
               //    Invalid value for bounds. Bounds must be at least 50% within visible screen space.
               chrome.windows.update(windowID, {
                  state: 'normal',
                  focused: focused,
                  top: 50,
                  left: 50,
                  width: minWidth
               }, function()
               {
                  let lastError = chrome.runtime.lastError;
                  if (lastError != null)
                  {
                     Log_WriteError('Window ' + windowID + ' got error during SetWindowNormal: ' + lastError.message);
                  }
                  
                  if (focusedSecondsOrBool !== true)
                  {
                     if (focusedID == null)
                     {
                        Log_WriteError('We need to give focus back to another window but we did not find one to use in: ' + GetVariableAsString(windows));
                        delete Tabs._focusedWindowChangedHandlers[windowID];
                     }
                     else
                     {
                        // restore the previously focused window so we're not interrupting the user too much
                        setTimeout(function()
                        {
                           try
                           {
                              Log_WriteInfo('Restoring focus to window ' + focusedID);
                              chrome.windows.update(focusedID, {focused: true}, function()
                              {
                                 let lastError = chrome.runtime.lastError;
                                 if (lastError != null)
                                 {
                                    Log_WriteError('Window ' + focusedID + ' got error during SetWindowNormal restore: ' + lastError.message);
                                 }
                                 
                                 if (Tabs._focusedWindowChangedHandlers.hasOwnProperty(windowID))
                                    Log_WriteError('Window ' + windowID + ' still has focus handler set!');
                                 delete Tabs._focusedWindowChangedHandlers[windowID];
                                 try
                                 {
                                    if (handlerRestored) handlerRestored(windowID);
                                 }
                                 catch (e)
                                 {
                                    Log_WriteException(e);
                                 }
                              });
                           }
                           catch (e)
                           {
                              Log_WriteException(e);
                           }
                        }, (focusedSecondsOrBool !== false && focusedSecondsOrBool > 0)
                           ? focusedSecondsOrBool * 1000 : 10);
                     }
                  }
               });
            });
         }
         else
         {
            // this is the app background script
            
            Log_WriteError('SetWindowNormal() not implemented!');  // DRL FIXIT! Implement this for app!
            // We will likely fake two windows here, perhaps ID=1 for
            // the user tabs/webviews and ID=2 for the scraper tabs/webviews, and we'll assume the
            // user window will always have the focus.
         }
      },
      
      IsTabIdle: function(tabID, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.get({tabId: parseInt(tabID)}, function(tab)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Tab ' + tabID + ' got error in IsTabIdle(): ' + lastError.message);
                  try
                  {
                     if (handler) handler(false);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  return;
               }
               
               chrome.idle.queryState(timings.BROWSER_IDLE_TIME, function(state)
               {
                  try
                  {
                     if (handler) handler(state != 'active' || !tab.active);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               });
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('IsTabIdle() not implemented!');  // DRL FIXIT! Implement this for app!
            try
            {
               if (handler) handler(false);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      // returns PNG image data (encoded as base64) of active tab in specified window, or null on error
      CaptureWindow: function(windowID, handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            
            chrome.tabs.captureVisibleTab(parseInt(windowID), {format: "png"}, function(dataUrl)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Window ' + windowID + ' got error in CaptureWindow(): ' + lastError.message);
                  try
                  {
                     if (handler) handler(null);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  return;
               }
               
               if (dataUrl == null)
               {
                  Log_WriteError('Window ' + windowID + ' got no data in CaptureWindow()');
                  try
                  {
                     if (handler) handler(null);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
                  return;
               }
               
               assert(dataUrl.startsWith('data:image/png;base64,'));
               let data = dataUrl.substr(22);
               data = data.replace(' ', '+');
// DRL FIXIT! Decoding it in the client caused issues so we decode it on the server in IssueEditForm.php.
//                data = decodeBase64(data);
               try
               {
                  if (handler) handler(data);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
         else
         {
            // this is the app background script
            Log_WriteError('CaptureWindow() not implemented!');  // DRL FIXIT! Implement this for app!
            try
            {
               if (handler) handler(null);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      ExecuteScriptInTab: function(tabID, script)
      {
         // console.log("ExecuteScriptInTab",script) ;
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            if (Browser.IsExtensionV3())
               chrome.scripting.executeScript(
                  {
                     target: {tabId: tabID, allFrames: true},
                     args: [script],
                     func: (...args) => displayMainMenu(...args),   // DRL FIXIT? MANIFEST3 This is a bit of a hack that would be good to fix.
                  }
               );
            else
               chrome.tabs.executeScript(tabID, {code: script});
         }
         else
         {
            // this is the app background script
            Log_WriteError('ExecuteScriptInTab() not implemented!');  // DRL FIXIT! Implement this for app!
         }
      },
   };

if (Browser.IsExtension())
{
   chrome.tabs.onActivated.addListener(Tabs._ActiveTabChangedHandler);
   chrome.windows.onFocusChanged.addListener(Tabs._FocusedWindowChangedHandler);
}