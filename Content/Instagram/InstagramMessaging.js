async function sendMessage(message)
{
   let elem = await waitForElement(srchPathIGM('newMessageButton'));
   if (elem == null)
   {
      Log_WriteError('newMessageButton not found in sendMessage at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   let to = getEmailPrefix(message.To[0]);
   
   elem = await waitForElement(srchPathIGM('userSearch'));
   if (elem == null)
   {
      Log_WriteError('userSearch not found in sendMessage at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, to, false, false, true))
   {
      Log_WriteError('pasteText failed in sendMessage at: ' + window.location.href);
      return RETRY_EXTERNAL_ID;
   }
   
   let elems = await waitForElements(srchPathIGM('userList'));
   // DRL FIXIT! Move this into selector!
   // the element contains the recipient handle as well as their full name so we have to get just the former
   if (elems.length == 0 || !elems[0].textContent.toLowerCase().includes(to))
   {
      Log_WriteError('matching recipient not found in sendMessage at: ' + window.location.href);
      if (elems.length > 0) Log_WriteDOM(elems[0]);
      return ERROR_EXTERNAL_ID;
   }
   // DRL FIXIT! Move first() into selector!
   elems.first().click();
   
   elem = await waitForElement(srchPathIGM('nextButton'));
   if (elem == null)
   {
      Log_WriteError('nextButton not found in sendMessage at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   elem = await waitForElement(srchPathIGM('messageTextarea'));
   if (elem == null)
   {
      // sometimes at this point we see the "info" page, not sure why (I think it was already showing before), but we can toggle it
      elem = await waitForElement(srchPathIGM('infoButton'));
      if (elem == null)
      {
         Log_WriteError('infoButton not found in sendMessage at: ' + window.location.href);
         return ERROR_EXTERNAL_ID;
      }
      elem.click();
      
      elem = await waitForElement(srchPathIGM('messageTextarea'));
      if (elem == null)
      {
         Log_WriteError('messageTextarea not found in sendMessage at: ' + window.location.href);
         return ERROR_EXTERNAL_ID;
      }
   }
   
   // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
   if (!await pasteText(elem, message.Body, false, false, true))
   {
      Log_WriteError('pasteText failed in sendMessage at: ' + window.location.href);
      return RETRY_EXTERNAL_ID;
   }
   
   elem = await waitForElement(srchPathIGM('sendButton'));
   if (elem == null)
   {
      Log_WriteError('sendButton not found in sendMessage at: ' + window.location.href);
      return ERROR_EXTERNAL_ID;
   }
   elem.click();
   
   await sleep(2);
   
   return NO_EXTERNAL_ID;
}