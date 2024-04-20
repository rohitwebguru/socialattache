// ========================================================================
//        Copyright � 2012 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Uses PopUpWindow.js which must also be included!!!
//
// Allows the showing of a Web page in a pop-up window.
//
// Usage:
//
//   <a onclick="DisplayWebPage('http://www.meetup.com');">Open page</a><br>

var hiddenWindowFrameID = null

// returns an iframe ID if an iframe is used
// DRL FIXIT? Can't we make "hidden" just another size?
function DisplayWebPage(url, size, hidden, refreshParent, closeHandler)
{
   // It looks like if we open a URL from a different domain it will sometimes not load
   // such as if the destination specifies the header "X-Frame-Options:sameorigin" so
   // we check here for matching domains and if they don't match we open in a new window.
   
   let result = null;
   let curDomain = window.location.hostname;
   let newDomain = url.split("/")[2];
   if (empty(size)) size = 'large';
   
   let tempForm = CreateFormFromUrl(url);
   document.body.appendChild(tempForm);
   
   if (size.startsWith('tab_'))
   {
      tempForm.target = size;
      
      // bring the tab into focus
      let temp = window.open('', tempForm.target);
      if (temp != null)
         setTimeout(function()
         {
            try
            {
               temp.focus();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 100);
   }
   else if (hidden)
   {
      // hidden processes should use a different id so that the user can still open other pages while hidden processing is going on
      let web_window_id = "web_window_hidden";
      if (!Utilities_GetElementById(web_window_id))
      {
         // make it unique even across parent documents because some browsers require it
         let milliseconds = new Date().getTime();
         hiddenWindowFrameID = 'web_window_iframe_hidden_' + milliseconds;
         
         let main = Utilities_CreateHtmlNode(
            "<DIV id=\"" + web_window_id + "\" style=\"display: none;\">" +
            "  <IFRAME id=\"" + hiddenWindowFrameID + "\" name=\"" + hiddenWindowFrameID + "\" src=\"\"></IFRAME>" +
            "</DIV>");
         document.body.insertBefore(main, document.body.childNodes[0]);
      }
      result = hiddenWindowFrameID;
      Utilities_GetElementById(hiddenWindowFrameID).src = url;
      tempForm.target = hiddenWindowFrameID;
   }
   else if ((newDomain == null || strcmp(strtolower(curDomain), strtolower(newDomain)) == 0) &&
      strcmp(size, 'new') != 0)
   {
      // make it unique even across parent documents because some browsers require it
      let milliseconds = new Date().getTime();
      let webWindowFrameID = 'web_window_iframe_' + milliseconds;
      
      // undo the CSS styling for iframes
      let iframeStyle =
         "box-sizing: content-box;" +
         "border: none;" +
         "border-radius: 0px;" +
         "padding: 0px;" +
         "width: auto;" +
         "margin: 0px;" +
         "height:100%;" +
         "width:100%;";
      
      let main = Utilities_CreateHtmlNode("<IFRAME id=\"" + webWindowFrameID + "\" name=\"" + webWindowFrameID +
         "\" style=\"" + iframeStyle + "\" frameborder=\"0\" src=\"" + url + "\"></IFRAME>");
      
      result = webWindowFrameID;
      tempForm.target = webWindowFrameID;
      
      DisplayPopUpElement(main, size, function()
      {
         if (closeHandler)
            closeHandler();
         if (refreshParent)
         {
            // window.parent.window.location.reload(true);
            if (Browser.CanAccessParent())
            {
               if (window.parent != window && window.parent.RefreshForm)
                  window.parent.RefreshForm();
            }
            else
               window.parent.postMessage({action: 'RefreshForm', params: null}, "*");
         }
      }, false, false); // no header, no scrollbars
   }
   else
   {
      let milliseconds = new Date().getTime();
      tempForm.target = 'new_web_window_' + milliseconds;
      let temp = window.open(url, tempForm.target, 'width=1000,height=600,left=150,top=50,screenX=150,screenY=50,resizable=1,scrollbars=1,toolbar=1,location=1,directories=1');
      if (temp != null)
         setTimeout(function()
         {
            try
            {
               temp.focus();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 100);
   }
   
   tempForm.submit();
   document.body.removeChild(tempForm);
   
   return result;
}

function CloseWebWindow()
{
   ClosePopUp();
}

function CloseParentWebWindow()
{
   CloseParentPopUp();
}

function Redirect(url)
{
   window.location.href = url;
}

function RedirectParent(url)
{
   if (Browser.CanAccessParent())
   {
      if (window.parent != window)
         window.parent.location.href = url;
   }
   else if (window.parent != window)
      window.parent.postMessage({action: 'Redirect', params: url}, "*");
}
