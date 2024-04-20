Log_SetGroupName('ChromeExtension');
Log_SetPrefix('background');

Environment.AddDisplayMainMenuListener(function(tab)
{
   let isLoggedIn = isSocialAttacheLoggedIn() ? 'true' : 'false';
   if (Browser.IsExtensionV3())
      Tabs.ExecuteScriptInTab(tab.id, isLoggedIn);    // DRL FIXIT? MANIFEST3 This is a bit of a hack that would be good to fix.
   else
      Tabs.ExecuteScriptInTab(tab.id, "displayMainMenu(" + isLoggedIn + ");");
});

Messaging.AddBackgroundMessageListener(function(request, sender, sendResponse)
{
   if (request.type == 'logging')
   {
      Log_Write(request.severity, request.msg);
      sendResponse();
      return true; // don't log the logging
   }
   else if (request.type == 'getTabID')
   {
      sendResponse(sender.tab.id);
      return true; // don't count this as activity
   }

//    Log_WriteInfo('Tab ' + getTabNameNoCheck(sender.tab.id) + ' sent request: ' + request.type);
   
   if (!Storage.IsAllStorageReady())
   {
      Log_WriteWarning('Storage hasn\'t finished loading yet');
      sendResponse(null);
      return true; // don't log the logging
   }
   
   // NOTE: skip cases where the tab isn't scraping yet in case it gets stuck after the setup
   if (request.type != 'initTab' && request.type != 'checkSocialAttacheLogin')
      updateTabActivity(sender.tab.id);
   
   if (request.type == 'getAction')
   {
      // if the tab has a queued action we return it first
      let nextAction = popTabNextAction(sender.tab.id);
      if (nextAction != null)
      {
         sendResponse(nextAction);
         return true;
      }
      if (getTabName(sender.tab.id) == null)
      {
         // augmentation script has no other code below so just return no action
         sendResponse({action: null});
         return true;
      }
   }
   
   if (request.type == 'ping')
   {
      // updateTabActivity() already called above
      sendResponse();
   }
   else if (request.type == 'setThrottled')
   {
      setTabThrottled(sender.tab.id, request.isThrottled, request.category);
      sendResponse();
   }
   else if (request.type == 'getBrandInfos')
   {
      getBrandNames()
         .then(resp => sendResponse({brandNames: resp, brandID: getBrandID()}))
         .catch(error =>
         {
            Log_WriteError("Error handling getBrandNames(): " + error);
            sendResponse(null);
         });
   }
   else if (request.type == 'getBrandID')
   {
      sendResponse(getBrandID());
   }
   else if (request.type == 'setBrandID')
   {
      setBrandID(request.brandID);
      sendResponse();
   }
   else if (request.type == 'setScrapingFocusDisabledFor')
   {
      sendResponse(setScrapingFocusDisabledFor(request.disabledFor));
   }
   else if (request.type == 'getAutomationPaused')
   {
      sendResponse(isAutomationPaused());
   }
   else if (request.type == 'setAutomationPaused')
   {
      sendResponse(setAutomationPaused(request.isAutomationPaused));
   }
   else if (request.type == 'isBrowserTabIdle')
   {
      Tabs.IsTabIdle(sender.tab.id, function(isIdle)
      {
         sendResponse(isIdle);
      });
   }
   else if (request.type == 'initTab')
   {
      initTab(sender.tab.id, request.syncDataName)
         .then(resp => sendResponse(resp))
         .catch(error =>
         {
            Log_WriteError("Error handling initTab(): " + error);
            sendResponse(null);
         });
   }
   else if (request.type == 'showSyncWindowAndTab')
   {
      sendResponse(showSyncWindowAndTab(sender.tab.id, request.focusedSecondsOrBool));
   }
   else if (request.type == 'showTab')
   {
      Tabs.SetActiveTab(sender.tab.id, function(tabID)
      {
         if (tabID == null)
            Log_WriteError('Error giving tab ' + sender.tab.id + ' the focus');
         sendResponse(tabID != null);
      });
   }
   else if (request.type == 'checkSocialAttacheLogin')
   {
      checkSocialAttacheLogin(request.canShowPrompt)
         .then(resp => sendResponse(resp))
         .catch(error =>
         {
            Log_WriteError("Error handling checkSocialAttacheLogin(): " + error);
            sendResponse(false);
         });
   }
   else if (request.type == 'checkDataSource')
   {
      checkDataSource(request.sourceName)
         .then(resp => sendResponse(resp))
         .catch(error =>
         {
            Log_WriteError("Error handling checkDataSource(): " + error);
            sendResponse(false);
         });
   }
   else if (request.type == 'linkDataSource')
   {
      linkDataSource(request.sourceName)
         .then(resp => sendResponse(resp))
         .catch(error =>
         {
            Log_WriteError("Error handling linkDataSource(): " + error);
            sendResponse(false);
         });
   }
   else if (request.type == 'getAccountId')
   {
      getSyncAccountID(request.dataName)
         .then(resp => sendResponse(resp))
         .catch(error =>
         {
            Log_WriteError("Error handling getAccountId(): " + error);
            sendResponse(null);
         });
   }
   else if (request.type == 'addContactProtocol')
   {
      addContactProtocol(request.protocol);
      sendResponse();
   }
   else if (request.type == 'reloadSearchFilters')
   {
      reloadSearchFilters();
      sendResponse();
   }
   else if (request.type == 'reloadContactInfo')
   {
      reloadContactInfo(request.contactID);
      sendResponse();
   }
   else if (request.type == 'markHelpItemRead')
   {
      markHelpItemRead(request.path);
      sendResponse();
   }
   else if (request.type == 'setServerState')
   {
      setServerState(request.dataName, request.accountID, request.currentCheck, request.syncData, request.messages, request.contact, request.command)
         .then(resp => sendResponse(true))
         .catch(error =>
         {
            Log_WriteError("Error handling setServerState(): " + error);
            sendResponse(false);
         });
   }
   else if (request.type == 'scraperException')
   {
      // DRL FIXIT! There should be some logic here to abort the current action and treat it as if we're
      // throttled so the sync can continue with other actions and not have this one hold things up!
      
      // if the client had an exception we will release sync control (if he had it) in order to
      // allow other syncs to process so this one doesn't hold things up in an endless exception loop
      Log_WriteInfo('Releasing sync control due to ' + request.dataName + ' exception');
      releaseSyncControl(sender.tab.id, request.dataName);
      sendResponse();
   }
   else if (request.type == 'savePost')
   {
      if (Form_RootUri == null)
      {
         sendResponse({
            status: 'success',
            data: {Name: request.post.Name}
         });
         return true;
      }
      
      let replaceValues = {
         'content_Name': {
            'Type': 'string',
            'Value': {'en-US': request.post.Name}
         },
         'content_Body': {
            'Type': request.post.Type,
            'Value': {'en-US': request.post.Body}
         },
         'content_Attachments': {
            'Type': 'resource[]',
            'Value': {'en-US': request.post.Attachments}
         },
         'content_Buttons': {
            'Type': 'button[]',
            'Value': {'en-US': request.post.Buttons}
         }
      };
      
      ajax.post(
         Form_RootUri + '/v2/Posts/Folders/Uploads',
         {
            'ReplaceValues': Json_ToString(replaceValues),
            'Fields': 'Name' // we want these in the response
         },
         function(data, httpCode)
         {
            if (data == null || httpCode == 0)
            {
               sendResponse({
                  status: 'error',
                  message: Str('The server is not available, please try again later.')
               });
               return true;
            }
            data = JSON.parse(data);
            sendResponse(data);
         }
      );
   }
   else if (request.type == 'getBlob')
   {
// DRL I needed this to get file uploads (for posting) working on my dev setup, likely due to expired self-signed certificate.
//      request.url = Utilities_ReplaceInString(request.url, 'https://localhost.com', 'http://localhost.com');
      fetchBlobChunk(request.url, sendResponse);
   }
   else if (request.type == 'getFinalUrl')
   {
      getFinalUrl(request.url)
         .then(response =>
         {
            sendResponse(response);
         })
         .catch(error =>
         {
            Log_WriteError("Error getting final url \"" + request.url + "\": " + error);
            sendResponse(request.url);
         });
   }
   else if (request.type == 'userTryingBranding')
   {
      userTryingBranding();
      sendResponse();
   }
   else if (request.type == 'userTryingLogin')
   {
      userTryingLogin();
      sendResponse();
   }
   else if (request.type == 'userRefusedLogin')
   {
      userRefusedLogin();
      sendResponse();
   }
   else if (request.type == 'linkDataSourceRefused')
   {
      linkDataSourceRefused(request.sourceName);
      sendResponse();
   }
   else if (request.type == 'createTab')
   {
      _massageQueueItems(sender.tab.id, request.queuedActions);
      _processClientRequestParameters(sender, request.params)
         .then(params =>
         {
            Log_WriteInfo('Creating tab with URL: ' + request.url);  // saw null URL sometimes
            createTab(request.tabName, request.method, request.url, params, request.forScraping, false, request.focused, request.queuedActions)
               .then(tabID =>
               {
                  sendResponse(tabID);
               })
               .catch(error =>
               {
                  Log_WriteError("Error opening tab \"" + request.tabName + "\": " + error);
                  sendResponse(null);
               });
         })
         .catch(error =>
         {
            Log_WriteError("Error parsing params for opening tab \"" + request.tabName + "\": " + error);
            sendResponse(null);
         });
   }
   else if (request.type == 'removeTab')
   {
      Log_WriteInfo('Content script requesting to remove tab ' + sender.tab.id)
      Tabs.RemoveTab(sender.tab.id, function()
      {
         sendResponse(null);
      });
   }
   else if (request.type == 'pushAction')
   {
      // the action is the JSON object to be returned by getAction later
      _massageQueueItem(sender.tab.id, request.action);
      sendResponse(pushTabNextAction(request.tabID ? request.tabID : sender.tab.id, request.action));
   }
   else if (request.type == 'GET' || request.type == 'HEAD' || request.type == 'POST')
   {
      // I had issues with CORS when making some requests from the front end content scripts so I instead
      // make them from the background script and send them through our proxy, unless it's for our API.
      let proxyUrl = request.url;
      if (Form_RootUri != null && Url_GetDomain(proxyUrl).toLowerCase() != Url_GetDomain(Form_RootUri).toLowerCase())
         proxyUrl = Form_RootUri + '/v2/Proxy?url=' + encodeURIComponent(proxyUrl);
      
      if (request.type == 'GET')
         ajax.get(proxyUrl, request.params, function(data, httpCode, headers)
         {
            sendResponse({data: data, httpCode: httpCode, headers: headers});
         }, true, request.timeout, request.headers);
      else if (request.type == 'HEAD')
         ajax.head(proxyUrl, request.params, function(data, httpCode, headers)
         {
            sendResponse({data: data, httpCode: httpCode, headers: headers});
         }, true, request.timeout, request.headers);
      else if (request.type == 'POST')
         ajax.post(proxyUrl, request.params, function(data, httpCode, headers)
         {
            sendResponse({data: data, httpCode: httpCode, headers: headers});
         }, true, request.timeout, request.headers);
      else
         assert(0);
   }
   else
   {
      let syncDataName = getTabName(sender.tab.id);
      
      if (request.type == 'getAction' && !isBrandingInitialized())
      {
         sendResponse({action: null});
      }
      else if (syncDataName == FB_DATA_NAME ||
         // These are user generated actions from the augmentation page (not a scraper page so syncDataName will be null).
         request.type == 'setGroupInfo' ||
         request.type == 'setGroupQuestions')
      {
         onMessageFacebook(request, sender, sendResponse);
      }
      else if (syncDataName == IG_DATA_NAME)
      {
         onMessageInstagram(request, sender, sendResponse);
      }
      else if (syncDataName == 'PinterestScrape')
      {
         onMessagePinterest(request, sender, sendResponse);
      }
      else if (syncDataName == 'TikTokScrape')
      {
         onMessageTikTok(request, sender, sendResponse);
      }
      else if (syncDataName == 'TwitterScrape')
      {
         onMessageTwitter(request, sender, sendResponse);
      }
      else
      {
         // since we got a message from a content script we do not recognize, the scenario is likely
         // that somehow the tab didn't get added to the TabManager properly so what we'll do is
         // remove the tab and hopefully it's a scraper tab and will get recreated properly
         Log_WriteError("Unrecognized data name \"" + syncDataName + "\" for tab " + getTabNameNoCheck(sender.tab.id) + ", removing tab!");
         removeTab(sender.tab.id);
         sendResponse();
      }
   }
   return true;    // this tells the caller that we want to use the sendResponse() mechanism later
});

// these methods are a bit of a hack but they avoid a round trip from the content script to request its tab ID
function _massageQueueItem(tabID, item)
{
   if (item && item.hasOwnProperty('originalTabID') && item.originalTabID == BACKGROUND_PROVIDED_TAB_ID)
      item.originalTabID = tabID;
}

function _massageQueueItems(tabID, queueItems)
{
   if (queueItems == null)
      return;
   for (let item of queueItems)
   {
      _massageQueueItem(tabID, item);
   }
}

async function _captureTab(windowID)
{
   return new Promise((resolve, reject) =>
   {
      Tabs.CaptureWindow(windowID, function(data)
      {
         resolve(data);
      });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// DRL FIXIT! I'm not sure that our extension will not be unloaded while we're uploading the log file.
const ChunkSize = 500000;    // 1/2MB (1MB had issues on my dev system)
var fileUploadClientID = null;
var fileUploadResolve = null;
var fileUploadData = null;
var fileUploadParameters = null;

function _uploadFileChunk(resp, httpCode)
{
   if (httpCode == 200)
   {
      if (resp != -1)
      {
         fileUploadParameters.SequenceNumber++;
         fileUploadParameters.SequenceOffset += ChunkSize;
      }
      
      if (fileUploadParameters.SequenceOffset < fileUploadData.length)
      {
         const chunkData = fileUploadData.substring(fileUploadParameters.SequenceOffset,
            fileUploadParameters.SequenceOffset + ChunkSize);
         ajax.post(Form_RootUri + '/v2/TemporaryFiles/' + fileUploadClientID + '?' + ConvertParamsForSending(fileUploadParameters).join('&'),
            chunkData, _uploadFileChunk, true, 600000, {
               'Content-Type': fileUploadParameters.MimeType + ';charset=UTF-8'
               // DRL FIXIT? Include Content-Transfer-Encoding?
            });
         return;
      }
      
      Log_WriteInfo('Uploaded file ' + fileUploadParameters.Filename + ' of ' + fileUploadParameters.FileSize + ' bytes');
      fileUploadResolve(fileUploadClientID);
   }
   else if (resp == null || httpCode == 0)
   {
      // server unavailable, network error, etc.
      Log_WriteWarning('Server is not available to upload file ' + fileUploadParameters.Filename + ' of ' + fileUploadParameters.FileSize + ' bytes');
      fileUploadResolve(null);
   }
   else
   {
      Log_WriteError('Error uploading file' + fileUploadParameters.Filename + ' of ' + fileUploadParameters.FileSize + ' bytes: ' + httpCode);
      fileUploadResolve(null);
   }
   
   fileUploadClientID = null;
   fileUploadResolve = null;
   fileUploadData = null;
   fileUploadParameters = null;
}

async function _uploadTemporaryFile(filename, mimeType, data)
{
   return new Promise((resolve, reject) =>
   {
      // DRL FIXIT! We should be able to do POST but I haven't figured out how to get this going to the server
      // as it comes through as a POST but with no data. This is a workaround...
      
      fileUploadClientID = Utilities_ReplaceInString(File_GetFilename(filename) + ' ' + Utilities_IntRand(1000, 1000000), ' ', '-');
      fileUploadResolve = resolve;
      fileUploadData = data;
      fileUploadParameters = {
         MimeType: mimeType,
         Filename: filename,
         FileSize: fileUploadData.length,
         SequenceNumber: 0,
         SequenceOffset: 0,
      };
      
      _uploadFileChunk(-1, 200);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function _processClientRequestParameters(sender, params)
{
   for (let name in params)
   {
      if (name == 'PageHTML')
      {   // a bit of a hack, but this can be a large file too, so upload it
         params[name] = await _uploadTemporaryFile(name + '.html', 'text/html', params[name]);
      }
      else if (params[name] == '%TAB_CAPTURE%')
      {
         params[name] = await _captureTab(sender.tab.windowId);
         params[name] = await _uploadTemporaryFile(name + '.png', 'image/png', params[name]);
      }
      else if (params[name] == '%LOG_FILE%')
      {
         params[name] = Log_GetLogFile();
         params[name] = await _uploadTemporaryFile(name + '.log', 'text/plain', params[name]);
      }
   }
   return params;
}
