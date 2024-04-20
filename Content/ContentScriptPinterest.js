accountUsername = null;

async function reqSetMessages(accountID, currentCheck, syncData, messages)
{
   return Messaging.SendMessageToBackground({
      type: 'setMessages',
      accountID: accountID,
      currentCheck: currentCheck,
      syncData: syncData,
      messages: messages
   });
}


async function reqGetAccountInfo()
{
   return Messaging.SendMessageToBackground({type: 'getAccountInfo'});
}

async function reqSetAccountInfo(accountInfo)
{
   return Messaging.SendMessageToBackground({
      type: 'setAccountInfo',
      id: accountInfo.id,
      name: accountInfo.name,
      username: accountInfo.username
   });
}

async function getAccountInfo()
{
   let accountInfo = {};
   let json = null;
   let attempts = 0;
   
   // Sometimes Pinterest pops up a dialog asking the user to select some categories. We need to close
   // this dialog so we can continue.
   let elem = findElement(srchPathPIS('randomDialogCloseBttn'));
   if (elem)
      elem.click();
   
   while (json == null)
   {
      attempts++;
      let elems = await waitForElements('SCRIPT');
      let text = 'No SCRIPT Matches!';
      for (let elem of elems)
      {
         text = elem.innerText;
         
         try
         {
            json = text != "" ? JSON.parse(text) : null;
         }
         catch (e)
         {
            console.log('Error parsing JSON: ' + e);
            console.log(text);
         }
         // it looks like the account info could be in one of two places...
         if (json != null && json.hasOwnProperty('props') && json.props.hasOwnProperty('initialReduxState') &&
            json.props.initialReduxState.hasOwnProperty('viewer') && json.props.initialReduxState.viewer.hasOwnProperty('username'))
         {
            json = json.props.initialReduxState.viewer;
            break;
         }
         if (json != null && json.hasOwnProperty('props') && json.props.hasOwnProperty('context') &&
            json.props.context.hasOwnProperty('user') && json.props.context.user.hasOwnProperty('username'))
         {
            json = json.props.context.user;
            break;
         }
         json = null;
      }
      if (json != null)
         break;
      // DRL It looks like sometimes when the page is in the background it doesn't get fully
      // populated with the items we seek??
      if (attempts == 10)
      {
         Log_WriteError("Can't find Pinterest account information in: " + text);
         throw new Error("Pinterest account info not found after 10 seconds");
      }
      await sleep(1);
   }
   try
   {
      accountInfo.username = json.username;
      accountInfo.id = json.id;
      if (json.hasOwnProperty('fullName'))
         accountInfo.name = json.fullName;
      else
         accountInfo.name = json.full_name;
   }
   catch (e)
   {
      // split fails if the content is unexpected, when not logged in
      accountInfo = null;
   }
   return accountInfo;
}


async function makePinterestPin(pinDetails)
{
   let elem = await waitForElement(srchPathPIS('headerProfile'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding headerProfile at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathPIS('createButton'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding createButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathPIS('createPinButton'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding createPinButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathPIS('pinTitleTextarea'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding pinTitleTextarea at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, pinDetails.Subject, false, false, true))
   {
      Log_WriteError('Unable to set pin subject!');
      return RETRY_EXTERNAL_ID;
   }
   
   elem = await waitForElement(srchPathPIS('descriptionTextarea'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding descriptionTextarea at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, pinDetails.Body, false, false, true))
   {
      Log_WriteError('Unable to set pin body!');
      return RETRY_EXTERNAL_ID;
   }
   
   for (let button of pinDetails.Buttons)
   {
      elem = await waitForElement(srchPathPIS('linkTextarea'));
      if (elem == null)
      {
         Log_WriteError('makePinterestPin not finding linkTextarea at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      
      // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
      if (!await pasteText(elem, button.URL, false, false, true))
      {
         Log_WriteError('Unable to set button URL!');
         return RETRY_EXTERNAL_ID;
      }
      
      elem = await waitForElement(srchPathPIS('altTextButton'));
      if (elem == null)
      {
         Log_WriteError('makePinterestPin not finding altTextButton at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      elem.click();
      
      elem = await waitForElement(srchPathPIS('altTextarea'));
      if (elem == null)
      {
         Log_WriteError('makePinterestPin not finding altTextarea at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      
      // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
      if (!await pasteText(elem, button.Label, false, false, true))
      {
         Log_WriteError('Unable to set button label!');
         return RETRY_EXTERNAL_ID;
      }
      break;
   }
   
   await sleep(1);
   for (let attach of pinDetails.Attachments)
   {
      if (attach.Type.split('/')[0] != 'image' && attach.Type.split('/')[0] != 'video')
         continue;
      
      elem = await waitForElement(srchPathPIS('imageInput'));
      if (elem == null)
      {
         Log_WriteError('makePinterestPin not finding imageInput at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      
      await uploadAttachment(elem, attach);
      break;
   }
   
   elem = await waitForElement(srchPathPIS('boardSelectButton'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding boardSelectButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   if (pinDetails.SubFolder && elem.innerText.trim() != pinDetails.SubFolder)
   {
      elem.click();
      
      elem = await waitForElement(srchPathPIS('boardSearchInput'));
      if (elem == null)
      {
         Log_WriteError('makePinterestPin not finding boardSearchInput at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      
      // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
      if (!await pasteText(elem, pinDetails.SubFolder, false, false, true))
      {
         Log_WriteError('Unable to set pin sub-folder!');
         return RETRY_EXTERNAL_ID;
      }
      
      let elems = await waitForElements(srchPathPIS('foundBoards'), 2);
      let boardExists = false;
      for (elem of elems)
      {
         if (elem.innerText.trim() == pinDetails.SubFolder)
         {
            elem.click();
            boardExists = true;
            break;
         }
      }
      if (!boardExists)
      {
         elem = await waitForElement(srchPathPIS('createBoardButton'));
         if (elem == null)
         {
            Log_WriteError('makePinterestPin not finding createBoardButton at: ' + window.location.href)
            return ERROR_EXTERNAL_ID;
         }
         elem.click();
         
         elem = await waitForElement(srchPathPIS('createBoardFinalButton'));
         if (elem == null)
         {
            Log_WriteError('makePinterestPin not finding createBoardFinalButton at: ' + window.location.href)
            return ERROR_EXTERNAL_ID;
         }
         elem.click();
      }
   }
   
   await sleep(1);
   
   elem = await waitForElement(srchPathPIS('savePinButton'));
   if (elem == null)
   {
      Log_WriteError('makePinterestPin not finding savePinButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   await sleep(1);
   elem.click();
   
   await sleep(5); // seems to need time here to load the pin in the preview otherwise below fails
   
   elem = await waitForElement(srchPathPIS('seeItNowButton'));
   if (elem == null)
   {
      // there was an error with the post (missing image, etc.)
      Log_WriteError('makePinterestPin not finding seeItNowButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   return elem.getAttribute('href').split('/')[2];
}


async function parseMessage(elem, chatInfo, chatTimestamp)
{
   
   // DRL FIXIT! This method needs to be updated to use proper selectors in Constants.js.
   
   let message = {};
   message.Type = 'pint_msg';
   message.timestamp = chatTimestamp;
   message.Date = timestampToString(chatTimestamp);
   message.Url = null; // DRL FIXIT? Can we get this?
   message.Body = findElement(srchPathPIS('pinterestMessageBody'), null, elem);
   let like = findElement('svg', null, elem);
   message.Like = like.length > 0;
   message.Attachments = [];
   let pin = findElement('a', null, elem);
   if (pin.length > 0)
   {
      let url = findElement('{href}', null, pin);
      if (url[0] == '/')
         url = 'https://www.pinterest.com' + url;
      message.Attachments.push({URL: url})
   }
   
   if (findElement(srchPathPIS('classElemUnk'), null, elem))
   {
      message.Folder = 'inbox';
      message.From = chatInfo.name + ' <' + validateAddress(chatInfo.id + '@pintun.socialattache.com') + '>';
      message.To = ['<' + validateAddress(accountUsername + '@pintun.socialattache.com') + '>'];
   }
   else
   {
      message.Folder = 'sent';
      message.To = [chatInfo.name + ' <' + validateAddress(chatInfo.id + '@pintun.socialattache.com') + '>'];
      message.From = '<' + validateAddress(accountUsername + '@pintun.socialattache.com') + '>';
   }
   
   await massageAttachments(message);
   
   return message;
}


async function scrollToConversationTop()
{
   let len = null;
   let elems = null;
   while (true)
   {
      elems = await waitForElements(srchPathPIS('messageDivs'));
      assert(elems.length > 0);
      console.log(elems.length);
      if (len == elems.length)
      {
         break;
      }
      len = elems.length;
      elems[0].scrollIntoView();
      await sleep(1);
   }
   return elems;
}

async function getChatInfo()
{
   let info = {}
   let elem = await waitForElement(srchPathPIS('moreParticipants'));
   if (elem)
   {
      elem.dispatchEvent(new Event('mouseover', {bubbles: true}));
   }
   await sleep(2);
   let participantIds = [];
   let participantNames = [];
   let elems = await waitForElements(srchPathPIS('participants'));
   if (elems.length == 0)
   {
      Log_WriteError("No Pinterest participants found at: ".window.location.href);
      return null;
   }
   for (let elem of elems)
   {
      let id = findElement(srchPathPIS('participantID'), null, elem);
      let name = findElement(srchPathPIS('participantName'), null, elem);
      if (id == null || name == null)
      {
         Log_WriteError("No Pinterest participant ID or name found at: ".window.location.href);
         return null;
      }
      participantIds.push(id);
      participantNames.push(name);
   }
   info.id = participantIds.join('|');
   info.name = participantNames.join(', ');
   return info;
}

// DRL FIXIT! It looks to me like lastMessageIds actually contains indices and not IDs!
async function getMessages(lastMessageIds, chatTimestamp)
{
   await waitForElement(srchPathPIS('backButton'));
   await sleep(1);
   let chatInfo = await getChatInfo();
   if (chatInfo == null)
   {
      lastMessageIds[chatInfo.id] = elems.length - 1;
      return {messages: [], lastMessageIds: lastMessageIds};
   }
   let lastMessageId = 0;
   if (chatInfo.id in lastMessageIds)
   {
      lastMessageId = lastMessageIds[chatInfo.id];
   }
   console.log(chatInfo);
   elems = await scrollToConversationTop();
   let messages = [];
   for (let i = lastMessageId == null ? 0 : lastMessageId + 1; i < elems.length; i++)
   {
      let message = await parseMessage(elems[i], chatInfo, chatTimestamp);
      message.Id = i;
      message.Uid = chatInfo.id + '_' + i;
      messages.push(message);
      reqPing();
   }
   lastMessageIds[chatInfo.id] = elems.length - 1;
   return {messages: messages, lastMessageIds: lastMessageIds};
}


// DRL FIXIT! This method may not handle all cases. I think we should use a common method across
// social sites and the Facebook one seems the most complete.
function getChatTimestamp(str)
{
   let delta = str.split(' ');
   delta = delta[delta.length - 1];
   let last = delta[delta.length - 1];
   delta = parseInt(delta.slice(0, -1));
   let timestamp = Date.now();
   if (last == keywordPIS('s'))
   {
      timestamp -= delta * 1000;
   }
   else if (last == keywordPIS('m'))
   {
      timestamp -= delta * 60 * 1000;
   }
   else if (last == keywordPIS('h'))
   {
      timestamp -= delta * 60 * 60 * 1000;
   }
   else if (last == keywordPIS('d'))
   {
      timestamp -= delta * 24 * 60 * 60 * 1000;
   }
   else if (last == keywordPIS('w'))
   {
      timestamp -= delta * 7 * 24 * 60 * 60 * 1000;
   }
   else if (last == keywordPIS('y'))
   {
      timestamp -= delta * 365 * 24 * 60 * 60 * 1000;
   }
   else
   {
      Log_WriteError('Unrecognized Pinterest interval key in "' + str + '" for language ' + pageLanguage);
   }
   if (timestamp == null || timestamp == undefined)
   {
      throw new Error("Error parsing Pinterest date delta: " + str);
   }
   return timestamp;
}


async function getChats(lastCheck, lastMessageIds, currentCheck)
{
   // we might have one chat up and need to go back to the list of chats
   let elem = await waitForElement(srchPathPIS('returnToConversationsButton'), 1);
   if (elem != null)
      elem.click();
   
   // we might not have the chat list slider showing
   elem = await waitForElement(srchPathPIS('composeButton'), 1);
   if (elem == null)
   {
      elem = await waitForElement(srchPathPIS('messagesButton'));
      elem.click();
   }
   
   // only go back a maximum amount of time to avoid too many messages being imported
   if (lastCheck < getLatestSyncTimestamp())
      lastCheck = getLatestSyncTimestamp();
   
   let messages = [];
   for (let i = 0; ; i++)
   {
      await sleep(2);
      let elems = await waitForElements(srchPathPIS('chatDivs'));
      
      for (let j = 0; j < elems.length; j++)
      {
         // DRL FIXIT? Skip group chats as we don't handle those yet.
         if (elems[j].innerText.includes(","))
         {
            elems.splice(j, 1);
            j--;
         }
      }
      
      if (elems.length == 0)
      {
         if (lastMessageIds != null && lastMessageIds.length > 0)
            throw new Error("Pinterest chatDivs not found");
         Log_WriteInfo("Either the chatDivs was not found or there are no conversations.")
         break;
      }
      let len = null;
      while (elems.length <= i && len != elems.length)
      {
         len = elems.length;
         elems[len - 1].scrollIntoView();
         await sleep(2);
         elems = await waitForElements(srchPathPIS('chatDivs'));
      }
      if (i >= elems.length)
      {
         break;
      }
      let delta = findElement(srchPathPIS('chatTimestamp'), null, elems[i]).innerText.trim();
      let chatTimestamp = getChatTimestamp(delta);
      if (lastCheck != null)
      {
         if (chatTimestamp < lastCheck)
         {
            break;
         }
      }
      elems[i].click();
      
      reqPing();
      
      let chat = await getMessages(lastMessageIds, chatTimestamp);
      lastMessageIds = chat.lastMessageIds;
      messages = messages.concat(chat.messages);
      
      elem = await waitForElement(srchPathPIS('backButton'));
      if (elem == null)
      {
         Log_WriteError('getChats not finding backButton at: ' + window.location.href)
         return {messages: messages, lastMessageIds: lastMessageIds};
      }
      elem.click();
   }
   return {messages: messages, lastMessageIds: lastMessageIds};
}


async function sendMessage(message)
{
   // we might have one chat up and need to go back to the list of chats
   let elem = await waitForElement(srchPathPIS('returnToConversationsButton'), 1);
   if (elem != null)
      elem.click();
   
   // we might not have the chat list slider showing
   elem = await waitForElement(srchPathPIS('composeButton'), 1);
   if (elem == null)
   {
      elem = await waitForElement(srchPathPIS('messagesButton'));
      if (elem == null)
      {
         Log_WriteError('sendMessage not finding messagesButton at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      elem.click();
   }
   
   elem = await waitForElement(srchPathPIS('composeButton'));
   if (elem == null)
   {
      Log_WriteError('sendMessage not finding composeButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathPIS('contactSearch'));
   if (elem == null)
   {
      Log_WriteError('sendMessage not finding contactSearch at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   let to = getEmailPrefix(message.To[0]);
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, to, false, false, true))
   {
      Log_WriteError('Unable to set message to!');
      return RETRY_EXTERNAL_ID;
   }
   
   elem = await waitForElement(srchPathPIS('searchResults'));
   if (elem.innerText != 'Recent' && elem.innerText != to)
   {   // DRL FIXIT! "Recent" should be in Constants.js for localization
      Log_WriteError("Can't find matching recipient \"" + to + "\" for message " + message.Uid);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathPIS('messageTextarea'));
   if (elem == null)
   {
      Log_WriteError('sendMessage not finding messageTextarea at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, message.Body, false, false, true))
   {
      Log_WriteError('Unable to set message body!');
      return RETRY_EXTERNAL_ID;
   }
   
   elem = await waitForElement(srchPathPIS('messageSendButton'));
   if (elem == null)
   {
      Log_WriteError('sendMessage not finding messageSendButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   let elems = await scrollToConversationTop();
   Log_WriteInfo("Send msg scroll to top elems " + (elems.length - 1));
   return to + '_' + (elems.length - 1);
}


async function loopPinterest()
{
   console.log(DateAndTime_Now() + " loopPinterest()"); // this is here so we can click on it in the console for easier debugging ;-)
   
   try
   {
      if (!await reqInitTab('PinterestScrape'))
         return;
      
      let accountInfo = null;
      
      while (true)
      {
         let delay = timings.BUSY_LOOP_DELAY;
         
         try
         {
            if (!Storage.IsAllStorageReady())
            {
               Log_WriteWarning('Storage not ready for Pinterest, waiting');
               await sleep(2);
               continue;
            }
            
            if (!await reqCheckSocialAttacheLogin(true))
            {
               await pingingSleep(timings.SA_NOT_LOGGED_IN_DELAY);
               continue;
            }
            
            if (accountInfo == null)
            {
               accountInfo = await getAccountInfo();
               Log_WriteInfo('Got account info: ' + GetVariableAsString(accountInfo));
               let savedAccountInfo = await reqGetAccountInfo();
               if (savedAccountInfo == null || savedAccountInfo.id != accountInfo.id)
               {
                  Log_WriteInfo('Account info: ' + GetVariableAsString(accountInfo));
                  await reqSetAccountInfo(accountInfo);
               }
               
               accountUsername = accountInfo.username;
            }
            
            let currentCheck = Date.now();
            let resp = await reqGetAction('PinterestScrape', accountInfo.id, accountInfo.name);
            
            if (resp == null)
            {
               Log_WriteInfo('Background not ready');
            }
            else if (resp.action == null)
            {
               delay = timings.IDLE_LOOP_DELAY;
            }
            else if (resp.action == 'wait')
            {
               delay = resp.seconds;
            }
            else if (resp.action == 'getMessages')
            {
               let lastMessageIds = JSON.parse(resp.lastMessageIds) || {}
               let chats = await getChats(resp.lastCheck, lastMessageIds, currentCheck);
               if (await reqSetMessages(accountInfo.id, currentCheck, JSON.stringify(chats.lastMessageIds), chats.messages))
                  continue;   // no wait, just check again for next action
               delay = timings.INTER_CONVERSATION_CHECK_DELAY;
            }
            else if (resp.action == 'sendMessage')
            {
               let id = await sendMessage(resp.message);
               let from = accountInfo.name + ' <' + validateAddress(accountInfo.username + '@pintun.socialattache.com') + '>';
               await reqSetMessageId('PinterestScrape', accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, id, from);
               delay = timings.Commands['SendMessage'].ActionDelay;  // DRL FIXIT? Background script should do the waiting.
            }
            else if (resp.action == 'makePost')
            {
               let id = await makePinterestPin(resp.post);
               let from = '<' + validateAddress(accountInfo.username + '@pintun.socialattache.com') + '>';
               await reqSetPostId('PinterestScrape', accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, id, from);
               delay = timings.Commands['MakePost'].ActionDelay;  // DRL FIXIT? Background script should do the waiting.
            }
            else if (resp.action == 'getContact')
            {
               await sleep(4); // we have to wait for the page to load since the background script just set the URL
               let vCard = await getvCardFromPinterestProfile(resp.contactID);
               if (vCard == null)
                  await reqSetActionThrottled('PinterestScrape', resp.action);
               else
                  delay = await reqSendContact('PinterestScrape', resp.accountID, resp.syncCommandID, vCard);
            }
            else
            {
               assert(0, "Unrecognized action: " + resp.action);
            }
         }
         catch (e)
         {
            accountInfo = null; // in case the exception was due to logging out, try to get account info
            delay = await handleScraperException('PinterestScrape', e, 'https://www.pinterest.com');
         }
         
         try
         {
            await pingingSleep(delay);
         }
         catch (e)
         {
            await handleScraperException('PinterestScrape', e, 'https://' + window.location.host);
         }
      }
   }
   catch (e)
   {
      if (e.message.indexOf('Extension context invalidated') != -1 ||
         e.message.indexOf('message channel closed') != -1 ||
         e.message.indexOf('message port closed') != -1)
      {
         window.location.reload();  // background script unloaded or reloaded
      }
      else
         Log_WriteException(e);
   }
}


DocumentLoad.AddCallback(function(rootNodes)
{
   if (rootNodes.length != 1 || rootNodes[0] != document.body)
      return;     // this only needs to be done once on initial page load
   
   loopPinterest();        // this is an async function we are launching and returning right away
});