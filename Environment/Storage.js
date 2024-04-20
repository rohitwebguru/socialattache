var Storage =
   {
      localValuesName: undefined,
      localValues: null,
      localValuesLoadedHandlers: [],
      tabValuesName: undefined,
      tabValues: null,
      tabValuesLoadedHandlers: [],
      sharedValues: null,
      sharedLastUpdated: 0,
      sharedValuesLoadedHandlers: [],
      
      _ConvertToLogString: function(value)
      {
         let temp = Json_ToString(value, null, 3);
         if (temp.length > 2048)
            temp = temp.length + ' bytes';
         return temp;
      },
      
      _MassageKeys: function(section, keys)
      {
         if (!Array.isArray(keys)) keys = [keys];
         
         let result = [];
         for (let key of keys)
         {
            result.push(section + '.' + key);
         }
         return result;
      },
      
      _MassageData: function(section, keys, data)
      {
         if (!Array.isArray(keys)) keys = [keys];
         
         for (let key of keys)
         {
            let massagedKey = section + '.' + key;
            if (data.hasOwnProperty(key))
            {
               data[massagedKey] = data[key];
               delete data[key];
            }
         }
         return data;
      },
      
      _UnmassageData: function(section, keys, data)
      {
         if (!Array.isArray(keys)) keys = [keys];
         
         for (let key of keys)
         {
            let massagedKey = section + '.' + key;
            if (data.hasOwnProperty(massagedKey))
            {
               data[key] = data[massagedKey];
               delete data[massagedKey];
            }
         }
         return data;
      },
      
      _CallLocalValuesLoadedHandlers: function()
      {
         for (let handler of Storage.localValuesLoadedHandlers)
         {
            try
            {
               handler();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      _CallTabValuesLoadedHandlers: function()
      {
         for (let handler of Storage.tabValuesLoadedHandlers)
         {
            try
            {
               handler();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      _CallSharedValuesLoadedHandlers: function()
      {
         for (let handler of Storage.sharedValuesLoadedHandlers)
         {
            try
            {
               handler();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }
      },
      
      AddLocalValuesLoadedListener: function(handler)
      {
         if (Storage.localValues != null && Storage.localValuesLoadedHandlers.length == 0)
         {
            // already loaded and handlers have been called
            setTimeout(function()
            {
               try
               {
                  handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 1);
         }
         else
            Storage.localValuesLoadedHandlers.push(handler);
      },
      
      AddTabValuesLoadedListener: function(handler)
      {
         if (Storage.tabValues != null && Storage.tabValuesLoadedHandlers.length == 0)
         {
            // already loaded and handlers have been called
            setTimeout(function()
            {
               try
               {
                  handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 1);
         }
         else
            Storage.tabValuesLoadedHandlers.push(handler);
      },
      
      AddSharedValuesLoadedListener: function(handler)
      {
         if (Storage.sharedValues != null && Storage.sharedValuesLoadedHandlers.length == 0)
         {
            // already loaded and handlers have been called
            setTimeout(function()
            {
               try
               {
                  handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 1);
         }
         else
            Storage.sharedValuesLoadedHandlers.push(handler);
      },
      
      IsAllStorageReady: function()
      {
         return Storage.localValues != null && Storage.sharedValues != null && (Browser.IsExtensionBackground() || Storage.tabValues != null);
      },
      
      // this standard storage is shared across the extension
      // keys can be a single string or an array of strings, returns an object with each key that was found
      GetStorage: function(section, keys, handler)
      {
         let massagedKeys = Storage._MassageKeys(section, keys);
         
         if (Browser.IsExtensionContent())
         {
            assert(0);  // should never be called by the content script
         }
         else if (Browser.IsExtensionBackground())
         {
            chrome.storage.local.get(massagedKeys, function(data)
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Error getting local storage in section "' + section + '": ' + lastError.message);
                  assert(data == null);
                  data = {};
               }
               
               data = Storage._UnmassageData(section, keys, data);
               
               if (handler) handler(data);
            });
         }
         else
         {
            Messaging.SendMessageToNativeApp({type: 'native-getStorage', value: massagedKeys}, function(data)
            {
               let response = data.value || null;
               if (response)
               {
                  response = Storage._UnmassageData(section, keys, response);
               }
               
               if (handler) handler(response);
            });
         }
      },
      
      // data contains key/value pairs to be set, doesn't affect other existing key/value pairs
      SetStorage: function(section, data, handler)
      {
         if (Browser.IsExtensionContent())
         {
            assert(0);  // should never be called by the content script
         }
         else if (Browser.IsExtensionBackground())
         {
            data = Storage._MassageData(section, Object.keys(data), data);
            
            chrome.storage.local.set(data, function()
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Error setting local storage in section "' + section + '": ' + lastError.message);
               }
               
               if (handler) handler();
            });
         }
         else
         {
            Messaging.SendMessageToNativeApp({type: 'native-setStorage', value: data}, function(data)
            {
               if (handler && data) handler();
            });
         }
      },
      
      // keys can be a single string or an array of strings
      RemoveStorage: function(keys, handler)
      {
         let massagedKeys = Storage._MassageKeys(section, keys);
         
         if (Browser.IsExtensionContent())
         {
            assert(0);  // should never be called by the content script
         }
         else if (Browser.IsExtensionBackground())
         {
            chrome.storage.local.remove(massagedKeys, function()
            {
               let lastError = chrome.runtime.lastError;
               if (lastError != null)
               {
                  Log_WriteError('Error removing local storage in section "' + section + '": ' + lastError.message);
               }
               
               if (handler) handler();
            });
         }
         else
         {
            Messaging.SendMessageToNativeApp({type: 'native-removeStorage', value: massagedKeys}, function(result)
            {
               if (handler) handler(result);
            });
         }
      },
      
      GetAllKeys: function(handler)
      {
         if (Browser.IsExtension())
         {
            assert(0);
            return;
         }
         
         Messaging.SendMessageToNativeApp({type: 'native-getAllStorageKeys'}, function(result)
         {
            let response = (result && result.value) || [];
            if (handler) handler(response);
         });
      },
      
      // local vars are distinct between the background and content scripts
      GetLocalVar: function(section, initializer)
      {
         assert(Storage.localValues != null);  // haven't loaded local data yet
         
         if (Storage.localValues == null || !(section in Storage.localValues))
            return Utilities_DeepClone(initializer);
         
         return Storage.localValues[section];
      },
      
      // local vars are distinct between the background and content scripts
      SetLocalVar: function(section, value)
      {
         if (Storage.localValues == null)
         {
            assert(0);  // haven't loaded local data yet
            return;
         }
         
         if (value === undefined)
            delete Storage.localValues[section];
         else
            Storage.localValues[section] = value;
         
         Log_SetMetaLogging('LocalVar ' + section, Storage._ConvertToLogString(value));
         
         if (Browser.IsExtension())
         {
            // this process can be shut down at any time so we must store the local data so it can be restored later
            
            if (Storage.localVarTimer)
               clearTimeout(Storage.localVarTimer);
            Storage.localVarTimer = setTimeout(function()
            {
               try
               {
                  Storage.localVarTimer = null;
                  chrome.storage.local.set({[Storage.localValuesName]: Storage.localValues}, function()
                  {
//                  if (Browser.IsExtensionContent())
//                     Log_WriteInfo('Saved local content values');
//                  else
//                     Log_WriteInfo('Saved local background values');
                  });
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 1);
         }
      },
      
      // tab vars are distinct to a specific tab and can only be used from a content script
      GetTabVar: function(section, initializer)
      {
         assert(Storage.tabValues != null);  // haven't loaded tab data yet
         
         if (Storage.tabValues == null || !(section in Storage.tabValues))
            return Utilities_DeepClone(initializer);
         
         return Storage.tabValues[section];
      },
      
      // tab vars are distinct to a specific tab and can only be used from a content script
      SetTabVar: function(section, value)
      {
         assert(Browser.IsExtensionContent());
         if (Storage.tabValues == null)
         {
            assert(0);  // haven't loaded tab data yet
            return;
         }
         
         if (value === undefined)
            delete Storage.tabValues[section];
         else
            Storage.tabValues[section] = value;
         
         Log_SetMetaLogging('TabVar ' + section, Storage._ConvertToLogString(value));
         
         if (Browser.IsExtension())
         {
            // this process can be shut down at any time so we must store the tab data so it can be restored later
            
            if (Storage.tabVarTimer)
               clearTimeout(Storage.tabVarTimer);
            Storage.tabVarTimer = setTimeout(function()
            {
               try
               {
                  Storage.tabVarTimer = null;
                  chrome.storage.local.set({[Storage.tabValuesName]: Storage.tabValues}, function()
                  {
//                  Log_WriteInfo('Saved tab values');
                  });
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 1);
         }
      },
      
      // shared vars are shared between the background and content scripts
      GetSharedVar: function(section, initializer)
      {
         assert(Storage.sharedValues != null);  // haven't loaded shared data yet
         
         if (Storage.sharedValues == null || !(section in Storage.sharedValues))
            return Utilities_DeepClone(initializer);
         
         return Storage.sharedValues[section];
      },
      
      // shared vars are shared between the background and content scripts
      SetSharedVar: function(section, value)
      {
         // the content scripts have read only access to shared storage in order to avoid thread contention
         assert(!Browser.IsExtensionContent());
         
         if (Storage.sharedValues == null)
         {
            assert(0);  // haven't loaded shared data yet
            return;
         }
         
         if (value === undefined)
            delete Storage.sharedValues[section];
         else
            Storage.sharedValues[section] = value;
         
         Storage.sharedLastUpdated = Date.now();
         
         Log_SetMetaLogging('SharedVar ' + section, Storage._ConvertToLogString(value));
         
         if (Browser.IsExtension())
         {
            // this process can be shut down at any time so we must store the shared data so it can be restored later
            
            if (Storage.sharedVarTimer)
               clearTimeout(Storage.sharedVarTimer);
            Storage.sharedVarTimer = setTimeout(function()
            {
               try
               {
                  Storage.sharedVarTimer = null;
                  chrome.storage.local.set({['_Shared_']: Storage.sharedValues}, function()
                  {
//                  Log_WriteInfo('Saved shared values');
                     
                     chrome.storage.local.set({['_Shared_LastUpdated_']: Storage.sharedLastUpdated}, function()
                     {
//                     Log_WriteInfo('Saved shared values last updated');
                     });
                  });
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 500);
         }
      }
   };

if (Browser.IsExtension())
{
   Storage.localValuesName = Browser.IsExtensionBackground() ? 'BackgroundVars' : 'ContentVars';
   chrome.storage.local.get(Storage.localValuesName, function(result)
   {
//      Log_WriteInfo('Loaded initial local values');
      
      if (result.hasOwnProperty(Storage.localValuesName))
         Storage.localValues = result[Storage.localValuesName];
      else
         Storage.localValues = {};
      
      Storage._CallLocalValuesLoadedHandlers();
   });
   chrome.storage.local.get('_Shared_', function(result)
   {
//      Log_WriteInfo('Loaded initial shared values');
      
      if (result.hasOwnProperty('_Shared_'))
         Storage.sharedValues = result['_Shared_'];
      else
         Storage.sharedValues = {};
      
      Storage._CallSharedValuesLoadedHandlers();
   });
   if (Browser.IsExtensionContent())
   {
      // in the content script we have to periodically reload the shared data as it might have been changed
      // by the background script
      
      setInterval(function()
      {
         try
         {
            chrome.storage.local.get('_Shared_LastUpdated_', function(lastUpdated)
            {
               if (lastUpdated.hasOwnProperty('_Shared_LastUpdated_') &&
                  lastUpdated['_Shared_LastUpdated_'] > Storage.sharedLastUpdated)
               {
                  chrome.storage.local.get('_Shared_', function(result)
                  {
//                     Log_WriteInfo('Loaded shared values for content');
                     
                     if (result.hasOwnProperty('_Shared_'))
                        Storage.sharedValues = result['_Shared_'];
                     else
                        Storage.sharedValues = {};
                     
                     Storage.sharedLastUpdated = lastUpdated['_Shared_LastUpdated_'];
                  });
               }
            });
         }
         catch (e)
         {
            // DRL FIXIT! I'm not sure why we get this here but it isn't handled in the augmentation script?
            if (e.message.indexOf('Extension context invalidated') != -1 ||
               e.message.indexOf('message channel closed') != -1 ||
               e.message.indexOf('message port closed') != -1)
            {
               window.location.reload();  // background script unloaded or reloaded
            }
            else
               Log_WriteException(e);
         }
      }, 5 * 1000);
   }
   
   // we'll do this a tiny bit later because Timers.js, Tabs.js and ContentUtils.js are loaded after Storage.js
   setTimeout(function()
   {
      try
      {
         if (Browser.IsExtensionContent())
         {
            reqGetTabID()
               .then(tabID =>
               {
                  Storage.tabValuesName = 'TabVars_' + tabID;
                  
                  chrome.storage.local.get(Storage.tabValuesName, function(result)
                  {
//                     Log_WriteInfo('Loaded initial values for tab ' + tabID);
                     
                     if (result.hasOwnProperty(Storage.tabValuesName))
                        Storage.tabValues = result[Storage.tabValuesName];
                     else
                        Storage.tabValues = {};
                     
                     Storage._CallTabValuesLoadedHandlers();
                  });
               })
               .catch(e =>
               {
                  Log_WriteException(e);
               });
         }
         
         if (Browser.IsExtensionBackground())
         {
            Timers.AddRepeatingTimer(300, function()
            {
               Log_WriteInfo('Storage alarm');
               chrome.storage.local.getBytesInUse(null, function(bytes)
               {
                  Log_WriteInfo('Local storage is using ' + bytes + ' bytes');
               });
            });
            
            Tabs.AddTabRemovedListener(function(tabId)
            {
               let tabValuesName = 'TabVars_' + tabId;
               chrome.storage.local.remove(tabValuesName, function()
               {
                  Log_WriteInfo('Removed tab storage for tab ' + tabId);
               });
            });
            
            Tabs.AddTabReplacedListener(function(addedTabId, removedTabId)
            {
               let tabOldValuesName = 'TabVars_' + removedTabId;
               let tabNewValuesName = 'TabVars_' + addedTabId;
               
               chrome.storage.local.get(tabOldValuesName, function(result)
               {
                  if (result.hasOwnProperty(tabOldValuesName))
                  {
                     result[tabNewValuesName] = result[tabOldValuesName];
                     delete result[tabOldValuesName];
                     chrome.storage.local.set({[tabNewValuesName]: result}, function()
                     {
                        chrome.storage.local.remove(tabOldValuesName, function()
                        {
                           Log_WriteInfo('Moved tab storage for tab ' + removedTabId + ' to tab ' + addedTabId);
                        });
                     });
                  }
               });
            });
         }
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   }, 500);
}
else
{
   Storage.localValues = {};
   Storage.sharedValues = {};
   Storage.tabValues = {};
}
