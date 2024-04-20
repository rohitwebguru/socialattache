/* It looks like Facebook disabled the mobile version of Messenger around 2024/03/12
function checkIfBasicMessageIsSent(message)
{
   let status = findElement(srchPathFBM('basicMessageCheckPermanentFailure'))
   if (status != null)
   {
      Log_WriteError('Permanent basic message send failure: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [ERROR_EXTERNAL_ID, Utilities_IsString(status) ? status : null];
   }
   
   status = findElement(srchPathFBM('basicMessageCheckRateLimitFailure'))
   if (status != null)
   {
      Log_WriteError('Rate limit basic message send failure: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [LIMITED_EXTERNAL_ID, Utilities_IsString(status) ? status : null];
   }
   
   status = findElement(srchPathFBM('basicMessageCheckTemporaryFailure'))
   if (status != null)
   {
      Log_WriteError('Temporary basic message send failure: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [RETRY_EXTERNAL_ID, Utilities_IsString(status) ? status : null];
   }
   
   status = findElement(srchPathFBM('basicMessageCheckSentSuccess'))
   if (status != null)
   {
      Log_WriteInfo('Basic message send success: ' + (Utilities_IsString(status) ? status : 'found'));
      return [NO_EXTERNAL_ID, null];
   }
   
   Log_WriteError('Unknown basic message send failure!');
//   Log_WriteDOM(document.body);   this is way too much!
   return [ERROR_EXTERNAL_ID, null];
}

async function sendBasicMessage(message)
{
   let textArea = await waitForElement(srchPathFBM('basicEditBox'), 10);
   if (textArea == null)
   {
      Log_WriteError('sendBasicMessage basicEditBox not found for sending message ' + message.Uid);
      return false;
   }
   let attachElem1 = findElement(srchPathFBM('basicMessageAttachmentInputOne'));
   if (attachElem1 == null)
   {
      Log_WriteError('sendBasicMessage basicMessageAttachmentInputOne not found for sending message ' + message.Uid);
      return false;
   }
   let attachElem2 = findElement(srchPathFBM('basicMessageAttachmentInputTwo'));
   if (attachElem2 == null)
   {
      Log_WriteError('sendBasicMessage basicMessageAttachmentInputTwo not found for sending message ' + message.Uid);
      return false;
   }
   let attachElem3 = findElement(srchPathFBM('basicMessageAttachmentInputThree'));
   if (attachElem3 == null)
   {
      Log_WriteError('sendBasicMessage basicMessageAttachmentInputThree not found for sending message ' + message.Uid);
      return false;
   }
   
   textArea.value = message.Body;
   
   if (typeof message.Attachments != "undefined")
   {
      if (typeof message.Attachments[0] != "undefined" && message.Attachments[0] != null)
      {
         await uploadAttachment(attachElem1, message.Attachments[0]);
      }
      if (typeof message.Attachments[1] != "undefined" && message.Attachments[1] != null)
      {
         await uploadAttachment(attachElem2, message.Attachments[1]);
      }
      if (typeof message.Attachments[2] != "undefined" && message.Attachments[2] != null)
      {
         await uploadAttachment(attachElem3, message.Attachments[2]);
      }
   }
   let form = findElement(srchPathFBM('basicForm'));
   if (form == null)
   {
      Log_WriteError('sendBasicMessage basicForm not found for sending message ' + message.Uid);
      return false;
   }
   form.submit()
   
   return true;
}
*/
function checkIfMessageIsSent()
{
   let status = findElement(srchPathFBM('messageCheckPermanentFailure'))
   if (status != null)
   {
      Log_WriteError('Permanent message send failure: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [ERROR_EXTERNAL_ID, Utilities_IsString(status) ? status : null];
   }
   
   status = findElement(srchPathFBM('messageCheckRateLimitFailure'))
   if (status != null)
   {
      Log_WriteError('Rate limit message send failure: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [LIMITED_EXTERNAL_ID, Utilities_IsString(status) ? status : null];
   }
   
   status = findElement(srchPathFBM('messageCheckTemporaryFailure'))
   if (status != null)
   {
      Log_WriteError('Temporary message send failure: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [RETRY_EXTERNAL_ID, Utilities_IsString(status) ? status : null];
   }
   
   status = findElement(srchPathFBM('messageCheckSentSuccess'))
   if (status != null)
   {
      Log_WriteInfo('Message send success: ' + (Utilities_IsString(status) ? status : 'unknown'));
      return [NO_EXTERNAL_ID, null];
   }
   
   Log_WriteError('Unknown message send failure!');
   return [ERROR_EXTERNAL_ID, null];
}

async function sendMessage(message)
{
   // DRL FIXIT? It would be interesting to test whether we can simulate the state that allows us
   // to send a Facebook message by instead of creating a new pop up window to send the message,
   // if we could re-use the existing FB scraper tab and set the focus on the <BODY> element before
   // performing the code below. Although we may not be able to call focus() on the BODY element it
   // looks like in Chrome when the active element is no longer available the body element gains
   // the focus so we could use this to affect this behavior (i.e. add an <INPUT> element, focus it,
   // then remove it from the page, see https://allyjs.io/tutorials/mutating-active-element.html).
   
   
   await sleep(5);     // this seemed necessary to have it sent
   
   // with the new end to end encryption feature Messenger is showing a button for some non-encrypted convos
   let encryptedConvoBttn = findElement(srchPathFBM('encryptedConvoButton'));
   if (encryptedConvoBttn != null)
   {
      Log_WriteInfo('There is an encrypted conversation notice, clicking the button');
      encryptedConvoBttn.click();
      await sleep(1)
   }
   
   // we found with Facebook that when we pop up a new message in a new window the active element
   // is where we need to post the message, not the edit box, but we wait for the edit box to know
   // when the page is ready because the send button is hidden until the edit box has content
   
   let editBox = await waitForElement(srchPathFBM('editBox'));
   if (editBox == null)
   {
      Log_WriteError('Edit box not found for sending message ' + message.Uid);
      // I sometimes see "You can't message this account." here that we could check for.
      Log_WriteDOM(document.body);    // this is a lot of content!
      return [RETRY_EXTERNAL_ID, null];
   }
   
   let count = 0;
   let activeElement = document.activeElement;   // this seems to be the body element
   while (count < 5 && activeElement == null)
   {
      activeElement = document.activeElement;
      await sleep(2);
      count++;
   }
   if (activeElement == null)
   {
      Log_WriteError('Active element not found!');
      return [RETRY_EXTERNAL_ID, null];
   }
//    Log_WriteInfo('Active element is a ' + activeElement.tagName);
   
   if (message.Body != "")
   {
      // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
      if (!await pasteText(editBox, message.Body, false, false, true))
      {
         Log_WriteError('Unable to paste message!');
         return [RETRY_EXTERNAL_ID, null];
      }
/* DRL This seemed unnecessary, given the above simple version and that the server now retries.
        let lockFocus = null;
        try
        {
            lockFocus = setInterval(()=>{
                editBox.focus();
            },10)
            let currentClipboardText = await navigator.clipboard.readText();
            await navigator.clipboard.writeText(message.Body);
            await document.execCommand('paste');
            await navigator.clipboard.writeText(currentClipboardText); // restoring the previous clipboard text
        }
        catch (e) {
            Log_WriteException(e, 'Unable to copy/paste message!');
            return RETRY_EXTERNAL_ID;
        }
        if (lockFocus) clearInterval(lockFocus)
        editBox.focus();
*/
      
      const sendButton = await waitForElement(srchPathFBM('sendButton'));
      if (sendButton == null)
      {
         Log_WriteError('Send button not found!');
//         Log_WriteDOM(document.body);   this is way too much!
         return [RETRY_EXTERNAL_ID, null];
      }

// DRL I use this when debugging. When I see the message pasted I hit F12 and wait for the debugger to breakpoint.
//        await sleep(30);
//        debugger;
      
      for (let i = 0; i < message.Attachments.length; i++)
      {
         let input = findElement(srchPathFBM('messageAttachmentInput'));
         if (input == null)
         {
            Log_WriteError('Unable to find input element for sending attachment!');
            Log_WriteDOM(document.body);
            return [RETRY_EXTERNAL_ID, null];
         }
         await uploadAttachment(input, message.Attachments[i]);
      }
      
      await sleep(1)
      sendButton.click();
      
      // the message status would be "Sending" and then "Sent" or "Delivered", but in every case it'll
      // start off as one of the latter (from the previous message?) so we look for the transition from
      // "Sending" to "Sent/Delivered"
      
      let status = await waitForElement(srchPathFBM('messageCheckSending'), 5)
      if (status == null)
         Log_WriteWarning('Did not get message "sending" status!');  // in some cases the "Sent" appears so soon after the click() that we miss the "Sending"
      else
         Log_WriteInfo('Message is sending');
      
      // Detect Sent Status
      // Note that the new message may be placed in the list of messages with an error result so
      // we can't simply check the number of messages in the list for example.
      count = 0;
      do
      {
         count++;
         if (count > 20)
         {
            
            Log_WriteError('Seems stuck in the "Sending" state?');
            break;
         }
         await sleep(1);
         status = findElement(srchPathFBM('messageCheckSending'));
      } while (status);
   }
   
   return checkIfMessageIsSent();
}

async function inviteToGroupChat(accountInfo, userID)
{
   await sleep(5);
   
   let username = await getEmailPrefix(await getFacebookAddressFromId(getEmailPrefix(userID), FacebookAddressFormatUsername));
   if (username == null)
      return Str('Facebook user does not have a vanity name configured for their account');
   
   let btnAddPeople = findElement(srchPathFBM('roomInviteBtnAddPeopleClick'));
   if (!btnAddPeople)
   {
      let collapseBtn = findElement(srchPathFBM('roomInviteBtnCollapseClick'));
      if (collapseBtn == null)
      {
         Log_WriteError('inviteToGroupChat() roomInviteBtnCollapseClick not found');
         return Str('Scraping error');
      }
      btnAddPeople = await waitForElement(srchPathFBM('roomInviteBtnAddPeopleClick'), 3);
      if (!btnAddPeople)
      {
         Log_WriteError('inviteToGroupChat() roomInviteBtnAddPeopleClick not found');
         return Str('Scraping error');
      }
   }
   let searchContainer = await waitForElement(srchPathFBM('roomInviteSearchContainer'));
   await sleep(1);
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(searchContainer, username, false, false, true))
   {
      Log_WriteException(e, 'Unable to copy/paste username into group chat invitation');
      return Str('Scraping error');
   }
   
   // DRL FIXIT! We have to check the match list and see if there is an exact match (by name since we don't
   // have the ID), not just select the first item! But we'll have to add the name to SyncCommands table.
   
   let userBtn = await waitForElement(srchPathFBM('roomInviteUserBtnClick'), 4);
   if (userBtn == null)
   {
      // if it isn't found the dialog is still open, close it
      let closeBtn = await waitForElement(srchPathFBM('roomInviteCloseBtnClick'), 4);
      if (closeBtn == null)
      {
         Log_WriteError('inviteToGroupChat() roomInviteCloseBtnClick not found');
      }
      
      // we need fixed start/end dates that will not filter any participants
      let lastCheck = 0;
      let currentCheck = 10413792000 * 1000;  // well into the future (1 Jan 2300)
      
      // check existing participants to figure out if he's already participating
      let conversationId = getMessengerConversationID(window.location.href);
      let participants = await getGroupChatParticipants(accountInfo, conversationId, true);
      for (let participant of participants)
      {
         if (participant.Username == username)
         {
            return null;
         }
      }
      
      return Str('Username not found: <0>', username);
   }
   
   await sleep(1);
   
   let addPeopleBtn = findElement(srchPathFBM('roomInviteAddPeopleBtnClick'));
   if (addPeopleBtn == null)
      Log_WriteError('inviteToGroupChat() roomInviteAddPeopleBtnClick not found');
   
   return null;
}

