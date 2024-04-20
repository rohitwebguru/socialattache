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
async function instagramUpdateSearchFilterMenu()
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
         
         await instagramUpdateMessengerFilterMenu();
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
      await instagramUpdateMessengerFilterMenu();
      instagramMessengerContactTagsFilterChats(true)
      return;
   }
   
   let filter = await reqGetSearchFilter(filterID);
   if (filter == null)
   {
      DisplayMessage(Str('Not filtering'), 'error', null, 3);
      Storage.SetTabVar('MessengerFilter', localData);
      await instagramUpdateMessengerFilterMenu();
      instagramMessengerContactTagsFilterChats(true)
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
   
   await instagramUpdateMessengerFilterMenu();
   instagramMessengerContactTagsFilterChats(true)
}

function instagramUpdateFilterActiveIndication()
{
   let prependDropDownMenu = findElement(srchPathIGM('chatContactsActionBar'))
   if (prependDropDownMenu == null)
      return;
   
   let buttonElement = findElement('.SA', null, prependDropDownMenu);
   let filterActiveImg = findElement('.filterActive', null, buttonElement)
   
   let localData = Storage.GetTabVar('MessengerFilter', MessengerFilterInit());
   
   //If there is active filters will show the filterActiveImg and change the background color to green
   // if not just hide and keep the background color to default
   if (localData.filteredTagIDs.length > 0)
   {
      if (filterActiveImg != null)
         filterActiveImg.style['display'] = 'block';
      buttonElement.style['background-color'] = "#8bc18f";
   }
   else
   {
      if (filterActiveImg != null)
         filterActiveImg.style['display'] = 'none';
      buttonElement.style['background-color'] = "#e4e6eb";
   }
}

async function instagramUpdateMessengerFilterMenu()
{
   await updateMessengerFilterLayout(srchPathIGM('messengerActionsHeader'), 'fb_messenger', 'instagramUpdateSearchFilterMenu', srchPathIGM('chatContactsActionBar'));
}

function instagramMessengerContactTagsFilterChats(filterChanged)
{
   let localData = Storage.GetTabVar('MessengerFilter', MessengerFilterInit());
   
   let contactButtons = findElements(srchPathIGM('chatContactButtonsElements',
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
      let address = instagramGetContactAddressFromMessengerElement(contactButton);
      let protoAddress = address ? normalizeContactAddress('ig:' + address) : null;
      let normalizedName = normalizeContactNameForIndex(instagramGetContactNameFromMessengerElement(contactButton));
      let unreadMatched = 0;
      let taskMatched = 0;
      let tagMatched = 0;
      if (savedContactInfos && (savedContactInfos.hasOwnProperty(protoAddress ? protoAddress : normalizedName)))
      {
         let contactInfo = savedContactInfos[protoAddress ? protoAddress : normalizedName];
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
      
      //Filter logic
      if ((wantRemoteNotResponded && findElement(srchPathIGM('messageViewedButNotAnswered'), null, contactButton)) ||
         (wantRemoteNotRead && findElement(srchPathIGM('messageNotViewed'), null, contactButton)) ||
         (wantNotRead && findElement(srchPathIGM('messageIsUnread'), null, contactButton)) ||
         (wantNotResponded && findElement(srchPathIGM('messageIsNotResponded'), null, contactButton)) ||
         (wantIsOnline && findElement(srchPathIGM('messageIsOnline'), null, contactButton)))
         unreadMatched = 1;
      
      let displayOrNot = unreadMatched + tagMatched + taskMatched >= minTypesToShow
      contactButton.style.display = displayOrNot ? "block" : "none";
   }
}

function instagramGetContactAddressFromMessengerElement(elem)
{
   let id = findElement(srchPathIGM('messengerSidebarContactUsername'), null, elem);
   if (id)
      id = validateAddress(id + '@igun.socialattache.com')
   return id;
}

function instagramGetContactNameFromMessengerElement(elem)
{
   return findElement(srchPathIGM('messengerSidebarContactName'), null, elem);
}

function instagramMessengerContactTagsCreator(contactTags)
{
   if (findElement('.SA_tags') != null)
      return; // tags already setup
   
   let elem = findElement(srchPathIGM('contactTagsLocation'));
   if (elem == null)
      return; // page not ready yet?
   
   // We don't know whether this is a page or a person, and Contacts.js massages the IDs for us.
   let username = findElement(srchPathIGM('conversationHeaderAddress'))
   let normalized = normalizeContactAddress(validateAddress(username + '@igun.socialattache.com'));
   let contactInfoProp = 'ig:' + normalized;
   
   if (!savedContactInfos.hasOwnProperty(contactInfoProp))
   {
      return;
   }
   
   let userTags = []
   for (let i = 0; i < savedContactInfos[contactInfoProp].TagIDs.length; i++)
   {
      userTags.push(contactTags[savedContactInfos[contactInfoProp].TagIDs[i]])
   }
   
   let contactTagsElem = Utilities_CreateHtmlNode(instagramMessengerContactTagsHTML(normalized, userTags))
   addElementByButtonStyle(elem, contactTagsElem, constantStyles.Facebook.MessengerPage.MessengerConversationHeaderTags.button);
}

function instagramMessengerContactTagsHTML(normalizedAddress, contactTags)
{
   let htmlTags = '';
   for (let i = 0; i < contactTags.length; i++)
   {
      htmlTags += '<div>' + contactTags[i] + '</div>';
   }
   
   let idClass = createClassFromAddress(normalizedAddress);
   
   return '<div class="SA_tags SA_tags_instagram ' + idClass + '">' + htmlTags + '</div>';
}

// checking if the current chat it's a group chat
async function instagramIsGroupChat()
{
   await sleep(1);
   let buttonSidebar = await waitForElement(srchPathIGM('sideBarButton'));
   if (buttonSidebar == null)
   {
      Log_WriteError('For conversation ' + window.location.href + ' sideBarButton not found to check if group chat!');
      return false;
   }
   if (findElement(srchPathFBM('sideBarMenu')) == null)
   {
      buttonSidebar.click();
   }
   
   let sidebarContainer = await waitForElement(srchPathIGM('sideBarMenu'));
   if (sidebarContainer == null)
   {
      Log_WriteError('For conversation ' + window.location.href + ' sidebarContainer not found to check if group chat!');
      return false;
   }
   if (findElement(srchPathFBM('sideBarMenuContainsMembers')))
   {
      return true;
   }
   
   // DRL FIXIT? check for known chat rooms
   assert(!window.location.href.includes('5702964009747705') &&
      !window.location.href.includes('5601569036547856'));
   
   return false;
}

async function massageInstagramMessengerPage(contactInfos, contactTags, helpItems)
{
   savedContactInfos = contactInfos
   let found = false;
   
   // Messenger page-
   let accountID = getInstagramId()
   if (accountID == null)
   {
      assert(0);
      return;
   }
   
   instagramMessengerContactTagsFilterChats(false)
   removeOldMassaging(contactInfos);
   instagramMessengerContactTagsCreator(contactTags)
   await instagramUpdateMessengerFilterMenu()
   
   // Instagram direct page header
   let elems = findElements(srchPathPG('instagramConversationHeader'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = findElement(srchPathPG('instagramConversationHeaderName'), null, elem);
      let address = findElement(srchPathPG('instagramConversationHeaderAddress'), null, elem);
      address = getInstagramProfileAddressFromUrl(address);
      if (address == null)
         continue;
      address = validateAddress(address + '@igun.socialattache.com');
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'ig', address);
      
      let nameElement = findElement(srchPathPG('instagramConversationHeaderNameElement'), null, elem)
      
      addActionIcon(nameElement, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'instagram', 'ig', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', IG_DATA_NAME,
            'Protocol', 'ig', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Instagram'));
      }, constantStyles.Instagram.MessengerPage.ActionButton, icon, label, classes);
      found = true;
   }
   
   // Instagram direct page sidebar conversations
   elems = findElements(srchPathPG('instagramMessengerSidebarContacts'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = findElement(srchPathPG('instagramMessengerSidebarContactName'), null, elem);
      let address = findElement(srchPathPG('instagramMessengerSidebarContactUsername'), null, elem);
      if (address == null)
         continue;
      address = validateAddress(address + '@igun.socialattache.com');
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'ig', address);
      
      let nameElement = findElement(srchPathPG('instagramMessengerSidebarContactNameElement'), null, elem)
      
      addActionIcon(nameElement, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'instagram', 'ig', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', IG_DATA_NAME,
            'Protocol', 'ig', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Instagram'));
      }, constantStyles.Instagram.MessengerPage.ActionButtonSidebar, icon, label, classes);
      found = true;
   }
   
   return found;
}