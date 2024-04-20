function ContactFetchInit()
{
   return {};
}

// DRL FIXIT! This code attempts to load the profile page 5 times, but since this feature is
// low priority it could be pre-empted by some other activity (such as sending a message) so
// in fact our attempts could run out because of these interruptions and NOT because of any
// issue with parsing the profile! This is why we try 5 times here.

function _initiateContactFetchStep(sender, dataName, accountID, syncCommandID, contactID, currentUrl, sendResponse)
{
   if (contactID.indexOf('@fbun.socialattache.com') != -1)
   {
      getFacebookAddressFromId(getEmailPrefix(contactID), FacebookAddressFormatNumeric)
         .then(newContactID =>
         {
            if (newContactID)
            {
               _initiateContactFetchStep(sender, dataName, accountID, syncCommandID, newContactID, currentUrl, sendResponse);
               return;
            }
            
            sendCommandError(dataName, accountID, syncCommandID, Str('Unable to convert username "<0>" to an ID.',
               getEmailPrefix(contactID)));
            
            // try next action
            sendResponse({action: 'wait', seconds: 0});
         });
      return;
   }
   
   let handle = Url_GetEmailPrefix(contactID);
   let baseUrl = getInitialScraperUrl(dataName);
   let contactUrl = Utilities_ReplaceInString(currentUrl, '{base_url}', baseUrl);
   contactUrl = Utilities_ReplaceInString(contactUrl, '{contact_id}', handle);
   
   // For some sites (like Facebook) the eventual URL could be different than what we requested, for
   // example we start off with a numeric ID and the final URL points to a username, so we have to
   // compare with the final URL.
   getFinalUrl(contactUrl)
      .then(finalContactUrl =>
      {
         let sharedData = Storage.GetSharedVar('ContactFetch', ContactFetchInit());
         
         let params = [];
         if (dataName == 'FacebookScrape')
         {
            params.push('id');  // a Facebook profile without a username set will have an "id" parameter we must match
            params.push('sk');  // a Facebook profile has multiple pages and this holds the current page
         }
         
         if (fuzzyUrlsMatch(sender.url, finalContactUrl, params))
         {
            sharedData[dataName].lastContactFetchAttempted = null;
            Log_WriteInfo('getContact ' + handle + ' (' + syncCommandID + ') from ' + sender.url);
            ActionCheck_SendResponse(dataName, 'FetchContact', sender.url, sendResponse, {
               action: 'getContact', accountID: accountID,
               syncCommandID: syncCommandID, contactID: contactID
            }, contactID);
         }
            // if the contact was not found we would get stuck in an endless loop so here we check
         // and if we've already attempted to navigate to the contact and failed skip it
         else if (sharedData[dataName].lastContactFetchAttempted == syncCommandID &&
            sharedData[dataName].attemptCount >= 5)
         {
            Log_WriteError('Unable to fetch contact ' + contactID + ' from ' + dataName +
               ' original URL ' + contactUrl + ' final URL ' + finalContactUrl);
            
            // clear out this action
            sharedData[dataName].lastContactFetchAttempted = null;
            sharedData[dataName].attemptCount = 0;
            sharedData[dataName].remainingUrls = [];
            sharedData[dataName].vCard = null;
            sharedData[dataName].syncCommandID = null;
            sharedData[dataName].contactID = null;
            
            sendCommandError(dataName, accountID, syncCommandID, Str('Unable to find contact "<0>" on <1>. It is likely that this person no longer has an account or they have blocked you.',
               handle, Utilities_ReplaceInString(dataName, 'Scrape', '')));
            
            // try next action
            sendResponse({action: 'wait', seconds: 0});
         }
         else
         {
            if (sharedData[dataName].lastContactFetchAttempted == syncCommandID)
            {
               // if we were not interrupted this is another attempt
               if (ActionCheck_GetCategory(dataName) == 'ContactFetch')
                  sharedData[dataName].attemptCount++;
            }
            else
            {
               sharedData[dataName].attemptCount = 1;
               sharedData[dataName].lastContactFetchAttempted = syncCommandID;
            }
            Log_WriteInfo('Switching to profile URL: ' + contactUrl);
            ActionCheck_SetUrl(dataName, 'ContactFetch', 'getContact', contactID, sender, contactUrl, sendResponse);
         }
         
         Storage.SetSharedVar('ContactFetch', sharedData);
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// url can be an array if there are multiple pages to be scraped for a single contact
// each URL may have "{base_url}" in it and must have "{contact_id}" in it!
function initiateContactFetch(sender, dataName, commands, accountID, url, sendResponse)
{
   let sharedData = Storage.GetSharedVar('ContactFetch', ContactFetchInit());
   
   if (!sharedData.hasOwnProperty(dataName))
   {
      sharedData[dataName] = {
         contactFetchThrottledUntil: 0,
         syncCommandID: null,
         contactID: null,
         vCard: null,
         remainingUrls: [],  // this includes the URL we are currently processing
         lastContactFetchAttempted: null,
         attemptCount: 0
      }
   }
   
   if (!UserHasFeature(UserFeaturesSyncContacts) ||
      Date.now() < sharedData[dataName].contactFetchThrottledUntil)
   {
      Storage.SetSharedVar('ContactFetch', sharedData);
      return false;
   }
   
   let syncDevice = getSyncDevice();
   if (!syncDevice.IsActive)
      return false;

   let syncCommandID = null;
   let iNext = null;
   for (let i in commands)
   {
      if (commands[i].SyncCommandID == sharedData[dataName].syncCommandID)
      {
         syncCommandID = commands[i].SyncCommandID;
         break;
      }
      if (iNext === null && commands[i].SyncCommand == 'FetchContact')
         iNext = i;
   }
   
   let contactID = null;
   let currentUrl = null;
   if (syncCommandID)
   {
      // continue where we left off
      assert(syncCommandID == sharedData[dataName].syncCommandID);
      contactID = sharedData[dataName].contactID;
      currentUrl = sharedData[dataName].remainingUrls[0];
   }
   else if (iNext !== null)
   {
      // start fresh in case the last attempt was not cleaned up (removed from server, handled by other extension, etc.)
      sharedData[dataName].lastContactFetchAttempted = null;
      sharedData[dataName].attemptCount = 0;
      sharedData[dataName].remainingUrls = [];
      sharedData[dataName].vCard = null;
      sharedData[dataName].syncCommandID = null;
      sharedData[dataName].contactID = null;
      // we must make a copy of the array otherwise we'll be changing the original with shift() later
      sharedData[dataName].remainingUrls = is_array(url) ? url.slice() : [url];
      sharedData[dataName].vCard = null;
      
      syncCommandID = sharedData[dataName].syncCommandID = commands[iNext].SyncCommandID;
      contactID = sharedData[dataName].contactID = commands[iNext].ExternalContactID;
      currentUrl = sharedData[dataName].remainingUrls[0];
   }
   
   Storage.SetSharedVar('ContactFetch', sharedData);
   
   if (syncCommandID == null)
      return false;
   
   _initiateContactFetchStep(sender, dataName, accountID, syncCommandID, contactID, currentUrl, sendResponse);
   
   return true;
}

function contactFetchThrottled(dataName)
{
   let sharedData = Storage.GetSharedVar('ContactFetch', ContactFetchInit());
   
   sharedData[dataName].contactFetchThrottledUntil = Date.now() + timings.THROTTLED_DELAY * 1000;
   
   Storage.SetSharedVar('ContactFetch', sharedData);
}

function mergeVcards(vCard1, vCard2)
{
   let lines1 = vCard1.split('\n');
   let lines2 = vCard2.split('\n');
   
   // we can only have one REV so remove the first one which should be older
   for (let line of lines1)
   {
      if (line.startsWith('REV:'))
      {
         Utilities_RemoveFromArray(lines1, line);
         break;
      }
   }
   // the KIND and FN are only parsed on the first pass so the ones on the subsequent passes will be empty
   for (let line of lines2)
   {
      if (line.startsWith('KIND:') || line.startsWith('FN:'))
      {
         Utilities_RemoveFromArray(lines2, line);
      }
   }
   
   let lines = lines1.concat(lines2);
   Utilities_RemoveFromArray(lines, ['BEGIN:VCARD', 'END:VCARD']);
   Utilities_ArrayRemoveDuplicates(lines);
   lines = ['BEGIN:VCARD'].concat(lines).concat(['END:VCARD']);
   
   return lines.join('\n');
}

// returns a delay to the sender
function completeContactFetch(sender, request, sendResponse)
{
   let dataName = request.dataName;
   let vCard = request.contact;
   
   ActionCheck_Completed(dataName, sender.tab.id, 'getContact');
   
   setTabThrottled(sender.tab.id, false, request.type);
   
   let sharedData = Storage.GetSharedVar('ContactFetch', ContactFetchInit());
   
   if (request.command.SyncCommandID != sharedData[dataName].syncCommandID)
   {
      Log_WriteError('Expecting to receive contact for command ' + sharedData[dataName].syncCommandID +
         ' but instead got ' + request.command.SyncCommandID + ', ignoring!');
      sendResponse(timings.Commands['FetchContact'].ActionDelay);
      return;
   }
   
   if (sharedData[dataName].vCard)
      vCard = mergeVcards(sharedData[dataName].vCard, vCard);
   
   sharedData[dataName].lastContactFetchAttempted = null;
   sharedData[dataName].attemptCount = 0;
   sharedData[dataName].remainingUrls.shift();
   
   if (!vCard.includes('\nNOTE:SA_ERROR\n') && sharedData[dataName].remainingUrls.length > 0)
   {
      // we have more to get for this contact
      sharedData[dataName].vCard = vCard;
      
      Storage.SetSharedVar('ContactFetch', sharedData);
      
      sendResponse(timings.Commands['FetchContact'].PageDelay);
      return;
   }
   
   // we have completed this contact
   sharedData[dataName].vCard = null;
   sharedData[dataName].syncCommandID = null;
   sharedData[dataName].contactID = null;
   
   // this isn't for throttling, it just puts an appropriate delay between contact fetches
   let waitUntil = Date.now() + timings.Commands['FetchContact'].ActionDelay * 1000;
   if (waitUntil > sharedData[dataName].contactFetchThrottledUntil)
      sharedData[dataName].contactFetchThrottledUntil = waitUntil;
   
   Storage.SetSharedVar('ContactFetch', sharedData);
   
   setServerState(request.dataName, request.accountID, null, null, null, [vCard], request.command)
      .then(resp => sendResponse(timings.Commands['FetchContact'].ActionDelay))
      .catch(e =>
      {
         Log_WriteException(e, request.type);
         sendResponse(timings.Commands['FetchContact'].ActionDelay);
      });
}