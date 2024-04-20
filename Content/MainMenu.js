// pops up any default help, returns menu options
function _handlePopUpHelp(helpItems, path)
{
   let popUp = null;
   let options = [];
   if (helpItems.hasOwnProperty(path))
   {
      for (let i in helpItems[path])
      {
         let item = helpItems[path][i];
         if (popUp == null && item.IsDefaultShow)
            popUp = item;
         
         options.push({
            label: item.Name,
            icon: '',
            cmd:
               function()
               {
//                       DisplayMessage(Str('Loading...'), 'busy', null, 5);
                  DisplayEmbeddedItemForm('LandingPageVisit', 'Embedded', '1', 'ResourceID', Url_GetParam(item.ResourceURL, 'ResourceID'));
               }
         });
      }
   }
   if (UserHasFeature(UserFeaturesHelp))
   {
      options.push({
         label: Str('Edit Help'),
         icon: 'EditDk.svg',
         cmd:
            async function()
            {
               reqCreateTab('SAMainPage', 'GET', Form_MainUri, {
                  'View': 'Home,Admin,Help',
                  'ViewHelpPath': reqGetBrandID() + '/' + path
               });
            }
      });
   }
   
   if (popUp)
   {
      DisplayMessage(Str('Loading...'), 'busy', null, 5);
      DisplayEmbeddedItemForm('LandingPageVisit', 'Embedded', '1', 'ResourceID', Url_GetParam(popUp.ResourceURL, 'ResourceID'));
      reqMarkHelpItemRead(path);
   }
   
   return options;
}

async function getMainMenuOptions(loggedIn, isAutomationPaused, clickFromToolbar)
{
   let options = [
      {
         label: Str("About the Extension"),
         icon: 'IconWithoutCircle.svg',
         cmd: () =>
         {
            DisplayMessage(Str('<0> Chrome Extension v<1> with constants v<2>',
               chrome.runtime.getManifest().name, chrome.runtime.getManifest().version, CONSTANTS_VERSION), 'busy', null);
         }
      },
      {
         label: Str("Select Provider"),
         icon: 'SynchronizeDk.svg',
         cmd: async () =>
         {
            await displayBrandsMenu();
         }
      },
      {
         label: Str("Create a Support Ticket"),
         icon: 'IssueDk.svg',
         cmd: async () =>
         {
            if (clickFromToolbar)
               await reqCreateIssue();
            else
               DisplayMessage(Str('In order to submit a support ticket, click on the icon for this extension where it appears in the "Extensions" toolbar or menu above.'), 'warning');
         }
      }
   ];
   if (loggedIn)
   {
      let isScrapingFocusAllowed = getIsScrapingFocusAllowed();

      options = options.concat([
         {
            label: Str("Extension Settings"),
            icon: 'SyncSettingsDk.svg',
            cmd: async () =>
            {
               DisplayEmbeddedItemForm('SyncSettingsEdit');
            }
         },
         {
            label: Str("Extension Devices"),
            icon: 'SyncDevicesDk.svg',
            cmd: async () =>
            {
               DisplayEmbeddedItemForm('SyncDevicesEdit');
            }
         }]);
      if (UserHasFeature(UserFeaturesTasks))
         options = options.concat([
            {
               label: Str("Open the Tasks Page"),
               icon: 'TaskDk.svg',
               cmd: () =>
               {
                  reqCreateTab('SAMainPage', 'GET', Form_MainUri + "?View=Home%2CMyBusiness%2CTasks");
               }
            }]);
      if (UserHasFeature(UserFeaturesContacts))
         options = options.concat([
            {
               label: Str("Open the Contacts Page"),
               icon: 'ContactDk.svg',
               cmd: () =>
               {
                  reqCreateTab('SAMainPage', 'GET', Form_MainUri + "?View=Home%2CMyBusiness%2CContacts");
               }
            }
         ]);
      if (UserHasFeature(UserFeaturesWatchedPosts))
         options = options.concat([
            {
               label: Str("Open the Watched Posts Page"),
               icon: 'AutomationDk.svg',
               cmd: () =>
               {
                  reqCreateTab('SAMainPage', 'GET', Form_MainUri + "?View=Home%2CMarketing%2CWatchedPosts");
               }
            }
         ]);
      options = options.concat([
         {
            label: Str("Open the Training Page"),
            icon: 'TrainingDk.svg',
            cmd: () =>
            {
               reqCreateTab('SAMainPage', 'GET', Form_MainUri + "?View=Home%2CMyBusiness%2CTrainings");
            }
         },
         {
            label: Str(isScrapingFocusAllowed ? "Pause Automation Pop-Ups for One Hour" : "Allow Automation Pop-Ups"),
            icon: 'AutomationDk.svg',
            cmd: async () =>
            {
               await reqSetScrapingFocusDisabledFor(isScrapingFocusAllowed ? SecondsPerHour : 0);
            }
         },
         {
            label: Str(isAutomationPaused ? "Resume All Automations" : "Pause All Automations"),
            icon: 'AutomationDk.svg',
            cmd: async () =>
            {
               await reqSetAutomationPaused(!isAutomationPaused);
            }
         }
      ]);
   }
   else
   {
      options = options.concat([
         {
            label: Str('Create or Login to an Account'),
            icon: 'AccountDk.svg',
            cmd: () =>
            {
               reqCreateTab('SAMainPage', 'GET', LoginUri);
            }
         }
      ]);
   }
   
   return options;
}

// called from toolbar button
async function displayMainMenu(isLoggedIn)
{
   let isAutomationPaused = await reqGetAutomationPaused();
   let options = await getMainMenuOptions(isLoggedIn, isAutomationPaused, true);
   showCenteredMenu(options, null);
}

async function displayBrandsMenu()
{
   reqGetBrandInfos()
      .then(data =>
      {
         let options = [];
         
         for (const brandID in data.brands)
         {
            options.push({
               label: data.brands[brandID].Name,
               icon: brandID == data.brandID ? 'CheckedDkOn.svg' : 'CheckedDkOff.svg',
               cmd:
                  async function()
                  {
                     await reqSetBrandID(brandID);
                  }
            });
         }
         
         popUpMenu(Str('Choose your provider:'), options, null, {orientation: 'right'});
      })
      .catch(e =>
      {
         Log_WriteException(e);
         DisplayMessage(Str('Error getting providers!'), 'error');
      });
}

async function displayMainMenuButton(isLoggedIn)
{
   let isScrapingFocusAllowed = getIsScrapingFocusAllowed();
   let isAutomationPaused = await reqGetAutomationPaused();
   let button = Utilities_GetElementById('SA_MainMenuButton');
   if (button != null)
   {
      if (Class_HasByElement(button, 'SA_LoggedIn') != isLoggedIn ||
         Class_HasByElement(button, 'SA_ScrapingFocusAllowed') != isScrapingFocusAllowed ||
         Class_HasByElement(button, 'SA_AutomationPaused') != isAutomationPaused)
         button.parentElement.removeChild(button);
      else
         return; // already added to page and in correct state
   }
   
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
   
   let options = await getMainMenuOptions(isLoggedIn, isAutomationPaused, false);
   button = addDropDownMenu(null, options, constantStyles[siteName].MainMenuButton);
   button.id = 'SA_MainMenuButton';
   if (isLoggedIn)
      Class_AddByElement(button, 'SA_LoggedIn');
   if (isScrapingFocusAllowed)
      Class_AddByElement(button, 'SA_ScrapingFocusAllowed');
   if (isAutomationPaused)
      Class_AddByElement(button, 'SA_AutomationPaused');
}
