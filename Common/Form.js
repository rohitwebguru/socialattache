// ========================================================================
//        Copyright � 2008 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// DRL FIXIT! Added this for Chrome extension not properly loaded which seems to happen fairly often.
if (typeof DocumentLoad === 'undefined')
   alert('Please remove and re-install the Social Attache Chrome extension as it was not properly installed.');

var Form_ThisUri = window.location.href;   // this can be changed later as needed as it may not be correct for POST results
if (!Browser.IsExtension())
{
   // this is initialized in config.js for the extension and we don't want to override it
   var Form_MainUri = window.location.protocol + '//' + window.location.hostname + '/Main.php';   // DRL FIXIT! This should be initialized properly!
}

// local variables
var _Form_CheckToSave = true;
var _Form_IsLeaving = false;
var _Form_UnloadHandled = false;
var _Form_IsProcessingInit = 0;
var _Form_DisableSubmitCount = 0;
var _Form_WaitingMessage = null;

FormPrepValues =
   {
      callbacks: new Array(),
      
      Prepare: function()
      {
         let canContinue = true;
         
         for (let callback of FormPrepValues.callbacks)
         {
            if (!callback())
               canContinue = false; // don't submit the form yet
         }
         return canContinue;
      },
      
      AddCallback: function(callback)
      {
         for (let cb of FormPrepValues.callbacks)
         {
            if (cb == callback)
               return;   // already in the list
         }
         FormPrepValues.callbacks.push(callback);
      },
      
      RemoveCallback: function(callback)
      {
         for (var i = 0; i < FormPrepValues.callbacks.length; i++)
         {
            if (FormPrepValues.callbacks[i] == callback)
            {
               FormPrepValues.callbacks.splice(i, 1);
               break;
            }
         }
      }
   };

FormSubmit =
   {
      callbacks: new Array(),
      
      Submitting: function(form)
      {
         for (let callback of FormSubmit.callbacks)
         {
            callback(form);
         }
      },
      
      AddCallback: function(callback)
      {
         for (let cb of FormSubmit.callbacks)
         {
            if (cb == callback)
               return;   // already in the list
         }
         FormSubmit.callbacks.push(callback);
      },
      
      RemoveCallback: function(callback)
      {
         for (var i = 0; i < FormSubmit.callbacks.length; i++)
         {
            if (FormSubmit.callbacks[i] == callback)
            {
               FormSubmit.callbacks.splice(i, 1);
               break;
            }
         }
      }
   };

Form =
   {
      beforeUnloadCallbacks: new Array(),
      formValidationCallbacks: new Array(),
      
      BeforeUnload: function()
      {
         for (let callback of Form.beforeUnloadCallbacks)
         {
            callback();
         }
      },
      
      ValidateForm: async function(form)
      {
         ClearMessage();            // hide any previous validation message
         
         Log_WriteInfo('ValidateForm: ' + _Form_DisableSubmitCount);
         if (_Form_DisableSubmitCount > 0)
         {
            DisplayValidationMessage(Str("There is an action pending, please wait."));
            Log_WriteErrorCallStack('Validation failed due to pending action');
            return false;
         }
         
         if (!FormPrepValues.Prepare())   // make sure all form values have been "set" in the input elements
            return false;
         
         if (!await ValidateForm(form))
            return false;
         
         for (let callback of Form.formValidationCallbacks)
         {
            if (!callback(form))
               return false;
         }
         
         return true;
      },
      
      AddBeforeUnloadCallback: function(callback)
      {
         for (let cb of Form.beforeUnloadCallbacks)
         {
            if (cb == callback)
               return;   // already in the list
         }
         Form.beforeUnloadCallbacks.push(callback);
      },
      
      AddFormValidationCallback: function(callback)
      {
         for (let cb of Form.formValidationCallbacks)
         {
            if (cb == callback)
               return;   // already in the list
         }
         Form.formValidationCallbacks.push(callback);
      }
   };

DocumentLoad.AddCallback(function(rootNodes)
{
   // initialize to hide content NOT associated with the selected tab, and note that I am NOT using the
   // passed "rootNodes" because we have to find the tab buttons wherever they appear because the usual
   // case is that they're loaded on the page and the tab contents are loaded as chunks
   for (let checkbox of Utilities_GetElementsByClass('tab_radio_button', 'INPUT'))
   {
      if (checkbox.checked)
         Utilities_FireEvent(checkbox, 'change');
   }
});

// used by FormPrepTabs() in PHP
function FormTab_onchange(name, classPrefix)
{
   Visibility_HideByClass(classPrefix + 'hide_on_change');
   let options = Utilities_GetElementsByName(name);
   for (let option of options)
   {
      if (option.checked)
      {
         let className = classPrefix + option.value;
         Visibility_ShowByClass(className);
         
         // we need to initialize all the newly visible items to make sure they actually should be visible
         let elems = document.querySelectorAll("." + className + ".onchange_init");
         for (let elem of elems)
         {
            Form_InitializeNode(elem);
         }
         
         // we need to load any delay-load DIVs
         let nodes = Utilities_GetElementsByClass('tab_delay_load', 'DIV');
         for (let div of nodes)
         {
            if (div.hasAttribute('delay_load_src') && !Class_HasByElement(div, 'tab_loading') &&
               (Class_HasByElement(div, className) || Utilities_HasClassAsParent(div, className)))
            {
               let url = div.getAttribute('delay_load_src');
               
               // prevent retrying to load while it's in process
               Class_AddByElement(div, 'tab_loading');
               
               // add a "Loading..." message
               let card = document.createElement('div');
               Class_AddByElement(card, 'card_content');
               Class_AddByElement(card, 'card_body');
               let msg = document.createElement('div');
               Class_AddByElement(msg, 'info_message');
               Class_AddByElement(msg, 'iframe_loading_message');
               msg.innerHTML = Str('Loading...');
               card.appendChild(msg);
               div.appendChild(card);
               
               ajax.get(url, {}, function(data, httpCode, headers)
               {
                  // remove the "Loading..." message
                  if (div.contains(card))
                     div.removeChild(card);
                  else
                     Log_WriteError('"Loading" message element not found!');  // DRL FIXIT? This happens sometimes.
                  
                  Class_RemoveByElement(div, 'tab_loading');
                  
                  if (httpCode != 200)
                  {
                     // server unavailable, network error, etc.
                     Log_WriteError('Server is not available to get chunk "' + url + '": ' + httpCode);
                     DisplayMessage(Str('There was a problem contacting the server.'), 'error');
                     return;
                  }
                  
                  // don't load it a second time
                  div.removeAttribute('delay_load_src');
                  
                  let chunkHandler = div.getAttribute('chunk_handler');
                  let loadedChunks = Utilities_GetElementByName("LoadedChunks");
                  if (loadedChunks == null)
                  {
                     Log_WriteWarning('While trying to load chunk ' + chunkHandler + ' did not find LoadedChunks element, perhaps form was closed by user before loading completed?');
                     return;
                  }
                  
                  if (loadedChunks.value.length > 0)
                     loadedChunks.value = loadedChunks.value + ",";
                  loadedChunks.value = loadedChunks.value + chunkHandler;
                  
                  let elem = Utilities_CreateHtmlNode(data);
                  while (elem.hasChildNodes())
                  {
                     div.appendChild(elem.childNodes[0]);
                  }
                  
                  // run any scripts that were provided
                  let scripts = Utilities_GetElementsByTag('SCRIPT', div);
                  for (let script of scripts)
                  {
                     safeExec(script.innerText);
                  }
                  
                  DocumentLoad.InitChunk(div.children);
               }, true, 30 * 1000);
            }
         }
      }
   }
}

// used by FormPrepTabs() in PHP
function FormTab_onremove(name, id, classPrefix, availableOptions)
{
   let visibleOptions = Utilities_GetElementsByName(name + '_Visible')[0];
   let visibleValues = visibleOptions.value.split(",");
   
   let option = Utilities_GetElementById(id);
   let label = Utilities_GetElementById(id + '_Label');
   let value = option.value;
   
   // if current tab is active, then we deactive it and then select the first one.
   if (option.checked == true)
   {
      option.checked = false;
      let siblingOptions = Utilities_GetElementsByName(option.name);
      for (let siblingOption of siblingOptions)
      {
         if (siblingOption != option)
         {
            siblingOption.checked = true;
            break;
         }
      }
      FormTab_onchange(name + '_Selected', classPrefix);
   }
   
   // update hidden visible options
   let index = visibleValues.indexOf(value);
   Utilities_RemoveFromArray(visibleValues, value);
   visibleOptions.value = visibleValues.join(',');
   
   // add removed lanuages to dropdown menu
   let plusSelect = Utilities_GetElementById(name + '_AddTabSelect');
   let plusButton = Utilities_GetElementById(name + '_AddTabButton');
   if (Visibility_IsShownByElement(plusSelect) || Visibility_IsShownByElement(plusButton))
   {
      if (Visibility_IsShownByElement(plusButton))
      {
         Visibility_ShowByElement(plusSelect);
         Visibility_HideByElement(plusButton);
      }
   }
   else
   {
      Visibility_ShowByElement(plusButton);
      plusButton.innerHTML = "<A class='tab_radio_label tab_add_button' onclick='FormTab_onadd(event, \"" + name + "\",\"" + value + "\");'>";
   }
   let tabsSelect = Utilities_GetElementById(name + '_AdditionalTabs');
   tabsSelect.options[tabsSelect.options.length] = new Option(label.innerText, value);
   tabsSelect.size = tabsSelect.options.length;
   
   // remove tab(input radio button and label)
   option.parentNode.removeChild(label);
   option.parentNode.removeChild(option);
}

function FormTab_onadd(event, name, value)
{
   let visibleOptions = Utilities_GetElementsByName(name + '_Visible')[0];
   let visibleValues = visibleOptions.value.split(",");
   visibleValues.push(value);
   visibleOptions.value = visibleValues.join(',');
   
   let options = Utilities_GetElementsByName(name + '_Selected');
   for (let option of options)
   {
      option.checked = false;
      option.removeAttribute('checked');
   }
   
   let dummyInput = document.createElement('input');
   dummyInput.type = 'radio';
   dummyInput.name = name + '_Selected';
   dummyInput.style.display = 'none';
   dummyInput.value = value;
   dummyInput.checked = true;
   
   let plusSelect = Utilities_GetElementById(name + '_AddTabSelect');
   Utilities_InsertBeforeNode(plusSelect.parentNode, dummyInput, plusSelect);
   
   RefreshForm();
}

function FormCustom_onchange(event)
{
   let name = event.target.name;
   let value = event.target.tagName == 'INPUT'
      ? event.target.value
      : Utilities_GetElementByName(name).value; // DRL FIXIT? Why get it by name if we have the target already?
   name = Utilities_StripBracketsFromElementName(name) + '_Custom';
   
   // for radio buttons and checkboxes the handling of the custom item depends on the select/unselect action and not just the value
   if (event.target.tagName == 'INPUT' && (value != '_CUSTOM_' || !event.target.checked))
      value = ''; // hide the custom input control
   
   // make the "custom" edit box visible only when the drop down list has the custom option selected
   Visibility_SetByElement(Utilities_GetElementByName(name), value == '_CUSTOM_');
}

// takes a URL and converts it to a form that can be submit, getting around the URL length limitation
// NOTE: some websites (like Google.ca)  don't like the "POST" so we only use it for long URLs
function CreateFormFromUrl(url, target)
{
   let tempForm = document.createElement('form');
   tempForm.target = target ? target : '';
   tempForm.style.display = 'none';
   tempForm.method = url.length >= 2000 ? 'POST' : 'GET';   // 200 seems to be the accepted max for browsers
   tempForm.action = url.split('?')[0];
   tempForm.setAttribute('accept-charset', 'utf-8');
   
   let urlParams = new URLSearchParams(url.split('?')[1]);
   
   for (const key of urlParams.keys())
   {
      let tempInput = document.createElement('input');
      tempInput.type = 'hidden';
      tempInput.name = key;
      tempInput.value = urlParams.get(key);
      tempForm.appendChild(tempInput);
   }
   
   return tempForm;
}

var _BackgroundExecutionQueue = [];

// wrapper for FormValuesUpdated. Should be called if the form was submitted via FormAction=SubmitBackground
function _BackgroundExecutionCallback(values)
{
   // this function should be called at the parent window because the queue is there, in fact
   // we just always go up the stack looking for the highest adjacent queue to use to avoid issues
   if (window.parent != window && window.parent._BackgroundExecutionCallback)
   {
      window.parent._BackgroundExecutionCallback(values);
      return;
   }
   
   // dequeue the task that just finished
   let task = _BackgroundExecutionQueue.shift();
   if (!task)
   {
      assert(0);
      return;
   }
   
   // send details back to the form
   task.window.FormValuesUpdated(Json_FromString(values), task.callbackItem);
   
   // process the next item in the queue
   if (_BackgroundExecutionQueue.length > 0)
   {
      setTimeout(function()
      {
         try
         {
            let task = _BackgroundExecutionQueue[0];
            task.window._DisplayItemForm(task.form, task.formAction, task.itemName1, task.itemValue1, task.itemName2, task.itemValue2,
               task.itemName3, task.itemValue3, task.itemName4, task.itemValue4, task.itemName5, task.itemValue5,
               task.itemName6, task.itemValue6, task.itemName7, task.itemValue7, task.itemName8, task.itemValue8,
               task.itemName9, task.itemValue9, task.itemName10, task.itemValue10, 'background');
         }
         catch (e)
         {
            Log_WriteException(e, 'Error via _BackgroundExecutionCallback()');
         }
      }, 500);
   }
   else
   {
      if (typeof task.window.BusyIndicatorStart === "function")
         task.window.BusyIndicatorStop();
   }
}

function _ExecuteBackgroundForm(_window, form, formAction, callbackItem, itemName1, itemValue1, itemName2, itemValue2,
   itemName3, itemValue3, itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7,
   itemName8, itemValue8, itemName9, itemValue9, itemName10, itemValue10)
{
   // we just always go up the stack looking for the highest adjacent queue to use to avoid issues
   if (window.parent != window && window.parent._BackgroundExecutionCallback)
   {
      window.parent._ExecuteBackgroundForm(_window, form, formAction, callbackItem, itemName1, itemValue1, itemName2, itemValue2,
         itemName3, itemValue3, itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7,
         itemName8, itemValue8, itemName9, itemValue9, itemName10, itemValue10);
      return;
   }
   
   let taskDetails =
      {
         window: _window,
         form: form,
         formAction: formAction,
         callbackItem: callbackItem,
         itemName1: itemName1,
         itemValue1: itemValue1,
         itemName2: itemName2,
         itemValue2: itemValue2,
         itemName3: itemName3,
         itemValue3: itemValue3,
         itemName4: itemName4,
         itemValue4: itemValue4,
         itemName5: itemName5,
         itemValue5: itemValue5,
         itemName6: itemName6,
         itemValue6: itemValue6,
         itemName7: itemName7,
         itemValue7: itemValue7,
         itemName8: itemName8,
         itemValue8: itemValue8,
         itemName9: itemName9,
         itemValue9: itemValue9,
         itemName10: itemName10,
         itemValue10: itemValue10
      };
   _BackgroundExecutionQueue.push(taskDetails);
   if (_BackgroundExecutionQueue.length > 1)
      return;  // execute it when we're done with the current item
   
   setTimeout(function()
   {
      try
      {
         let task = _BackgroundExecutionQueue[0];
         
         if (typeof task.window.BusyIndicatorStart === "function")
            task.window.BusyIndicatorStart(Str('Updating...'));
         
         task.window._DisplayItemForm(task.form, task.formAction, task.itemName1, task.itemValue1, task.itemName2, task.itemValue2,
            task.itemName3, task.itemValue3, task.itemName4, task.itemValue4, task.itemName5, task.itemValue5,
            task.itemName6, task.itemValue6, task.itemName7, task.itemValue7, task.itemName8, task.itemValue8,
            task.itemName9, task.itemValue9, task.itemName10, task.itemValue10, 'background');
      }
      catch (e)
      {
         Log_WriteException(e, 'Error via _ExecuteBackgroundForm()');
      }
   }, 500);
}

// we support only 7 item-value pairs here because we reserve the last one for FormAction
// callbackItem - an object that the callback will pass back to FormValuesUpdated as the secondparam
function ExecuteBackgroundForm(form, formAction, callbackItem, itemName1, itemValue1, itemName2, itemValue2,
   itemName3, itemValue3, itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7,
   itemName8, itemValue8, itemName9, itemValue9, itemName10, itemValue10)
{
   _ExecuteBackgroundForm(window, form, formAction, callbackItem, itemName1, itemValue1, itemName2, itemValue2,
      itemName3, itemValue3, itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7,
      itemName8, itemValue8, itemName9, itemValue9, itemName10, itemValue10);
}

// target can be 'this', 'iframe', 'embedded', 'background'
function _DisplayItemForm(form, formAction, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3,
   itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8,
   itemName9, itemValue9, itemName10, itemValue10, target)
{
   if (Form_MainUri == null)
   {
      assert(0);
      DisplayErrorMessage("Your page failed to initialize Form_MainUri.");
   }
   if (Form_ThisUri == null)
   {
      assert(0);
      DisplayErrorMessage("Your page failed to initialize Form_ThisUri.");
   }
   
   // special null handling
   if (itemValue1 == null) itemValue1 = "";
   if (itemValue2 == null) itemValue2 = "";
   if (itemValue3 == null) itemValue3 = "";
   if (itemValue4 == null) itemValue4 = "";
   if (itemValue5 == null) itemValue5 = "";
   if (itemValue6 == null) itemValue6 = "";
   if (itemValue7 == null) itemValue7 = "";
   if (itemValue8 == null) itemValue8 = "";
   if (itemValue9 == null) itemValue9 = "";
   if (itemValue10 == null) itemValue10 = "";
   
   let url = Form_MainUri + "?FormProcessor=" + form;
   let params = {'FormProcessor': form};
   if (formAction != null)
   {
      url += '&FormAction=' + formAction;
      params['FormAction'] = formAction;
   }
   if (itemName1 != null)
   {
      url += "&" + itemName1 + "=" + encodeURIComponent(itemValue1);
      params[itemName1] = itemValue1;
   }
   if (itemName2 != null)
   {
      url += "&" + itemName2 + "=" + encodeURIComponent(itemValue2);
      params[itemName2] = itemValue2;
   }
   if (itemName3 != null)
   {
      url += "&" + itemName3 + "=" + encodeURIComponent(itemValue3);
      params[itemName3] = itemValue3;
   }
   if (itemName4 != null)
   {
      url += "&" + itemName4 + "=" + encodeURIComponent(itemValue4);
      params[itemName4] = itemValue4;
   }
   if (itemName5 != null)
   {
      url += "&" + itemName5 + "=" + encodeURIComponent(itemValue5);
      params[itemName5] = itemValue5;
   }
   if (itemName6 != null)
   {
      url += "&" + itemName6 + "=" + encodeURIComponent(itemValue6);
      params[itemName6] = itemValue6;
   }
   if (itemName7 != null)
   {
      url += "&" + itemName7 + "=" + encodeURIComponent(itemValue7);
      params[itemName7] = itemValue7;
   }
   if (itemName8 != null)
   {
      url += "&" + itemName8 + "=" + encodeURIComponent(itemValue8);
      params[itemName8] = itemValue8;
   }
   if (itemName9 != null)
   {
      url += "&" + itemName9 + "=" + encodeURIComponent(itemValue9);
      params[itemName9] = itemValue9;
   }
   if (itemName10 != null)
   {
      url += "&" + itemName10 + "=" + encodeURIComponent(itemValue10);
      params[itemName10] = itemValue10;
   }
   if (target == 'background')
   {
      url += "&FormSilent=1";
   }
   if (target == 'embedded')
   {
      url += "&IsEmbeddedForm=1";
   }
   
   if (target == 'iframe' || target == 'background')
   {
      if (target == 'iframe' && Browser.IsExtensionContent())
      {
         if (!params.hasOwnProperty('ReferralUrl'))
            params['ReferralUrl'] = Form_MainUri;
         
         // this is the Chrome extension case, we show the form in a tab
         reqCreateTab('SAMainPage', 'GET', Form_MainUri, params);
      }
      else
         DisplayWebPage(url, 'full', target == 'background');
   }
   else if (target == 'embedded')
   {
      let size = Browser.IsExtensionContent() ? 'large' : 'full';
      FormInitiateEmbedded(url, size);
   }
   else
   {
      if (itemName1 != 'ReferralUrl' && itemName2 != 'ReferralUrl' && itemName3 != 'ReferralUrl' &&
         itemName4 != 'ReferralUrl' && itemName5 != 'ReferralUrl' && itemName6 != 'ReferralUrl' &&
         itemName7 != 'ReferralUrl' && itemName8 != 'ReferralUrl' && itemName9 != 'ReferralUrl' &&
         itemName10 != 'ReferralUrl')
         url += "&ReferralUrl=" + encodeURIComponent(Form_ThisUri);
      GoToUrl(url);
   }
}

function DisplayItemForm(form, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3, itemName4, itemValue4,
   itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8, itemName9, itemValue9,
   itemName10, itemValue10)
{
   _DisplayItemForm(form, null, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3,
      itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8,
      itemName9, itemValue9, itemName10, itemValue10, 'this');
}

function DisplayInlineItemForm(form, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3,
   itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8,
   itemName9, itemValue9, itemName10, itemValue10)
{
   _DisplayItemForm(form, null, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3,
      itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8,
      itemName9, itemValue9, itemName10, itemValue10, 'iframe');
}

function DisplayEmbeddedItemForm(form, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3,
   itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8,
   itemName9, itemValue9, itemName10, itemValue10)
{
   _DisplayItemForm(form, null, itemName1, itemValue1, itemName2, itemValue2, itemName3, itemValue3,
      itemName4, itemValue4, itemName5, itemValue5, itemName6, itemValue6, itemName7, itemValue7, itemName8, itemValue8,
      itemName9, itemValue9, itemName10, itemValue10, 'embedded');
}

function FormInitiateEmbedded(url, size)
{
   if (typeof BusyIndicatorStart === "function")
      BusyIndicatorStart(Str('Loading...'));
   ajax.get(url, {}, function(data, httpCode, headers)
   {
      if (httpCode != 200)
      {
         // server unavailable, network error, etc.
         Log_WriteError('Server is not available to get form "' + url + '": ' + httpCode);
         if (typeof BusyIndicatorStop === "function")
            BusyIndicatorStop(); // must be done before DisplayMessage()
         DisplayMessage(Str('There was a problem contacting the server.'), 'error');
         
         return;
      }
      
      try
      {
         DisplayPopUpContent(data, size, null);
      }
      catch (e)
      {
         Log_WriteException(e, 'Error via FormInitiateEmbedded()');
      }
      
      if (typeof BusyIndicatorStop === "function")
         BusyIndicatorStop();
   }, true, 30 * 1000);
}

// used via Form.php
function StrPredefined_onchange(name)
{
   let elems = Utilities_GetElementsByName(name + '_selector');
   if (elems.length == 0) alert('Form input element ' + name + '_selector not found!');
   if (elems.length > 1) alert('Form input element ' + name + '_selector not found multiple times!');
   let list = elems[0];
   
   elems = Utilities_GetElementsByName(name);
   if (elems.length == 0) alert('Form input element ' + name + ' not found!');
   if (elems.length > 1) alert('Form input element ' + name + ' not found multiple times!');
   let input = elems[0];
   
   let value = list.selectedIndex >= 0 ? list.value : 0;
   Visibility_SetByElement(input, value == 0);
   if (value == '_NULL_')
   {
      input.value = '';
   }
   else if (value == 0)
   {
      // if the user chooses "Custom" we have to make sure that the old value is not one of the predefined
      // ones otherwise the dropdown will just be reset to "Custom" again
      for (let option of list.options)
      {
         if (option.value == input.value)
            input.value = '?';   // can't be empty otherwise the element will get removed
      }
   }
   else
      input.value = value;
}

function Form_GetValues(elForm)
{
   if (!elForm instanceof Element) return;
   let fields = elForm.querySelectorAll('input, select, textarea');
   let o = {};
   for (let field of fields)
   {
      let sKey = field.name || field.id;
      if (field.type === 'button' || field.type === 'image' || field.type === 'submit' || !sKey)
         continue;
      
      switch (field.type)
      {
         case 'checkbox':
            if (field.checked)
            {
               if (sKey.indexOf('[]') == -1)
                  o[sKey] = field.value;
               else
               {
                  if (o[sKey] === undefined) o[sKey] = [];
                  o[sKey].push(field.value);
               }
            }
            break;
         case 'radio':
            if (o[sKey] === undefined) o[sKey] = '';
            if (field.checked) o[sKey] = field.value;
            break;
         case 'select-multiple':
            let a = [];
            for (let option of field.options)
            {
               if (option.selected)
                  a.push(option.value);
            }
            // This is here to mimick what a browser will do: it won't send the multi select if it
            // has no selected items. This is necessary for Html::SelectOptions() handling.
            if (a.length > 0)
               o[sKey] = a;
            break;
         default:
            o[sKey] = field.value;
            break;
      }
   }
   return o;
}

function Form_SetValues(elForm, o)
{
   if (!Utilities_IsObject(o)) return;
   for (let i in o)
   {
      let el = elForm.querySelector('[name=' + i + ']');
      if (el == null)
      {
         assert(0);
         continue;
      }
      if (el.type === 'radio')
         el = elForm.querySelectorAll('[name=' + i + ']');
      switch (typeof o[i])
      {
         case 'number':
            el.checked = o[i];
            break;
         case 'object':
            if (el.options && o[i] instanceof Array)
            {
               for (let option of el.options)
               {
                  if (o[i].indexOf(option.value) > -1)
                     option.selected = true;
               }
            }
            break;
         default:
            if (el instanceof NodeList)
            {
               for (let elem of el)
               {
                  if (elem.value === o[i])
                     elem.checked = true;
               }
            }
            else
            {
               el.value = o[i];
            }
            break;
      }
   }
}

// this sends some values to the parent windows FormValuesUpdated() function if there is one
function ParentWindowFormValuesUpdated(values, callbackItem)
{
   if (Browser.CanAccessParent())
   {
      if (window.parent != window && window.parent.FormValuesUpdated)
         window.parent.FormValuesUpdated(Json_FromString(values), callbackItem);
   }
   else
      window.parent.postMessage({action: 'FormValuesUpdated', params: values}, "*");
}
/* do we need this to handle the above posted message??
window.addEventListener('message', function(event)
{
   if (event.data.hasOwnProperty('Action') && event.data.Action == 'FormValuesUpdated')
   {
      console.log('Form.js got message:', event.data);
      FormValuesUpdated(Json_FromString(event.data.params));
   }
});
*/

function ConfirmActionUrl(message, url)
{
   if (confirm(message))
   {
      SubmitForm(url);
   }
}

function FireElemChanged(elem)
{
   let e = new Object();
   e.target = elem;
   OnElemChanged(e);
}

function OnElemChanged(e)
{
   let form = Utilities_GetElementById("main_form");
   if (!form)
   {
      form = Utilities_GetEventTarget(e);
      while (form.parentNode != null && form.tagName != "FORM")
         form = form.parentNode;
   }
   let changed = Utilities_GetElementByName("FormHasChanged", form);
   if (changed != null && changed.value == "0") changed.value = "1";   // do not change a value of "2"
   
   return false;
}

function HasFormChanged(formId)
{
   if (formId == null) formId = "main_form";
   let form = Utilities_GetElementById(formId);
   let changed = Utilities_GetElementByName("FormHasChanged", form);
   return changed != null && changed.value != "0";
}

function FormPromptAsNeeded(prompt)
{
   return !HasFormChanged() || confirm(prompt);
}

function RefreshForm(formId, action)
{
   if (_Form_IsProcessingInit)   // ignore this call when we are refreshing the form as it leads to endless loop
      return;
   
   if (action == null) action = "Refresh";
   
   if (formId == null) formId = "main_form";
   let form = Utilities_GetElementById(formId);
   
   let formAction = Utilities_GetElementByName("FormAction", form);
   if (formAction != null)
      formAction.value = action;
   
   SubmitForm();
}

function IsFormSubmitDisabled()
{
   return _Form_DisableSubmitCount > 0;
}

function FormDisableSubmit(formId)
{
   _Form_DisableSubmitCount++;
   Log_WriteInfo('FormDisableSubmit: ' + _Form_DisableSubmitCount);
   
   if (_Form_DisableSubmitCount == 1)
   {
      let form = formId ? Utilities_GetElementById(formId) : null
      
      let elems = Utilities_GetElementsByTag("button", form);
      for (let elem of elems)
      {
         if (!Class_HasByElement(elem, 'form_cancel') && EnableDisable_IsEnabledByElement(elem))
         {
            // DRL FIXIT! We should be doing this via CSS class styling so we don't inadvertently
            // enable a button that was disabled for some other reason. We already prevent form
            // submission when the count>0 so disabling buttons isn't needed.
            EnableDisable_DisableByElement(elem);
            Class_AddByElement(elem, 'DISABLED_FOR_FORM_SUBMIT')
         }
      }
   }
}

function FormEnableSubmit(formId)
{
   _Form_DisableSubmitCount--;
   Log_WriteInfo('FormEnableSubmit: ' + _Form_DisableSubmitCount);
   
   if (_Form_DisableSubmitCount == 0)
   {
// DRL Removed this because it hides messages shown by the form being loaded in the Chrome extension.
// If we need this then maybe we can work around it by putting the DisplayMessage() in a timer inside FormMessage()?
//      ClearMessage();            // hide any message shown while uploading
      
      let form = formId ? Utilities_GetElementById(formId) : null;
      
      let elems = Utilities_GetElementsByClass('DISABLED_FOR_FORM_SUBMIT', 'button', form);
      for (let elem of elems)
      {
         EnableDisable_EnableByElement(elem);
      }
   }
}

/*
function getUrlVars(url)
{
   let vars = {};
   let parts = url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
   });
   return vars;
}

function getUrlParam(url, parameter, defaultvalue)
{
   let urlparameter = defaultvalue;
   if (url.indexOf(parameter) > -1)
      urlparameter = getUrlVars(url)[parameter];
   return urlparameter;
}
*/
async function AsyncSubmitForm(nextUrl, formId, formAction, waitingMessage)
{
   let forms = Utilities_GetElementsByTag("form");
   
   if (formId == null) formId = "main_form";
   let form = Utilities_GetElementById(formId);
   
   if (forms.length > 0 && form == null)
   {
      DisplayErrorMessage(Str("Your page is missing a form with ID <0>! This is required for form processing.", formId));
      return false;
   }
   
   let submitAction = Utilities_GetElementByName("FormAction", form);
   if (formAction != null)
   {
      if (submitAction != null)
         submitAction.value = formAction;
      else
         alert("Missing FormAction form element!");
   }
   
   if (submitAction != null &&
      // DRL FIXIT! I think we need a better workaround for these cases!
      (submitAction.value == 'Refresh' || submitAction.value == 'Cancel' ||
         // DRL FIXIT? This is a bit of a hack for the template translation feature.
         submitAction.value == 'Translate' ||
         // DRL FIXIT? This is a bit of a hack for the template AI splits feature.
         submitAction.value == 'PopulateSplits' ||
         // DRL FIXIT? This is a bit of a hack for the Pop/Smtp LoginPage.php.
         submitAction.value == 'Back' ||
         // DRL FIXIT? This is a bit of a hack for the SearchFiltersEditForm.php.
         submitAction.value == 'Duplicate' ||
         // DRL FIXIT? This is a bit of a hack for the ResourceFoldersControls.php.
         submitAction.value == 'CreateFolder'))
   {
      submitAction = false;
   }
   else
      submitAction = true;
   
   let changed = null;
   let referralUrl = null;
   if (form != null && submitAction == true)
   {
      if (!await Form.ValidateForm(form))
         return false;
      
      changed = Utilities_GetElementByName("FormHasChanged", form);
      if (changed != null)
      {
         if (changed.value == "0")
            changed = null;
         else
            changed = changed.value;
      }
      referralUrl = Utilities_GetElementByName("ReferralUrl", form);
      if (referralUrl != null) referralUrl = referralUrl.value;
   }
   else
   {
      // we need to do this even if we're just refreshing, so that the form values are ready
      
      if (!FormPrepValues.Prepare())   // make sure all form values have been "set" in the input elements
      {
         return false;
      }
   }
   
   // make sure that the form can be submit even though some fields aren't provided (if they are hidden)
   if (form != null)
   {
      for (let elem of form.elements)
      {
         elem.removeAttribute("required");
      }
   }
   
   // we also change any email and url input fields to text so those don't trigger an error (if they are hidden)
   for (let elem of document.getElementsByTagName('INPUT'))
   {
      if (elem.type == 'email' || elem.type == 'url')
         elem.type = 'text';
   }
   
   // prevent onbeforeunload from showing message
   _Form_CheckToSave = false;
   
   // store the waiting message so we can use it on page unload
   _Form_WaitingMessage = waitingMessage;

//   if (nextUrl != null && getUrlParam(nextUrl, 'InFrame') == null &&
//      getUrlParam(window.location.href, 'InFrame') == 'true')
//      nextUrl += '&InFrame=true';
   
   // NOTE: This code is copied in CancelForm()!
   let oldView = FormGetView();
   let newView = FormGetView(nextUrl);
   _Form_IsLeaving = submitAction &&
      (nextUrl == null || nextUrl.indexOf('FormProcessor') == -1) && // a form returns to the referralUrl (this page)
      (newView == null || newView.indexOf(oldView) != 0);            // we are going to a "deeper/lower" view in the heirarchy
   
   if (form != null && changed != null)   // changed could be "1" or "2"
   {
      if (submitAction && nextUrl != null)
      {
         let input = document.createElement("INPUT");
         input.type = "hidden";
         input.name = "NextUrl";
         input.value = nextUrl;
         form.appendChild(input);
      }
      
      return _SubmitForm(form);
   }
   else if (nextUrl != null)
   {
      return CancelForm(nextUrl, formId);
   }
   else if (referralUrl != null)
   {
      // handle same as cancel button in a form
      return CancelForm(referralUrl, formId);
   }
   else if (form != null)
   {
      return _SubmitForm(form);
   }
   else if (FormGetUrl())
   {
      // refresh the form
      return CancelForm(FormGetUrl());
   }
   else
   {
      Log_Die("No URL to go to!");
   }
   
   return true;
}

function SubmitForm(nextUrl, formId, formAction, waitingMessage)
{
   setTimeout(async function()
   {
      await AsyncSubmitForm(nextUrl, formId, formAction, waitingMessage);
   }, 1);
   return true;   // DRL FIXIT? I think this method shouldn't return anything.
}

// DRL FIXIT? Not sure when this method should return true/false?
function _SubmitForm(form)
{
   if (_BackgroundExecutionQueue.length > 0)
   {
      alert(Str("Please wait while your changes are being saved, then try again."));
      return false;
   }
   
   FormSubmit.Submitting(form);
   
   let isEmbeddedForm = Class_HasByElement(form, 'EmbeddedForm');
   if (isEmbeddedForm)
   {
      let params = Form_GetValues(form);
      params['IsEmbeddedForm'] = 1;
      let url = Form_RootUri + '/Main.php';
      
      if (typeof BusyIndicatorStart === "function")
         BusyIndicatorStart(Str('Loading...'));
      ajax.request(form.method, url, params, function(data, httpCode, headers)
      {
         if (httpCode != 200)
         {
            // server unavailable, network error, etc.
            Log_WriteError('Server is not available to get form "' + url + '": ' + httpCode);
            if (typeof BusyIndicatorStop === "function")
               BusyIndicatorStop(); // must be done before DisplayMessage()
            DisplayMessage(Str('There was a problem contacting the server.'), 'error');
            return;
         }
         
         if (data == null || data == '')
         {
            // when the form handler returns null it means the form is finished
            ClosePopUp(true);
            if (typeof BusyIndicatorStop === "function")
               BusyIndicatorStop();
            return;
         }
         
         // replace the pop up content with the new form data
         let elem = GetPopUpContent();
         
         // the new nodes may come in with the same IDs so it's important to uninitialize the old ones (especially for CKEditor)
         Form_UninitializeNode(elem);
         elem.innerHTML = '';
         
         data = Utilities_CreateHtmlNode(data);
         let children = [...data.children];  // make a copy otherwise we'll end up with an empty array below
         elem.appendChild(data);
         
         // the elements created above need to be initialized
         DocumentLoad.InitChunk(children);
         
         if (typeof BusyIndicatorStop === "function")
            BusyIndicatorStop();
         
         // execute any scripts injected above (this is used to display error messages for embedded forms)
         // DRL FIXIT! We do this after BusyIndicatorStop() as that method would clear the message (it shouldn't).
         let scripts = Utilities_GetElementsByTag('script', elem);
         for (let script of scripts)
         {
            safeExec(script.innerText);
         }
         
         // when the form handler returns no form element it means the form is finished
         if (Utilities_GetElementsByTag('form', elem).length == 0)
            setTimeout(ClosePopUp, 500);  // allow any scripts above to complete before we remove them
      }, true, 60 * 1000);
      
      return false;
   }
   
   HandleUnload(null);                    // notify this window that the form is unloading
   if (true)
   {
      // This code also seems to fix a problem with HtmlTextArea in text mode not properly sending strings like
      // "I used &nbsp; as <code> in my test." as-is to the server (using Chrome).
      // Firefox would not always submit the form using "form.submit()" so I action a submit button instead.
      let elems = Utilities_GetElementsByTag("input", form);
      let button = null;
      for (let elem of elems)
      {
         if (elem.getAttribute("type") == "submit")
         {
            button = elem;
            break;
         }
      }
      if (button == null)
      {
         button = document.createElement('input');
         button.type = "submit";
         button.name = "Temp";
         button.value = "Temp";
         button.style.display = "none";
         form.appendChild(button);
      }
      button.click();
   }
   else
   {
      if (form.onsubmit && !form.onsubmit())
      {
         // I think this would happen on client validation failure?
         return false;
      }
      form.submit();
   }
   
   return false;
}

function CancelForm(url, formId, formAction)
{
   let forms = Utilities_GetElementsByTag("form");
   
   if (formId == null) formId = "main_form";
   let form = Utilities_GetElementById(formId);
   
   if (forms.length > 0 && form == null)
   {
      DisplayErrorMessage(Str("Your page is missing a form with ID <0>! This is required for form processing.", formId));
      return false;
   }
   
   // prevent onbeforeunload from showing message
   _Form_CheckToSave = false;
   
   // NOTE: This code is copied in SubmitForm()!
   let oldView = FormGetView();
   let newView = FormGetView(url);
   _Form_IsLeaving =
      (url == null || url.indexOf('FormProcessor') == -1) &&   // a form returns to the referralUrl (this page)
      (newView == null || newView.indexOf(oldView) != 0);      // we are going to a "deeper/lower" view in the heirarchy
   
   if (url != null && url.length > 0)
   {
      GoToUrl(url);
   }
   else if (formAction != null)
   {
      let action = Utilities_GetElementByName("FormAction", form);
      if (action != null)
         action.value = formAction;
      
      // make sure that the form can be submit even though some fields aren't provided
      for (let elem of form.elements)
      {
         elem.removeAttribute("required");
      }
      
      return _SubmitForm(form);
   }
   else if (Class_HasByElement(form, 'EmbeddedForm'))
   {
      ClosePopUp(true); // this is an embedded form, simply close it
   }
   else
   {
      ParentWindowFormValuesUpdated(null, null); // notify parent window that the form was cancelled
      
      HandleUnload(null);                    // notify this window that the form is unloading since
                                             // the normal events won't fire because we are in an iFrame
      CloseParentWebWindow();
   }
   
   return false;
}

function GoToUrl(url)
{
   if (!SaveChangedForms(url))
   {
      HandleUnload(null);                    // notify this window that the form is unloading since
                                             // the normal events won't fire on iOS (all mobile?)
      
      if (typeof BusyIndicatorStart === "function")
         BusyIndicatorStart(_Form_WaitingMessage);
      
      // DRL FIXIT? I had to delay page load on iOS in order for the busy indicator to show!
      setTimeout(function()
      {
         try
         {
            let tempForm = CreateFormFromUrl(url);
            document.body.appendChild(tempForm);
            tempForm.submit();
            document.body.removeChild(tempForm);
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      }, 1);
   }
}

function InitializeForm(rootNodes)
{
   let isExtension = Browser.IsExtensionContent();
   
   if (isExtension)
   {
      for (let root of rootNodes)
      {
         // wrap events because they can't run "inline" in the content scripts
         
         let elems = root.querySelectorAll('[onchange],[onclick]');
         for (let elem of elems)
         {
            Form_InitializeNodeEvents(elem);
         }
      }
   }
   
   // hook up the form controls to set a flag when they are changed...
   for (let root of rootNodes)
   {
      let forms = Utilities_GetElementsByTag('form', root);
      for (let form of forms)
      {
         for (let elem of form.elements)
         {
            if (!('name' in elem) || elem.name != 'FormHasChanged')
               Utilities_AddEvent(elem, 'change', OnElemChanged);
         }
      }
   }
   
   // prevents the form refreshing as a result of items that call RefreshForm() on change
   _Form_IsProcessingInit++;
   
   // initialize the enable/disabled state of the form controls...
   for (let root of rootNodes)
   {
      for (let elem of Utilities_GetElementsByClass('onchange_init', null, root))
      {
         // don't initialize items in a template, they'll be initialized when copied
         if (Utilities_GetParentByClass(elem, 'MultiItemTemplate') == null)
            Utilities_FireEvent(elem, 'change');
      }
   }
   
   _Form_IsProcessingInit--;
}

// these nodes are usually initialized by the JavaScript classes that are listed (i.e. FilterSelect)
// but in some cases they aren't (maybe they're hidden, or in a hidden template) and need to be
// initialized later (when they are shown, or the template is copied for use) and that's where this
// method comes in
function Form_InitializeNode(node)
{
   // don't initialize items in a template, they'll be initialized when copied
   if (Utilities_GetParentByClass(node, 'MultiItemTemplate') != null)
      return;
   
   if (Class_HasByElement(node, 'FilterSelect'))
      FilterSelect.MakeFilterSelect(node);
   else if (Class_HasByElement(node, 'MultiSelect'))
      MultiSelect.MakeMultiSelect(node);
   else if (Class_HasByElement(node, 'MultiItem'))
      MultiItem.MakeMultiItem(node);
   else if (Class_HasByElement(node, 'FileUpload'))
      FileUpload.MakeFileUpload(node);
   else if (Class_HasByElement(node, 'datechooser') || Class_HasByElement(node, 'timechooser'))
      DateAndTimeChooser.MakeDateAndTimeChooser(node);
   else if (Class_HasByElement(node, 'RecurrenceEditor'))
      RecurrenceEditor.MakeRecurrenceEditor(node);
   else if (HtmlTextArea.IsHtmlTextArea(node))
      HtmlTextArea.MakeHtmlTextArea(node);
   else
   {
      if (node.tagName != 'SELECT') // for efficiency skip child OPTION elements
      {
         // NOTE: it's important not to check children of HtmlTextArea as the node is moved into a child
         let children = Array.from(node.children); // make a copy because new items could be added below during init
         for (let childNode of children)
         {
            Form_InitializeNode(childNode);
         }
      }
   }
   
   Form_InitializeNodeEvents(node);
   
   if (Class_HasByElement(node, 'onchange_init'))
   {
      // prevents the form refreshing as a result of items that call RefreshForm() on change
      _Form_IsProcessingInit++;
      
      Utilities_FireEvent(node, 'change');
      
      _Form_IsProcessingInit--;
   }
}

function Form_UninitializeNode(node)
{
   // don't uninitialize items in a template, they aren't initialized
   if (Utilities_GetParentByClass(node, 'MultiItemTemplate') != null)
      return;

//   if (Class_HasByElement(node, 'FilterSelect'))
//      FilterSelect.MakeFilterSelect(node);
//   else if (Class_HasByElement(node, 'MultiSelect'))
//      MultiSelect.MakeMultiSelect(node);
//   else if (Class_HasByElement(node, 'MultiItem'))
//      MultiItem.MakeMultiItem(node);
//   else if (Class_HasByElement(node, 'FileUpload'))
//      FileUpload.MakeFileUpload(node);
//   else if (Class_HasByElement(node, 'datechooser') || Class_HasByElement(node, 'timechooser'))
//      DateAndTimeChooser.MakeDateAndTimeChooser(node);
//   else if (Class_HasByElement(node, 'RecurrenceEditor'))
//      RecurrenceEditor.MakeRecurrenceEditor(node);
//   else
   if (HtmlTextArea.IsHtmlTextArea(node))
      HtmlTextArea.UnmakeHtmlTextArea(node);
   else
   {
      if (node.tagName != 'SELECT') // for efficiency skip child OPTION elements
      {
         // NOTE: it's important not to check children of HtmlTextArea as the node is moved into a child
         let children = Array.from(node.children); // make a copy because new items could be added below during init
         for (let childNode of children)
         {
            Form_UninitializeNode(childNode);
         }
      }
   }
}

function Form_InitializeNodeEvents(elem)
{
   if (!Browser.IsExtensionContent() ||
      // don't initialize items in a template, they'll be initialized when copied
      Utilities_GetParentByClass(elem, 'MultiItemTemplate') != null)
      return;
   
   // wrap events because they can't run "inline" in the content scripts
   
   if (elem.hasAttribute('onchange'))
   {
      let onChangeScript = elem.hasAttribute('onchange_script') ? elem.getAttribute('onchange_script') : elem.getAttribute('onchange');
      if (typeof onChangeScript === 'function' && Browser.IsExtensionContent())
      {
         Log_WriteError('In extension content script onchange is a function!');
      }
      // DRL FIXIT! MANIFEST3 This check breaks the extension pop up windows so we'll need a workaround for v3!
      if (
         typeof onChangeScript !== 'function' && onChangeScript != '')
      {
         assert(onChangeScript.indexOf('PrepareEventContext') == -1);
         elem.removeAttribute('onchange');
         elem.setAttribute('onchange_script', onChangeScript); // save in case we have to init a copy
         Utilities_AddEvent(elem, 'change', function(event)
         {
            PrepareEventContext(elem, onChangeScript);
         });
      }
   }
   
   if (elem.hasAttribute('onclick'))
   {
      let onClickScript = elem.hasAttribute('onclick_script') ? elem.getAttribute('onclick_script') : elem.getAttribute('onclick');
      if (typeof onClickScript === 'function' && Browser.IsExtensionContent())
      {
         Log_WriteError('In extension content script onclick is a function!');
      }
      if (typeof onClickScript !== 'function' && onClickScript != '')
      {
         assert(onClickScript.indexOf('PrepareEventContext') == -1);
         elem.removeAttribute('onclick');
         elem.setAttribute('onclick_script', onClickScript); // save in case we have to init a copy
         Utilities_AddEvent(elem, 'click', function(event)
         {
            event.preventDefault();
            PrepareEventContext(elem, onClickScript);
            return false;
         });
      }
   }
}

function SaveChangedForms(nextUrl)
{
   let result = false;
   if (_BackgroundExecutionQueue.length > 0)
   {
      return true;
   }
   if (_Form_CheckToSave)
   {
      let forms = Utilities_GetElementsByTag("form");
      for (let form of forms)
      {
         let changed = Utilities_GetElementByName("FormHasChanged", form);
         if (changed != null && changed.value != "0")   // value of "2" means a form that always needs saving
         {
            setTimeout(function()
            {
               try
               {
                  SubmitForm(nextUrl, form.id);
               }
               catch (e)
               {
                  Log_WriteException(e, 'Error via SaveChangedForms');
               }
            }, 500);
            result = true;
         }
      }
   }
   return result;
}

// returns true if the form is submitting during an unload not for the purposes of refresh
function FormIsLeaving()
{
   return _Form_IsLeaving;
}

function FormGetUrl()
{
   let url = location.search;
   if (url == null || url.length == 0)       // this could have been a POST so in that case
      url = Form_ThisUri;                    // use the URL that is saved in the page by the server
   return url;
}

function FormGetView(url)
{
   if (url == null)
      url = FormGetUrl();
   let urlParams = new URLSearchParams(url.split('?')[1]);
   return urlParams.get('View');
}

function FormGetProcessor(url)
{
   if (url == null)
      url = FormGetUrl();
   let urlParams = new URLSearchParams(url.split('?')[1]);
   return urlParams.get('FormProcessor');
}

function FormGetViewOrProcessor(url)
{
   if (url == null)
      url = FormGetUrl();
   let urlParams = new URLSearchParams(url.split('?')[1]);
   let srch = 'View';
   if (url.indexOf('FormProcessor') != -1)   // this always takes precedence because a page can't be shown over a form
      srch = 'FormProcessor';
   return urlParams.get(srch);
}

function HandleUnload(e)
{
   if (_Form_UnloadHandled) return null;
   _Form_UnloadHandled = true;
   
   Form.BeforeUnload();
   
   if (!SaveChangedForms()) return null;
   
   let message = Str("Please wait while your changes are being saved, then try again.");
   
   // For IE and Firefox
   if (e)
   {
      let event = Utilities_GetEvent(e);
      event.returnValue = message;
   }
   
   // For Safari
   return message;
}

// cross browser support for document visibility
function getHiddenProp()
{
   let prefixes = ['webkit', 'moz', 'ms', 'o'];
   
   // if 'hidden' is natively supported just return it
   if ('hidden' in document) return 'hidden';
   
   // otherwise loop over all the known prefixes until we find one
   for (let prefix of prefixes)
   {
      if ((prefixe + 'Hidden') in document)
         return prefixe + 'Hidden';
   }
   
   // otherwise it's not supported
   return null;
}

function isHidden()
{
   let prop = getHiddenProp();
   if (!prop) return false;
   
   return document[prop];
}

/* DRL This was too aggressive, causing forms to be submitted when the user switches browser tabs, etc.
// on mobile devices the unload events are not reliable, see:
//   https://www.igvita.com/2015/11/20/dont-lose-user-and-app-state-use-page-visibility)
//   https://www.html5rocks.com/en/tutorials/pagevisibility/intro/
// but even this doesn't seem to work on iOS...
var visProp = getHiddenProp();
if (visProp)
{
   let evtname = visProp.replace(/[H|h]idden/,'') + 'visibilitychange';
   Utilities_AddEvent(document, evtname, function()
   {
      if (isHidden())
      {
         HandleUnload(null);
      }
      else
      {
         _Form_UnloadHandled = false;
      }
   });
}
*/

// We now catch most of this in our own methods when navigating away from the page (SubmitForm, CancelForm, GoToUrl)
// but we still need this here to catch the case where the user clicks the "back" button.
if (!Browser.IsExtension())   // I removed this in the extension because we don't own the page.
   Utilities_AddEvent(window, "beforeunload", function(e)
   {
      let message = null;
      
      if (_BackgroundExecutionQueue.length > 0)
      {
         message = Str('Are you sure you want to lose your changes?');
      }
      else if (_Form_CheckToSave && !_Form_UnloadHandled)
      {
         let forms = Utilities_GetElementsByTag("form");
         for (let form of forms)
         {
            let changed = Utilities_GetElementByName("FormHasChanged", form);
            if (changed != null && changed.value != "0")   // value of "2" means a form that always needs saving
            {
               message = Str('Are you sure you want to lose your changes?');
            }
         }
      }
      
      // For IE and Firefox
      if (message)
      {
         let event = Utilities_GetEvent(e);
         event.returnValue = message;
      }
      
      // For Safari
      return message;
   });

if (!Browser.IsExtension())   // I removed this in the extension because we don't own the page.
   Utilities_AddEvent(window, "submit", function(e)
   {
      // prevent onbeforeunload from showing message
      _Form_CheckToSave = false;
      
      let form = Utilities_GetThisOrParentByTag(Utilities_GetEventTrigger(e), 'FORM');
      let changed = Utilities_GetElementByName("FormHasChanged", form);
      let formAction = Utilities_GetElementByName("FormAction", form);
      
      let label = null;
      if (_Form_WaitingMessage != null)
         label = _Form_WaitingMessage;
      else if (formAction != null && formAction.value == "Refresh")
         label = Str("Refreshing page...");
      else if (changed != null && changed.value == "1")
         label = Str("Saving changes...");
      else
         label = Str("Please wait...");
      
      if (typeof BusyIndicatorStart === "function")
         BusyIndicatorStart(label);
   });

var _UnloadBusyIndicatorStop = null;

if (!Browser.IsExtension())   // I removed this in the extension because we don't own the page.
   Utilities_AddEvent(window, "beforeunload", function(e)
   {
      // if the busy indicator is already on then we know it's on for a reason and we don't
      // want to prematurely turn it off after 3 seconds so we leave it alone in this case
      if (typeof BusyIndicatorStart === "function" && !IsBusyIndicatorOn())
      {
         // I start this here because waiting for the unload event takes too long, but I had to use a short
         // timer because sometimes the page isn't really unloading so I refresh the timer in unload below
         BusyIndicatorStart();
         _UnloadBusyIndicatorStop = setTimeout(function()
         {
            try
            {
               BusyIndicatorStop();
            }
            catch (e)
            {
               Log_WriteException(e, 'Error via beforeunload event');
            }
         }, 3000);
      }
   });

if (!Browser.IsExtension())   // I removed this in the extension because we don't own the page.
   Utilities_AddEvent(window, "unload", function(e)
   {
      // disable the timer started by beforeunload because we want to extend the timer now that we're really going to unload
      if (_UnloadBusyIndicatorStop)
         clearTimeout(_UnloadBusyIndicatorStop);
      
      // make sure we turn off the busy indicator in case the user navigates "back" to this page
      setTimeout(function()
      {
         try
         {
            if (typeof BusyIndicatorStart === "function")
               BusyIndicatorStop();
         }
         catch (e)
         {
            Log_WriteException(e, 'Error via unload event');
         }
      }, 8000);
   });

// for iOS when user hits "back" button it reloads page from cache...
if (!Browser.IsExtension())   // I removed this in the extension because we don't own the page.
   Utilities_AddEvent(window, "pageshow", function(e)
   {
      // make sure we turn off the busy indicator in case the user navigates "back" to this page
      let event = Utilities_GetEvent(e);
      if (event.persisted)  // means reloaded from cache
      {
         if (typeof BusyIndicatorStart === "function")
            BusyIndicatorStop();
      }
   });

DocumentLoad.AddCallback(InitializeForm);
