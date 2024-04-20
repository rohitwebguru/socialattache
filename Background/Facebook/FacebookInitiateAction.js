// localData can be changed by this code so the caller needs to save it, and if this method returns
// false then it likely changed syncData so that will need to be saved, and it also didn't call sendResponse
// so the caller needs to do it
async function InitiateFacebookAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   if (action.category == 'SendMessage' || action.category == 'MakePost' || action.category == 'MakeComment')
   {
      return await _InitiateFacebookMessageAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'Friend' || action.category == 'Unfriend')
   {
      return await _InitiateFacebookFriendUnfriendAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'GroupAccept' || action.category == 'GroupDecline')
   {
      return _InitiateFacebookGroupJoinRequestAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'GroupMemberAnswers')
   {
      return _InitiateFacebookGroupMemberAnswersAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'GroupChatInvite')
   {
      return _InitiateFacebookGroupChatInviteAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'CreateCustomList' || action.category == 'UpdateCustomList')
   {
      return _InitiateFacebookCustomListAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'FetchComment')
   {
      return _InitiateFacebookFetchCommentAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
// We no longer import friends, as we import friend lists individually.
//   else if (action.category == 'Friends')
//   {
//      return _InitiateFacebookFriendsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
//   }
   else if (action.category == 'Messages')
   {
      return _InitiateFacebookMessagesAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'WatchedPosts')
   {
      return _InitiateFacebookWatchedPostsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
// Group chat members are now scraped immediately after scraping group chat messages.
//   else if (action.category == 'WatchedGroupChats')
//   {
//      return _InitiateFacebookWatchedGroupChatsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
//   }
   else if (action.category == 'WatchedGroupRequests')
   {
      return _InitiateFacebookWatchedGroupRequestsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'WatchedGroupStaff')
   {
      return _InitiateFacebookWatchedGroupStaffAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   else if (action.category == 'WatchedGroupMembers')
   {
      return _InitiateFacebookWatchedGroupMembersAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
// Group questions are now a manual import.
//   else if (action.category == 'WatchedGroupQuestions')
//   {
//      return _InitiateFacebookWatchedGroupQuestionsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
//   }
   else if (action.category == 'WatchedCustomLists')
   {
      return _InitiateFacebookWatchedCustomListsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action);
   }
   
   assert(0);
   return false;
}

function FacebookInitiateAction_CheckIfAttachmentsHaveVideos(attachments)
{
   for (let attachment of attachments)
      if (attachment.Type.includes('video/'))
         return true;
   
   return false;
}

// function to make form data
const makeItFormData = (item) => {
   var formData = new FormData();
   for (var key in item) {
      formData.append(key, item[key]);
   }
   return formData;
};

// function to serialize the data
const serialize = function (obj) {
   let str = [];
   for (let p in obj)
      if (obj.hasOwnProperty(p)) {
         str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
   return str.join("&");
};

const makeParsable = (html, special = false) => {
   let withoutForLoop = html.replace(/for\s*\(\s*;\s*;\s*\)\s*;\s*/, "");
   if (special) {
      withoutForLoop = withoutForLoop.replace(/for \(;;\);/g, "");
   }
   
   let maybeMultipleObjects = special
      ? withoutForLoop.split(/\r\n/g)
      : withoutForLoop.split(/\}\r\n *\{/);
   if (maybeMultipleObjects.length === 1) return maybeMultipleObjects;
   
   return special
      ? maybeMultipleObjects
      : "[" + maybeMultipleObjects.join("},{") + "]";
};

// Get the dtsg token and fbId
const getDtsg = async () => {
   var resObj = {
      status: false,
      data: {},
      message: "",
   };
   
   const sentReq = await fetch("https://www.facebook.com/", {
      method: "GET",
      headers: {
         accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      },
   });
   
   const data = await sentReq.text();
   
   const regex = new RegExp(localizedKeywords.FacebookApi.AccountInfoRegex, 'g');
   let matches;
   const result = {};
   while ((matches = regex.exec(data))) {
      if (matches[1]) {
         result.ACCOUNT_ID = matches[1];
      } else if (matches[2]) {
         result.USER_ID = matches[2];
      } else if (matches[3]) {
         result.NAME = matches[3];
      }
   }
   
   const match = data.match(new RegExp(localizedKeywords.FacebookApi.DtsgRegex));
   if (match) {
      result.token = match[1];
   } else {
      Log_WriteError('Token not found');
   }
   
   if (result.token && result.USER_ID) {
      resObj.message = null;
      resObj.status = true;
      resObj.data = {
         dtsg: result.token,
         fbId: result.USER_ID,
         ...result,
      };
      Log_WriteInfo("dtsgData: " + GetVariableAsString(result));
      return resObj;
   } else {
      resObj.status = false;
      resObj.message = Str('Please log in to Facebook to use this extension');
      Log_WriteInfo("No dtsgData!");
      return resObj;
   }
};

// function to send message with api (text only)
const sendMessageWithAPI = async (receiverId, message, alt = false) => {
   try {
      Log_WriteInfo('Sending text message');
      const dtsgData = await getDtsg();
      if (dtsgData.status) {
         let Ids = `ids[${receiverId}]`;
         
         let tids;
         if (!alt) {
            tids = `cid.c.${dtsgData.data.fbId}:${receiverId}`;
         } else {
            tids = `cid.c.${receiverId}:${dtsgData.data.fbId}`;
         }
         
         let data = {
            // __user: dtsgData.data.fbId,
            fb_dtsg: dtsgData.data.dtsg,
            body: message,
            server_timestamps: true,
            send: "Send",
            [Ids]: receiverId,
            tids,
            // waterfall_source: "message",
            wwwupp: "C3",
            referrer: "",
            ctype: "",
            cver: "legacy",
         };
         
         let sentReq = await fetch(
            constantPaths.Facebook.sendTextMessageApiUrl,
            {
               method: "POST",
               referrerPolicy: "origin-when-cross-origin",
               headers: {
                  "Access-Control-Allow-Origin": "*",
                  "Content-Type": "application/x-www-form-urlencoded",
                  Accept: "text/html,application/json",
               },
               body: serialize(data),
            },
         );
         const responseData = await sentReq.text();
         // console.log("response redirected:", sentReq, responseData);
         const sentReqURL = sentReq.url;
         const isURLRedirected = sentReq.redirected;
         
         Log_WriteInfo("sentReqURL: " + sentReqURL + " isURLRedirected: " + isURLRedirected + " alt: " + alt);
         
         if (
            isURLRedirected &&
            (sentReqURL.includes("request_type=send_success") ||
               sentReqURL.includes("blocked/?paipv"))
         ) {
            return true;
         } else if (!alt) {
            // asynchronously it will try the send message in alt way
            return await sendMessageWithAPI(receiverId, message, true);
         } else {
            // API is not valid for this user;
            return false;
         }
      } else {
         throw new Error("Issue with Dtsg data!");
      }
   } catch (e) {
      Log_WriteException(e, 'Send Message Error');
      return false;
   }
};

// function to send message with api (text with image)
const sendImageMessageWithAPI = async (
   receiverId,
   message,
   imageBlobs,
   alt = false,
) => {
   Log_WriteInfo('Sending message with image');
   try {
      const dtsgData = await getDtsg();
      if (dtsgData.status) {
         let tids;
         if (!alt) {
            tids = `cid.c.${dtsgData.data.fbId}:${receiverId}`;
         } else {
            tids = `cid.c.${receiverId}:${dtsgData.data.fbId}`;
         }
         
         const imageData = {
            jazoest: "21996",
            fb_dtsg: dtsgData.data.dtsg,
            tids,
            ids: receiverId,
            waterfallxapp: "comet",
            body: message,
            upload_id: "jsc_c_7n",
         };
         
         // Add blob objects to the imageData as file
         imageBlobs.forEach((blob, index) => {
            imageData[`file${index + 1}`] = blob;
         });
         
         let sentReq = await fetch(
            constantPaths.Facebook.sendImageMessageApiUrl,
            {
               method: "POST",
               credentials: "include",
               headers: {
                  Accept: "*/*",
                  Origin: "https://www.facebook.com",
               },
               body: makeItFormData(imageData),
            },
         );
         
         const responseData = await sentReq.text();
         //  console.log("response redirected:", sentReq, responseData);
         const sentReqURL = sentReq.url;
         const isURLRedirected = sentReq.redirected;
         
         Log_WriteInfo("sentReqURL: " + sentReqURL + " isURLRedirected: " + isURLRedirected + " alt: " + alt);
         
         if (isURLRedirected) {
            return true;
         } else {
            return false;
         }
      } else {
         throw new Error("Issue with Dtsg data!");
      }
   } catch (e) {
      Log_WriteException(e, 'Send Message Error');
      return false;
   }
};

const uploadPhotoForPost = async (postAttachments) => {
   try {
      // starting the photo upload
      if (postAttachments.length > 0) {
         // CASE:1 We have attachments
         const imageAttachments = postAttachments.filter((attachment) =>
            attachment.Type.includes("image/"),
         );
         
         if (imageAttachments.length > 0) {
            // CASE:1.1 We have image attachments
            const imageBlobPromises = imageAttachments.map(async ({ URL }) => {
               let imageResponse = null;
               try {
                  imageResponse = await fetch(URL);
               } catch (err) {
                  try {
                     // some images are blocked by CORS, so we need to use the image-proxy
                     imageResponse = await fetch(
                        Form_RootUri + "/v2/Proxy?url=" + encodeURIComponent(URL),
                     );
                  } catch (error) {
                     // do nothing
                     imageResponse = null;
                  }
               }
               if (imageResponse?.headers?.get("content-type").includes("image")) {
                  return await imageResponse.blob();
               } else {
                  // Handle invalid image link
                  Log_WriteError('Invalid image link: ' + URL);
                  // DRL FIXIT! Return an error message to the user!
                  return null;
               }
            });
            
            const imageBlobsResponse = await Promise.all(imageBlobPromises);
            
            // Remove null values (invalid image links)
            const imageBlobs = imageBlobsResponse.filter((blob) => blob !== null);
            
            // CASE:1.1.1 We have valid image blobs
            if (imageBlobs.length > 0) {
               const dtsgData = await getDtsg();
               if (!dtsgData.status) {
                  throw new Error("Issue with Dtsg data!");
               }
               
               Log_WriteInfo('Uploading images for post');
               
               const photoIDs = [];
               
               const formDataObj = {
                  source: "8",
                  profile_id: dtsgData.data.fbId,
                  waterfallxapp: "comet",
                  upload_id: "jsc_c_l",
               };
               const url = buildUrl(constantPaths.Facebook.uploadPhotoForPostApi, {
                  DtsgToken: dtsgData.data.dtsg,
                  UserFbId: dtsgData.data.fbId,
               });
               
               for (const blob of imageBlobs) {
                  formDataObj.farr = blob;
                  
                  const response = await fetch(url, {
                     method: "POST",
                     body: makeItFormData(formDataObj),
                     redirect: "follow",
                  });
                  
                  const result = await response.text();
                  const resultJson = JSON.parse(makeParsable(result));
//             console.log("Result JSON:", resultJson);
                  
                  if (resultJson?.payload?.photoID) {
                     photoIDs.push(resultJson.payload.photoID);
                  } else {
                     Log_WriteError('Error uploading photo for post');
                  }
               }
               
               return photoIDs;
            }
         }
      }
   } catch (e) {
      Log_WriteException(e, 'Upload post image error');
   }
   return []; // Return empty array if there's no attachments or an error
};

const createGroupPost = async (groupId, postContent, postAttachments) => {
   // Validate parameters
   if (!groupId || !postContent) {
      throw new Error("Invalid group post parameters!");
   }
   
   try {
      const dtsgData = await getDtsg();
      if (!dtsgData.status) {
         throw new Error("Issue with Dtsg data!");
      }
      
      const photoIDs = await uploadPhotoForPost(postAttachments);
      
      Log_WriteInfo('Creating group post with images: ' + GetVariableAsString(photoIDs));
      
      const groupInputObject = {
         input: {
            composer_entry_point: "inline_composer",
            composer_source_surface: "group",
            composer_type: "group",
            source: "WWW",
            message: {
               ranges: [],
               text: postContent,
            },
            audience: {
               to_id: groupId,
            },
            attachments: [],
            actor_id: `${dtsgData.data.fbId}`,
         },
         feedLocation: "GROUP",
         privacySelectorRenderLocation: "COMET_STREAM",
      };
      
      for (const photoID of photoIDs) {
         groupInputObject.input.attachments.push({
            photo: { id: photoID },
         });
      }
      
      const requestOptions = {
         method: "POST",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         body: new URLSearchParams({
            av: `${dtsgData.data.fbId}`,
            __user: `${dtsgData.data.fbId}`,
            __comet_req: "15",
            fb_dtsg: dtsgData.data.dtsg,
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "ComposerStoryCreateMutation",
            variables: JSON.stringify(groupInputObject),
            doc_id: "7452920894747567",
         }),
         redirect: "follow",
      };
      
      const response = await fetch(
         constantPaths.Facebook.graphqlApiUrl,
         requestOptions,
      );
      const result = await response.text();
      
      // Extracting URL using regular expression
      const match = result
         .slice(0, 1000)
         .replaceAll("\\", "")
         .match(new RegExp(localizedKeywords.FacebookApi.GroupPostUrlRegex));
      
      if (match) {
         const groupPostUrl = match[0];
         return groupPostUrl; // Return the URL if found
      } else {
         throw new Error("Group post URL not found.");
      }
   } catch (e) {
      throw e; // Let the error propagate to the caller
   }
};

const createGroupPoll = async (groupId, postContent, {PollOptions, PollConfig}) => {
   // Validate parameters
   if (!groupId || !postContent) {
      throw new Error("Invalid group post parameters!");
   }
   
   try {
      const dtsgData = await getDtsg();
      if (!dtsgData.status) {
         throw new Error("Issue with Dtsg data!");
      }
      
      Log_WriteInfo('Creating group poll with options: ' + GetVariableAsString(PollOptions));
      
      const groupInputObject = {
         input: {
            composer_entry_point: "inline_composer",
            composer_source_surface: "group",
            composer_type: "group",
            source: "WWW",
            message: {
               ranges: [],
               text: postContent,
            },
            audience: {
               to_id: groupId,
            },
            attachments: [
               {
                  poll: {
                     expiration_date: 0,
                     hidden_results: false,
                     is_company_qa_poll: false,
                     options: [...PollOptions.map(opt => ({ option_text: opt.Label ? opt.Label : opt.Name }))],
                     poll_answers_state: PollConfig.AllowAdd ? "OPEN" : "LOCKED",
                     poll_type: PollConfig.AllowMultiple ? "CHOOSE_MULTIPLE" : "CHOOSE_ONE"
                  }
               }
            ],
            actor_id: `${dtsgData.data.fbId}`,
         },
         feedLocation: "GROUP",
         privacySelectorRenderLocation: "COMET_STREAM",
      };
      
      const requestOptions = {
         method: "POST",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         body: new URLSearchParams({
            av: `${dtsgData.data.fbId}`,
            __user: `${dtsgData.data.fbId}`,
            __comet_req: "15",
            fb_dtsg: dtsgData.data.dtsg,
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "ComposerStoryCreateMutation",
            variables: JSON.stringify(groupInputObject),
            doc_id: "7452920894747567",
         }),
         redirect: "follow",
      };
      
      const response = await fetch(
         constantPaths.Facebook.graphqlApiUrl,
         requestOptions,
      );
      const result = await response.text();
      
      // Extracting URL using regular expression
      const match = result
         .slice(0, 1000)
         .replaceAll("\\", "")
         .match(new RegExp(localizedKeywords.FacebookApi.GroupPostUrlRegex));
      
      if (match) {
         const groupPostUrl = match[0];
         return groupPostUrl; // Return the URL if found
      } else {
         throw new Error("Group post URL not found.");
      }
   } catch (e) {
      throw e; // Let the error propagate to the caller
   }
};

async function _InitiateFacebookMessageAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const message = action.message;
   const isTempTab = isTemporaryTab(sender.tab.id);
   
   if (message.Type == 'fbp_comment')
   {
      Log_WriteInfo('Outgoing comment: ' + GetVariableAsString(message));
      
      let url = message.Url
      // no body means we're commenting on a post and tagging the "To", and we have to use the mobile version when tagging
      if (typeof message.InReplyToBody == 'undefined' || message.InReplyToBody == null)
      {
         url = Url_SwapDomain(url, 'mbasic.facebook.com');
      }
      
      if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
      {
         ActionCheck_SendResponse(FB_DATA_NAME, 'MakeComment', url, sendResponse, {
            action: 'makeComment',
            message: message
         }, message.Uid);
      }
      else if (ActionCheck_OK(FB_DATA_NAME, sender))
      {
         ActionCheck_SetUrl(FB_DATA_NAME, 'MakeComment', 'makeComment', message.Uid, sender, url, sendResponse);
      }
      else
      {
         Log_WriteInfo('Setting URL for makeComment is failing!');
         ActionCheck_Aborting(FB_DATA_NAME);
         setServerState(FB_DATA_NAME, accountID, null, null,
            [{'MessageID': message.Uid, 'ExternalMessageID': ERROR_EXTERNAL_ID, 'From': message.from}])
            .then(resp =>
            {
               sendResponse({action: null});
            })
            .catch(e =>
            {
               Log_WriteException(e);
               sendResponse({action: null});
            });
      }
      return true;
   }
   else if (message.Type == 'fbp_msg')
   {
      Log_WriteInfo('Outgoing message: ' + GetVariableAsString(message));
      
      let to = message.To[0];
      
      // convert a username to a numeric ID if we can as it's better for sending (don't need a popup)
      if (to.indexOf('@fbun.socialattache.com') != -1)
      {
         let temp = await getFacebookAddressFromId(getEmailPrefix(to), FacebookAddressFormatNumeric);
         if (temp != null)
            message.To[0] = to = temp;
         else
            Log_WriteInfo('Getting numeric ID for ' + to + ' is failing!');
      }
      
      let params = {
         Origin: baseUrl,
         // extract just the numeric user ID OR the username from our "fake email" format of
         // "Some Name <userid@fbperid.socialattache.com>" OR "Some Name <username@fbun.socialattache.com>"
         ConversationID: getEmailPrefix(to),
         AccountID: accountID
      };
      
      if (false)   // ENABLE THIS FOR THE DOM METHOD
      {
         let url = buildUrl(constantPaths.Facebook.sendMessengerMsg, params);
         if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
         {
            ActionCheck_SendResponse(FB_DATA_NAME, 'SendMessage', url, sendResponse, {
               action: 'sendMessage',
               message: message
            }, message.Uid);
            return true;
         }
         else if (ActionCheck_OK(FB_DATA_NAME, sender))
         {
            ActionCheck_SetUrl(FB_DATA_NAME, 'SendMessage', 'sendMessage', message.Uid, sender, url, sendResponse);
            return true;
         }
         else
         {
            Log_WriteInfo('Setting URL for sendMessage is failing!');
            ActionCheck_Aborting(FB_DATA_NAME);
            setServerState(FB_DATA_NAME, accountID, null, null,
               [{'MessageID': message.Uid, 'ExternalMessageID': ERROR_EXTERNAL_ID, 'From': message.from}])
               .then(resp =>
               {
                  sendResponse({action: null});
               })
               .catch(e =>
               {
                  Log_WriteException(e);
                  sendResponse({action: null});
               });
         }
      }
      else
      {
         let url = buildUrl(constantPaths.Facebook.sendMessengerMsg, params);
         if (isTempTab && sender.url == url)
         {
            ActionCheck_SendResponse(FB_DATA_NAME, 'SendMessage', url, sendResponse, {
               action: 'sendMessage',
               message: message
            }, message.Uid);
            return true;
         }
         
         let sent = false;
         if (false)  // ENABLE THIS FOR THE API METHOD
         {
            
            Log_WriteInfo("Trying to send message with api for " + params.ConversationID);
            
            if(message.Attachments.length > 0) {
               // CASE:1 We have attachments
               const imageAttachments = message.Attachments.filter(attachment => attachment.Type.includes('image/'));
               const videoAttachments = message.Attachments.filter(attachment => attachment.Type.includes('video/'));
               
               if (imageAttachments.length > 0) {
                  // CASE:1.1 We have image attachments
                  const imageBlobPromises = imageAttachments.map(async ({ URL }) => {
                     let imageResponse = null;
                     try{
                        imageResponse = await fetch(URL);
                     } catch (err) {
                        try {
                           // some images are blocked by CORS, so we need to use the image-proxy
                           imageResponse = await fetch(Form_RootUri + '/v2/Proxy?url=' + encodeURIComponent(URL));
                        } catch (error) {
                           // do nothing
                           imageResponse = null;
                        }
                     }
                     if (imageResponse?.headers?.get('content-type').includes('image')) {
                        return await imageResponse.blob();
                     } else {
                        // Handle invalid image link
                        console.error("Invalid image link:", URL);
                        // show some sort of error message to the user
                        return null;
                     }
                  });
                  
                  const imageBlobs = await Promise.all(imageBlobPromises);
                  
                  // Remove null values (invalid image links)
                  const validImageBlobs = imageBlobs.filter(blob => blob !== null);
                  
                  // CASE:1.1.1 We have valid image blobs
                  if(validImageBlobs.length > 0) {
                     sent = await sendImageMessageWithAPI(params.ConversationID, message.Body, validImageBlobs);
                  } else {
                     // CASE:1.1.2 We don't have valid image blobs. So, send text only
                     sent = await sendMessageWithAPI(params.ConversationID, message.Body);
                  }
               }
               if(videoAttachments.length > 0) {
                  // CASE:1.2 We have video attachments
                  // send image link with text for each video attachment
                  if(!sent) {
                     // if not sent by image attachments, send text only
                     sent = await sendMessageWithAPI(params.ConversationID, message.Body)
                  }
                  for (let videoAttachment of videoAttachments) {
                     // if the URL is of the form "https://[domain]/v2/Resources/[ID]/Data we can
                     // convert it to a thumbnail image, and send that before the video link
                     let defaultThumbnailBlob = null;
                     if (videoAttachment.URL.includes('/v2/Resources/') && videoAttachment.URL.includes('/Data'))
                     {
                        // remove parameters so we're not tracking it as a hit and change the request to get thumbnail
                        const defaultThumbnailImage = Url_StripParams(videoAttachment.URL).replace('/Data', '/Thumbnail');
                        try {
                           defaultThumbnailBlob = await fetch(defaultThumbnailImage).then(res => res.blob());
                        } catch (e) {
                           Log_WriteException(e, 'Error fetching default thumbnail image');
                        }
                     }
                     const link = Str('Click here to watch: <0>', videoAttachment.URL);
                     if(defaultThumbnailBlob) {
                        await sendImageMessageWithAPI(params.ConversationID, link, [defaultThumbnailBlob]);
                     } else {
                        // Default image blob is not available. So, send the video link only
                        await sendMessageWithAPI(params.ConversationID, link);
                     }
                  }
               }
            }
            if(!sent) {
               // CASE:2 We don't have any supported attachments. So, send text only
               sent = await sendMessageWithAPI(params.ConversationID, message.Body);
            }
            Log_WriteInfo("Sent message " + message.Uid + " by api " + sent + "To: " + params.ConversationID);
            
            if (sent) {
               HandleFacebookActionResult(sender, {
                  type: 'setMessageId',
                  dataName: FB_DATA_NAME,
                  accountID: accountID,
                  messageBoxUid: message.MessageBoxUid,
                  messageID: message.Uid,
                  externalMessageID: sent ? NO_EXTERNAL_ID : ERROR_EXTERNAL_ID,
                  from: message.From,
                  errorMessage: null,
                  usingApi: true
               }, null);
            } else {
               Log_WriteInfo("Fall back to DOM method for sending message");
            }
         }
         
         if (!sent && !hasTemporaryTab(FB_DATA_NAME))
         {
            // we create a new tab to handle this message, we do this to get around FB trying to
            // prevent sending a message using scraping, but if we use a new window this works,
            // I believe because the document element is given the focus
            createTab(FB_DATA_NAME, 'GET', url, {}, true, true)
               .then(resp =>
               {
                  sendResponse({action: null});
               })
               .catch(e =>
               {
                  Log_WriteException(e, message.Type);
                  sendResponse({action: null});
               });
            return true;
         }
      }
      
      // we don't want the main scraper tab doing anything while another is sending a message
      sendResponse({action: null});
      return true;
   }
   else if (message.Type == 'fbp_post' || message.Type == 'fbp_gpost' || message.Type == 'fbp_story')
   {
      // DRL FIXIT! Here we should be checking that the box ID matches the account ID for
      // sending to the personal feed!
      let isGroupPost = message.MessageBoxUid.includes('@fbgroup.socialattache.com');
      let isPagePost = message.MessageBoxUid.includes('@fbpage.socialattache.com');
      assert(!isPagePost); // DRL NOTE: I believe we currently don't post to a page because these are sent via the FB API.
      let url = isGroupPost
         ? "https://www.facebook.com/groups/" + getEmailPrefix(message.MessageBoxUid)
         : isPagePost
            ? "https://mbasic.facebook.com/" + getEmailPrefix(message.MessageBoxUid)
            : message.Type == 'fbp_story'
               ? "https://www.facebook.com/stories/" + getEmailPrefix(message.MessageBoxUid)
               : "https://mbasic.facebook.com/";
      
      if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
      {
         const hasVideo = message.Attachments.some((attachment) =>
            attachment.Type.includes("video/"),
         );
         
         if (message.Type != 'fbp_gpost' || hasVideo || !constants.USE_FACEBOOK_GROUP_POST_API)
         {
            // use the scraping way of posting
            ActionCheck_SendResponse(FB_DATA_NAME, 'MakePost', url, sendResponse, {
               action: 'makePost',
               post: message
            }, message.Uid);
         }
         else
         {
            // create group post from api
            let groupPostUrl = null;
            try
            {
               // if we have options, it's a poll post ignore the attachments
               const isPollPost = message.Options.length > 0 ? true : false;
               
               if (isPollPost) {
                  Log_WriteInfo('Making group poll post ' + message.Uid);
                  groupPostUrl = await createGroupPoll(
                     getEmailPrefix(message.MessageBoxUid),
                     message.Body,
                     {
                        PollOptions: message.Options,
                        PollConfig: message.Config
                     }
                  );
               } else {
                  Log_WriteInfo('Making group post ' + message.Uid);
                  groupPostUrl = await createGroupPost(
                     getEmailPrefix(message.MessageBoxUid),
                     message.Body,
                     message.Attachments,
                  );
               }
               
               Log_WriteInfo('groupPostUrl: ' + groupPostUrl);
            }
            catch (e)
            {
               Log_WriteException(e, message.Type);
            }
            
            Log_WriteInfo("Sent group post " + message.Uid + " by api and got URL: " + groupPostUrl);
            HandleFacebookActionResult(sender, {
               type: 'setPostId',
               dataName: FB_DATA_NAME,
               accountID: accountID,
               messageBoxUid: message.MessageBoxUid,
               postID: message.Uid,
               externalPostID: groupPostUrl ? NO_EXTERNAL_ID : ERROR_EXTERNAL_ID,
               from: message.From,
               url: groupPostUrl,
               errorMessage: null,
               usingApi: true
            }, null);
            sendResponse({action: null});
         }
      }
      else if (ActionCheck_OK(FB_DATA_NAME, sender))
      {
         ActionCheck_SetUrl(FB_DATA_NAME, 'MakePost', 'makePost', message.Uid, sender, url, sendResponse);
      }
      else
      {
         Log_WriteInfo('Setting URL for makePost is failing!');
         ActionCheck_Aborting(FB_DATA_NAME);
         setServerState(FB_DATA_NAME, accountID, null, null,
            [{'MessageID': message.Uid, 'ExternalMessageID': ERROR_EXTERNAL_ID, 'From': message.from}])
            .then(resp =>
            {
               sendResponse({action: null});
            })
            .catch(e =>
            {
               Log_WriteException(e);
               sendResponse({action: null});
            });
      }
      return true;
   }
   else
   {
      Log_WriteError("Unexpected Facebook message type " + message.Type);
   }
   
   return false;
}

async function _InitiateFacebookFriendUnfriendAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const command = action.command;
   
   // use the final URL for people who have a "handle" otherwise the URL check below will always fail
   let url = "https://www.facebook.com/" + getEmailPrefix(command.ExternalContactID);
   url = await getFinalUrl(url);
   
   if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, url, sendResponse, {
         action: command.SyncCommand,
         syncCommandID: command.SyncCommandID
      }, command.SyncCommandID);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, command.SyncCommand, command.SyncCommand, command.SyncCommandID, sender, url, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for ' + command.SyncCommand + ' is failing!')
      ActionCheck_Aborting(FB_DATA_NAME);
      sendCommandError(FB_DATA_NAME, accountID, command.SyncCommandID, Str('Unable to process command.'));
      sendResponse({action: null});
   }
   
   return true;
}

function _InitiateFacebookGroupJoinRequestAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const command = action.command;
   
   let url = "https://www.facebook.com/groups/" +
      getEmailPrefix(command.ExternalCommunityGroupID) + '/member-requests';
   if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      const params = Json_FromString(command.CommandParams);
      const reason = params && params.hasOwnProperty('Reason') ? params.Reason : null;
      
      ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, url, sendResponse, {
         action: command.SyncCommand,
         syncCommandID: command.SyncCommandID,
         groupID: command.ExternalCommunityGroupID,
         userID: command.ExternalContactID,
         reason: reason
      }, command.SyncCommandID)
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, command.SyncCommand, command.SyncCommand, command.SyncCommandID, sender, url, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for ' + command.SyncCommand + ' is failing!')
      ActionCheck_Aborting(FB_DATA_NAME);
      sendCommandError(FB_DATA_NAME, accountID, command.SyncCommandID, Str('Unable to process command.'));
      sendResponse({action: null});
   }
   
   return true;
}

function _InitiateFacebookGroupMemberAnswersAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const command = action.command;
   
   let url = buildUrl(constantPaths.Facebook.watchedGroupMemberAnswers, {
      groupId: getEmailPrefix(command.ExternalCommunityGroupID),
      userId: getEmailPrefix(command.ExternalContactID)
   });
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, url, sendResponse, {
         action: command.SyncCommand,
         syncCommandID: command.SyncCommandID,
         groupID: command.ExternalCommunityGroupID,
         userID: command.ExternalContactID
      }, command.SyncCommandID)
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, command.SyncCommand, command.SyncCommand, command.SyncCommandID, sender, url, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for ' + command.SyncCommand + ' is failing!')
      ActionCheck_Aborting(FB_DATA_NAME);
      sendCommandError(FB_DATA_NAME, accountID, command.SyncCommandID, Str('Unable to process command.'));
      sendResponse({action: null});
   }
   
   return true;
}

function _InitiateFacebookGroupChatInviteAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const command = action.command;
   
   let url = "https://www.facebook.com/messages/t/" +
      getEmailPrefix(command.ExternalItemID);
   if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, url, sendResponse, {
         action: command.SyncCommand,
         syncCommandID: command.SyncCommandID,
         conversationID: command.ExternalItemID,
         userID: command.ExternalContactID
      }, command.SyncCommandID)
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, command.SyncCommand, command.SyncCommand, command.SyncCommandID, sender, url, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for ' + command.SyncCommand + ' is failing!')
      ActionCheck_Aborting(FB_DATA_NAME);
      sendCommandError(FB_DATA_NAME, accountID, command.SyncCommandID, Str('Unable to process command.'));
      sendResponse({action: null});
   }
   
   return true;
}

function _InitiateFacebookCustomListAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const command = action.command;
   
   let listUrl = null;
   if (command.SyncCommand == 'CreateCustomList')
   {
      listUrl = 'https://www.facebook.com/friends/friendlist';
   }
   else if (command.SyncCommand == 'UpdateCustomList')
   {
      listUrl = buildUrl(constantPaths.Facebook.watchedCustomLists,
         {listId: getEmailPrefix(command.ExternalItemID)});
   }
   else
   {
      assert(0);
      return false;
   }
   
   if (sender.url == listUrl && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      if (command.SyncCommand == 'UpdateCustomList')
      {
         let params = Json_FromString(command.CommandParams);
         
         // client code wants one list with deleted items having null displayName
         let updateMembers = params.AddedMembers;
         for (let memberUid of params.RemovedMemberUids)
            updateMembers.push([memberUid, null]);
         
         ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, listUrl, sendResponse, {
            action: command.SyncCommand,
            syncCommandID: command.SyncCommandID,
            listUid: command.ExternalItemID,
            updateMembers: updateMembers,
            lastServerUpdated: params.LastServerUpdated
         }, command.SyncCommandID);
      }
      else if (command.SyncCommand == 'CreateCustomList')
      {
         ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, listUrl, sendResponse, {
            action: command.SyncCommand,
            syncCommandID: command.SyncCommandID,
            listName: command.ExternalGroupName
         }, command.SyncCommandID);
      }
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, command.SyncCommand, command.SyncCommand, command.SyncCommandID, sender, listUrl, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for ' + command.SyncCommand + ' is failing!');
      ActionCheck_Aborting(FB_DATA_NAME);
      sendCommandError(FB_DATA_NAME, accountID, command.SyncCommandID, Str('Unable to process command.'));
      sendResponse({action: null});
   }
   
   return true;
}

function _InitiateFacebookFetchCommentAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   const command = action.command;
   
   let params = Json_FromString(command.CommandParams);
   let url = params.PostURL;
   
   if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, command.SyncCommand, url, sendResponse, {
         action: command.SyncCommand,
         syncCommandID: command.SyncCommandID,
         PostID: params.ExternalPostID,
         PostUrl: url,
         CommentID: command.ExternalItemID,
         MessageID: params.MessageID,  // for efficiency we keep track of the local server ID
         CommentDate: params.CommentDate,
         CommentBody: params.CommentBody
      }, command.SyncCommandID);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, command.SyncCommand, command.SyncCommand, command.SyncCommandID, sender, url, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for ' + command.SyncCommand + ' is failing!')
      ActionCheck_Aborting(FB_DATA_NAME);
      sendCommandError(FB_DATA_NAME, accountID, command.SyncCommandID, Str('Unable to process command.'));
      sendResponse({action: null});
   }
   
   return true;
}

// We no longer import friends, as we will be importing friend lists individually.
function _InitiateFacebookFriendsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let url = baseUrl + '/friends/list';
   
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'Friends', sender.url, sendResponse, {
         action: 'getFriends',
         lastCheck: syncData.friends.lastSynced,
         currentCheck: syncData.friends.currentSync,
         cursor: syncData.friends.cursor
      }, null);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getFriends', null, sender, url, sendResponse);
   }
   else
   {
      Log_WriteInfo('Setting URL for getFriends is failing!')
      ActionCheck_Aborting(FB_DATA_NAME);
      localData.skipCheckingFriendsUntil = Date.now() + timings.THROTTLED_DELAY * 1000;
      
      setTabThrottled(sender.tab.id, true, action.category);
      
      sendResponse({action: null});
   }
   
   return true;
}

function _InitiateFacebookMessagesAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   // this is a new property added to keep track of how far back we went, and with the older code we
   // always tried to go back one year, so if it's not there we'll add it and return so it gets saved
   if (!syncData.messages.hasOwnProperty('historySynced'))
   {
      let latestSync = getLatestSyncTimestamp();
      
      syncData.messages.historySynced = syncData.messages.lastSynced < latestSync
         ? null         // new code will try to go back as far as possible up to one year, so allow going back as available
         : latestSync;  // old code always went back one (or two years for even older code) so nothing to do
      
      // start over with the last getChats so we can process using the new logic
      syncData.messages.currentSync = null;
      syncData.messages.conversationsLeft = [];
      
      return false;
   }
   
   if (syncData.messages.currentSync == null ||
      // this happened once and was an edge case I think
      syncData.messages.conversationsLeft.length == 0)
   {
      // start of new sync
      
      // It looks like using the facebook.com URL did not show group chats!
      if ((sender.url.startsWith('https://www.messenger.com/t/') || sender.url.startsWith('https://www.messenger.com/e2ee/t/')) &&
         ActionCheck_OK(FB_DATA_NAME, sender))
      {
         ActionCheck_SendResponse(FB_DATA_NAME, 'Messages', sender.url, sendResponse, {
            action: 'getChats',
            lastCheck: syncData.messages.lastSynced,
            historySynced: syncData.messages.historySynced
         }, null);
      }
      else if (ActionCheck_OK(FB_DATA_NAME, sender))
      {
         // when we get blocked it looks like we can get around it by providing an ID
         // It looks like using the facebook.com URL did not show group chats!
         let url = 'https://www.messenger.com/t/' + Utilities_IntRand(10000, 1000000);
//         let url = baseUrl + '/messages/t/' + Utilities_IntRand(10000, 1000000);
         ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getChats', null, sender, url, sendResponse);
      }
      else
      {
         Log_WriteInfo('Setting URL for getChats is failing!')
         ActionCheck_Aborting(FB_DATA_NAME);
         localData.skipCheckingMessagesUntil = Date.now() + timings.THROTTLED_DELAY * 1000;
         
         setTabThrottled(sender.tab.id, true, action.category);
         
         sendResponse({action: null});
      }
   }
   else
   {
      let url = syncData.messages.conversationsLeft[0];
      
      // we use a generic messaging address here because we don't want the page to reload, and the content
      // script will choose the conversation from the list so it's not necessary to set the url here
      // It looks like using the facebook.com URL did not show group chats!
      if ((sender.url.startsWith('https://www.messenger.com/t/') || sender.url.startsWith('https://www.messenger.com/e2ee/t/')) &&
         ActionCheck_OK(FB_DATA_NAME, sender))
//      if (sender.url.startsWith(baseUrl + '/messages/t/') && ActionCheck_OK(FB_DATA_NAME, sender))
      {
         // continue where we left off
         
         assert(syncData.messages.currentSync != null);
         if (syncData.messages.currentSync <= syncData.messages.lastSynced)
            Log_WriteError('currentSync should be greater than lastSynced:' + GetVariableAsString(syncData.messages));
         let lastSynced = syncData.messages.lastSynced;
         let cursor = syncData.messages.conversationCursor;
         ActionCheck_SendResponse(FB_DATA_NAME, 'Messages', url, sendResponse, {
            action: 'getMessages',
            url: url,
            lastCheck: cursor ? cursor : lastSynced,
            currentCheck: syncData.messages.currentSync
         }, url, cursor);
      }
      else if (ActionCheck_OK(FB_DATA_NAME, sender))
      {
         ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getMessages', url, sender, url, sendResponse);
      }
      else
      {
         // the conversation has been removed, or for some reason we're in a processing loop, skip it
         Log_WriteError('Skipping conversation as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
         ActionCheck_Aborting(FB_DATA_NAME);
         sendResponse({action: 'skipConversation', url: url});
      }
   }
   
   return true;
}

function _InitiateFacebookWatchedPostsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let postUid = action.postUid;
   let url = action.postUrl;
   if (fuzzyUrlsMatch(sender.url, url) && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedPosts', url, sendResponse, {
         action: 'getComments',
         externalPostID: postUid,
         postUrl: action.postUrl,   // sometimes the permalink doesn't match the page URL
         lastCheck: action.lastSynced,
         cursor: action.cursor
      }, postUid, action.cursor);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getComments', postUid, sender, url, sendResponse);
   }
   else
   {
      // DRL FIXIT? We need better handling here, such as flagging this item on the server?
      
      // the item is not available, skip it for a day (just in case it's a temporary issue)
      Log_WriteError('Skipping post ' + postUid + ' as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      ActionCheck_Aborting(FB_DATA_NAME);
      syncData.watchedPosts[postUid].lastSynced = Date.now() + (SecondsPerDay * 1000);
      syncData.watchedPosts[postUid].cursor = 0;
      
      return false;
   }
   
   return true;
}

/*
function _InitiateFacebookWatchedGroupChatsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let groupChatUid = action.groupChatUid;
   let url = buildUrl(constantPaths.Facebook.watchedGroupChat, {groupChatId: getEmailPrefix(groupChatUid)});
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedGroupChats', url, sendResponse, {
         action: 'getGroupChatParticipants',
         groupChatUid: groupChatUid,
         lastCheck: action.lastSynced
      }, groupChatUid, action.lastSynced);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getGroupChatParticipants', groupChatUid, sender, url, sendResponse);
   }
   else
   {
      // DRL FIXIT? We need better handling here, such as flagging this item on the server?
      
      // the item is not available, skip it for a day (just in case it's a temporary issue)
      Log_WriteError('Skipping group chat ' + groupChatUid + ' as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      ActionCheck_Aborting(FB_DATA_NAME);
      syncData.watchedGroupChats[groupChatUid].lastSynced = Date.now() + (SecondsPerDay * 1000);
      
      return false;
   }
   
   return true;
}
*/
function _InitiateFacebookWatchedGroupRequestsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let url = buildUrl(constantPaths.Facebook.watchedGroupRequests, {groupId: action.groupId});
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedGroupRequests', url, sendResponse, {
         action: 'getGroupRequests',
         groupId: action.groupId,
         lastCheck: action.lastSynced
      }, action.groupId, action.lastSynced);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getGroupRequests', action.groupId, sender, url, sendResponse);
   }
   else
   {
      // DRL FIXIT? We need better handling here, such as flagging this item on the server?
      
      // the item is not available, skip it for a while (just in case it's a temporary issue)
      Log_WriteError('Skipping group ' + action.groupId + ' for group requests handling as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      ActionCheck_Aborting(FB_DATA_NAME);
      localData.skipCheckingGroupsUntil[action.groupId] = Date.now() + (SecondsPerHour * 2 * 1000);
      
      return false;
   }
   
   return true;
}

function _InitiateFacebookWatchedGroupStaffAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let url = buildUrl(constantPaths.Facebook.watchedGroupStaff, {groupId: action.groupId});
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedGroupStaff', url, sendResponse, {
         action: 'getGroupStaff',
         groupId: action.groupId,
         lastCheck: action.lastSynced
      }, action.groupId, action.lastSynced);
   }
   else if (ActionCheck_GetUrl(FB_DATA_NAME) != url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getGroupStaff', action.groupId, sender, url, sendResponse);
   }
   else
   {
      // DRL FIXIT? We need better handling here, such as flagging this item on the server?
      
      // the item is not available, skip it for a while (just in case it's a temporary issue)
      if (sender.url.indexOf('should_open_welcome_member_composer') !== -1)  // not a group admin?
         Log_WriteWarning('Skipping group ' + action.groupId + ' for group staff handling as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      else
         Log_WriteError('Skipping group ' + action.groupId + ' for group staff handling as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      ActionCheck_Aborting(FB_DATA_NAME);
      localData.skipCheckingGroupsUntil[action.groupId] = Date.now() + (SecondsPerHour * 2 * 1000);
      
      return false;
   }
   
   return true;
}

function _InitiateFacebookWatchedGroupMembersAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let url = buildUrl(constantPaths.Facebook.watchedGroupMembers, {groupId: action.groupId});
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedGroupMembers', url, sendResponse, {
         action: 'getGroupMembers',
         groupId: action.groupId,
         lastCheck: action.lastSynced
      }, action.groupId, action.lastSynced);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender, 'should_open_welcome_member_composer'))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getGroupMembers', action.groupId, sender, url, sendResponse);
   }
   else
   {
      // DRL FIXIT? We need better handling here, such as flagging this item on the server?
      
      // the item is not available, skip it for a while (just in case it's a temporary issue)
      if (sender.url.indexOf('should_open_welcome_member_composer') !== -1)  // not a group admin?
         Log_WriteWarning('Skipping group ' + action.groupId + ' for group members handling as the URL ' + url + ' went to ' + sender.url);
      else
         Log_WriteError('Skipping group ' + action.groupId + ' for group members handling as the URL ' + url + ' went to ' + sender.url);
      ActionCheck_Aborting(FB_DATA_NAME);
      localData.skipCheckingGroupsUntil[action.groupId] = Date.now() + (SecondsPerHour * 2 * 1000);
      
      return false;
   }
   
   return true;
}

function _InitiateFacebookWatchedGroupQuestionsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let url = buildUrl(constantPaths.Facebook.watchedGroupQuestions, {groupId: action.groupId});
   if (sender.url == url && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedGroupQuestions', url, sendResponse, {
         action: 'getGroupQuestions',
         groupId: action.groupId,
         lastCheck: action.lastSynced     // DRL FIXIT? Is this needed?
      }, action.groupId, action.lastSynced);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getGroupQuestions', action.groupId, sender, url, sendResponse);
   }
   else
   {
      // DRL FIXIT? We need better handling here, such as flagging this item on the server?
      
      // the item is not available, skip it for a while (just in case it's a temporary issue)
      if (sender.url.indexOf('should_open_welcome_member_composer') !== -1)  // not a group admin?
         Log_WriteWarning('Skipping group ' + action.groupId + ' for group questions handling as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      else
         Log_WriteError('Skipping group ' + action.groupId + ' for group questions handling as tried "' + url + '" and was sent to "' + sender.url + '" instead.');
      ActionCheck_Aborting(FB_DATA_NAME);
      localData.skipCheckingGroupsUntil[action.groupId] = Date.now() + (SecondsPerHour * 2 * 1000);
      
      return false;
   }
   
   return true;
}

function _InitiateFacebookWatchedCustomListsAction(sender, accountID, syncData, localData, sendResponse, baseUrl, action)
{
   let listUrl = buildUrl(constantPaths.Facebook.watchedCustomLists, {listId: getEmailPrefix(action.listUid)});
   if (sender.url == listUrl && ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SendResponse(FB_DATA_NAME, 'WatchedCustomLists', listUrl, sendResponse, {
         action: 'getCustomList',
         listUid: action.listUid
      }, action.listUid);
   }
   else if (ActionCheck_OK(FB_DATA_NAME, sender))
   {
      ActionCheck_SetUrl(FB_DATA_NAME, action.category, 'getCustomList', action.listUid, sender, listUrl, sendResponse);
   }
   else
   {
      Log_WriteError('Skipping group ' + action.listUid + ' for custom lists handling as tried "' + listUrl + '" and was sent to "' + sender.url + '" instead.');
      ActionCheck_Aborting(FB_DATA_NAME);
      localData.skipCheckingCustomListsUntil = Date.now() + (SecondsPerHour * 6 * 1000);
      
      return false;
   }
   
   return true;
}
