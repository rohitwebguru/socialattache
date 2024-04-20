const SyncDeviceResponsibilities = [
   'FetchContact',
   // the following may occur in a group, so the assistant will need to be a member
   'WatchedPosts',
   // the following will occur in a group, so the assistant will need to be a member
   'FetchComment',
   // the following will occur in a group, and the assistant will need to be an admin
   'WatchedGroupRequests',
   'WatchedGroupMembers',
   'GroupMemberAnswers',
];

function SyncDevicesInit()
{
   return {
      syncDevice: {
         // this is a subset, only the items we need to access when the device is not yet set up
         SyncDeviceID: null,
         IsActive: false,
         IsEnabled: false
      },
      deviceUid: null,
   };
}

if (Browser.IsExtensionBackground())
{
   // when the browser is closed then launched, or the extension is installed/updated and launched
   Environment.AddStartupListener(function()
   {
      Log_WriteInfo('SyncDevices app startup');
      
      Storage.AddSharedValuesLoadedListener(async function()
      {
         // make sure we're working with the latest syncDevices
         OutstandingProcessing_Clear('SyncDevices');
         _updateSyncDevices();    // this is async
      });
   });
   
   Timers.AddRepeatingTimer(60, function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('SyncDevices alarm');
      _updateSyncDevices();    // this is async
   });
}

async function _updateSyncDevices()
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('SyncDevices', timings.SYNC_DEVICES_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
   
      let sharedData = Storage.GetSharedVar('SyncDevices', SyncDevicesInit());
   
      if (sharedData.deviceUid == null)
      {
         try
         {
            sharedData.deviceUid = GetCookie('DeviceUid');
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      
         if (sharedData.deviceUid == null)
            sharedData.deviceUid = crypto.randomUUID();
         assert(sharedData.deviceUid != null);
      }
   
      try
      {
         // we provide the device UID so that if the Chrome extension is reinstalled we can get it back
         SetCookie('DeviceUid', sharedData.deviceUid, SecondsPerWeek * 4);
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   
      Storage.SetSharedVar('SyncDevices', sharedData);
   
      let params = {
         'Fields': 'SyncDeviceID,UserID,OwnerUserID,OwnerDisplayName,DeviceName,DeviceUid,LastOnline,IsActive,IsEnabled,Responsibilities,OrderNumber'
      };
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/SyncDevices.json')
         : Form_RootUri + '/v2/SyncDevices';
      
      ajax.get(url, params, function(resp, httpCode)
      {
         let result = null;
         
         if (resp && httpCode == 200)
         {
            resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
            
            let sharedData = Storage.GetSharedVar('SyncDevices', SyncDevicesInit());
            
            // look it up and recalculate in case it was removed or some of the settings were changed
            
            // if an extension hasn't pinged recently assume it's offline
            const cutoff = DateAndTime_Now(0).Subtract(SecondsPerMinute * 15);
            const userID = sessionUserID();
            const ownerUserID = sessionAssistantUserID() ? sessionAssistantUserID() : userID;
            const isAssistant = userID != ownerUserID;
            
            sharedData.syncDevice = {
               // this is a subset, only the items we need to access when the device is not yet set up
               SyncDeviceID: null,
               IsActive: false,
               IsEnabled: false
            };
            // isActive is true if this is not an assistant and it is the first owned device, otherwise if this
            // is an assistant all enabled devices are active
            let deviceName = Browser.GetOS();
            let isActive = null;
            let responsibilities = SyncDeviceResponsibilities.slice();  // start with all the responsibilities, make a copy so we don't change the original

            if (getBrandID() == BrandID_LocalFile)
            {
               resp.data = [
                  // fake the device...
                  {
                     SyncDeviceID: -1,
                     DeviceUid: sharedData.deviceUid,
                     DeviceName: deviceName,
                     UserID: userID,
                     OwnerUserID: userID,
                     IsActive: true,
                     IsEnabled: true,
                     LastOnline: DateAndTime_Now().toString(),
                     Responsibilities: SyncDeviceResponsibilities.slice()
                  }
               ];
            }
            
            for (const syncDevice of Object.values(resp.data))
            {
               if (syncDevice.DeviceUid == sharedData.deviceUid && syncDevice.OwnerUserID == ownerUserID)
                  deviceName = syncDevice.DeviceName; // the device already has a name, default to the same between accounts
               
               if (syncDevice.UserID != userID || syncDevice.OwnerUserID != ownerUserID)
                  continue;   // this device is for a different account to use
               
               let isOnline = null;
               if (syncDevice.DeviceUid == sharedData.deviceUid)
               {
                  sharedData.syncDevice = syncDevice;
                  isOnline = true;
               }
               else
                  isOnline = syncDevice.IsActive && cutoff.Compare(DateAndTime_FromString(syncDevice.LastOnline)) >= 0;
               
               if (!isOnline || !syncDevice.IsEnabled)
                  continue;
               
               if (syncDevice.UserID == syncDevice.OwnerUserID)
               {
                  // this is an owned (non-VA device)
                  assert(isAssistant == false);
                  // the first enabled and online owned device is the active one so if  it is the host
                  // device then the host device is active, otherwise the host is not active
                  if (isActive === null)
                     isActive = syncDevice.DeviceUid == sharedData.deviceUid;
               }
               else if (syncDevice.DeviceUid == sharedData.deviceUid)
               {
                  // this is the host device and it is a VA device
                  assert(isAssistant == true);
                  assert(isActive === null);
                  isActive = true;
                  // limit to the allowed actions for this device
                  Utilities_TrimArray(responsibilities, syncDevice.Responsibilities);
               }
               else
               {
                  // this is a VA device and it is not the host device, so if we have not yet seen the
                  // host device then this device reduces the workload from the host device
                  if (isActive === null)
                  {
                     Utilities_RemoveFromArray(responsibilities, syncDevice.Responsibilities);
                  }
               }
            }
            
            // if the host device is disabled this won't have been set
            if (isActive === null)
            {
               assert(sharedData.syncDevice.IsEnabled == false);
               isActive = false;
            }
            
            let hasActiveChanged = sharedData.syncDevice.IsActive != isActive;
            sharedData.syncDevice.IsActive = isActive;
            // use the possibly reduced responsibilities for the host device
            sharedData.syncDevice.Responsibilities = responsibilities;

//                Log_SetMetaLogging('SyncDevices', Json_ToString(sharedData.syncDevice, null, 3))
            
            Storage.SetSharedVar('SyncDevices', sharedData);
            
            if (hasActiveChanged)
            {
               Log_WriteInfo('For user ' + userID + ' this device "' + deviceName + '" (' + sharedData.deviceUid + ') is now ' + (isActive ? 'active' : 'inactive'));
               SyncStatistics_OnDeviceActiveChanged(isActive);
            }
            else
               Log_WriteInfo('For user ' + userID + ' this device "' + deviceName + '" (' + sharedData.deviceUid + ') is still ' + (isActive ? 'active' : 'inactive'));
            
            if (sharedData.syncDevice.SyncDeviceID == null)
            {  // this device is not listed on the server, so let's add it
               let params = {
                  'DeviceName': deviceName,
                  'DeviceUid': sharedData.deviceUid
               };
               
               ajax.post(url, params, function(resp, httpCode)
               {
                  if (resp && httpCode == 200)
                  {
                     resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
                     
                     let sharedData = Storage.GetSharedVar('SyncDevices', SyncDevicesInit());
                     
                     sharedData.syncDevice = resp.data;
                     
                     Storage.SetSharedVar('SyncDevices', sharedData);
                     
                     OutstandingProcessing_Clear('SyncDevices'); // reload to set up device ASAP
                     
                     resolve(true);
                  }
                  else
                  {
                     Log_WriteError('Error creating SyncDevice: ' + httpCode);
                     resolve(false);
                  }
               });
            }
            else
               result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get SyncDevices: ' + httpCode);
            result = false;
         }
         else
         {
            Log_WriteError('Error getting SyncDevices: ' + httpCode);
            result = false;
         }
         
         OutstandingProcessing_End('SyncDevices');
         if (result != null)
            resolve(result);
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function getSyncDevice()
{
   let sharedData = Storage.GetSharedVar('SyncDevices', SyncDevicesInit());
   
   return sharedData.syncDevice;
}

function SyncDevices_OnUserChanged()
{
   let sharedData = Storage.GetSharedVar('SyncDevices', SyncDevicesInit());
   
   let deviceUid = sharedData.deviceUid;
   sharedData = SyncDevicesInit();  // clear it out for the new user
   // the deviceUid does not change!
   sharedData.deviceUid = deviceUid;
   
   Storage.SetSharedVar('SyncDevices', sharedData);
   
   // initiate fetching the new data
   _updateSyncDevices();    // this is async
}

