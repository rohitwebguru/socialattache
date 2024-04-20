function getWebsiteContactProtocol()
{
   let domain = window.location.hostname;
   
   if (domain.indexOf('messenger') != -1 || domain.indexOf('facebook') != -1)
      return 'fbp';
   if (domain.indexOf('instagram') != -1)
      return 'ig';
   if (domain.indexOf('pinterest') != -1)
      return 'pint';
   if (domain.indexOf('tiktok') != -1)
      return 'tt';
   if (domain.indexOf('twitter') != -1)
      return 'twit';
   if (domain.indexOf('google') != -1 || domain.indexOf('outlook') != -1)
      return 'mailto';
   Log_WriteError('No protocol for page URL: ' + domain);
   return null;
}

async function loopAug()
{
   console.log(DateAndTime_Now() + " loopAug()");    // this is here so we can click on it in the console for easier debugging ;-)
   
   try
   {
      if (window.location.search.includes('SA_PAUSE_VIDEOS'))
      {
         // as soon as the page loads try to pause anything that plays as (1) it may have sound and (2) when it
         // ends it may take us to a different video than the one we want to scrape
         await pauseFacebookVideo();
         await pauseFacebookStory();
      }
      
      if (!await reqInitTab(null))
         return;

//        let pageLoadTime = Date.now();
      
      while (true)
      {
         let delay = timings.UI_RECHECK_DELAY;
         
         try
         {
            // DRL FIXIT? Not sure about this, and if we should have it here why not in the other content scripts as well?
            if (Browser.IsExtension() && chrome.extension == undefined)
               location.reload();  // background script unloaded or reloaded
            
            if (!Storage.IsAllStorageReady())
            {
               Log_WriteWarning('Storage not ready for augmentation, waiting');
               await sleep(2);
               continue;
            }
            
            let isLoggedInToBackOffice = await reqCheckSocialAttacheLogin(false);
            
            let resp = await reqGetAction(null, null, null);
            
            if (resp == null)
            {
               Log_WriteInfo('Background not ready');
            }
            else if (resp.action == 'displayMessage')
            {
               DisplayMessage(resp.message, resp.messageType, resp.displayType, resp.timeoutSeconds, resp.icon);
               continue;   // check right away for another action
            }
            else if (resp.action == 'downloadTwitterPost')
            {
               await downloadTwitterPost(resp);
               continue;   // check right away for another action
            }
            else if (resp.action == 'scrapeFirstFacebookPostFromSavedPage')
            {
               await scrapeFirstFacebookPostFromSavedPage(resp);
               continue;   // check right away for another action
            }
            else if (resp.action == 'scrapeFacebookPost')
            {
               await scrapeFacebookPost(null, resp);
               continue;   // check right away for another action
            }
            else if (resp.action == 'scrapeFacebookStory')
            {
               await scrapeFacebookStory(resp);
               continue;   // check right away for another action
            }
            else if (resp.action == 'scrapeGroupInfo')
            {
               await scrapeGroupInfo(resp);
               continue;   // check right away for another action
            }
            else if (resp.action == 'scrapeGroupQuestions')
            {
               await scrapeGroupQuestions(resp);
               continue;   // check right away for another action
            }
            else if (resp.action == 'wait')
            {
               delay = resp.seconds;
            }
            else if (resp.action == 'displayEmbeddedItemForm')
            {
               if (isLoggedInToBackOffice)
               {
                  DisplayEmbeddedItemForm(resp.form, resp.params[0], resp.params[1], resp.params[2], resp.params[3],
                     resp.params[4], resp.params[5], resp.params[6], resp.params[7], resp.params[8], resp.params[9],
                     resp.params[10], resp.params[11], resp.params[12], resp.params[13], resp.params[14], resp.params[15]);
               }
               else
               {
                  DisplayMessage(Str('You are not logged in to the back office.'), 'error', null, 5);
                  Log_WriteError('Not displaying ' + resp.form + ' form as we are not logged into the back office!');
               }
               continue;   // check right away for another action
            }
            else if (resp.action != null)
               Log_WriteError("Unrecognized action: " + resp.action);
            
            let url = location.protocol + '//' + location.host + location.pathname

// DRL This is annoying when the user is watching a video for example so we need to rework this.
//                // we periodically reload the page (when idle) in order to incorporate any changes that may have occurred
//                // for example new profiles that have been loaded or tasks created that affect the icons we display
//                if (await reqIsBrowserTabIdle() && Date.now() - pageLoadTime > timings.AUGMENTATION_PAGE_RELOAD_FREQUENCY * 1000) {
//                    Log_WriteInfo('Reloading idle tab at ' + url + ' to get latest changes');
//                    location.reload();
//                }
            
            await displayMainMenuButton(isLoggedInToBackOffice);
            
            // everything else requires to be logged in to back office
            if (!isLoggedInToBackOffice)
            {
               await sleep(delay);
               continue;
            }
            
            let contactInfos = await reqGetContactInfos(getWebsiteContactProtocol());
            let helpItems = await reqGetHelpItems();
            let contactTags = await reqGetContactTags();
            
            let facebookLoggedIn = false;
            let instagramLoggedIn = false;
            let pinterestLoggedIn = false;
            let tikTokLoggedIn = false;
            let twitterLoggedIn = false;
            let googleLoggedIn = false;
            let microsoftLoggedIn = false;
            let appleLoggedIn = false;
            
            if ((url.includes('messenger.com/') || url.includes('facebook.com/messages/')) && isLoggedInOnFacebook())
            {
               facebookLoggedIn = true;
               // let contactTags = await reqGetContactTags();
               await massageMessengerPage(contactInfos, contactTags, helpItems);
            }
            else if ((url.startsWith('https://www.facebook.com') || url.startsWith('https://web.facebook.com')) && isLoggedInOnFacebook())
            {
               facebookLoggedIn = true;
               let groupInfos = await reqGetGroupInfos();
               await massageFacebookPage(contactInfos, groupInfos, helpItems, contactTags)
            }
            else if (url.startsWith('https://www.instagram.com/direct') && isLoggedInOnInstagram())
            {
               instagramLoggedIn = true;
               // let contactTags = await reqGetContactTags();
               massageInstagramMessengerPage(contactInfos, contactTags, helpItems);
            }
            else if (url.startsWith('https://www.instagram.com') && isLoggedInOnInstagram())
            {
               instagramLoggedIn = true;
               massageInstagramPage(contactInfos, helpItems)
            }
            else if (url.startsWith('https://www.pinterest.') && isLoggedInOnPinterest())
            {
               pinterestLoggedIn = true;
               massagePinterestPage(contactInfos, helpItems)
            }
            else if (url.startsWith('https://www.tiktok.com') && await isLoggedInOnTikTok())
            {
               tikTokLoggedIn = true;
               massageTikTokPage(contactInfos, helpItems)
            }
            else if ((url.startsWith('https://www.twitter.com') || url.startsWith('https://twitter.com')) && isLoggedInOnTwitter())
            {
               twitterLoggedIn = true;
               massageTwitterPage(contactInfos, helpItems)
            }
            else if (url.startsWith('https://mail.google.com') && massageGmailPage(contactInfos, helpItems))
            {
               googleLoggedIn = true;
            }
            else if (url.startsWith('https://outlook.live.com') && massageOutlookPage(contactInfos, helpItems))
            {
               microsoftLoggedIn = true;
            }
            
            if (Browser.GetOS() == 'Android')
               googleLoggedIn = true;
            
            if (Browser.GetOS() == 'Windows')
               microsoftLoggedIn = true;
            
            if (Browser.GetOS() == 'Mac')
               appleLoggedIn = true;
            
            // NOTE: If we are prompted for one sync here, any subsequent one that also matches won't
            // be requested until the page is re-scraped.
            if ((facebookLoggedIn && await reqCheckDataSource('Facebook')) ||
               (instagramLoggedIn && await reqCheckDataSource('Instagram')) ||
               (pinterestLoggedIn && await reqCheckDataSource('Pinterest')) ||
               (tikTokLoggedIn && await reqCheckDataSource('TikTok')) ||
               (twitterLoggedIn && await reqCheckDataSource('Twitter')) /*||
                    (googleLoggedIn && await reqCheckDataSource('Google')) ||
                    (microsoftLoggedIn && await reqCheckDataSource('Microsoft')) ||
                    (appleLoggedIn && await reqCheckDataSource('Apple'))*/)
               delay = timings.SYNC_LOGIN_DELAY;
         }
         catch (e)
         {
            if (e.message.includes('Extension context invalidated') ||
               e.message.includes('message channel closed') ||
               e.message.includes('message port closed'))
            {
               // background script unloaded or reloaded
               throw e;
            }
            
            Log_WriteException(e);
         }
         
         await sleep(delay);
      }
   }
   catch (e)
   {
      if (e.message.includes('Extension context invalidated') ||
         e.message.includes('message channel closed') ||
         e.message.includes('message port closed'))
      {
         window.location.reload();  // background script unloaded or reloaded
      }
      else
         Log_WriteException(e);
   }
}

DocumentLoad.AddCallback(function(rootNodes)
{
   if (rootNodes.length != 1 || rootNodes[0] != document.body)
      return;     // this only needs to be done once on initial page load
   
   loopAug();  // this is an async function we are launching and returning right away
});

