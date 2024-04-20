const TrackedCategories = [
   'FetchContact',
   'Friend',
   'Unfriend',
   'GroupAccept',
   'GroupDecline',
   'GroupMemberAnswers',
   'GroupChatInvite',
   'SendMessage',
   'MakePost',
   'MakeComment',
   'FetchComment',
   'CreateCustomList',
   'UpdateCustomList',
];

function SyncSettingsInit()
{
   return {};
}

Timers.AddRepeatingTimer(60, function()
{
   if (ActionSelection_IsSystemIdleTime())
      return;
   Log_WriteInfo('SyncSettings alarm');
   
   for (let dataName of ScraperSyncs)
      _updateSyncSettings(dataName);   // this is async
});
/*
function reloadSearchSyncSettings()
{
   // we get notified after the edit form has closed so we don't have to wait
   
   OutstandingProcessing_Clear('SyncSettings');
   
   for (let dataName of ScraperSyncs)
      _updateSyncSettings(dataName);   // this is async
}
*/
async function _updateSyncSettings(dataName)
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('SyncSettings', timings.SYNC_SETTINGS_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
   
      let params = {
         'DataName': dataName,
         'Fields': 'SyncSettings',
      };
      
      ajax.get(getSyncUri(), params, function(resp, httpCode)
      {
         let sharedData = Storage.GetSharedVar('SyncSettings', SyncSettingsInit());
         let result = false;
         
         if (resp && httpCode == 200)
         {
            resp = Json_FromString(resp);
            for (let syncID in resp.data)
            {
               // we didn't specify an account ID so we'll get back all matching accounts, use the
               // first one, and we don't want NULL (not initialized on the DB?)
               if (resp.data[syncID].SyncSettings)
               {
                  sharedData[dataName] = resp.data[syncID].SyncSettings;
                  break;
               }
            }
            
            Storage.SetSharedVar('SyncSettings', sharedData);
            
            result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get sync settings: ' + httpCode);
         }
         else
         {
            Log_WriteError('Error getting sync settings: ' + httpCode);
         }
         
         OutstandingProcessing_End('SyncSettings');
         resolve(result);
      }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function SyncSettings_OnUserChanged()
{
   // force refresh from new account
   Storage.SetSharedVar('SyncSettings', SyncSettingsInit());
   
   // initiate fetching the new accounts data
   for (let dataName of ScraperSyncs)
      _updateSyncSettings(dataName);   // this is async
}

function SyncSettings_HasAvailableQuota(dataName, category)
{
   let sharedData = Storage.GetSharedVar('SyncSettings', SyncSettingsInit());
   
   if (!sharedData.hasOwnProperty(dataName))
   {
      Log_WriteWarning('SyncSettings not yet loaded for ' + dataName);
      return true;
   }
   
   if (!sharedData[dataName].hasOwnProperty(category))
   {
      if (!Utilities_ArrayContains(TrackedCategories, category))
         Log_WriteError('Unexpected category ' + category + ' for ' + dataName);
      return true;
   }
   
   return sharedData[dataName][category] - SyncStatistics_GetActionCount(dataName, category) > 0;
}

function SyncSettings_GetIdlePeriods(dataName)
{
   let sharedData = Storage.GetSharedVar('SyncSettings', SyncSettingsInit());
   
   if (!sharedData.hasOwnProperty(dataName))
      return [];
   
   if (!is_array(sharedData[dataName]['IdlePeriods']))
   {
      Log_WriteError('IdlePeriods is not an array for ' + dataName + ': ' + GetVariableAsString(sharedData[dataName]));
      return [];
   }
   
   return sharedData[dataName]['IdlePeriods'];
}
