function getCommentTimestampDelta(comment)
{
   let timeText = findElement(srchPathFBC('commentTimestamp'), null, comment);
   if (timeText == null)
   {
      Log_WriteError('Time delta not found for comment on post, using 1h: ' + window.location.href);
      Log_WriteDOM(comment);
      timeText = '1h';
   }
   return timeToDelta(timeText);
}

function massageFromRoles(roles, addRole)
{
   let referenceRoles = keywordFBM('MessageFromRoles');
   for (let i = 0; i < roles.length; i++)
   {
      let found = false;
      for (let role in referenceRoles)
      {
         if (roles[i].toLowerCase() == referenceRoles[role].toLowerCase())
         { // if it matches translated version
            roles[i] = role;                    // set it to reference version
            found = true;
            break;
         }
      }
      if (!found)
      {
         if (roles[i].indexOf('+') !== 0 &&  // ignore "+2" style items appearing when there are many roles
            roles[i].indexOf('Group expert in') !== 0)  // ignore "freestyle" expert roles DRL FIXIT! Translation.
            Log_WriteError('Found comment with unsupported role "' + roles[i] + '" in post ' + window.location.href);
         roles.splice(i, 1);
         i--;
      }
   }
   if (addRole)
      roles.push(addRole);
   Utilities_ArrayRemoveDuplicates(roles);
   return roles;
}

// postAuthorID could be NULL as we sometimes don't have it
// always returns "inbox" so caller must adjust as needed
async function parseComment(comment, externalPostID, postUrl, postAuthorID)
{
   
   // waiting for the whole comment showing up
   while (true)
   {
      let seeMoreButton = findElement(srchPathFBC('commentSeeMoreButton'), null, comment);
      if (seeMoreButton == null)
         break;  // if not, meaning that the comment is already full showed on screen (no text cut)
      
      seeMoreButton.click();
      await sleep(1);
   }
   
   const message = {}
   message.Element = comment;  // handy to have for our comment reply code
   message.Type = 'fbp_comment';
   message.Uid = NO_EXTERNAL_ID;
   message.Folder = 'inbox';  // NOTE: this must be corrected to "outbox" in the caller as needed!
   message.Url = postUrl;
   // currently the "to" is always the post
   message.To = ['<' + externalPostID + '>'];
   
   const author = findElement(srchPathFBC('commentAuthor'), null, comment);
   if (author == null)
   {
      Log_WriteError('Comment author not found for post: ' + window.location.href);
      Log_WriteDOM(comment);
      return null;
   }
   const authorUrl = findElement(srchPathFBC('commentAuthorUrl'), null, comment);
   if (authorUrl == null)
   {
      Log_WriteError('Comment author URL not found for post: ' + window.location.href);
      Log_WriteDOM(comment);
      return null;
   }
   if (authorUrl == '#')
   {
      Log_WriteError('Comment author URL not populated for post: ' + window.location.href);
      Log_WriteDOM(comment);
      return null;
   }
   const commentAuthorID = await getFacebookAddressFromUrl(authorUrl, FacebookAddressFormatNumeric);
   if (commentAuthorID == null)
   {
      Log_WriteError('Comment author ID not available from his URL: ' + authorUrl);
      return null;
   }
   message.From = author.innerText.trim() + ' <' + commentAuthorID + '>';
   
   message.FromRoles = findElements(srchPathFBC('commentAuthorRoles'), null, comment)
   message.FromRoles = massageFromRoles(message.FromRoles, commentAuthorID == postAuthorID ? 'Author' : null);
   
   // comment text/message
   message.Body = findElement(srchPathFBC('commentText2'), null, comment);
   if (message.Body == null)
      message.Body = '';  // some of our code doesn't support a NULL body so use an empty string instead
   
   // comment timestamp
   message.timestamp = Date.now() - getCommentTimestampDelta(comment);
   message.Date = timestampToString(new Date(message.timestamp));
   
   // getting attachments of a comment
   let attachs = [];
   // DRL FIXIT? findElements should always return an array (no need for Array.from), so fix it if not.
   attachs = attachs.concat(Array.from(findElements('img', null, comment)));
   attachs = attachs.concat(Array.from(findElements('video', null, comment)));
   
   message.Attachments = [];
   for (let attach of attachs)
   {
      message.Attachments.push({URL: attach.src})
   }
   
   if (message.Body == '' && message.Attachments.length == 0)
   {
      Log_WriteError('Empty comment from "' + author + '" found for post: ' + window.location.href);
      Log_WriteDOM(comment);
   }

// We only need comments in a certain date range so instead of doing this expensive operation here we leave it
// up to the caller to do it only on the needed comments.
//    await massageAttachments(message);
   
   return message;
}

// may return a new box if we've opened a new "page"
async function prepareCommentsForParsing(box)
{
   // for live video the comments often appear in a different page we can pop up
   let commentsFromLiveButton = findElement(srchPathFBC('commentsFromLiveButton'), null, box)
   if (commentsFromLiveButton != null)
   {
      commentsFromLiveButton.click();
      await sleep(4);
      
      box = await waitForElement(srchPathFBP('postContainer2'));
   }
   
   // Open the comments if they are not open yet
   let commentsOpenButton = findElement(srchPathFBC('postOpenCommentsButton'), null, box)
   if (commentsOpenButton != null)
   {
      commentsOpenButton.click();
      let hide = await waitForElement(srchPathFBC('postHideCommentsButton'), 4, box);
      if (hide == null)
         Log_WriteWarning('Hide comments button not found for post: ' + window.location.href);
   }
   
   let commentMostRelevant = findElement(srchPathFBC('postMostRelevantCommentSelector'), null, box);
   // For https://www.facebook.com/karlakeysersilver/videos/274426231345508/
   // the following is actually a drop down with the label "Most recent" and in
   // that drop down there is no "show all" but instead the selector here matches on
   // "Most recent", but things do seem to progress loading 50 comments at a time.
   // On https://www.facebook.com/fbrookes/posts/10159396469198855 the selector seems
   // to match on "Most relevant" so we're not getting all the comments, but from the
   // name of the selector I guess that is the intent?
   if (commentMostRelevant != null)
   {
      // DRL FIXIT! The code here doesn't seem to work in the case of a pop-up dialog for the post. The
      // click below doesn't open up the menu.
      commentMostRelevant.click();
      let commentSelectAllComments = await waitForElement(srchPathFBC('postShowAllCommentsButtonOnMostRelevantCommentSelector'), null, box);
      if (commentSelectAllComments)
      {
         commentSelectAllComments.click();
         await sleep(4);
      }
      else    // this happened to me with the post linked above...
         Log_WriteError("No result found for postShowAllCommentsButtonOnMostRelevantCommentSelector for: " + window.location.href);
   }
   
   return box;
}

async function parseReactionsFromStory(accountInfo, externalPostID, postUrl, lastCheck, currentCheck)
{
   let origUrl = document.location.href;
   let postID = getEmailPrefix(externalPostID);
   
   let start = 0;
   let i = (lastCheck + '').indexOf('.');
   let retryCheck = currentCheck;
   if (i != -1)
   {
      start = parseInt((lastCheck + '').substring(i + 1));
      lastCheck = lastCheck.substring(0, i);
      retryCheck = currentCheck + '.' + start;  // used if there is an error, to try again later
   }
   
   // if the ID isn't in the URL we are likely looking at the wrong story
   if (!origUrl.includes(postID) && !origUrl.includes(Url_EncodeURIComponent(postID)))
   {
      Log_WriteError('Page URL ' + origUrl + ' does not contain post ID ' + postID + '!');
      return [[], retryCheck];
   }
   
   // wait for the story to load
   let isLoaded = await waitForElement(srchPathFBS('storyIsLoaded'), 5);
   if (isLoaded == null)
   {
      Log_WriteWarning('parseReactionsFromStory() storyIsLoaded not found at: ' + document.location.href);
      return [[], retryCheck];    // story not loading, or perhaps it is not available?
   }
   
   let elem = await waitForElement(srchPathFBS('openFacebookStoryReactions'), 2);  // this does a click and wait
   if (elem)
      Log_WriteInfo('Parsing current story');
   else
      Log_WriteInfo('Parsing old story or button not found');
   
   elem = await waitForElement(srchPathFBS('facebookStoryContentPanel'));
   if (elem == null)
   {
      Log_WriteError('parseReactionsFromStory() facebookStoryContentPanel not found at: ' + document.location.href);
      return [[], retryCheck];
   }
   
   let comments = [];
   
   let reactionElems = findElements(srchPathFBS('getFacebookStoryReactions'), null, elem);
   if (reactionElems.length > 0)
   {
      let scrollable = Utilities_GetScrollableParentElement(reactionElems[0]);
      
      let noScrollCount = 0;
      let lastHeight = scrollable.scrollHeight
      while (true)
      {
         scrollable.scrollTo(0, scrollable.scrollHeight);
         
         await sleepRand(timings.FB_WATCHED_POST_SCROLL_DELAY)
         reqPing();
         
         if (lastHeight == scrollable.scrollHeight)
         {
            noScrollCount++;
            if (noScrollCount > 3)
               break;
         }
         else
            noScrollCount = 0;
         
         lastHeight = scrollable.scrollHeight
      }
      reactionElems = findElements(srchPathFBS('getFacebookStoryReactions'), null, elem);
   }
   
   Log_WriteInfo('Parsing reactions from ' + start + ' to ' + (reactionElems.length - 1));
   
   for (let i = start; i < reactionElems.length; i++)
   {
      if (origUrl != document.location.href)
      {
         Log_WriteError('Page URL has changed from ' + origUrl + ' to ' + document.location.href + ' therefore updating URL!');
         await sleep(2);     // make sure the above gets sent before we reload
         document.location.href = origUrl;
         await sleep(60);    // page should reload and script would exit from here
         break;
      }
      
      let currentElement = reactionElems[i];
      
      // DRL FIXIT? What's this for?
      if (currentElement.classList.length == 0 || currentElement.innerText == '')
      {
         Log_WriteError('Unexpected state in parseReactionsFromStory(): currentElement.classList.length == 0 || currentElement.innerText == \'\'');
         break;
      }
      
      let comment = await parseStoryReaction(currentElement, externalPostID, postUrl, currentElement);
      if (comment == null)
      {
         Log_WriteWarning('Skipping reaction ' + i);
         continue;
      }
      
      comments.push(comment);
      
      reqPing();
   }
   
   return [comments, currentCheck + '.' + reactionElems.length];
}

async function parseCommentsFromPost(accountInfo, externalPostID, postUrl, lastCheck, currentCheck)
{
   let box = await waitForElement(srchPathFBP('postContainer2'));
   if (box == null)
   {
      if (findElement(srchPathFBP('notAGroupMember')))
      {
         // DRL FIXIT? We should probably turn off automation for the post so we stop trying to parse it?
         Log_WriteWarning('Not a member of the group to watch post: ' + window.location.href);
         return [];
      }
      
      if (findElement(srchPathFBP('postUnavailable')))
      {
         // DRL FIXIT? We should probably turn off automation for the post so we stop trying to parse it?
         Log_WriteWarning('Post is no longer available: ' + window.location.href);
         return [];
      }
      
      Log_WriteError('parseCommentsFromPost() postContainer2 not found for post: ' + window.location.href);
      return null;
   }
   
   // searching all div[role=button] of a post element to tell when it is loaded
   let loaded = await waitForElements(srchPathFBP('postLoaded'), null, box);
   if (loaded == null)
   {
      Log_WriteError('Can\'t tell if post has finished loading at: ' + window.location.href);
      Log_WriteDOM(box);
   }
   
   let postAuthorUrl = findElement(srchPathFBP('postAuthorURL'), null, box);
   let watchLivePath = srchPathFBP('watchLivePath');
   if (postAuthorUrl == null && !window.location.href.includes(watchLivePath))
   {    // live video doesn't have author we can easily get
      Log_WriteError('Post author not found for post: ' + window.location.href);
      Log_WriteDOM(box);
      return null
   }
   
   let postAuthorID = null;
   if (postAuthorUrl)
      postAuthorID = await getFacebookAddressFromUrl(postAuthorUrl, FacebookAddressFormatNumeric);
   
   box = await prepareCommentsForParsing(box);
   
   // keep loading more comments as long as there's a button to do so, or we run too long
   for (let i = 0; true; i++)
   {
      if (i == 150)
      { // we've waited long enough (about 10 minutes)
         Log_WriteError("Waited long enough for comments to arrive, giving up: " + window.location.href);
         return null;
      }
      
      // DRL FIXIT! Would be much better (but more complex) to have some indication that the rotating circle has gone away.
      await sleep(4);
      reqPing();
      
      let popup = findElement(srchPathFBP('postContainerPopup'));
      if (popup && box != popup)
      {
         Log_WriteInfo('parseCommentsFromPost() switching to post popup at: ' + window.location.href);
         box = popup;
         
         box = await prepareCommentsForParsing(box);
      }
      
      const viewMoreButtons = findElements(srchPathFBC('viewMoreComments'), null, box);
      if (viewMoreButtons.length == 0)
         break;
      
      for (let viewMoreButton of viewMoreButtons)
         viewMoreButton.click();
   }
   
   // get all comments on screen
   const items = findElements(srchPathFBC('commentContainers'), null, box);
   if (items.length == 0)
   {
      Log_WriteWarning('Got no comments parsing post, check for potential scraping error: ' + window.location.href);
//        Log_WriteDOM(box);    this seems to be a lot to log and not very helpful
   }
   
   // DRL FIXIT! For confirmation what we should do here is parse the "11 Comments" text and
   // compare that we're getting a fairly close number of comments, otherwise some of our
   // selectors are likely bad!
   
   currentCheck = roundCheckTimeUp(currentCheck);
   
   // parsing all comments that are after the lastCheck timestamp
   let comments = [];
   for (let item of items)
   {
      const timestamp = Date.now() - getCommentTimestampDelta(item);
      if (roundItemTimeUp(timestamp, lastCheck) > lastCheck && timestamp <= currentCheck)
      {
         let comment = await parseComment(item, externalPostID, postUrl, postAuthorID);
         if (comment)
         {
            // parseComment() puts everything in the inbox so we check here as needed (i.e. when we have accountInfo)
            let from = getRawEmail(comment.From);
            if (accountInfo &&
               (from == accountInfo.id + '@fbperid.socialattache.com' ||
                  from == accountInfo.username)) // I don't think we ever use username for the From?
               comment.Folder = 'sent';
            comments.push(comment);
         }
      }
      reqPing();
   }
   
   return comments;
}

// we cache the results for the "reply to comment" feature since we may have to reply more than once on a post
let commentsCache = null;
let commentsCacheCurrentCheck = null;
let commentsCacheCheckHash = null;

// lastCheck is 0 for the first check, it is never null
async function parseActivityFromPost(accountInfo, externalPostID, postUrl, lastCheck, currentCheck)
{
   let checkHash = Url_GetPath(document.location.href) + '_' + lastCheck + '_' + currentCheck;  // if any of these change we need to re-parse
   
   if (commentsCache != null && commentsCacheCheckHash === checkHash)
   {
      Log_WriteInfo('Using cache');
      return [commentsCache, currentCheck];
   }
   
   // save some memory by removing the cache that is no longer valid
   if (commentsCache != null)  // if there was a change the page should have been refreshed, clearing this
      Log_WriteError('Unexpected cache change in parseActivityFromPost() without cache being cleared');
   commentsCache = null;
   commentsCacheCurrentCheck = null;
   commentsCacheCheckHash = null;
   
   if (window.location.href.includes("/stories/"))
   {
      // note that we don't have dates for reactions
      [commentsCache, currentCheck] = await parseReactionsFromStory(accountInfo, externalPostID, postUrl, lastCheck, currentCheck);
   }
   else
   {
      commentsCache = await parseCommentsFromPost(accountInfo, externalPostID, postUrl, lastCheck, currentCheck);
      
      // sort by date
      if (commentsCache)
         commentsCache.sort(function compareFn(a, b)
         {
            return a.timestamp - b.timestamp;
         });
   }
   if (commentsCache == null)
   {    // one of the above methods didn't find anything?
      Log_WriteWarning('Got null for comments/reactions!')
   }
   
   // get and cache the results to save us having to parse them all over again
   commentsCacheCheckHash = checkHash;
   
   return [commentsCache, currentCheck];
}


async function parseStoryReaction(elem, externalPostID, postUrl)
{
   const message = {}
   message.Uid = NO_EXTERNAL_ID;
   message.Folder = 'inbox';
   message.Url = postUrl;
   // currently the "to" is always the post
   message.To = ['<' + externalPostID + '>'];
   
   elem.click();
   await sleep(3);
   
   const reactionAuthorUrl = findElement(srchPathFBS('getReactionAuthorUrl'), null, elem);
   const reactionAuthorName = findElement(srchPathFBS('getReactionAuthorName'), null, elem);
   // DRL FIXIT? The reaction is an SVG image so we can't easily identify the type of reaction.
   const reactionType = findElement(srchPathFBS('getReactionType'), null, elem) ? 'LIKE' : '';
   
   let close = findElement(srchPathFBS('closeReactionDetail'), null, elem);
   if (close == null)
   {
      Log_WriteError('parseReactionsFromStory() closeReactionDetail not found at: ' + document.location.href);
      Log_WriteDOM(elem);
      return null;
   }
   close.click();
   
   if (reactionAuthorUrl == null)
   {
      Log_WriteError('parseReactionsFromStory() getReactionAuthorUrl not found at: ' + document.location.href);
      Log_WriteDOM(elem);
      return null;
   }
   if (reactionAuthorName == null)
   {
      Log_WriteError('parseReactionsFromStory() getReactionAuthorName not found at: ' + document.location.href);
      Log_WriteDOM(elem);
      return null;
   }
   
   message.Type = reactionType != '' ? 'fb_like' : 'fbp_view';
   
   const reactionAuthorID = await getFacebookAddressFromUrl(reactionAuthorUrl, FacebookAddressFormatNumeric);
   
   message.From = reactionAuthorName + ' <' + reactionAuthorID + '>';
   message.FromRoles = [];
   
   // some of our code doesn't support a NULL body so we use an empty string instead above
   message.Body = reactionType;
   
   // reaction timestamp
   message.timestamp = Date.now() /*- getCommentTimestampDelta(reaction)*/;
   message.Date = timestampToString(new Date(message.timestamp));
   
   message.Attachments = [];

// We only need reactions in a certain date range so instead of doing this expensive operation here we leave it
// up to the caller to do it only on the needed reactions.
//    await massageAttachments(message);
   
   return message;
}


// lastCheck is 0 for the first check, it is never null
async function getComments(accountInfo, externalPostID, postUrl, lastCheck, cursor, currentCheck)
{
   let comments = null;
   let checkHash = Url_GetPath(document.location.href) + '_' + lastCheck + '_' + currentCheck;  // if any of these change we need to re-parse
   let newCurrentCheck = currentCheck;
   
   if (commentsCache != null && commentsCacheCheckHash === checkHash)
   {
      // we have already parsed the comments, just need to get the next chunk
      comments = commentsCache;
      // we haven't loaded anything that may have been received since this date, so we must use
      // it as the new lastSynced in order not to miss anything in the next pass
      currentCheck = commentsCacheCurrentCheck;
   }
   else
   {
      // save some memory by removing the cache that is no longer valid
      if (commentsCache != null)  // if there was a change the page should have been refreshed, clearing this
         Log_WriteError('Unexpected cache change in getComments() without cache being cleared');
      commentsCache = null;
      commentsCacheCurrentCheck = null;
      commentsCacheCheckHash = null;
      
      [comments, newCurrentCheck] = await parseActivityFromPost(accountInfo, externalPostID, postUrl, lastCheck, currentCheck);
      if (comments == null)
      {
         return [null, null, null];
      }
   }
   
   if (comments.length > cursor + constants.MAXIMUM_COMMENTS_PER_CHUNK)
   {
      if (commentsCache == null)
      {
         // cache the results to save us having to parse them all over again
         commentsCache = comments;
         commentsCacheCurrentCheck = currentCheck;
         commentsCacheCheckHash = checkHash;
      }
      else
      {
         if (commentsCacheCheckHash !== checkHash)
            Log_WriteError('Unexpected cache hash difference in getComments()');
      }
      
      comments = comments.slice(cursor, cursor + constants.MAXIMUM_COMMENTS_PER_CHUNK);
      cursor += constants.MAXIMUM_COMMENTS_PER_CHUNK;
   }
   else
   {
      commentsCache = null;
      commentsCacheCurrentCheck = null;
      commentsCacheCheckHash = null;
      
      comments = comments.slice(cursor, cursor + constants.MAXIMUM_COMMENTS_PER_CHUNK);
      cursor = 0;
   }
   
   // this was not done in parseComment() above for efficiency so we do it here
   for (let comment of comments)
   {
      delete comment.Element;
      await massageAttachments(comment);
   }
   
   Log_WriteInfo('Returning ' + comments.length + ' comments');
   return [comments, cursor, newCurrentCheck];
}

async function getComment(accountInfo, postUid, postUrl, commentUid, commentDate, commentBody)
{
   let errorMessage = Str('Error getting comment from post');
   
   // we need fixed start/end dates that will not filter any comments
   let lastCheck = 0;
   let currentCheck = 10413792000 * 1000;  // well into the future (1 Jan 2300)
   
   let [comments, newCurrentCheck] = await parseActivityFromPost(accountInfo, postUid, postUrl, lastCheck, currentCheck);
   if (comments == null)
   {
      return [null, errorMessage];
   }
   
   let commentTimestamp = stringToTimestamp(commentDate);
   let lowTimestamp = roundItemTimeDown(commentTimestamp);
   let highTimestamp = roundItemTimeUp(commentTimestamp);
   
   for (let comment of comments)
   {
      let timestamp = stringToTimestamp(comment.Date);
      if (comment.Body.includes(commentBody) && timestamp >= lowTimestamp && timestamp <= highTimestamp)
      {
         comment.Uid = commentUid;
         delete comment.Element;
         // this was not done in parseComment() above for efficiency so we do it here
         await massageAttachments(comment);
         return [comment, null];
      }
   }
   
   Log_WriteError("Can't find original comment " + commentUid + " on \"" + commentDate + "\" with \"" + commentBody + "\" at: " + document.location.href);
   
   return [null, errorMessage];
}

/* Not used since reactions seem to vary each time we call and often can't get them all.
async function getReactions(accountInfo, externalPostID, lastCheck, currentCheck){
    // getting comments
    let box = null;
    box = await waitForElement(srchPathFBP('postContainer'));
    if (box == null)
    {
        Log_WriteError('It appears that post ' + externalPostID + ' is no longer available, or is not a supported format: ' + window.location.href);
        return [];
    }

    const viewAllReactionsButton = findElement(srchPathFBM('viewAllReactionsButton'), null, box)
    viewAllReactionsButton.click();
    let reactions = await waitForElements('div.rpm2j7zs.k7i0oixp.gvuykj2m.j83agx80.cbu4d94t.ni8dbmo4.du4w35lb.q5bimw55.ofs802cu.pohlnb88.dkue75c7.mb9wzai9.l56l04vs.r57mb794.l9j0dhe7.kh7kg01d.eg9m0zos.c3g1iek1.otl40fxz.cxgpxx05.rz4wbd8a.sj5x9vvc.a8nywdso > div.j83agx80.cbu4d94t.buofh1pr.l9j0dhe7 > div')
    let scrollableContainer = findElement('div.rpm2j7zs.k7i0oixp.gvuykj2m.j83agx80.cbu4d94t.ni8dbmo4.du4w35lb.q5bimw55.ofs802cu.pohlnb88.dkue75c7.mb9wzai9.l56l04vs.r57mb794.l9j0dhe7.kh7kg01d.eg9m0zos.c3g1iek1.otl40fxz.cxgpxx05.rz4wbd8a.sj5x9vvc.a8nywdso')
    let lastReactionsScrollHeight = scrollableContainer.scrollHeight;
    // waiting for post showing up
    while(true) {
        console.log("Box => ", box);
        scrollableContainer.scrollTo(0, scrollableContainer.scrollHeight);
        await sleep(3);
        reactions = findElements('div.rpm2j7zs.k7i0oixp.gvuykj2m.j83agx80.cbu4d94t.ni8dbmo4.du4w35lb.q5bimw55.ofs802cu.pohlnb88.dkue75c7.mb9wzai9.l56l04vs.r57mb794.l9j0dhe7.kh7kg01d.eg9m0zos.c3g1iek1.otl40fxz.cxgpxx05.rz4wbd8a.sj5x9vvc.a8nywdso > div.j83agx80.cbu4d94t.buofh1pr.l9j0dhe7 > div')
        if(scrollableContainer.scrollHeight > lastReactionsScrollHeight){
            lastReactionsScrollHeight = scrollableContainer.scrollHeight
        }else{
            break;
        }
        reqPing();
    }

    // get all reactions on screen
    console.log("Reactions => ", reactions)
    return;
    // parsing all comments that are after the lastCheck timestamp
    const datas = [];
    for(let i = 0; i < reactions.length; i++){
        //datas.push(await parseComment(reactions[i], externalPostID, postUrl));
    }

    return datas;
}
*/
