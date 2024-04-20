/*
async function getMessageBoxIDFromPostPage() {
   let url = window.location.href;
   let id = null;
   if (url.includes('/groups/')) {
      // format: [https://www.facebook.com]/groups/766926220595672/?blah
      id = url.substring(url.indexOf('/groups/')+8).split('/').at(0);
      // if is numeric we could optimize here?
   }
   else
      id = getEmailPrefix(await getFacebookAddressFromUrl(url, FacebookAddressFormatAnything));
   return await _getFacebookAddressFromHtml(id, FacebookAddressFormatNumeric, null, url, document.documentElement.outerHTML);
}
*/
async function getMessageBoxIDFromPostUrl(url)
{
   // DRL FIXIT? We should combine this logic into a single method to get the message box ID more efficiently...
   let messageBoxID = null;
   if (url.includes('/groups/'))
      messageBoxID = getGroupIDFromGroupPage(url);
   if (messageBoxID)
      messageBoxID = validateAddress(messageBoxID + '@fbgroup.socialattache.com');
   else
      messageBoxID = await getFacebookAddressFromUrl(url, FacebookAddressFormatNumeric);
   return messageBoxID;
}

function getGroupIDFromGroupPage(url)
{
   if (url.includes('/groups/joins'))
      return null;
   
   if (url.includes('/groups/'))
   {
      // format: [https://www.facebook.com]/groups/766926220595672/?blah
      let groupUid = url.substring(url.indexOf('/groups/') + 8).split('/').at(0);
      if (Utilities_IsInteger(groupUid))
         return groupUid;
   }

//    if (url != window.location.href) {
//       let groupUid = getGroupIDFromGroupPage(window.location.href);
//       if (groupUid)
//          return groupUid;
//    }
   
   let groupUid = findElement(srchPathFBG('facebookGroupIDForPage'));
   if (groupUid != null)
      return groupUid;
   
   Log_WriteErrorCallStack('Unable to get group UID using ' + url + ' at: ' + window.location.href);
   return null;
}

async function massageFacebookPage(contactInfos, groupInfos, helpItems, contactTags)
{
   /*
       let dataName = FB_DATA_NAME;
   
       let accountInfo = getFacebookAccountInfo();
       if(accountInfo == null){
           assert(0);
           return;
       }
       let accountID = accountInfo.id;
   */
   /* This was added to try and solve issue 252 Get Facebook post permalink from the post date
       // Trigger mouseover event on post timestamp to get permalink
       let postMenus = findElements(srchPathPG('generalPostMenuLocation'));
       for (let postMenuElem of postMenus) {
           let postCardEl = Utilities_GetParentBySelector(postMenuElem, 'div[style]:not(.SA-simulate-div)');
           if (postCardEl == null)
               continue;
           Class_AddByElement(postCardEl, 'SA-simulate-div');
   
           let aParentSpanTag = findElement('span[dir="auto"] > span[id] > span > span > A[role="link"][tabindex="0"] {parentNode}', null, postCardEl);
           if (aParentSpanTag == null)
               continue;
   
           let parentSpanID = Utilities_GetParentBySelector(aParentSpanTag, 'span[id]');
           if (parentSpanID == null)
               continue;
           
               aParentSpanTag.setAttribute('aria-describedby', parentSpanID.getAttribute('id'));
   
           // debugging mouse over is working right.
           aParentSpanTag.addEventListener('mouseenter', function(ev){
               // console.log('this is aParentSpanTag mouseenter event==', ev.target);
           });
           aParentSpanTag.addEventListener('mousemove', function(ev){
               // console.log('this is aParentSpanTag mousemove event==', ev.target);
           });
           aParentSpanTag.addEventListener('mouseover', function(ev){
               // console.log('this is aParentSpanTag mouseover event==', ev.target);
           });
       }
   
       // Trigger mouseover event on post timestamp to get permalink
       // Disable for now.
       // for (let postMenuElem1 of postMenus) {
       //     let postCardEl1 = Utilities_GetParentBySelector(postMenuElem1, 'div[style]');
       //     if (postCardEl1 == null)
       //         continue;
               // Should create simulateMouseOver method later instead click.
       //     let aTag = findElement('span[dir="auto"] > span[id] > span > span > A[role="link"][tabindex="0"] {merge[0].simulateMouseClick()}', null, postCardEl1);
       //     console.log('aTag mouseover event triggered====', aTag);
       // }
   */
   
   removeOldMassaging(contactInfos, groupInfos);
   
   //START Deals with  Facebook Saved Posts
   if (location.pathname.startsWith('/saved/'))
   {
      // Facebook Saved Posts
      let elems = findElements(srchPathPG('savedPostActionsContainerFB'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented');
         
         let isAnAllowedDropdownActionSavedPost = findElement(srchPathPG('isSupportedSavedPostType'), null, elem);
         if (!isAnAllowedDropdownActionSavedPost)
         {
            continue;
         }
         
         let options = [];
         if (UserHasFeature(UserFeaturesAddPostsLibrary))
            options.push(
               {
                  label: 'Import to Library',
                  icon: 'DownloadDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeSelectedFacebookPostFromSavedPage(elem, 'downloadToPostsLibrary');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         if (UserHasFeature(UserFeaturesPublishingCalendar))
            options.push(
               {
                  label: 'Open in Publishing Calendar',
                  icon: 'ResourceSchedulerDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeSelectedFacebookPostFromSavedPage(elem, 'openInPublishingCalendar');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         if (UserHasFeature(UserFeaturesWatchedPosts))
            options.push(
               {
                  label: 'Automations and Tagging',
                  icon: 'AutomationDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeSelectedFacebookPostFromSavedPage(elem, 'addOrRemoveAutomation');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         
         addDropDownMenu(elem, options, constantStyles.Facebook.SavedPostsPage.ActionButton);
      }
      /* DRL FIXIT? I'm not sure when this code is needed as it seems to create duplicate buttons to the above. If it is needed we'll
          have to add scraping of the ID and body on this page to pass on as is done for the above.
              elems = findElements(srchPathPG('savedPostActionsCollectionFB'), ':not(.SA_augmented)');
              forEach(elems, async (elem) => {
                  Class_AddByElement(elem, 'SA_augmented');
      
                  let isAnAllowedDropdownActionSavedPost = await checkIfSavedPostIsAnActionAllowedPostFromSavedPostActionContainer(elem)
                  if(!isAnAllowedDropdownActionSavedPost){
                      return null;
                  }
      
                  let options = [];
                  if (UserHasFeature(UserFeaturesAddPostsLibrary))
                      options.push(
                      {
                          label: 'Import to Library',
                          icon: 'DownloadDk.svg',
                          cmd: async function() {
                             try
                             {
                                await scrapePostHrefViaPostedTimeLink(findElement(srchPathPG('savedPostActionsCollectionPermanentLinkFB'), null, elem), 'downloadToPostsLibrary')
                             }
                             catch(e)
                             {
                                Log_WriteException(e);
                             }
                          }
                      });
                  if (UserHasFeature(UserFeaturesPublishingCalendar))
                      options.push(
                      {
                          label: 'Open in Publishing Calendar',
                          icon: 'ResourceSchedulerDk.svg',
                          cmd: async function() {
                             try
                             {
                                await scrapePostHrefViaPostedTimeLink(findElement(srchPathPG('savedPostActionsCollectionPermanentLinkFB'), null, elem), 'openInPublishingCalendar')
                             }
                             catch(e)
                             {
                                Log_WriteException(e);
                             }
                          }
                      });
                  if (UserHasFeature(UserFeaturesWatchedPosts))
                      options.push(
                      {
                          label: 'Add or Remove Automation',
                          icon: 'AutomationDk.svg',
                          cmd: async function() {
                             try
                             {
                                await scrapePostHrefViaPostedTimeLink(findElement(srchPathPG('savedPostActionsCollectionPermanentLinkFB'), null, elem), 'addOrRemoveAutomation')
                             }
                             catch(e)
                             {
                                Log_WriteException(e);
                             }
                          }
                      });
      
                  let menu = dropDownMenu(options, constantStyles.Pages.Facebook.savedPostActionsDropdown);
      
                  let appendTo = findElement(srchPathPG('savedPostActionsCollectionAppendMenuToFB'), null, elem)
      
                  // we use the parent node because the current node is a link
                  appendTo.appendChild(menu);
              });
      */
   }
      //END Deals with Facebook Saved Posts
   //START Deals with Facebook live and video Posts
   else if (window.location.href.includes("/watch/live/?ref=watch_permalink&v=") || window.location.href.includes("/watch/?ref=saved"))
   {
      let elems = findElements(srchPathPG('generalPostMenuLocation'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented');
         
         let options = [];
         if (UserHasFeature(UserFeaturesAddPostsLibrary))
            options.push(
               {
                  label: 'Import to Library',
                  icon: 'DownloadDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeFacebookPostFromRegularPage(elem, 'downloadToPostsLibrary');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         if (UserHasFeature(UserFeaturesPublishingCalendar))
            options.push(
               {
                  label: 'Open in Publishing Calendar',
                  icon: 'ResourceSchedulerDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeFacebookPostFromRegularPage(elem, 'openInPublishingCalendar');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         if (UserHasFeature(UserFeaturesWatchedPosts))
            options.push(
               {
                  label: 'Automations and Tagging',
                  icon: 'AutomationDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeFacebookPostFromRegularPage(elem, 'addOrRemoveAutomation');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         
         addDropDownMenu(elem, options, constantStyles.Facebook.PostPage.GeneralPostsDateDropDown);
      }
   }
      //END Deals with Facebook live and video Posts
      //START Deals with Facebook Stories
   //Start Story
   else if (window.location.href.includes("/stories/") || window.location.href.includes("&source=story_tray"))
   {
      let elems = findElements(srchPathFBS('facebookStoryContentPanel'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented');
         let options = [];
         if (UserHasFeature(UserFeaturesAddPostsLibrary))
            options.push(
               {
                  label: 'Import to Library',
                  icon: 'DownloadDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeStoryByCardUrl(elem, 'downloadToPostsLibrary');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         if (UserHasFeature(UserFeaturesPublishingCalendar))
            options.push(
               {
                  label: 'Open in Publishing Calendar',
                  icon: 'ResourceSchedulerDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeStoryByCardUrl(elem, 'openInPublishingCalendar');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         if (UserHasFeature(UserFeaturesWatchedPosts))
            options.push(
               {
                  label: 'Automations and Tagging',
                  icon: 'AutomationDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        await scrapeStoryByCardUrl(elem, 'addOrRemoveAutomation');
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
         
         // DRL FIXIT! Because of how FB updates the DOM for stories we will end up with multiple buttons here!
         let button = addDropDownMenu(elem, options, constantStyles.Facebook.StoriesPage.GeneralStoryDropDown);
         if (button)
            button.addEventListener("click", async function()
            {
               await pauseFacebookStory();   // avoid going to the next story after the user clicks the menu button
            });
      }
   }
      //End Story
      //END Deals with Facebook Stories
   //START Deals with Facebook custom lists
   else if (location.pathname.startsWith('/friends/') || location.pathname.startsWith('/lists/'))
   {
      let elems = [];
      if (UserHasFeature(UserFeaturesFacebookSync))
      {
         elems = findElements(srchPathFBFL('customList'), ':not(.SA_augmented)');
      }
      
      for (let elem of elems)
      {
         let customListUid = findElement(srchPathFBFL('customListUid'), null, elem);
         if (!customListUid)
         {
            continue;
         }
         
         let listUID = validateAddress(customListUid + '@fbfriendlist.socialattache.com');
         
         let listName = findElement(srchPathFBFL('customListName'), null, elem);
         
         Class_AddByElement(elem, 'SA_augmented');
         
         addActionIcon(elem, async function(e)
         {
            DisplayEmbeddedItemForm('GroupEdit', 'ExternalID', listUID, 'Name', listName);
         }, {}, null, 'Custom List', '');
      }
      
      elems = findElements(srchPathPG('friendsListProfileActions'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented'); // add SA_augmented if there is addable contact summary box
         
         let profileUrl = findElement(srchPathPG('friendsListProfileUrl'), null, elem);
         if (profileUrl == null)
         {
            Log_WriteError('Profile URL not found with friendsListProfileUrl');
            continue;
         }
         let name = findElement(srchPathPG('friendsListProfileName'), null, elem);
         if (name == null)
         {
            Log_WriteError('Profile name not found with friendsListProfileName');
            continue;
         }
         
         let address = await getFacebookAddressFromUrl(profileUrl, FacebookAddressFormatAnything);
         if (address == null)
         {
            // this could happen if the profile is not available
            Log_WriteError('Unable to find friend profile address for ' + name + ' from ' + profileUrl);
            continue;
         }
         
         let contactSummaryHtmlStr = FacebookContactSummaryBoxWrapperCreator(contactInfos, contactTags, address, 'SA_profile_summary');
         if (contactSummaryHtmlStr != null)
         {
            let contactSummaryElem = Utilities_CreateHtmlNode(contactSummaryHtmlStr);
            await addElementByButtonStyle(elem, contactSummaryElem, constantStyles.Facebook.FriendsListPage.ActionButtonWrapper.button);
            
            // inject contact dashboard icon to the summary box.
            addContactDashboardIcon(contactInfos, address, name);
         }
      }
   }
   //END Deals with Facebook custom lists
   else
   {
      // now we're getting into pages that we may not be able to easily identify by the URL, or that have more than
      // one type of button to be added to the page
      
      //START Deals with Facebook Groups group menu button
      if (location.pathname.startsWith('/groups/') &&
         // DRL FIXIT? I think it would be best to just ignore anything that has too many path segments
         // since we're only interested in the group home page?
         !location.pathname.startsWith('/groups/feed/') &&
         !location.pathname.startsWith('/groups/joins/') &&
         !location.pathname.startsWith('/groups/search/') &&
         !location.pathname.includes('/pending_posts') &&
         !location.pathname.includes('/scheduled_posts'))
      {
         // for now we only automate groups that have been imported into the DB (i.e. owned by the user)
         // we use parseInt() as a string won't match our index
         let groupUid = parseInt(getGroupIDFromGroupPage(window.location.href));
         
         let normalized = normalizeContactAddress(Url_StripProtocol(groupUid + '@fbgroup.socialattache.com'));
         let idClass = createClassFromAddress(normalized);
         
         let elems = [];
         if (isGroupMember(groupUid) &&
            (UserHasFeature(UserFeaturesFacebookGroupMembersAdmin) ||
            UserHasFeature(UserFeaturesFacebookGroupMembersNonAdmin) ||
            UserHasFeature(UserFeaturesFacebookGroupAutomation)))
         {
            let elem = findElement(srchPathPG('groupMenuLocation'), ':not(.SA_augmented)');
            if (elem != null)
               elems = [elem];
         }
         for (let elem of elems)
         {
            Class_AddByElement(elem, 'SA_augmented');
   
            let isKnown = groupInfos.hasOwnProperty(groupUid);
            let isAdmin = (isKnown && groupInfos[groupUid].IsAdmin) ||
               (!isKnown && isGroupAdmin(groupUid));
   
            if (isKnown)
            {
               let options = [];
               options.push(
                  {
                     label: 'Import Group Details',
                     icon: 'DownloadDk.svg',
                     cmd:
                        function()
                        {
                           // NOTE! This is identical to the code below!
               
                           DisplayMessage(Str('Getting group information...'), 'busy', null, 60);
                           // we go to the members page so we can get the member count (though this is not essential)
                           let url = buildUrl(constantPaths.Facebook.watchedGroupMembers, {groupId: groupUid});
                           // we will create a new tab to scrape the questions, and it will handle the action
                           reqCreateTab(null, 'GET', url, {}, false, false, [{
                              originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
                              action: 'scrapeGroupInfo',                  // this is the first thing the new tab will do
                              nextAction: null,                           // this is the second thing the new tab will do
                           }]);
                        }
                  });
               if (isAdmin && UserHasFeature(UserFeaturesFacebookGroupMembersAdmin))
               {
                  options.push(
                     {
                        label: 'Import Group Questions',
                        icon: 'GroupQuestionsDk.svg',
                        cmd:
                           function()
                           {
                              DisplayMessage(Str('Getting group questions...'), 'busy', null, 60);
                              let url = buildUrl(constantPaths.Facebook.watchedGroupQuestions, {groupId: groupUid});
                              // we will create a new tab to scrape the questions, and it will handle the action
                              reqCreateTab(null, 'GET', url, {}, false, false, [{
                                 originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
                                 action: 'scrapeGroupQuestions',             // this is the first thing the new tab will do
                                 nextAction: null,                           // this is the second thing the new tab will do
                              }]);
                           }
                     });
                  options.push(
                     {
                        label: 'Group Member Answers',
                        icon: 'GroupAnswersDk.svg',
                        cmd:
                           function()
                           {
                              DisplayEmbeddedItemForm('FBGroupQuestionsEdit', 'ResourceID', groupInfos[groupUid].ResourceID);
                           }
                     });
                  options.push(
                     {
                        label: 'Group Member Referrals',
                        icon: 'FbGroupSharingDk.svg',
                        cmd:
                           function()
                           {
                              DisplayEmbeddedItemForm('FBGroupSharingEdit', 'ResourceID', groupInfos[groupUid].ResourceID);
                           }
                     });
               }
               if (
                  (
                     UserHasFeature(UserFeaturesFacebookGroupAutomation) ||
                     UserHasFeature(UserFeaturesTags)
                  ) &&
                  (
                     (isAdmin && UserHasFeature(UserFeaturesFacebookGroupMembersAdmin)) ||
                     (!isAdmin && UserHasFeature(UserFeaturesFacebookGroupMembersNonAdmin))
                  )
               )
               {
                  options.push(
                     {
                        label: 'Automations and Tagging',
                        icon: 'AutomationDk.svg',
                        cmd:
                           function()
                           {
// This may not be the admin version of the ResourceID so just use the code below.
//                              if (isKnown)
//                                 DisplayEmbeddedItemForm('ResourceAutomationsEdit', 'ResourceID', groupInfos[groupUid].ResourceID);
//                              else
                              {
                                 DisplayMessage(Str('Loading...'), 'busy', null, 5);
                                 let id = 'fbp:' + groupUid + '@fbgroup.socialattache.com';
                                 let name = getGroupName(id);
                                 if (name == null)
                                    DisplayMessage(Str('Error getting group name!'), 'error');
                                 else
                                    DisplayEmbeddedItemForm('ResourceAutomationsEdit', 'ExternalCommunityGroupID', id, 'Name', name);
                              }
                           }
                     });
                  if (UserHasFeature(UserFeaturesRequestNotifications))
                     options.push(
                        {
                           label: 'Notifications',
                           icon: 'WatcherDk.svg',
                           cmd:
                              function()
                              {
                                 DisplayMessage(Str('Loading...'), 'busy', null, 5);
                                 DisplayEmbeddedItemForm('ResourceNotificationsEdit', 'ResourceID', groupInfos[groupUid].ResourceID);
                              }
                        });
               }
               
               addDropDownMenu(elem, options, constantStyles.Facebook.GroupPage.ActionButton, null, null, [idClass]);
            }
            else
            {
               // not an imported group yet
               addActionIcon(elem, async function(e)
               {
                  // NOTE! This is identical to the code above!
                  
                  DisplayMessage(Str('Getting group information...'), 'busy', null, 60);
                  // we go to the members page so we can get the member count (though this is not essential)
                  let url = buildUrl(constantPaths.Facebook.watchedGroupMembers, {groupId: groupUid});
                  // we will create a new tab to scrape the questions, and it will handle the action
                  reqCreateTab(null, 'GET', url, {}, false, false, [{
                     originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
                     action: 'scrapeGroupInfo',                  // this is the first thing the new tab will do
                     nextAction: null,                           // this is the second thing the new tab will do
                  }]);
               }, constantStyles.Facebook.GroupPage.ActionButton, 'DownloadDk.svg', 'Import Group', [idClass]);
            }
         }
/*
         if(window.location.href.includes('SA_getGroupQuestions')){
            scrapeGroupInfo(dataName);
         }else if(window.location.href.includes('SA_finishScraping')){
            history.pushState({}, null, window.location.href.replace('?action=SA_finishScraping', ''));
            scrapeGroupInfo(dataName);
         }
*/
      }
      //END Deals with Facebook Groups
      
      //START Deals with Facebook profile page menu button
      if (!location.pathname.startsWith('/groups/') &&
         !location.pathname.startsWith('/saved/') &&
         !location.pathname.startsWith('/search/') &&
         !location.pathname.startsWith('/stories/'))
      {
         
         // Facebook profile page
         let address = await getFacebookAddressFromUrl(window.location.href, FacebookAddressFormatAnything);
         //FIXIT The facebookProfileActions still not specific enough
         let elems = findElements(srchPathPG('facebookProfileActions'), ':not(.SA_augmented)');
         for (let elem of elems)
         {
            Class_AddByElement(elem, 'SA_augmented'); // add SA_augmented if there is addable contact summary box
            
            let name = findElement(srchPathPG('profileNameFB'));    // note no root element provided!
            if (name == null)
            {
               Log_WriteError('Person name not found with profileNameFB');
               continue;
            }
            
            if (address == null)
               continue;   // the above logs for us
            
            let contactSummaryHtmlStr = FacebookContactSummaryBoxWrapperCreator(contactInfos, contactTags, address, 'SA_profile_summary');
            if (contactSummaryHtmlStr != null)
            {
               let contactSummaryElem = Utilities_CreateHtmlNode(contactSummaryHtmlStr);
               await addElementByButtonStyle(elem, contactSummaryElem, constantStyles.Facebook.ProfilePage.ActionButtonWrapper.button);
               
               // inject contact dashboard icon to the summary box.
               addContactDashboardIcon(contactInfos, address, name);
            }
         }
      }
      //END Deals with Facebook profile page
      
      //START Deals with Facebook General Posts and group posts
      if (//!window.location.pathname.includes('permalink') &&  removed this so we can add the button to group posts opened on their own page
         !window.location.pathname.includes('watch') &&
         //         !window.location.pathname.includes('posts') &&
         !window.location.pathname.includes('videos'))
      {
         // Facebook General Posts
         let elems = findElements(srchPathPG('generalPostMenuLocation'), ':not(.SA_augmented)');
         for (let elem of elems)
         {
            Class_AddByElement(elem, 'SA_augmented');
            
            let options = [];
            if (UserHasFeature(UserFeaturesAddPostsLibrary))
               options.push(
                  {
                     label: 'Import to Library',
                     icon: 'DownloadDk.svg',
                     cmd: async function()
                     {
                        try
                        {
                           await checkPostAvailableScrapingMethodAndScrape(elem, 'downloadToPostsLibrary')
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                     }
                  });
            if (UserHasFeature(UserFeaturesPublishingCalendar))
               options.push(
                  {
                     label: 'Open in Publishing Calendar',
                     icon: 'ResourceSchedulerDk.svg',
                     cmd: async function()
                     {
                        try
                        {
                           await checkPostAvailableScrapingMethodAndScrape(elem, 'openInPublishingCalendar');
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                     }
                  });
            if (UserHasFeature(UserFeaturesWatchedPosts))
               options.push(
                  {
                     label: 'Automations and Tagging',
                     icon: 'AutomationDk.svg',
                     cmd: async function()
                     {
                        try
                        {
                           await checkPostAvailableScrapingMethodAndScrape(elem, 'addOrRemoveAutomation');
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                     }
                  });
            options.push(
               {
                  label: 'Get Permalink',
                  icon: 'ClipboardCopyDk.svg',
                  cmd: async function()
                  {
                     try
                     {
                        DisplayMessage(Str('Getting permalink'), 'info', 'center', 10);
                        let url = await checkIfCanRetrievePostPermalinkDirectly(elem);
                        if (url && MyClipboard.CopyTextToClipboard(url))
                        {
                           let post = await getPostBasicsFromFacebookUrl(url);
                           await reqSendPost('FacebookScrape', post);
                           DisplayMessage(Str('Copied to clipboard'), 'success', 'center', 5);
                        }
                        else
                           DisplayMessage(Str('The permalink is not available!'), 'error', null, 5);
                     }
                     catch (e)
                     {
                        Log_WriteException(e);
                     }
                  }
               });
            
            addDropDownMenu(elem, options, constantStyles.Facebook.FeedPage.GeneralPostsDateDropDown);
         }
      }
      //END Deals with Facebook General Posts
      
      /* DRL Not sure whether this is needed?
             {
                 // Facebook Post Page
                 let elems = findElements(srchPathPG('generalPostMenuLocation'), ':not(.SA_augmented)');
                 // DRL FIXIT! The above returns 4 items in my case and it should never return more than one. In order to
                 // work around this I've put a "continue" at the top of the loop below which we'll want to keep for safety.
                 if (elems.length > 1)
                     Log_WriteWarning('The generalPostMenuLocation selector is returning ' + elems.length + ' matches on page ' + window.location.href);
                 for (let elem of elems) {
                     Class_AddByElement(elem, 'SA_augmented');
         
                     if (elem != elems[0])
                         continue;
         
                     let options = [];
                     if (UserHasFeature(UserFeaturesAddPostsLibrary))
                         options.push(
                         {
                             label: 'Import to Library',
                             icon: 'DownloadDk.svg',
                             cmd: async function() {
                                 try
                                 {
                                     await scrapeFacebookPostFromRegularPage(elem, 'downloadToPostsLibrary');
                                 }
                                 catch(e)
                                 {
                                     Log_WriteException(e);
                                 }
                             }
                         });
                     if (UserHasFeature(UserFeaturesPublishingCalendar))
                         options.push(
                         {
                             label: 'Open in Publishing Calendar',
                             icon: 'ResourceSchedulerDk.svg',
                             cmd: async function() {
                                 try
                                 {
                                     await scrapeFacebookPostFromRegularPage(elem, 'openInPublishingCalendar');
                                 }
                                 catch(e)
                                 {
                                     Log_WriteException(e);
                                 }
                             }
                         });
                     if (UserHasFeature(UserFeaturesWatchedPosts))
                         options.push(
                         {
                             label: 'Automations and Tagging',
                             icon: 'AutomationDk.svg',
                             cmd: async function() {
                                 try
                                 {
                                     await scrapeFacebookPostFromRegularPage(elem, 'addOrRemoveAutomation');
                                 }
                                 catch(e)
                                 {
                                     Log_WriteException(e);
                                 }
                             }
                         });
         
                     addDropDownMenu(elem, options, constantStyles.Facebook.PostPage.GeneralPostsDateDropDown);
                 }
             }
      */
   }
   
   // the pop-up box shown when you hover over someone's name
   await popupHoverContactSummaryCreator(contactInfos, contactTags);
}

// the pop-up box shown when you hover over someone's name
async function popupHoverContactSummaryCreator(contactInfos, contactTags)
{
   let elems = findElements(srchPathPG('personCardFB'), ':not(.SA_augmented)'); // Should get elements which has no .SA_augmented class
   
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let url = findElement(srchPathPG('personCardFBProfileURL'), null, elem);
      if (url == null)
      {
         Log_WriteError('Person URL not found with personCardFBProfileURL');
         Log_WriteDOM(elem);
         continue;
      }
      let name = findElement(srchPathPG('personCardFBName'), null, elem);
      if (name == null)
      {
         Log_WriteError('Person name not found with personCardFBName');
         Log_WriteDOM(elem);
         continue;
      }
      let address = await getFacebookAddressFromUrl(url, FacebookAddressFormatAnything);
      if (address == null)
         continue;   // the above logs for us
      
      let contactSummaryHtmlStr = FacebookContactSummaryBoxWrapperCreator(contactInfos, contactTags, address, 'SA_popover_summary');
      if (contactSummaryHtmlStr != null)
      {
         let contactSummaryElem = Utilities_CreateHtmlNode(contactSummaryHtmlStr);
         await addElementByButtonStyle(elem, contactSummaryElem, constantStyles.Facebook.ProfileHoverCard.LinkPreview.button);
         
         // inject contact dashboard icon to the summary box.
         addContactDashboardIcon(contactInfos, address, name, url);
      }
   }
}

// add open contact dashboard button
// the url can be provided if there's a chance the address is not correct and we should check it again before using
function addContactDashboardIcon(contactInfos, address, name, url = null)
{
   let normalized = normalizeContactAddress(address);
   let idClass = createClassFromAddress(normalized);
   let iconEl = findElement('div#open_contact_dashboard_' + idClass, ':not(.SA_augmented)');
   
   if (iconEl == null)
      return;
   
   Class_AddByElement(iconEl, 'SA_augmented');
   
   const [icon, label, classes] = contactIconAndLabel(contactInfos, 'fbp', address);
   
   addActionIcon(iconEl, async function(e)
   {
      if (url)
      {
         address = await getFacebookAddressFromUrl(url, FacebookAddressFormatAnything);   // the address could be inaccurate so check again
      }
      
      let vCard = await getvCardFromNameAndAddress(name, 'facebook', 'fbp', address);
// Replacing the above with this is a good way of testing profile scraping for development purposes.
//      let vCard = await getvCardFromFacebookProfileOrPage(null);
      DisplayMessage(Str('Loading...'), 'busy', null, 5);
      DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', FB_DATA_NAME,
         'Protocol', 'fbp', 'IsMessagingView', '0', 'ByWhom', Str('one click import from Facebook'));
   }, {}, icon, label, classes);
}

/*
async function scrapeGroupInfo(dataName) {
    let state = await reqGetPushedState()
    if(state == null){
        let groupInfo = {
            Uid: 'fbp:' + validateAddress(window.location.href.split('/')[4] + '@fbgroup.socialattache.com'),
            Type: 'fb_group',
            Name: document.querySelector(srchPathFBG2('groupName')).innerText,
            Url: srchPathFBG2('groupUrlPrefix') + window.location.href.split('/')[4],
        }
        reqPushState(JSON.stringify(groupInfo))
        window.location.href = "https://www.facebook.com/groups/"+groupInfo.Uid.replace('@fbgroup.socialattache.com','')+"/membership_questions?action=SA_getGroupQuestions"
    }else if(window.location.href.includes('?action=SA_getGroupQuestions')){
        history.pushState({}, null, window.location.href.replace('?action=SA_getGroupQuestions', ''));
        let groupInfo = JSON.parse(state);

        let questions = findElements(srchPathPG('facebookGroupQuestions'))

        let parsedQuestions = []

        for (let i = 0; i < questions.length; i++){
            let typeElement = findElement(srchPathPG('facebookGroupQuestionsTypeElement'), null, questions[i])
            if(typeElement === 'Write your answer...'){
                typeElement = 'string'
                parsedQuestions.push({
                    Label: findElement(srchPathPG('facebookGroupQuestionsLabel'), null, questions[i]),
                    Type: typeElement,
                })
            }else{
                typeElement = 'list'
                let optionsElements = Array.from(findElement(srchPathPG('facebookGroupQuestionOptionElements'), null, questions[i]))
                let options = []
                for (let j in optionsElements){
                    options.push(findElement(srchPathPG('facebookGroupQuestionsOptionElementInnerText'), null, optionsElements[j]))
                }
                parsedQuestions.push({
                    Label: findElement(srchPathPG('facebookGroupQuestionsOptionElementLabel'), null, questions[i]),
                    Type: typeElement,
                    Options: options
                })
            }
        }
        groupInfo.Questions = parsedQuestions;
        //Do what ever I need to do here and go back
        reqPushState(JSON.stringify(groupInfo))
        window.location.href = "https://www.facebook.com/groups/"+groupInfo.Uid.replace('@fbgroup.socialattache.com','')+"?action=SA_finishScraping"
    }else{
        let groupInfo = JSON.parse(state);
        reqSendPost(dataName, groupInfo)
           .then(function (result) {
               ClearMessage();
               if (result) {
                   DisplayEmbeddedItemForm('WatchedGroupEdit', 'DataName', dataName,
                      'ExternalGroupID', groupInfo.Uid);
               }
           })
           .catch(e => {
               Log_WriteException(e);
               DisplayMessage(Str('Error sending post!'), 'error');
           });
    }
}
*/

// action is string
async function scrapeFacebookPostFromRegularPage(elem, action)
{
   assert(elem != null);
   assert(typeof action === 'string' || action instanceof String);
   
   // this is a request directly from the menu, so we've been given the element and
   // the action for it and we're on the correct page for scraping it
   assert(elem != null);
   action = {
      originalTabID: null,
      action: 'scrapeFacebookPost',
      nextAction: action,
      savedPostInfo: null
   };
   return scrapeFacebookPost(elem, action);
}

// action is object
async function scrapeFacebookStory(action)
{
   let accountInfo = action.savedPostInfo.accountInfo;
   assert(!(typeof action === 'string' || action instanceof String));
   
   // at this point we must be viewing a post or a saved version of a post
   DisplayMessage(Str('Getting story information...'), 'busy');
   
   let dontWarnAboutAttachments = action.nextAction == 'addOrRemoveAutomation';
   
   let postUrl = action.savedPostInfo.postUrl;
   let storyID = action.savedPostInfo.storyID;
   
   return getStoryFromFacebook(accountInfo, dontWarnAboutAttachments, postUrl, storyID)
      .then(async function(post)
      {
         if (post == null)
         {
            reqPushDisplayMessage(action.originalTabID, Str('The story played through to the next one before it could be imported!'), 'error')
               .then(function()
               {
                  if (action.originalTabID != null)
                     reqRemoveTab();
               })
               .catch(e =>
               {
                  Log_WriteException(e); /*throw e;*/
               });
         }
         else
            await sendPostAndNextAction(post, action);
      })
      .catch(e =>
      {
         Log_WriteException(e);
         reqPushDisplayMessage(action.originalTabID, Str('Error handling post!'), 'error')
            .then(function()
            {
               if (action.originalTabID != null)
                  reqRemoveTab();
            })
            .catch(e =>
            {
               Log_WriteException(e); /*throw e;*/
            });
      });
}

async function scrapeFacebookSavedPostBasics(elem)
{
   // use the first one (the last saved one), and again the page might not be fully loaded, so wait
   let postUrl = await waitForElement(srchPathPG('savedPostHref'), 5, elem);
   
   // for some posts (video and live) when we open the individual post page we don't have access
   // to the post author so we get it here and pass it on
   let authorUrl = findElement(srchPathPG('savedPostAuthorURL'), null, elem);
// looks like the author is no longer available either so let's go for the post URL and do what we can
   if (authorUrl == null)
      authorUrl = postUrl;
// it looks like the author is no longer available from inside a list item
//    let authorName = findElement(srchPathPG('savedPostAuthorName'), null, elem);
   
   // DRL FIXIT! What we have here is a URL to the post, and NOT to the author, but we don't have
   // the author in some cases when parsing the post so we'll use this as the next best thing!
   let authorID = await getFacebookAddressFromUrl(authorUrl, FacebookAddressFormatNumeric);
//    if (authorID)
//        authorID = authorName + ' <' + authorID + '>';
   if (authorID.includes('watch'))
   {
      Log_WriteError('Got "watch" inside authorID "' + authorID + '", possible error parsing saved post URL: ' + authorUrl);
   }
   
   let postBody = findElement(srchPathPG('savedPostBody'), null, elem);
   
   return {
      authorID: authorID,
      postBody: postBody
   };
}

// action is string
async function scrapeSelectedFacebookPostFromSavedPage(elem, action)
{
   assert(elem != null);
   assert(typeof action === 'string' || action instanceof String);
   assert(location.pathname.startsWith('/saved/'));
   
   // Facebook Saved Posts, need to open the post to do the scraping
   
   // the page might not be fully loaded, so wait
   let postUrl = await waitForElement(srchPathPG('savedPostHref'), 5, elem);
   
   // we will create a new tab to scrape the saved post, and it will handle the action
   reqCreateTab(null, 'GET', postUrl, {SA_PAUSE_VIDEOS: 1}, false, false, [{
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
      action: 'scrapeFacebookPost',               // this is the first thing the new tab will do
      nextAction: action,                         // this is the second thing the new tab will do
      savedPostInfo: await scrapeFacebookSavedPostBasics(elem)
   }]);
}

// action is an object
async function scrapeFirstFacebookPostFromSavedPage(action)
{
   assert(!(typeof action === 'string' || action instanceof String));
   assert(location.pathname.startsWith('/saved'));
   
   // Facebook Saved Posts, need to open the post to do the scraping
   DisplayMessage(Str('Going to post...'), 'busy');
   
   let count = 0;
   while (await waitForElement(srchPathPG('savedPostExpandList'), 3))
   {
      count++;
      if (count > 10)
      {
         Log_WriteError('scrapeFirstFacebookPostFromSavedPage expanded 10 times, giving up for: ' + window.location.href);
         break;
      }
   }
   
   elem = await waitForElement(srchPathPG('savedPostChooseList'));
   if (elem == null)
   {
      Log_WriteError('scrapeFirstFacebookPostFromSavedPage savedPostChooseList not found');
      // queue the message for the original tab
      reqPushDisplayMessage(action.originalTabID, Str('Post not found!'), 'error')
         .then(function()
         {
            if (action.originalTabID != null)
               reqRemoveTab();
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
      return;
   }
   
   elem = await waitForElement(srchPathPG('savedPostActionsContainerFB'));
   if (elem == null)
   {
      Log_WriteError('scrapeFirstFacebookPostFromSavedPage savedPostActionsContainerFB not found when parsing post');
      // queue the message for the original tab
      reqPushDisplayMessage(action.originalTabID, Str('Post not found!'), 'error')
         .then(function()
         {
            if (action.originalTabID != null)
               reqRemoveTab();
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
      return;
   }
   
   // the page might not be fully loaded, so wait
   let postUrl = await waitForElement(srchPathPG('savedPostHref'), 5, elem);
   
   // the URL could be an intermediate, and we need the final URL, and this happens with shared links like:
   // https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.loom.com%2Fshare%2F8d87e0dbf17c44c0b5db1ba378059756%3Ffbclid%3DIwAR0vMKUeOBmjQkSxLcQTMwIJzvKPropCOr3gGl_7WW3BH33DZlMAZ58c8JU&h=AT3wtwC958T8-PfiKSjFJY-7NMg8xriaFVT3SWnikVXJSEnNRe4KHumXAAYgE8XcaEXhhjk_fxLT4vZSll3Xnm-H9o-wee069qud_jNalwFrixGtmqLlJ-CrP7_LDIRUpKNA0Y9RayXRWao3EG6KwLA
   if (postUrl)
   {
      if (postUrl.startsWith('https://l.facebook.com/l.php?u='))
      {
         Log_WriteInfo('scrapeFirstFacebookPostFromSavedPage savedPostHref has parameter "u" that we will extract: ' + postUrl);
         postUrl = Url_GetParam(postUrl, 'u');             // get the redirect URL
      }
      postUrl = await getFinalUrl(postUrl);
   }
   
   // if the domain is off Facebook then it's going to a video or page on another site where we can't scrape it
   if (postUrl == null || Url_GetDomain(postUrl).indexOf('facebook.com') == -1)
   {
      if (postUrl)
         Log_WriteError('scrapeFirstFacebookPostFromSavedPage savedPostHref would take us to invalid scraping page: ' + postUrl);
      else
         Log_WriteError('scrapeFirstFacebookPostFromSavedPage savedPostHref not found when parsing post');
      // queue the message for the original tab
      reqPushDisplayMessage(action.originalTabID, Str(postUrl ? 'This post is not supported' : 'Post not found!'), 'error')
         .then(function()
         {
            if (action.originalTabID != null)
               reqRemoveTab();
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
      return;
   }
   
   // we're already in a new tab, push the action so it comes back to us on the correct
   // page after the reload, and scrape the post then
   action.action = 'scrapeFacebookPost';
   if (action.savedPostInfo == undefined)
   {
      assert(0);      // it should have been provided
      action.savedPostInfo = await scrapeFacebookSavedPostBasics(elem);
   }
   
   // we remove all the items from this collection in case some previous automation failed and left one behind,
   // but we stop at 3 in case we're not looking at the right collection
   count = 0;
   do
   {
      if (count >= 3)
      {
         Log_WriteError('scrapeFirstFacebookPostFromSavedPage removed 3 items from the collection, giving up for: ' + window.location.href);
         break;
      }
      let buttonUnsaveMenu = await waitForElement(srchPathPG("savedPostUnsaveMenuClick"), 2, elem);
      if (buttonUnsaveMenu == null)
      {
         Log_WriteError('scrapeFirstFacebookPostFromSavedPage unable to find savedPostUnsaveMenuClick');
         break;
      }
      else
      {
         let unsaveItemButton = await waitForElement(srchPathPG("savedPostUnsaveButtonClick"), 2, elem);
         if (unsaveItemButton == null)
         {
            if (count == 0)
            {
               Log_WriteError('scrapeFirstFacebookPostFromSavedPage unable to find savedPostUnsaveButtonClick');
               Log_WriteDOM(elem);
            }
            break;
         }
      }
      count++;
   } while (elem = await waitForElement(srchPathPG('savedPostActionsContainerFB'), 3));
   
   reqPushAction(null, action)
      .then(resp =>
      {
         window.location.href = postUrl;
      })
      .catch(e =>
      {
         Log_WriteException(e);
      });
   await sleep(10);    // let's make sure nothing more is done on this page while it reloads (like loading the action we just pushed)
}

// elem is null for a page hosting a single post, otherwise it's the result of the "generalPostMenuLocation" selector
// action is object
async function scrapeFacebookPost(elem, action)
{
   assert(!(typeof action === 'string' || action instanceof String));
   
   // at this point we must be viewing a post or a saved version of a post
   DisplayMessage(Str('Getting post information...'), 'busy');
   
   let dontWarnAboutAttachments = action.nextAction == 'addOrRemoveAutomation';
   return getPostFromFacebook(elem, dontWarnAboutAttachments, action)
      .then(async function(post)
      {
         await sendPostAndNextAction(post, action);
      })
      .catch(e =>
      {
         Log_WriteException(e);
         reqPushDisplayMessage(action.originalTabID, Str('Error handling post!'), 'error')
            .then(function()
            {
               if (action.originalTabID != null)
                  reqRemoveTab();
            })
            .catch(e =>
            {
               Log_WriteException(e); /*throw e;*/
            });
      });
}

async function sendPostAndNextAction(post, action)
{
   await reqSendPost(FB_DATA_NAME, post)
      .then(async function(result)
      {
         if (!result)
         {
            reqPushDisplayMessage(action.originalTabID, Str('Error sending post!'), 'error')
               .then(function()
               {
                  if (action.originalTabID != null)
                     reqRemoveTab();
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  throw e;
               });
            return;
         }
         
         if (action.nextAction == 'downloadToPostsLibrary')
         {
            reqPushDisplayMessage(action.originalTabID, Str('Loading form...'), 'busy', null, 5)
               .then(function()
               {
                  return reqPushDisplayEmbeddedItemForm(action.originalTabID, 'CuratePostEdit', 'DataName', FB_DATA_NAME,
                     'Type', post.Type, 'ExternalPostID', post.Uid);
               })
               .then(function()
               {
                  if (action.originalTabID != null)
                     reqRemoveTab();
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  throw e;
               });
         }
         else if (action.nextAction == 'openInPublishingCalendar')
         {
            reqCreateTab('SAMainPage', 'GET', Form_MainUri, {
               'FormProcessor': 'PostEdit',
               'DataName': FB_DATA_NAME,
//                    'Type': post.Type,    don't provide the type so the user can choose a different channel to post it to
               'ExternalPostID': post.Uid,
               'ReferralUrl': publisherPageUrl()
            })
               .then(function()
               {
                  if (action.originalTabID != null)
                     reqRemoveTab();
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  throw e;
               });
         }
         else if (action.nextAction == 'addOrRemoveAutomation')
         {
            reqPushDisplayMessage(action.originalTabID, Str('Loading form...'), 'busy', null, 5)
               .then(function()
               {
                  return reqPushDisplayEmbeddedItemForm(action.originalTabID, 'WatchedPostEdit', 'DataName', FB_DATA_NAME,
                     'Type', post.Type, 'ExternalPostID', post.Uid);
               })
               .then(function()
               {
                  if (action.originalTabID != null)
                     reqRemoveTab();
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  throw e;
               });
         }
         else
         {
            Log_WriteError('scrapeFacebookPost unrecognized action: ' + action.nextAction);
            reqPushDisplayMessage(action.originalTabID, Str('Error handling post!'), 'error')
               .then(function()
               {
                  if (action.originalTabID != null)
                     reqRemoveTab();
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  throw e;
               });
         }
      })
      .catch(e =>
      {
         Log_WriteException(e);
         reqPushDisplayMessage(action.originalTabID, Str('Error sending post!'), 'error')
            .then(function()
            {
               if (action.originalTabID != null)
                  reqRemoveTab();
            })
            .catch(e =>
            {
               Log_WriteException(e); /*throw e;*/
            });
      });
}

// should only be used for scraping window
async function pauseFacebookStory()
{
   if (!window.location.href.includes("facebook.com/stories/"))
      return;
   
   // keep checking if there is a pause button and when found pause the story to keep the page from going to the next video
   
   let pauseBtn = findElement(srchPathFBS('storyPauseBtn'));
   let playBtn = findElement(srchPathFBS('storyPlayBtn'));
   let isLoaded = findElement(srchPathFBS('storyIsLoaded'));

// DRL FIXIT? Both buttons are found and I don't see a way of figuring out which is visible.
//   if (pauseBtn && playBtn) {
//      Log_WriteError('Story play and pause buttons BOTH found at: ' + window.location.href);
//   }
//   else
   if ((pauseBtn || playBtn) && isLoaded == null)
   {
      Log_WriteError('isLoaded not found at: ' + window.location.href);
   }
   else if (pauseBtn)
   {
      pauseBtn.click();
      await sleep(1);
   }
   else if (playBtn == null && isLoaded)
   {
      Log_WriteError('Story play and pause buttons not found at: ' + window.location.href);
   }
   else
      setTimeout(pauseFacebookStory, 1000)
}

// should only be used for scraping window
async function pauseFacebookVideo()
{
   if (!window.location.href.includes("facebook.com/watch/") && !window.location.href.includes("facebook.com/videos/"))
      return;
   
   // keep checking if there is a pause button and when found pause the video to keep the page from going to the next video
   
   // DRL FIXIT! Need to also check for unpause button so we know when the selectors have become broken (see pauseFacebookStory()).
   let pauseBtn = findElement(srchPathFBP('postVideoPause'))
   if (pauseBtn)
   {
      pauseBtn.click()
      await sleep(1);
   }
   else
      setTimeout(pauseFacebookVideo, 1000)
}