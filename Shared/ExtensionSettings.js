function ExtensionSettingsInit()
{
   return {
      disableScrapingFocusUntil: 0
   };
}

function setScrapingFocusDisabledFor(seconds)
{
   let sharedData = Storage.GetSharedVar('ExtensionSettings', ExtensionSettingsInit());
   
   sharedData.disableScrapingFocusUntil = new Date().getTime() + seconds * 1000;

   Storage.SetSharedVar('ExtensionSettings', sharedData);
}

function getIsScrapingFocusAllowed()
{
   let sharedData = Storage.GetSharedVar('ExtensionSettings', ExtensionSettingsInit());
   
   return sharedData.disableScrapingFocusUntil < new Date().getTime();
}
