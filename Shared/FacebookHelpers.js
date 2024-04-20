function srchPath(scraper, item)
{
   if (!elementPaths.hasOwnProperty(scraper) || !elementPaths[scraper].hasOwnProperty(item))
      throw new Error('Missing from Constants.js: elementPaths.' + scraper + '.' + item);
   return elementPaths[scraper][item];
}

function srchPathPG(item)
{
   return srchPath('Pages', item);
}

function srchPathFB(item)
{
   return srchPath('Facebook', item);
}

function srchPathFBFL(item)
{
   return srchPath('FacebookFrd', item);
}

function srchPathFBM(item)
{
   return srchPath('FacebookMsgs', item);
}

function srchPathFBS(item)
{
   return srchPath('FacebookStories', item);
}

function srchPathFBP(item)
{
   return srchPath('FacebookPosts', item);
}

function srchPathFBGP(item)
{
   return srchPath('FacebookGroupPosts', item);
}

function srchPathFBC(item)
{
   return srchPath('FacebookComments', item);
}

function srchPathFBPF(item)
{
   return srchPath('FacebookProfile', item);
}

function srchPathFBG(item)
{
   return srchPath('FacebookGroups', item);
}

function srchPathIGM(item)
{
   return srchPath('InstagramMsgs', item);
}

function srchPathIGP(item)
{
   return srchPath('InstagramPosts', item);
}

function srchPathPIS(item)
{
   return srchPath('PinterestScrape', item);
}

function srchPathTTP(item)
{
   return srchPath('TikTokScrape', item);
}

function srchPathTTM(item)
{
   return srchPath('TikTokMessages', item);
}

function srchPathTWS(item)
{
   return srchPath('TwitterScrape', item);
}

function keywordFBP(item)
{
   return localizedKeyword('FacebookPosts', item);
}

function keywordFBM(item)
{
   return localizedKeyword('FacebookMsgs', item);
}

function keywordFBFL(item)
{
   return localizedKeyword('FacebookFrd', item);
}

function keywordFBG(item)
{
   return localizedKeyword('FacebookGroups', item);
}

function keywordFBPF(item)
{
   return localizedKeyword('FacebookProfiles', item);
}

function keywordIGM(item)
{
   return localizedKeyword('InstagramMsgs', item);
}

function keywordPIS(item)
{
   return localizedKeyword('PinterestScrape', item);
}

function keywordTWS(item)
{
   return localizedKeyword('TwitterScrape', item);
}


// returns appropriate email format ID
async function getFacebookAddressFromUrl(url, format)
{
   if (url.includes('/stories/'))
   {
      Log_WriteErrorCallStack('Got unexpected URL that we cannot convert to an address: ' + url + ' at ' + window.location.href);
      return null;
   }
   
   if (Url_GetPath(url) == '')
   {
      // empty path means we're given the Facebook home page
      return null;
   }
   
   if (url.includes('profile.php') ||   // the user hasn't set up a handle yet if we find this
      url.includes('permalink.php'))    // not sure why this happens
   {
      // the URL will have the format https://www.facebook.com/profile.php?id=100004310352161
      
      const urlParams = new URLSearchParams(new URL(url).search);
      return await getFacebookAddressFromId(urlParams.get('id'), format, 'fbperid');
   }
   
   if (url.includes('/events/') && url.includes('post_id'))
   {
      // the URL will have the format https://www.facebook.com/events/904302854019912/?post_id=904302860686578&view=permalink
      
      let [postID, postUrl] = getPostIdAndPermalinkFromFacebookUrl(url);
      // DRL FIXIT? We don't know if this is in a group?
      return await getFacebookAddressFromId(postID, format, 'fbp_post');
   }
   
   let idType = null;
   if (url.includes('/groups/'))
   {
      idType = 'fbgroup';
      
      if (url.includes('/user/'))
      {
         // the URL points to a user in a group, so skip all the group stuff
         url = url.substring(0, url.indexOf('/groups/')) + url.substring(url.indexOf('/user/') + 5);
         idType = 'fbperid';
      }
      else
      {
         // skip over the "groups" segment
         url = Utilities_ReplaceInString(url, '/groups/', '/');
      }
   }
      // For video posts the author address looks like this so we strip the ending.
   // https://www.facebook.com/someusername/videos/123456789
   else if (url.includes('/videos/'))
   {
      url = url.substring(0, url.indexOf('/videos/'));
   }
      // For live posts the author address looks like this so we skip over the "watch".
   // https://www.facebook.com/watch/someusername/
   else if (url.includes('/watch/'))
   {
      url = Utilities_ReplaceInString(url, '/watch/', '/');
   }
   
   // get the first segment from a URL like:
   // https://www.facebook.com/brandyshvr/about_contact_and_basic_info
   let id = Url_GetPath(url).split('/')[0];
   
   // this will get us an appropriate suffix depending on the type of the ID (user, page, group)
   return await getFacebookAddressFromId(id, format, idType);
}

function _MultiRegexpMatch(str, exp)
{
   if (!Array.isArray(exp))
      exp = [exp];
   for (let x of exp)
   {
      x = ApplySelectorVariables(x);
      let res = str.match(new RegExp(x));
      if (res != null && res.length > 0)
         return res;
   }
   
   return null;
}

async function _CheckUsernameIdMatch(username, id)
{
   if (Utilities_IsInteger(username))
   {
      if (username != id)
         Log_WriteInfo('Username "' + username + '" does not match ID "' + id + '"');
      return username == id;
   }
   
   let url = await getFinalUrl('https://www.facebook.com/' + id);
   // the above sometimes led to a page saying that we're blocked but trying again with the below worked
   if (!url.includes('profile.php') && !url.toLowerCase().includes(strtolower(username)))
   {
      Log_WriteInfo('URL with ID "' + id + '" leads to "' + url + '" therefore trying profile.php URL');
      url = await getFinalUrl('https://www.facebook.com/profile.php?id=' + id);
   }
   if (url.includes('profile.php'))
   {
      Log_WriteInfo('ID "' + id + '" leads to a profile with no handle, therefore cannot match username "' + username + '"');
      return false;                        // user hasn't set up a handle
   }
   
   // get the first or second segment from a URL like:
   //    https://www.facebook.com/brandyshvr or https://www.facebook.com/groups/brandyshvr
   let temp = url.includes('/groups/')
      ? url.substring(url.indexOf('/groups/') + 8).split('/')[0]
      : Url_GetPath(url).split('/')[0];
   if (strtolower(temp) != strtolower(username))
      Log_WriteInfo('Username "' + username + '" does not match URL segment "' + temp + '" from: ' + url);
   return strtolower(temp) == strtolower(username);
}

async function _getFacebookAddressFromHtml(id, format, formatIfKnown, url, html)
{
   let suffix = '@fbpage.socialattache.com';
   let match = _MultiRegexpMatch(html, srchPathFB('extractPageID'));
   Log_WriteInfo("A " + (match == null ? 'null' : match.length));
   if (match == null || match.length < 2 || !await _CheckUsernameIdMatch(id, match[1]))
      match = null;
   
   Log_WriteInfo("B " + (match == null ? 'null' : match.length));
   if (match == null || match.length < 2)
   {
      suffix = '@fbgroup.socialattache.com';
      match = _MultiRegexpMatch(html, srchPathFB('extractGroupID'));
      Log_WriteInfo("C " + (match == null ? 'null' : match.length));
      if (match == null || match.length < 2 || !await _CheckUsernameIdMatch(id, match[1]))
         match = null;
   }
   
   Log_WriteInfo("D " + (match == null ? 'null' : match.length));
   // I put this after group or page in case those would match on the user as well
   if (match == null || match.length < 2)
   {
      suffix = '@fbperid.socialattache.com';
      match = _MultiRegexpMatch(html, srchPathFB('extractUserID'));
      
      Log_WriteInfo("E " + (match == null ? 'null' : match.length));
      if (match && match.length >= 2)
      {
         // it looks like a page can have a user ID too so we need to distinguish the two
         
         Log_WriteInfo('Looking for username/ID "' + id + '" and ID "' + match[1] + '" on page.');
         // DRL FIXIT? ItemUN is not used, and our id here is often a numeric ID and not a username.
         setSelectorVariables({ItemUN: id, ItemID: match[1]});
         let pageMatch = _MultiRegexpMatch(html, srchPathFB('isPageType'));
         let userMatch = _MultiRegexpMatch(html, srchPathFB('isUserType'));
         clearSelectorVariables();
         
         if (pageMatch)
            suffix = '@fbpage.socialattache.com';
         else if (!userMatch)
            Log_WriteWarning('No page or user match found, assuming type is "user" for ID ' + id + ' at ' + url);
      }
      
      Log_WriteInfo("F " + (match == null ? 'null' : match.length));
      if (match == null || match.length < 2 || !await _CheckUsernameIdMatch(id, match[1]))
         match = null;
   }
   
   Log_WriteInfo("G " + (match == null ? 'null' : match.length));
   if (match == null || match.length < 2)
   {
      let temp = await getFinalUrl(url);
      if (temp.includes('profile.php') ||   // the user hasn't set up a handle yet if we find this
         temp.includes('permalink.php'))
      {  // not sure why this happens
         suffix = '@fbperid.socialattache.com';
         match = [null, id];
      }
   }
   
   Log_WriteInfo("H " + (match == null ? 'null' : match.length));
   if (match == null || match.length < 2)
   {
      if (!id.includes('groups/'))   // if the facebook.com/handle URL didn't work it's likely a group
         return await getFacebookAddressFromId('groups/' + id, format, formatIfKnown);
      
      Log_WriteErrorCallStack('Facebook user/page/group ' + format + ' ID not extracted from ' + url);
      return null;
   }
   
   let prefix = match[1];
   
   if (format != FacebookAddressFormatUsername)
      return prefix + suffix;
   
   if (suffix != '@fbperid.socialattache.com' && suffix != '@fbpage.socialattache.com')
      return null;                           // it's a group, we don't use usernames for groups
   
   if (!Utilities_IsInteger(id))
      return id + '@fbun.socialattache.com'; // it was already a username
   
   // extract username
   match = _MultiRegexpMatch(html, srchPathFB('extractUserName'));
   if (match && match.length >= 2)
   {
      return match[1] + '@fbun.socialattache.com';
   }
   
   let url2 = await getFinalUrl('https://www.facebook.com/' + prefix);
   if (url2.includes('profile.php'))
   {
      Log_WriteInfo("I user no handle");
      return null;                        // user hasn't set up a handle
   }
   
   // get the first segment from a URL like:
   //    https://www.facebook.com/brandyshvr
   prefix = Url_GetPath(url2).split('/')[0];
   assert(prefix != 'groups');
   if (!Utilities_IsInteger(prefix))
   {
      Log_WriteInfo("J returning " + prefix);
      return prefix + '@fbun.socialattache.com';
   }
   
   // page hasn't set up a handle
   
   Log_WriteInfo("K no page handle");
   return null;
}

// converts a FB username, page name, or group name, or numeric ID (NOT in email format) into an appropriate email format ID
// if the format is known (not guessed) then formatIfKnown can be "fbun", "fbperid", "fbpage" or "fbgroup"
const FacebookAddressFormatAnything = 'any';  // This could return the wrong type!! Use carefully, only when we want fast results over correctness!
const FacebookAddressFormatNumeric = 'numeric';
const FacebookAddressFormatUsername = 'username';

async function getFacebookAddressFromId(id, format, formatIfKnown)
{
   assert(!id.includes('@'));
   return new Promise(async (resolve, reject) =>
   {
      
      // avoid some unnecessary processing if we can
      if (id == null)
      {
         resolve(null);
         return;
      }
      
      if (format == undefined || format == null)
         format = FacebookAddressFormatAnything;
      
      if (formatIfKnown != null)
      {
         if (format == FacebookAddressFormatAnything ||
            (format == FacebookAddressFormatUsername && formatIfKnown == 'fbun') ||
            (format == FacebookAddressFormatNumeric && formatIfKnown != 'fbun'))
         {
            resolve(id + '@' + formatIfKnown + '.socialattache.com');
            return;
         }
      }
      
      if (format == FacebookAddressFormatAnything)
      {
         resolve(id + '@' + (Utilities_IsInteger(id) ? 'fbperid' : 'fbun') + '.socialattache.com');
         return;
      }
      
      let url = 'https://www.facebook.com/' + id;
      
      if (fuzzyUrlsMatch(window.location.href, url))
      {
         // no need to fetch if we're already on the profile/page/group page
         
         // This is a good optimization but in some cases the page we are viewing is not the same as the page we get from
         // a fresh load, and this existing page may not have the ID we need on it. For example if you search for a person
         // by name, then click on the search result, you sometimes get a profile page without the user ID on it.
         let temp = await _getFacebookAddressFromHtml(id, format, formatIfKnown, url, document.documentElement.outerHTML);
         if (temp)
         {
            resolve(temp);
            return;
         }
      }
      
      if (format != FacebookAddressFormatUsername && Utilities_IsInteger(id))
      {
         const finalUrl = await getFinalUrl('https://www.facebook.com/' + id);
         if (finalUrl.includes('profile.php'))
         {
            resolve(id + '@fbperid.socialattache.com');
            return;
         }
         if (finalUrl.includes('/groups/'))
         {
            resolve(id + '@fbgroup.socialattache.com');
            return;
         }
         const aboutUrl = 'https://www.facebook.com/' + id + '/about';
         let html = await fetchPage(aboutUrl);
         if (html == null)
         {
            Log_WriteInfo('Got null response for: ' + aboutUrl)
            resolve(null);
            return;
         }
         if (html.includes("Profile transparency"))
         {
            resolve(id + '@fbperid.socialattache.com');
            return;
         }
         if (html.includes("Page transparency"))
         {
            resolve(id + '@fbpage.socialattache.com');
            return;
         }
      }
      else if (format == FacebookAddressFormatUsername && !id.includes('groups/'))
      {
         let finalUrl = await getFinalUrl(url);
         // the above sometimes led to a page saying that we're blocked but trying again with the below worked
         if (!finalUrl.includes('profile.php') && finalUrl.includes(id))
         {
            Log_WriteInfo('URL with ID "' + id + '" leads to "' + finalUrl + '" therefore trying profile.php URL');
            finalUrl = await getFinalUrl('https://www.facebook.com/profile.php?id=' + id);
         }
         if (finalUrl.includes('profile.php'))
         {
            resolve(id + '@fbperid.socialattache.com');
            return;
         }
         if (finalUrl.includes('/groups/'))
         {
            let handle = url.substring(url.indexOf('/groups/') + 8).split('/').at(0);
            if (Utilities_IsInteger(handle))
               resolve(handle + '@fbgroup.socialattache.com');
            else
               resolve(handle + '@fbun.socialattache.com');
            return;
         }
         
         // format: https://www.facebook.com/username/?blah
         let handle = finalUrl.substring(url.indexOf('facebook.com/') + 13).split('/').at(0);
         
         const aboutUrl = 'https://www.facebook.com/' + handle + '/about';
         let html = await fetchPage(aboutUrl);
         if (html == null)
         {
            Log_WriteInfo('Got null response for: ' + aboutUrl)
         }
         else
         {
            let type = null;
            
            Log_WriteInfo('Looking for username "' + handle + '" and ID "' + id + '" on page to identify the type.');
            
            // DRL FIXIT? The "Xxx transparency" items don't seem to be matching, is this the same problem as mentioned for fetch() below??
            if (html.includes('Profile transparency') || html.includes('fb://profile/' + id))
               type = 'fbperid';
            if (html.includes('Page transparency'))
               type = 'fbpage';
            
            if (type == null)
            {
               // the above didn't work, try this method...
               setSelectorVariables({ItemUN: handle, ItemID: id});
               let pageMatch = _MultiRegexpMatch(html, srchPathFB('isPageType'));
               let userMatch = _MultiRegexpMatch(html, srchPathFB('isUserType'));
               clearSelectorVariables();
               
               type = 'fbperid';
               if (pageMatch)
                  type = 'fbpage';
               else if (!userMatch)
                  Log_WriteWarning('No page or user match found, assuming type is "user" for handle ' + handle + ' at ' + aboutUrl);
            }
            
            if (type != null)
            {
               if (Utilities_IsInteger(handle))
                  resolve(handle + '@' + type + '.socialattache.com');
               else
                  resolve(handle + '@fbun.socialattache.com');
               return;
            }
         }
      }
      
      if (window.location.protocol != 'chrome-extension:' &&   // when used from background script
         window.location.hostname != 'www.facebook.com')
      {
         // we can't make a cross origin request due to CORS, but this case should be when we're in Messenger so
         // we shouldn't need the username there so this can be just a warning
         if (window.location.hostname == 'www.messenger.com')
            Log_WriteInfo('Unable to fetch Facebook username from Messenger due to CORS for ID: ' + id);
         else
            Log_WriteError('Unable to fetch Facebook username from ' + window.location.hostname + ' due to CORS for ID: ' + id);
         resolve(null);
         return;
      }
      
      // DRL FIXIT! We could add a check here for a FB ID that is generated from an Instagram profile
      // such as https://www.facebook.com/messages/t/116216323105777 which maps to https://www.instagram.com/saltyfoamfollower
      
      // DRL FIXIT! When parsing comments we could get several duplicates here so we should cache the result
      // to avoid needless processing as this is not cheap.
      // DRL FIXIT! This sometimes results in different content than if we loaded the page in the browser! The
      // result is that sometimes our matching fails because the content we need isn't on the page.
      // we have to be logged in to Facebook get the HTML so we have to do this on the content script side
      fetch(url)
         .then(response => response ? response.text() : null)
         .then(async html =>
         {
            if (html != null)
            {
               // this could be a closed profile or it could be a Facebook ID for an Instagram account
               const temp = html.match(new RegExp(keywordFBPF('UnavailableProfile')));
               if (temp != null && temp.length >= 1)
               {
                  Log_WriteInfo('Unavailable profile for ID ' + id + ' in HTML from: ' + url);
                  resolve(null);
                  return;
               }
               
               Log_WriteInfo('Looking for ID ' + id + ' in HTML from: ' + url);
               resolve(await _getFacebookAddressFromHtml(id, format, formatIfKnown, url, html));
            }
            else
            {
               Log_WriteWarning('Empty response getting user/page/group ID from url: ' + url);
               resolve(null);
            }
         })
         .catch(error =>
         {
            Log_WriteException(error, 'Error getting user/page/group ID from url: ' + url);
            resolve(null);
         });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function getConversationIdFromMessengerUrl(url)
{
   const temp = url.match(new RegExp(srchPathFBM('conversationIdChats')));
   if (temp == null || temp.length < 2)
   {
      Log_WriteErrorCallStack('Conversation ID not extracted from ' + url);
      return null;
   }
   return temp[1];
}

// this is ONLY used for the "Get Permalink" button so we can place something in the database to check that the
// URL being used for a permalink is correct
async function getPostBasicsFromFacebookUrl(url)
{
   let messageBoxID = await getMessageBoxIDFromPostUrl(url);
   let [postID, postUrl] = getPostIdAndPermalinkFromFacebookUrl(url);

   let type = messageBoxID.includes('fbgroup') ? 'fbp_gpost' : 'fbp_post';
   postID = validateAddress(postID + '@' + type + '.socialattache.com');

   return {
      Uid: postID,
      Type: type,
      Date: timestampToString(Date.now()),
      Folder: 'inbox',
      Url: url,   // we use the permalink passed in so that it matches what's in the database (whereas postUrl may be different?)
      Name: null,
      From: null,
      To: [messageBoxID],
      Body: 'Imported for Permalink Only',   // checked in Messages.php
      Attachments: [],
      Buttons: [],
      message: null
   };
}

// Get Post Id From Urls such as:
// https://www.facebook.com/groups/129526895774858/permalink/260904812637065/
// https://www.facebook.com/SurvivalistTips/photos/a.615417841881917/4295387313884933/?type=3
// https://www.facebook.com/radiogazetadojacui/posts/4456533514444729
// https://www.facebook.com/watch/?ref=saved&v=1062559677915713
// https://www.facebook.com/groups/1898519450164808/?hoisted_section_header_type=recently_seen&multi_permalinks=6179158048767572
// https://www.facebook.com/events/904302854019912/?post_id=904302860686578&view=permalink
function getPostIdAndPermalinkFromFacebookUrl(url)
{
   let urlArray = url.split('/')
   let postID = 0;
   let permalink = null;   // NOTE: A permalink must be the same EVERY time we get it, so it can't contain any
                           // date or a parameter with a comment ID because the next time we try to get the
                           // URL for the same post it may have a different date or comment ID, for example.
   const stripURL = Url_StripParams(url);
   const multiPermalinksUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/groups\/?(.*)multi_permalinks=[0-9]*/gm;
   const groupUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/groups/gm;
   const picturePostUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/(.*)\/photos\/a.[0-9]*\/[0-9]*/gm;
   const videoWatchPostUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/watch\/\?(ref=(.*))(v=[0-9]+)/gm;
   const noRefVideoWatchPostUrl = /(https:\/\/|http:\/\/)?(.*)facebook(.*)\/watch(.*)\?(v=[0-9]+)/gm;
   const pagePostUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/(.*)\/posts\/([a-zA-Z0-9]+)\/?/gm;
   const reelUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/reel\/([0-9]+)\/?/gm;
   const eventUrl = /(https:\/\/|http:\/\/)?(.*)facebook?(.*)\/events\/([0-9]+)\/\?post_id=([0-9]+)&/gm;
   if (multiPermalinksUrl.test(url))
   {
      let m = new URL(url);
      postID = m.searchParams.get('multi_permalinks');
      permalink = stripURL + '?multi_permalinks=' + postID;  // remove all other parameters
   }
   else if (groupUrl.test(url))
   {
// DRL William, my URL looked like this and we want the permalink ID I believe?
// https://www.facebook.com/groups/TheGameofNetworking/permalink/2194254430724661/?SA_action=addOrRemoveAutomation
//        postID = urlArray[4]
      postID = urlArray[6]
      permalink = stripURL;  // remove parameters
   }
   else if (picturePostUrl.test(url))
   {
      postID = urlArray[6]
      permalink = stripURL;  // remove parameters
   }
   else if (videoWatchPostUrl.test(url) || noRefVideoWatchPostUrl.test(url))
   {
      const idRegex = /(v=[0-9]+)/gm;
      postID = url.match(idRegex)[0].replace('v=', "");
      permalink = stripURL + '?v=' + postID; // remove all other parameters
   }
   else if (pagePostUrl.test(url))
   {
      postID = urlArray[5].split('?')[0]; // remove parameters
      permalink = stripURL;
   }
   else if (reelUrl.test(url))
   {
      postID = urlArray[4].split('?')[0]; // remove parameters
      permalink = stripURL;
   }
   else if (eventUrl.test(url))
   {
      // note urlArray[4] is the event ID
      let m = new URL(url);
      postID = m.searchParams.get('post_id');
      permalink = stripURL + '?post_id=' + postID + '&view=permalink';  // remove all other parameters
   }
   else
   {
      let m = new URL(url);
      postID = m.searchParams.get('fbid');
      if (postID)
         permalink = stripURL + '?fbid=' + postID; // remove all other parameters
      else
      {
         postID = m.searchParams.get('story_fbid');
         if (postID)
            permalink = stripURL + '?story_fbid=' + postID; // remove all other parameters
         else
         {
            m = url.match(/facebook\.([a-z]+)\/([a-z0-9._-]+)\/([a-z]+)\/([0-9]+)/i);
            if (m == null)
            {
               Log_WriteErrorCallStack('The format of this post URL is not supported: ' + url);
               return [null, null];
            }
            postID = m[4];
            permalink = stripURL;  // remove all parameters
         }
      }
   }
   if (!Utilities_IsAlphaNumeric(postID))
   {
      Log_WriteErrorCallStack("Got invalid post ID " + postID + " from URL: " + url);
      return [null, null];
   }
   
   return [postID, permalink];
}

function getMessengerConversationID(url)
{
   let originalUrl = url;
   
   // when looking at an attachment the URL would be something like this so we grab the thread_id:
   // https://www.messenger.com/messenger_media?attachment_id=787544726406265&message_id=mid.%24cAABa-9lhZ-iPTgJ6iGJHL0pK-g8H&thread_id=100038244191388
   let threadID = Url_GetParam('thread_id');
   if (threadID)
      return threadID;
   
   url = Url_StripFragments(Url_StripParams(url));
   
   let i = url.indexOf('/t/');
   if (i == -1)
   {
      return null;
   }
   url = url.substr(i + 3);
   i = url.indexOf('/');
   if (i != -1)
      url = url.substr(0, i);
   if (!Utilities_IsInteger(url))
   {
      Log_WriteErrorCallStack("Non-integer conversation ID \"" + url + "\" from: " + originalUrl);
   }
   return url;
}
