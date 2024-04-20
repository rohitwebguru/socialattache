// chat timestamp are only the duration comparing to today ! Not like message, they don't got date but a duration in day, week ...
function getChatTimestampDelta(elem)
{
   const elems = findElements(srchPathFBM('chatTimestamp'), null, elem);
   if (elems.length <= 0)
   {
      return -1;
   }
   const data = Utilities_ArrayLastValue(elems).innerText;
   // to match multiple languages patterns
   // data in english version : 6w, 2h..
   // data in french version : 6 semaines, 2 mois.. 2 heures, 1 j, 2 h
   const time = timeToDelta(data);
   
   return isNaN(time) ? -1 : time;
}

// provide the url to scroll to the conversation with that url and then select it, or provide the lastCheck
// to scroll the conversations until we see one older than that timestamp or we don't see any more conversations
// (and it is good form to provide both when scrolling to a conversation so we can give up sooner if not found)
// or prefix the url with "READ-" to scroll until we find the first read conversation that isn't that one
// returns [success, isRead]
async function scrollToConversation(lastCheck, url)
{
   let lastChatListLength = 0;
   let lastScrollTime = Date.now();
   let dateWanted = lastCheck;
   
   if (dateWanted == null || dateWanted < getLatestSyncTimestamp())
      dateWanted = getLatestSyncTimestamp();   // go back a maximum of one year
   let findRead = url && url.startsWith('READ-');
   if (findRead)
      url = url.substring(5);
   
   let triedFocus = false;
   while (true)
   {
// this stopped working, maybe we need a different selector?
//        const chatScroll = await waitForElement(srchPathFBM('chatScroll'));
      let chatsList = await waitForElements(srchPathFBM('chatsList'));
      
      if (chatsList.length == 0)
      {
         if (findElement(srchPathFBM('chatParsingThrottled')))
         {
            Log_WriteError('Facebook message scraping throttled!');
            return [false, null];
         }
         
         Log_WriteError('Facebook chatsList not found!');
         // it looks like FB is also throttling here, not loading the page if we're using it a lot
         return [false, null];
      }
      
      if (url)
      {
         for (let elem of chatsList)
         {
            const link = findElement(srchPathFBM('chatLinkUrl'), null, elem);
            if (link == null)
            {
               Log_WriteError('Facebook chatLinkUrl not found on chatsList item, skipping');
               Log_WriteDOM(elem);
               continue;
            }
            
            const isRead = await isConversationRead(elem);
            
            if ((findRead && isRead && link !== url) ||
               (!findRead && link === url))
            {
               const bttn = await waitForElement(srchPathFBM('conversationSelection'), 2, elem);
               if (bttn == null)
               {
                  Log_WriteError('Facebook conversationSelection not found on chatsList item');
                  Log_WriteDOM(elem);
                  return [false, null];
               }
               
               const conversationId = getConversationIdFromMessengerUrl(url);
               let conversationBox = await getConversationBox(conversationId);
               assert(conversationBox != null);
               
               return [true, isRead];
            }
         }
      }
      
      const now = Date.now();
      let timestampDelta = -1;
      // the last few items are usually the "loading" items and are empty so skip over those
      let i = chatsList.length - 1;
      while (timestampDelta == -1 && i >= 0 && i >= chatsList.length - 5)
      {
         timestampDelta = getChatTimestampDelta(chatsList[i--]);
      }
      let foundWantedDate = timestampDelta !== -1 &&
         (roundItemTimeUp(now - timestampDelta, lastCheck) < dateWanted ||
            // added this so when we get to the maximum we pop out regardless of the above rounding up
            timestampDelta >= timings.FULL_CHAT_IMPORT_DELTA * 1000);
      
      if (lastChatListLength < chatsList.length)
      {
         lastChatListLength = chatsList.length;
         lastScrollTime = now;
      }

      let noScrollDelta = now - lastScrollTime;
      if (!triedFocus && noScrollDelta >= timings.FB_CONVERSATIONS_NO_CHANGE_TIMEOUT * 1000)
      {
         // push it to the foreground for 10 seconds
         Log_WriteInfo('Getting focus for 10 seconds to scrollToConversation()');
         if (await reqShowSyncWindowAndTab(10))
         {
            Log_WriteWarning('Focusing extension tab to try and get scrolling going');
            // let it sit 5 seconds before we try scrolling again
            await sleep(5);
         }
         else
            Log_WriteWarning('Focusing is disabled or failed so trying again (to likely fail and throttle)');
         triedFocus = true;
      }
      else if (foundWantedDate || noScrollDelta >= timings.FB_CONVERSATIONS_NO_CHANGE_TIMEOUT * 1000)
      {
         // this is an error case if a URL was provided and we didn't find it within a year
         if (url === -1)
         {
            Log_WriteError('Facebook conversation marked "read" not found!');
            return [false, null];
         }
         if (url != null)
         {
            if (foundWantedDate)
               Log_WriteError('Facebook conversation ' + url + ' not found within allotted time, not throttling!');
            else
               Log_WriteError('Facebook conversation ' + url + ' not found, and we have not got to the end date so throttling!');
            // if we did not find the conversation within the maximum history we will return it as "read" so
            // we don't throttle and can move to the next conversation for the getMessages() case
            return [false, foundWantedDate ? true : null];
         }
         if (!foundWantedDate && lastCheck != 0)
         {
            // we were looking for a specific date and it's not the one year mark then it means we did
            // find something on a previous check and we've not gotten back to that same point this
            // time so we're likely in a situation where the page is not loading more conversations
            Log_WriteError('Facebook conversation with timestamp ' + lastCheck + ' not found, got as far back as ' + Utilities_Div(timestampDelta, SecondsPerDay * 1000) + ' days!');
            return [false, null];
         }
         // if we didn't find the date but we didn't have a specific date we were looking for we'll
         // return success as the import code will try to go back in history next time around
         return [true, null];
      }

// this stops working when the item at the bottom of the list is not a
// conversation we match on (i.e. Marketplace)
//        chatsList[chatsList.length-1].scrollIntoView();
      let scrollable = Utilities_GetScrollableParentElement(chatsList[0]);
      scrollable.scrollTo(0, scrollable.scrollHeight);
      
      await sleepRand(triedFocus
         // if we just gave the focus lets wait a bit longer to let the scroll happen
         ? timings.FB_CONVERSATIONS_SCRAPE_SCROLL_AFTER_FOCUS_DELAY
         : timings.FB_CONVERSATIONS_SCRAPE_SCROLL_DELAY)
      reqPing();
   }
   
   Log_WriteError('We should never get here!');
   return [false, null];   // NOTE: We never get here because there's no break out of the above loop.
}

// keep this method in sync with markConversationUnread()!!!
async function isConversationRead(conversationBox)
{
   let isRead = false;
   let conversationActionsButtonOpen = await waitForElement(srchPathFBM('conversationActionsButtonOpen'), 2, conversationBox);
   if (conversationActionsButtonOpen == null)
   {
      Log_WriteError('isConversationRead(): conversationActionsButtonOpen not found at: ' + document.location.href);
      Log_WriteDOM(conversationBox);
   }
   else
   {
      let conversationMarkAsUnreadButton = findElement(srchPathFBM('conversationMarkAsUnreadButton'), null, conversationBox);
      let conversationMarkAsReadButton = findElement(srchPathFBM('conversationMarkAsReadButton'), null, conversationBox);
      if (conversationMarkAsUnreadButton && conversationMarkAsReadButton)
      {
         Log_WriteError('isConversationRead(): conversationMarkAsUnreadButton and conversationMarkAsReadButton BOTH found at: ' + document.location.href);
         Log_WriteDOM(conversationBox);
      }
      else if (conversationMarkAsUnreadButton != null)
      {
         isRead = true;
      }
      else if (conversationMarkAsReadButton != null)
      {
         isRead = false;
      }
      else
      {
         Log_WriteError('isConversationRead(): conversationMarkAsUnreadButton and conversationMarkAsReadButton not found at: ' + document.location.href);
         Log_WriteDOM(conversationBox);
      }
      let conversationActionsButtonClose = await waitForElement(srchPathFBM('conversationActionsButtonClose'), 2, conversationBox)
      if (conversationActionsButtonClose == null)
      {
         Log_WriteError('isConversationRead(): conversationActionsButtonClose not found at: ' + document.location.href);
         Log_WriteDOM(conversationBox);
      }
   }
   return isRead;
}

// lastCheck is 0 for the first check, it is never null
// lastCheck keeps track of how for forward we've gotten while historySynced keeps track of how far back we've gotten
async function getChats(lastCheck, historySynced)
{
   assert(lastCheck != null);
   
   if (historySynced == null)
      historySynced = Date.now();
   let newHistorySynced = historySynced;
   
   // DRL FIXIT? I think we can improve this by only doing the "history" side when there isn't anything new
   // to import, otherwise doing them both delays the import and processing of the new messages.
   
   let wantedDate = lastCheck;
   let farthestBack = lastCheck == 0
      ? getFirstLatestChatSyncTimestamp() // for the first pass we only go back a short period so the user isn't waiting
      : getLatestSyncTimestamp();         // subsequent passes go back the full amount
   
   if (historySynced > farthestBack)
   {
      if (lastCheck == 0)
         wantedDate = farthestBack;
      else
      {
         // we have yet to go back the full amount importing conversations, so try to do another chunk
         // so we're not taking a long time loading too much at once
         wantedDate = Math.max(historySynced - (timings.CHAT_IMPORT_CHUNK_DELTA * 1000), farthestBack);
      }
   }
   
   let [found, isRead] = await scrollToConversation(wantedDate, null);
   if (!found)
      return [null, null];    // throttling
   
   let chatUrls = [];
   let elems = await waitForElements(srchPathFBM('chatsList'));
   
   for (let elem of elems)
   {
      const url = findElement(srchPathFBM('chatLinkUrl'), null, elem);
      if (url == null)
      {
         Log_WriteError('Facebook chatLinkUrl not found on chatsList item');
         Log_WriteDOM(elem);
         continue;
      }
      const conversationId = getConversationIdFromMessengerUrl(url);
      
      let timestampDelta = getChatTimestampDelta(elem);

//console.log('lastCheck: ', lastCheck, ', ', new Date(lastCheck));
//console.log('conversationId: ', conversationId);
//console.log('timestampDelta: ', timestampDelta);
//console.log('chat timestamp: ', Date.now() - timestampDelta, ', ', new Date(Date.now() - timestampDelta));
      
      let date = Date.now() - timestampDelta;
      let upDate = roundItemTimeUp(date, lastCheck);
      let downDate = roundItemTimeDown(date, lastCheck);
      
      // DRL I believe we use ">= lastCheck" here because the last messages may all be in the same
      // time section, so when a new message arrives it has the same time as an older one?
      if (conversationId != null && timestampDelta != -1 &&
         (upDate >= lastCheck ||             // it is newer (rounded up so we don't miss messages) than our last check OR
            downDate < historySynced) &&    //     it is older (rounded down so we don't miss messages) than our history check
         date >= wantedDate)
      {               // it is newer than or equal to how far back we want to go
         chatUrls.push(url);
         
         if (date < newHistorySynced)
            newHistorySynced = date;
      }
      
      reqPing();
   }
   
   return [chatUrls, Math.min(historySynced, wantedDate)];
}
