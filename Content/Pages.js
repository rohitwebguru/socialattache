// create a class of the form "SA_fbperid_12345" so we can remove the HTML we added
// when this item changes, and the address is expected to be normalized
function createClassFromAddress(address)
{
   if (address.includes(':') || !address.includes('@'))
   {
      Log_WriteErrorCallStack('Invalid address for making class: ' + address);
   }
   
   address = address.toLowerCase();    // ignore case
   
   let type = address.split('@')[1].split('.')[0];
   let id = address.split('@')[0];
   
   // remove unsupported characters
   type = type.replace(/[^a-zA-Z0-9]/g, '_');   // this is here only for invalid cases I saw (caught in the above assert)!
   id = id.replace(/[^a-zA-Z0-9]/g, '_');
   
   return 'SA_' + type + '_' + id;
}

// create a class of the form "SA_updated_20220203_014311" so we can remove the HTML we added
// when this item changes
function createClassFromDate(dateStr)
{
   if (dateStr != null) dateStr = dateStr.substring(0, 19); // remove time zone
   // remove "/" from date, ":" from time, and "-" was for the old style date (can remove later)
   // convert space between date and time to "_"
   return 'SA_updated_' + Utilities_ReplaceInString(Utilities_ReplaceInString(Utilities_ReplaceInString(Utilities_ReplaceInString(dateStr, '/', ''), ':', ''), '-', ''), ' ', '_');
}

function contactIconAndLabel(contactInfos, protocol, address)
{
   let normalized = normalizeContactAddress(address);
   let protoAddress = protocol + ':' + normalized;
   
   let contactInfo = null;
   let classes = [createClassFromAddress(normalized)];
   if (contactInfos.hasOwnProperty(protoAddress))
   {
      contactInfo = contactInfos[protoAddress];
      classes.push(createClassFromDate(contactInfo.Updated));
   }
   
   let usage = contactInfo
      ? (contactInfo.TaskStatus != 'none'
         ? contactInfo.TaskStatus
         : 'contact_open')
      : 'contact_import';
   
   let icon = '';
   let label = '';
   if (usage == 'contact_import')
   {
      icon = 'DownloadDk.svg';
      label = Str('Import as Contact');
   }
   else if (usage == 'contact_open')
   {
      if (address.includes('@fbrmid.socialattache.com'))
      {
         icon = 'ChatRoomDk.svg';
         label = Str('Open Group Chat Dashboard');
      }
      else if (address.includes('@fbpage.socialattache.com'))
      {
         icon = 'FbPageDk.svg';
         label = Str('Open Page Dashboard');
      }
      else
      {
         icon = 'ContactDk.svg';
         label = Str('Open Contact Dashboard');
      }
   }
   else if (usage == 'overdue')
   {
      icon = 'TasksOverdueDk.svg';
      label = Str('Has an overdue task');
   }
   else if (usage == 'upcoming')
   {
      icon = 'TasksUpcomingDk.svg';
      label = Str('Has an upcoming task');
   }
   else
      assert(0);
   
   return [icon, label, classes];
}

let pageRefreshed = null;
let savedContactInfos = null;
let savedGroupInfos = null;

function removeOldMassaging(contactInfos, groupInfos = null)
{
   // make sure the filtering is always using the latest info
   savedContactInfos = contactInfos;
   let currentRefresh = DateAndTime_FromString('2000-01-01 00:00:00', 0);
   
   for (let address in contactInfos)
   {
      const contactInfo = contactInfos[address];
      
      let contactUpdated = DateAndTime_FromString(contactInfo.Updated, 0);
      if (currentRefresh.LessThan(contactUpdated))
         currentRefresh = contactUpdated;
      
      if (pageRefreshed != null && pageRefreshed.LessThan(contactUpdated))
      {
//            Log_WriteInfo('Contact ' + contactInfo.ContactID + ' changed so clearing out augmentations for ' + address + '.');
         
         let normalized = normalizeContactAddress(Url_StripProtocol(address));
         let idClass = createClassFromAddress(normalized);
         let dateClass = createClassFromDate(contactInfo.Updated);
         let elems = Utilities_GetElementsBySelector('.' + idClass + ':not(.' + dateClass + ')');
         for (let elem of elems)
         {
            if (Class_HasByElement(elem, 'SA_augmented'))
            {
               // we augmented the element so we can simply remove the class so it
               // gets recalculated later
               Class_RemoveByElement(elem, ['SA_augmented', idClass]); // we enhanced the element
            }
            else
            {
               // we added the element, so we remove it, and remove the SA_augmented class from
               // the ancestor so that it will be reprocessed later
               let parent = Utilities_GetParentByClass(elem, 'SA_augmented');
               if (parent)
                  Class_RemoveByElement(parent, 'SA_augmented');
               elem.remove();
            }
         }
      }
   }
   pageRefreshed = currentRefresh;
   
   if (groupInfos == null) // only Facebook has groups
      return;
   
   let addresses = Object.keys(groupInfos);
   if (savedGroupInfos != null)
      addresses = addresses.concat(Object.keys(savedGroupInfos));
   for (let address of addresses)
   {
      // if we had no groups, or a group is added or removed, update the icon
      if (savedGroupInfos == null ||
         !savedGroupInfos.hasOwnProperty(address) ||
         !groupInfos.hasOwnProperty(address))
      {
         let normalized = normalizeContactAddress(Url_StripProtocol(address + '@fbgroup.socialattache.com'));
         let idClass = createClassFromAddress(normalized);
         let elems = Utilities_GetElementsBySelector('.' + idClass);
         for (let elem of elems)
         {
            if (Class_HasByElement(elem, 'SA_augmented'))
            {
               // we augmented the element so we can simply remove the class so it
               // gets recalculated later
               Class_RemoveByElement(elem, ['SA_augmented', idClass]); // we enhanced the element
            }
            else
            {
               // when we add a button we don't always add it as a child, sometimes it's a
               // sibling or somewhere else, so we store the original target ID to find it
               let targetID = elem.dataset.sa_original_target;
               
               // we added the element, so we remove it, and remove the SA_augmented class
               // from the original target so that it will be reprocessed later
               let target = Utilities_GetElementById(targetID);
               assert(target != null);
               assert(Class_HasByElement(target, 'SA_augmented'));
               Class_RemoveByElement(target, 'SA_augmented');
               
               elem.remove();
            }
         }
      }
   }
   savedGroupInfos = groupInfos;
}

FormSubmit.AddCallback(function(form)
{
   let params = Form_GetValues(form);
   
   if (params.hasOwnProperty('ContactID'))
      reqReloadContactInfo(params['ContactID']);
});

function massagePinterestPage(contactInfos, helpItems)
{
   let found = false;
   let dataName = 'PinterestScrape';
   
   removeOldMassaging(contactInfos);
   
   let address = getAddressFromPinterestProfile(); // invalid if not profile page
   if (address != null)
   {
      // Pinterest profile page
      let elems = findElements(srchPathPG('profileNamePint'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented');
         
         let name = elem.innerText;
         
         const [icon, label, classes] = contactIconAndLabel(contactInfos, 'pint', address);
         
         addActionIcon(elem, async function(e)
         {
            let vCard = await getvCardFromNameAndAddress(name, 'pinterest', 'pint', address);
            DisplayMessage(Str('Loading...'), 'busy', null, 5);
            DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', 'PinterestScrape',
               'Protocol', 'pint', 'IsMessagingView', '0', 'ByWhom', Str('one click import from Pinterest'));
         }, constantStyles.Pinterest.ProfilePage.ActionButton, icon, label, classes);
         found = true;
      }
   }
   
   // Pinterest posts
   let elems = findElements(srchPathPG('postWrapperPint'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let options = [];
      if (UserHasFeature(UserFeaturesAddPostsLibrary))
         options.push(
            {
               label: 'Import to Library',
               icon: 'DownloadDk.svg',
               cmd: function()
               {
                  try
                  {
                     DisplayMessage(Str('Getting post information...'), 'busy', null, 5);
                     let url = new URL(findElement('a {href}', null, elem));
                     url.searchParams.set('SA_action', 'downloadPostToLibrary');
                     window.open(url)
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }
            });
      
      addDropDownMenu(elem, options, constantStyles.Pinterest.FeedPage.GeneralPostsDropDown);
      // DRL FIXIT! This should be included in the above somehow!
      elem.style.position = 'relative'; // to have our button inside the image
      
      found = true;
   }
   
   // Pinterest Post Page
   if (window.location.href.includes('/pin'))
   {
      elems = findElements(srchPathPG('pinterestPostPageDropdownButtonLocationSelector'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented');
         
         let cmds = new Map()
         cmds.set('downloadPostToLibrary', (callback = () =>
         {
         }) =>
         {
            DisplayMessage(Str('Getting post information...'), 'busy');
            getPostFromPinterest(elem)
               .then(post =>
               {
                  reqSendPost(dataName, post)
                     .then(function(result)
                     {
                        ClearMessage();
                        if (result)
                        {
                           DisplayMessage(Str('Loading...'), 'busy', null, 5);
                           DisplayEmbeddedItemForm('CuratePostEdit', 'DataName', dataName,
                              'Type', post.Type, 'ExternalPostID', post.Uid);
                           callback()
                        }
                        callback()
                     })
                     .catch(e =>
                     {
                        Log_WriteException(e);
                        DisplayMessage(Str('Error sending post!'), 'error');
                        callback()
                     });
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  DisplayMessage(Str('Error parsing post!'), 'error');
                  callback()
               });
         })
         
         if (Url_GetParam(window.location.href, 'SA_action') != null)
         {
            cmds.get(Url_GetParam(window.location.href, 'SA_action'))()
            Url_RemoveParam(window.location.href, 'SA_action')
         }
         
         let options = [];
         if (UserHasFeature(UserFeaturesAddPostsLibrary))
            options.push(
               {
                  label: 'Import to Library',
                  icon: 'DownloadDk.svg',
                  cmd: cmds.get('downloadPostToLibrary')
               });
         
         addDropDownMenu(elem, options, constantStyles.Pinterest.PostPage.ActionButton)
         // DRL FIXIT! This should be included in the above somehow!
         elem.style.position = 'relative'; // to have our button inside the image
         
         found = true;
      }
   }
   
   // Pinterest conversation
   elems = findElements(srchPathPG('pinterestConversationHeader'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = findElement(srchPathPG('pinterestConversationHeaderName'), null, elem);
      let address = findElement(srchPathPG('pinterestConversationHeaderAddress'), null, elem);
      if (address == null)
         continue;
      address = validateAddress(address + '@pintun.socialattache.com');
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'pint', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'pinterest', 'pint', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', 'PinterestScrape',
            'Protocol', 'pint', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Pinterest'));
      }, constantStyles.Pinterest.MessagingPage.ActionButton, icon, label, classes);
      found = true;
   }
   
   return found;
}

function massageTikTokPage(contactInfos, helpItems)
{
   let found = false;
   let dataName = 'TikTokScrape';
   
   removeOldMassaging(contactInfos);
   
   let address = getAddressFromTikTokProfile(); // invalid if not profile page
   
   // TikTok profile page
   let elems = findElements(srchPathPG('profileNameTikTok'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = elem.innerText;
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'tt', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'tiktok', 'tt', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', 'TikTokScrape',
            'Protocol', 'tt', 'IsMessagingView', '0', 'ByWhom', Str('one click import from TikTok'));
      }, constantStyles.TikTok.ProfilePage.ActionButton, icon, label, classes);
      found = true;
   }
   
   // TikTok posts
   elems = findElements(srchPathPG('postWrapperTikTok'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let options = [];
      if (UserHasFeature(UserFeaturesAddPostsLibrary))
         options.push(
            {
               label: 'Import to Library',
               icon: 'DownloadDk.svg',
               cmd:
                  function()
                  {
                     DisplayMessage(Str('Getting post information...'), 'busy');
                     getPostFromTikTok(elem)
                        .then(post =>
                        {
                           reqSendPost(dataName, post)
                              .then(function(result)
                              {
                                 ClearMessage();
                                 if (result)
                                 {
                                    DisplayMessage(Str('Loading...'), 'busy', null, 5);
                                    DisplayEmbeddedItemForm('CuratePostEdit', 'DataName', dataName,
                                       'Type', post.Type, 'ExternalPostID', post.Uid);
                                 }
                              })
                              .catch(e =>
                              {
                                 Log_WriteException(e);
                                 DisplayMessage(Str('Error sending post!'), 'error');
                              });
                        })
                        .catch(e =>
                        {
                           Log_WriteException(e);
                           DisplayMessage(Str('Error parsing post!'), 'error');
                        });
                  }
            });
      
      addDropDownMenu(elem, options, constantStyles.TikTok.FeedPage.GeneralPostsActionButton);
      found = true;
   }
   
   // TikTok messages (in TikTok messages list)
   if (window.location.href.includes('messages'))
   {
      
      // DRL FIXIT! The same header is used for all conversations so we need to update it when
      // the conversation changes!
      
      elems = findElements(srchPathPG('tiktokConversationHeader'), ':not(.SA_augmented)');
      for (let elem of elems)
      {
         Class_AddByElement(elem, 'SA_augmented');
         
         let name = findElement(srchPathPG('tiktokConversationHeaderName'), null, elem);
         let address = findElement(srchPathPG('tiktokConversationHeaderAddress'), null, elem);
         if (address == null)
            continue;
         address = validateAddress(address + '@ttun.socialattache.com');
         
         const [icon, label, classes] = contactIconAndLabel(contactInfos, 'tt', address);
         
         addActionIcon(elem, async function(e)
         {
            let vCard = await getvCardFromNameAndAddress(name, 'tiktok', 'tt', address);
            DisplayMessage(Str('Loading...'), 'busy', null, 5);
            DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', 'TikTokScrape',
               'Protocol', 'tt', 'IsMessagingView', '1', 'ByWhom', Str('one click import from TikTok'));
         }, constantStyles.TikTok.MessagingPage.ActionButton, icon, label, classes);
         found = true;
      }
   }
   
   return found;
}

async function downloadTwitterPost(action)
{
   let elem = findElement(srchPathPG('postWrapperTwitter'));
   if (!elem)
   {
      // queue the message for after the new page loads
      reqPushDisplayMessage(null, Str('Post not found!'), 'error')
         .then(function()
         {
            history.back();
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
      
      await sleep(10);    // let's make sure nothing more is done on this page while it reloads
      return;
   }
   
   DisplayMessage(Str('Getting post information...'), 'busy');
   getPostFromTwitter(elem).then(post =>
      {
         reqSendPost('TwitterScrape', post)
            .then(function(result)
            {
               ClearMessage();
               
               // queue some actions for after the new page loads
               reqPushDisplayMessage(null, Str('Loading form...'), 'busy', null, 5)
                  .then(function()
                  {
                     return reqPushDisplayEmbeddedItemForm(null, 'CuratePostEdit', 'DataName', 'TwitterScrape',
                        'Type', post.Type, 'ExternalPostID', post.Uid);
                  })
                  .then(function()
                  {
                     history.back();
                  })
                  .catch(e =>
                  {
                     Log_WriteException(e);
                     throw e;
                  });
            })
            .catch(e =>
            {
               Log_WriteException(e);
               DisplayMessage(Str('Error sending post!'), 'error');
            });
      })
      .catch(e =>
      {
         Log_WriteException(e);
         DisplayMessage(Str('Error parsing post!'), 'error');
      });
}

function massageTwitterPage(contactInfos, helpItems)
{
   let found = false;
   
   removeOldMassaging(contactInfos);
   
   let address = getAddressFromTwitterProfile(); // invalid if not profile page
   
   // Twitter profile page
   let elems = findElements(srchPathPG('profileNameTwitter'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = elem.innerText;
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'twit', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'twitter', 'twit', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', 'TwitterScrape',
            'Protocol', 'twit', 'IsMessagingView', '0', 'ByWhom', Str('one click import from Twitter'));
      }, constantStyles.Twitter.ProfilePage.ActionButton, icon, label, classes);
      found = true;
   }
   
   // Twitter posts
   elems = findElements(srchPathPG('postWrapperTwitter'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let options = [];
      if (UserHasFeature(UserFeaturesAddPostsLibrary))
         options.push(
            {
               label: 'Import to Library',
               icon: 'DownloadDk.svg',
               cmd:
                  function()
                  {
                     DisplayMessage(Str('Getting post information...'), 'busy', 5);
                     
                     // push the action so it comes back to us on the correct page after the click
                     reqPushAction(null, {action: 'downloadTwitterPost'})
                        .then(function()
                        {
                           elem.click();
                        })
                        .catch(e =>
                        {
                           Log_WriteException(e);
                           throw e;
                        });
                  }
            });
      
      addDropDownMenu(elem, options, constantStyles.Twitter.FeedPage.GeneralPostsDropDown)

//        // prevent twitter to trigger his own click event, when clicking on the dropdown button
//        Utilities_AddEvent(elem, 'click', (e)=>{
//            // DRL not sure if this is still needed after I added the e.Xxx() calls to the menu event handler above
//            if(menu.contains(e.target)){
//                e.preventDefault();
//                return false;
//            }
//        });
      found = true;
   }
   
   // Twitter conversation, or the profile page past the conversation
   elems = findElements(srchPathPG('twitterConversationHeader'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = findElement(srchPathPG('twitterConversationHeaderName'), null, elem);
      let address = findElement(srchPathPG('twitterConversationHeaderAddress'), null, elem);
      if (address == null)
         continue;
      address = validateAddress(address + '@twitun.socialattache.com');
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'twit', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'twitter', 'twit', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', 'TwitterScrape',
            'Protocol', 'twit', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Twitter'));
      }, constantStyles.Twitter.MessagingPage.ActionButton, icon, label, classes);
      found = true;
   }
   
   return found;
}

function massageGmailPage(contactInfos, helpItems)
{
   let found = false;
   
   removeOldMassaging(contactInfos);
   
   // Opened email
   let elems = findElements(srchPathPG('gmailSender'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = findElement(srchPathPG('gmailSenderName'), null, elem);
      if (name == null)
      {
         Log_WriteError('Missing Gmail sender name');
         continue;
      }
      let address = findElement(srchPathPG('gmailSenderEmail'), null, elem);
      if (address == null)
      {
         Log_WriteError('Missing Gmail sender email');
         continue;
      }
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'mailto', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'mailto', 'mailto', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard,
            'Protocol', 'mailto', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Gmail'));
      }, constantStyles.Gmail.MessagingPage.ActionButton, icon, label, classes);
      found = true;
   }
   
   return found;
}

function massageOutlookPage(contactInfos, helpItems)
{
   let found = false;
   
   removeOldMassaging(contactInfos);
   
   // Message list
   let elems = findElements(srchPathPG('outlookSender'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = findElement(srchPathPG('outlookSenderName'), null, elem);
      if (name == null)
      {
         Log_WriteError('Missing Outlook sender name');
         continue;
      }
      let address = findElement(srchPathPG('outlookSenderEmail'), null, elem);
      if (address == null)
      {
         Log_WriteError('Missing Outlook sender email');
         continue;
      }
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'mailto', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'mailto', 'mailto', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard,
            'Protocol', 'mailto', 'IsMessagingView', '1', 'ByWhom', Str('one click import from Outlook'));
      }, constantStyles.Outlook.MessagingPage.ActionButton, icon, label, classes);
      found = true;
   }
   
   return found;
}

// contact summary box tags HTML
function FacebookContactSummaryBoxTagsCreator(contactInfos, contactTags, contactInfoProp)
{
   assert(contactInfoProp.startsWith('fbp:'));
   
   if (!contactInfos.hasOwnProperty(contactInfoProp))
      return '';
   
   let contactInfo = contactInfos[contactInfoProp];
   
   let htmlTags = '';
   for (let i = 0; i < contactInfo.TagIDs.length; i++)
   {
      htmlTags += '<div>' + contactTags[contactInfo.TagIDs[i]] + '</div>';
   }
   
   return '<div class="SA_tags">' + htmlTags + '</div>';
}

// contact summary box HTML
function FacebookContactSummaryBoxWrapperCreator(contactInfos, contactTags, address, classList)
{
   assert(!address.includes(':'));
   
   let normalized = normalizeContactAddress(address);
   let contactInfoProp = 'fbp:' + normalized;
   
   let idClass = createClassFromAddress(normalized);
   classList += classList != '' ? ' ' + idClass : idClass;
   
   let contactInfo = null;
   if (contactInfos.hasOwnProperty(contactInfoProp))
      contactInfo = contactInfos[contactInfoProp];
   let dateClassName = createClassFromDate(contactInfo ? contactInfo.Updated : null);
   classList += ' ' + dateClassName;
   
   let elems = Utilities_GetElementsBySelector('.SA_contact_summary.' + idClass + '.' + dateClassName);
   if (elems.length)
   {
      return null; // return if already existing.
   }
   
   let contactNote = contactInfo ? Utilities_EncodeHtml(contactInfo.Note) : '';
   
   let contactTagsElem = FacebookContactSummaryBoxTagsCreator(contactInfos, contactTags, contactInfoProp);
   
   let contactSummaryHTML = '<div class="SA_contact_summary ' + classList + '">';
   contactSummaryHTML += '<div class="SA_contact_button_tags">';
   contactSummaryHTML += '<div class="SA_open_contact_dashboard" id="open_contact_dashboard_' + idClass + '"></div>';
   contactSummaryHTML += contactTagsElem != undefined ? contactTagsElem : '<div class="SA_tags"></div>';
   contactSummaryHTML += '</div>';
   contactSummaryHTML += '<div class="SA_contact_notes">' + contactNote + '</div>';
   contactSummaryHTML += '</div>';
   contactSummaryHTML += '</div>';
   
   return contactSummaryHTML;
}