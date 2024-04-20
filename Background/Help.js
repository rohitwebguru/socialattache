function HelpInit()
{
   return {
      help: {}
   };
}

if (Browser.IsExtensionBackground())
{
   Timers.AddRepeatingTimer(60, async function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('Help alarm');
      _updateHelpItems();     // this is async
   });
}

// DRL FIXIT! Not async.
async function reqGetHelpItems()
{
   let sharedData = Storage.GetSharedVar('Help', HelpInit());
   
   return sharedData.help
}

async function reqMarkHelpItemRead(path)
{
   // must be handled by the background script
   await Messaging.SendMessageToBackground({type: 'markHelpItemRead', path: path});
}

function markHelpItemRead(path)
{
   let sharedData = Storage.GetSharedVar('Help', HelpInit());
   
   if (sharedData.help.hasOwnProperty(path))
   {
      for (let i in sharedData.help[path])
      {
         if (sharedData.help[path][i].IsDefaultShow)
         {
            sharedData.help[path][i].IsDefaultShow = false;   // the first one should have been shown
            Storage.SetSharedVar('Help', sharedData);
            break;
         }
      }
   }
}

async function _updateHelpItems()
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('Help', timings.HELP_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
      
      var params = {
         'Fields': 'Name,IsDefaultShow,BookmarkPosition,BookmarkFinished,ResourceURL'
      };
      const url = Form_RootUri + '/v2/Help';
      
      ajax.get(url, params, function(resp, httpCode)
      {
         let sharedData = Storage.GetSharedVar('Help', HelpInit());
         let result = false;
         
         if (resp && httpCode == 200)
         {
            sharedData.help = {};
            
            resp = Json_FromString(resp);
            for (let id in resp.data)
            {
               let item = resp.data[id];
               let path = item.Name.split('/');
               
               // the key ignores the venture and the root (Team, Personal, etc.) and the filename
               let key = path.slice(2, path.length - 1).join('/');
               
               // the name is just the venture and the file name
               let name = path.slice(0, 1).concat(path.slice(path.length - 1)).join('/');
               
               if (!sharedData.help.hasOwnProperty(key))
                  sharedData.help[key] = [];
               sharedData.help[key].push({
                  'Name': name,
                  'IsDefaultShow': item.IsDefaultShow && item.BookmarkPosition == null,
                  'ResourceURL': item.ResourceURL
               });
            }
            
            Storage.SetSharedVar('Help', sharedData);
            
            result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get help: ' + httpCode);
         }
         else
         {
            Log_WriteError('Error getting help: ' + httpCode);
         }
         
         OutstandingProcessing_End('Help');
         resolve(result);
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Help_OnUserChanged()
{
   // force refresh from new account
   Storage.SetSharedVar('Help', HelpInit());
   
   // initiate fetching the new accounts data
   _updateHelpItems();     // this is async
}


