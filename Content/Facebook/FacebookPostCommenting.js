async function replyComment(originalAuthor, originalComment, message)
{
   let messageID = ERROR_EXTERNAL_ID;
   let errorMessage = Str('Error replying to comment');
   
   // we need fixed start/end dates that will not filter any comments
   let lastCheck = 0;
   let currentCheck = 10413792000 * 1000;  // well into the future (1 Jan 2300)
   
   let [comments, newCurrentCheck] = await parseActivityFromPost(null, null, null, lastCheck, currentCheck);
   if (comments == null)
   {
      return [RETRY_EXTERNAL_ID, errorMessage];
   }
   
   let elem = null;
   for (let comment of comments)
   {
      if (comment.From.includes(originalAuthor) && comment.Body.includes(originalComment))
      {
         elem = comment.Element;
         break;
      }
   }
   
   if (elem == null)
   {
      Log_WriteError("Can't find original comment from \"" + originalAuthor + "\" with \"" + originalComment + "\" at: " + document.location.href);
   }
   else
   {
      if (!await waitForElement(srchPathFBC('replyButton'), 2, elem))
      {
         Log_WriteError("Can't find reply button on original comment from \"" + originalAuthor + "\" with \"" + originalComment + "\" at: " + document.location.href);
         Log_WriteDOM(elem);
      }
      else
      {
         //Check first if there is a mention if not go for the next input
         //Sometime when replying the comment comes with a mention on it, in this cases we need to wait for it,
         // but if doest appear we should go to the next option
         let replyBox = await waitForElement(srchPathFBC('mentionEditBox'), 5, elem);
         if (!replyBox)
            replyBox = findElement(srchPathFBC('inputEditBox'), null, elem);
         if (replyBox == null)
         {
            Log_WriteError("Can't find input box to reply on original comment from \"" + originalAuthor + "\" with \"" + originalComment + "\" at: " + document.location.href);
            Log_WriteDOM(elem);
         }
         else
         {
/* DRL FIXIT! These do not appear to work...
                // in the case of a mention box the input element will contain the persons
                // name so we remove that first before pasting our message
                simulateKeyDown('Backspace', 8, elem);
                await sleep(.3)
                simulateKeyDown('Backspace', 8, elem);
                await sleep(.3)
                simulateKeyDown('Backspace', 8, elem);
                await sleep(.3)

                simulateKeyDown('Delete', 46, elem);
                await sleep(.3)
                simulateKeyDown('Delete', 46, elem);
                await sleep(.3)
                simulateKeyDown('Delete', 46, elem);
                await sleep(.3)

                message = "\b\b\b" + message;
*/
            
            if (await insertText(replyBox, message, true))
            {
               await sleep(1);
               
               // DRL FIXIT? Check for a successful send.
               
               messageID = NO_EXTERNAL_ID;
               errorMessage = null;
            }
            else
            {
               Log_WriteError('Unable to paste comment reply!');
            }
         }
      }
   }
   
   return [messageID, errorMessage];
}

function prepareTagMessageText(message, tagContacts)
{
   let first = true;
   for (let contact of tagContacts)
   {
      // when sending a comment to a FB group post it appears the "To" can be the group, just skip it
      if (getEmailSuffix(contact) == 'fbgroup.socialattache.com')
         continue;
   
      if (getEmailSuffix(contact) != 'fbperid.socialattache.com')
      {
         Log_WriteError('Unexpected address type for tagging in a comment: ' + contact);
         return null;
      }
      
      let tag = '@[' + getEmailPrefix(contact) + ':]';    // this format converts to a tag on mobile;
      
      if (tagContacts.length == 1)
      {
         // put the tag first
         message = tag + ' ' + message;
      }
      else
      {
         // put the tag after
         if (!first)
            message += ',';
         message += ' ' + tag;
      }
      
      first = false;
   }
   
   return message;
}

async function commentOnGroupPost(message, tagContacts)
{
   assert(window.location.hostname == 'mbasic.facebook.com');
   
   message = prepareTagMessageText(message, tagContacts);
   if (message === null)
      return ERROR_EXTERNAL_ID;
   
   let elem = await waitForElement(srchPathFBGP('postCommentComposerInput'))
   if (elem == null)
   {
      Log_WriteError('commentOnGroupPost not finding postCommentComposerInput at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   
   if (!await insertText(elem, message))
   {
      Log_WriteError('Unable to insert comment!');
      return RETRY_EXTERNAL_ID;
   }
   
   elem = findElement(srchPathFBGP('postCommentSubmitBtn'));
   if (elem == null)
   {
      Log_WriteError('commentOnGroupPost not finding postCommentSubmitBtn at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   elem.click()
   await sleep(1)
   
   // DRL FIXIT? Check for success.
   // DRL FIXIT! It looks like there are some people I can tag manually using the WWW interface but when I try
   // to tag those same people manually on the mobile interface it fails. So far I've found 100043771933656 who
   // is a page behaves this way.
   
   return NO_EXTERNAL_ID;
}

// DRL FIXIT? Should we switch this to use mbasic.facebook.com like the above? Would it be the same selectors?
async function commentOnGeneralPost(message, tagContacts)
{
   assert(window.location.hostname == 'm.facebook.com');
   
   message = prepareTagMessageText(message, tagContacts);
   if (message === null)
      return ERROR_EXTERNAL_ID;
   
   let elem = await waitForElement(srchPathFBP('postCommentComposerInput'))
   if (elem == null)
   {
      Log_WriteError('commentOnGeneralPost not finding postCommentComposerInput at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }

//    if (!await insertText(elem, message)) {
//        Log_WriteError(e, 'Unable to insert comment!');
//        return RETRY_EXTERNAL_ID;
//    }
   elem.focus();
   document.execCommand("insertText", false, message);
   
   elem = await waitForElement(srchPathFBP('postCommentMentionsHidden'))
   if (elem == null)
   {
      Log_WriteError('commentOnGeneralPost not finding postCommentMentionsHidden at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   elem.value = message;
   
   elem.blur();
   
   await sleep(2);
   
   elem = findElement(srchPathFBP('postCommentSubmitBtn'));
   if (elem == null)
   {
      Log_WriteError('commentOnGeneralPost not finding postCommentSubmitBtn at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   elem.click()
   await sleep(1)
   
   // DRL FIXIT? Check for success.
   // DRL FIXIT! It looks like there are some people I can tag manually using the WWW interface but when I try
   // to tag those same people manually on the mobile interface it fails. So far I've found 100043771933656 who
   // is a page behaves this way.
   
   return NO_EXTERNAL_ID;
}
