var accountID = null;

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
   });
}


async function getAccountInfo()
{
   let accountInfo = null;
   let elems = await waitForElements('SCRIPT');
   for (let elem of elems)
   {
      let text = elem.innerText;
      // DRL FIXIT? Perhaps we should JSON.parse() the text like we do for Pinterest to avoid errors with our parsing below?
      if (text.includes('uniqueId'))
      {
         accountInfo = {};
         try
         {
            accountInfo.name = text.split('"nickName":"')[1].split('"')[0];
            accountInfo.id = text.split('"uniqueId":"')[1].split('"')[0];
         }
         catch (e)
         {
            // split fails if the content is unexpected, when not logged in
            accountInfo = null;
         }
         break;
      }
   }
   if (accountInfo == null)
      throw new Error("TikTok account info not found");
   return accountInfo;
}


async function makeTikTokPost(post)
{
   let elem = null;
   
   for (let attach of post.Attachments)
   {
      if (attach.Type.split('/')[0] != 'video')
         continue;
      elem = await waitForElement(srchPathTTP('videoInput'));
      await uploadAttachment(elem, attach);
      await waitForElement(srchPathTTP('coverCandidate'));
      break;
   }
   
   elem = await waitForElement(srchPathTTP('captionTextarea'));
   
   //TikTok now have same protection as facebook again unfocused tabs, using document.hidden
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, post.Body, false, false, true))
   {
      Log_WriteError('Unable to set post body!');
      return RETRY_EXTERNAL_ID;
   }
   
   // DRL NOTE: These options are not yet supported on the server end...
   
   let canviewPath = srchPathTTP('canviewPublic');
   if (post.CanView == 'private')
   {
      canviewPath = srchPathTTP('canviewPrivate');
   }
   if (post.CanView == 'friends')
   {
      canviewPath = srchPathTTP('canviewFriends');
   }
   
   // DRL FIXIT! Need to check and log if any of these selectors fail!
   
   elem = await waitForElement(canviewPath);
   elem.click();
   
   elem = await waitForElement(srchPathTTP('allowComments'));
   if (post.AllowComments != findElement(srchPathTTP('parentSpanContainsCheck'), null, elem))
   {
      elem.click();
   }
   elem = await waitForElement(srchPathTTP('allowDuet'));
   if (post.AllowDuet != findElement(srchPathTTP('parentSpanContainsCheck'), null, elem))
   {
      elem.click();
   }
   elem = await waitForElement(srchPathTTP('allowStitch'));
   if (post.AllowStitch != findElement(srchPathTTP('parentSpanContainsCheck'), null, elem))
   {
      elem.click();
   }
   
   elem = await waitForElement(srchPathTTP('postButton'));
   if (Class_HasByElement(elem, 'disabled'))
   {
      Log_WriteError("Error sending TikTok post " + post.Uid + "!");
      return ERROR_EXTERNAL_ID;
   }
   
   elem.click();
   
   elem = await waitForElement(srchPathTTP('viewProfileButton'));
   
   return NO_EXTERNAL_ID;
}

/**
 * User on both sending messages and collecting
 * @returns {Promise<void>}
 */
async function redirectToUserMessagingFromProfilePage()
{
   let elem = await waitForElement(srchPathTTP('profileMessageSendButton'))
   elem.click()
}

async function sendMessage(message)
{
   await sleep(1);
   
   let editBox = await waitForElement(srchPathTTP('messageEditor'));
   if (editBox == null)
   {
      Log_WriteError('Edit box not found for sending message ' + message.Uid);
      return ERROR_EXTERNAL_ID;
   }
   
   if (message.Body !== "")
   {
      let numberOfMessagesBeforeSending = findElements(srchPathTTP('conversationMessages')).length
      await sleep(3);
      try
      {
         editBox.focus();
         if (typeof message.Body != 'undefined' && message.Body !== "")
         {
            // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
            if (!await pasteText(editBox, message.Body, false, false, true))
            {
               Log_WriteError('Unable to set message body!');
               return RETRY_EXTERNAL_ID;
            }
            
            editBox.focus();
         }
         await sleep(5);
      }
      catch (e)
      {
         Log_WriteException(e, 'Unable to copy/paste message!');
         return RETRY_EXTERNAL_ID;
      }
      
      const sendButton = await waitForElement(srchPathTTP('sendMessageButton'));
      if (sendButton == null)
      {
         Log_WriteError('Send button not found!');
         return ERROR_EXTERNAL_ID;
      }
      
      await sleep(1)
      sendButton.click();
      
      let tries = 0;
      do
      {
         // DRL FIXIT? Will this always work? In FB case the message appears in the list even on error.
         if (findElements(srchPathTTP('conversationMessages')).length > numberOfMessagesBeforeSending)
         {
            Log_WriteInfo('Message sent successfully!');
            return NO_EXTERNAL_ID;
         }
         await sleep(0.5)
         tries++;
      } while (tries <= 10);
      Log_WriteError('Unable to send the message!');
      return ERROR_EXTERNAL_ID;
   }
   return NO_EXTERNAL_ID;
}


// DRL FIXIT! This method may not handle all cases and isn't localized. I think we should use a common method across
// social sites and the Facebook one seems the most complete.
function textToTimeChatDelta(text)
{
   if (text.toLowerCase().includes('pm') || text.toLowerCase().includes('am'))
   {
      let amPm = text.split(' ')[1]
      let hourMinute = text.split(' ')[0].split(':')
      let hour = parseInt(hourMinute[0])
      let minute = parseInt(hourMinute[1])
      if (amPm.toLowerCase() === 'pm')
      {
         hour = hour + 12
         
      }
      let now = new Date()
      return new DateAndTime(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).date.getTime()
   }
   else
   {
      return new Date(text).getTime()
   }
}

function getChatTimestampDelta(elem)
{
   const elems = findElements(srchPathTTM('chatTimestamp'), null, elem);
   assert(elems.length <= 2);
   const data = Utilities_ArrayLastValue(elems).innerText;
   const time = textToTimeChatDelta(data);
   
   return isNaN(time) ? -1 : time;
}

function getMessageTimestamp(elem)
{
   const textTimeStamp = elem.innerText;
   let timeStamp;
   const timeRegex = /([0-9])?[0-9]:[0-9][0-9] ((p|P)|(a|A))(m|M)/gm;
   if (timeRegex.test(textTimeStamp))
   {
      let amPm = textTimeStamp.split(' ')[1]
      let hourMinute = textTimeStamp.split(' ')[0].split(':')
      let hour = parseInt(hourMinute[0])
      let minute = parseInt(hourMinute[1])
      if (amPm.toLowerCase() === 'pm')
      {
         hour = hour + 12
      }
      let now = new Date()
      timeStamp = new DateAndTime(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).date
   }
   else
   {
      timeStamp = Date.parse(textTimeStamp);
   }
   if (isNaN(timeStamp))
   {
      return null;
   }
   return new Date(timeStamp);
}

function getLastMessageTimestamp(msgTarget)
{
   let elementToCheck = msgTarget.nextElementSibling
   if (elementToCheck == null)
   {
      return null;
   }
   let timestamp = getMessageTimestamp(elementToCheck);
   if (timestamp !== null)
   {
      return timestamp;
   }
   return getLastMessageTimestamp(elementToCheck)
}

async function parseMessage(accountInfo, elem, timestamp, chatParticipantId, chatParticipantHandle, chatParticipantName)
{
   let message = {
      Type: 'tt_msg',
      Uid: NO_EXTERNAL_ID,
      Date: timestampToString(timestamp),
      Url: window.location.href,
      Attachments: []
   };
   
   // DRL FIXIT? We should be checking for both directions here and if neither match
   // throw an exception so we are not importing messages in the wrong folder.
   message.Folder = findElement(srchPathTTM('parentFromMessageDivMyself'), null, elem).contains('myself') ? 'sent' : 'inbox';
   
   if (message.Folder == 'inbox')
   {
      // if there is a handle we can use it to get the contacts profile
      message.From = chatParticipantName + ' <' + validateAddress(chatParticipantId + '@ttun.socialattache.com') + '>';
      message.To = [accountInfo.name + ' <' + validateAddress(accountInfo.id + '@ttun.socialattache.com') + '>'];
   }
   else
   {
      message.From = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@ttun.socialattache.com') + '>';
      if (chatParticipantId)
         message.To = [chatParticipantName + ' <' + validateAddress(chatParticipantId + '@ttun.socialattache.com') + '>'];
      else
      {
         assert(0);
         message.To = [];
      }
   }
   
   message.Body = elem.innerText;
   
   console.log(message)
   return message;
}

async function getChats(lastCheck)
{
   let totalCheckNb = 0;
   let lastChatListNb = 0;
   let waitNb = 0;
   
   await sleep(3)
   
   // only go back a maximum amount of time to avoid too many messages being imported
   if (lastCheck < getLatestSyncTimestamp())
      lastCheck = getLatestSyncTimestamp();
   
   while (true)
   {
      const chatScroll = await waitForElement(srchPathTTM('chatScroll'));
      let chatsList = await waitForElements(srchPathTTM('chatsList'));
      
      //Waiting for the first chat on the list to be loaded
      await waitForElement(srchPathTTM('chatTimestamp'))
      
      if (chatsList.length == 0)
      {
         Log_WriteError('Tiktok chatsList not found!');
         return [];
      }
      
      if (lastChatListNb != chatsList.length)
         waitNb = 0;
      
      // checking to the last chat appear in screen.
      // if timestamp is past of lastCheck, then we already got all the new message in view
      // seems that jQuery got lag or some bugs on loading on facebook scope, so adding a new case
      
      // don't use .last(), since findElements require an HTML element and not a jQuery output
      let timestampDelta = getChatTimestampDelta(chatsList.length > 0 ? chatsList[chatsList.length - 1] : null);
      
      // either we reach the lastcheck timestamp, or we wait that the chat load get stable (meaning that we already got all chats)
      if ((lastChatListNb == chatsList.length && waitNb > 10) ||
         (timestampDelta != -1 && Date.now() - timestampDelta < lastCheck))
      {
         await sleep(1);
         break;
      }
      
      lastChatListNb = chatsList.length;
      chatScroll.scrollTo(0, chatScroll.scrollHeight);
      
      waitNb++;
      totalCheckNb++;
      
      await sleep(1);
      reqPing();
   }
   
   let uniqueUserIds = [];
   let elems = await waitForElements(srchPathTTM('chatsList'));
   for (let elem of elems)
   {
      let clickAbleElem = await waitForElement(srchPathTTM('chatsListItemClickAble'))
      clickAbleElem.click()
      
      const userUniqueId = await waitForElement(srchPathTTM('userUniqueId'));
      
      if (userUniqueId == null)
      {
         Log_WriteError('TikTok user unique id not found on chatsList item: ' + elem.outerHTML);
         continue;
      }
      
      // => now only chat within the lastCheck are counted in the if condition
      let timestampDelta = getChatTimestampDelta(elem);
      if (userUniqueId && userUniqueId.innerText != '' && timestampDelta != -1 && Date.now() - timestampDelta >= lastCheck)
         uniqueUserIds.push(userUniqueId.innerText);
   }
   console.log('getChatsFinished');
   return uniqueUserIds;
}

async function reqSetChats(accountID, chats, currentCheck)
{
   return Messaging.SendMessageToBackground({
      type: 'setChats',
      accountID: accountID,
      chats: chats,
      currentCheck: currentCheck
   });
}

async function reqSetMessages(accountID, cursor, messages)
{
   return Messaging.SendMessageToBackground({
      type: 'setMessages',
      accountID: accountID,
      cursor: cursor,
      messages: messages
   });
}

async function getMessages(accountInfo, lastCheck, currentCheck)
{
   let totalCheckNb = 0;
   let checkingNb = 0;
   let lastMessageListNb = 0;
   let isGroup = null;
   
   // only go back a maximum amount of time to avoid too many messages being imported
   if (lastCheck < getLatestSyncTimestamp())
      lastCheck = getLatestSyncTimestamp();
   
   while (true)
   {
      console.log("LOOP message", checkingNb)
      let box = await waitForElement(srchPathTTM('messageBox'));
      if (box == null)
      {
         // I saw this  number of times when the window was in the background and the
         // web page looked empty. Probably best to drop out at this point and try later?
         if (checkingNb > 10)
         {
            throw new Error("Message box not found");
         }
      }
      else
      {
         box.scrollTo(0, box.scrollHeight)
         
         // first we get all the message-container
         const msgList = findElements(srchPathTTM('messageContainer'));
         
         // we check at least 10 times the chat
         if (lastMessageListNb == msgList.length && checkingNb > 10)
            break;
         
         // new messages appear on screen, we reset the counter that break the loop if above 10 loop
         if (lastMessageListNb != msgList.length)
            checkingNb = 0;
         
         lastMessageListNb = msgList.length;
         
         // if any messages, we get the first one (that should be a timestamp message such as : Yesterday at 1:03)
         if (msgList.length > 0)
         {
            const timestamp = getMessageTimestamp(msgList[msgList.length - 1]).getTime(); // the first message row of the current chat is always a timestamp date text
            
            console.log(timestamp, lastCheck)
            if (timestamp < lastCheck)
            {
               await sleep(1);
               break;
            }
            
         }
      }
      
      checkingNb++;
      totalCheckNb++;
      await sleep(1);
      reqPing();
   }
   
   // this is only for the timestamp
   let messages = [];
   let elems = findElements(srchPathTTM('messageContainerMsg'));
   
   if (elems.length == 0)
   {
      // this seems to happen for a conversation with no messages
      Log_WriteWarning("Can't find TikTok messageContainer, got " + messages.length + " message(s) so far");
      return messages;
   }
   
   const chatParticipantId = findElement(srchPathTTM('userUniqueId')).innerText.replace('@', '');
   const chatParticipantName = findElement(srchPathTTM('participantName')).innerText;
   
   console.log('Start parsing messages');
   let cursor = null;
   let lastMessageTimestamp = null;
   
   // go through the array oldest first in case we drop out early
   for (let elem of elems)
   {
      
      let timestamp = getLastMessageTimestamp(elem);
      
      if (timestamp == null)
      {
         timestamp = currentCheck;
      }
      
      if (timestamp >= lastCheck && timestamp <= currentCheck)
      {
         let chatParticipantHandle = 'https://tiktok.com/@' + chatParticipantId
         const message = await parseMessage(accountInfo, elem, timestamp, chatParticipantId, chatParticipantHandle, chatParticipantName);
         messages.push(message);
         
         // we need to break out after we get too many messages to keep things efficient, BUT we need to
         // break at a point where we have a timestamp that will allow us to resume at the correct spot
         // since our timestamps are not very accurate (especially the older they get)
         if (messages.length >= 200 && lastMessageTimestamp != timestamp)
         {
            cursor = timestamp;
            Log_WriteInfo('Early exit ' + messages.length + ' messages retrieved. Using cursor: ' + cursor);
            break;
         }
         
         lastMessageTimestamp = timestamp;
      }
      
      reqPing();
   }
   console.log('End parsing messages');
   
   return [messages, cursor];
}

async function checkLastId()
{
   let elem = await waitForElement(srchPathTTP('videoLinks'));
   if (elem == null)
   {
      Log_WriteError("Error finding ID for last sent TikTok post!");
      return ERROR_EXTERNAL_ID;
   }
   let id = elem.href.split("/");
   id = id[id.length - 1];
   console.log(id);
   return id;
}


async function loopTikTok()
{
   console.log(DateAndTime_Now() + " loopTikTok()");    // this is here so we can click on it in the console for easier debugging ;-)
   
   try
   {
      if (!await reqInitTab('TikTokScrape'))
         return;
      
      let accountInfo = null;
      
      while (true)
      {
         let delay = timings.BUSY_LOOP_DELAY;
         
         try
         {
            if (!Storage.IsAllStorageReady())
            {
               Log_WriteWarning('Storage not ready for Tik Tok, waiting');
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
               accountID = accountInfo.id;
            }
            
            let currentCheck = Date.now();
            let resp = await reqGetAction('TikTokScrape', accountInfo.id, accountInfo.name);
            
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
            else if (resp.action == 'getChats')
            {
               let chats = await getChats(resp.lastCheck);
               await reqSetChats(accountInfo.id, chats, currentCheck);
            }
            else if (resp.action == 'getMessages')
            {
               let [messages, cursor] = await getMessages(accountInfo, resp.lastCheck, resp.currentCheck);
               if (await reqSetMessages(accountInfo.id, cursor, messages))
                  continue;   // no wait, just check again for next action
               delay = timings.INTER_CONVERSATION_CHECK_DELAY;
            }
            else if (resp.action == 'skipConversation')
            {
               await reqSetMessages(accountInfo.id, null, []);
               delay = 0;
            }
            else if (resp.action == 'makePost')
            {
               let id = await makeTikTokPost(resp.post);
               let from = '<' + validateAddress(accountInfo.id + '@ttun.socialattache.com') + '>';
               await reqSetPostId('TikTokScrape', accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, id, from);    // DRL FIXIT? Why are we sending ID here AND below?
               delay = 5;  // just wait long enough to check that the post was posted and get its ID
            }
            else if (resp.action == 'checkLastId')
            {
               let id = await checkLastId();
               let from = '<' + validateAddress(accountInfo.id + '@ttun.socialattache.com') + '>';
               await reqSetPostId('TikTokScrape', accountInfo.id, resp.post.MessageBoxUid, resp.post.Uid, id, from);    // DRL FIXIT? Why are we sending ID here AND above?
               delay = timings.Commands['MakePost'].ActionDelay;  // DRL FIXIT? This should be returned by the above call.
            }
            else if (resp.action == 'getContact')
            {
               await sleep(4); // we have to wait for the page to load since the background script just set the URL
               let vCard = await getvCardFromTikTokProfile(resp.contactID);
               if (vCard == null)
                  await reqSetActionThrottled('TikTokScrape', resp.action);
               else
                  delay = await reqSendContact('TikTokScrape', resp.accountID, resp.syncCommandID, vCard);
               
               //Tiktok doesn't allow sending message directly to a username, so we need to send to the right page for that id
            }
            else if (resp.action == 'redirectToUserMessagingFromProfilePage')
            {
               let redirection = await redirectToUserMessagingFromProfilePage(resp.post);
            }
            else if (resp.action == 'sendMessage')
            {
               let messageID = await sendMessage(resp.post);
// DRL FIXIT! This seems to be the only place we use a "ttperid"! Can we find a "ttun" to use instead for consistency?
               let from = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@ttperid.socialattache.com') + '>';
               await reqSetMessageId('TikTokScrape', accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, messageID, from);
               delay = timings.Commands['SendMessage'].ActionDelay;  // DRL FIXIT? Background script should do the waiting.
            }
            else
            {
               assert(0, "Unrecognized action: " + resp.action);
            }
            
            // DRL FIXIT! This is the only use of reqSetServerState() and I believe we should remove it. We
            // should be using somehting like a "ping" here instead and let the background script notify the
            // server as appropriate.
            // ping the server to let him know we're alive since this scraper doesn't have a regular "check" action
            if (accountInfo.id)
               await reqSetServerState('TikTokScrape', accountInfo.id, currentCheck);
         }
         catch (e)
         {
            Log_WriteError('Error on ' + e)
            accountInfo = null; // in case the exception was due to logging out, try to get account info
            delay = await handleScraperException('TikTokScrape', e, 'https://www.tiktok.com');
         }
         
         try
         {
            await pingingSleep(delay);
         }
         catch (e)
         {
            await handleScraperException('TikTokScrape', e, 'https://' + window.location.host);
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
   
   loopTikTok();       // this is an async function we are launching and returning right away
});











