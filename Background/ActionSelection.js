// sorted by priority and make sure items that should take turns have the same priority so one doesn't
// steal all the processing time, but keep in mind SyncCommands don't have a lastSynced and were also
// already prioritized on the server
// NOTE: The number after the colon does not matter except for those that are the same, it's the
// order in this list that distinguishes highest to lowest priority.
const CategoryPriorities = {
   // NOTE: This list should be in the same order as GetSyncCommands() query in the PHP!
   
   // those items that affect the recipient should come first for responsiveness
   'SendMessage': 1,
   'MakePost': 1,
   'MakeComment': 1,
   
   'GroupAccept': 2,
   'GroupDecline': 2,
   'GroupChatInvite': 2,
   
   'CreateCustomList': 3,
   'UpdateCustomList': 4,
   
   // these medium priority actions share the processing and need to take turns
   // otherwise one-off items like FetchContact will never get done while repeating
   // items like WatchedPosts steal all the processing
   'Messages': 6,
   'WatchedPosts': 6,
   'WatchedGroupRequests': 6,
   'WatchedGroupMembers': 6,
   'WatchedCustomLists': 6,
   'Friend': 6,
   'Unfriend': 6,
   'GroupMemberAnswers': 6,
   'FetchContact': 6,
   
   // these are low priority actions
   'WatchedGroupStaff': 7,
   'FetchComment': 7,         // this is for a comment imported via API but missing the "From", and there could be a lot of these
// We no longer import friends, as we import friend lists individually.
//    'Friends': 14,
};

// these actions increment the count on each action (and not on each page load)
const CategoryCountsOnAction = [
   'SendMessage',
   'MakePost',
   'MakeComment',
   'GroupAccept',
];

function ActionSelectionInit()
{
   return {
      lastResetDate: null,    // local zone date string (no time)
      dailyCategoryCounts: {}
   };
}

// chooses the next action and initializes the "category" field in the returned object
function ActionSelection_ChooseNextAction(dataName, actions)
{
   let now = Date.now();
   let action = null;
   
   if (ActionSelection_IsSyncIdleTime(dataName))
   {  // if we're supposed to be idle don't do anything
      return {action: 'wait', seconds: timings.SYSTEM_IDLE_DELAY};
   }
   
   let sharedData = Storage.GetSharedVar('ActionSelection', ActionSelectionInit());
   
   // reset on a new day
   let date = new Date();
   date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
   if (sharedData.lastResetDate != date)
   {
      Log_WriteInfo('Resetting daily maximums on ' + date);
      sharedData.lastResetDate = date;
      sharedData.dailyCategoryCounts = {};
   }
   
   // sanity check to make sure our priorities contain all the categories
   for (const category in actions)
      if (!CategoryPriorities.hasOwnProperty(category))
         Log_WriteError('Missing entry in CategoryPriorities: ' + category);
   
   for (const category in actions)
   {
      if (Utilities_ArrayContains(TrackedCategories, category) && !SyncSettings_HasAvailableQuota(dataName, category))
         delete actions[category];
   }
   
   // if the action is scraping messages, and it is the initial sync (which could take a very
   // long time), we'll let other actions take precedence
   if (actions.hasOwnProperty('Messages') && (now - actions['Messages'].lastSynced) >= SecondsPerWeek * 4 * 1000)
   {
      if (Object.keys(actions).length == 1)
      {
         action = actions['Messages'];
         action.category = 'Messages';
      }
      delete actions['Messages'];
   }
   
   // if we had already started an action get its category
   let category = ActionCheck_GetCategory(dataName);
   
   // if the action is scraping group members, and it is the initial sync (which could take a very
   // long time), we'll give it precedence as starting over is very expensive
   if (actions.hasOwnProperty('WatchedGroupMembers') && (now - actions['WatchedGroupMembers'].lastSynced) >= SecondsPerWeek * 4 * 1000)
   {
      actions = {['WatchedGroupMembers']: actions['WatchedGroupMembers']};
   }
   
   // find all the items of the single highest priority
   let result = {};
   let lastPriority = -1;
   for (category in CategoryPriorities)
   {  // looping through the priorities from the highest to lowest
      if (lastPriority != -1 && lastPriority != CategoryPriorities[category])
         break;  // we have at least one item of the higher priority so we can stop looking
      
      // if we have an action of this priority then keep it
      if (actions.hasOwnProperty(category))
      {
         result[category] = actions[category];
         lastPriority = CategoryPriorities[category];
      }
   }
   
   // at this point "result" contains actions of the same (the highest we found) priority
   for (const category in result)
   {
      if (!result[category].hasOwnProperty('lastSynced'))
      {
         if (result[category].hasOwnProperty('command'))
         {
            // use the command Date for the comparison below
            result[category].lastSynced = stringToTimestamp(result[category].command.Date);
         }
         else
         {
            // if there's no lastSynced property and no date do it now
            if (!result[category].hasOwnProperty('message'))
               Log_WriteError('Sync item is missing a "lastSynced" and a "Date": ' + GetVariableAsString(result[category]));
            action = result[category];
            action.category = category;
            break;
         }
      }
      // otherwise the most important task (of the same priority) is the one that has been longest since last run
      if (action == null || result[category].lastSynced < action.lastSynced)
      {
         action = result[category];
         action.category = category;
      }
   }

//    Log_SetMetaLogging('Daily Category Counts', Json_ToString(sharedData.dailyCategoryCounts, null, 3))
   
   Storage.SetSharedVar('ActionSelection', sharedData);
   
   return action;
}

function ActionSelection_GetSkippedMessageTypes(dataName)
{
   let sharedData = Storage.GetSharedVar('ActionSelection', ActionSelectionInit());
   
   let result = [];
   
   for (let category of ['SendMessage', 'MakePost', 'MakeComment'])
   {
      if (!SyncSettings_HasAvailableQuota(dataName, category))
      {
         if (category == 'SendMessage')
            result = result.concat(['fbp_msg', 'ig_msg']);
         else if (category == 'MakePost')
            result = result.concat(['fbp_post', 'fbp_gpost', 'fbp_story', 'ig_post']);
         else if (category == 'MakeComment')
            result = result.concat(['fbp_comment']);
      }
   }
   
   return result;
}

function ActionSelection_GetSkippedSyncCommandTypes(dataName)
{
   let sharedData = Storage.GetSharedVar('ActionSelection', ActionSelectionInit());
   
   let result = [];
   
   for (let category of ['FetchContact', 'Friend', 'Unfriend', 'GroupAccept', 'GroupDecline',
      'GroupMemberAnswers', 'GroupChatInvite'])
   {
      if (!SyncSettings_HasAvailableQuota(dataName, category))
      {
         result.push(category);  // categories are the same as the commands
      }
   }
   
   return result;
}

function ActionSelection_ActionEvent(dataName, category, isPerformingAction)
{
   if (Utilities_ArrayContains(TrackedCategories, category) &&
      // counting sent messages is handled on import (via Syncs.js) so that we also include messages sent manually
      category != 'SendMessage' &&
      // some count the number of page loads whereas others count the number of actions performed
      Utilities_ArrayContains(CategoryCountsOnAction, category) == isPerformingAction)
   {
      SyncStatistics_ActionTaken(dataName, category);
   }
}

function ActionSelection_ActionThrottled(dataName, category)
{
   if (TrackedCategories.hasOwnProperty(category))
   {
      SyncStatistics_ActionThrottled(dataName, category);
   }
}

function ActionSelection_IsSystemIdleTime()
{
   if (!navigator.onLine)
      return true;
   
   const now = new Date();
   const time = now.getHours() * SecondsPerHour + now.getMinutes() * SecondsPerMinute + now.getSeconds();
   
   let result = false;     // if no syncs then we return NOT idle
   for (let dataName of ScraperSyncs)
   {
      for (let idleSpan of SyncSettings_GetIdlePeriods(dataName))
      {
         if ((idleSpan[0] < idleSpan[1] && idleSpan[0] <= time && time < idleSpan[1]) ||
            (idleSpan[0] > idleSpan[1] && !(idleSpan[1] <= time && time < idleSpan[0])))
            result = true; // we have at least one idle sync
         else
            return false;
      }
   }
   
   return result;
}

function ActionSelection_IsSyncIdleTime(dataName)
{
   if (!navigator.onLine)
      return true;
   
   const now = new Date();
   const time = now.getHours() * SecondsPerHour + now.getMinutes() * SecondsPerMinute + now.getSeconds();
   
   for (let idleSpan of SyncSettings_GetIdlePeriods(dataName))
   {
      if ((idleSpan[0] < idleSpan[1] && idleSpan[0] <= time && time < idleSpan[1]) ||
         (idleSpan[0] > idleSpan[1] && !(idleSpan[1] <= time && time < idleSpan[0])))
         return true;
   }
   
   return false;
}
