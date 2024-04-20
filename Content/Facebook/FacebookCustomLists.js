function _getCustomListMembers(listUid)
{
   let listID = getEmailPrefix(listUid);
   
   let url = 'https://www.facebook.com/lists/' + listID;
   if (url != window.location.href)
   {
      Log_WriteError('_getCustomListMembers(): Incorrect Custom List ' + url);
      return null;
   }
   
   let html = document.querySelector('#facebook').innerHTML;
//    let match1 = _MultiRegexpMatch(html, srchPathFBFL('customListFriendsList1'));
   let match2 = _MultiRegexpMatch(html, srchPathFBFL('customListFriendsList2'));
   
   if (/*(match1 == null || match1.length < 2) &&*/ (match2 == null || match2.length < 2))
   {
      Log_WriteError('_getCustomListMembers(): could not find friends list JSON at ' + window.location.href);
      return null;
   }
   /* This appears to be all the available friends, so we could use this for adding people to a list?
       if (match1 != null && match1.length >= 2)
       {
           let parseData = Json_FromString(match1[1]);
           if (
              !parseData ||
              !parseData.require ||
              !parseData.require[0] ||
              !parseData.require[0][3] ||
              !parseData.require[0][3][0] ||
              !parseData.require[0][3][0].__bbox ||
              !parseData.require[0][3][0].__bbox.require ||
              !parseData.require[0][3][0].__bbox.require[0] ||
              !parseData.require[0][3][0].__bbox.require[0][3] ||
              !parseData.require[0][3][0].__bbox.require[0][3][1] ||
              !parseData.require[0][3][0].__bbox.require[0][3][1].__bbox ||
              !parseData.require[0][3][0].__bbox.require[0][3][1].__bbox.result ||
              !parseData.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data ||
              !parseData.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.viewer ||
              !parseData.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.viewer.bootstrap_keywords ||
              !parseData.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.viewer.bootstrap_keywords.edges
           )
           {
               Log_WriteError('_getCustomListMembers(): There are no needed data in parsed JSON at ' + window.location.href);
               return null;
           }
           
           let allContacts = parseData.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data.viewer.bootstrap_keywords.edges;
           allContacts = allContacts.map((member) =>
           {
               if (member.node.sts_info == null) {
                   Log_WriteInfo('Skipping an item that does not contain the sts_info.');
                   return null;
               }
               if (member.node.sts_info.direct_nav_result == null) {
                   Log_WriteInfo('Skipping an item that does not contain the direct_nav_result.');
                   return null;
               }
               
               let id = member.node.sts_info.direct_nav_result.ent_id;
               let type = member.node.sts_info.direct_nav_result.entity_type;
               
               let suffix = null;
               if (type == 'User' || type == 'user')
                   suffix = '@fbperid.socialattache.com';
               else if (type == 'Page' || type == 'page')
                   suffix = '@fbpage.socialattache.com';
               else  {
                   if (type != 'group' && type != 'event')
                       Log_WriteError('Skipping unrecognized Facebook ID type of "' + type + '" for ID ' + id + '.');
                   return null;
               }
               
               return {
                   ID: id,
                   uid: id + suffix,
                   userType: type,
                   displayName: member.node.sts_info.direct_nav_result.title.trim(),
   //            contactType: member.node.sts_info.direct_nav_result.type,
                   profileUrl: member.node.sts_info.direct_nav_result.link_url
   //                keywordText: member.node.keyword_text.trim()
               };
           });
           return allContacts.filter(a=>a);    // remove null values from the result
       }
   */
   if (match2 != null && match2.length >= 2)
   {
      let parseData = Json_FromString(match2[1]);
      
      if (!parseData.hasOwnProperty('data') || !parseData.data.hasOwnProperty('node') || !parseData.data.node.hasOwnProperty('id'))
      {
         Log_WriteError('_getCustomListMembers(): Incorrect format in parsed JSON at ' + window.location.href);
         return null;
      }
      if (parseData.data.node.id != listID)
      {
         Log_WriteError('_getCustomListMembers(): Mismatched list id "' + parseData.data.node.id + '" in parsed JSON at ' + window.location.href);
         return null;
      }
      
      let allContacts = parseData.data.node.list_members.edges;
      allContacts = allContacts.map((member) =>
      {
         let id = member.node.id;
         let type = member.node.__typename;
         
         let suffix = null;
         if (type == 'User' || type == 'user')
            suffix = '@fbperid.socialattache.com';
         else if (type == 'Page' || type == 'page')
            suffix = '@fbpage.socialattache.com';
         else
         {
            if (type != 'group' && type != 'event' && type != 'RestrictedUser')
               Log_WriteError('Skipping unrecognized Facebook ID type of "' + type + '" for ID ' + id + '.');
            return null;
         }
         
         return {
            ID: id,
            uid: id + suffix,
            userType: type,
            displayName: member.node.name.trim(),
//            contactType: null,
            profileUrl: member.node.url
//                keywordText: member.node.name.trim()
         };
      });
      return allContacts.filter(a => a);    // remove null values from the result
   }
   
   Log_WriteError('_getCustomListMembers(): There are no correct data in parsed JSON at ' + window.location.href);
   return null;
}

async function getCustomList(listUid)
{
   /*
       // DRL FIXIT! We would like to get the custom list name here so we can update it if it changes!
       
       let container = await waitForElement(srchPathFBFL("customListItemsContainer"));
       if (container == null) {
           Log_WriteError('getCustomList() did not find customListItemsContainer for custom list ' + listUid + ' at ' + window.location.href);
           // DRL FIXIT? Could this be due to throttling?
           return []  // return no members
       }
       
       let customListItems = findElements(srchPathFBFL('customListItems'), null, container);
       if (customListItems == null)
       {
           Log_WriteError('getCustomList() did not find customListItems for custom list ' + listUid + ' at ' + window.location.href);
           return []  // return no members
       }
       
       let listMembers = {};
       for (let customListItem of customListItems) {
           let profileUrl = findElement(srchPathFBFL("customListFriendUrl"), null, customListItem);
           if (profileUrl == null) {
               Log_WriteError('getCustomList() did not find customListFriendUrl for custom list ' + listUid + ' at ' + window.location.href);
               return []  // return no members
           }
           let profileName = findElement(srchPathFBFL("customListFriendName"), null, customListItem);
           if (profileName == null) {
               Log_WriteError('getCustomList() did not find customListFriendName for custom list ' + listUid + ' at ' + window.location.href);
               return []  // return no members
           }
           let profileID = await getFacebookAddressFromUrl(profileUrl, FacebookAddressFormatNumeric);
           if (profileID)
               listMembers[profileID] = profileName;
           else
               Log_WriteError('Profile ' + profileName + ' at ' + profileUrl + ' may be incorrectly removed from the list due to lack of ID!');
           
           reqPing();
       }
   */
   
   let listMembers = _getCustomListMembers(listUid);
   if (listMembers == null)
      return null;
   
   let members = {};
   for (let member of listMembers)
   {
      members[member.uid] = member.displayName;
   }
   
   return members;
}

// Note: this method will remove items from updateMembers that failed
// could return an error message but currently does not
async function updateCustomListMembership(listUid, updateMembers)
{
   let container = await waitForElement(srchPathFBFL("customListItemsContainer"));
   if (container == null)
   {
      Log_WriteError('updateCustomListMembership() did not find customListItemsContainer for custom list ' + listUid + ' at ' + window.location.href);
      return null;
   }
   
   let customListItems = null;
   let scrollable = Utilities_GetScrollableParentElement(customListItems);
   let lastLen = 0;
   let checkingNb = 0;
   while (true)
   {
      scrollable.scrollTo(0, scrollable.scrollHeight);
      
      await sleepRand(timings.FB_WATCHED_CUSTOM_LIST_SCROLL_DELAY);
      reqPing();
      
      customListItems = findElements(srchPathFBFL('customListItems'), null, container);
      
      // new item appear on screen, we reset the counter
      if (lastLen > customListItems.length)
         checkingNb = 0;
      
      // we wait at least 5 loops for new items
      if (checkingNb > 5)
         break;
      
      lastLen = customListItems.length;
      checkingNb++;
   }
   
   let listMembers = _getCustomListMembers(listUid);
   if (listMembers == null)
   {
      return null;
   }
   Log_WriteInfo('List has ' + customListItems.length + ' items and ' + listMembers.length + ' members, and we have ' + updateMembers.length + ' to update');
   
   for (let i = 0; i < updateMembers.length; i++)
   {
      let updateMember = updateMembers[i];
      let memberUid = updateMember[0];
      let memberName = updateMember[1];
      Log_WriteInfo('Updating member ' + i + ' ' + memberUid);
      
      let listMember = null;
      for (let temp of listMembers)
      {
         if (temp.uid == memberUid)
         {
            listMember = temp;
            break;
         }
      }
      
      // check if this contact is already in the list
      let requestIndex = -1;
      if (listMember)
      {
         for (let i = 0; i < customListItems.length; i++)
         {
            // we cache the profileUrl so we don't have to keep looking for it each time through the outer loop above
            if (!customListItems[i].hasOwnProperty('profileUrl'))
            {
               customListItems[i].profileUrl = findElement(srchPathFBFL("customListFriendUrl"), null, customListItems[i]);
               if (customListItems[i].profileUrl == null)
               {
                  Log_WriteError('updateCustomListMembership() did not find customListFriendUrl for custom list ' +
                     listUid + ' at ' + window.location.href);
                  Log_WriteDOM(customListItems[i]);
                  return null;
               }
               
               if (i % 10 == 0) reqPing();
            }
            if (fuzzyUrlsMatch(customListItems[i].profileUrl, listMember.profileUrl))
            {
               requestIndex = i;
               break;
            }
         }
      }
      
      reqPing();
      
      if (memberName != null) // if there's a displayName then this is an "add"
      {
         if (requestIndex != -1)
         {
            Log_WriteInfo('Contact ' + memberName + ' (' + memberUid + ') is already a member');
            continue;   // already a member
         }
         
         let editMenu = findElement(srchPathFBFL('customListEditMenu'), null, container);
         if (editMenu == null)
         {
            Log_WriteError('updateCustomListMembership() did not find customListEditMenu for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            Log_WriteDOM(container);
            updateMembers.splice(i--, 1);
            continue;
         }
         editMenu.click();
         await sleep(2);
         
         let addButton = findElement(srchPathFBFL('customListAddButton'));
         if (addButton == null)
         {
            Log_WriteError('updateCustomListMembership() did not find customListAddButton for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            updateMembers.splice(i--, 1);
            continue;
         }
         addButton.click();
         await sleep(2);
         
         let customListEditBox = await waitForElement(srchPathFBFL('customListEditBox'));
         if (customListEditBox == null)
         {
            Log_WriteError('updateCustomListMembership() did not find customListEditBox for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            updateMembers.splice(i--, 1);
            continue;
         }
         
         let searchBox = await waitForElement(srchPathFBFL('searchFriendsBox'), null, customListEditBox);
         if (searchBox == null)
         {
            Log_WriteError('updateCustomListMembership() did not find searchFriendsBox for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            Log_WriteDOM(customListEditBox);
            updateMembers.splice(i--, 1);
            continue;
         }
         
         let keywordText = memberName;  // this is our best guess, hopefully the name came from Facebook and will match
         
         if (!await pasteText(searchBox, keywordText, false, false, true))
         {
            Log_WriteError('updateCustomListMembership() could not paste "' + keywordText + '" to add to list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            updateMembers.splice(i--, 1);
            continue;
         }
         
         await sleep(2);
         
         let filteredFriends = await waitForElements(srchPathFBFL('filteredFriendResults'), null, customListEditBox);
         if (filteredFriends.length == 0)
         {
            Log_WriteWarning('updateCustomListMembership() did not find any match for "' + keywordText + '" (probably not a friend) for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
//                Log_WriteDOM(customListEditBox, 2000);  this can be a very large list box so let's not log it
            updateMembers.splice(i--, 1);
            
            let closeButton = waitForElement(srchPathFBFL('filteredFriendCancel'), 3);
            if (closeButton == null)
            {
               Log_WriteError('updateCustomListMembership() did not find filteredFriendCancel for custom list ' + listUid +
                  ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            }
            continue;
         }
         
         let filteredFriendName = findElement(srchPathFBFL('filteredFriendResultName'), null, filteredFriends[0]);
         if (!filteredFriendName.includes(memberName) && !memberName.includes(filteredFriendName))
         {
            Log_WriteError('updateCustomListMembership() did not find "' + memberName + '" but rather "' + filteredFriendName + '" for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            updateMembers.splice(i--, 1);
            
            let closeButton = waitForElement(srchPathFBFL('filteredFriendCancel'), 3);
            if (closeButton == null)
            {
               Log_WriteError('updateCustomListMembership() did not find filteredFriendCancel for custom list ' + listUid +
                  ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            }
            continue;
         }
         
         if (filteredFriendName != memberName)
            Log_WriteWarning('updateCustomListMembership() requested name "' + memberName + '" doesn\'t exactly match Facebook friend "' + filteredFriendName + '", but it\'s close enough.');
         
         filteredFriends[0].click();
         await sleep(1);
         
         let saveButton = await waitForElement(srchPathFBFL('filteredFriendSave'), null, customListEditBox);
         if (saveButton == null)
         {
            Log_WriteError('updateCustomListMembership() did not find filteredFriendSave for custom list ' + listUid +
               ' contact ' + memberName + ' (' + memberUid + ') at ' + window.location.href);
            updateMembers.splice(i--, 1);
            continue;
         }
         saveButton.click();
         await sleep(1);
      }
      else
      {
         if (requestIndex == -1)
         {
            Log_WriteWarning('updateCustomListMembership() did not find custom list ' + listUid +
               ' contact ' + memberUid + ' to remove at ' + window.location.href);
            updateMembers.splice(i--, 1);
            continue;
         }
         
         let actionButton = findElement(srchPathFBFL('customListFriendRemove'), null, customListItems[requestIndex]);
         if (actionButton == null)
         {
            Log_WriteError('updateCustomListMembership() did not find customListFriendRemove for custom list ' + listUid +
               ' contact ' + memberUid + ' at ' + window.location.href);
            updateMembers.splice(i--, 1);
            continue;
         }
         actionButton.click();
         await sleep(1);
      }
   }
   
   updateMembers = Object.values(updateMembers); // make sure indices are sequential
   return null;
}

async function createCustomList(listName)
{
   let message = null;
   
   // DRL FIXIT? We should be passing the list name here as a replacement so that the selector can do whatever
   // it needs to find it and return it instead of us doing the search and trim and lowercase here.
   let listElems = findElements(srchPathFBFL('customList'));
   for (let elem of listElems)
   {
      let oldListName = findElement(srchPathFBFL('customListName'), null, elem);
      if (oldListName == null)
      {
         Log_WriteError('createCustomList() did not find customListName at ' + window.location.href);
         Log_WriteDOM(elem);
         return [null, Str('Scraping error')];
      }
      
      if (oldListName.trim().toLowerCase() == listName.trim().toLowerCase())
      {
         let customListUid = findElement(srchPathFBFL('customListUid'), null, elem);
         if (customListUid == null)
         {
            Log_WriteError('createCustomList() did not find customListUid at ' + window.location.href);
            Log_WriteDOM(elem);
            return [null, Str('Scraping error')];
         }
         
         return [validateAddress(customListUid + '@fbfrndlist.socialattache.com'), message];
      }
   }
   
   let addButton = findElement(srchPathFBFL('customListAdd'));
   if (addButton == null)
   {
      Log_WriteError('createCustomList() did not find customListAdd at ' + window.location.href);
      return [null, Str('Scraping error')];
   }
   
   addButton.click();
   await sleep(1);
   
   let addBox = await waitForElement(srchPathFBFL('customListAddText'));
   if (addBox == null)
   {
      Log_WriteError('createCustomList() did not find customListAddText at ' + window.location.href);
      return [null, Str('Scraping error')];
   }
   
   if (!await pasteText(addBox, listName, false, false, true))
   {
      Log_WriteError('Unable to set list name!');
      return [RETRY_EXTERNAL_ID, null];
   }
   
   await sleep(0.5);
   let addConfirm = await waitForElement(srchPathFBFL('customListAddConfirm'));
   if (addConfirm == null)
   {
      Log_WriteError('createCustomList() did not find customListAddConfirm at ' + window.location.href);
      return [null, Str('Scraping error')];
   }
   
   addConfirm.click();
   await sleep(5);
   
   // DRL FIXIT? We should be passing the list name here as a replacement so that the selector can do whatever
   // it needs to find it and return it instead of us doing the search and trim and lowercase here.
   listElems = findElements(srchPathFBFL('customList'));
   for (let elem of listElems)
   {
      let oldListName = findElement(srchPathFBFL('customListName'), null, elem);
      if (oldListName.trim().toLowerCase() == listName.trim().toLowerCase())
      {
         let customListUid = findElement(srchPathFBFL('customListUid'), null, elem);
         if (customListUid == null)
         {
            Log_WriteError('createCustomList() did not find customListUid at ' + window.location.href);
            Log_WriteDOM(elem);
            return [null, Str('Scraping error')];
         }
         
         return [validateAddress(customListUid + '@fbfrndlist.socialattache.com'), null];
      }
   }
   
   message = Str('Unable to create custom list <0>', listName);
   Log_WriteError('Unable to create custom list: ' + listName);
   
   return [null, message];
}
