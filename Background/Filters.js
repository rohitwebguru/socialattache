function FiltersInit()
{
   return {
      searchFilters: {}
   };
}

if (Browser.IsExtensionBackground())
{
   Timers.AddRepeatingTimer(60, function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('Filters alarm');
      _updateSearchFilters();     // this is async
   });
}

// DRL FIXIT! Not async.
async function reqGetSearchFilterNames()
{
   let sharedData = Storage.GetSharedVar('Filters', FiltersInit());
   
   let result = {};
   for (let filterID in sharedData.searchFilters)
   {
      result[filterID] = sharedData.searchFilters[filterID].Name;
   }
   return result;
}

// DRL FIXIT! Not async.
async function reqGetSearchFilter(filterID)
{
   let sharedData = Storage.GetSharedVar('Filters', FiltersInit());
   
   return sharedData.searchFilters.hasOwnProperty(filterID) ? sharedData.searchFilters[filterID] : null;
}

async function reqReloadSearchFilters()
{
   // must be handled by the background script
   // DRL FIXIT? Do we need a little delay here like we do for reqReloadContactInfo()?
   await Messaging.SendMessageToBackground({type: 'reloadSearchFilters'});
}

function reloadSearchFilters()
{
   // we get notified after the edit form has closed so we don't have to wait
   
   OutstandingProcessing_Clear('Filters');
   
   _updateSearchFilters(); // this is async
}

async function _updateSearchFilters()
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('Filters', timings.FILTERS_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
      
      var params = {
         'Fields': 'SearchFilterID,Name,SearchFilter',
         'Filter': Json_ToString({
            'Category': "'fb_messenger'"
         })
      };
      const url = Form_RootUri + '/v2/SearchFilters';
      
      ajax.get(url, params, function(resp2, httpCode)
      {
         let sharedData = Storage.GetSharedVar('Filters', FiltersInit());
         let result = false;
         
         if (resp2 && httpCode == 200)
         {
            sharedData.searchFilters = {};
            
            resp2 = Json_FromString(resp2);
            for (let filterID in resp2.data)
            {
               sharedData.searchFilters[filterID] = resp2.data[filterID];
            }
            
            Storage.SetSharedVar('Filters', sharedData);
            
            result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get filter infos: ' + httpCode);
         }
         else
         {
            Log_WriteError('Error getting filters info: ' + httpCode);
         }
         
         OutstandingProcessing_End('Filters');
         resolve(result);
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Filters_OnUserChanged()
{
   // force refresh from new account
   Storage.SetSharedVar('Filters', FiltersInit());
   
   // initiate fetching the new accounts data
   _updateSearchFilters();    // this is async
}

