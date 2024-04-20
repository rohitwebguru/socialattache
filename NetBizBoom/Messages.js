function CreateMessageHeaders(tableId, columns)
{
   CreateDateHeaders(tableId, columns, false, false);
}

/*
function InitMessages(rootNodes)
{
   let tables = Utilities_GetElementsByClass('messages_table');
   for (let table of tables)
   {
      if (rootNodes.length == 1 && (table == rootNodes[0] || Utilities_HasAsParent(table, rootNodes[0])))
      {
         // DRL FIXIT? I suspect these classes were only used for client side filtering which we no longer
         // support for messaging so I believe all code relating to these classes could be removed, leaving
         // only the FireElemChanged() I believe.
         
         let elems = Utilities_GetElementsByClass('read-status-icon', null, table);
         for (let elem of elems)
         {
            elem.addEventListener("click", function ()
            {
               var tr = Utilities_GetParentByTag(elem, 'TR');
               if (tr != null)
                  Class_ToggleByElement(tr, 'IsRead_0');
               FireElemChanged(elem)
            });
         }
         elems = Utilities_GetElementsByClass('flagged-status-icon', null, table);
         for (let elem of elems)
         {
            elem.addEventListener("click", function ()
            {
               var tr = Utilities_GetParentByTag(elem, 'TR');
               if (tr != null)
                  Class_ToggleByElement(tr, 'IsFlagged_1');
               FireElemChanged(elem)
            });
         }
      }
   }
}

function InitConversations(rootNodes)
{
   if (rootNodes.length != 1 || rootNodes[0] != document.body)
      return;     // this only needs to run once on initial page load
   
   let tables = Utilities_GetElementsByClass('conversations_table');
   for (let table of tables)
   {
      let ids = SelectTable.GetSelectedIds(table);
      if (ids.length > 0)
      {
         let row = Utilities_GetElementById(ids[0]);
         if (row)
         {
            // load the messages for the active conversation
            TableRowClicked(table, row);
         }
      }
   }
}
*/
function MarkAllAsRead()
{
   assert(0);  // DRL FIXIT! We have to change this code to update the state using ajax!
   /*
      var mailsUnread = document.querySelectorAll(".selected_row .message_unread");
      for (var i = 0; i < mailsUnread.length; i++)
      {
         mailsUnread[i].checked = true;
         Class_RemoveByElement(Utilities_GetParentByTag(mailsUnread[i], 'TR'), 'IsRead_0');
      }
      var mailsRead = document.querySelectorAll(".selected_row .message_read");
      for (var i = 0; i < mailsRead.length; i++)
      {
         mailsRead[i].checked = false;
         Class_RemoveByElement(Utilities_GetParentByTag(mailsRead[i], 'TR'), 'IsRead_0');
      }
   */
}

function MarkAllAsUnread()
{
   assert(0);  // DRL FIXIT! We have to change this code to update the state using ajax!
   /*
      var mailsUnread = document.querySelectorAll(".selected_row .message_unread");
      for (var i = 0; i < mailsUnread.length; i++)
      {
         mailsUnread[i].checked = false;
         Class_AddByElement(Utilities_GetParentByTag(mailsUnread[i], 'TR'), 'IsRead_0');
      }
      var mailsRead = document.querySelectorAll(".selected_row .message_read");
      for (var i = 0; i < mailsRead.length; i++)
      {
         mailsRead[i].checked = true;
         Class_AddByElement(Utilities_GetParentByTag(mailsRead[i], 'TR'), 'IsRead_0');
      }
   */
}

function MarkAllAsFlagged()
{
   assert(0);  // DRL FIXIT! We have to change this code to update the state using ajax!
   /*
      var mailsUnflagged = document.querySelectorAll(".selected_row .message_unflagged");
      for (var i = 0; i < mailsUnflagged.length; i++)
      {
         mailsUnflagged[i].checked = true;
         Class_AddByElement(Utilities_GetParentByTag(mailsUnflagged[i], 'TR'), 'IsFlagged_1');
      }
      var mailsFlagged = document.querySelectorAll(".selected_row .message_flagged");
      for (var i = 0; i < mailsFlagged.length; i++)
      {
         mailsFlagged[i].checked = false;
         Class_AddByElement(Utilities_GetParentByTag(mailsFlagged[i], 'TR'), 'IsFlagged_1');
      }
   */
}

function MarkAllAsUnflagged()
{
   assert(0);  // DRL FIXIT! We have to change this code to update the state using ajax!
   /*
      var mailsUnflagged = document.querySelectorAll(".selected_row .message_unflagged");
      for (var i = 0; i < mailsUnflagged.length; i++)
      {
         mailsUnflagged[i].checked = false;
         Class_RemoveByElement(Utilities_GetParentByTag(mailsUnflagged[i], 'TR'), 'IsFlagged_1');
      }
      var mailsFlagged = document.querySelectorAll(".selected_row .message_flagged");
      for (var i = 0; i < mailsFlagged.length; i++)
      {
         mailsFlagged[i].checked = true;
         Class_RemoveByElement(Utilities_GetParentByTag(mailsFlagged[i], 'TR'), 'IsFlagged_1');
      }
   */
}

var readTimerID = null;
var lastSelectedConversation = null;

function TableRowClicked(table, row)
{
   if (table.parentElement.id != 'UniConvos' && table.parentElement.id != 'WatchedPosts')
      return;
   
   SelectTable.SetSelection(table, row);
   
   // avoid reloading the messages when the user clicks on the links in the conversation box
   if (lastSelectedConversation == row)
      return;
   
   if (readTimerID)
   {
      clearTimeout(readTimerID)
      readTimerID = null;
   }
   
   // update the active conversation
   for (let elem of Utilities_GetElementsByClass('conversation_active', 'TR', table))
   {
      Class_RemoveByElement(elem, 'conversation_active');
   }
   Class_AddByElement(row, 'conversation_active');
   
   
   // update the list of messages for the active conversation...
   
   /* DRL FIXIT? Currently we're not showing the "read" and "flagged" options so there's nothing to update.
      let messages = Utilities_GetElementsByClass('uniconvos_messages_column')[0];
   
      // if there was a selected conversation we have to submit any changes that may have been made
      let url = Form_RootUri + '/v2/Messages/View';
      let params = Form_GetValues(messages);
      if (Object.keys(params).length > 0)
      {
         params['FormAction'] = 'Submit';
         // we use POST here just so we don't get returned all the messages (we're only sending the changes)
         ajax.post(url, params, function(data, httpCode, headers)
         {
            if (httpCode != 200)
               Log_WriteError("Got " + httpCode + " response for messages request " + url);
         });
      }
   */
   
   lastSelectedConversation = row;
   
   /* This is the responsibility of other code...
      // remove existing data
      while (messages.firstElementChild)
      {
         messages.removeChild(messages.firstElementChild);
      }
      messages.appendChild(Utilities_CreateHtmlNode("<DIV class='info_message'>" + Str('Loading...') + "</DIV>"));
      
      if (!isScrolledIntoView(document.querySelector('.selected_row')))
      {
         Utilities_GetElementById('UniConvoMessages').scrollTop = lastSelectedConversation.offsetTop;
      }
   */
   
   ViewState.LoadView(table.parentElement.id == 'UniConvos' ? 'UniConvoMessages' : 'WatchedPostMessages');
}

function LoadAssociatedMessages()
{
   // for the UniConvos and WatchedPosts pages, load the messages for the active conversation/post, if one is selected
   let table = Utilities_GetElementById('content_table');
   let ids = SelectTable.GetSelectedIds(table);
   if (ids.length > 0)
   {
      let row = Utilities_GetElementById(ids[0]);
      TableRowClicked(table, row);
   }
}

function StartUniConvoReadTimer()
{
   assert(readTimerID == null);
   readTimerID = setTimeout(function()
   {
      readTimerID = null;
      let table = Utilities_GetElementById('content_table');
      let ids = SelectTable.GetSelectedIds(table);
      if (ids.length > 0)
      {
         let uniConvoID = StripPrefix(ids[0]);
         if (!IsUniConvoRead(uniConvoID))
            ToggleUniConvoRead(uniConvoID);
      }
   }, 3000);
}

function IsUniConvoRead(uniConvoID)
{
   let convo = Utilities_GetElementById('conv_' + uniConvoID);
   let elems = Utilities_GetElementsByClass('message_read', 'INPUT', convo);
   if (elems.length == 0)
      return false;
   let elem = elems[0];
   let isRead = elem.checked ? 1 : 0;
   return isRead;
}

function UpdateUniConvoRead(uniConvoID)
{
   let convo = Utilities_GetElementById('conv_' + uniConvoID);
   let elems = Utilities_GetElementsByClass('message_read', 'INPUT', convo);
   if (elems.length == 0)
      return;
   let elem = elems[0];
   let isRead = elem.checked ? 1 : 0;
   
   let url = Form_RootUri + '/v2/UniConvos/' + uniConvoID;
   let params = {
      IsRead: isRead
   };
   ajax.post(url, params, function(data, httpCode, headers)
   {
   });
   
   // when the user actions the button don't change their setting
   if (readTimerID)
   {
      clearTimeout(readTimerID)
      readTimerID = null;
   }
}

function UpdateUniConvoFlagged(uniConvoID)
{
   let convo = Utilities_GetElementById('conv_' + uniConvoID);
   let elem = Utilities_GetElementsByClass('message_flagged', 'INPUT', convo)[0];
   let isFlagged = elem.checked ? 1 : 0;
   
   let url = Form_RootUri + '/v2/UniConvos/' + uniConvoID;
   let params = {
      IsFlagged: isFlagged
   };
   ajax.post(url, params, function(data, httpCode, headers)
   {
   });
}

function ToggleUniConvoRead(uniConvoID)
{
   let convo = Utilities_GetElementById('conv_' + uniConvoID);
   let elems = Utilities_GetElementsByClass('message_read', 'INPUT', convo);
   if (elems.length == 0)
      return;
   let elem = elems[0];
   elem.checked = !elem.checked;
   Utilities_FireEvent(elem, 'change');
}

// our input field does not accept HTML so we have to convert the email type to email_text before sending
function _ConvertEmailTypeToTextType(type)
{
   return type == 'email' ? 'email_text' : type;
}

function ReplyUniConvoMessage(uniConvoID, contactID, userID)
{
   ReplyMessage(uniConvoID, contactID, userID,
      _ConvertEmailTypeToTextType(Utilities_GetElementByName("ReplyMessageType").value),
      Utilities_GetElementByName("ReplyMessageInReplyTo").value,
      Utilities_GetElementByName("ReplyMessageType").value == "email"
         ? Utilities_GetElementByName("ReplyMessageSubject").value
         : null,
      Utilities_GetElementByName("ReplyMessageBody").value);
   
   Utilities_GetElementByName("ReplyMessageInReplyTo").value = "";
   Utilities_GetElementByName("ReplyMessageSubject").value = "";
   Utilities_GetElementByName("ReplyMessageBody").value = "";
}

function UniConvoMessageReplyClicked(messageID, responseType, messageTypeLabel, icon)
{
   Utilities_GetElementByName("ReplyMessageType").value = responseType;
   Utilities_GetElementByName("ReplyMessageInReplyTo").value = messageID;
   Utilities_GetElementsByClass("iconsmall", "IMG", Utilities_GetElementsByClass("ReplyMessageTypeMenu")[0])[0].src = "/v2/Skins/" + icon;
   Visibility_SetByElement(Utilities_GetElementByName("ReplyMessageSubject"), responseType == 'email');
   Utilities_GetElementByName("ReplyMessageBody").scrollIntoView({behavior: "smooth"});
   Utilities_GetElementByName("ReplyMessageBody").focus();
   DisplayMessage(Str("You are responding to a specific <0>.", messageTypeLabel), "success", "toast", 5);
}

function UniConvoMessageTypeClicked(responseType, icon)
{
   // DRL FIXIT! This is not the correct place for this change.
   if (Browser.IsExtensionV3()) icon = Form_RootUri + icon;
   
   Utilities_GetElementByName("ReplyMessageType").value = responseType;
   Utilities_GetElementsByClass("iconsmall", "IMG", Utilities_GetElementsByClass("ReplyMessageTypeMenu")[0])[0].src = icon;
   Visibility_SetByName("ReplyMessageSubject", responseType == 'email');
}

function ReplyPostComment(parentMessageID, contactID, userID)
{
   ReplyMessage(null, contactID, userID,
      Utilities_GetElementByName("ReplyMessageType").value,
      Utilities_GetElementByName("ReplyMessageInReplyTo").value ? Utilities_GetElementByName("ReplyMessageInReplyTo").value : parentMessageID,
      Utilities_GetElementByName("ReplyMessageType").value == "email"
         ? Utilities_GetElementByName("ReplyMessageSubject").value
         : null,
      Utilities_GetElementByName("ReplyMessageBody").value);
   
   Utilities_GetElementByName("ReplyMessageInReplyTo").value = "";
   Utilities_GetElementByName("ReplyMessageSubject").value = "";
   Utilities_GetElementByName("ReplyMessageBody").value = "";
}

function ReplyMessage(uniConvoID, contactID, userID, type, inReplyTo, subject, body)
{
   DisplayMessage(Str('Please wait...'), 'info', 'center');
   
   let url = Form_RootUri + '/v2/Messages/Reply';
   let params = {
      UniConvoID: uniConvoID,
      ContactID: contactID,
      UserID: userID,
      Type: type,
      InReplyTo: inReplyTo,
      Subject: subject,
      Body: body
   };
   ajax.post(url, params, function(data, httpCode, headers)
   {
      if (data && httpCode == 200)
      {
         DisplayMessage(Str('Your message has been queued for sending.'), 'success', 'center', 4);
      }
      else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
      {
         // server unavailable, network error, etc.
         Log_WriteWarning('Server is not available to reply to message: ' + httpCode);
         DisplayMessage(Str('The server is not available.'), 'error');
      }
      else
      {
         Log_WriteError('Error replying to message: ' + httpCode);
         let resp = Json_FromString(data);
         if (resp)
         {
            if (resp.data)
               data = resp.data;
            else
               data = resp.message;
         }
         else
            data = Str('Your message could not be sent.');
         DisplayMessage(data, 'error');
      }
   });
}

function ResendMessage(messageID)
{
   DisplayMessage(Str('Please wait...'), 'info', 'center');
   
   let url = Form_RootUri + '/v2/Messages/Resend';
   let params = {
      MessageID: messageID
   };
   ajax.post(url, params, function(data, httpCode, headers)
   {
      if (data && httpCode == 200)
      {
         DisplayMessage(Str('Your message has been queued for re-sending.'), 'success', 'center', 4);
      }
      else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
      {
         // server unavailable, network error, etc.
         Log_WriteWarning('Server is not available to resend the message: ' + httpCode);
         DisplayMessage(Str('The server is not available.'), 'error');
      }
      else
      {
         Log_WriteError('Error resending message: ' + httpCode);
         let resp = Json_FromString(data);
         if (resp)
            data = resp.data;
         else
            data = Str('Your message could not be sent.');
         DisplayMessage(data, 'error');
      }
   });
}

SelectTable.AddRowClickCallback(TableRowClicked);
/*
DocumentLoad.AddCallback(function(rootNodes)
{
   InitMessages(rootNodes);
   InitConversations(rootNodes);
});
*/
/*
function isScrolledIntoView(el) {
   let rect = el.getBoundingClientRect();
   let elemTop = rect.top;
   let elemBottom = rect.bottom;
   return (elemTop >= 0) && (elemBottom <= window.innerHeight);
}
*/
