function TagsInit()
{
   return {
      contactTags: {}
   };
}

if (Browser.IsExtensionBackground())
{
   Timers.AddRepeatingTimer(60, async function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('Tags alarm');
      _updateContactTags();   // this is async
   });
}

// DRL FIXIT! Not async.
async function reqGetContactTags()
{
   let sharedData = Storage.GetSharedVar('Tags', TagsInit());
   
   return sharedData.contactTags;
}

async function _updateContactTags()
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('Tags', timings.CONTACT_TAGS_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
      
      var params = {
         'Fields': 'TagID,Name'
      };
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/ContactsTags.json')
         : Form_RootUri + '/v2/Contacts/Tags';
      
      ajax.get(url, params, function(resp, httpCode)
      {
         let result = false;
         
         if (resp && httpCode == 200)
         {
            let sharedData = Storage.GetSharedVar('Tags', TagsInit());
            
            sharedData.contactTags = {};
            
            resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
            for (let tagID in resp.data)
            {
               sharedData.contactTags[tagID] = resp.data[tagID].Name;
            }
            
            Storage.SetSharedVar('Tags', sharedData);
            
            result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get contact tags: ' + httpCode);
         }
         else
         {
            Log_WriteError('Error getting contact tags: ' + httpCode);
         }
         
         OutstandingProcessing_End('Tags');
         resolve(result);
      }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Tags_OnUserChanged()
{
   // force refresh from new account
   Storage.SetSharedVar('Tags', TagsInit());
   
   // initiate fetching the new accounts data
   _updateContactTags();   // this is async
}


