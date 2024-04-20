async function parseMessage(elem, accountInfo, chatInfo, timestamp)
{
   let message = {
      Type: 'ig_msg',
      Uid: NO_EXTERNAL_ID,
      Date: timestampToString(timestamp),
      Url: window.location.href,
      Body: '',
      Attachments: []
   };
   if (findElement(srchPathIGM('sentFolderCheck'), null, elem))
   {
      message.Folder = 'sent';
      message.From = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@igun.socialattache.com') + '>';
      message.To = [chatInfo.name + ' <' + validateAddress(chatInfo.id + '@igun.socialattache.com') + '>'];
   }
   else if (findElement(srchPathIGM('inboxFolderCheck'), null, elem))
   {
      message.Folder = 'inbox';
      message.From = chatInfo.name + ' <' + validateAddress(chatInfo.id + '@igun.socialattache.com') + '>';
      message.To = [accountInfo.name + ' <' + validateAddress(accountInfo.id + '@igun.socialattache.com') + '>'];
   }
   else
   {
      Log_WriteError('Missing sent/inbox check for instagram messages!');
      return null;
   }
// DRL I don't know why this field is being included?
//    let h1 = elem.find('h1');
//    if ($(h1).length > 0) {
//        message.Action = $(h1).text();
//    }
   
   message.Body = findElement(srchPathIGM('body'), null, elem);
   
   for (let audio of findElements(srchPathIGM('audioAttachments'), null, elem))
      message.Attachments.push({URL: audio});
   for (let video of findElements(srchPathIGM('videoAttachments'), null, elem))
      message.Attachments.push({URL: video});
   for (let image of findElements(srchPathIGM('imageAttachments'), null, elem))
      message.Attachments.push({URL: image});
   
   await massageAttachments(message);
   
   return message;
}

async function parseMessages(accountInfo, chatName, startTimestamp, syncData)
{
   let chatInfo = await getChatInfo(chatName);
   if (chatInfo == null)
      return null;
   
   let sameLength = 0;
   let lastLength = 0;
   let dateDivs = [];
   
   // only go back a maximum amount of time to avoid too many messages being imported
   if (startTimestamp < getLatestSyncTimestamp())
      startTimestamp = getLatestSyncTimestamp();
   
   while (true)
   {
      dateDivs = findElements(srchPathIGM('dateDivs'));
      if (dateDivs.length == 0)
      {
         Log_WriteError('dateDivs not found at: ' + location.href);
         return null;
      }
      if (dateDivs.length == lastLength)
      {
         sameLength += 1;
      }
      else
      {
         sameLength = 0;
      }
      if (sameLength > 5)
      {
         break;
      }
      let timestamp = parseDateTime(dateDivs[0].innerText.trim());
      if (timestamp < startTimestamp || timestamp < syncData.timestamp)
      {
         break;
      }
      dateDivs[0].scrollIntoView();
      await pingingSleep(0.5);
      lastLength = dateDivs.length;
   }
   
   let elems = findElements(srchPathIGM('messageAndDateDivs'));
   let conversations = [];
   let conversation = null;
   // DRL FIXIT? This code seems to parse all the messages in a conversation and then throw away the older
   // ones as already read in. It would be great to optimize this a bit to not have to parse all the old
   // messages (sometimes there could be a lot!).
   // DRL FIXIT! We should collect messages individually instead of in conversations, to reduce complexity
   // and make the code align with the other syncs!
   for (let elem of elems)
   {
      if (dateDivs.includes(elem))
      {
         if (conversation)
         {
            conversations.push(conversation);
         }
         conversation = {
            timestamp: parseDateTime(elem.innerText),
            messages: []
         }
      }
      else
      {
         let msg = await parseMessage(elem, accountInfo, chatInfo, conversation.timestamp);
         if (msg == null)
         {
            return null;
         }
         conversation.messages.push(msg);
      }
      reqPing();
   }
   if (conversation)
   {
      conversations.push(conversation);
   }
   
   let newCheck = {
      timestamp: conversations[conversations.length - 1].timestamp,
      messageCount: conversations[conversations.length - 1].messages.length
   }
   let new_conversations = [];
   for (conversation of conversations)
   {
      if (conversation.timestamp < startTimestamp || conversation.timestamp < syncData.timestamp)
      {
         continue;
      }
      if (conversation.timestamp == syncData.timestamp)
      {
         if (conversation.messages.length <= syncData.messageCount)
         {
            continue;
         }
         conversation.messages = conversation.messages.slice(syncData.messageCount);
      }
      new_conversations.push(conversation);
   }
   if (new_conversations.length > 0)
   {
      syncData.timestamp = newCheck.timestamp;
      syncData.messageCount = newCheck.messageCount;
      return new_conversations;
   }
   return [];
}