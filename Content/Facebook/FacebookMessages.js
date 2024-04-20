// this return the true timestamp from the time/date row in a conversation
function getMessageTimestamp(elem)
{
   const textTimeStamp = findElement(srchPathFBM('messageTimestampStr'), null, elem);
   return parseDateTimeToTimestamp(textTimeStamp);
}

function getGroupMessageSenderName(elem)
{
   let nextSibling = elem
   let maxTries = 30
   while (maxTries > 0)
   {
      let currentCheck = findElement('img {alt}', null, nextSibling)
      if (currentCheck)
      {
         return currentCheck;
      }
      nextSibling = nextSibling.nextSibling
      maxTries--;
   }
   return null;
}

// chat room: chatParticipantAddress != conversationAddress
// one-on-one: chatParticipantAddress == conversationAddress
async function parseMessage(accountInfo, elem, timestamp, conversationAddress, conversationName,
   chatParticipantAddress, chatParticipantName)
{
   let message = {
      Type: 'fbp_msg',
      Uid: NO_EXTERNAL_ID,
      Date: timestampToString(timestamp),
      Url: window.location.href,
      IsChatRoom: false,
      Attachments: []
   };
   
   setSelectorVariables({
      ParticipantName: chatParticipantName,
      ParticipantFirstName: chatParticipantName.split(' ')[0]
   });
   
   if (chatParticipantAddress != conversationAddress)
   {
      // group chat room

// DRL NOTE: We currently don't parse group chat messages because it's hard to get each senders info!
// If we want to implement this I believe we'll need to parse the sender info in the caller since
// it will appear in a previous DIV, similar to how message timestamps are handled.
      assert(0);
      
      let isSent = findElement(srchPathFBM('isSentGroupChat'), null, elem);
      let isReceived = findElement(srchPathFBM('isReceivedGroupChat'), null, elem);
      if (isSent && isReceived)
      {
         Log_WriteError("parseMessage got both sent and received for group message direction while parsing " + document.location.href);
         Log_WriteDOM(elem);
         clearSelectorVariables();
         return null;
      }
      else if (isSent)
         message.Folder = 'sent';
      else if (isReceived)
         message.Folder = 'inbox';
      else
      {
         Log_WriteError("parseMessage can't get sent/received group message direction while parsing " + document.location.href);
         Log_WriteDOM(elem);
         clearSelectorVariables();
         return null;
      }
      
      if (message.Folder == 'sent')
      {
         chatParticipantName = accountInfo.name;
         chatParticipantAddress = validateAddress(accountInfo.id + '@fbperid.socialattache.com');
      }
      else
      {
         let conversationId = window.location.href.split('/t/')[1]
         conversationAddress = validateAddress(conversationId + '@fbrmid.socialattache.com');
         
         let isSent = findElement(srchPathFBM('isSentByMe'), null, elem);
         try
         {
            chatParticipantName = getGroupMessageSenderName(elem);
         }
         catch (e)
         {
            chatParticipantName = null;
         }
// DRL FIXIT! This selector is missing!
         let chatParticipantID = findElement(srchPathFBM('messageRoomParticipantID'), null, elem);
         if (chartParticipantID == null)
         {
            Log_WriteError("Can't get participant ID for group conversation " + document.location.href);
            Log_WriteDOM(elem);
            clearSelectorVariables();
            return null;
         }
         chatParticipantAddress = validateAddress(chatParticipantID + '@fbperid.socialattache.com');
         
         chatParticipantName = findElement(srchPathFBM('messageRoomParticipantName'), null, elem);
         if (chatParticipantName == null)
         {
            if (await isFacebookAccountAvailable(chatParticipantID))
               Log_WriteError("Can't get participant " + chatParticipantID + " name for group conversation " +
                  document.location.href + " using messageRoomParticipantName.");
            else
               Log_WriteWarning("Can't get participant " + chatParticipantID + " name for group conversation " +
                  document.location.href + ", this may be a closed account or a user who's blocked me.");
            Log_WriteDOM(elem);
            chatParticipantName = chatParticipantID;
         }
      }
      
      message.From = chatParticipantName + ' <' + chatParticipantAddress + '>';
      message.To = conversationName + ' <' + conversationAddress + '>';
   }
   else
   {
      // one-on-one chat
      
      let isSent = findElement(srchPathFBM('isSentChat'), null, elem);
      let isReceived = findElement(srchPathFBM('isReceivedChat'), null, elem);
      if (isSent && isReceived)
      {
         Log_WriteError("parseMessage got both sent and received message direction while parsing " + document.location.href);
         Log_WriteDOM(elem);
         clearSelectorVariables();
         return null;
      }
      else if (isSent)
         message.Folder = 'sent';
      else if (isReceived)
         message.Folder = 'inbox';
      else
      {
         Log_WriteError("parseMessage can't get sent/received message direction while parsing " + document.location.href);
         Log_WriteDOM(elem);
         clearSelectorVariables();
         return null;
      }
      
      if (message.Folder == 'inbox')
      {
         // DRL FIXIT! This could be a page or a person, it would be good to check to use the correct fbpage or fbperid!
         message.From = chatParticipantName + ' <' + chatParticipantAddress + '>';
         message.To = [accountInfo.name + ' <' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>'];
      }
      else
      {
         message.From = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>';
         message.To = [chatParticipantName + ' <' + chatParticipantAddress + '>'];
      }
   }
   
   clearSelectorVariables();
   
   if (findElement(srchPathFBM('skipMessage'), null, elem))
   {
      Log_WriteInfo("Skipping known unwanted message");
      return null;
   }
   message.Body = findElement(srchPathFBM('body'), null, elem);
   
   let attachs = findElements(srchPathFBM('attachmentA'), null, elem);
   for (let attach of attachs)
   {
      if (attach.innerText.includes('/groups/') || attach.childNodes.length <= 1)
      {
         break;
      }
      
      // DRL I added this loop because when the image is in a message request (i.e. the first
      // message received from a non-friend) you have to click it three times.
      let url = null;
      for (let i = 0; url == null && i < 3; i++)
      {
         attach.click();
         
         // DRL I added this sleep because in one case there were two images attached to a message
         // and when trying to close the dialog after parsing the second one the page was reloaded
         // resulting in an endless loop trying to parse this message. The sleep fixed it.
         // The problem conversation: https://www.facebook.com/messages/t/684294057
         // I also had a problem with this conversation, though I don't think it was the same
         // scenario because there's only one image: https://www.facebook.com/messages/t/563561982/
         await sleep(3);
         
         // DRL FIXIT? Combine these two selectors into a single selector?
         if (window.location.href.includes('messenger_photo'))
         {
            url = findElement(srchPathFBM('attachmentImageSrc'))
         }
         else
         {
            url = findElement(srchPathFBM('otherAttachmentsDownloadHref'))
         }
      }
      if (url == null)
      {
         Log_WriteError('For conversation ' + window.location.href + ' attachment source was not found!');
      }
      else
      {
         message.Attachments.push({URL: url})
      }
      
      let close = await waitForElement(srchPathFBM('closeAttachmentPopup'))
      if (close == null)
         Log_WriteError('For conversation ' + window.location.href + 'attachment close button was not found!');
      else
      {
         close.click()
         await sleep(1)
      }
   }
   
   attachs = findElements(srchPathFBM('inlineAttachmentUrl'), null, elem);
   for (let url of attachs)
      message.Attachments.push({URL: url})
   
   // links attachments downloadable attr
   // FIXIT sometimes attachments doesn't have the attr download, like pdf files, in the pdf case it opens a popup to preview
   // Identified Extensions .pdf, .txt
   // The automation would be clicking in the div, waiting for the popup, getting the download url on the popup closing the popup
   // This piece of the code doesn't work anymore, attachments needs to be added from the popup by clicking and then downloading
   /*
   attachs = findElement('a', null, elem);
   for(let attach of attachs){
       if($(attach).attr('download') !== undefined){
           message.Attachments.push({URL: attach.href})
           
           // removing text that are generated for the attachment and not a user type message
           const rg     = new RegExp(attach.innerText, 'ig');
           message.Body = message.Body.replace(rg, '');
       }
   }
   */
   
   await massageAttachments(message);
   
   if (message.Body == null && message.Attachments.length == 0)
   {
      Log_WriteError("parseMessage got empty message while parsing " + document.location.href);
      Log_WriteDOM(elem);
      message = null;
   }
   
   return message;
}

// this is for getting the timestamp of a message or the timestamp title above him
function getLastMessageTimestamp(msgTarget)
{
   let elementToCheck = msgTarget.previousElementSibling
   if (elementToCheck == null)
   {
      return null;
   }
   return getMessageTimestamp(elementToCheck);
}

// The cache is used in the case of inviting to group chat, in case we get a few invites in a row
// for the same group.
let groupChatCacheParticipantsCache = null;
let groupChatCacheParticipantsCacheUrl = null;
// DRL FIXIT? Why are we parsing the members from the pop-up instead of the right side list? We
// are already scraping the right side list to add our buttons and that has all the info we need.
async function getGroupChatParticipants(accountInfo, conversationId, getUsernames)
{
   if (groupChatCacheParticipantsCacheUrl == document.location.href)
   {
      Log_WriteInfo('Using group chat participants cache');
      return groupChatCacheParticipantsCache;
   }
   
   let header = await waitForElement(srchPathPG('messengerConversationHeader'));
   if (header == null)
   {
      Log_WriteError('Unable to find group chat header from ' + document.location.href);
      return null;    // being throtted?
   }
   
/* Looks like they hid the links in the pop up form, so we use the sidebar below instead.
   let participantsBtn = findElement(srchPathPG('messengerGroupChatParticipantsBtnClick'), null, header);
   if (participantsBtn == null)
   {
      Log_WriteError('Unable to find group chat participants button from ' + document.location.href);
      Log_WriteDOM(header);
      return [];
   }
   if (!Class_HasByElement(participantsBtn, 'SA_already_pressed'))
   {
      Class_AddByElement(participantsBtn, 'SA_already_pressed');
      
      // DRL FIXIT! I'm wondering whether we'll need our usual scrolling loop here to load participants in the
      // case that there are many and they aren't all loaded unless the user scrolls through them all?
      await sleep(10); // we have to wait for the content of the dialog to load
   }
   
   // NOTE: I found that if I had the above "sleep" after this call that by the time the sleep finished this
   // popup was no longer on the page and a new one had replaced it, so I put the sleep first.
   let popup = await waitForElement(srchPathPG('messengerGroupChatParticipantsPopup'));
   if (popup == null)
   {
      Log_WriteError('Unable to find group chat participants popup from ' + document.location.href);
      return [];
   }
   
   let participantContainers = findElements(srchPathPG('messengerGroupChatParticipantContainers'), null, popup);
   if (participantContainers.length == 0)
   {
      Log_WriteError('Unable to find group chat participants from ' + document.location.href);
      Log_WriteDOM(popup);
      return [];
   }
   let groupChatParticipants = [];
   for (let participantContainer of participantContainers)
   {
//        let role = 'User';
//        let roleText = findElement(srchPathPG('messengerGroupChatParticipantUserRole'), null, participantContainer);
//        if(roleText != null && roleText.toLowerCase().includes(keywordFBM('GroupChatAdmin'))){
//            role = 'Admin';
//        }else if(roleText != null && roleText.toLowerCase().includes(keywordFBM('GroupChatCreator'))){
//            role = 'GroupCreator';
//        }
      let userId = findElement(srchPathPG('messengerGroupChatParticipantUserId'), null, participantContainer);
      if (userId == null)
      {
         Log_WriteError('Unable to find group chat participant ID from ' + document.location.href);
         Log_WriteDOM(participantContainer);
         return [];
      }
      let name = findElement(srchPathPG('messengerGroupChatParticipantName'), null, participantContainer);
      if (name == null)
      {
         Log_WriteError('Unable to find group chat participant name from ' + document.location.href);
         Log_WriteDOM(participantContainer);
         return [];
      }
      
      // DRL FIXIT? When we switched from using facebook.com to messenger.com in order to support group
      // chats we were no longer able to use this feature due to CORS so for now we will assume these are
      // "fbperid" in the group chat and not "fbpage".
      let uid = await getFacebookAddressFromId(userId, FacebookAddressFormatNumeric, 'fbperid');
      let username = getUsernames ? getEmailPrefix(await getFacebookAddressFromId(userId, FacebookAddressFormatUsername)) : null;
      
      if (uid != null)
         groupChatParticipants.push({
            GroupChatUid: validateAddress(conversationId + '@fbrmid.socialattache.com'),
            Name: name,
            Uid: uid,
            Username: username
//                RoomRoles: [role]
         });
   }
   
   let closeBtn = await waitForElement(srchPathPG('messengerGroupChatParticipantsCloseBtnClick'), 4);
   if (closeBtn != null)
      Class_RemoveByElement(participantsBtn, 'SA_already_pressed');
   else
      Log_WriteError('getGroupChatParticipants() messengerGroupChatParticipantsCloseBtnClick not found');
*/
   
   let button = findElement(srchPathPG('messengerGroupChatSidebarOpenParticipants'))
   if (button)
   {
      button.click();
      await sleep(1);
   }

   let groupChatParticipants = [];
   let elems = await waitForElements(srchPathPG('messengerGroupChatSidebarParticipantContainers'));
   for (let elem of elems)
   {
      let menu = findElement(srchPathPG('messengerGroupChatSidebarParticipantMenu'), null, elem)
      if (menu == null)
      {
         Log_WriteError('For group chat ' + window.location.href + ' participant menu not found!');
         break;
      }
      
      menu.click();
   
      let userId = await waitForElement(srchPathPG('messengerGroupChatSidebarParticipantUserId'), 3, elem);
      if (userId == null)
      {
         Log_WriteError('For group chat ' + window.location.href + ' participant ID not found!');
         menu.click();
         break;
      }
      let name = findElement(srchPathPG('messengerGroupChatSidebarParticipantName'), null, elem);
      if (name == null)
      {
         Log_WriteError('For group chat ' + window.location.href + ' participant name not found!');
         menu.click();
         break;
      }
      
      menu.click();
      await sleep(.5);

      // DRL FIXIT? When we switched from using facebook.com to messenger.com in order to support group
      // chats we were no longer able to use this feature due to CORS so for now we will assume these are
      // "fbperid" in the group chat and not "fbpage".
      let uid = await getFacebookAddressFromId(userId, FacebookAddressFormatNumeric, 'fbperid');
      let username = getUsernames ? getEmailPrefix(await getFacebookAddressFromId(userId, FacebookAddressFormatUsername)) : null;
   
      if (uid != null)
         groupChatParticipants.push({
            GroupChatUid: validateAddress(conversationId + '@fbrmid.socialattache.com'),
            Name: name,
            Uid: uid,
            Username: username
//                RoomRoles: [role]
         });
   }
   
   groupChatCacheParticipantsCache = groupChatParticipants;
   groupChatCacheParticipantsCacheUrl = document.location.href;
   
   Log_WriteInfo('Group chat ' + conversationId + ' parsed with ' + groupChatParticipants.length + ' participants');
   return groupChatParticipants;
}

function getMessengerConversationHeader()
{
   // the header above the selected conversation
   // DRL I added the SA_ButtonIcon check because the button we add may also match the selector.
   let name = null;
   let elems = findElements(srchPathPG('messengerConversationHeader'), ':not(.SA_augmented):not(.SA_ButtonIcon)');
   for (let elem of elems)
   {
      name = findElement(srchPathPG('messengerConversationHeaderName'), null, elem);
      if (name != null)
         return elem;
   }
   return null;
}

async function getProfileIDFromMessengerConversationHeader(elem, contactInfos)
{
   let id = findElement(srchPathPG('messengerConversationHeaderProfileID'), null, elem);

   let address = null;
   let normalizedAddress = 'fbp:' + validateAddress(id + '@numid.socialattache.com');
   if (contactInfos.hasOwnProperty(normalizedAddress))
   {
      let type = contactInfos[normalizedAddress].Type;
      if (type == 'contact')
         address = validateAddress(id + '@fbperid.socialattache.com');
      else if (type == 'room')
         address = validateAddress(id + '@fbrmid.socialattache.com');
      else if (type == 'page')
         address = validateAddress(id + '@fbpage.socialattache.com');
      else
         assert(0);
   }
   else
   {
      if (document.location.href.includes(id) && await isGroupChat())
         address = validateAddress(id + '@fbrmid.socialattache.com');
      else
         address = validateAddress(id + '@fbperid.socialattache.com'); // DRL FIXIT! We don't know if this is a page!
   }

   return address;
}

function getProfileNameFromMessengerConversationHeader(elem)
{
   return findElement(srchPathPG('messengerConversationHeaderName'), null, elem);
}

// lastCheck is 0 for the first check, it is never null
async function getMessages(accountInfo, conversationId, isRead, lastCheck, currentCheck)
{
   let conversationBox = await getConversationBox(conversationId);
   
   let messageBox = await waitForElement(srchPathFBM('messageBox'), 5);
   if (conversationBox == null || messageBox == null)
   {
      if (findElement(srchPathFBM('chatParsingThrottled')))
      {
         Log_WriteError('getMessages(): conversationBox or messageBox not found for ' + conversationId + ' at ' + document.location.href + ', message scraping throttled!');
         return [null, null];    // this indicates that we're being throttled
      }
      
      Log_WriteError('getMessages(): conversationBox or messageBox not found for ' + conversationId + ' at ' + document.location.href + ', page stuck?');
      // this seems to happen when the conversations list is no longer loading, the page seems stuck, so let's reload it
      return [null, null];    // this indicates that we're being throttled
//        return [[], null];
   }
   
   let cursor = null;
   let messages = [];
   let checkingNb = 0;
   let lastDateDivsNb = 0;
   let dateDivs = [];
   let messageBoxTimeout = 60;
   
   // only go back a maximum amount of time to avoid too many messages being imported
   if (lastCheck < getLatestSyncTimestamp())
      lastCheck = getLatestSyncTimestamp();
   
   while (true)
   {
      // I found that sometimes initially the scroll box hasn't been loaded yet (even after 10s) so I'm using
      // a wait here and allowing quite a bit of time for the first time through this loop
      let box = await waitForElement(srchPathFBM('messageScrollBox'), messageBoxTimeout, messageBox);
      messageBoxTimeout = 5;
      if (box == null)
      {
         if (findElement(srchPathFBM('chatParsingThrottled')))
         {
            Log_WriteError('No messages box found for conversation ' + conversationId + ' at ' + window.location.href + ', message scraping throttled!');
            return [null, null];    // this indicates that we're being throttled
         }
         else
         {
            Log_WriteError('No messages box found for conversation ' + conversationId + ' at ' + window.location.href + ', bad selector?');
//                return [[], null];
// this seems to be a throttling or slow loading case as well, and we don't want to miss messages
            return [null, null];    // this indicates that we're being throttled
         }
      }
      
      let scrollable = Utilities_GetScrollableParentElement(box);
      if (scrollable == null)
      {
         Log_WriteError('No scrollable found for conversation ' + conversationId + ' at ' + window.location.href + ', bad selector?');
         return [[], null];
      }
      
      dateDivs = findElements(srchPathFBM('dateDivs'));
      if (dateDivs.length == 0)
      {
         Log_WriteWarning('getMessages found no dateDivs for conversation ' + conversationId + ' at: ' + window.location.href)
      }
      
      // we wait at least 10 seconds for new items
      if (lastDateDivsNb == dateDivs.length && checkingNb > 5)   // 5 times is 10 seconds since we sleep 2s
         break;
      
      // new dates appear on screen, we reset the counter that break the loop if above 10 loop
      if (lastDateDivsNb != dateDivs.length)
         checkingNb = 0;
      
      lastDateDivsNb = dateDivs.length;
      
      // if any messages, we get the first one (that should be a timestamp message such as : Yesterday at 1:03)
      if (dateDivs.length > 0)
      {
         const timestamp = getMessageTimestamp(dateDivs[0]);
         if (timestamp < lastCheck)
         {
            break;
         }
      }
      
      reqPing();
      
      checkingNb++;
      
      scrollable.scrollTo(0, 0);
      
      await sleepRand(timings.FB_MESSAGES_SCRAPE_SCROLL_DELAY);
      reqPing();
   }
   
   let conversationAddress = null;
   let conversationName = null;
   let chatParticipantAddress = null;
   let chatParticipantName = null;
   
   const isGroup = await isGroupChat();
   if (isGroup)
   {
      // DRL FIXIT! We don't currently support importing group chat messages.
      
      conversationAddress = validateAddress(conversationId + '@fbrmid.socialattache.com');
      
      // DRL FIXIT? I think we would be better to pass in the conversation name, perhaps by having
      // scrollToConversation() return it?
      conversationName = findElement(srchPathFBM('messageBoxRoomName'), null, messageBox);
      if (conversationName == null)
      {
         Log_WriteError('Unable to find group chat conversation name from ' + document.location.href);
         Log_WriteDOM(messageBox);
      }
      
      Log_WriteInfo('For group conversation ' + conversationName + ' (' + conversationId +
         ') adding group imported message');
      
      // we add a single incoming message so we can create a contact for the room, and also update
      // the room name in case it changes
      let message = {
         Type: 'fbp_msg',
         Uid: NO_EXTERNAL_ID,
         Date: timestampToString(currentCheck),
         Url: window.location.href,
         Folder: 'inbox',
         IsChatRoom: true,
         From: conversationName + ' <' + conversationAddress + '>',
         To: [accountInfo.name + ' <' + validateAddress(accountInfo.id + '@fbperid.socialattache.com') + '>'],
         Body: Str('Messenger chat group imported but messages will not be imported.'),
         Attachments: []
      };
      messages.push(message);
      return [messages, cursor];
   }
   else
   {
      let contactInfos = await reqGetContactInfos('fbp');
      let header = getMessengerConversationHeader();
      conversationAddress = await getProfileIDFromMessengerConversationHeader(header, contactInfos);
      
      chatParticipantAddress = conversationAddress;
   
      // not sure whether this method always works?
      let profileName = getProfileNameFromMessengerConversationHeader(header);

      // DRL FIXIT? I think we would be better to pass in the conversation name, perhaps by having
      // scrollToConversation() return it?
      chatParticipantName = findElement(srchPathFBM('messageBoxParticipantName'), null, messageBox);
      if (chatParticipantName == null)
      {
         // this seems to happen for a conversation with no messages
         if (await isFacebookAccountAvailable(conversationId))
            Log_WriteError("Can't get participant name for conversation " + conversationId + " using messageBoxParticipantName and got profile name " + profileName + ".");
         else
            Log_WriteWarning("Can't get participant name for conversation " + conversationId + ", this may be a closed account or a user who's blocked me. Got profile name " + profileName + ".");
         Log_WriteDOM(messageBox);
         return [messages, cursor];
      }
   
      if (profileName != chatParticipantName)
         Log_WriteWarning("Got profile name " + profileName + " and participant name " + chatParticipantName);
      
      conversationName = chatParticipantName;
   }
   
   // If the timestamp we are comparing is very old then likely what we're using is a cursor.
   // With a cursor we prefer to use the exact date because presumably it hasn't been very long
   // since it was created so the parser should result in very similar dates. If the timestamp is
   // recent then it's possible that what we're comparing with will be different because it doesn't
   // take much time to go from 12 hours to 1 day, so in that case we round the timestamp up so
   // we may include messages already parsed but we will definitely not miss anything. If we did
   // this with old dates we may get stuck importing the same chunk over and over again.
   let roundMessageTimeUp = Date.now() - lastCheck < SecondsPerWeek * 4;
   
   let elems = findElements(srchPathFBM('messageAndDateDivs'));
   // I expect that if we don't have both a date and a message our selectors are wrong, although I did see
   // cases where there was no date when I clicked on a page Messenger and got an auto reply with just a
   // "how can we help?" type message (https://www.facebook.com/messages/t/111884770994633) or when a page
   // is responding to a comment I made (https://www.facebook.com/messages/t/106882044263386)
   if (dateDivs.length == 0 && elems.length > 0)
   {
      Log_WriteError('getMessages(): messages found, but dateDivs not found at: ' + document.location.href);
      return [messages, cursor];
   }
   if (dateDivs.length > 0 && elems.length <= dateDivs.length)
   {
      Log_WriteError('getMessages(): messageAndDateDivs (' + elems.length + ') same as or less than dateDivs (' +
         dateDivs.length + ') at: ' + document.location.href);
      return [messages, cursor];
   }
   // go through the array oldest first in case we drop out early
   let timestamp = null;
   let compareTimestamp = null;
   let lastTimestamp = null;
   let isLastDateChunk = false;
   for (let elem of elems)
   {
      if (dateDivs.includes(elem))
      {
         const newTimestamp = getMessageTimestamp(elem);
         if (newTimestamp == null)
         {
            Log_WriteError('getMessages(): error parsing timestamp at: ' + document.location.href);
            Log_WriteDOM(elem);
            return [messages, cursor];
         }
         
         if (timestamp == null)
         {
            // the first chunk of messages didn't have a timestamp, so we need to check if they're to be
            // included, and if so we'll need to set their dates
            let compareTimestamp = roundMessageTimeUp ? roundItemTimeUp(newTimestamp, lastCheck) : newTimestamp;
            
            // DRL I believe we use ">= lastCheck" here because the last messages may all be in the same
            // time section, so when a new message arrives it has the same time as an older one?
            if (compareTimestamp >= lastCheck)
            {
               let strDate = timestampToString(newTimestamp);
               for (let message of messages)
               {
                  message.Date = strDate;
               }
            }
            else
               messages = [];  // whatever messages we have are not in the range we want
         }
         
         isLastDateChunk = elem == dateDivs[dateDivs.length - 1];
         lastTimestamp = timestamp;
         timestamp = newTimestamp;
         compareTimestamp = roundMessageTimeUp ? roundItemTimeUp(timestamp, lastCheck) : timestamp;
         continue;
      }
      
      // we always parse the messages in the last date chunk because as messages are added to that chunk
      // the date may not change if there isn't a lot of time between messages
      if (!isLastDateChunk && compareTimestamp != null && compareTimestamp < lastCheck)
         continue;
      
      if (timestamp != null && timestamp > currentCheck)
         break;
      
      let message = null;
      if (timestamp != null)
      {
         message = await parseMessage(accountInfo, elem, timestamp, conversationAddress,
            conversationName, chatParticipantAddress, chatParticipantName);
         if (message)
            messages.push(message);
      }
      
      // we need to break out after we get too many messages to keep things efficient, BUT we need to
      // break at a point where we have a timestamp that will allow us to resume at the correct spot
      // since our timestamps are not very accurate (especially the older they get)
      if (messages.length >= constants.MAXIMUM_MESSAGES_PER_CHUNK && lastTimestamp != timestamp)
      {
         cursor = timestamp;
         Log_WriteInfo('Early exit ' + messages.length + ' messages retrieved. Using cursor: ' + cursor);
         break;
      }
      
      reqPing();
   }
   
   Log_WriteInfo('Returning ' + messages.length + ' messages and cursor ' + cursor);
   return [messages, cursor];
}

async function getConversationBox(conversationId)
{
   setSelectorVariables({ConversationID: conversationId});
   let conversationBox = await waitForElement(srchPathFBM('conversationBox'), 5);
   clearSelectorVariables();
   
   // we had some errors where the box wasn't found so I added this backup which should work since it matches
   // the original from getChats()
   if (conversationBox == null)
   {
      Log_WriteWarning('getConversationBox(): conversationBox not found for ' + conversationId + ' trying method 2');
      
      let elems = await waitForElements(srchPathFBM('chatsList'));
      
      for (let elem of elems)
      {
         const url = findElement(srchPathFBM('chatLinkUrl'), null, elem);
         if (url == null)
         {
            Log_WriteError('Facebook chatLinkUrl not found on chatsList item');
            Log_WriteDOM(elem);
         }
         if (getConversationIdFromMessengerUrl(url) == conversationId)
         {
            Log_WriteError('getConversationBox(): conversationBox for ' + conversationId + ' found using method 2');
            return elem;
         }
      }
   }
   
   return conversationBox;
}

// keep this method in sync with isConversationRead()!!!
async function markConversationUnread(url)
{
   // you can't mark it unread if it's the selected conversation, so first we look for and select a read one
   let [found, isRead] = await scrollToConversation(null, 'READ-' + url);
   if (!found || !isRead)
   {
      Log_WriteError('markConversationUnread(): read conversation not found at: ' + document.location.href);
      return;
   }
   
   let conversationId = getConversationIdFromMessengerUrl(url);
   let conversationBox = await getConversationBox(conversationId);
   
   if (conversationBox == null)
   {
      Log_WriteError('markConversationUnread(): conversationBox not found for ' + conversationId + ' at: ' + document.location.href);
      return;
   }
   
   let conversationActionsButtonOpen = await waitForElement(srchPathFBM('conversationActionsButtonOpen'), 2, conversationBox)
   if (conversationActionsButtonOpen == null)
   {
      Log_WriteError('markConversationUnread(): conversationActionsButtonOpen not found at: ' + document.location.href);
      Log_WriteDOM(conversationBox);
   }
   else
   {
      let conversationMarkAsUnreadButton = findElement(srchPathFBM('conversationMarkAsUnreadButton'), null, conversationBox);
      let conversationMarkAsReadButton = findElement(srchPathFBM('conversationMarkAsReadButton'), null, conversationBox);
      if (conversationMarkAsUnreadButton && conversationMarkAsReadButton)
      {
         Log_WriteError('markConversationUnread(): conversationMarkAsUnreadButton and conversationMarkAsReadButton BOTH found at: ' + document.location.href);
         Log_WriteDOM(conversationBox);
      }
      else if (conversationMarkAsUnreadButton == null && conversationMarkAsReadButton == null)
      {
         Log_WriteError('markConversationUnread(): conversationMarkAsUnreadButton and conversationMarkAsReadButton BOTH NOT found at: ' + document.location.href);
         Log_WriteDOM(conversationBox);
      }
      else if (conversationMarkAsUnreadButton != null)
      {
         conversationMarkAsUnreadButton.click();
      }
      let conversationActionsButtonClose = await waitForElement(srchPathFBM('conversationActionsButtonClose'), 2, conversationBox)
      if (conversationActionsButtonClose == null)
      {
         Log_WriteError('markConversationUnread(): conversationActionsButtonClose not found at: ' + document.location.href);
         Log_WriteDOM(conversationBox);
      }
   }
}
