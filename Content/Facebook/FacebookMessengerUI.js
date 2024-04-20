const NotRead = -1;
const NotResponded = -2;
const IsOnline = -3;
const NotTagged = -4;
const NotDownloaded = -5;
const NoTask = -6;
const UpcomingTask = -7;
const OverdueTask = -8;
const RemoteNotRead = -9;
const RemoteNotResponded = -10;
const FilterStringToInt = {
   NotRead: -1,
   NotResponded: -2,
   IsOnline: -3,
   NotTagged: -4,
   NotDownloaded: -5,
   NoTask: -6,
   UpcomingTask: -7,
   OverdueTask: -8,
   RemoteNotRead: -9,
   RemoteNotResponded: -10
};

function MessengerFilterInit()
{
   return {
      lastMenuRefreshed: null,
      selectedFilterID: null,
      filteredTagIDs: []      // must be integers
   };
}

// called when the search filters edit form has closed so we need to update the filter (in case the user
// was editing a different one) as well as the menu (in case a menu item was renamed)
async function updateSearchFilterMenu()
{
   await reqReloadSearchFilters();
   
   // allow menu to be refreshed after any changes have had time to reload
   setTimeout(async function()
   {
      try
      {
         let localData = Storage.GetTabVar('MessengerFilter', MessengerFilterInit());
         localData.lastMenuRefreshed = null; // force menu update
         Storage.SetTabVar('MessengerFilter', localData);
         
         await updateMessengerFilterMenu();
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   }, 5 * 1000);
}

async function setSearchFilter(filterID)
{
   let localData = Storage.GetTabVar('MessengerFilter', MessengerFilterInit());
   
   if (localData.selectedFilterID == filterID)
      return;
   
   localData.lastMenuRefreshed = null;       // needed in order for menu to get refreshed
   localData.selectedFilterID = null;
   localData.filteredTagIDs = [];
   
   if (filterID == null)
   {
      DisplayMessage(Str('Not filtering'), 'success', null, 3);
      Storage.SetTabVar('MessengerFilter', localData);
      await updateMessengerFilterMenu();
      messengerContactTagsFilterChats(true)
      return;
   }
   
   let filter = await reqGetSearchFilter(filterID);
   if (filter == null)
   {
      DisplayMessage(Str('Not filtering'), 'error', null, 3);
      Storage.SetTabVar('MessengerFilter', localData);
      await updateMessengerFilterMenu();
      messengerContactTagsFilterChats(true)
      return;
   }
   
   DisplayMessage(Str('Filtering: <0>', filter.Name), 'success', null, 3);
   
   filter = filter.SearchFilter;
   if (filter.hasOwnProperty('TagID'))
      for (const tagID of filter.TagID)
      {
         localData.filteredTagIDs.push(parseInt(tagID)); // our filtering code expects the IDs to be integers, not strings
      }
   if (filter.hasOwnProperty('ConversationState'))
      for (const state of filter.ConversationState)
      {
         localData.filteredTagIDs.push(FilterStringToInt[state]);
      }
   if (filter.hasOwnProperty('TaskStatus'))
      for (const status of filter.TaskStatus)
      {
         localData.filteredTagIDs.push(FilterStringToInt[status]);
      }
   localData.selectedFilterID = filterID;
   
   Storage.SetTabVar('MessengerFilter', localData);
   
   await updateMessengerFilterMenu();
   messengerContactTagsFilterChats(true)
}

async function updateMessengerFilterMenu()
{
   await updateMessengerFilterLayout(srchPathFBM('chatContactsActionBar'), 'fb_messenger', 'updateSearchFilterMenu', srchPathFBM('chatContactsActionBar'));
}

function messengerContactTagsFilterChats(filterChanged)
{
   let localData = Storage.GetTabVar('MessengerFilter', MessengerFilterInit());
   
   let contactButtons = findElements(srchPathFBM('chatContactButtonsElements',
      filterChanged ? null : ':not(.SA_Filtered)'))
   
   if (localData.filteredTagIDs.length <= 0)
   {
      //Make all contacts visible
      for (let contactButton of contactButtons)
      {
         Class_RemoveByElement(contactButton, 'SA_Filtered');
         contactButton.style.display = "block"
      }
      return;
   }
   
   // pre-calculate some flags to make the code more efficient in the loop
   let hasTaskFilter = false
   let hasTagFilter = false
   let wantNotRead = false;
   let wantNotResponded = false;
   let wantIsOnline = false;
   let wantNotTagged = false;
   let wantNotTasked = false;
   let keepNotDownloaded = false;
   let wantRemoteNotRead = false
   let wantRemoteNotResponded = false
   for (let filteredTagID of localData.filteredTagIDs)
   {
      if (filteredTagID == NotRead)
         wantNotRead = true;
      else if (filteredTagID == NotResponded)
         wantNotResponded = true;
      else if (filteredTagID == IsOnline)
         wantIsOnline = true;
      else if (filteredTagID == NotDownloaded)
      {
         keepNotDownloaded = true;
         hasTaskFilter = true;
      }
      else if (filteredTagID == NoTask)
         wantNotTasked = true;
      else if (filteredTagID == UpcomingTask || filteredTagID == OverdueTask)
         hasTaskFilter = true;
      else if (filteredTagID == NotTagged)
      {
         wantNotTagged = true;
         hasTagFilter = true;
         keepNotDownloaded = true;
      }
      else if (filteredTagID == RemoteNotRead)
      {
         wantRemoteNotRead = true;
      }
      else if (filteredTagID == RemoteNotResponded)
      {
         wantRemoteNotResponded = true;
      }
      else
         hasTagFilter = true;
   }
   // if there is both a task filter and a tag filter then both types must have a match to show a contact
   let minTypesToShow = 0;
   if (wantNotRead || wantNotResponded || wantIsOnline || wantRemoteNotRead || wantRemoteNotResponded)
      minTypesToShow++;
   if (wantNotTasked || hasTaskFilter)
      minTypesToShow++;
   if (wantNotTagged || hasTagFilter)
      minTypesToShow++;
   
   //Go thought the list of contacts and check if they have the filter active tags, if not, hide, if have, keep visible
   for (let contactButton of contactButtons)
   {
      Class_AddByElement(contactButton, 'SA_Filtered');
      let id = findElement(srchPathFBM('messageElementWithId'), null, contactButton);
      if (id == null)
      {
         Log_WriteError('messageElementWithId not found for Messenger conversation');
         continue;
      }
      let protoAddress = normalizeContactAddress('fbp:' + validateAddress(id + '@fbperid.socialattache.com'));
      let unreadMatched = 0;
      let taskMatched = 0;
      let tagMatched = 0;
      if (savedContactInfos && savedContactInfos.hasOwnProperty(protoAddress))
      {
         let contactInfo = savedContactInfos[protoAddress];
         for (let filteredTagID of localData.filteredTagIDs)
         {
            if (contactInfo.TagIDs.includes(filteredTagID) ||
               (filteredTagID == NotTagged && contactInfo.TagIDs.length == 0))
               tagMatched = 1;
            
            if ((filteredTagID == NoTask && contactInfo.TaskStatus == 'none') ||
               (filteredTagID == UpcomingTask && contactInfo.TaskStatus == 'upcoming') ||
               (filteredTagID == OverdueTask && contactInfo.TaskStatus == 'overdue'))
               taskMatched = 1;
         }
      }
      else
      {
         if (keepNotDownloaded)
         {
            if (wantNotTagged)
               tagMatched = 1;
            taskMatched = 1;
         }
      }
      if ((wantRemoteNotResponded && findElement(srchPathFBM('messageViewedButNotAnswered'), null, contactButton)) ||
         (wantRemoteNotRead && findElement(srchPathFBM('messageNotViewed'), null, contactButton)) ||
         (wantNotRead && findElement(srchPathFBM('messageIsUnread'), null, contactButton)) ||
         (wantNotResponded && findElement(srchPathFBM('messageIsNotResponded'), null, contactButton) && !findElement(srchPathFBM('messageIsUnread'), null, contactButton)) ||
         (wantIsOnline && findElement(srchPathFBM('messageIsOnline'), null, contactButton)))
         unreadMatched = 1;
      
      let displayOrNot = unreadMatched + tagMatched + taskMatched >= minTypesToShow
      contactButton.style.display = displayOrNot ? "block" : "none";
   }
}

async function messengerContactSummaryCreator(accountInfo, contactInfos, contactTags, helpItems)
{
   if (window.location.href.includes('/messenger_media?'))
      return; // looking at an attachment
   
   let elem = findElement(srchPathFBM('messageHeaderTitleContainer'));
   if (elem == null)
      return; // page not ready yet?
   
   // We don't know whether this is a page or a person or a chat room, and Contacts.js massages the IDs for us.
   let convID = getMessengerConversationID(window.location.href);
   if (convID == null)
   {
      Log_WriteErrorCallStack('Unable to get messenger conversation ID from URL: ' + window.location.href);
      return;
   }
   let address = validateAddress(convID + '@fbperid.socialattache.com');
   
   let contactSummaryHtmlStr = FacebookContactSummaryBoxWrapperCreator(contactInfos, contactTags, address, '');
   if (contactSummaryHtmlStr != null)
   {
      let contactSummaryElem = Utilities_CreateHtmlNode(contactSummaryHtmlStr);
      
      Class_AddByElement(elem, 'SA_augmented');
      addElementByButtonStyle(elem, contactSummaryElem, constantStyles.Facebook.MessengerPage.MessengerConversationHeaderTags.button);
      
      let normalized = normalizeContactAddress(address);
      let idClass = createClassFromAddress(normalized);
      let iconEl = findElement('div#open_contact_dashboard_' + idClass, ':not(.SA_augmented)');
      if (iconEl == null)
      {
         assert(0);
         return; // in case dom is not ready yet.
      }
      
      // the header above the selected conversation
      let header = getMessengerConversationHeader();
      let profileID = await getProfileIDFromMessengerConversationHeader(header, contactInfos);
      let name = getProfileNameFromMessengerConversationHeader(header);

      if (profileID != null && name != null)
      {
         Class_AddByElement(iconEl, 'SA_augmented');
         
         await _processMessengerLink(contactInfos, helpItems, accountInfo.id, iconEl, Url_GetEmailPrefix(profileID), name, true,
            constantStyles.Facebook.MessengerPage.MessengerConversationHeaderButton);
      }
   }
}

async function isGroupChat()
{
   await sleep(1);
   
   // DRL FIXIT? It looks like we could simplify this code now that FB uses a different info text for convos
   // versus group chats, but we'll want to keep the old code in case they move back to a common text.
   
   let buttonSidebar = await waitForElement(srchPathFBM('sideBarButton'));
   if (buttonSidebar == null)
   {
      Log_WriteError('For conversation ' + window.location.href + ' sideBarButton not found to check if group chat!');
      return false;
   }
   if (findElement(srchPathFBM('sideBarMenu')) == null)
   {
      buttonSidebar.click();
   }
   
   let sidebarContainer = await waitForElement(srchPathFBM('sideBarMenu'));
   if (sidebarContainer == null)
   {
      Log_WriteError('For conversation ' + window.location.href + ' sidebarContainer not found to check if group chat!');
      return false;
   }
   if (findElement(srchPathFBM('sideBarMenuContainsMembers')))
   {
      return true;
   }
   
   return false;
}


async function _processMessengerLink(contactInfos, helpItems, accountID, elem, id, name, isSelectedConvo, styles)
{
   assert(id != null && name != null);
   
   let hide = false;
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
   else if (isSelectedConvo)
   {
      if (document.location.href.includes(id) && await isGroupChat())
         address = validateAddress(id + '@fbrmid.socialattache.com');
      else
         address = validateAddress(id + '@fbperid.socialattache.com'); // DRL FIXIT! We don't know if this is a page!
   }
   else
   {
      // When we don't know the type of the item we hide the button so we don't inadvertently allow
      // the user to download it as the wrong type. We do this instead of not adding a button because
      // our logic will update the button when the item is later downloaded and appears in contactInfos.
      hide = true;
      address = validateAddress(id + '@fbperid.socialattache.com'); // address type doesn't matter here because we're hiding the button
   }
   
   let normalized = normalizeContactAddress(address);
   assert('fbp:' + normalized == normalizedAddress);
   
   // it looks like sometimes the SA_augmented class gets removed from a conversation entry, perhaps when
   // the user clicks on it, but the elements we added inside it continue to exist so in this case we'll
   // skip creating them again
   let idClass = createClassFromAddress(normalized);
   let elems = Utilities_GetElementsByClass(idClass, null, elem);
   if (elems.length > 0)
   {
      Log_WriteError('Found existing button for ' + name + ' (' + id + ') at ' + window.location.href + ', removing before adding.');
      assert(elems.length == 1);
      elems[0].remove();
   }
   
   let [icon, label, classes] = contactIconAndLabel(contactInfos, 'fbp', address, 'contact_open', true);
   
   let button = addActionIcon(elem, async function(e)
   {
      let vCard = await getvCardFromNameAndAddress(name, 'facebook', 'fbp', address);
      DisplayMessage(Str('Loading...'), 'busy', null, 5);
      DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', FB_DATA_NAME,
         'Protocol', 'fbp', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Facebook Messenger'));
   }, styles, icon, label, classes);
   
   if (hide)
      Visibility_HideByElement(button);
}

async function massageMessengerPage(contactInfos, contactTags, helpItems)
{
   let found = false;
   
   // Messenger page
   let accountInfo = getFacebookAccountInfo()
   if (accountInfo == null)
   {
      assert(0);
      return;
   }
   let accountID = accountInfo.id;
   
   messengerContactTagsFilterChats(false);
   
   removeOldMassaging(contactInfos);
   
   await messengerContactSummaryCreator(accountInfo, contactInfos, contactTags, helpItems)
   await updateMessengerFilterMenu()
   
   // conversations in the conversation list
   // DRL I added the SA_ButtonIcon check because the button we add may also match the selector.
   let elems = findElements(srchPathPG('messengerConversationListItem'), ':not(.SA_augmented):not(.SA_ButtonIcon)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      // name might be in a SPAN sub-item along with another SPAN with other text so we want the first one
      let name = findElement(srchPathPG('messengerConversationListItemName'), null, elem);
      if (name == null)
         continue; // the window may be too narrow so we're seeing the version without the name??
      
      let id = findElement(srchPathPG('messengerConversationListItemID'), null, elem);
      if (id == null)
         continue; // the window may be too narrow so we're seeing the version without the name??
      
      await _processMessengerLink(contactInfos, helpItems, accountID, elem, id, name, false,
         constantStyles.Facebook.MessengerPage.MessengerConversationListItemButton);
      
      found = true;
   }
   
   elems = findElements(srchPathPG('messengerGroupChatSidebarParticipantContainers'), ':not(.SA_augmented):not(.SA_ButtonIcon)')
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
   
      let menu = findElement(srchPathPG('messengerGroupChatSidebarParticipantMenu'), null, elem)
      if (menu == null)
      {
         Log_WriteError('For group chat ' + window.location.href + ' participant menu not found!');
         break;
      }
   
      menu.click();
   
      let userId = await waitForElement(srchPathPG('messengerGroupChatSidebarParticipantUserId'), 3, elem)
      if (userId == null)
      {
         Log_WriteError('For group chat ' + window.location.href + ' participant ID not found!');
         menu.click();
         break;
      }
      let name = findElement(srchPathPG('messengerGroupChatSidebarParticipantName'), null, elem)
      if (name == null)
      {
         Log_WriteError('For group chat ' + window.location.href + ' participant name not found!');
         menu.click();
         break;
      }
   
      menu.click();
      await sleep(.5);
      
      _processMessengerLink(contactInfos, helpItems, accountID, elem, userId, name, false,
         constantStyles.Facebook.MessengerPage.MessengerGroupChatParticipantButton);
   }
   
   return found;
}
