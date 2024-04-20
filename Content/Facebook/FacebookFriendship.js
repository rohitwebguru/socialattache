// lastCheck is 0 for the first check, it is never null
async function getFriends(lastCheck)
{
   let checkingNb = 0;
   let lastFriendListNb = 0; // last item into navigation of friend list
   let currentTarget = lastCheck;
   let checkUntil = currentTarget + constants.MAXIMUM_FRIENDS_PER_CHUNK;
   let vCards = [];
   
   const groupID = '"Facebook Friends" <' + validateAddress('friends@fb_label.socialattache.com') + '>';
   
   // Friends List Navigation(Left side)
   let friendsListNav = await waitForElement(srchPathFBFL('friendsListNav'));
   if (friendsListNav == null)
   {
      Log_WriteError('getFriends(): Unable to find friendsListNav from ' + document.location.href);
      return [null, null];   // DRL FIXIT? This is not always throttling, could be bad selector.
   }
   
   // Get friends List Navigation
   let friendsList = await findElement(srchPathFBFL('friendsList'), null, friendsListNav);
   if (friendsList == null)
   {
      Log_WriteError('getFriends(): Unable to find friendsList from ' + document.location.href);
      Log_WriteDOM(friendsListNav);
      return [[], null];
   }
   let scrollable = Utilities_GetScrollableParentElement(friendsList);
   
   // Displayed friends items.
   let friendItems = await findElements(srchPathFBFL('friendsListItems'), null, friendsListNav);
   if (friendItems.length == 0)
   {
      Log_WriteError('getFriends(): Unable to find friendsListItems from ' + document.location.href);
      Log_WriteDOM(friendsListNav);
      return [[], null];
   }
   
   // Last checked selector
   lastFriendListNb = friendItems.length;
   
   // get more friends items if it's less than last cursor
   do
   {
      scrollable.scrollTo(0, scrollable.scrollHeight);
      
      await sleepRand(timings.FB_FRIENDS_SCRAPE_SCROLL_DELAY);
      reqPing();
      
      // Get more items after scrolled
      friendItems = await findElements(srchPathFBFL('friendsListItems'), null, friendsListNav);
      
      if (friendItems == null)
      {
         Log_WriteError('getFriends(): Unable to find friendsListItems from ' + document.location.href);
         Log_WriteDOM(friendsListNav);
         break;
      }
      
      // we wait at least 10 seconds for new items
      if (lastFriendListNb == friendItems.length && checkingNb > 5)   // 5 times is 10 seconds since we sleep two seconds each
         break;
      
      // new friends appear on screen, we reset the counter that break the loop if above 10 loop
      if (lastFriendListNb != friendItems.length)
         checkingNb = 0;
      
      checkingNb++;
      lastFriendListNb = friendItems.length;
   } while (friendItems.length <= checkUntil); // we must go past our check to know if there's more
   
   // Get friend item
   let isFirstError = true;
   for (let f = currentTarget; f < checkUntil; f++)
   {
      if (friendItems[f])
      {
         // get name and profile url
         let name = findElement(srchPathFBFL('friendName'), null, friendItems[f]);
         let profileURL = findElement(srchPathFBFL('friendAddress'), null, friendItems[f]);
         
         if (profileURL == null)
         {
            if (name == null)
            {
               Log_WriteError('getFriends(): Unable to find friendName nor friendAddress for friend ' + f + ' from ' + document.location.href);
               if (isFirstError)
               {
                  Log_WriteDOM(friendItems[f]);
                  isFirstError = false;
               }
            }
            else
            {
               setSelectorVariables({FriendName: name});
               if (!findElement(srchPathFBFL('friendNoAddress'), null, friendItems[f]))
               {
                  Log_WriteError('getFriends(): Unable to find friendAddress for ' + name + ' from ' + document.location.href);
                  if (isFirstError)
                  {
                     Log_WriteDOM(friendItems[f]);
                     isFirstError = false;
                  }
               }
               else
                  Log_WriteInfo('getFriends(): Friend ' + name + ' appears to be a closed account, from ' + document.location.href);
               clearSelectorVariables();
            }
            continue;
         }
         if (name == null)
         {
            Log_WriteError('getFriends(): Unable to find friendName for ' + profileURL + ' from ' + document.location.href);
            if (isFirstError)
            {
               Log_WriteDOM(friendItems[f]);
               isFirstError = false;
            }
            continue;
         }
         
         // get vcard address from profile url
         let address = await getFacebookAddressFromUrl(profileURL, FacebookAddressFormatNumeric);
         if (address == null)
         {
            // this could happen if the profile is not available
            Log_WriteError('getFriends(): Unable to find friend profile address for ' + name + ' from ' + profileURL + ' at ' + document.location.href);
            continue;
         }
         let vCard = await getvCardFromNameAndAddress(name, 'facebook', 'fbp', address, groupID);
         if (vCard)
         {
            vCards.push(vCard);
         }
         else
         {
            Log_WriteError('getFriends(): Unable to find vCard for ' + name + ' from ' + address + ' at ' + document.location.href);
         }
      }
   }
   
   return [vCards, checkUntil < friendItems.length ? checkUntil : null];
}

// returns null on success, or error message
async function changeFriendship(makeFriend)
{
   await sleep(10);
   let friendButton = findElement(srchPathFBPF('friendButton'));
   let cancelFriendButton = findElement(srchPathFBPF('cancelFriendButton'));
   let unfriendButton = findElement(srchPathFBPF('unfriendButton'));
   
   let count = 0;
   if (friendButton != null) count++;
   if (cancelFriendButton != null) count++;
   if (unfriendButton != null) count++;
   if (count == 0)
   {
      Log_WriteError('No friend/unfriend buttons found 1, need to check for blocked scenarios: ' + window.location.href)
      return Str('Friendship blocked');
   }
   if (count > 1)
   {
      Log_WriteError('Multiple friend/unfriend buttons found 1, need to check selectors: ' + window.location.href)
      return Str('Incorrect selectors');
   }
   
   let isFriend = cancelFriendButton != null || unfriendButton != null;
   if (makeFriend)
   {
      if (isFriend)
      {
         Log_WriteInfo('Already a friend or request is pending');
         return null;
      }
      friendButton.click();
   }
   else
   {
      if (!isFriend)
      {
         Log_WriteInfo('Already not a friend');
         return null;
      }
      (cancelFriendButton ? cancelFriendButton : unfriendButton).click();
   }
   
   await sleep(10);
   friendButton = findElement(srchPathFBPF('friendButton'));
   cancelFriendButton = findElement(srchPathFBPF('cancelFriendButton'));
   unfriendButton = findElement(srchPathFBPF('unfriendButton'));
   
   count = 0;
   if (friendButton != null) count++;
   if (cancelFriendButton != null) count++;
   if (unfriendButton != null) count++;
   if (count == 0)
   {
      Log_WriteError('No friend/unfriend buttons found 2, need to check for blocked scenarios: ' + window.location.href)
      return Str('Friendship blocked');
   }
   if (count > 1)
   {
      Log_WriteError('Multiple friend/unfriend buttons found 2, need to check selectors: ' + window.location.href)
      return Str('Incorrect selectors');
   }
   
   isFriend = cancelFriendButton != null || unfriendButton != null;
   if (makeFriend)
   {
      if (isFriend)
      {
         Log_WriteInfo('Friend request successful');
         return null;
      }
      
      Log_WriteError('Friend request failed at: ' + window.location.href);
      return Str('Error making friend request')
   }
   else
   {
      if (!isFriend)
      {
         Log_WriteInfo('Unfriend successful');
         return null;
      }
      
      Log_WriteError('Unfriend failed at: ' + window.location.href);
      return Str('Error unfriending')
   }
}
