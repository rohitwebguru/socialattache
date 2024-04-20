// ========================================================================
//        Copyright � 2012 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Allows the showing of a pop-up window with just about any HTML content.
//
// Usage (shows a form, hides form on cancel, note the DIV isn't 
// copied just its content):
//
// <DIV id='content_id' style='display:none;'>
//     <FORM action='/SomeScript.php'>
//         Type Something <INPUT type='text' size='50' name='Text'><BR>
//         <INPUT type='submit' value='Save'><INPUT type='button' value='Cancel' onClick='ClosePopUp();'>
//     </FORM>
// </DIV>
// <A onclick="DisplayPopUp('content_id');">Open form</A>

// Contains:
//    popup_window_elem
//    popup_window_content_src
//    popup_window_close_handler
var popup_window_stack = [];

// size: small, medium, narrow, large
function DisplayPopUp(id, size, closeHandler, addHeader = true, addScrollbars = true)
{
   let elem = Utilities_GetElementById(id);
   DisplayPopUpElement(elem, size, closeHandler, addHeader, addScrollbars);
}

function DisplayPopUpElement(elem, size, closeHandler, addHeader = true, addScrollbars = true)
{
   PopUp._OpeningPopUp();
   
   let formActions = '';
   let hasButtons = elem.querySelectorAll('.form_actions .form_button').length > 0;
   if (hasButtons)
   {
      formActions = elem.querySelector('.form_actions').innerHTML
   }
   else
   {
      let closeStr = StrButton('Close');
      
      // in the rare case that there are no buttons on the form we need a way of closing the popup
      formActions = '<button class="form_button form_cancel" id="PopUpCloseButton" type="button" onclick="ClosePopUp()">\n' +
         '    <span class="optional">' + closeStr + '</span>\n' +
         '    <img class="iconsmall" title="Close" src="/v2/Skins/CancelLt.svg">\n' +
         '</button>';
   }
   
   let headerClass = addHeader ? '' : 'window_no_header';
   let bodyClass = addScrollbars ? '' : 'window_no_scrollbars';
   let main = Utilities_CreateHtmlNode(
      "<DIV class='SA popup_window' style='z-index:" + (90000 + popup_window_stack.length) + "'>" +
      "	<header class='popup_window_header window_header " + headerClass + "'></header>" +
      "	<DIV class='popup_window_content " + headerClass + ' ' + bodyClass + "'></DIV><!--<DIV id='popup_window_shim'>--></DIV>" +
      "</DIV>"
   );
   
   document.body.insertBefore(main, document.body.childNodes[0]);
   main = document.body.childNodes[0]; // it is no longer a fragment??
   
   if (!size)
      size = "medium";
   
   // set the style of the popup to match the desired size
   Class_AddByElement(main, 'popup_window_' + size);
   
   // move the display data from the document into the popup
   let dest = main.querySelector('.popup_window_content');
   while (elem.hasChildNodes())
   {
      dest.appendChild(elem.childNodes[0]);
   }
   
   // copy buttons to the header as needed and massage them (required for extension event handling)
   let header = main.querySelector('.popup_window_header');
   header.innerHTML = formActions;
   InitializeForm([header]);
   
   // run any scripts that were provided
   let scripts = Utilities_GetElementsByTag('SCRIPT', dest);
   for (let script of scripts)
   {
      safeExec(script.innerText);
   }
   
   // This engages some CSS that fixes iframe scrolling on iOS.
   if (popup_window_stack.length == 0)
      Class_AddByElement(document.body, "has_popup_window");
   
   // save the ID and handler so we can access it later
   popup_window_stack.push({
      popup_window_elem: main,
      popup_window_content_src: elem,
      popup_window_close_handler: closeHandler
   });
}

function DisplayPopUpValue(id, size, closeHandler)
{
   let elem = Utilities_GetElementById(id);
   
   // handling is identical except for the saved item below
   DisplayPopUpElement(elem, size, closeHandler);
   
   // override the setting from above
   popup_window_stack[popup_window_stack.length - 1].popup_window_content_src = "INJECTED_CONTENT";
}

// id should be the id of a form control with value attribute
// this is currently only used to display the preview of a template
function DisplayPopUpFrame(id, size, closeHandler)
{
   // make it unique even across parent documents because some browsers require it
   let milliseconds = new Date().getTime();
   let popupFrameId = 'popup_web_window_iframe_' + milliseconds;
   
   let main = Utilities_CreateHtmlNode("<IFRAME id=\"" + popupFrameId + "\" name=\"" + popupFrameId + "\" frameborder=\"0\" src=\"\" width=\"100%\" height=\"100%\"></IFRAME>");
   
   DisplayPopUpElement(main, size, closeHandler, true, false);
   
   // moving the iframe after writing the content seems to erase the content
   // so instead let's write the content after DisplayPopUp
   let iframe = Utilities_GetElementById(popupFrameId);
   let html = Utilities_GetElementById(id).value;
   iframe.contentWindow.document.open();
   iframe.contentWindow.document.write(html);
   iframe.contentWindow.document.close();
}

function InitializeAutoLoadedFrames(rootNodes)
{
   for (let root of rootNodes)
   {
      var iframes = Utilities_GetElementsByClass('AutoLoadedFrame', 'IFRAME', root);
      for (let iframe of iframes)
      {
         let contentSourceId = iframe.getAttribute("ContentSourceID");
         let contentSource = Utilities_GetElementById(contentSourceId);
         if (contentSource)
         {
//			iframe.contentWindow.document.open('text/htmlreplace');
//			iframe.contentWindow.document.write(contentSource.value);
//			iframe.contentWindow.document.close();
// DRL FIXIT? I suspect this copies the content, couldn't we have put it here
// in the first place and avoid ContentSourceID altogether?
            iframe.contentWindow["contents"] = contentSource.value;
            iframe.src = 'javascript:window["contents"]';   // this will result in onload event and recalculating height
         }
      }
      
      iframes = Utilities_GetElementsByClass('adjust_frame_height_on_load', 'IFRAME', root);
      for (let iframe of iframes)
      {
         iframe.addEventListener('load', function(e)
         {
            AutoAdjustFrameHeight(e.target);
         });
      }
   }
}

DocumentLoad.AddCallback(InitializeAutoLoadedFrames);

// NOTE: If using this for an iFrame you must first set the iFrame height to a small value otherwise the returned
// value might be the maximum of the actual height and the current iFrame height. Also, the HTML inside the iframe
// must have a valid DOCTYPE. Even with all these this doesn't seem to work on Mac Chrome, and instead returns the
// current iFrame height.
function GetDocHeight(doc)
{
   doc = doc || document;
   // stackoverflow.com/questions/1145850/
   let body = doc.body, html = doc.documentElement;
   let height = Math.max(body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight);
   return height;
}

// adjust iframe height according to content height
function AutoAdjustFrameHeight(elem)
{
   let doc = elem.contentDocument ? elem.contentDocument : elem.contentWindow.document;
   
   elem.style.visibility = 'hidden';
   elem.style.height = "10px"; // reset to minimal height ...
   // IE opt. for bing/msn needs a bit added or scrollbar appears
   let height = GetDocHeight(doc);
   if (height == 0) height = 400;   // DRL FIXIT! Why does the height often come up 0?
   elem.style.height = (height + 10) + "px";   // we needed some extra height so the scrollbar won't show
   elem.style.visibility = 'visible';
}

function DisplayPopUpContent(content, size, closeHandler)
{
   let elem = Utilities_CreateHtmlNode(content);
   
   // handling is identical except for the saved item below
   DisplayPopUpElement(elem, size, closeHandler);
   
   // override the setting from above
   popup_window_stack[popup_window_stack.length - 1].popup_window_content_src = "DYNAMIC_CONTENT";
   
   // the elements created above need to be initialized
   elem = popup_window_stack[popup_window_stack.length - 1].popup_window_elem.querySelector('.popup_window_content');
   
   DocumentLoad.InitChunk(elem.children);
}

function GetPopUpContent()
{
   assert(popup_window_stack.length > 0);
   return popup_window_stack[popup_window_stack.length - 1].popup_window_elem.querySelector('.popup_window_content');
}

function ClosePopUp(closeTabIfTemporary)
{
//	// This is support for a popup containing an iFrame and this 
//	// call wanting to close the popup in the parent window hosting 
//	// that iFrame. 
//	if (!Visibility_IsShownById('popup_window'))
//	{
//		if (!window.parent || !window.parent == window || !window.parent.ClosePopUp) return;	// can't do it!
//		window.parent.ClosePopUp();
//		return;
//	}
   
   if (popup_window_stack.length == 0)
   {
      assert(0);
      return;
   }
   
   let popup = popup_window_stack.pop();
   
   let content = popup.popup_window_elem.querySelector('.popup_window_content');
   
   // DRL FIXIT? Is this still needed?
   // it looks like the scroll position is being saved between uses so I clear it here
   // this must be done while the DIV is visible
   content.scrollTop = 0;
   content.scrollLeft = 0;
   
   if (popup.popup_window_content_src == "INJECTED_CONTENT")
   {
   }
   else if (popup.popup_window_content_src == "DYNAMIC_CONTENT")
   {
   }
   else if (popup.popup_window_content_src != null)
   {
      // restore the display data back to where it was in the document
      let dest = popup.popup_window_content_src;
      while (content.hasChildNodes())
         dest.appendChild(content.childNodes[0]);
   }
   
   popup.popup_window_elem.remove();
   
   if (popup.popup_window_close_handler)
      popup.popup_window_close_handler();
   
   if (popup_window_stack.length == 0)
   {
      Class_RemoveByElement(document.body, "has_popup_window");
      
      // if this was a temporary tab we can close it now
      if (closeTabIfTemporary && Url_GetParam(window.location.href, 'SA_action') !== null)
         reqRemoveTab();   // used in Chrome extension only
   }
}

function CloseParentPopUp()
{
   // This is support for a popup containing an iFrame and this
   // call wanting to close the popup in the parent window hosting
   // that iFrame.
   if (Browser.CanAccessParent())
   {
      if (window.parent != window && window.parent.ClosePopUp)
         window.parent.ClosePopUp();
   }
   else
      window.parent.postMessage({action: 'ClosePopUp', params: null}, "*");
}

PopUp =
   {
      callbacks: new Array(),
      
      AddCallback: function(callback)
      {
         for (let cb of PopUp.callbacks)
         {
            if (cb == callback)
               return;   // already in the list
         }
         PopUp.callbacks.push(callback);
      },
      
      RemoveCallback: function(callback)
      {
         for (var i = 0; i < PopUp.callbacks.length; i++)
         {
            if (PopUp.callbacks[i] == callback)
            {
               PopUp.callbacks.splice(i, 1);
               break;
            }
         }
      },
      
      _OpeningPopUp: function()
      {
         for (let callback of PopUp.callbacks)
         {
            callback();
         }
      }
   };
