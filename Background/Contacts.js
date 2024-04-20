function ContactsInit()
{
   return {
      lastContactsFetched: {},  // indexed by protocol
      contactInfos: {}          // indexed by protocol, then by address
   };
}

async function reloadContactsHandler(contactID = null)
{
   try
   {
      Log_WriteInfo('reloadContactsHandler()');
      
      let sharedData = Storage.GetSharedVar('Contacts', ContactsInit());
      
      let protocol = null;
      
      for (let proto of Object.keys(sharedData.contactInfos))
      {
         if (protocol == null || sharedData.lastContactsFetched[protocol] > sharedData.lastContactsFetched[proto])
            protocol = proto;
      }
      
      if (protocol || contactID)
         await _updateContactInfos(protocol, contactID);
   }
   catch (e)
   {
      Log_WriteException(e);
   }
}

if (Browser.IsExtensionBackground())
{
   Timers.AddRepeatingTimer(60, function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('Contacts alarm');
      reloadContactsHandler(null);    // this is async
   });
}

async function reqGetContactInfos(protocol)
{
   let sharedData = Storage.GetSharedVar('Contacts', ContactsInit());
   
   if (!sharedData.contactInfos.hasOwnProperty(protocol))
   {
      // must be handled by the background script
      await Messaging.SendMessageToBackground({type: 'addContactProtocol', protocol: protocol});
      return [];
   }
   
   return sharedData.contactInfos[protocol];
}

async function reqReloadContactInfo(contactID)
{
   // must be handled by the background script
   // allow a little time (5s) for server to save changes
   setTimeout(async function()
   {
      try
      {
         await Messaging.SendMessageToBackground({type: 'reloadContactInfo', contactID: contactID});
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   }, 5 * 1000);
}

function reloadContactInfo(contactID)
{
   reloadContactsHandler(contactID);    // this is async
}

function addContactProtocol(protocol)
{
   let sharedData = Storage.GetSharedVar('Contacts', ContactsInit());
   
   if (!sharedData.contactInfos.hasOwnProperty(protocol))
   {
      sharedData.contactInfos[protocol] = {};
      sharedData.lastContactsFetched[protocol] = 0;
      Storage.SetSharedVar('Contacts', sharedData);
      
      // initiate fetching the new protocol data
      reloadContactsHandler(null);    // this is async
   }
}

async function _updateContactInfos(protocol, contactID)
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('Contacts', contactID ? 0 : timings.CONTACTS_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
      
      // DRL FIXIT! We should improve this to only ask the server for changes since the last check because
      // there could be a lot of contacts!
      
      var params = {
         'Protocol': protocol,
         'Fields': protocol == 'ig'
            ? 'ContactID,DisplayName,TaskStatus,Updated,Note'  // IG requires display name below
            : 'ContactID,TaskStatus,Updated,Note'
      };
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/Contacts.json')
         : Form_RootUri + '/v2/Contacts';
      
      ajax.get(url, params, function(resp, httpCode)
      {
         let sharedData = Storage.GetSharedVar('Contacts', ContactsInit());
         
         if (resp && httpCode == 200)
         {
            Log_WriteInfo("Contacts 1");
            sharedData.contactInfos[protocol] = {};
            
            let index = {}; // used to find the contacts by contact ID below, values are an array since a
                            // contact may have several addresses and could appear multiple times in contactInfos
            resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
            for (let addr in resp.data)
            {
               assert(addr.indexOf(':') != -1);   // must have protocol
               if (addr.indexOf('@') == -1)
                  continue;   // skip invalid emails
               
               resp.data[addr].TagIDs = [];   // in case it has no tags below we'll initialize this
               if (addr.includes('@fbrmid.socialattache.com'))
                  resp.data[addr].Type = 'room';
               else if (addr.includes('@fbpage.socialattache.com'))
                  resp.data[addr].Type = 'page';
               else
                  resp.data[addr].Type = 'contact';
               
               let normalized = normalizeContactAddress(addr);
               // a room or page may have a bad address of the contact type - don't overwrite with it
               if (resp.data[addr].Type != 'contact' ||
                  !sharedData.contactInfos[protocol].hasOwnProperty(normalized))
                  sharedData.contactInfos[protocol][normalized] = resp.data[addr];
               
               if (index.hasOwnProperty(resp.data[addr].ContactID))
                  index[resp.data[addr].ContactID].push(normalized);
               else
                  index[resp.data[addr].ContactID] = [normalized];
            }
            
            var params = {};
            const url = getBrandID() == BrandID_LocalFile
               ? Environment.GetAssetUrl('Data/ContactsTagged.json')
               : Form_RootUri + '/v2/Contacts/Tagged';
            Log_WriteInfo("Contacts 2");
            
            ajax.get(url, params, function(resp, httpCode)
            {
               let result = false;
               if (resp && httpCode == 200)
               {
                  Log_WriteInfo("Contacts 3");
                  resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
                  // add the TagIDs to the info we've already accumulated
                  for (let contactID in resp.data)
                  {
                     if (index.hasOwnProperty(contactID))
                     {
                        for (let normalized of index[contactID])
                        {
                           if (sharedData.contactInfos[protocol][normalized] == undefined)
                              Log_WriteError("Contact " + contactID + " was not found by address " + normalized + " in contactInfos!");
                           else
                           {
                              sharedData.contactInfos[protocol][normalized].TagIDs = resp.data[contactID];
                           }
                        }
                     }
                  }
   
                  if (protocol == 'ig')
                  {
                     // in the IG messages page we don't have the IDs for the conversations so we must provide
                     // the names in the list so they can be used for the lookup
                     for (let addr in sharedData.contactInfos[protocol])
                     {
                        let name = normalizeContactNameForIndex(sharedData.contactInfos[protocol][addr].DisplayName);
                        // DRL FIXIT! here could be duplicate names!
                        sharedData.contactInfos[protocol][name] = sharedData.contactInfos[protocol][addr];
                     }
                  }

                  sharedData.lastContactsFetched[protocol] = Date.now();
                  Storage.SetSharedVar('Contacts', sharedData);
                  Log_WriteInfo("Contacts 4");
                  
                  result = true;
               }
               else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
               {
                  // server unavailable, network error, etc.
                  Log_WriteWarning('Server is not available to get contacts tagged: ' + httpCode);
               }
               else
               {
                  Log_WriteError('Error getting contacts tagged: ' + httpCode);
               }
               
               OutstandingProcessing_End('Contacts');
               resolve(result);
            }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
         }
         else
         {
            if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
            {
               // server unavailable, network error, etc.
               Log_WriteWarning('Server is not available to get contact infos: ' + httpCode);
            }
            else
            {
               Log_WriteError('Error getting contacts info: ' + httpCode);
            }
            
            OutstandingProcessing_End('Contacts');
            resolve(false);
         }
      }, true, timings.LONG_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Contacts_OnUserChanged()
{
   // force refresh from new account
   Storage.SetSharedVar('Contacts', ContactsInit());
   
   // we can't start fetching data here as we don't know what protocols will be needed
}

