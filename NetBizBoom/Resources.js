function Resources_GetResourceIDFromUrl(url)
{
   url = Url_StripParams(url);
   let i = url.indexOf('Resources/');
   if (i == -1)
   {
      Log_WriteError('Invalid resource URL: ' + url);
      return null;
   }
   i += 10;
   url = url.substr(i);
   let j = url.indexOf('/');
   if (j == -1)
      j = url.length;
   return url.substr(0, j);
}

function Resources_onImageLoaded(event)
{
   Utilities_RemoveEvent(event.target, 'load', Resources_onImageLoaded);
   Utilities_RemoveEvent(event.target, 'error', Resources_onImageError);
   
   Visibility_ShowByElement(event.target.parentElement); // show DIV
}

function Resources_onImageError(event)
{
   Utilities_RemoveEvent(event.target, 'load', Resources_onImageLoaded);
   Utilities_RemoveEvent(event.target, 'error', Resources_onImageError);
   
   event.target.src = '';
   Visibility_HideByElement(event.target.parentElement); // hide DIV
}

// DRL FIXIT? I suspect this should be a base ID instead of a name as I believe we always have an ID but
// some element types don't have a name, and we can use the base ID with a suffix to find associated elements.
let _ResourceVariableName = null;

function Resources_SelectNewTemporaryFile(baseID, clientFileID, filename)
{
   let elem = Utilities_GetElementById(baseID);
   elem.value = clientFileID;
   Resources_SelectorChanged(elem, true);
   
   // DRL FIXIT? I'm not sure about the scenario where this is needed, and why this method doesn't do the
   // same thing that Resources_SelectNewResource() below does - don't we need to unselect any selected resource?
   // this is required to mark the form as changed so it'll submit properly
   OnElemChanged(elem);
}

function Resources_SelectNewResource(baseID, resourceID, filename)
{
   let targetSelect = Utilities_GetElementById(baseID + '_Select');
   if (targetSelect == undefined) targetSelect = Utilities_GetElementById(baseID);
   
   let resourceElem = Utilities_GetElementById(baseID + '_ResourceID');
   let oldResourceID = resourceElem.value;
   
   let opt = document.createElement('option');
   opt.value = resourceID;
   opt.innerHTML = filename;
   
   // add the new item right after the old one (if there was one) so it's in the hierarchy properly
   let found = false;
   for (let option of targetSelect.options)
   {
      if (option.value == oldResourceID)
      {
         // we need to add any prefix spacing in case it's in an optgroup
         let i = option.innerHTML.lastIndexOf('&nbsp;');
         if (i != -1)
         {
            i += 6;
            opt.innerHTML = option.innerHTML.substr(0, i) + opt.innerHTML;
         }
         
         // we get the parent because it could be an optgroup and not the targetSelect
         option.parentElement.insertBefore(opt, option.nextSibling);
         found = true;
      }
   }
   if (!found) // DRL FIXIT? New item so let's just add it at the end (won't be in the hierarchy correctly).
      targetSelect.appendChild(opt);
   
   resourceElem.value = resourceID;
   
   // initialize the enabled/disabled state of the menu items given the selection has changed
   Utilities_FireEvent(targetSelect, 'change');
   
   // this is required to mark the form as changed so it'll submit properly
   OnElemChanged(targetSelect);
}

function Resources_HandleNewResource(data, httpCode)
{
   data = Json_FromString(data);
   
   ClosePopUp();
   
   if (data == null)
   {
      DisplayErrorMessage(Str('Connection or timeout error'));
   }
   else if (data.hasOwnProperty('status') && data.status == 'error')
   {
      DisplayErrorMessage(data.message);
   }
   else if (data.hasOwnProperty('status') && data.status == 'cancel')
   {
   }
   else
   {
      let resourceID = data.data.ResourceID;
      let filename = data.data.Name;
   
      Resources_SelectNewResource(_ResourceVariableName, resourceID, filename);
   }
   
   _ResourceVariableName = null;
}

function Resources_SelectorChanged(elem, clear = null, refreshOnChange = null)
{
   let name = elem.name.indexOf('_Select') != -1
      ? elem.name.substr(0, elem.name.indexOf('_Select'))  // remove "_Select" suffix if it's there
      : elem.name;
   
   // the select element has the Select_ prefix when using the file upload controls to avoid conflict
   let targetSelect = Utilities_GetElementByName(name + '_Select');
   if (targetSelect == undefined) targetSelect = Utilities_GetElementByName(name);
   if (targetSelect.tagName != 'SELECT')
      return;  // this is not a select list, likely a hidden element holding a client file ID
   
   let selectedValue = targetSelect.options[targetSelect.selectedIndex].value;
   
   Resources_SelectorUpdate(elem, selectedValue, clear, refreshOnChange);
}

// NOTE: This code depends on FileUpload.js and TemporaryFiles.php so keep changes to them in sync!
function Resources_SelectorUpdate(elem, action, clear, refreshOnChange)
{
   let name = elem.name.indexOf('_Select') != -1
      ? elem.name.substr(0, elem.name.indexOf('_Select'))  // remove "_Select" suffix if it's there
      : elem.name;
   
   // the select element has the Select_ prefix when using the file upload controls to avoid conflict
   let targetSelect = Utilities_GetElementByName(name + '_Select');
   if (targetSelect == undefined) targetSelect = Utilities_GetElementByName(name);
   if (targetSelect.tagName != 'SELECT')
      return;  // this is not a select list, likely a hidden element holding a client file ID
//   let visible = Visibility_IsShownByElement(targetSelect);
   
   let resourceElem = Utilities_GetElementById(name + '_ResourceID');
   let fileUploadElem = Utilities_GetElementById(name + '_FileUploadID');
   let thumbnailElem = Utilities_GetElementById(name + '_Thumbnail');
   let filenameElem = Utilities_GetElementById(name + '_Filename');
   let linkElem = Utilities_GetElementById(name + '_Link');
   let placeholderElem = Utilities_GetElementById(name + '_Placeholder');
   let downloadElem = null;
   let createElem = null;
   let editElem = null;
   let copyElem = null;
   let clearElem = null;
   
   let resourceID = action == '_CLEAR_' ? null : resourceElem.value;
   
   if (thumbnailElem)
   {
      let temp = Utilities_GetElementsByClass('ResourceChooser_Download', null, thumbnailElem.parentElement.parentElement);
      if (temp.length > 0) downloadElem = temp[0];
      temp = Utilities_GetElementsByClass('ResourceChooser_Create', null, thumbnailElem.parentElement.parentElement);
      if (temp.length > 0)
      {
         createElem = temp[0];
         Utilities_AddEvent(createElem, 'click', function(event)
         {
            Resources_SelectorUpdate(elem, '_CREATE_', false, refreshOnChange);
            event.stopPropagation();
            event.preventDefault();
            return false;
         }, 'Resources_SelectorUpdate');
      }
      temp = Utilities_GetElementsByClass('ResourceChooser_Edit', null, thumbnailElem.parentElement.parentElement);
      if (temp.length > 0)
      {
         editElem = temp[0];
         Utilities_AddEvent(editElem, 'click', function(event)
         {
            Resources_SelectorUpdate(elem, '_EDIT_', false, refreshOnChange);
            event.stopPropagation();
            event.preventDefault();
            return false;
         }, 'Resources_SelectorUpdate');
      }
      temp = Utilities_GetElementsByClass('ResourceChooser_Copy', null, thumbnailElem.parentElement.parentElement);
      if (temp.length > 0)
      {
         copyElem = temp[0];
         Utilities_AddEvent(copyElem, 'click', function(event)
         {
            Resources_SelectorUpdate(elem, '_COPY_', false, refreshOnChange);
            event.stopPropagation();
            event.preventDefault();
            return false;
         }, 'Resources_SelectorUpdate');
      }
      temp = Utilities_GetElementsByClass('ResourceChooser_Clear', null, thumbnailElem.parentElement.parentElement);
      if (temp.length > 0)
      {
         clearElem = temp[0];
         Utilities_AddEvent(clearElem, 'click', function(event)
         {
            Resources_SelectorUpdate(elem, '_CLEAR_', true, refreshOnChange);
            event.stopPropagation();
            event.preventDefault();
            return false;
         }, 'Resources_SelectorUpdate');
      }
   }
   
   let filename = filenameElem.innerHTML;
//   let selectedValue = targetSelect.options[targetSelect.selectedIndex].value;
   let selectedLabel = targetSelect.options[targetSelect.selectedIndex].label.trim(); // remove prefix spaces
   let selectedFullLabel = targetSelect.options[targetSelect.selectedIndex].getAttribute('fullvalue');
   
   if (clear === true || action == '_CLEAR_' || action == '_LINK_' || action == '_PHLDR_')
   {
      resourceID = '';
      filename = '';
   }
   else if (action == '_COPY_')
   {
      let url = '/v2/Resources?Fields=ResourceID,Name,ThumbnailURL&CopyResourceID=' + resourceID;
      
      _ResourceVariableName = name;
      
      // this will queue the requests so only one runs at a time, avoiding deadlock and other issues
      // use a long timeout when copying resources
      let timeout = 10 * 60 * 1000;
      ExecuteAjax('POST', url, {}, timeout, Str('Duplicating...'), function(data, httpCode)
      {
         data = Json_FromString(data);
         
         if (data == null)
         {
            DisplayErrorMessage(Str('Connection or timeout error'));
         }
         else if (data.hasOwnProperty('status') && data.status == 'error')
         {
            DisplayErrorMessage(data.message);
         }
         else if (data.hasOwnProperty('status') && data.status == 'cancel')
         {
         }
         else
         {
            let resourceID = data.data.ResourceID;
            
            // allow the user to choose a name for the copied resource
            DisplayEmbeddedItemForm("ResourceEdit",
               'ResourceID', resourceID,
               'CallbackMethod', 'Resources_HandleNewResource');
         }
      });
      
      refreshOnChange = false;   // refresh will occur when copy completes
   }
   else if (action == '_CREATE_')
   {
      let createInfo = JSON.parse(Utilities_GetElementByName(name + '_CreateInfo').value);
      
      DisplayEmbeddedItemForm("ResourceEdit",
         'SectionName', createInfo.SectionName,
         'LimitVentureID', createInfo.LimitVentureID,
         'ResourceFolderID', createInfo.ResourceFolderID,
         'LimitType', createInfo.LimitType,
         'Name', createInfo.Name,
         'ReferenceResourceID', createInfo.ReferenceResourceID,
         // I commented out the below because I want the list to show the new item selected in all cases
         // and this seemed to work with it commented out (I think the option gets set then the page reloads).
         'CallbackMethod', /*refreshOnChange ? 'RefreshForm' :*/ 'Resources_HandleNewResource');
      
      _ResourceVariableName = name;
      
      refreshOnChange = false;   // refresh will occur when dialog completes
   }
   else if (action == '_EDIT_')
   {
      ajax.get(Form_RootUri + '/v2/Resources/' + resourceID, {'Fields': 'Type,ExternalID'}, function(resp, httpCode)
      {
         if (resp == null || httpCode != 200)
         {
            Log_WriteError('Error getting type and external ID for resource: ' + resourceID);
            return;
         }
         
         resp = Json_FromString(resp);
         let type = resp.data.Type;
         let externalID = resp.data.ExternalID;
         
         if (type.startsWith('image/'))
            Resources_LaunchImageEditor(elem, name, resourceID);
         else if (type.indexOf('triggers') != -1)
            DisplayInlineItemForm('TriggersDesign', 'ResourceID', resourceID);
         else if (type.indexOf('onboarding') != -1 || type.indexOf('timetable') != -1)
            DisplayInlineItemForm('ListservDesign', 'ResourceID', resourceID);
         else
            assert(0);
      });
      
      // DRL FIXIT! I think we should be refreshing when we get the update though?
      refreshOnChange = false;   // don't refresh the page if we are opening a dialog
   }
   else if (!action.startsWith('_'))
   {
      resourceID = action;
      filename = selectedFullLabel ? selectedFullLabel : selectedLabel;
   }
   else if (resourceID)
   {
      // in case this is a newly added resource via the image editors update the name
      for (let option of targetSelect.options)
      {
         if (option.value == resourceID)
            filename = option.label.trim(); // remove prefix spaces
      }
   }
   
   if (action != '_LINK_' && action != '_PHLDR_')
      targetSelect.selectedIndex = 0;
   
   if (thumbnailElem)
   {
      // we want to get notified if the image load succeeds or fails so we can control the visibility
      Utilities_AddEvent(thumbnailElem, 'load', Resources_onImageLoaded);
      Utilities_AddEvent(thumbnailElem, 'error', Resources_onImageError);
   }
   
   if (resourceID)
   {
      // we add time to the URL in order to force the refresh of the image in case it has changed via one of the image editors
      if (thumbnailElem) thumbnailElem.src = Form_RootUri + '/v2/Resources/' + resourceID + '/Thumbnail?Dummy=' + new Date().getTime();
      if (downloadElem) downloadElem.href = Form_RootUri + '/v2/Resources/' + resourceID + '/Download?Dummy=' + new Date().getTime();
      if (filenameElem) filenameElem.innerHTML = filename;
      
      if (/*visible &&*/ (editElem || downloadElem))
      {
         ajax.get(Form_RootUri + '/v2/Resources/' + resourceID, {'Fields': 'Type'}, function(resp, httpCode)
         {
            if (resp == null || httpCode != 200)
            {
               Log_WriteError('Error getting type for resource: ' + resourceID);
               return;
            }
            
            resp = Json_FromString(resp);
            let type = resp.data.Type;
            
            let isEditSupported = type.startsWith('image/') ||
               type.includes('triggers') || type.includes('onboarding') || type.includes('timetable');
            if (editElem) Visibility_SetByElement(editElem, isEditSupported);
            
            // only MIME type are downloadable
            let isDownloadSupported = type.includes('/');
            if (downloadElem) Visibility_SetByElement(downloadElem, isDownloadSupported);
         });
      }
      
      // whenever we have a selected item we clear out the file upload otherwise there'd be two items available for use
      if (fileUploadElem)
         FileUpload.Clear(fileUploadElem);
   }
   else
   {
      if (thumbnailElem) thumbnailElem.src = '';
      if (downloadElem) downloadElem.href = '';
      if (filenameElem) filenameElem.innerHTML = '';
   }
   
   resourceElem.value = resourceID;
   
   // DRL FIXIT? We show items here and then hide them later when we get the results from the above async
   // queries. The user experience would be better if we hid them first and showed them only if appropriate.
   if (downloadElem) Visibility_HideByElement(downloadElem);      // will be shown when we get the type above
   if (editElem) Visibility_HideByElement(editElem);              // will be shown when we get the type above
   if (createElem) Visibility_SetByElement(createElem, /*visible &&*/ true);  // create doesn't need an existing resourceID
   if (thumbnailElem) Visibility_SetByElement(thumbnailElem, /*visible &&*/ resourceID);
   if (copyElem) Visibility_SetByElement(copyElem, /*visible &&*/ resourceID);
   if (clearElem) Visibility_SetByElement(clearElem, /*visible &&*/ resourceID);
   if (filenameElem) Visibility_SetByElement(filenameElem, /*visible &&*/ resourceID);
   if (linkElem) Visibility_SetByElement(linkElem, /*visible &&*/ action == '_LINK_');
   if (placeholderElem) Visibility_SetByElement(placeholderElem, /*visible &&*/ action == '_PHLDR_');
   
   OnElemChanged(targetSelect);
   
   if (refreshOnChange)
      RefreshForm();
}

// NOTE: This code depends on FileUpload.js and TemporaryFiles.php so keep changes to them in sync!
function Resources_FileUploaded(selectName)
{
   // when we upload a file we clear the selection otherwise there'd be two items available for use
   let targetSelect = Utilities_GetElementByName(selectName);
   Resources_SelectorUpdate(targetSelect, '_CLEAR_');
}

// launches the appropriate editor, used with the resource picker
// editor can be Doka or Canva
function Resources_LaunchImageEditor(elem, name, resourceID)
{
   if (resourceID)
   {
      ajax.get(Form_RootUri + '/v2/Resources/' + resourceID, {}, function(resp, httpCode)
      {
         if (resp == null || httpCode != 200)
         {
            Log_WriteError('Error getting resource: ' + resourceID);
            return;
         }
         
         resp = Json_FromString(resp);
         
         let isImage = resp.data.Type.startsWith('image/');
         if (isImage)
         {
            // DRL FIXIT! We should be putting the VersionKey in here so we're editing the correct
            // language of the image in the case of a template!
            let callback = function(resourceID, filename, fileSize)
            {
               assert(Utilities_GetElementById(name + '_ResourceID').value == resourceID);   // I don't think it would ever change?
               Utilities_GetElementById(name + '_ResourceID').value = resourceID;   // update to new resourceID
               Resources_SelectorChanged(elem);
            };
            
            ImageEditor.CreateImageEditor(resourceID, callback);
         }
         else
         {
            alert(Str('This is not an image.'));
         }
      });
   }
   else
   {
      let callback = function(resourceID, filename, fileSize)
      {
         // DRL FIXIT! We should be adding the item in the proper place given its folder and name ordering.
         let targetSelect = Utilities_GetElementByName(name + '_Select');
         let opt = document.createElement('option');
         opt.value = resourceID;
         opt.innerHTML = filename;
         targetSelect.appendChild(opt);
//         targetSelect.selectedIndex = targetSelect.length-1;
//         Utilities_FireEvent(targetSelect, 'change');
         
         Utilities_GetElementById(name + '_ResourceID').value = resourceID;   // update to new resourceID
         Resources_SelectorChanged(elem);
      };
      
      if (editor == 'Doka')
         ImageEditor.CreateImageEditor(null, callback);
      else if (editor == 'Canva')
         ImageEditor.CreateCanvaEditor(null, null, null, null, null, callback);
      else
         assert(0);
   }
}

/*
// configures a button that when clicked shows the appropriate editor, used with the resource picker
// editor can be Doka or Canva
function Resources_PrepImageEditButton(elem, name, resourceID, editor, visible)
{
   Visibility_SetByElement(elem, visible);
   
   if (resourceID)
   {
      ajax.get(Form_RootUri + '/v2/Resources/' + resourceID, {}, function (resp, httpCode)
      {
         if (resp == null || httpCode != 200)
         {
            Log_WriteError('Error getting resource: ' + resourceID);
            return;
         }

         resp = Json_FromString(resp);
      
         let isImage = resp.data.Type.startsWith('image/');
         if (isImage)
         {
            elem.onclick = function ()
            {
               // DRL FIXIT! We should be putting the VersionKey in here so we're editing the correct
               // language of the image in the case of a template!
               let callback = function (resourceID, filename, fileSize)
               {
                  // we add time to the URL in order to force the refresh of the image
                  let thumbnail = Utilities_GetElementById('Thumbnail_' + name);
                  if (thumbnail)
                     thumbnail.src = Form_RootUri + '/v2/Resources/' + resourceID + '/Thumbnail#' + new Date().getTime();
               };
   
               ImageEditor.CreateImageEditor(resourceID, callback);
            };
         }
         Visibility_SetByElement(elem, visible && isImage);
      });
   }
   else 
   {
      elem.onclick = function ()
      {
         let callback = function (resourceID, filename, fileSize)
         {
            // DRL FIXIT! We should be adding the item in the proper place given its folder and name ordering.
            let targetSelect = Utilities_GetElementByName(name + '_Select');
            let opt = document.createElement('option');
            opt.value = resourceID;
            opt.innerHTML = newName;
            targetSelect.appendChild(opt);
            targetSelect.selectedIndex = targetSelect.length-1;
   
            Utilities_FireEvent(targetSelect, 'change');
         };
   
         if (editor == 'Doka')
            ImageEditor.CreateDokaEditor(null, null, null, callback);
         else if (editor == 'Canva')
            ImageEditor.CreateCanvaEditor(null, null, null, null, null, callback);
         else
            assert(0);
      }
   }
}
*/

function Resources_PickerSelectorChanged(elem, previewFrameID, languagePrefix)
{
   let resourceID = elem.options[elem.selectedIndex].value;
   let preview = Utilities_GetElementById(previewFrameID);
   let versionKey = '';
   if (languagePrefix != null)
   {
      if (languagePrefix.length == 3)  // is it like "en-"?
         languagePrefix += 'XX';       // if so add a locale to make "en-XX", locale will be ignored if there's no exact match
      versionKey = '?Version=' + languagePrefix + '/any';
   }
   preview.src = window.location.protocol + '//' + window.location.hostname + '/v2/Resources/' + resourceID +
      '/Preview' + versionKey;
}
