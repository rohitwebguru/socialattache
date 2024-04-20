// This module will help us catch two error cases:
// - we sent the client off to a URL, but the result was not the URL we requested (or in some cases we allow
//   one that is similar but we didn't get that either), which suggests the requested URL no longer exists
// - we sent the client to a URL to take some action, and we got a page reload and resent the same action,
//   and then another reload of the same URL, which suggests the client is doing something to reload the
//   page and we're not progressing which would result in an endless loop
// In both cases we must abort this action and move on to the next one.
// And this module also allows retrying setting the URL and sending the action a couple of times in order to
// allow handling a temporary unexpected scenario, such as the computer being shut down at the wrong time.

function ActionCheckInit()
{
   return {
      category: null,
      action: null,
      url: null,
      cursor: null,
      attempts: 0 // this is used to avoid endless loop of re-attempting the same action
   };
}

// the id is used to differentiate between two of the same action (for example FetchContact 123 and FetchContact 456)
function ActionCheck_SetUrl(dataName, category, action, id, sender, url, sendResponse)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   if (localData.action != null && localData.action !== action)
   {
      Log_WriteWarning('ActionCheck: Overriding 1 action ' + localData.action + ' with ' + action);
      localData = ActionCheckInit();
   }
   Log_WriteInfo('ActionCheck: ' + (localData.action == null ? 'Starting' : 'Continuing') + ' ' + action + ' by navigating to ' + url);
   localData.category = category;
   localData.action = action;
   localData.id = id;
   if (localData.url === url)
   {
      localData.attempts++;
      Log_WriteInfo('ActionCheck: Attempt ' + localData.attempts + ' of ' + localData.action);
   }
   else
   {
      localData.url = url;
      localData.cursor = null;
      localData.attempts = 0;
   }
   
   ActionSelection_ActionEvent(dataName, localData.category, false);
   
   Storage.SetLocalVar('ActionCheck_' + dataName, localData);
   
   Tabs.SetTabUrl(sender.tab.id, url);
   
   sendResponse({action: 'wait', seconds: 60});
}

// the id is used to differentiate between two of the same action (for example FetchContact 123 and FetchContact 456)
// the cursor is used to identify that it is the same action running, but for a different set of data
function ActionCheck_SendResponse(dataName, category, url, sendResponse, resp, id, cursor = null)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   if (localData.action != null && localData.action !== resp.action)
   {
      Log_WriteError('ActionCheck: Overriding 2 action ' + localData.action + ' with action ' + resp.action);
      localData = ActionCheckInit();
   }
   
   if (localData.action === resp.action && localData.id === id)
   {
      if (localData.cursor === cursor)
      {
         localData.attempts++;
         Log_WriteInfo('ActionCheck: Attempt ' + localData.attempts + ' of ' + localData.action);
      }
      else
      {
         Log_WriteInfo('ActionCheck: Continued attempt of ' + localData.action + ' at ' + url + ' with cursor ' + cursor);
         localData.cursor = cursor;
         localData.attempts = 1;
      }
   }
   else
   {
      Log_WriteInfo('ActionCheck: Initial attempt of ' + resp.action + ' with ID ' + id + ' at ' + url + ' with cursor ' + cursor);
      localData.category = category;
      localData.action = resp.action;
      localData.id = id;
      localData.url = url;
      assert(localData.cursor == null);
      localData.cursor = null;
      localData.attempts = 1;
   }
   
   Storage.SetLocalVar('ActionCheck_' + dataName, localData);
   
   sendResponse(resp);
}

function ActionCheck_GetCategory(dataName)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   return localData.category;
}

function ActionCheck_GetUrl(dataName)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   return localData.url;
}

function ActionCheck_OK(dataName, sender, notErrorIfContains)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   if (localData.attempts < 3)
      return true;
   if (notErrorIfContains != undefined && sender.url.indexOf(notErrorIfContains) !== -1)
      Log_WriteInfo('ActionCheck: ' + localData.action + ' received expected but not desirable url containing "' + notErrorIfContains + '".');
   else if (localData.url == sender.url)
      Log_WriteError('ActionCheck: ' + localData.action + ' had too many retries at url "' + localData.url + '".');
   else
      Log_WriteError('ActionCheck: ' + localData.action + ' had too many retries, wanted "' + localData.url + '" but sent to "' + sender.url + '" instead.');
   return false;
}

// saveCategory is used in the case of group member import as we have completed a chunk but we want to
// continue uninterrupted until all group members have been loaded
function ActionCheck_Completed(dataName, tabID, action, saveCategory)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   if (localData.action != action)
   {
      Log_WriteError('ActionCheck: Expected ' + localData.action + ' completing but got ' + action + ' completed instead');
      assert(0);
   }

   // DRL FIXIT? This counts failures and successes, should it only count successes?
   ActionSelection_ActionEvent(dataName, localData.category, true);
   
   if (saveCategory)
      saveCategory = localData.category;
   else
      saveCategory = null;
   
   Log_WriteInfo('ActionCheck: Completed ' + action + ' after ' + localData.attempts + ' attempts');
   localData = ActionCheckInit();
   
   localData.category = saveCategory;
   
   Storage.SetLocalVar('ActionCheck_' + dataName, localData);
   
   setTabThrottled(tabID, false, action);
}

// could be called even if there was no action started
function ActionCheck_Aborting(dataName)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   if (localData.action != null)
      Log_WriteInfo('ActionCheck: Aborting ' + localData.action + ' after ' + localData.attempts + ' attempts');
   
   localData = ActionCheckInit();
   
   Storage.SetLocalVar('ActionCheck_' + dataName, localData);
}

function ActionCheck_WakeFromSleep(dataName)
{
   let localData = Storage.GetLocalVar('ActionCheck_' + dataName, ActionCheckInit());
   
   if (localData.action != null)
      Log_WriteInfo('ActionCheck: Resetting ' + localData.action + ' after ' + localData.attempts + ' attempts due to wake from sleep');
   
   localData.attempts = 0;
   
   Storage.SetLocalVar('ActionCheck_' + dataName, localData);
}
