function isAllowedAction(action, isAssistant, syncDevice)
{
   const isResponsibility = Utilities_ArrayContains(SyncDeviceResponsibilities, action);
   
   // assistants may only perform assigned responsibilities, so non-responsibilities can't be handled
   if (isAssistant && !isResponsibility)
      return false;
   
   // if it's a responsibility, does the host device have the responsibility assigned?
   if (isResponsibility && !Utilities_ArrayContains(syncDevice.Responsibilities, action))
      return false;
   
   // does the user have access to the feature?
   assert(ActionRequiresFeature.hasOwnProperty(action));
   if (Utilities_ArrayContains(ActionRequiresFeature, action) && !UserHasFeature(ActionRequiresFeature[action]))
      return false;
   
   return true;
}

function QueueInstagramActions(sender, localData, server)
{
   const now = Date.now();
   const isTempTab = isTemporaryTab(sender.tab.id);
   const syncData = decodeInstagramSyncData(server.SyncData);
   const lastUrl = ActionCheck_GetUrl(IG_DATA_NAME);
   let actions = {};
   
   let isAssistant = isSocialAttacheLoggedInAsAssistant();
   let syncDevice = getSyncDevice();
   
   if (!syncDevice.IsActive)
      return actions;
   
   for (const command of server.commands)
   {
      if (localData.skipActionUntil.hasOwnProperty(command.SyncCommand) && now < localData.skipActionUntil[command.SyncCommand])
         continue;
      
      // if this device has access to the action
      if (!isAllowedAction(command.SyncCommand, isAssistant, syncDevice))
         continue;
      
      actions[command.SyncCommand] = {
         command: command
      };
      
      // we can only process one command at a time, and the server provides them already sorted by priority
      break;
   }
   
   
   // if we have a message queued it means we need to send it soon so we will disable other automations until
   // we send it so that it does not go out late
   let hasQueuedMessage = false;
   
   // if this device has access to the action
   if (isAllowedAction('SendMessage', isAssistant, syncDevice))
   {
      let now = Date.now();
      let dtNow = DateAndTime_Now();
      // we only process the first message, and we'll get any other messages on the next request,
      // and sometimes we're not sending messenger messages
      let message = null;
      for (let msg of server.messages)
      {
         if (msg.Date && DateAndTime_FromString(msg.Date).GreaterThan(dtNow))
         {
            Log_WriteInfo('There is a ' + msg.Type + ' queued to be sent ' + msg.Date + ' so pausing other actions.')
            hasQueuedMessage = true;
            continue;   // skip this message for now
         }
         
         if (msg.Type.includes('msg') && now < localData.skipSendingAnyMessengerMessagesUntil)
         {
            Log_WriteInfo('There is a ' + msg.Type + ' ready to be sent but we are skipping for a while.')
            continue;   // skip this message type for now
         }
         
         if (msg.Type.includes('post') && now < localData.skipMakingPostsUntil)
         {
            Log_WriteInfo('There is a ' + msg.Type + ' ready to be sent but we are skipping for a while.')
            continue;   // skip this message type for now
         }
         
         if (isTempTab && msg.Type != 'ig_msg')
            continue;
         
         // if we find a message that will use the existing page use it next so we can cache
         // some work on the client side such as parsing comments on a post for replying
         if (msg.hasOwnProperty('Url') && fuzzyUrlsMatch(sender.url, msg.Url))
         {
            message = msg;
            break;
         }
         
         if (message == null || msg.Uid < message.Uid)
            message = msg;  // oldest first
      }
      
      if (isTempTab && (message == null || message.Type != 'ig_msg'))
      {
         Log_WriteError('Closing temporary message/post send tab ' + sender.tab.id + ', should have been closed!');
         Tabs.RemoveTab(sender.tab.id);
         return actions;
      }
      
      if (message != null)
      {
         let category = null;
         if (message.Type.includes('msg'))
            category = 'SendMessage';
         else if (message.Type.includes('post'))
            category = 'MakePost';
         else
            assert(0);
         actions[category] = {
            message: message
         };
      }
   }
   
   return actions;
}