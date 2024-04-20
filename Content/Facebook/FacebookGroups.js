function getGroupName(groupUid)
{
   let name = findElement(srchPathFBG("facebookGroupName"));
   if (name == null)
   {
      Log_WriteError('No group name found for group ' + groupUid + ' at ' + window.location.href);
   }
   return name;
}

function isGroupMember(groupUid)
{
   // DRL FIXIT? We should have an opposing check so we know when our selector has gone bad.
   return findElement(srchPathFBG("isFacebookGroupMember")) != null;
}

function isGroupAdmin(groupUid)
{
   // DRL FIXIT? We should have an opposing check so we know when our selector has gone bad.
   return findElement(srchPathFBG("isFacebookGroupAdmin")) != null;
}

async function scrapeGroupInfo(action)
{
   assert(!(typeof action === 'string' || action instanceof String));
   
   // at this point we must be viewing the group home page
   DisplayMessage(Str('Getting group information...'), 'busy');
   
   let accountInfo = getFacebookAccountInfo();
   if (accountInfo == null)
   {
      assert(0);
      return;
   }
   let accountID = accountInfo.id;
   
   let groupId = parseInt(getGroupIDFromGroupPage(window.location.href));
   let groupUid = 'fbp:' + validateAddress(groupId + '@fbgroup.socialattache.com');
   
   // I changed this to wait because sometimes the page takes a while to load
   let memberCount = await waitForElement(srchPathFBG("memberCount"));
   
   let result = {
      GroupUid: groupUid,
      Name: findElement(srchPathFBG("facebookGroupName")),
      GroupUrl: 'https://facebook.com/groups/' + groupId,
      MemberCount: memberCount,
      IsAdmin: isGroupAdmin(groupUid)
   };
   
   if (result.Name == null || result.MemberCount == null || result.IsAdmin == null)
   {
      Log_WriteError('Unable to get group information for group ' + groupId + ' at ' + window.location.href + ': ' + GetVariableAsString(result));

      await reqPushDisplayMessage(action.originalTabID, Str('There was an error getting the group information.'), 'error');
   
      await reqRemoveTab();
   
      return;
   }
   
   await reqSetGroupInfo(FB_DATA_NAME, accountID, result);
   
   await reqPushDisplayMessage(action.originalTabID, Str('The group has been imported.'),
      'success', 'center', 20);
   
   await reqRemoveTab();
}

async function isRadioImage(url, displayWidth, yOffset)
{
   return new Promise((resolve, reject) =>
   {
      let img = new window.Image();
      img.crossOrigin = `Anonymous`;
      img.src = url;
      img.onload = function()
      {
         let isRadio = false;

         try
         {
            let canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
   
            let ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
   
            // the offset given is scaled
            yOffset = parseInt(yOffset * img.width / displayWidth);
            
            isRadio = true;
   
            // we assume the icon is roughly square and check 1/4 the height to see if we can find the horizontal
            // top line of a checkbox which is indicated by at least 1/2 of the pixels on a row being dark, to
            // allow for the case where the icon is smaller than the width of the image since it is often so and
            // left justified though this doesn't affect our code
            let minDark = canvas.width / 2;
            for (let i = 0; i < canvas.height / 4; i++)
            {
               const row = ctx.getImageData(0, yOffset + i, canvas.width, 1);
               let darkCount = 0;
               let pixel = 0;
               for (let j = 0; j < canvas.width; j++, pixel += 4)
               {
                  if (row.data[pixel+3] >= 64 &&   // skip transparent pixels (or partial transparent ones to be safe)
                     row.data[pixel] + row.data[pixel+1] + row.data[pixel+2] < 192) // and non-dark pixels
                     darkCount++;
               }
               if (darkCount >= minDark)
               {
                  isRadio = false;  // must be a checkbox
                  break;
               }
            }
         }
         catch (e)
         {
            Log_WriteException(e);
         }
   
         resolve(isRadio);
      }
   });
   
   return true;
}

async function scrapeGroupQuestions(action)
{
   assert(!(typeof action === 'string' || action instanceof String));
   
   // at this point we must be viewing the group questions page
   DisplayMessage(Str('Getting group questions...'), 'busy');
   
   let accountInfo = getFacebookAccountInfo();
   if (accountInfo == null)
   {
      assert(0);
      return;
   }
   let accountID = accountInfo.id;
   
   let groupId = parseInt(getGroupIDFromGroupPage(window.location.href));
   let groupUid = 'fbp:' + validateAddress(groupId + '@fbgroup.socialattache.com');
   
   let result = {
      GroupUid: groupUid,
      Questions: []
   };
   
   let container = await waitForElement(srchPathFBG("facebookGroupQuestionsContainer"));
   if (container == null)
   {
      if (findElement(srchPathFBG("facebookGroupContentUnavailable")) ||
         findElement(srchPathFBG("facebookGroupHasNoQuestions")))
      {
         return;
      }
      
      if (!findElement(srchPathFBG("facebookGroupHasLoaded")))
      {
         Log_WriteError('No group questions container found for group ' + groupId + ' at ' + window.location.href + ' possible throttling?');
         await reqSetThrottled(FB_DATA_NAME, true, 'getGroupQuestions');
         return;
      }
      if (!findElement(srchPathFBG("facebookGroupCanAdminister")))
      {
         Log_WriteWarning('No group questions container found for group ' + groupId + ' at ' + window.location.href + ' possible non-member or non-admin?');
      }
      else
         Log_WriteError('No group questions container found for group ' + groupId + ' at ' + window.location.href);
      return;
   }
   
   let message = null;
   let questions = findElements(srchPathFBG('facebookGroupQuestions'), null, container)
   if (questions.length == 0)
   {
      if (findElement(srchPathFBG("facebookGroupContentUnavailable")) ||
         findElement(srchPathFBG("facebookGroupHasNoQuestions")))
         ;   // no questions
      else if (!findElement(srchPathFBG("facebookGroupHasLoaded")))
         message = 'The group questions page did not finish loading.';
      else if (!findElement(srchPathFBG("facebookGroupCanAdminister")))
         message = 'It appears you do not have administration access to this group.';
      else
         message = 'There was a problem fetching the questions.';
   }
   if (message)
   {
      await reqPushDisplayMessage(action.originalTabID, Str(message), 'error');
      
      await reqRemoveTab();
      
      return;
   }

   let hasError = false;
   for (let i = 0; i < questions.length; i++)
   {
      if (findElement(srchPathFBG('facebookGroupQuestionTypeText'), null, questions[i]))
      {
         let label = findElement(srchPathFBG('facebookGroupQuestionTextLabel'), null, questions[i]);
         if (label == null)
         {
            Log_WriteError('Unable to get group text question ' + i + ' label for group ' + groupId + ' at ' + window.location.href);
            Log_WriteDOM(questions[i]);
            hasError = true;
         }
         else
         {
            result.Questions.push({
               Label: label,
               Type: 'string',
            })
         }
      }
      else if (findElement(srchPathFBG('facebookGroupQuestionTypeOptions'), null, questions[i]))
      {
         // DRL FIXIT? We can have checkboxes or multiple choice so it would be nice to know which it is.
         let label = findElement(srchPathFBG('facebookGroupQuestionOptionsLabel'), null, questions[i]);
         if (label == null)
         {
            Log_WriteError('Unable to get group options question ' + i + ' label for group ' + groupId + ' at ' + window.location.href);
            Log_WriteDOM(questions[i]);
            hasError = true;
         }
         else
         {
            let options = findElements(srchPathFBG('facebookGroupQuestionOptionsLabels'), null, questions[i]);
            if (options.length == 0)
            {
               Log_WriteError('Unable to get group options question ' + i + ' options for group ' + groupId + ' at ' + window.location.href);
               Log_WriteDOM(questions[i]);
               hasError = true;
            }
            else
            {
/*
               let isRadioImage = findElement(srchPathFBG('facebookGroupQuestionisRadioImage'), null, questions[i]);
               let isRadio = findElement(srchPathFBG('facebookGroupQuestionIsRadio'), null, questions[i]);
               if (isRadioImage == null && isRadio == null)
               {
                  Log_WriteError('Unable to get group options question ' + i + ' type for group ' + groupId + ' at ' + window.location.href);
                  Log_WriteDOM(questions[i]);
                  hasError = true;
               }
               else if (isRadioImage != null && isRadio != null)
               {
                  Log_WriteError('Got BOTH group options question ' + i + ' types for group ' + groupId + ' at ' + window.location.href);
                  Log_WriteDOM(questions[i]);
                  hasError = true;
               }
 */
               let isRadio = false;
               let url = findElement(srchPathFBG('facebookGroupQuestionIconUrl'), null, questions[i]);
               let yOffset = findElement(srchPathFBG('facebookGroupQuestionIconYOffset'), null, questions[i]);
               let displayWidth = findElement(srchPathFBG('facebookGroupQuestionIconWidth'), null, questions[i]);
               if (url == null || yOffset == null || displayWidth == null)
               {
                  Log_WriteError('Unable to get group options question ' + i + ' type for group ' + groupId + ' at ' + window.location.href);
                  Log_WriteDOM(questions[i]);
                  hasError = true;
               }
               else
                  isRadio = await isRadioImage(url, displayWidth, -yOffset);
               result.Questions.push({
                  Label: label,
                  Type: isRadio ? 'radio' : 'checkboxes',
                  Options: options
               })
            }
         }
      }
      else
      {
         Log_WriteError('Unable to get group question ' + i + ' type for group ' + groupId + ' at ' + window.location.href);
         Log_WriteDOM(questions[i]);
         hasError = true;
      }
   }
   
   await reqSetGroupQuestions(FB_DATA_NAME, accountID, result);
   
   if (hasError)
      await reqPushDisplayMessage(action.originalTabID, Str('There was a problem importing your group questions. Please file a support ticket via the main menu on the right side of this page.'),
         'error', 'center', 20);
   else
      await reqPushDisplayMessage(action.originalTabID, Str('Group questions have been imported, you may now import the member answers.'),
         'success', 'center', 20);
   
   await reqRemoveTab();
}
