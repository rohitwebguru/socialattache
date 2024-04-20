async function getPostingAccounts()
{
   let elem = await waitForElement(srchPathIGP('instagramButton'));
   if (elem == null)
   {
      Log_WriteError('instagramButton not found in getPostingAccounts at: ' + window.location.href);
      return [];
   }
   elem.click();
   
   await waitForElement(srchPathIGP('tabHeader'));
   if (findElement(srchPathIGP('tabHeaderDropdown')) == null)
   {
      let elems = await waitForElements(srchPathIGP('singleAccountName'));
      if (elems.length == 0)
      {
         throw new Error("No Instagram accounts found for posting")
      }
      return [elems[0].innerText.trim()];
   }
   
   elem = await waitForElement(srchPathIGP('tabHeaderDropdown'));
   if (elem == null)
   {
      Log_WriteError('tabHeaderDropdown not found in getPostingAccounts at: ' + window.location.href);
      return [];
   }
   elem.click();
   
   let buttons = await waitForElements(srchPathIGP('dropdownAccountNames'));
   if (buttons.length == 0)
   {
      Log_WriteWarning('dropdownAccountNames returned no items in getPostingAccounts at: ' + window.location.href);
   }
   
   let accounts = [];
   for (let button of buttons)
   {
      accounts.push(button.innerText.trim());
   }
   
   elem = await waitForElement(srchPathIGP('tabHeaderDropdown'));
   if (elem == null)
   {
      Log_WriteError('tabHeaderDropdown not found in getPostingAccounts at: ' + window.location.href);
      return [];
   }
   elem.click();
   
   return accounts;
}

async function createPost(accountID, accountName, post)
{
   await sleep(4); // if we click the button as the page is loading it doesn't seem to take effect
   let elem = await waitForElement(srchPathIGP('instagramButton'));
   if (elem == null)
   {
      Log_WriteError('instagramButton not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   await sleep(1);
   
   elem = await waitForElement(srchPathIGP('createPostButton'));
   if (elem == null)
   {
      Log_WriteError('createPostButton not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   await sleep(1);
   
   elem = await waitForElement(srchPathIGP('instagramFeedButton'));
   if (elem == null)
   {
      Log_WriteError('instagramFeedButton not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathIGP('slidingTray'));
   if (elem == null)
   {
      Log_WriteError('slidingTray not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   
   if (findElement(srchPathIGP('addFileButton')) == null)
   {
      let buttons = await waitForElements(srchPathIGP('accountNames'))
      if (buttons.length == 0)
      {
         Log_WriteWarning('addFileButton and accounts not found in createPost at: ' + window.location.href);
         return ERROR_EXTERNAL_ID;
      }
      
      elem = null;
      for (let button of buttons)
      {
         if (accountName == button.innerText.trim())
         {
            elem = button;
         }
      }
      if (!elem)
      {
         Log_WriteError("Creator studio can't find instagram account " + accountName + " for post");
         return ERROR_EXTERNAL_ID;
      }
      elem.click();
   }
   
   elem = await waitForElement(srchPathIGP('addFileButton'));
   if (elem == null)
   {
      Log_WriteError('addFileButton not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   await sleep(1);
   
   elem = await waitForElement(srchPathIGP('uploadFileButton'));
   if (elem == null)
   {
      Log_WriteError('uploadFileButton not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   await sleep(1);
   
   for (let attach of post.Attachments)
   {
      if (attach.Type.split('/')[0] != 'image')
         continue;
      elem = await waitForElement(srchPathIGP('fromFileUploadButton'));
      if (elem == null)
      {
         Log_WriteError('fromFileUploadButton not found in createPost at: ' + window.location.href);
         return ERROR_EXTERNAL_ID;
      }
      await uploadAttachment(elem, attach);
      break;
   }
   
   elem = await waitForElement(srchPathIGP('captionTextarea'));
   if (elem == null)
   {
      Log_WriteError('captionTextarea not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, post.Body, false, false, true))
   {
      Log_WriteError('pasteText failed in createPost at: ' + window.location.href);
      return RETRY_EXTERNAL_ID;
   }
   
   elem = await waitForElement(srchPathIGP('postButton'));
   if (elem == null)
   {
      Log_WriteError('postButton not found in createPost at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   return NO_EXTERNAL_ID;
}