function SessionInit()
{
   return {
      lastBrandingTried: 0,
      lastLoginCheck: 0,
      lastLoginTried: 0,
      lastLoginOffered: 0,
      lastLoginRefused: 0,
      lastLoginType: 'logged_out',   // only logged_in, logged_out, assistant, server_unavailable
      
      userID: null,
      assistantUserID: null,
      displayName: null,
      languageCode: null,
      availableFeatures: [],
      canGetFeatures: []
   };
}

// we use this to initialize the languages until we can get them from the logged in user account on the server, so
// that we can show messages to the user in their language while they're not yet logged in
// IMPROVE user language accuracy: Facebook displays the account language in one <html> attribute | <html lang="en">
// just need to getElementByTagName("html") with one content script
Environment.ClientLanguages(function(languages)
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   if (sharedData.languageCode == null)
   {
      sharedData.languageCode = Strings_GetBestLanguageCode(languages);
      Storage.SetSharedVar('Session', sharedData);
   }
});

function getSessionLanguage()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   if (sharedData.languageCode == null)
   {
      Log_WriteWarning('Language not set yet, using en-US in the mean time.');
      return 'en-US';
   }
   return sharedData.languageCode;
}

function isSocialAttacheLoggedIn()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   return (sharedData.lastLoginType == 'logged_in' || sharedData.lastLoginType == 'assistant') &&
      Form_RootUri != null;  // wait until branding has initialized
}

function isSocialAttacheLoggedInAsAssistant()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   return sharedData.lastLoginType == 'assistant' &&
      Form_RootUri != null;  // wait until branding has initialized
}

async function checkSocialAttacheLogin(canShowPrompt)
{
   return new Promise((resolve, reject) =>
   {
      let sharedData = Storage.GetSharedVar('Session', SessionInit());
      
      let result = {
         type: sharedData.lastLoginType,
         extensionName: Environment.ApplicationName,
         brandName: Environment.ApplicationName
      };
      
      if (Migration.IsMigrating)
      {
         Log_WriteInfo('Migration in process, simulating Social Attache logged out.');
         result.type = 'logged_out';
         resolve(result);
         return;
      }
      
      // we must have a brand before we can log in
      let brandingResult = checkBrand();
      if (brandingResult == CheckBrand_BrandNotSelected)
      {
         Log_WriteInfo('Brand has not been selected');
         let now = Date.now();
         if (canShowPrompt && now - sharedData.lastBrandingTried >= timings.BRAND_SELECTION_TRIED_REOFFER * 1000)
            result.type = 'offer_brand';
         else
            result.type = 'logged_out';
//Log_WriteInfo('Sending login response 1 from background: ' + result.type);
         resolve(result);
         return;
      }
      if (brandingResult == CheckBrand_NoBrands)
      {
         Log_WriteInfo('The brands have not been loaded, simulating Social Attache logged out.');
         result.type = 'logged_out';
//Log_WriteInfo('Sending login response 2 from background: ' + result.type);
         Storage.SetSharedVar('Session', sharedData);
         resolve(result);
         return;
      }
      assert(brandingResult == CheckBrand_BrandReady);
      sharedData.lastBrandingTried = 0;
      result.brandName = getBrand()['Name'];
      
      if (!navigator.onLine)
      {
         Log_WriteInfo('The browser appears to be offline, simulating Social Attache logged out.');
         result.type = 'logged_out';
//Log_WriteInfo('Sending login response 3 from background: ' + result.type);
         Storage.SetSharedVar('Session', sharedData);
         resolve(result);
         return;
      }
      
      let now = Date.now();
      let ajaxTimeout = timings.SHORT_AJAX_REQUEST * 1000;
      
      // we don't want to make this server request every time, so we cache it, and while logging in we'll check every time
      if ((sharedData.lastLoginType == 'logged_in' || sharedData.lastLoginType == 'assistant' ||
            now - sharedData.lastLoginTried >= timings.ACCOUNT_LOGIN_TRIED_REOFFER * 1000) &&
         now - sharedData.lastLoginCheck < timings.ACCOUNT_LOGIN_CHECK * 1000)
      {
         
         // don't offer login until we've checked login state with server, as could be logged in or server unavailable
         if (canShowPrompt && sharedData.lastLoginCheck && result.type == 'logged_out' &&
            // don't offer login if it's been offered in the past while (could be the prompt up still showing)
            now - sharedData.lastLoginOffered >= timings.ACCOUNT_LOGIN_OFFERED_REOFFER * 1000 &&
            // don't offer login if he's refused it in the past while
            now - sharedData.lastLoginRefused >= timings.ACCOUNT_LOGIN_REFUSED_REOFFER * 1000 &&
            // or if we could be still in the process of waiting for a response (double it to be sure)
            now - (sharedData.lastLoginCheck + (timings.ACCOUNT_LOGIN_CHECK / 5 * 1000)) > ajaxTimeout * 2)
         {
            sharedData.lastLoginOffered = now;
            result.type = 'offer_login';
         }

//Log_WriteInfo('Sending login response 4 from background: ' + result.type);
         Storage.SetSharedVar('Session', sharedData);
         resolve(result);
         return;
      }
      // don't recheck right away but if there's an error don't wait the full time to retry
      Log_WriteInfo('*** Checking login ***');
      sharedData.lastLoginCheck = now - (timings.ACCOUNT_LOGIN_CHECK / 5 * 1000);
      Storage.SetSharedVar('Session', sharedData);
      
      try
      {
         // DRL FIXIT? I'd rather we don't use a cookie and would prefer an HTTP header.
         // we set a cookie so that we can check on the server side to see if the extension has been installed
         // we expect that the name used here exactly matches the brand venture name
         SetCookie(
            Utilities_ReplaceInString(Environment.ApplicationName + ' extension', ' ', '_'),
            Environment.ApplicationVersion);
      }
      catch (e)
      {
         Log_WriteException(e);
      }
      
      Log_WriteInfo('Checking user login');
      
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/Session.json')
         : Form_RootUri + '/v2/Users/me';
      
      ajax.get(url, {}, function(resp, httpCode)
      {
         sharedData = Storage.GetSharedVar('Session', SessionInit());
         
         Log_WriteInfo('*** Login Response ***');
         
         if (resp == null || httpCode == 0)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get session: ' + httpCode);
            sharedData.lastLoginType = result.type = 'server_unavailable';
//Log_WriteInfo('Sending login response 5 from background: ' + result.type);
//                Log_SetMetaLogging('Session', 'Login: ' + sharedData.lastLoginType);
            Storage.SetSharedVar('Session', sharedData);
            resolve(result);
            return;
         }
         
         let temp = Json_FromString(resp);
         if (temp == null)
         {
            Log_WriteError('Error converting user info from server: ' + resp);
            sharedData.lastLoginType = result.type = 'server_unavailable';
//Log_WriteInfo('Sending login response 6 from background: ' + result.type);
//                Log_SetMetaLogging('Session', 'Login: ' + sharedData.lastLoginType);
            Storage.SetSharedVar('Session', sharedData);
            resolve(result);
            return;
         }
         resp = temp;
         
         let userChanged = false;
         sharedData.lastLoginCheck = now;
         sharedData.languageCode = Strings_GetBestLanguageCode(resp.data.Languages); // always provided
         sharedData.availableFeatures = [];
         sharedData.canGetFeatures = [];
         
         if (resp.result_code == 200)
         {
            sharedData.lastLoginType = result.type = resp.data.AssistantUserID ? 'assistant' : 'logged_in';
            sharedData.lastLoginTried = 0;
            sharedData.availableFeatures = resp.data.AvailableFeatures;
            Utilities_RemoveFromArray(sharedData.availableFeatures, resp.data.DisabledFeatures);
            sharedData.canGetFeatures = resp.data.CanGetFeatures;
            
            Log_SetFullLogging(Utilities_ArrayContains(resp.data.LoggingEnabled, 'chro'));
            
            // DRL FIXIT! For some reason we're not getting all the cookies via the Chrome API so
            // we hack a workaround here to set some cookies that we need in the extension.
            SetCookie('LanguageCodes', sharedData.languageCode); // DRL FIXIT? I believe we can remove this and it's use in Strings.js now.
            SetCookie('AvailableFeatures', sharedData.availableFeatures.join(','));
            SetCookie('CanGetFeatures', sharedData.canGetFeatures.join(','));
            
            if (sharedData.userID != resp.data.UserID)
               userChanged = true;
            sharedData.userID = resp.data.UserID;
            sharedData.assistantUserID = resp.data.AssistantUserID;
            sharedData.displayName = resp.data.DisplayName;
            Log_WriteInfo('Logged in as user ' + resp.data.UserID + ' assistant ' + resp.data.AssistantUserID);
//                Log_SetMetaLogging('Session', 'User: ' + resp.data.UserID + ' Assistant: ' + resp.data.AssistantUserID);
         }
         else if (resp.result_code == 401)
         {
            if (sharedData.userID != null)
               userChanged = true;
            sharedData.userID = null;
            sharedData.assistantUserID = null;
            sharedData.displayName = null;
            sharedData.lastLoginType = result.type = 'logged_out';
//                Log_SetMetaLogging('Session', 'Login: ' + sharedData.lastLoginType);
            
            // don't offer login if he's refused it in the past while, or has tried recently
            // don't offer login if it's been offered in the past while (could be the prompt up still showing)
            if (now - sharedData.lastLoginOffered >= timings.ACCOUNT_LOGIN_OFFERED_REOFFER * 1000 &&
               now - sharedData.lastLoginTried >= timings.ACCOUNT_LOGIN_TRIED_REOFFER * 1000 &&
               now - sharedData.lastLoginRefused >= timings.ACCOUNT_LOGIN_REFUSED_REOFFER * 1000)
            {
               sharedData.lastLoginOffered = now;
               result.type = 'offer_login';
            }
         }
         else
         {
            Log_WriteError('Got unexpected response from server for login check: ' + Json_ToString(resp));
//                Log_SetMetaLogging('Session', 'Login: unexpected result');
         }
         
         Storage.SetSharedVar('Session', sharedData);
         
         if (userChanged)
         {
            OutstandingProcessing_OnUserChanged();
            Tags_OnUserChanged();
            Contacts_OnUserChanged();
            Filters_OnUserChanged();
            Groups_OnUserChanged();
            Help_OnUserChanged();
            SyncDevices_OnUserChanged();
            SyncSettings_OnUserChanged();
            SyncStatistics_OnUserChanged();
            Syncs_OnUserChanged();
//               TabManager_OnUserChanged();   // refresh tabs so they are updated to use the new user?
         }
         
/* Only available in Manifest V3
         let isPinned = await Environment.IsPinned();
         if (!isPinned && now - lastPinTried >= timings.EXTENSION_PIN_TRIED_REOFFER) {
             lastPinTried = now;
             pushTabNextAction(tabID, {
                 action: 'displayMessage',
                 message: Str('The main menu of the <0> Chrome extension is available from its icon in the toolbar. In order to add it to the toolbar click the "Extensions" toolbar button and click the <0> pin.', Environment.ApplicationName),
                 messageType: 'warning',
                 displayType: null,
                 timeoutSeconds: null,
                 resp: null
             });
         }
*/

//Log_WriteInfo('Sending login response 7 from background: ' + result.type);
         resolve(result);
      }, true, ajaxTimeout);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Session_OnUserChanged()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   // when the brand changes we have to recheck login so may as well reset everything as if we just started up
   sharedData.userID = null;
   sharedData.assistantUserID = null;
   sharedData.displayName = null;
   sharedData.lastLoginCheck = 0;
   sharedData.lastLoginTried = 0;
   sharedData.lastLoginRefused = 0;
   sharedData.lastLoginType = 'logged_out';
//    Log_SetMetaLogging('Session', 'Login: ' + sharedData.lastLoginType);
   
   Storage.SetSharedVar('Session', sharedData);
}

function userTryingBranding()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   sharedData.lastBrandingTried = Date.now();
   
   Storage.SetSharedVar('Session', sharedData);
}

function userTryingLogin()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   sharedData.lastLoginTried = Date.now();
   
   Storage.SetSharedVar('Session', sharedData);
}

function userRefusedLogin()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   sharedData.lastLoginRefused = Date.now();
   
   Storage.SetSharedVar('Session', sharedData);
}

function sessionUserID()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   return sharedData.userID;
}

function sessionAssistantUserID()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   return sharedData.assistantUserID;
}

function userDisplayName()
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   return sharedData.displayName;
}

function userHasFeature(feature)
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   return getBrandID() == BrandID_LocalFile || Utilities_ArrayContains(sharedData.availableFeatures, feature);
}

function userCanGetFeature(feature)
{
   let sharedData = Storage.GetSharedVar('Session', SessionInit());
   
   return Utilities_ArrayContains(sharedData.canGetFeatures, feature);
}
