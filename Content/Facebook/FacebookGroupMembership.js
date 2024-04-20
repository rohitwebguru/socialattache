async function groupJoinRequestAction(accept, userID, groupID, reason)
{
   let container = await scrollGroupRequestsIntoView(groupID);
   if (container == false || container == null)  // the above logs for us
      return Str('Group requests container not found.');    // DRL FIXIT? We should be doing some retry logic in case of throttling?
   
   // if we have a fbun we need to convert it to a fbperid
   if (userID.indexOf('@fbun.socialattache.com') != -1)
   {
      userID = await getFacebookAddressFromId(getEmailPrefix(userID), FacebookAddressFormatNumeric);
      if (userID == null)
      {
         // already logged by the above
         return Str('Member request not found.');
      }
   }
   
   await sleep(1);
   
   setSelectorVariables({GroupID: getEmailPrefix(groupID), UserID: getEmailPrefix(userID)});
   let requestElem = findElement(srchPathFBG('memberRequestContainerItem'), null, container);
   clearSelectorVariables();
   if (requestElem == null)
   {
      Log_WriteError('Membership container for ' + userID + ' not found at: ' + window.location.href);
      return Str('Member request not found.');
   }

   let done = false;
   if (!accept && reason)
   {
      // the more complex case, we must choose the "Other" option and paste in the reason
   
      let actionButton = await waitForElement(srchPathFBG('memberRequestOpenMoreMenu'),
         null, requestElem);
      if (actionButton == null)
      {
         Log_WriteError('Membership memberRequestOpenMoreMenu not found at: ' + window.location.href);
      }
      else
      {
         let actionButton = await waitForElement(srchPathFBG('memberRequestMoreMenuItemDecline'));
         if (actionButton == null)
         {
            Log_WriteError('Membership memberRequestMoreMenuItemDecline not found at: ' + window.location.href);
         }
         else
         {
            actionButton = await waitForElement(srchPathFBG('memberRequestDeclineOtherRadio'));
            if (actionButton == null)
            {
               Log_WriteError('Membership memberRequestDeclineOtherRadio not found at: ' + window.location.href);
            }
            else
            {
               let elem = findElement(srchPathFBG('memberRequestDeclineOtherReason'));
               if (elem == null)
               {
                  Log_WriteError('Membership memberRequestDeclineOtherReason not found at: ' + window.location.href);
               }
               else
               {
                  if (!await insertText(elem, reason))
                  {
                     Log_WriteError('Unable to paste decline reason!');
                  }
                  else
                     done = true;
               }
            }
   
            actionButton = await waitForElement(srchPathFBG('memberRequestDeclineOtherClose'));
            if (actionButton == null)
            {
               Log_WriteError('Membership decline "close" button not found at: ' + window.location.href);
               return Str('Error declining group join request with reason.');
            }
         }
      }
   }
   
   if (!done)
   {
      // simple case, just accept or decline
      let actionButton = findElement(srchPathFBG(accept ? 'memberRequestApproveButton' : 'memberRequestDeclineButton'),
         null, requestElem);
      if (actionButton == null)
      {
         Log_WriteError('Membership ' + (accept ? 'Accept' : 'Decline') + ' button not found at: ' + window.location.href);
         return Str('Membership button not found.');
      }
      actionButton.click();
   }
   await sleep(1);
   
   return null;
}
