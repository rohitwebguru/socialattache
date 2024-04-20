function massageInstagramPage(contactInfos, helpItems)
{
   let found = false;
   let dataName = IG_DATA_NAME;
   
   let address = getAddressFromInstagramProfile(); // invalid if not profile page
   
   removeOldMassaging(contactInfos);
   
   // Instagram profile page
   let elems = findElements(srchPathPG('profileNameInsta'), ':not(.SA_augmented)');
   for (let elem of elems)
   {
      Class_AddByElement(elem, 'SA_augmented');
      
      let name = elem.innerText;
      
      const [icon, label, classes] = contactIconAndLabel(contactInfos, 'ig', address);
      
      addActionIcon(elem, async function(e)
      {
         let vCard = await getvCardFromNameAndAddress(name, 'ig', 'igun', address);
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('ContactQuickView', 'vCard', vCard, 'DataName', IG_DATA_NAME,
            'Protocol', 'ig', 'IsMessagingView', '0', 'ByWhom', Str('one click import from Instagram'));
      }, constantStyles.Instagram.ProfilePage.ActionButton, icon, label, classes);
      found = true;
   }
   
   // Instagram posts
   if (location.pathname == '/')
   {
      elems = findElements(srchPathPG('postAuthorInsta'), ':not(.SA_augmented)');
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
                        getPostFromInstagram(elem)
                           .then(post =>
                           {
                              reqSendPost(IG_DATA_NAME, post)
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
         
         addDropDownMenu(elem, options, constantStyles.Instagram.FeedPage.GeneralPostsDateDropDown)
         found = true;
      }
   }
   
   if (location.pathname.startsWith('/p/'))
   {
      elems = findElements(srchPathPG('postPageAuthorInsta'), ':not(.SA_augmented)');
      
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
                        getPostFromInstagram(elem)
                           .then(post =>
                           {
                              reqSendPost(IG_DATA_NAME, post)
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
         
         addDropDownMenu(elem, options, constantStyles.Instagram.PostPage.GeneralPostsDateDropDown)
         found = true;
      }
   }
   
   return found;
}
