// these are maintained indexed by date "YYYY/MM/DD"
const DefaultStatistics = {
   'FacebookScrape': {
      'FetchContact': {'DailyCount': 0, 'ThrottledAt': null},
      'Friend': {'DailyCount': 0, 'ThrottledAt': null},
      'Unfriend': {'DailyCount': 0, 'ThrottledAt': null},
      'GroupAccept': {'DailyCount': 0, 'ThrottledAt': null},
      'GroupDecline': {'DailyCount': 0, 'ThrottledAt': null},
      'GroupMemberAnswers': {'DailyCount': 0, 'ThrottledAt': null},
      'GroupChatInvite': {'DailyCount': 0, 'ThrottledAt': null},
      'SendMessage': {'DailyCount': 0, 'ThrottledAt': null},
      'MakePost': {'DailyCount': 0, 'ThrottledAt': null},
      'MakeComment': {'DailyCount': 0, 'ThrottledAt': null},
      // Are the following used yet?
      'FetchComment': {'DailyCount': 0, 'ThrottledAt': null},
      'CreateCustomList': {'DailyCount': 0, 'ThrottledAt': null},
      'UpdateCustomList': {'DailyCount': 0, 'ThrottledAt': null},
   },
   'InstagramScrape': {
      'FetchContact': {'DailyCount': 0, 'ThrottledAt': null},
      'SendMessage': {'DailyCount': 0, 'ThrottledAt': null},
      'MakePost': {'DailyCount': 0, 'ThrottledAt': null},
   },
   'LinkedInScrape': {
      'FetchContact': {'DailyCount': 0, 'ThrottledAt': null},
      'SendMessage': {'DailyCount': 0, 'ThrottledAt': null},
      'MakePost': {'DailyCount': 0, 'ThrottledAt': null},
   },
   'PinterestScrape': {
      'FetchContact': {'DailyCount': 0, 'ThrottledAt': null},
      'SendMessage': {'DailyCount': 0, 'ThrottledAt': null},
      'MakePost': {'DailyCount': 0, 'ThrottledAt': null},
   },
   'TikTokScrape': {
      'FetchContact': {'DailyCount': 0, 'ThrottledAt': null},
      'SendMessage': {'DailyCount': 0, 'ThrottledAt': null},
      'MakePost': {'DailyCount': 0, 'ThrottledAt': null},
   },
   'TwitterScrape': {
      'FetchContact': {'DailyCount': 0, 'ThrottledAt': null},
      'SendMessage': {'DailyCount': 0, 'ThrottledAt': null},
      'MakePost': {'DailyCount': 0, 'ThrottledAt': null},
   },
};

var LastStatisticsUpdated = {};

// returns just the date portions of today in a format the matches the "Date" field of scraped messages
function SyncStatistics_GetNowDateOnly()
{
   // reset on a new day
   let date = new Date();
   return sprintf('%04d-%02d-%02d', date.getFullYear(), date.getMonth() + 1, date.getDate());
}

// DRL FIXIT! Need to get from server when it's NULL, when changing between active/inactive, when switching accounts and when waking from sleep!

function SyncStatisticsInit()
{
   return {};
}

// when the browser is closed then launched, or the extension is installed/updated and launched
Environment.AddStartupListener(function()
{
   Log_WriteInfo('SyncDevices app startup');
   
   Storage.AddSharedValuesLoadedListener(async function()
   {
      // a different device might have updated the stats
      for (let dataName of ScraperSyncs)
         _updateSyncStatistics(dataName); // this is async
   });
});

function SyncStatistics_WakeFromSleep()
{
   // a different device might have updated the stats
   for (let dataName of ScraperSyncs)
      _updateSyncStatistics(dataName); // this is async
}

function SyncStatistics_OnDeviceActiveChanged(isActive)
{
   // a different device might have updated the stats
   if (isActive)
      for (let dataName of ScraperSyncs)
         _updateSyncStatistics(dataName); // this is async
}

function SyncStatistics_OnUserChanged()
{
   let sharedData = SyncStatisticsInit();
   
   Storage.SetSharedVar('SyncStatistics', sharedData);
   
   for (let dataName of ScraperSyncs)
      _updateSyncStatistics(dataName); // this is async
}

function SyncStatistics_PrepData(dataName, category, date, sharedData)
{
   if (!sharedData.hasOwnProperty(dataName))
   {
      Log_WriteInfo('Sync ' + dataName + ' has no statistics yet');
      sharedData[dataName] = {};
   }
   
   // reset on a new day
   if (!sharedData[dataName].hasOwnProperty(date))
   {
      Log_WriteInfo('Sync ' + dataName + ' has no statistics yet for ' + date);
      sharedData[dataName][date] = Utilities_DeepClone(DefaultStatistics[dataName]);
      
      // only keep the last two weeks
      while (Object.keys(sharedData[dataName]).length > 14)
      {
         delete sharedData[dataName][Object.keys(sharedData[dataName]).sort()[0]];
      }
   }
   
   if (!sharedData[dataName][date].hasOwnProperty(category))
   {
      Log_WriteError('Sync ' + dataName + ' is missing preset category ' + category);
      sharedData[dataName][date][category] = {'DailyCount': 0, 'ThrottledAt': null};
   }
}

function SyncStatistics_ActionTaken(dataName, category, count = 1)
{
   if (!Utilities_ArrayContains(TrackedCategories, category))
      return;
   
   let sharedData = Storage.GetSharedVar('SyncStatistics', SyncStatisticsInit());
   
   let date = SyncStatistics_GetNowDateOnly();
   SyncStatistics_PrepData(dataName, category, date, sharedData);
   
   sharedData[dataName][date][category]['DailyCount'] += count;
   
   Storage.SetSharedVar('SyncStatistics', sharedData);
}

function SyncStatistics_ActionThrottled(dataName, category)
{
   if (!Utilities_ArrayContains(TrackedCategories, category))
      return;
   
   let sharedData = Storage.GetSharedVar('SyncStatistics', SyncStatisticsInit());
   
   let date = SyncStatistics_GetNowDateOnly();
   SyncStatistics_PrepData(dataName, category, date, sharedData);
   
   if (sharedData[dataName][date][category]['ThrottledAt'] === null)
   {
      sharedData[dataName][date][category]['ThrottledAt'] = sharedData[dataName][date][category]['DailyCount'];
      Storage.SetSharedVar('SyncStatistics', sharedData);
   }
}

function SyncStatistics_GetActionCount(dataName, category)
{
   if (!Utilities_ArrayContains(TrackedCategories, category))
      return 0;
   
   let sharedData = Storage.GetSharedVar('SyncStatistics', SyncStatisticsInit());
   
   let date = SyncStatistics_GetNowDateOnly();
   SyncStatistics_PrepData(dataName, category, date, sharedData);
   
   return sharedData[dataName][date][category]['DailyCount'];
}

function SyncStatistics_GetForUpdate(dataName)
{
   let sharedData = Storage.GetSharedVar('SyncStatistics', SyncStatisticsInit());
   
   let date = SyncStatistics_GetNowDateOnly();
   let now = Date.now();
   
   // the category below doesn't make a difference as long as it's valid
   SyncStatistics_PrepData(dataName, TrackedCategories[0], date, sharedData);
   
   if (!LastStatisticsUpdated.hasOwnProperty(dataName) ||
      LastStatisticsUpdated[dataName] + (timings.SYNC_STATISTICS_SEND_DELAY * 1000) < now)
   {
      LastStatisticsUpdated[dataName] = now;
      return sharedData[dataName];
   }
   
   return null;
}

async function _updateSyncStatistics(dataName)
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('SyncStatistics', 0))
      {
         resolve(false);
         return;
      }
      
      let params = {
         'DataName': dataName,
         'Fields': 'SyncStatistics',
      };
      
      ajax.get(getSyncUri(), params, function(resp, httpCode)
      {
         let sharedData = Storage.GetSharedVar('SyncStatistics', SyncStatisticsInit());
         let result = false;
         
         if (resp && httpCode == 200)
         {
            resp = Json_FromString(resp);
            for (let syncID in resp.data)
            {
               // we didn't specify an account ID so we'll get back all matching accounts, use the first one
               if (resp.data[syncID].SyncStatistics != null)
               {
                  sharedData[dataName] = resp.data[syncID].SyncStatistics;
                  break;
               }
            }
            
            Storage.SetSharedVar('SyncStatistics', sharedData);
            
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
         
         OutstandingProcessing_End('SyncStatistics');
         resolve(result);
      }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

