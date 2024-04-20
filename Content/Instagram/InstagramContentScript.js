async function reqSetAccounts(accounts)
{
   return Messaging.SendMessageToBackground({type: 'setAccounts', accounts: accounts});
}

async function reqSetAccountInfo(accountInfo)
{
   return Messaging.SendMessageToBackground({
      type: 'setAccountInfo',
      id: accountInfo.id,
      // NOTE: We don't use the name as his appears to be the users actual name and
      // therefore would be the same across his accounts
      name: accountInfo.id,
   });
}


async function getMessagingAccountInfo()
{
   let accountInfo = null;
   let elems = await waitForElements('SCRIPT');
   for (let elem of elems)
   {
      let text = elem.innerText;
      // DRL FIXIT? Perhaps we should JSON.parse() the text like we do for Pinterest to avoid errors with our parsing below?
      if (text.includes('full_name'))
      {
         accountInfo = {};
         try
         {
// we could provide the id and the username and the full name but it works best for our purposes to use
// the username as the ID since in some cases the actual ID is hard to get
            if (text.indexOf('"full_name":"') != -1)
               accountInfo.name = text.split('"full_name":"')[1].split('"')[0];
            else
               accountInfo.name = text.split('\\"full_name\\":\\"')[1].split('\\"')[0];
            if (text.indexOf('"username":"') != -1)
               accountInfo.id = text.split('"username":"')[1].split('"')[0];
            else
               accountInfo.id = text.split('\\"username\\":\\"')[1].split('\\"')[0];
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
      throw new Error("Instagram account info not found");
   return accountInfo;
}


async function getMessagingAccounts()
{
   let accounts = [];
   let loginBoxClose = null;
   let elems = [];
   //console.log(DateAndTime_Now().ToFormat('%/D %:T') + ' waiting for element');
   do
   {
      let elem = await waitForElement(srchPathIGM('openAccountsDialogClick'), 4);
      if (elem == null)
      {
         // I expect at this point we have an Instagram user who only has a single account?
         let accountInfo = await getMessagingAccountInfo();
         if (accountInfo)
         {
            accounts.push(accountInfo.id);
            return accounts;
         }
         
         //console.log(DateAndTime_Now().ToFormat('%/D %:T') + ' throwing error');
         throw new Error("Can't find button to open Instagram messaging accounts dialog!");
      }
      
      elems = await waitForElements(srchPathIGM('accountsItem'), 4);
      
      loginBoxClose = findElement(srchPathIGM('loginDialogBoxCloseButton'));
      if (elems.length == 0 && loginBoxClose != null)
      {
         loginBoxClose.click()
         Log_WriteError('Error on the getMessagingAccounts() opening login box instead of the users list')
      }
      else
      {
         loginBoxClose = null
      }
   } while (loginBoxClose != null)
   
   for (let elem of elems)
   {
      // DRL FIXIT! Sometimes the profile email is shown instead of the username! We skip if we see an email
      // to avoid importing an invalid ID.
      if (elem.innerText.indexOf('@') == -1)
         accounts.push(elem.innerText.trim());
   }
   
   let elem = await waitForElement(srchPathIGM('closeAccountsDialogClick'));
   if (elem == null)
   {
      Log_WriteError('Element not found using closeAccountsDialogClick at: ' + window.location.href);
   }
   
   return accounts;
}


async function selectAccount(accountID)
{
   Log_WriteInfo('Looking for account ' + accountID);
   let elem = await waitForElement(srchPathIGM('openAccountsDialogClick'), 4);
   if (elem == null)
   {
      Log_WriteError('openAccountsDialogClick not found at: ' + location.href);
      return;
   }
   let found = false;
   let elems = await waitForElements(srchPathIGM('accountsItem'));
   for (let elem of elems)
   {
      // DRL FIXIT! Sometimes the profile email is shown instead of the username! I noticed that when
      // you click on it the title shown when the page refreshes is the non-email correct value so we
      // could perhaps handle this case somehow?
      let foundAccountID = elem.innerText.trim(); // DRL FIXIT! Use a selector to get the ID!
      if (foundAccountID == accountID)
      {
         if (elem != elems[0])
         { // the first item is the already selected one
            let elem2 = await waitForElement(srchPathIGM('accountsItemButtonClick'), null, elem);
            if (elem2 == null)
            {
               Log_WriteError('accountsItemButtonClick not found at: ' + location.href);
               return;
            }
         }
         found = true;
      }
      else
         Log_WriteInfo('Skipping account ' + foundAccountID);
   }
   if (!found)
   {
      Log_WriteError('Instagram account ' + accountID + ' not found at: ' + location.href);
   }
   
   elem = await waitForElement(srchPathIGM('closeAccountsDialogClick'));
   if (elem == null)
   {
      Log_WriteError('Element not found using closeAccountsDialogClick at: ' + window.location.href);
   }
}


async function reqParsedFinalChat(accountID, tab)
{
   return Messaging.SendMessageToBackground({
      type: 'parsedFinalChat',
      accountID: accountID,
      tab: tab
   });
}


async function sendConversation(accountID, conversations, syncData, checkedChats)
{
   return Messaging.SendMessageToBackground({
      type: 'sendConversation',
      accountID: accountID,
      conversations: conversations,
      syncData: syncData,
      checkedChats: checkedChats
   });
}

// returns the name of the chat so we can skip it next time
async function openNextChat(checkedChats)
{
   let lastChat = '';
   let attempts = 0;
   while (true)
   {
      attempts++;
      let elems = await waitForElements(srchPathIGM('chatElem'), 1);
      if (elems.length == 0)
      {
         // DRL It looks like sometimes when the page is in the background it doesn't get fully
         // populated with the items we seek??
         // It also looks like this is the same scenario if there are no messages yet - or perhaps
         // Instagram is not showing them because the account was recently blocked as a possible robot?
         if (attempts == 10)
         {
            if (findElement(srchPathIGM('chatsLoading')) != null)
            {
               Log_WriteError("Instagram messages still loading after 10 seconds, aborting!");
            }
            else
            {
               Log_WriteInfo("Instagram messages not found after 10 seconds, maybe there aren't any?");
            }
            break;
         }
         continue;
      }
      attempts = 0;
      for (let i = 0; i < elems.length; i++)
      {
         // DRL FIXIT? Skip group chats as we don't handle those yet.
         if (elems[i].innerText.indexOf(',') != -1)
         {
            elems.splice(i, 1);
            i--;
         }
      }
      if (elems.length == 0 ||                // we only have group chats, or no chats
         lastChat == elems[elems.length - 1].innerText)
      {  // nothing changed since last loop
         break;
      }
      lastChat = elems[elems.length - 1].innerText;
      // console.log(lastChat);
      for (let elem of elems)
      {
         if (!checkedChats.includes(elem.innerText))
         {
            elem.click();
            let threadDetails = await waitForElement(srchPathIGM('threadMessagesOpenButton'));
            threadDetails.click();
            
            setSelectorVariables({Username: elem.innerText});
            let username = await waitForElement(srchPathIGM('threadDetailsMessagesUsername'));
            clearSelectorVariables();
            let backToChatFromThreadDetails = findElement(srchPathIGM('threadMessagesCloseButton'));
            backToChatFromThreadDetails.click();
            return username;
         }
      }
      elems[elems.length - 1].scrollIntoView();
      await sleep(1);
   }
   return null;
}


async function getCurrentTab()
{
   let primaryActive = await waitForElement(srchPathIGM('primaryTabIsActive'), 3);
   let generalActive = findElement(srchPathIGM('generalTabIsActive'));
   
   if (primaryActive)
   {
      return PRIMARY_TAB;
   }
   else if (generalActive)
   {
      return GENERAL_TAB;
   }
   
   Log_WriteError('Selector cannnot identify whether Instagram primary or general tab is active');
   return null;
}


async function getChatInfo(chatName)
{
   let info = {};
   info.id = chatName;
   await sleep(1);
   let elem = await waitForElement(srchPathIGM('chatInfoButton'));
   if (elem == null)
   {
      Log_WriteError('Element not found using chatInfoButton at: ' + window.location.href);
      return null;
   }
   elem.click();
   elem = await waitForElement(srchPathIGM('chatInfoName'));
   if (elem == null)
   {
      Log_WriteError('Element not found using chatInfoName at: ' + window.location.href);
      return null;
   }
   info.name = elem.innerText.trim();  // DRL FIXIT! This should be part of the selector!
   elem = await waitForElement(srchPathIGM('chatInfoCloseButton'));
   if (elem == null)
   {
      Log_WriteError('Element not found using chatInfoCloseButton at: ' + window.location.href);
      return null;
   }
   elem.click();
   await sleep(1);
   return info;
}


async function loopInstagram()
{
   console.log(DateAndTime_Now() + " loopInstagram()");
   
   try
   {
      
      if (!await reqInitTab(IG_DATA_NAME))
         return;
      let accountInfo = null;
      let noAccountInfoCount = 0;
      let isThrottled = null;
      while (true)
      {
         let delay = timings.BUSY_LOOP_DELAY;
         
         try
         {
            if (!Storage.IsAllStorageReady())
            {
               Log_WriteWarning('Storage not ready for Instagram, waiting');
               await sleep(2);
               continue;
            }
            
            if (!await reqCheckSocialAttacheLogin(true))
            {
               await pingingSleep(timings.SA_NOT_LOGGED_IN_DELAY);
               continue;
            }
            
            let isMessaging = fuzzyUrlStartsWith(document.location.href, "https://www.instagram.com/direct") ||
               // when the user is not logged in go through the messaging flow below
               document.location.href.indexOf('/login/') != -1;
            
            if (accountInfo == null || accountInfo.id == null)
            {
               Log_WriteInfo('Getting Instagram account info');
               accountInfo = await getMessagingAccountInfo();
               if (accountInfo != null)
               {
                  Log_WriteInfo('Account info: ' + GetVariableAsString(accountInfo));
                  noAccountInfoCount = 0;
               }
               else
               {
                  Log_WriteInfo('Using empty account info for posting');
                  accountInfo = {id: null, name: null};
               }
            }
            
            let currentCheck = Date.now();
            
            let lastIsThrottled = isThrottled;
            isThrottled = !!(noAccountInfoCount >= 30 ||   // about 5 minutes
               findElement(elementPaths.Instagram.throttled));
            
            let resp = await reqGetAction(IG_DATA_NAME, accountInfo.id, accountInfo.name);
            if (resp == null)
            {
               Log_WriteInfo('Background not ready');
            }
            else if (resp.action && isThrottled)
            {
               await reqSetActionThrottled(IG_DATA_NAME, resp.action);
               resp.action = null;
            }
            else if (lastIsThrottled != isThrottled)
               await reqSetThrottled(IG_DATA_NAME, isThrottled, 'generic');
            
            if (resp == null || resp.action == null)
            {
               delay = timings.IDLE_LOOP_DELAY;
            }
            else if (resp.action == 'wait')
            {
               delay = resp.seconds;
            }
            else if (resp.action == 'getAccounts')
            {
               let accounts = isMessaging
                  ? await getMessagingAccounts()
                  : await getPostingAccounts();
               await reqSetAccounts(accounts);
            }
            else if (resp.action == 'getAccountInfo')
            {
               assert(resp.accountID == accountInfo.id);
               await reqSetAccountInfo(accountInfo);
            }
            else if (resp.action == 'getNextChat')
            {
               assert(isMessaging);
               assert(resp.accountID == accountInfo.id);
               let syncDatas = JSON.parse(resp.syncData) || {};
               
               let currentTab = await getCurrentTab();
               if (resp.currentTab != currentTab)
               {
                  Log_WriteError('Unable to get to ' + resp.currentTab + ' tab, stuck at ' + currentTab);
                  await reqParsedFinalChat(accountInfo.id, currentTab);
                  continue;   // no wait, just check again for next action
               }
               
               let chatName = await openNextChat(resp.checkedChats);
               if (chatName == null)
               {
                  Log_WriteInfo('Finished with the ' + currentTab + ' tab');
                  await reqParsedFinalChat(accountInfo.id, currentTab);
                  continue;   // no wait, just check again for next action
               }
               
               let syncData = {timestamp: 0, messageCount: 0};
               if (chatName in syncDatas)
               {
                  syncData = syncDatas[chatName];
               }
               let conversations = await parseMessages(accountInfo, chatName, startTimestamp, syncData);
               if (conversations === null)
               {
                  await reqSetActionThrottled(IG_DATA_NAME, resp.action);
               }
               else if (conversations.length > 0)
               {
                  syncDatas[chatName] = syncData;
                  await sendConversation(
                     accountInfo.id,
                     conversations,
                     JSON.stringify(syncDatas),
                     resp.checkedChats.concat(chatName)
                  );
                  // DRL FIXIT? We should be skipping this delay if there are no more chats to check.
                  delay = timings.INTER_CONVERSATION_CHECK_DELAY;
               }
               else
               {
                  // since we traverse the chats newest first when there are no messages we're done with this tab
                  await reqParsedFinalChat(accountInfo.id, currentTab);
               }
            }
            else if (resp.action == 'sendMessage')
            {
               let [messageID, errorMessage] = await sendMessage(resp.message);
               let from = accountInfo.name + ' <' + validateAddress(accountInfo.id + '@igun.socialattache.com') + '>';
               await reqSetMessageId(IG_DATA_NAME, accountInfo.id, resp.message.MessageBoxUid, resp.message.Uid, messageID, from, errorMessage);
            }
            else if (resp.action == 'makePost')
            {
               let postID = await createPost(resp.accountID, resp.accountName, resp.post);
               let from = '<' + validateAddress(resp.accountID + '@igun.socialattache.com') + '>';
               await reqSetPostId(IG_DATA_NAME, resp.accountID, resp.post.MessageBoxUid, resp.post.Uid, postID, from);
            }
            else if (resp.action == 'getContact')
            {
               let vCard = await getvCardFromInstagramProfile();
               if (vCard == null)
                  await reqSetActionThrottled(IG_DATA_NAME, resp.action);
               else
                  delay = await reqSendContact(IG_DATA_NAME, resp.accountID, resp.syncCommandID, vCard);
            }
            else
            {
               assert(0, "Unrecognized action: " + resp.action);
            }
            
         }
         catch (e)
         {
            accountInfo = null; // in case the exception was due to logging out, try to get account info
            delay = await handleScraperException(IG_DATA_NAME, e, 'https://' + window.location.host);
         }
         
         try
         {
            await pingingSleep(delay);
         }
         catch (e)
         {
            await handleScraperException(FB_DATA_NAME, e, 'https://' + window.location.host);
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
   
   loopInstagram();        // this is an async function we are launching and returning right away
});