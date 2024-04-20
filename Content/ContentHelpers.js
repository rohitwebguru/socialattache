let SkinsUrl = Environment.GetAssetUrl('v2/Skins/');
let ImagesUrl = Environment.GetAssetUrl('Images/');

window.addEventListener('message', function(event)
{
   if (event.data && event.data.action == 'ClosePopUp')
   {
      ClosePopUp();
   }
});

let unloading = false;
window.addEventListener('beforeunload', function(event)
{
   unloading = true;
});

// NOTE: this method may take up to a minute when the tab is not active, regardless of the seconds requested!
async function sleep(seconds)
{
   let startTimeInMs = Date.now();
   let delay = seconds * 1000;
//console.log(DateAndTime_Now().ToFormat('%/D %:T') + ' sleeping for ' + delay + ' ms');
   await new Promise(function(resolve)
   {
      setTimeout(function()
      {
         try
         {
            resolve();
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      }, delay)
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
//console.log(DateAndTime_Now().ToFormat('%/D %:T') + ' finished sleeping');
   let elapsed = Date.now() - startTimeInMs;
   if (elapsed > Math.max(delay, 100) * 2)
   {  // let's use minimum timeout of 100ms since it could be 0
      if (elapsed > 65000) // it seems in the background our timers can wait up to a minute regardless of the requested delay!
         Log_WriteWarning('sleep(' + delay + 'ms) took ' + elapsed + 'ms which is far too long!');
      else
         Log_WriteInfo('sleep(' + delay + 'ms) took ' + elapsed + 'ms which is too long!');
   }
}

async function sleepRand(seconds)
{
   let fudge = seconds / 3;
   if (seconds != 0)
      seconds = Utilities_IntRand(seconds - fudge, seconds + fudge);
   return sleep(seconds);
}

// DRL FIXIT? On Facebook I have seen cases where using this method only pastes the last line in multi-line text.
async function insertText(elem, text, addReturn, getFocus, selectContent)
{
   try
   {
      assert(!getFocus);  // we currently don't use this, but if we do we may need to look
                          // into the pop-up feature (see getIsScrapingFocusAllowed())
      Log_WriteInfo('Getting focus for 3 seconds to insertText()');
      if (getFocus && !await reqShowSyncWindowAndTab(3))
         return false;
      
      elem.focus();
      if (selectContent && (elem.nodeName == 'INPUT' || elem.nodeName == 'TEXTAREA'))
         elem.select();
      
      document.execCommand("insertText", false, text);
      await sleep(0.3);
      
      if (addReturn)
         simulateKeyDown('Enter', 13, elem);
      
      if (selectContent && (elem.nodeName == 'INPUT' || elem.nodeName == 'TEXTAREA'))
         document.getSelection().removeAllRanges();
      elem.blur();
   }
   catch (e)
   {
      Log_WriteException(e, 'Unable to insertText()!');
      return false;
   }
   
   return true;
}

async function pasteText(elem, text, addReturn, getFocus, selectContent)
{
   if (text == null || text == '') // the clipboard doesn't copy an empty string so skip this otherwise
      return false;               // we'll paste whatever happened to be on the clipboard
   
   assert(!getFocus);  // we currently don't use this, but if we do we may need to look
                       // into the pop-up feature (see getIsScrapingFocusAllowed())
   
   try
   {
      let oldText = MyClipboard.GetClipboardText();
      MyClipboard.CopyTextToClipboard(text);
   
      Log_WriteInfo('Getting focus for 3 seconds to pasteText()');
      if (getFocus && !await reqShowSyncWindowAndTab(3))
         return false;
      
      elem.focus();
      if (selectContent && (elem.nodeName == 'INPUT' || elem.nodeName == 'TEXTAREA'))
         elem.select();
      
      document.execCommand('paste');
      await sleep(0.3);
      
      if (addReturn)
         simulateKeyDown('Enter', 13, elem);
      
      if (selectContent && (elem.nodeName == 'INPUT' || elem.nodeName == 'TEXTAREA'))
         document.getSelection().removeAllRanges();
      elem.blur();
      
      if (oldText == null || oldText == '')
         oldText = ' ';   // if we don't have anything to put into the clipboard it fails
      MyClipboard.CopyTextToClipboard(oldText);
   }
   catch (e)
   {
      Log_WriteException(e, 'Unable to pasteText()!');
      return false;
   }
   
   return true;
}

function simulateKeyDown(name, code, elem)
{
   if (!elem) elem = window;
   
   elem.dispatchEvent(
      new KeyboardEvent("keydown", {
         altKey: false,
         code: name,
         ctrlKey: false,
         isComposing: false,
         key: name,
         location: 0,
         metaKey: false,
         repeat: false,
         shiftKey: false,
         which: code,
         charCode: 0,
         keyCode: code,
      })
   );
}

// DRL FIXIT? Align with the method that follows?
function simulateMouseClick(elem)
{
   let simulateMouseEvent = function(element, eventName, coordX, coordY)
   {
      element.dispatchEvent(new MouseEvent(eventName, {
         view: window,
         bubbles: true,
         cancelable: true,
         clientX: coordX,
         clientY: coordY,
         button: 0
      }));
   };
   let box = elem.getBoundingClientRect(),
      coordX = box.left + (box.right - box.left) / 2,
      coordY = box.top + (box.bottom - box.top) / 2;
// This was added to try and solve issue 252 Get Facebook post permalink from the post date
//    // added mouse over
//   simulateMouseEvent(elem, "mouseenter", coordX, coordY);
//   simulateMouseEvent(elem, "mousemove", coordX, coordY);
//   simulateMouseEvent(elem, "mouseover", coordX, coordY);
   simulateMouseEvent(elem, "mousedown", coordX, coordY);
   simulateMouseEvent(elem, "mouseup", coordX, coordY);
   simulateMouseEvent(elem, "click", coordX, coordY);
}

// DRL FIXIT? Align with the method above?
function pressNonButton(object, options)
{
   var pos = Utilities_GetOffset(object);
   var event = object.ownerDocument.createEvent('MouseEvents'),
      options = options || {},
      opts = { // These are the default values, set up for un-modified left clicks
         type: 'click',
         canBubble: true,
         cancelable: true,
         view: object.ownerDocument.defaultView,
         detail: 1,
         screenX: pos.x, //The coordinates within the entire page
         screenY: pos.y,
         clientX: pos.x, //The coordinates within the viewport
         clientY: pos.y,
         ctrlKey: false,
         altKey: false,
         shiftKey: false,
         metaKey: false, //I *think* 'meta' is 'Cmd/Apple' on Mac, and 'Windows key' on Win. Not sure, though!
         button: 0, //0 = left, 1 = middle, 2 = right
         relatedTarget: null,
      };
   
   //Merge the options with the defaults
   for (var key in options)
   {
      if (options.hasOwnProperty(key))
      {
         opts[key] = options[key];
      }
   }
   
   //Pass in the options
   event.initMouseEvent(
      opts.type,
      opts.canBubble,
      opts.cancelable,
      opts.view,
      opts.detail,
      opts.screenX,
      opts.screenY,
      opts.clientX,
      opts.clientY,
      opts.ctrlKey,
      opts.altKey,
      opts.shiftKey,
      opts.metaKey,
      opts.button,
      opts.relatedTarget
   );
   
   //Fire the event
   object.dispatchEvent(event);
}

async function uploadAttachment(elem, attach)
{
   let startTimeInMs = Date.now();
   
   let blob = await reqGetBlob(attach.URL);
   if (blob == null)
      return false;
   
   let ext = attach.Type.split('/')[1];
   let mimetype = attach.Type;
   let file = new File([blob], 'file.' + ext, {type: mimetype});
   let list = new DataTransfer();
   list.items.add(file);
   elem.files = list.files;
   
   let endTimeInMs = Date.now();

// DRL Need to see if this is still an issue. Now the syncing tab is in the foreground but the window may not be.
//    // DRL FIXIT! I found that on Twitter the upload didn't succeed while the tab was in the background
//    // so I added this workaround but we need a better solution that won't impact the user.
//    await reqPushToActiveTab();
   
   elem.dispatchEvent(new Event('change', {bubbles: true}));
   
   // allow enough time for the object to be uploaded (twice as long as it took to
   // upload to browser) and some time to process it
   let delay = ((endTimeInMs - startTimeInMs) * 2 / 1000) + 5;
   await sleep(delay);

//    await reqPopFromActiveTab();
   
   return true;
}


async function getMimeType(url)
{
   return new Promise((resolve, reject) =>
   {
      if (url == '#')
      {
         assert(0);   // let's try to track down when we get this, could be scraping error?
         resolve(null);
      }
      
      // optimization
      if (url.startsWith('https://socialattache.com/Main.php'))
      {
         resolve('text/html');
      }
      
      if (url.startsWith('data:'))
      {
         // this is a data URL so the MIME type is in the string as in:
         //    data:image/gif;base64,R0lGODlhAQABAID...
         resolve(url
            .split(',')[0]     // remove the data
            .split(':')[1]     // remove the protocol
            .split(';')[0]);   // remove any parameters after the MIME type
         return;
      }
      
      Messaging.SendMessageToBackground({
            type: 'HEAD',
            url: url,
            params: {},
            timeout: timings.SHORT_AJAX_REQUEST * 1000
         })
         .then(resp =>
         {
            if (resp == null)
            {
               resolve(null);
               return;
            }
            
            if (resp.httpCode != 200)
            {
               if (resp.httpCode != 401 && resp.httpCode != 403 && resp.httpCode != 404)
                  Log_WriteWarning("Got " + resp.httpCode + " response for " + url + " to get MIME type");
               resolve(null);
               return;
            }
            
            resolve(
               (
                  resp.headers.hasOwnProperty('Content-Type')
                     ? resp.headers['Content-Type']
                     : resp.headers['content-type']
               ).split(';')[0]
            );
         })
         .catch(e =>
         {
            Log_WriteException(e);
            reject(e);
         });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// should be called during long operations to tell background we're still alive so we don't
// get reloaded, won't ping more than once per 1/2 minute
var lastPing = 0;

function reqPing()
{
   let now = Date.now();
   if (now - lastPing >= timings.SYNC_PROCESSING_PING_DELAY * 1000)
   {
      Messaging.SendMessageToBackground({type: 'ping'})
         .then(resp =>
         {
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
      lastPing = now;
   }
}

async function reqGetTabID()
{
   return Messaging.SendMessageToBackground({type: 'getTabID'});
}

async function reqGetAction(dataName, accountID, accountName)
{
   return Messaging.SendMessageToBackground({
         type: 'getAction',
         dataName: dataName,
         accountID: accountID,
         accountName: accountName
      })
      .then(resp =>
      {
         if (resp && resp.action)
            Log_WriteInfo('Processing action: ' + GetVariableAsString(resp));
         return resp;
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// the request is the JSON object to be returned later by reqGetAction above
// the tabID may be set to null in order for the current tab to be used
async function reqPushAction(tabID, action)
{
   return Messaging.SendMessageToBackground({tabID: tabID, type: 'pushAction', action: action})
      .then(resp =>
      {
         Log_WriteInfo('Pushed action: ' + GetVariableAsString(action));
         return resp;
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// pushes a message to be displayed the next time reqGetAction() is called, which could be a different page by then
// the tabID may be set to null in order for the current tab to be used
async function reqPushDisplayMessage(tabID, message, messageType, displayType, timeoutSeconds, icon)
{
   return reqPushAction(tabID, {
      action: 'displayMessage',
      message: message,
      messageType: messageType,
      displayType: displayType,
      timeoutSeconds: timeoutSeconds,
      icon: icon
   });
}

// the tabID may be set to null in order for the current tab to be used
async function reqPushDisplayEmbeddedItemForm(tabID, form, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3, itemName4, itemValue4,
   itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8)
{
   return reqPushAction(tabID, {
      action: 'displayEmbeddedItemForm',
      form: form,
      params: [itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3, itemName4, itemValue4,
         itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8]
   });
}

// this is used when the site we are scraping has throttled/blocked the account for a while
// - the dataName is something like "FacebookScrape"
// - category could be something like "sendMessage"
async function reqSetThrottled(dataName, isThrottled, category)
{
   if (isThrottled)
      Log_WriteWarning(dataName + ' ' + category + ' is throttled at: ' + window.location.href);
   return Messaging.SendMessageToBackground({
      type: 'setThrottled',
      dataName: dataName,
      isThrottled: isThrottled,
      category: category
   });
}

async function reqSetPostId(dataName, accountID, messageBoxUid, postID, externalPostID, from, errorMessage)
{
   if (errorMessage)
      Log_WriteError('Error sending post ' + postID + ': ' + errorMessage);
   else
      Log_WriteInfo('Sent post ' + postID);
   
   return Messaging.SendMessageToBackground({
      type: 'setPostId',
      dataName: dataName,
      accountID: accountID,
      messageBoxUid: messageBoxUid,
      postID: postID,
      externalPostID: externalPostID,
      from: from,
      url: null,  // we don't yet grab this from scraping
      errorMessage: errorMessage
   });
}

async function reqSetCommentId(dataName, accountID, messageBoxUid, commentID, externalCommentID, from, errorMessage)
{
   if (errorMessage)
      Log_WriteError('Error sending comment ' + commentID + ': ' + errorMessage);
   else
      Log_WriteInfo('Sent comment ' + commentID);
   
   return Messaging.SendMessageToBackground({
      type: 'setCommentId',
      dataName: dataName,
      accountID: accountID,
      messageBoxUid: messageBoxUid,
      commentID: commentID,
      externalCommentID: externalCommentID,
      from: from,
      errorMessage: errorMessage
   });
}

async function reqSetComment(dataName, accountID, syncCommandID, comment, errorMessage)
{
   if (errorMessage)
      Log_WriteError('Error getting comment for command ' + syncCommandID + ': ' + errorMessage);
   else
      Log_WriteInfo('Got comment for command ' + syncCommandID);
   
   return Messaging.SendMessageToBackground({
      type: 'setComment',
      dataName: dataName,
      accountID: accountID,
      comment: comment,
      command: {
         SyncCommandID: syncCommandID,
         SyncCommand: 'FetchComment',
         ErrorMessage: errorMessage
      }
   });
}

async function reqSetMessageId(dataName, accountID, messageBoxUid, messageID, externalMessageID, from, errorMessage)
{
   return Messaging.SendMessageToBackground({
      type: 'setMessageId',
      dataName: dataName,
      accountID: accountID,
      messageBoxUid: messageBoxUid,
      messageID: messageID,
      externalMessageID: externalMessageID,
      from: from,
      errorMessage: errorMessage
   });
}

async function reqCommandCompleted(dataName, accountID, syncCommandID, syncCommand, externalItemID, createdNewID, errorMessage)
{
   return Messaging.SendMessageToBackground({
      type: 'setSyncCommand',
      dataName: dataName,
      accountID: accountID,
      command: {
         SyncCommandID: syncCommandID,
         SyncCommand: syncCommand,
         ExternalItemID: externalItemID,
         CreatedNewID: createdNewID,
         ErrorMessage: errorMessage
      }
   });
}

async function reqUserTryingBranding()
{
   return Messaging.SendMessageToBackground({type: 'userTryingBranding'});
}

async function reqUserTryingLogin()
{
   return Messaging.SendMessageToBackground({type: 'userTryingLogin'});
}

async function reqUserRefusedLogin()
{
   // there are some cases where the dialog being displayed will be closed automatically
   // and the cancel event will be fired, so we need to ignore those
   
   // page is being refreshed or changing location
   if (unloading)
      return;
   
   // the window is losing focus
   if (!document.hasFocus())
      return;
   
   // the tab is losing focus
   if (window.outerHeight == window.innerHeight)
      return;
   
   return Messaging.SendMessageToBackground({type: 'userRefusedLogin'});
}

async function reqLinkDataSourceRefused(sourceName)
{
   return Messaging.SendMessageToBackground({type: 'linkDataSourceRefused', sourceName: sourceName});
}

// won't call more than once per minute unless changed
var lastThrottled = {};

async function reqSetActionThrottled(dataName, action, isThrottled = true, extraKey = null, extraValue = null)
{
   let params = {type: 'setActionThrottled', dataName: dataName, action: action, isThrottled: isThrottled};
   
   let key = action;
   if (extraKey)
   {
      key += ' ' + extraKey + '=' + extraValue;
      params[extraKey] = extraValue;
   }
   
   let now = Date.now();
   if (lastThrottled.hasOwnProperty(key) && lastThrottled[key].isThrottled == isThrottled &&
      now - lastThrottled[key].lastCall < timings.SYNC_PROCESSING_THROTTLED_DELAY * 1000)
      return Promise.resolve();
   
   if (isThrottled)
      Log_WriteWarning(dataName + ' action ' + key + ' is throttled at: ' + window.location.href);
   else
      Log_WriteInfo(dataName + ' action ' + key + ' is NOT throttled at: ' + window.location.href);
   
   lastThrottled[key] = {
      isThrottled: isThrottled,
      lastCall: now
   };
   
   return Messaging.SendMessageToBackground(params);
}

// contact is a single vCard, command is a structure with SyncCommandID and ErrorMessage
async function reqSetServerState(dataName, accountID, currentCheck, syncData, messages, contact, command)
{
   return Messaging.SendMessageToBackground({
      type: 'setServerState',
      dataName: dataName,
      accountID: accountID,
      currentCheck: currentCheck,
      syncData: syncData,
      messages: messages,
      contact: contact,
      command: command
   });
}

async function _sendPost(dataName, post, resolve)
{
   Messaging.SendMessageToBackground({
         type: 'setServerState',
         dataName: dataName,
         accountID: null,  // not provided for sending a post
         currentCheck: null,
         syncData: null,
         messages: [post],
         contact: null
      })
      .then(result =>
      {
         ClearMessage();
         
         if (!result)
            DisplayMessage(Str('There was an error sending the post to the server.'), 'error');
         
         resolve(result);
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function reqSendPost(dataName, post)
{
   // if we are going to prompt the user the tab has to be visible
   if (post.message)
      await reqShowTab();

   return new Promise((resolve, reject) =>
   {
      if (post.message)
      {
// DRL FIXIT! Our yes/no dialog seems to be broken!
//        DisplayYesNoMessage(post.message, 'warning', function() {
//            _uploadPost(post);
//        });
         if (confirm(post.message))
            _sendPost(dataName, post, resolve);
         else
         {
            // a warning
            ClearMessage();
            resolve(false);
         }
      }
      else
         _sendPost(dataName, post, resolve);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function reqSendContact(dataName, accountID, syncCommandID, contact, errorMessage)
{
   assert(syncCommandID != null);
   return Messaging.SendMessageToBackground({
      type: 'setContact',
      dataName: dataName,
      accountID: accountID,
      contact: contact,
      command: {
         SyncCommandID: syncCommandID,
         ErrorMessage: errorMessage
      }
   });
}

function _uploadPost(post)
{
   DisplayMessage(Str('Downloading post...'), 'busy');
   Messaging.SendMessageToBackground({type: 'savePost', post: post})
      .then(resp =>
      {
         if (resp == null)
         {
            DisplayMessage(Str('Post wasn\'t downloaded!'), 'error');
            return;
         }
         
         if (resp.status == 'success')
            DisplayMessage(Str('Downloaded as: <0>', resp.data.Name), 'success', null, timings.UPLOAD_SUCCESS_MESSAGE_DELAY);
         else
            DisplayMessage(Str('Post wasn\'t downloaded: <0>', resp.message), 'error');
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// the post contains optional replaceValues (on success) and an optional message (a warning if the replaceValues are non-null)
function savePost(post)
{
   if (post.message)
   {
      if (post.Body == null)
      {
         // an error
         DisplayMessage(post.message, 'error');
      }
      else
      {
         // a warning
         ClearMessage();
// DRL FIXIT! Our yes/no dialog seems to be broken!
//          DisplayYesNoMessage(post.message, 'warning', function() {
//              _uploadPost(post);
//          });
         if (confirm(post.message))
            _uploadPost(post);
      }
   }
   else
      _uploadPost(post);
}

// returns "false" if the focus action is disabled at this time
async function reqShowSyncWindowAndTab(focusedSecondsOrBool)
{
   if (!getIsScrapingFocusAllowed())
   {
      Log_WriteInfo('Scraping focus disabled at this time');
      return false;
   }
   
   return Messaging.SendMessageToBackground({type: 'showSyncWindowAndTab', focusedSecondsOrBool: focusedSecondsOrBool})
      .then(resp =>
      {
         return true;
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function reqShowTab()
{
   return Messaging.SendMessageToBackground({type: 'showTab'})
      .then(resp =>
      {
         return resp;
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// syncDataName should be null for user controlled tab
// returns true if the script can use this tab, otherwise it must not use it
async function reqInitTab(syncDataName)
{
   Log_WriteInfo("Current page: " + window.location.href);
   return Messaging.SendMessageToBackground({type: 'initTab', syncDataName: syncDataName})
      .then(resp =>
      {
         let label = null;
         if (syncDataName == null)
            label = 'the user';
         else
            label = syncDataName + ' scraping';
         
         if (resp == null)
         {
            Log_WriteInfo('I am NOT for ' + label + '!');
            return false;
         }
         
         Log_SetPrefix(syncDataName == null ? 'Augmentation' : syncDataName);
         Log_WriteInfo('I am for ' + label + '!');
         
         // in dev environment we use the scraper constants unchanged so this would be null in that case
         if (resp.scraperConstants)
         {
            Log_WriteInfo("Using ScrapeConstants from server");
            
            // store the constants in the global namespace, overwriting the original Constants.js versions
            for (let name of Object.keys(resp.scraperConstants))
               window[name] = resp.scraperConstants[name];
         }
         else
            Log_WriteInfo("Using static ScrapeConstants instead of server version");
         
         // initialize some global brand specific values...
         Form_RootUri = resp.brandRootURL;
         Form_MainUri = resp.brandRootURL + '/Main.php';
         LoginUri = resp.brandLoginURL;
         
         // initialize the Strings.js module...
         Strings_InitExtension(resp.languageCode, resp.translations)
         
         return true;
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function reqCheckSocialAttacheLogin(isScraper)
{
   return new Promise((resolve, reject) =>
   {
      if (!isScraper && !Browser.IsTabVisible())
      {
//            Log_WriteInfo('Not visible, sleeping');
         sleep(timings.TAB_NOT_VISIBLE_DELAY)
            .then(resp =>
            {
               resolve(false);
            })
            .catch(error =>
            {
               Log_WriteError("Error 1 in handleSocialAttacheLogin(): " + error);
               resolve(false);
            });
         return;
      }
      
      let canShowPrompt = Browser.IsWindowFocused() && Browser.IsTabVisible();
      
      Messaging.SendMessageToBackground({type: 'checkSocialAttacheLogin', canShowPrompt: canShowPrompt})
         .then(resp =>
         {
            if (resp == null)
            {
               if (Browser.IsExtension() && chrome.extension == undefined)  // Chrome extension removed or reloading
                  console.log("Got null response from checkSocialAttacheLogin() and chrome extension has gone away");
               else
                  Log_WriteError("Got null response from checkSocialAttacheLogin()"); // should never happen?
               resolve(false);
               return;
            }
            
            if (isScraper)
               DisplayMessage("\n\n" + Str('This tab is being used by the <0> Chrome extension.', resp.brandName) + "\n\n" +
                  Str('Do not use any of the tabs in this browser window as this will impact your automations!') + "\n\n",
                  // we use the longer delay here, we just want the message to eventually go away in case the
                  // tab is no longer being used - the extension was removed or reloaded for example, the
                  // content script will call this method periodically and that will keep this message up
                  'warning', 'top_large', 600);
            
            let loggedIn = false;
            if (!isScraper && canShowPrompt && resp.type && resp.type.startsWith('offer_'))
            {
               if (resp.type == 'offer_brand')
               {
                  reqUserTryingBranding();
                  displayBrandsMenu();
               }
               else
               {
                  assert(resp.type == 'offer_login');
                  if (confirm(Str('In order to use the <0> Chrome extension you\'ll need to create or login to a <1> account. Would you like to do this now?',
                     resp.extensionName, resp.brandName)))
                  {
                     reqUserTryingLogin();
                     reqCreateTab('SAMainPage', 'GET', LoginUri, {}, false);
                  }
                  else
                  {
                     // we delay our check here so that we give the user interface time to settle in case what
                     // the user did was change windows or tabs in which case we won't treat it as a click
                     setTimeout(function()
                     {
                        if (Browser.IsWindowFocused() && Browser.IsTabVisible())
                           reqUserRefusedLogin();
                     }, 1000);
                  }
               }
            }
            else if (resp.type && (resp.type == 'logged_in' || resp.type == 'assistant'))
            {
               loggedIn = true;
            }
            
            if (!loggedIn)
               Log_WriteInfo('Logged out of back office');
            resolve(loggedIn);
         })
         .catch(e =>
         {
            Log_WriteException(e);
            reject(e);
         });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function pingingSleep(seconds, callback)
{
   Log_WriteInfo('pingingSleep for ' + seconds + ' seconds');
   let startTimeInMs = Date.now();
   while (Date.now() - startTimeInMs < seconds * 1000)
   {
      reqPing();
      let sec = seconds != 0
         ? Math.min(seconds - ((Date.now() - startTimeInMs) / 1000), timings.SYNC_PROCESSING_PING_DELAY)
         : 0;
      await sleep(sec);
   }
   if (callback)
   {
      Log_WriteInfo('Calling pingingSleep callback');
      callback();
      Log_WriteInfo('Return from pingingSleep callback');
   }
}

async function handleSocialLoggedOut(url)
{
   Log_WriteInfo('Not logged in to social');
   await pingingSleep(timings.SOCIAL_NOT_LOGGED_IN_DELAY);
   window.location = url;
   return 4;   // wait a few seconds before checking for account info
}

// returns true if the user was prompted, must only be called from non-scrapers
async function reqCheckDataSource(sourceName)
{
   return Messaging.SendMessageToBackground({type: 'checkDataSource', sourceName: sourceName})
      .then(resp =>
      {
         if (resp == null)
         {
            return false;
         }
         
         let prompted = false;
         if (Browser.IsWindowFocused() && Browser.IsTabVisible() && resp.type == 'offer_sync')
         {
            prompted = true;
            if (confirm(Str('Would you like to link this <0> account with "<1>" account <2> in order to enable data sharing?',
               resp.sourceName, resp.brandName, resp.displayName)))
            {
               reqLinkDataSource(resp.sourceName);
            }
            else
            {
               // we delay our check here so that we give the user interface time to settle in case what
               // the user did was change windows or tabs in which case we won't treat it as a click
               setTimeout(function()
               {
                  if (Browser.IsWindowFocused() && Browser.IsTabVisible())
                     reqLinkDataSourceRefused(resp.sourceName);
               }, 1000);
            }
         }
         return prompted;
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function reqLinkDataSource(sourceName)
{
   return Messaging.SendMessageToBackground({type: 'linkDataSource', sourceName: sourceName});
}

/*
async function getAccountId(dataName) {
    return Messaging.SendMessageToBackground({ type: 'getAccountId', dataName: dataName});
}
*/
// this is matched with the same named method in BackgroundHelpers.js
async function getFinalUrl(url)
{
   assert(url != null);
   
   // if we're fetching the same domain we won't have any CORS issues so we can do it in this script, otherwise
   // we'll have to do it from the background script
   if (Url_GetDomain(url) == window.location.hostname)
      return new Promise((resolve, reject) =>
      {
         fetch(url, {method: 'HEAD'})
            .then(response =>
            {
               if (response != null)
                  resolve(response.url);
               else
               {
                  Log_WriteWarning("No result getting final url \"" + url + "\"");
                  resolve(null);
               }
            })
            .catch(error =>
            {
               Log_WriteError("Error getting final url \"" + url + "\": " + error);
               resolve(url);
            });
      })
   else
      return Messaging.SendMessageToBackground({type: 'getFinalUrl', url: url});
}

// this is matched with the same named method in BackgroundHelpers.js
async function fetchPage(url)
{
   return new Promise((resolve, reject) =>
   {
      Messaging.SendMessageToBackground({
            type: 'GET',
            url: url,
            params: {},
            timeout: timings.MEDIUM_AJAX_REQUEST * 1000
         })
         .then(resp =>
         {
            if (resp == null)
            {
               resolve(null);
               return;
            }
            
            if (resp.httpCode != 200)
            {
               if (resp.httpCode != 401 && resp.httpCode != 403 && resp.httpCode != 404)
                  Log_WriteWarning("Got " + resp.httpCode + " response for " + url + " to get URL: " + url);
               resolve(null);
               return;
            }
            
            resolve(resp.data);
         })
         .catch(e =>
         {
            Log_WriteException(e);
            reject(e);
         });
   })
   .catch(e =>
   {
      Log_WriteException(e);
      throw e;
   });
}

async function reqCreateTab(tabName, method, url, params, forScraping, focused, queuedActions)
{
   if (forScraping == null)
      forScraping = false;
   
   if (url == null)
      Log_WriteError('Trying to create tab with null URL');   // saw null URL sometimes
   
   return Messaging.SendMessageToBackground({
      type: 'createTab',
      tabName: tabName,
      method: method,
      url: url,
      params: params,
      forScraping: forScraping,
      focused: focused,
      queuedActions: queuedActions
   });
}

async function reqRemoveTab()
{
   return Messaging.SendMessageToBackground({type: 'removeTab'});
}

async function reqGetBrandID()
{
   return Messaging.SendMessageToBackground({type: 'getBrandID'});
}

async function reqGetAutomationPaused()
{
   return Messaging.SendMessageToBackground({type: 'getAutomationPaused'});
}

async function reqSetScrapingFocusDisabledFor(value)
{
   return Messaging.SendMessageToBackground({type: 'setScrapingFocusDisabledFor', disabledFor: value});
}

async function reqSetAutomationPaused(value)
{
   return Messaging.SendMessageToBackground({type: 'setAutomationPaused', isAutomationPaused: value});
}

async function reqCreateIssue()
{
   DisplayMessage(Str('Preparing information report...'), 'busy');
   reqCreateTab('SAMainPage', 'POST', Form_MainUri, {
      'FormProcessor': 'IssueEdit',
      'VentureID': SystemVentureID,
      'ReferralUrl': contactsPageUrl(),
      'PageURL': window.location.href,
      'PageHTML': DOMtoString(window.document),  // DRL FIXIT! I've seen cases where this grabs the wrong browser tab, even though the PagePNG is correct.
      'PagePNG': '%TAB_CAPTURE%',
      'LogFile': '%LOG_FILE%'
   })
      .then(resp =>
      {
         ClearMessage();
      })
      .catch(error =>
      {
         Log_WriteError("Error with reqCreateIssue(): " + error);
         DisplayMessage(Str('Error preparing report'), 'error');
      });
}

// can be passed a message, post, or comment
// returns true if an essential attachment was removed (can't be downloaded)
// when an attachment is a video/audio pair then "URL" is an array with them in that order
async function massageAttachments(message)
{
   const s = new Set();
   let result = [];
   let removedEssentialAttachment = false;
   
   for (let el of message.Attachments)
   {
      if (Array.isArray(el.URL))
      {
         if (el.URL[0])
         {
            // video with audio if available
            let type = await getMimeType(el.URL[0]);
            if (type != null)
               result.push({URL: el.URL[0], Type: type})
         }
         if (el.URL[1])
         {
            // audio component if it is separate
            let type = await getMimeType(el.URL[1]);
            if (type != null) // we convert video/webm and video/mp4 to audio/* for the server to know it's audio
               result.push({URL: el.URL[1], Type: Utilities_ReplaceInString(type, 'video/', 'audio/')});
         }
      }
      else
      {
         let url = normalizeUrl(el.URL); // fix Facebook redirect URLs
         
         // skip blob and inline data types as we don't currently support them
         if (url.indexOf('blob:') === 0 ||
            url.indexOf('data:') === 0)
         {
            // "image/svg", "image/svg+xml" are not essential
            if (url.indexOf('image/svg') === -1)
               removedEssentialAttachment = true;
         }
         // avoid duplicate attachments
         else if (!s.has(url))
         {
            
            if (!el.hasOwnProperty('Type') == undefined || el.Type == null)
               el.Type = await getMimeType(url);
            else
               assert(0);  // callers should not be providing the type
            
            if (el.Type != null &&
               // don't bother with "image/svg", "image/svg+xml"
               el.Type.indexOf('image/svg') === -1)
            {
               s.add(url);
               el.URL = url;
               result.push(el)
            }
         }
      }
   }
   
   message.Attachments = result;
   
   return removedEssentialAttachment;
}

async function reqScraperException(dataName)
{
   return Messaging.SendMessageToBackground({type: 'scraperException', dataName: dataName});
}

async function handleScraperException(dataName, e, url)
{
   let delay = timings.BUSY_LOOP_DELAY;
   
   if (e.message.indexOf('Extension context invalidated') != -1 ||
      e.message.indexOf('message channel closed') != -1 ||
      e.message.indexOf('message port closed') != -1)
   {
      window.location.reload();   // background script unloaded or reloaded
      await sleep(10);    // let's make sure nothing more is done on this page while it reloads
   }
   else if (e.message.indexOf('account info not found') != -1)
   {
      delay = handleSocialLoggedOut(url);
   }
   else
   {
      Log_WriteException(e);
      await reqScraperException(dataName);
      delay = timings.SCRAPING_EXCEPTION_DELAY;
   }
   
   return delay;
}

/*
async function reqIsBrowserTabIdle() {
    return Messaging.SendMessageToBackground({type: 'isBrowserTabIdle'});
}
*/
function DOMtoString(root)
{
   let html = '';
   let node = root.firstChild;
   while (node)
   {
      switch (node.nodeType)
      {
         case Node.ELEMENT_NODE:
            html += node.outerHTML;
            break;
         case Node.TEXT_NODE:
            html += node.nodeValue;
            break;
         case Node.CDATA_SECTION_NODE:
            html += '<![CDATA[' + node.nodeValue + ']]>';
            break;
         case Node.COMMENT_NODE:
            html += '<!--' + node.nodeValue + '-->';
            break;
         case Node.DOCUMENT_TYPE_NODE:
            // (X)HTML documents are identified by public identifiers
            html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
            break;
         default:
            break;
      }
      node = node.nextSibling;
   }
   return html;
}

// given a node, extract all the text parts, and if there are images grab the alt text from those too as appropriate
function DOMToText(root, depth = 0)
{
   let text = '';
   // Text node (3) or CDATA node (4) - return its text
   if (root.nodeType === 3 || root.nodeType === 4)
   {
      text = root.nodeValue;
   }
   // If node is an element (1) and an img, input[type=image], or area element, return its alt text
   else if (root.nodeType === 1 && (
      root.tagName.toLowerCase() == 'img' ||
      root.tagName.toLowerCase() == 'area' ||
      (root.tagName.toLowerCase() == 'input' && root.getAttribute('type') && root.getAttribute('type').toLowerCase() == 'image')
   ))
   {
      text = root.getAttribute('alt') || '';
      // DRL FIXIT? The test below uses 2 because I've found some emoji's such as "🙌🏼" return a length of 2.
      if (depth > 0 && text.characterLength() > 2)  // a single character is often an emoji as unicode, so leave alone
         text = ' (' + text + ') ';
   }
   // Handle line breaks
   else if (root.nodeType === 1 && root.tagName.toLowerCase() == 'br')
   {
      text = "\n";
   }
   // Traverse children unless this is a script or style element
   else if (root.nodeType === 1 && !root.tagName.match(/^(script|style)$/i))
   {
      for (let child of root.childNodes)
      {
         text += DOMToText(child, depth + 1);
         if (child.nodeType === 1 && child.tagName.toLowerCase() == 'div')
            text += "\n"; // replicate the spacing
      }
   }
   
   return text;
}

// the need for this method is that when we have a time delta such as "1h" the host site may not be providing a
// very accurate time and we want to make sure we don't miss messages, so we round up by the largest unit (day,
// week, etc.) since the last check so we may get some overlap in messages (which the server should handle) but
// we'll not miss anything
function roundItemTimeUp(timestamp, lastCheck = null)
{
   if (lastCheck == null || lastCheck == 0)
      lastCheck = timestamp;
   let diff = (Date.now() - lastCheck) / 1000;  // seconds
   let adjust =
      diff >= SecondsPerDay * 364               // one year
         ? SecondsPerDay * 364
         : (diff >= SecondsPerDay * 29          // one month
            ? SecondsPerDay * 29
            : (diff >= SecondsPerWeek           // one week
               ? SecondsPerWeek
               : (diff >= SecondsPerDay         // one day
                  ? SecondsPerDay
                  : (diff >= SecondsPerHour     // one hour
                     ? SecondsPerHour
                     : SecondsPerMinute * 15))));
   return timestamp + (adjust * 1000);
}

function roundItemTimeDown(timestamp, lastCheck = null)
{
   if (lastCheck == null || lastCheck == 0)
      lastCheck = timestamp;
   let diff = (Date.now() - lastCheck) / 1000;  // seconds
   let adjust =
      diff >= SecondsPerDay * 364               // one year
         ? SecondsPerDay * 364
         : (diff >= SecondsPerDay * 29          // one month
            ? SecondsPerDay * 29
            : (diff >= SecondsPerWeek           // one week
               ? SecondsPerWeek
               : (diff >= SecondsPerDay         // one day
                  ? SecondsPerDay
                  : (diff >= SecondsPerHour     // one hour
                     ? SecondsPerHour
                     : SecondsPerMinute * 15))));
   return timestamp - (adjust * 1000);
}

// I found that sometimes the time shown on the item hadn't been updated so it was a few minutes late so I added
// this fudge to our lastCheck time otherwise we would not include those messages that appear newer (but aren't)
function roundCheckTimeUp(timestamp)
{
   let diff = Date.now() - timestamp;
   if (diff < 5 * SecondsPerMinute * 1000)
   {
      let adjust = 5 * SecondsPerMinute * 1000;
      timestamp += adjust;
   }
   return timestamp;
}
