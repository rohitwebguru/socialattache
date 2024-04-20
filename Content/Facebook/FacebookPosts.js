function srchPathPoFB(item)
{
   return srchPath('PostsFacebook', item);
}

// postUrl is optional if not known (when using the saved post method)
async function getPostBasicsFromFacebook(elem, postUrl)
{
   Log_WriteInfo('getPostBasicsFromFacebook(' + postUrl + ')');
   
   let wrapper = findElement(srchPathPoFB('postWrapperFromAuthor'), null, elem);
   if (!wrapper)
   {
      Log_WriteError('Post wrapper not found at: ' + window.location.href);
      throw new Error("Unsupported Facebook post");
   }
   
   let authorName = findElement(srchPathPoFB('postAuthorName'), null, wrapper);
   let authorUrl = findElement(srchPathPoFB('postAuthorURL'), null, wrapper);
   let authorID = await getFacebookAddressFromUrl(authorUrl, FacebookAddressFormatNumeric);
   if (authorID)
      authorID = authorName + ' <' + authorID + '>';
   
   let temp = await waitForElement(srchPathPoFB('postSeeMoreClick'), 2, wrapper);
   let body = findElement(srchPathPoFB('postImageAltsStr'), null, wrapper);
   
   temp = findElement(srchPathPoFB('postBody'), null, wrapper);
   if (temp != null && temp != '') // don't erase what we have already unless we have something better
      body = temp;
   
   let postID = null;
   let messageBoxID = null;
   if (postUrl)
   {
      // DRL FIXIT? Do we want to do this after a getFinalUrl()?
      [postID, postUrl] = getPostIdAndPermalinkFromFacebookUrl(postUrl);
      if (postID == null)
         throw new Error("Unsupported Facebook post");
      
      messageBoxID = await getMessageBoxIDFromPostUrl(postUrl);
      
      let type = messageBoxID.includes('fbgroup') ? 'fbp_gpost' : 'fbp_post';
      
      postID = validateAddress(postID + '@' + type + '.socialattache.com');
   }
   
   return [wrapper, {
      wrapper: wrapper,
      authorID: authorID,
      postBody: body,
      postUrl: Url_SetParam(postUrl, 'SA_PAUSE_VIDEOS', null), // remove our special parameter if found
      postID: postID,
      messageBoxID: messageBoxID
   }];
}

// elem is null for a page hosting a single post, otherwise it's the result of the "generalPostMenuLocation" selector
// returns post, or null when redirecting
async function getPostFromFacebook(elem, dontWarnAboutAttachments, action)
{
   if (window.location.href.match(/facebook.com\/[^\/]+\/videos\/[0-9]+/g) ||
      window.location.href.match(/facebook.com\/watch\//g))
   {
      Log_WriteInfo('Switching to video or watch post at: ' + window.location.href);
      return getPostFromFacebookVideoOrLivePage(dontWarnAboutAttachments, action.savedPostInfo);
   }
   
   if (elem == null)
   {
      // sometimes it failed parsing if I didn't have a little pause, not sure why
      await sleep(2);
      
      // this is the saved post case where we've gone to the actual individual post for scraping
      elem = await waitForElement(srchPathPoFB('postAuthorFB'));  // the page might not be loaded yet so wait
      if (!elem)
      {
         Log_WriteError('Post author not found at: ' + window.location.href);
         throw new Error("Unsupported Facebook post");
      }
   }
   
   let wrapper = null;
   let savedPostInfo = null;
   if (action.hasOwnProperty('savedPostInfo') && action.savedPostInfo != null && action.savedPostInfo.postID)
   {
      wrapper = findElement(srchPathPoFB('postWrapperFromAuthor'), null, elem);
      savedPostInfo = action.savedPostInfo;   // use already parse info
   }
   else
      [wrapper, savedPostInfo] = await getPostBasicsFromFacebook(elem, window.location.href);
   let authorID = savedPostInfo.authorID;
   let body = savedPostInfo.postBody;
   let postUrl = savedPostInfo.postUrl;
   let postID = savedPostInfo.postID;
   let messageBoxID = savedPostInfo.messageBoxID;
   
   assert(postUrl != null);
   assert(postID != null);
   
   // the URL could be an intermediate, and we need the final URL
   postUrl = await getFinalUrl(postUrl);
   
   let images = findElements(srchPathPoFB('postImageUrls'), null, wrapper);
   let video = null;
   if (images.length == 0 || !dontWarnAboutAttachments)
   {    // if we don't need attachments don't both downloading a big video
      // DRL I am a bit worried this may lead to an endless loop if the destination also has a match for postVideoUrl?
      let videoUrl = findElement(srchPathPoFB('postVideoLinkUrl'), null, wrapper);
      if (videoUrl)
      {
         Log_WriteInfo('Switching to video post ' + videoUrl + ' at: ' + window.location.href);
         action.savedPostInfo = savedPostInfo;
         await reqPushAction(null, action)
            .then(resp =>
            {
               window.location.href = videoUrl;
            })
            .catch(e =>
            {
               Log_WriteException(e);
            });
         await sleep(10);    // let's make sure nothing more is done on this page while it reloads (like loading the action we just pushed)
         return null;
      }
      video = findElement(srchPathPoFB('postVideoUrl'), null, wrapper);
   }
   
   // DRL FIXIT! Need to get the date! It's available on text posts for sure.
   let date = Date.now();
   
   let type = messageBoxID.includes('fbgroup') ? 'fbp_gpost' : 'fbp_post';
   
   return createPostObject(type, postID, authorID, date, body, images, video, postUrl, messageBoxID, dontWarnAboutAttachments);
}

async function getStoryFromFacebook(accountInfo, dontWarnAboutAttachments, postUrl, storyID)
{
   let authorID = accountInfo.name + ' <' + accountInfo.id + '@fbperid.socialattache.com>';
   
   // sometimes we're sitting at a blank "Click to view story" page, so click to load the story
   await waitForElement(srchPathFBS('viewVideoButton'));
   
   // since the story could auto-play and another replace it we check to make sure we're still on the right one
   let tempID = findElement(srchPathFBS('storyId'));
   // and if not we'll try to go back one story
   if (tempID != storyID)
   {
      await waitForElement(srchPathFBS('previousStoryButton'));
      tempID = findElement(srchPathFBS('storyId'));
      if (tempID != storyID)
         return null;
   }
   
   let body = findElement(srchPathFBS('getFacebookStoryNormalText'));
   if (body == null)
      body = findElement(srchPathFBS('getFacebookStoryImageText'));
   
   let postID = storyID + '@fbp_story.socialattache.com';
   let messageBoxID = 'fbp:' + accountInfo.id + '@fbperid.socialattache.com';
   
   assert(postUrl != null);
   assert(postID != null);
   
   let images = findElements(srchPathFBS('getFacebookStoryImage'));
   let video = null;
   // if we don't need attachments don't both downloading a big video
   if (images.length == 0 && !dontWarnAboutAttachments)
   {
      video = await getMatchedVideoURL(postUrl);
   }
   
   // since the story could auto-play and another replace it we check to make sure we're still on the right one
   tempID = findElement(srchPathFBS('storyId'));
   if (tempID != storyID)
   {
      Log_WriteWarning('Story ' + storyID + ' played through and we are now at ' + tempID);
      return null;
   }
   
   // DRL FIXIT! Need to get the date!
   let date = Date.now();
   
   return createPostObject('fbp_story', postID, authorID, date, body, images, video, postUrl, messageBoxID, dontWarnAboutAttachments);
}

// this is for parsing a video or live post sitting on its own page, and is used for automation so we don't get
// all the fields, some of which aren't available anyways
async function getPostFromFacebookVideoOrLivePage(dontWarnAboutAttachments, savedPostInfo)
{
   let date = Date.now();   // DRL FIXIT?
   
   // these were parsed form either the saved posts page or the individual post page
   let postUrl = window.location.href;
   let authorID = null;
   let body = null;
   let postID = null;
   let messageBoxID = null;
   
   if (savedPostInfo)
   {
      // we must use the original permalink so the "Get Permalink" matches the URL in the database
      if (savedPostInfo.postUrl) postUrl = savedPostInfo.postUrl;
      authorID = savedPostInfo.authorID;
      body = savedPostInfo.postBody;
      postID = savedPostInfo.postID;
      messageBoxID = savedPostInfo.messageBoxID;
   }
   
   if (authorID == null)
   {
      let authorName = findElement(srchPathPoFB('videoPostAuthorName'));
      let authorUrl = findElement(srchPathPoFB('videoPostAuthorURL'));
      authorID = await getFacebookAddressFromUrl(authorUrl, FacebookAddressFormatNumeric);
      if (authorID)
         authorID = authorName + ' <' + authorID + '>';
   }
   
   if (messageBoxID == null)
   {
      let messageBoxUrl = findElement(srchPathPoFB('videoPostMessageBoxURL'));
      messageBoxID = await getFacebookAddressFromUrl(messageBoxUrl, FacebookAddressFormatNumeric);
   }
   
   if (postID == null)
   {
      if (postUrl.match(/facebook.com\/[^\/]+\/videos\/[0-9]+/g))
      {
         postID = postUrl.match(/videos\/[0-9]+/)[0].replace('videos/', '');
      }
      else if (postUrl.match(/facebook.com\/watch\//g))
      {
         postID = Url_GetParam(postUrl, 'v')
      }
      else
         assert(0);
      
      let type = messageBoxID.includes('fbgroup') ? 'fbp_gpost' : 'fbp_post';
      
      postID = validateAddress(postID + '@' + type + '.socialattache.com');
   }
   
   let images = [];    // DRL FIXIT? We should try to get a thumbnail image if possible.
   let video = null;
   if (images.length == 0 || !dontWarnAboutAttachments)
   {    // if we don't need attachments don't both downloading a big video
      // Get redirected publish post HTML page which has author ID of post if it's private URL.
      const videoURL = (window.location.href.match(/facebook.com\/[^\/]+\/videos\/[0-9]+/g)) ?
         window.location.href :
         await getVideoPublicURLByPost(window.location.href);
      
      // get video urls directly if it's private Video
      video = await getMatchedVideoURL(videoURL);
   }
   
   let type = messageBoxID.includes('fbgroup') ? 'fbp_gpost' : 'fbp_post';
   
   return createPostObject(type, postID, authorID, date, body, images, video, postUrl, messageBoxID, dontWarnAboutAttachments);
}

async function getMatchedVideoURL(videoURL)
{
   // Get video playing page HTML to parse facebook CDN URL which is stored a real video(mp4).
   const fbCdnVideoPage = await getFacebookCDNVideoPage(videoURL);
   
   let matchVideosURL = fbCdnVideoPage.match(/:&quot;video&quot;,&quot;src&quot;:&quot;https:\W+[^\/]+\.fbcdn.net\W.+\.mp4\W.+;,&quot;width/g);
   
   // get video urls directly if it's private Video
   let video = null;
   if (!matchVideosURL)
   {
      // Get Private Video Playing page source.
      const fbCdnPrivateVideoPage = window.document.querySelector('body').innerHTML;
      // Parse and get available video url
      let matchCdnUrl = fbCdnPrivateVideoPage.match(/"all_video_dash_prefetch_representations"+\W.+"base_url":"https:\W+[^\/]+\.fbcdn.net\W.+\.mp4+\W.+"width":0,"playback_resolution_mos":""/g);
      if (matchCdnUrl && matchCdnUrl[0])
      {
         // Split audio and video
         let splitUrlAry = matchCdnUrl[0].split('mime_type":"audio');
         video = [null, null];
         
         // Parse audio url
         if (splitUrlAry[1])
         {
            let matchCdnAudUrl = splitUrlAry[1].match(/"base_url":"https:\W+[^\/]+\.fbcdn.net+\W+[^\/]+\W+[^\/]+\W+[^\/]+\W+[^\/]+","bandwidth"/g);
            if (matchCdnAudUrl && matchCdnAudUrl[0])
            {
               video[1] = parsePrivateVideoURI(matchCdnAudUrl[0]);
            }
         }
         
         // Parse video url
         let matchCdnVidUrl = splitUrlAry[0].match(/"base_url":"https:\W+[^\/]+\.fbcdn.net+\W+[^\/]+\W+[^\/]+\W+[^\/]+\W+[^\/]+","bandwidth"/g);
         if (matchCdnVidUrl && matchCdnVidUrl[0])
         {
            video[0] = parsePrivateVideoURI(matchCdnVidUrl[matchCdnVidUrl.length - 1]);
         }
         else
         {
            // Get playable url in case no video url exist in the view source
            matchCdnVidUrl = fbCdnPrivateVideoPage.match(/"playable_url":"https:\W+[^\/]+\.fbcdn.net+\W+[^\/]+\W+[^\/]+\W+[^\/]+\W+[^\/]+","playable_url_quality_hd"/g);
            if (matchCdnVidUrl && matchCdnVidUrl[0])
            {
               video[0] = parseEncodedURI(matchCdnVidUrl[0]);
            }
         }
      }
      else
      {
         // if loaded security check(or captcha) page
         matchVideosURL = fbCdnVideoPage.match(/video_redirect\/\?src=https\W+[^\/]+\.fbcdn.net\W.+\.mp4\W.+&amp;source/g);
         if (matchVideosURL && matchVideosURL[0])
         {
            // get rid of words not related to real video URL
            let encodedURI = matchVideosURL[0].replace('video_redirect/?src=', '');
            encodedURI = encodedURI.replace('&amp;source', '');
            
            // decode URI component
            encodedURI = decodeURIComponent(encodedURI);
            
            // Decode encoded URL to standard
            video = parseEncodedURI(encodedURI);
         }
         else
         {
            // Get playable url in case no video url exist in the page source
            matchCdnUrl = fbCdnPrivateVideoPage.match(/"playable_url":"https:\W+[^\/]+\.fbcdn.net+\W+[^\/]+\W+[^\/]+\W+[^\/]+\W+[^\/]+","playable_url_quality_hd"/g);
            if (matchCdnUrl && matchCdnUrl[0])
            {
               video = parseEncodedURI(matchCdnUrl[0]);
            }
         }
      }
   }
   else
   {
      if (matchVideosURL[0])
      {
         // Decode encoded URL to standard
         video = parseEncodedURI(matchVideosURL[0]);
      }
   }
   
   return video;
}

// Decode HTML string from URL
function decodeHtmlFromURL(html)
{
   const txt = document.createElement('textarea');
   txt.innerHTML = html;
   
   return txt.value;
}

/**
 * Parse encoded URL to standard https url
 *
 * @param matchVideosURL
 * @returns {string}
 */
function parseEncodedURI(matchVideosURL)
{
   // Get rid of `","width` & `:"video","src":`` & `"playable_url":"` & `","playable_url_quality_hd"` string in the given URL.
   let videoURIContent = matchVideosURL.replace('&quot;,&quot;width', '');
   videoURIContent = videoURIContent.replace(':&quot;video&quot;,&quot;src&quot;:&quot;', '');
   videoURIContent = videoURIContent.replace('"playable_url":"', '');
   videoURIContent = videoURIContent.replace('","playable_url_quality_hd"', '');
   
   // Encode and Decode url to get rid of Unicode string in the URL.
   let encoded = encodeURI(JSON.parse('"' + videoURIContent.replace(/"/g, '\\"') + '"'));
   let decoded = decodeURI(encoded);
   
   return decodeHtmlFromURL(decoded);
}

/**
 * Parse private video URL
 *
 * @param parseStr
 * @returns {string}
 */
function parsePrivateVideoURI(parseStr)
{
   let parseUrl = parseStr.replace('"base_url":"', '');
   parseUrl = parseUrl.replace('","bandwidth"', '');
   parseUrl = decodeURIComponent(parseUrl);
   
   return parseEncodedURI(parseUrl);
}

/**
 * Get publish video page URL and AuthorID for Authentication Post. Authenticated post isn't loaded on the published pages, so it returns an error while getting real video.
 *
 * @param postUrl
 * @returns {Promise<unknown>}
 */
async function getVideoPublicURLByPost(postUrl)
{
   return new Promise((resolve, reject) =>
   {
      fetch(postUrl,
         {credentials: 'omit'}
      )
         .then(response =>
         {
            if (response != null)
               resolve(response.url);
            else
            {
               Log_WriteWarning("No result getting public video url \"" + postUrl + "\"");
               resolve(null);
            }
         })
         .catch(error =>
         {
            Log_WriteError("Error getting video url \"" + postUrl + "\": " + error);
            reject(postUrl);
         });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

/**
 * Get HTML page to parse Facebook CDN Mp4(real video) URL
 * @param video Publish video URL
 * @returns {Promise<unknown>}
 */
async function getFacebookCDNVideoPage(video)
{
   return new Promise((resolve, reject) =>
   {
      fetch(video)
         .then(response =>
         {
            if (response != null)
            {
               response.text().then(r =>
               {
                  resolve(r);
               });
            }
            else
            {
               Log_WriteWarning("No result getting CDN video page from url \"" + video + "\"");
               resolve(null);
            }
         })
         .catch(error =>
         {
            Log_WriteError("Error getting video url \"" + video + "\": " + error);
            reject(video);
         });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function addPostToSavedAndScrape(elem, action)
{
   assert(action != null);
   
   DisplayMessage(Str('Saving post...'), 'busy');
   
   // here we loop twice in case we don't find the "done" button because if the post
   // was already saved this code would "unsave" it so then we have to save it again,
   // and this behavior is desireable because we need this post to be the last saved one
   let buttonSaveElement = null;
   for (let i = 0; buttonSaveElement == null && i < 2; i++)
   {
      // open the dialog if it isn't open
      if (i == 1 && findElement(srchPathFBP('actionsDialog')) == null)
      {
         let buttonElement = findElement(srchPathFBP("articleActionsButton"), null, elem);
         if (buttonElement == null)
         {
            DisplayMessage("This post is not supported", 'error');
            Log_WriteError("articleActionsButton not found!");
            return;
         }
         buttonElement.click();
         await sleep(1);
      }
      
      // if we find the "unsave" option we'll unsave and then save it again as it has to
      // be the first item in the saved list
      buttonSaveElement = await waitForElement(srchPathFBP("articleSave"), 2)
      let buttonUnsaveElement = await waitForElement(srchPathFBP("articleUnsave"), 2)
      if (buttonSaveElement == null && buttonUnsaveElement == null)
      {
         DisplayMessage("This post is not supported", 'error');
         return;
      }
      if (buttonSaveElement)
         buttonSaveElement.click()
      else if (i == 0)
         buttonUnsaveElement.click()
      else
      {
         DisplayMessage("This post is not supported", 'error');
         Log_WriteError("articleSave not found!");
         return;
      }
      
      await sleep(1);
   }
   
   let dialog = await waitForElement(srchPathFBP("articleSaveToListDialog"), 3)
   if (dialog == null)
   {
      DisplayMessage("This post is not supported", 'error');
      Log_WriteError("articleSaveToListDialog not found!");
      return;
   }
   
   let anyItem = await waitForElement(srchPathFBP("articleSaveToListAnyItem"), 3, dialog);
   if (anyItem == null)
   {
      DisplayMessage("This post is not supported", 'error');
      Log_WriteError("articleSaveToListAnyItem not found!");
      return;
   }
   
   let scrollable = Utilities_GetScrollableParentElement(anyItem);
   
   let lastHeight = scrollable.scrollHeight
   do
   {
      scrollable.scrollTo(0, scrollable.scrollHeight);
      await sleep(3);
      if (lastHeight < scrollable.scrollHeight)
      {
         lastHeight = scrollable.scrollHeight;
      }
      else
      {
         break;
      }
   } while (true);
   
   let saveToList = await waitForElement(srchPathFBP("articleSaveToList"), 3, dialog);
   if (saveToList == null)
   {
      let createCollectionButton = await waitForElement(srchPathFBP("articleCreateCollectionButtonClick"), 3, dialog);
      if (createCollectionButton == null)
      {
         DisplayMessage("This post is not supported", 'error');
         Log_WriteError("articleCreateCollectionButtonClick not found!");
         return;
      }
      let createCollectionEdit = await waitForElement(srchPathFBP("articleCreateCollectionEdit"), 3, dialog);
      if (createCollectionEdit == null)
      {
         DisplayMessage("This post is not supported", 'error');
         Log_WriteError("articleCreateCollectionEdit not found!");
         return;
      }
      
      // DRL FIXIT? Can we use insertText() here instead and can the selectContent parameter below be "false"?
      if (!await pasteText(createCollectionEdit, 'For Automation Only', false, false, true))
      {
         DisplayMessage("This post is not supported", 'error');
         Log_WriteError('Unable to set collection name!');
         return;
      }
      
      let saveCollectionButton = await waitForElement(srchPathFBP("articleSaveCollectionButtonClick"), 3, dialog);
      if (saveCollectionButton == null)
      {
         DisplayMessage("This post is not supported", 'error');
         Log_WriteError("articleSaveCollectionButtonClick not found!");
         return;
      }
   }
   
   // with a menu we'll get a notice (click has no effect) and with a dialog it has to be closed
   let buttonDone = await waitForElement(srchPathFBP("articleSaveDoneClick"), 3, dialog)
   if (buttonSaveElement && buttonDone == null)
   {
      DisplayMessage("This post is not supported", 'error');
      Log_WriteError("articleSaveDoneClick not found!");
      return;
   }
   
   DisplayMessage(Str('Going to saved post...'), 'busy');
   
   // it looks like if we don't wait a bit here the new tab can get to the page before the post does
   await sleep(2);
   
   let [wrapper, savedPostInfo] = await getPostBasicsFromFacebook(elem, null);
   
   // we will create a new tab to scrape the saved post, and it will handle the action
   return reqCreateTab(null, 'GET', constantPaths.Facebook.savedPostsPage, {}, false, false, [{
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,      // bit of a hack to avoid a round trip to get it
      action: 'scrapeFirstFacebookPostFromSavedPage', // this is the first thing the new tab will do
      nextAction: action,                             // this is the second thing the new tab will do
      savedPostInfo: savedPostInfo
   }]);
}

async function checkPostAvailableScrapingMethodAndScrape(elem, action)
{
   DisplayMessage(Str("Checking post..."), 'busy');
   
   try
   {
      let postContainer = findElement(srchPathFBP('postContainerForCheckingAvailableScrapingMethod'), null, elem);
      if (postContainer == null)
      {
         Log_WriteError('postContainerForCheckingAvailableScrapingMethod not found at: ' + window.location.href);
         DisplayMessage(Str("Sorry, we don't support this post at the moment."), 'error', null, 5);
         return;
      }
      
      let url = await checkIfCanRetrievePostPermalinkDirectly(elem)
      if (url)
      {
         Log_WriteInfo('scrapePostByDirectPermalink: ' + url);
         await scrapePostByPermalink(postContainer, url, action);
         return;
      }
      
      // Done over share button to retrieve the href
      url = await checkIfCanRetrievePostHrefViaShareButton(postContainer)
      if (url)
      {
         Log_WriteInfo('scrapePostByShareButton: ' + url);
         await scrapePostByPermalink(postContainer, url, action);
         return;
      }
      
      let postActionsBoxButton = findElement(srchPathFBP('postActionsBoxBtnForCheckingAvailableScrapingMethod'), null, postContainer);
      if (postActionsBoxButton == null)
      {
         Log_WriteError('postActionsBoxBtnForCheckingAvailableScrapingMethod not found at: ' + window.location.href);
         Log_WriteDOM(postContainer);
         DisplayMessage(Str("Sorry, we don't support this post at the moment."), 'error', null, 5);
         return;
      }
      
      postActionsBoxButton.click();
      
      let postActionsBox = await waitForElement(srchPathFBP('postActionsBoxForCheckingAvailableScrapingMethod'));
      if (postActionsBox == null)
      {
         Log_WriteError('postActionsBoxForCheckingAvailableScrapingMethod not found at: ' + window.location.href);
         DisplayMessage(Str("Sorry, we don't support this post at the moment."), 'error', null, 5);
         return;
      }
      
      // Done over Embed box
      let postCanBeScrapedOverEmbed = checkIfPostCanBeScrapedViaEmbed(postActionsBox);
      if (postCanBeScrapedOverEmbed)
      {
         Log_WriteInfo('scrapingViaEmbed');
         if (await scrapingViaEmbed(postContainer, postActionsBox, action) !== false)
            return;
      }
      
      // Done over saving (the slowest way)
      let postCanBeScrapedOverSaving = checkIfPostCanBeSavedForScraping(postActionsBox, postContainer)
      if (postCanBeScrapedOverSaving)
      {
         Log_WriteInfo('addPostToSavedAndScrape');
         await addPostToSavedAndScrape(postContainer, action)
         return;
      }
      
      // DRL FIXIT! I think we should have a different selector for closing in case we need it later!
      postActionsBoxButton.click();
      
      // ====================================================================
      // DEVELOPERS: While testing scraping I find it useful to move these to the top
      // of this method as they take me to the linked post faster, but be aware that
      // sometimes the link isn't accurate so try to fix those cases.
      // ====================================================================
      
      // The following are risky (could scrape the wrong URL, or a non-permanent URL) so we leave them as a last resort...
      
      // Done over postedTime href
      let canRetrievePostHrefViaPostedTimeLink = checkIfRetrievePostHrefViaPostedTimeLink(postContainer);
      if (canRetrievePostHrefViaPostedTimeLink)
      {
         Log_WriteInfo('scrapePostHrefViaPostedTimeLink');
         await scrapePostHrefViaPostedTimeLink(postContainer, canRetrievePostHrefViaPostedTimeLink, action);
         return;
      }
      
      // Done over image tag <a> href
      url = checkIfPostCanBeSavedByImageAHref(postContainer);
      if (postCanBeSavedByImageAHref)
      {
         Log_WriteInfo('scrapePostByImageAHref: ' + url);
         await scrapePostByPermalink(postContainer, url, action);
         return;
      }
   }
   catch (e)
   {
      Log_WriteException(e, 'Unable to scrape post at: ' + window.location.href);
   }
   
   DisplayMessage(Str("Sorry, we don't support this post at the moment."), 'error', null, 5);
}

function checkIfRetrievePostHrefViaPostedTimeLink(postContainer)
{
   let postedTimeLink = findElement(srchPathFBP('postHrefViaPostedTimeLink'), null, postContainer)
   if (postedTimeLink == null)
   {
      return false;
   }
   return postedTimeLink;
}

async function scrapePostHrefViaPostedTimeLink(elem, postHref, action)
{
   let [wrapper, savedPostInfo] = await getPostBasicsFromFacebook(elem, postHref);
   
   return reqCreateTab(null, 'GET', postHref, {SA_PAUSE_VIDEOS: 1}, false, false, [{
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
      action: 'scrapeFacebookPost',               // this is the first thing the new tab will do
      nextAction: action,
      savedPostInfo: savedPostInfo
   }]);
}

async function checkIfCanRetrievePostPermalinkDirectly(elem)
{
   
   // DRL Not sure whether the '#' check is required or do we sometimes not get the full URL from href?
   if (elem.tagName == 'A' && elem.href != '#' && !elem.href.includes('facebook.com/#'))
   {
      let url = elem.href;
      
      if (url.includes('multi_permalinks='))
         return false;   // this takes you to a page with multiple posts on it
      
      if (url.includes('&view=permalink'))
      {
         // if it contains anything after the view=permalink parameter strip it as it's not part of the permalink
         url = url.split('&view=permalink')[0] + '&view=permalink';
      }
      else
      {
         // if it contains a parameter with a square bracket it seems we should ignore all the parameters
         // https://www.facebook.com/groups/1439786486213633/posts/2293105437548396/?__cft__[0]=AZU5yZrj-zo7bY4exkn4suD_XWm5ikr6InqivC_3dyzudPcg7lTA-T4putn7FhXwSfiFekLGFc6b9-sCVDJDkiTz5o3oUoYEN4zVI6cPhV4XGQfxqF_BL5THAp0K_7VQMVBdlv2T6FiwnaaefKZqg6iL&__tn__=%2CO%2CP-R
         let params = Url_GetAllParams(url);
         for (let param in params)
         {
            if (param.includes('['))
               url = Url_StripParams(url);
         }
      }
      
      url = Url_StripFragments(url);  // sometimes I saw a # at the end
      
      return url;
   }
   return false;
}

async function checkIfCanRetrievePostHrefViaShareButton(postContainer)
{
   let postShareButton = findElement(srchPathFBP('postShareButton'), null, postContainer)
   if (postShareButton == null)
   {
      return false;
   }
   postShareButton.click()
   let copyLinkButton = await waitForElement(srchPathFBP('postShareDialogCopyLinkButton'), 2);
   if (copyLinkButton == null)
   {
      postShareButton.click()
      return false;
   }
   copyLinkButton.click()
   await waitForElement(srchPathFBP('postShareDialogCopyConfirmationBox'))
   let href = false;
   for (let i = 0; !href && i < 5; i++)
   {
      let testHref = MyClipboard.GetClipboardText();
      if (testHref.includes('facebook.com'))
      {
         href = testHref
         break;
      }
      await sleep(1)
   }
   postShareButton.click()
   return href;
}

async function scrapePostByPermalink(elem, url, action)
{
   let [wrapper, savedPostInfo] = await getPostBasicsFromFacebook(elem, url);
   
   action = {
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
      action: 'scrapeFacebookPost',               // this is the first thing the new tab will do
      nextAction: action,
      savedPostInfo: savedPostInfo
   };
   
   // if we're already on the permalink page scrape it here
   if (fuzzyUrlsMatch(url, window.location.href, ['post_id', 'multi_permalinks', 'v']))
   {
      action.originalTabID = null;    // we're not opening a new tab so don't close this one
      scrapeFacebookPost(elem, action);
      return null;
   }
   
   // otherwise open a tab with the permalink and scrape it there, then return here
   return reqCreateTab(null, 'GET', url, {SA_PAUSE_VIDEOS: 1}, false, false, [action]);
}

function checkIfPostCanBeSavedByImageAHref(postContainer)
{
   let postHref = findElement(srchPathFBP('checkImagePostHref'), null, postContainer)
   if (postHref == null)
   {
      return false;
   }
   return postHref;
}

async function scrapePostByImageAHref(elem, postHref, action)
{
   let [wrapper, savedPostInfo] = await getPostBasicsFromFacebook(elem, postHref);
   
   return reqCreateTab(null, 'GET', postHref, {SA_PAUSE_VIDEOS: 1}, false, false, [{
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
      action: 'scrapeFacebookPost',               // this is the first thing the new tab will do
      nextAction: action,
      savedPostInfo: savedPostInfo
   }]);
}

function checkIfPostCanBeSavedForScraping(postActionsBox, postContainer)
{
   let result = false;
   
   //Videos who have youtube.com/videocode or youtu.be/videocode inside the text or in the post
   //itself when the save video happens does redirect to the youtube instead of the post page,
   //should use a different scraping method than saving
   if (postContainer.innerHTML.includes('youtube.com') || postContainer.innerHTML.includes('youtu.be'))
   {
      return false;
   }
   let postActionsBoxActionButtons = findElements(srchPathFBP('postActionBoxActionButtonsForScrapingViaSaving'), null, postActionsBox)
   if (postActionsBoxActionButtons.length > 0)
   {
      result = true;
   }
   return result;
}

function checkIfPostCanBeScrapedViaEmbed(postActionsBox)
{
   let result = false;
   let postActionsBoxActionButtons = findElements(srchPathFBP('checkPostActionBoxActionButtonsForScrapingViaEmbed'), null, postActionsBox)
   if (postActionsBoxActionButtons.length > 0)
   {
      result = true;
   }
   return result;
}

async function scrapingViaEmbed(elem, postActionsBox, action)
{
   let postActionsBoxActionButtons = findElement(srchPathFBP('postActionBoxActionButtonsForScrapingViaEmbed'), null, postActionsBox)
   if (postActionsBoxActionButtons == null)
   {
      Log_WriteError('postActionBoxActionButtonsForScrapingViaEmbed not found at: ' + window.location.href);
      Log_WriteDOM(postActionsBox);
      return false;
   }
   
   postActionsBoxActionButtons.click()
   
   let postHref = await waitForElement(srchPathFBP('postHrefScrapingViaEmbed'), 3);
   if (postHref == null)
   {
      Log_WriteError('postHrefScrapingViaEmbed not found at: ' + window.location.href);
      Log_WriteDOM(postActionsBox);
      return false;
   }
   
   let closeEmbedDialogBtn = findElement(srchPathFBP('closeEmbedDialogButton'))
   if (closeEmbedDialogBtn == null)
   {
      Log_WriteError('closeEmbedDialogButton not found at: ' + window.location.href);
      Log_WriteDOM(postActionsBox);
      return false;
   }
   
   closeEmbedDialogBtn.click()
   
   let [wrapper, savedPostInfo] = await getPostBasicsFromFacebook(elem, postHref);
   
   return reqCreateTab(null, 'GET', postHref, {SA_PAUSE_VIDEOS: 1}, false, false, [{
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // bit of a hack to avoid a round trip to get it
      action: 'scrapeFacebookPost',               // this is the first thing the new tab will do
      nextAction: action,
      savedPostInfo: savedPostInfo
   }]);
}

async function scrapeStoryByCardUrl(elem, action)
{
   DisplayMessage(Str("Checking story video..."), 'busy');
   
   assert(elem != null);
   assert(typeof action === 'string' || action instanceof String);
   
   // we have to recheck here because in the case of the story_tray we could be looking at someone else's story
   let elems = findElements(srchPathFBS('facebookStoryContentPanel'));
   if (elems.length == 0)
   {
      DisplayMessage(Str('You may only use this feature with your own story.'), 'error', null, 5);
      return;
   }
   
   DisplayMessage(Str('Getting story information...'), 'busy');
   
   let accountInfo = getFacebookAccountInfo();
   if (accountInfo == null)
   {
      assert(0);
      return;
   }
   
   let storyID = findElement(srchPathFBS('storyId'), null, elem);
   let postUrl = 'https://www.facebook.com/stories/?card_id=' + Url_EncodeURIComponent(storyID) + '&view_single=true';
   
   action = {
      originalTabID: BACKGROUND_PROVIDED_TAB_ID,  // a bit of a hack to avoid a round trip to get it
      action: 'scrapeFacebookStory',               // this is the first thing the new tab will do
      nextAction: action,
      savedPostInfo: {
         accountInfo,
         postUrl,
         storyID
      }
   };
   
   // if we're already on the permalink page scrape it here
   if (fuzzyUrlsMatch(postUrl, window.location.href, ['card_id']))
   {
      action.originalTabID = null;    // we're not opening a new tab so don't close this one
      await scrapeFacebookStory(action);
      return null;
   }
   
   // otherwise open a tab with the permalink and scrape it there, then return here
   return reqCreateTab(null, 'GET', postUrl, {SA_PAUSE_VIDEOS: 1}, false, false, [action]);
}
