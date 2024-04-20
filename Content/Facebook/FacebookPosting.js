async function openFeedPostComposerOnMobileBasicVersion(accountInfo, post)
{
   let elem = findElement(srchPathFBP('feedPostMbasic'));
   if (elem == null)
   {
      Log_WriteError('openFeedPostComposerOnMobileBasicVersion not finding feedPostMbasic at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makeFeedPost_OnComposerOpen',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

async function openPagePostComposerOnMobileBasicVersion(accountInfo, post)
{
   let elem = findElement(srchPathFBP('pagePostMbasic'));
   if (elem == null)
   {
      Log_WriteError('openPagePostComposerOnMobileBasicVersion not finding pagePostMbasic at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makePagePost_OnComposerOpen',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

async function makeStoryPost(accountInfo, post)
{
   let elem = findElement(srchPathFBP('storyPostCreate'));
   if (elem == null)
   {
      Log_WriteError('makeStoryPost not finding storyPostBasic at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   elem.click();
   await sleep(1);
   
   if (post.Attachments.length > 0)
   {
      let elem = await waitForElement(srchPathFBP('storyPostAttachment'));
      if (elem == null)
      {
         Log_WriteError('makeStoryPostBasicVersion not finding storyPostAttachment at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      await uploadAttachment(elem, post.Attachments[0])
   }
   
/* DRL FIXIT! The text part isn't working yet!
    if (post.Body != '') {
        let btn = findElement(srchPathFBP('storyPostTextBtn'));
        if (btn == null) {
            Log_WriteError('makeStoryPost not finding storyPostTextBtn at: ' + window.location.href)
            return RETRY_EXTERNAL_ID;
        }
        btn.click();
        await sleep(1);

        elem = await waitForElement(srchPathFBP('storyPostText'));
        if (elem == null) {
            Log_WriteError('makeStoryPost not finding storyPostText at: ' + window.location.href)
            return ERROR_EXTERNAL_ID;
        }
    
        if (!await pasteText(editBox, post.Body, false, false, true))
        {
            Log_WriteError('makeStoryPost unable to copy/paste post!');
            return [RETRY_EXTERNAL_ID, null];
        }
        await sleep(1);
    }
*/
   
   let btn = findElement(srchPathFBP('storyPostSubmit'));
   if (btn == null)
   {
      Log_WriteError('makeStoryPost not finding storyPostSubmit at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   btn.click();
   await sleep(10);    // looks like it takes a while to post
   
   btn = await waitForElement(srchPathFBP('storyPostGoToNewPost'));
   if (btn == null)
   {
      Log_WriteError('makeStoryPost not finding storyPostGoToNewPost at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   btn.click();
   await sleep(5);

// DRL FIXIT! Need to get the story ID somehow! See scrapeStoryByCardUrl() for ideas.
//    let storyID = something;
//    return validateAddress(storyID + '@fbp_story.socialattache.com');
   return NO_EXTERNAL_ID;
}

async function makeFeedPostOnMobileBasicVersion(accountInfo, post)
{
   let elem = findElement(srchPathFBP('feedPostTextField'));
   if (elem == null)
   {
      // means we are not in the right page
      Log_WriteError('makeFeedPostOnMobileBasicVersion not finding feedPostTextField at: ' + window.location.href)
      
      let attachmentError = findElement(srchPathFBP('feedAttachmentError'));
      if (attachmentError != null)
      {
         Log_WriteError(`Error message: ${attachmentError.innerText}`);
         return ERROR_EXTERNAL_ID;
      }
      
      return RETRY_EXTERNAL_ID;
   }
   
   let elemPrivacy = await waitForElement(srchPathFBP('feedPostPrivacy'));
   if (elemPrivacy == null)
   {
      Log_WriteError('makeFeedPostOnMobileBasicVersion not finding feedPostPrivacy at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   if (elemPrivacy.value.trim() != keywordFBP('Public'))
   {
      await reqPushAction(null, {
         action: 'makeFeedPost_OnPrivacyChange',
         accountInfo: accountInfo,
         post: post
      });
      elemPrivacy.click();
      return true;
   }
   
   if (typeof post.Attachments != 'undefined'
      && post.Attachments.length > 0
      && findElements(srchPathFBP('feedPostAttachment')).length <= 0)
   {
      
      let bttn = await waitForElement(srchPathFBP('feedPostAddAttachmentButton'));
      if (bttn == null)
      {
         Log_WriteError('makeFeedPostOnMobileBasicVersion not finding feedPostAddAttachmentButton at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      await reqPushAction(null, {
         action: 'makeFeedPost_Attachments',
         accountInfo: accountInfo,
         post: post
      });
      bttn.click()
      return true;
   }
   
   elem.value = post.Body
   
   elem = findElement(srchPathFBP('feedPostButton'));
   if (elem == null)
   {
      Log_WriteError('makeFeedPostOnMobileBasicVersion not finding feedPostButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makePost_Finalize',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

async function makePagePostOnMobileBasicVersion(accountInfo, post)
{
   let elem = findElement(srchPathFBP('pagePostTextField'));
   if (elem == null)
   {
      // means we are not in the right page
      Log_WriteError('makePagePostOnMobileBasicVersion not finding pagePostTextField at: ' + window.location.href)
      
      let attachmentError = findElement(srchPathFBP('pageAttachmentError'));
      if (attachmentError != null)
      {
         Log_WriteError(`Error message: ${attachmentError.innerText}`);
      }
      return ERROR_EXTERNAL_ID;
   }
   if (typeof post.Attachments != 'undefined'
      && post.Attachments.length > 0
      && findElements(srchPathFBP('pagePostAttachment')).length <= 0)
   {
      
      let bttn = await waitForElement(srchPathFBP('pagePostAddAttachmentButton'));
      if (bttn == null)
      {
         Log_WriteError('makePagePostOnMobileBasicVersion not finding pagePostAddAttachmentButton at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      await reqPushAction(null, {
         action: 'makePagePost_Attachments',
         accountInfo: accountInfo,
         post: post
      });
      bttn.click();
      return true;
   }
   
   elem.value = post.Body
   
   elem = findElement(srchPathFBP('pagePostButton'));
   if (elem == null)
   {
      Log_WriteError('makePagePostOnMobileBasicVersion not finding pagePostButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makePost_Finalize',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

async function makeFeedPost_changePrivacy(accountInfo, post)
{
   let elem = await waitForElement(srchPathFBP('publicAudienceLink'), 2);
   if (elem == null)
   {
// DRL FIXIT! What is this method?? Removed and logged instead.
//        location.redirect()
      Log_WriteError('makeFeedPost_changePrivacy not finding publicAudienceLink at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await findElement(srchPathFBP('publicAudienceDone'));
   if (elem == null)
   {
      Log_WriteError('makeFeedPost_changePrivacy not finding publicAudienceDone at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makeFeedPost_OnComposerOpen',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

async function makeFeedPost_Attachments(accountInfo, post)
{
   let elem = await waitForElement(srchPathFBP('feedPostAttachment1'));
   let res = true;
   if (typeof post.Attachments[0] != 'undefined')
   {
      await uploadAttachment(elem, post.Attachments[0])
   }
   elem = await waitForElement(srchPathFBP('feedPostAttachment2'))
   if (res === true && post.Attachments.length >= 2 && typeof post.Attachments[1] != 'undefined')
   {
      await uploadAttachment(elem, post.Attachments[1])
   }
   elem = await waitForElement(srchPathFBP('feedPostAttachment3'))
   if (res === true && post.Attachments.length >= 3 && typeof post.Attachments[3] != 'undefined')
   {
      await uploadAttachment(elem, post.Attachments[2])
   }
   if (res !== true)
      return res;
   
   elem = findElement(srchPathFBP('feedPostAttachmentPreviewButton'));
   if (elem == null)
   {
      Log_WriteError('makeFeedPost_Attachments not finding feedPostAttachmentPreviewButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makeFeedPost_OnComposerOpen',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

async function makePagePost_Attachments(accountInfo, post)
{
   let elem = await waitForElement(srchPathFBP('pagePostAttachment1'));
   let res = true;
   if (typeof post.Attachments[0] != 'undefined')
   {
      await uploadAttachment(elem, post.Attachments[0])
   }
   elem = await waitForElement(srchPathFBP('pagePostAttachment2'));
   if (res === true && post.Attachments.length >= 2 && typeof post.Attachments[1] != 'undefined')
   {
      await uploadAttachment(elem, post.Attachments[1])
   }
   elem = await waitForElement(srchPathFBP('pagePostAttachment3'));
   if (res === true && post.Attachments.length >= 3 && typeof post.Attachments[3] != 'undefined')
   {
      await uploadAttachment(elem, post.Attachments[2])
   }
   if (res !== true)
      return res;
   
   elem = findElement(srchPathFBP('pagePostAttachmentPreviewButton'));
   if (elem == null)
   {
      Log_WriteError('makePagePost_Attachments not finding pagePostAttachmentPreviewButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   await reqPushAction(null, {
      action: 'makePagePost_OnComposerOpen',
      accountInfo: accountInfo,
      post: post
   });
   elem.click();
   return true;
}

/*
async function makeFeedPostOnMobileVersion(accountID, post){
    let elem = await waitForElement(srchPathFBP('mComposerBtn'));
    if (elem == null) {
        Log_WriteError('makeFeedPostOnMobileVersion not finding mComposerBtn at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    elem.click();

    elem = await waitForElement(srchPathFBP("mPrivacyBtn"));
    if (elem == null) {
        Log_WriteError('makeFeedPostOnMobileVersion not finding mPrivacyBtn at: ' + window.location.href)
    }
    else if (elem.innerText.trim() != keywordFBP('Public')) {
        elem.click();

        elem = await waitForElement(srchPathFBP('mAudienceOptions'));
        if (elem == null) {
            Log_WriteError('makeFeedPostOnMobileVersion not finding mAudienceOptions at: ' + window.location.href)
        }
        else
            elem.click();
    }

    //Add the text to the box
    elem = await waitForElement(srchPathFBP('mComposerInput'))
    if (elem == null) {
        Log_WriteError('makeFeedPostOnMobileVersion not finding mComposerInput at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    if (typeof post.Body != 'undefined' && post.Body !== "") {
        elem.value = post.Body
        elem = findElement(srchPathFBP('mMentionsHidden'));
        if (elem == null) {
            Log_WriteError('makeFeedPostOnMobileVersion not finding mMentionsHidden at: ' + window.location.href)
        }
        else
            elem.value = post.Body
    }

    elem = findElement(srchPathFBP('mSubmitBtn'));
    if (elem == null) {
        Log_WriteError('makeFeedPostOnMobileVersion not finding mSubmitBtn at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    elem.click();
    return true;
}

async function makeFeedPost(accountID, post) {
    let elem = await waitForElement(srchPathFBP('composer'));
    if (elem == null) {
        Log_WriteError('makeFeedPost not finding composer at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    elem.click();
    await sleep(2);

    elem = await waitForElement(srchPathFBP('shareWith'));
    if (elem == null) {
        Log_WriteError('makeFeedPost not finding shareWith at: ' + window.location.href)
    }
    else if (elem.innerText.trim() != keywordFBP('Public')) {
        elem.click();
        
        elem = await waitForElement(srchPathFBP('sharePublic'));
        if (elem == null) {
            Log_WriteError('makeFeedPost not finding sharePublic at: ' + window.location.href)
        }
        else
            elem.click();
        await sleep(1);
    }

    let editBox = await waitForElement(srchPathFBP('postTextarea'));
    if (editBox == null) {
        Log_WriteError('makeFeedPost not finding postTextarea at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }

    let count = 0;
    let activeElement = document.activeElement;   // this seems to be the body element
    while (count < 5 && activeElement == null) {
        activeElement = document.activeElement;
        await sleep(2);
        count++;
    }
    if (activeElement == null) {
        Log_WriteError('makeFeedPost not finding active element at: ' + window.location.href)
        return RETRY_EXTERNAL_ID;
    }
    //    Log_WriteInfo('Active element is a ' + activeElement.tagName);

    await sleep(1);
    editBox.focus();
    if (typeof post.Body != 'undefined' && post.Body !== "") {
        try {
            // DRL FIXIT? We should use MyClipboard instead of navigator.clipboard.
            let currentClipboardText = await navigator.clipboard.readText();
            editBox.focus();
            await navigator.clipboard.writeText(post.Body);
            editBox.focus();
            await document.execCommand('paste');
            editBox.focus();
            await navigator.clipboard.writeText(currentClipboardText); // restoring the previous clipboard text
        } catch (e) {
            Log_WriteException(e, 'makeFeedPost unable to copy/paste post!');
            return RETRY_EXTERNAL_ID;
        }

        editBox.focus();
    }

    await sleep(2);
    //Open the post attachment dropdownzone by clicking in the image button
    elem = findElement(srchPathFBP('openPostAttachmentInput'))
    if (elem == null) {
        Log_WriteError('makeFeedPost not finding openPostAttachmentInput at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    elem.click()
    await sleep(1);

    if(typeof post.Attachments != "undefined"){
        for (let i = 0; i < post.Attachments.length; i++){
            elem = await waitForElement(srchPathFBP('postAttachmentInput'));
            if (elem == null) {
                Log_WriteError('makeFeedPost not finding postAttachmentInput at: ' + window.location.href)
                return ERROR_EXTERNAL_ID;
            }
            await uploadAttachment(elem, post.Attachments[i]);
        }
    }

    let from = '<' + validateAddress(accountID + '@fbperid.socialattache.com') + '>';
    //elem = await waitForElement(srchPathFBP('progressBar'), 3);

    elem = await waitForElement(srchPathFBP('postButton'));
    if (elem == null) {
        Log_WriteError('makeFeedPost not finding postButton at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    elem.click();

    elem = await waitForElement(srchPathFBP('successAlert'))
    if (elem == null) {
        Log_WriteError('makeFeedPost not finding successAlert at: ' + window.location.href)
        return ERROR_EXTERNAL_ID;
    }
    return NO_EXTERNAL_ID;
}
*/
async function makeGroupPost(accountID, post)
{
   let elem = await waitForElement(srchPathFBGP('composer'));
   if (elem == null)
   {
      Log_WriteError('makeGroupPost not finding composer at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   let editBox = await waitForElement(srchPathFBGP('postTextarea'));
   if (editBox == null)
   {
      Log_WriteError('makeGroupPost not finding postTextarea at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   
   Log_WriteInfo('Getting focus for 10 seconds to makeGroupPost()');
   await reqShowSyncWindowAndTab(10);
   
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
      Log_WriteError('makeGroupPost not finding active element at: ' + window.location.href)
      return RETRY_EXTERNAL_ID;
   }
   
   await sleep(1);
   if (typeof post.Body != 'undefined' && post.Body !== "")
   {
      if (!await pasteText(editBox, post.Body, false, false, true))
      {
         Log_WriteError('makeGroupPost unable to copy/paste post!');
         return [RETRY_EXTERNAL_ID, null];
      }
   }
   
   await sleep(1);
   
   if (typeof post.Attachments != "undefined" && post.Attachments.length > 0)
   {
      //Open the post attachment dropdownzone by clicking in the image button
      elem = findElement(srchPathFBGP('openPostAttachmentInput'))
      if (elem == null)
      {
         Log_WriteError('makeGroupPost not finding openPostAttachmentInput at: ' + window.location.href)
         return ERROR_EXTERNAL_ID;
      }
      elem.click()
      await sleep(1);
      
      for (let i = 0; i < post.Attachments.length; i++)
      {
         elem = await waitForElement(srchPathFBGP('postAttachmentInput'));
         if (elem == null)
         {
            Log_WriteError('makeGroupPost not finding postAttachmentInput at: ' + window.location.href)
            return ERROR_EXTERNAL_ID;
         }
         await uploadAttachment(elem, post.Attachments[i]);
      }

// DRL FIXIT? Do we need this?
//        elem = await waitForElement(srchPathFBGP('progressBar'), 3);
//        if (elem == null) {
//            Log_WriteError('makeGroupPost not finding progressBar at: ' + window.location.href)
//            return ERROR_EXTERNAL_ID;
//        }
   }
   
   elem = await waitForElement(srchPathFBGP('postButton'));
   if (elem == null)
   {
      Log_WriteError('makeGroupPost not finding postButton at: ' + window.location.href)
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   await sleep(5);
   
   return NO_EXTERNAL_ID;
}
