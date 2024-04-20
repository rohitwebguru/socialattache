async function updateMessengerFilterLayout(elementPath, categoryName, filterMenu, actionBarElmPath)
{
   let prependDropDownMenu = findElement(elementPath)
   if (prependDropDownMenu == null)
      return;
   
   let localData = Storage.GetTabVar('MessengerFilter', MessengerFilterInit());
   
   let menuIfThereIsOne = findElement('.SA', null, prependDropDownMenu)
   if (menuIfThereIsOne != null)
   {
      // only need to refresh if there have been changes (and the page would have been refreshed)
      if (localData.lastMenuRefreshed != null && localData.lastMenuRefreshed.Equal(pageRefreshed))
         return;
      
      menuIfThereIsOne.remove();
   }
   localData.lastMenuRefreshed = pageRefreshed;
   Storage.SetTabVar('MessengerFilter', localData);
   
   let options = [];
   let found = localData.selectedFilterID == null;
   
   options.push({
      icon: localData.selectedFilterID == null ? 'CheckedDkOn.svg' : 'CheckedDkOff.svg',
      label: StrLabel('No Filtering'),
      cmd: async function()
      {
         await setSearchFilter(null);
      }
   })
   
   let filterNames = await reqGetSearchFilterNames();
   for (let filterID in filterNames)
   {
      if (localData.selectedFilterID == filterID)
         found = true;
      options.push({
         icon: localData.selectedFilterID == filterID ? 'CheckedDkOn.svg' : 'CheckedDkOff.svg',
         label: filterNames[filterID],
         cmd: async function()
         {
            await setSearchFilter(filterID);
         }
      })
   }
   
   if (Object.keys(filterNames).length > 0)
   {
      options.push({
         icon: 'CheckedDkOff.svg',
         label: StrLabel('Edit Filters...'),
         cmd: async function()
         {
            DisplayMessage(Str('Loading...'), 'busy', null, 5);
            DisplayEmbeddedItemForm('SearchFiltersEdit', 'Category', categoryName, 'CallbackMethod', filterMenu,
               'SearchFilterID', localData.selectedFilterID ? localData.selectedFilterID : Object.keys(filterNames)[0]);
         }
      });
   }
   options.push({
      icon: 'CheckedDkOff.svg',
      label: StrLabel('Create Filter...'),
      cmd: async function()
      {
         DisplayMessage(Str('Loading...'), 'busy', null, 5);
         DisplayEmbeddedItemForm('SearchFiltersEdit', 'Category', categoryName, 'CallbackMethod', filterMenu,
            'SearchFilterID', null);
      }
   })
   
   
   let siteName = null;
   let domain = window.location.host;
   
   if (domain.includes('messenger'))
      siteName = 'Messenger';
   else if (domain.includes('facebook'))
      siteName = 'Facebook';
   else if (domain.includes('instagram'))
      siteName = 'Instagram';
   else if (domain.includes('pinterest'))
      siteName = 'Pinterest';
   else if (domain.includes('tiktok'))
      siteName = 'TikTok';
   else if (domain.includes('twitter'))
      siteName = 'Twitter';
   else if (domain.includes('google'))
      siteName = 'Gmail';
   else if (domain.includes('outlook'))
      siteName = 'Outlook';
   else
   {
      Log_WriteError('Unsupported site: ' + url);
      return;
   }
   
   addDropDownMenu(prependDropDownMenu, options, constantStyles[siteName].MessengerPage.FilterContactsButton)
   
   if (!found)
      await setSearchFilter(null);  // selected filter was removed, set no filtering
   else
      updateFilterActiveIndication(actionBarElmPath);
}


function updateFilterActiveIndication(actionBarElmPath)
{
   let prependDropDownMenu = findElement(actionBarElmPath)
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