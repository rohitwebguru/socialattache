var Environment =
   {
      ApplicationName: null,
      ApplicationVersion: null,
      ApplicationStartedHandlers: [],
      
      GetAssetUrl: function(filename)
      {
         if (Browser.IsExtension())
         {
            return chrome.runtime.getURL(filename);
         }
         else
         {
            // this is the app background script
            
            if ((typeof (ExtensionUrl) !== "undefined" && ExtensionUrl))
            {
               return ExtensionUrl + filename;
            }
            else
            {
               return webvViewDetails.ExtensionUrl + filename;
            }
         }
      },
      
      // when the app or extension is installed (or re-installed), or the extension or Chrome is updated
      AddInstalledListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            
            chrome.runtime.onInstalled.addListener(function(details)
            {
               Log_WriteInfo('Application installed')
               
               try
               {
                  if (details.reason == 'install') handler();
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
            
            Storage.GetAllKeys(function(data)
            {
               try
               {
                  if (data.length === 0) handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            });
         }
      },
      
      // when the extension is launched (app or browser is opened, or the extension has just been installed or updated)
      AddStartupListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            Environment.ApplicationStartedHandlers.push(handler);
            
            chrome.runtime.onStartup.addListener(function()
            {
               if (Environment.ApplicationStartedHandlers == null)
                  Log_WriteWarning('Application already started!')
               else
               {
                  Log_WriteInfo('Application started')
                  for (let handler of Environment.ApplicationStartedHandlers)
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
                  Environment.ApplicationStartedHandlers = null;
               }
            });
            chrome.runtime.onInstalled.addListener(function(details)
            {
               // catch when the app is updated or Chrome is updated as the above doesn't fire for those
               if (details.reason != 'install')
               {
                  if (Environment.ApplicationStartedHandlers == null)
                     Log_WriteWarning('Application already started (' + details.reason + ')!')
                  else
                  {
                     Log_WriteInfo('Application updated (' + details.reason + ')')
                     for (let handler of Environment.ApplicationStartedHandlers)
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
                     Environment.ApplicationStartedHandlers = null;
                  }
               }
            });
         }
         else
         {
            // this is the app background script
            
            Messaging.SendMessageToNativeApp({type: 'native-isFirstStartupRequest'}, function(result)
            {
               if (result && result.value === true)
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
            });
         }
      },
      
      /// callback fired when the user requests the main menu to be opened
      AddDisplayMainMenuListener: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            (chrome.action ? chrome.action : chrome.browserAction).onClicked.addListener(function(tab)
            {
               try
               {
                  handler(tab);
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
            
            // DRL NOTE: We do have a commented out workaround in MainMenu.js we can use in the mean time!
            Log_WriteError('AddDisplayMainMenuListener() not implemented!');
         }
      },
      
      IsPinned: async function()
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            /* Only available in Manifest V3
                     let userSettings = await new Promise( (resolve, reject) =>
                     {
                        chrome.action.getUserSettings(function(userSettings)
                        {
                           resolve(userSettings);
                        });
                     })
                     .catch(e => { Log_WriteException(e); throw e; });
                     return userSettings.isOnToolbar;
            */
            return true;
         }
         else
         {
            return true;
         }
      },
      
      // This should return the languages configured for the OS but we don't have access to these so we
      // are currently returning the languages guessed from the active page.
      // provides the languages as an array of ISO language codes such as "en" or "fr-CA"
      ClientLanguages: function(handler)
      {
         if (Browser.IsExtensionContent())
         {
            // this is the Chrome extension content script
            assert(0);
         }
         else if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            chrome.tabs.detectLanguage(undefined, function(language)
            {
               if (language == null || language == 'und')
               {
                  // DRL FIXIT! We will need to fix this when we go international. Maybe we should check a different tab?
                  Log_WriteWarning('The language cannot be obtained from the current tab, using en-US!');
                  language = 'en-US';
               }
               try
               {
                  handler([language]);
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
            
            Messaging.SendMessageToNativeApp({type: 'native-getLanguage'}, function(result)
            {
               let languages = (result && result.value);
               if (languages)
               {
                  assert(languages != null);
                  if (!Array.isArray(languages)) languages = [languages];
                  try
                  {
                     handler(languages);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }
            });
         }
      },
   };

if (Browser.IsExtension())
{
   // this is the Chrome extension content or background script
   let manifest = chrome.runtime.getManifest();
   Environment.ApplicationName = manifest.name;
   Environment.ApplicationVersion = manifest.version;
   
   if (Browser.IsExtensionBackground())
   {
      // there are cases where the app started event doesn't fire so this is a workaround
      // otherwise the extension will miss some initialization code
      
      setTimeout(function()
      {
         try
         {
            if (Environment.ApplicationStartedHandlers != null)
            {
               Log_WriteInfo('Application started event not fired yet, faking it!')
               for (let handler of Environment.ApplicationStartedHandlers)
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
               Environment.ApplicationStartedHandlers = null;
            }
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      }, 2000);
   }
}
else
{
   // this is the app background script
}
