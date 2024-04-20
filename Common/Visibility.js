// ========================================================================
//        Copyright © 2008 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Allows the showing and hiding of elements in a Web page.
//
// Usage (note use of showhide):
//
// <p><a href="#data" onclick="Visibility_ToggleById('data')">Toggle</a></p>
// <div id="data" class="showhide">
// <p>This is some text that is initially hidden.</p>
// </div>
//
// <p><a href="#data" onclick="Visibility_ToggleByClass('data')">Toggle</a></p>
// <div class="data showhide">
// <p>This is some text that is initially hidden.</p>
// </div>
//
// Alternative uses:
// <p><a href="#data" onclick="Visibility_Show('data')">Show</a></p>
// <p><a href="#data" onclick="Visibility_Hide('data')">Hide</a></p>

function Visibility_IsShownByElement(elem)
{
   if (typeof (HtmlTextArea) !== 'undefined' && HtmlTextArea.IsHtmlTextArea(elem))
   {
      return HtmlTextArea.IsShown(elem);
   }
   
   if (Class_HasByElement(elem, 'hide_element'))
      return false;
   
   let vis = elem.style.display;
   // if the style value is blank we try to figure it out
   if (vis == '' && elem.offsetWidth != undefined && elem.offsetHeight != undefined)
      return (elem.offsetWidth != 0 && elem.offsetHeight != 0) ? true : false;
   return vis != 'none' ? true : false;
}

// returns true if there was a change
function Visibility_SetByElement(elem, visible)
{
   let result = false;
   
   // we try to change the visibility without affecting the "display" property because it may not be set to standard
   
   if (typeof (HtmlTextArea) !== 'undefined' && HtmlTextArea.IsHtmlTextArea(elem))
   {
      if (visible)
         result = HtmlTextArea.Show(elem);
      else
         result = HtmlTextArea.Hide(elem);
   }
   else if (visible)
   {
      if (Class_HasByElement(elem, 'hide_element'))
      {
         Class_RemoveByElement(elem, 'hide_element');
         result = true;
      }
      
      if (elem.style.display == 'none')
      {
         var value;
         var tagName = strtolower(elem.tagName);
         if (tagName == 'tr')
            value = 'table-row';
         else if (tagName == 'div')
            value = 'block';
         else
            value = '';
         elem.style.display = value;
         
         result = true;
      }
   }
   else if (!Class_HasByElement(elem, 'hide_element'))
   {
      Class_AddByElement(elem, 'hide_element');
      result = true;
   }
   
   return result;
}

function Visibility_ShowByElement(elem)
{
   return Visibility_SetByElement(elem, 1);
}

function Visibility_HideByElement(elem)
{
   return Visibility_SetByElement(elem, 0);
}

function Visibility_ToggleByElement(elem)
{
   return Visibility_SetByElement(elem, !Visibility_IsShownByElement(elem));
}

function Visibility_IsShownById(id)
{
   var elem = Utilities_GetElementById(id);
   if (elem)
      return Visibility_IsShownByElement(elem);
   return false;
}

function Visibility_SetById(id, visible)
{
   var elem = Utilities_GetElementById(id);
   if (elem)
      return Visibility_SetByElement(elem, visible);
   return false;
}

function Visibility_ShowById(id)
{
   var elem = Utilities_GetElementById(id);
   if (elem)
      return Visibility_ShowByElement(elem);
   return false;
}

function Visibility_HideById(id)
{
   var elem = Utilities_GetElementById(id);
   if (elem)
      return Visibility_HideByElement(elem);
   return false;
}

function Visibility_ToggleById(id)
{
   var elem = Utilities_GetElementById(id);
   if (elem)
      return Visibility_ToggleByElement(elem);
   return false;
}

function Visibility_IsShownByName(name)
{
   var elem = Utilities_GetElementByName(name);
   if (elem)
      return Visibility_IsShownByElement(elem);
   return false;
}

function Visibility_SetByName(name, visible)
{
   var elem = Utilities_GetElementByName(name);
   if (elem)
      return Visibility_SetByElement(elem, visible);
   return false;
}

function Visibility_ShowByName(name)
{
   var elem = Utilities_GetElementByName(name);
   if (elem)
      return Visibility_ShowByElement(elem);
   return false;
}

function Visibility_HideByName(name)
{
   var elem = Utilities_GetElementByName(name);
   if (elem)
      return Visibility_HideByElement(elem);
   return false;
}

function Visibility_ToggleByName(name)
{
   var elem = Utilities_GetElementByName(name);
   if (elem)
      return Visibility_ToggleByElement(elem);
   return false;
}

function Visibility_IsShownByClass(className, root)
{
   var result = false;
   var elems = Utilities_GetElementsByClass(className, null, root);
   for (var i = 0, len = elems.length; i < len; i++)
   {
      if (Visibility_IsShownByElement(elems[i]))
         result = true;
   }
   return result;
}

function Visibility_SetByClass(className, visible, root, includeRoot)
{
   var result = false;
   var elems = Utilities_GetElementsByClass(className, null, root, includeRoot);
   for (var i = 0, len = elems.length; i < len; i++)
   {
      if (Visibility_SetByElement(elems[i], visible))
         result = true;
   }
   return result;
}

// this version returns a list of the affected elements (more expensive)
function Visibility_SetByClassReturnList(className, visible, root, includeRoot)
{
   var result = [];
   var elems = Utilities_GetElementsByClass(className, null, root, includeRoot);
   for (var i = 0, len = elems.length; i < len; i++)
   {
      if (Visibility_SetByElement(elems[i], visible))
         result.push(elems[i]);
   }
   return result;
}

function Visibility_ShowByClass(className, root)
{
   var result = false;
   var elems = Utilities_GetElementsByClass(className, null, root);
   for (var i = 0, len = elems.length; i < len; i++)
   {
      if (Visibility_ShowByElement(elems[i]))
         result = true;
   }
   return result;
}

function Visibility_HideByClass(className, root)
{
   var result = false;
   var elems = Utilities_GetElementsByClass(className, null, root);
   for (var i = 0, len = elems.length; i < len; i++)
   {
      if (Visibility_HideByElement(elems[i]))
         result = true;
   }
   return result;
}

function Visibility_ToggleByClass(className, root)
{
   var result = false;
   var elems = Utilities_GetElementsByClass(className, null, root);
   for (var i = 0, len = elems.length; i < len; i++)
   {
      if (Visibility_ToggleByElement(elems[i]))
         result = true;
   }
   return result;
}

function Visibility_IsShown(item)
{
   return Visibility_IsShownByElement(Utilities_GetElement(item));
}

function Visibility_SetIsShown(item, visible)
{
   Visibility_SetIsShownByElement(Utilities_GetElement(item), visible);
}

function Visibility_Show(item)
{
   Visibility_ShowByElement(Utilities_GetElement(item));
}

function Visibility_Hide(item)
{
   Visibility_HideByElement(Utilities_GetElement(item));
}

function Visibility_Toggle(item)
{
   return Visibility_ToggleByElement(Utilities_GetElement(item));
}

function Visibility_HandleOpenClose(toggler, elem, isOpen)
{
   if (Class_HasByElement(elem, 'toggle_sliding'))
   {
      // calculation (because using scrollHeight gave us the wrong values in resources page)
      elem.style.height = null;
      let height = elem.clientHeight;   // get the "real" height
      
      // transition
      if (isOpen)
      {
         elem.style.height = '0px';
         setTimeout(function()
         {
            elem.style.height = height + 'px';
         }, 1);
         
         // we clear the height in case it changes (check state again in case user toggles fast)
         setTimeout(function()
         {
            let isOpen = Class_HasByElement(toggler, 'toggler_opened');
            Class_SetByElement(elem, 'toggle_opened', isOpen);
            if (isOpen)
               elem.style.height = null;
         }, 1000);
      }
      else
      {
         elem.style.height = height + 'px';
         Class_RemoveByElement(elem, 'toggle_opened');
         setTimeout(function()
         {
            elem.style.height = '0';
         }, 1);
      }
   }
   else
      Visibility_SetByElement(elem, isOpen);
}

function Visibility_ToggleHandler(event)
{
   event.preventDefault();
   
   let a = Utilities_GetEventTarget(event);
   
   Class_ToggleByElement(a, 'toggler_opened');
   let isOpen = Class_HasByElement(a, 'toggler_opened');
   
   let sel = this.getAttribute('href').substr(1);
   
   if (Class_HasByElement(a, 'toggler_id'))
   {
      let elem = Utilities_GetElementById(sel);
      if (elem)
         Visibility_HandleOpenClose(a, elem, isOpen);
   }
   
   if (Class_HasByElement(a, 'toggler_class'))
   {
      let elems = Utilities_GetElementsByClass(sel);
      for (let elem of elems)
      {
         Visibility_HandleOpenClose(a, elem, isOpen);
      }
   }
   
   if (a.hasAttribute('foldertoggleid'))
   {
      let folderToggleID = a.getAttribute('foldertoggleid');
      
      ajax.post(Form_RootUri + '/v2/FolderToggles/' + folderToggleID, {'IsOpen': isOpen}, function(resp, httpCode)
      {
         if (httpCode != 200)
            Log_WriteError('Response ' + httpCode + ' from server for folder toggle ' + folderToggleID + ': ' + resp);
      });
   }
   
   var node = Utilities_GetElementById(sel);
   var nodes = Utilities_GetElementsByClass('toggle_loaded', 'IFRAME', node);
   [].forEach.call(nodes, function(iframe)
   {
      if (iframe.hasAttribute('delay_load_src'))
      {
         iframe.setAttribute('src', iframe.getAttribute('delay_load_src'));
         // don't load it a second time
         iframe.removeAttribute('delay_load_src');
      }
   });
}

DocumentLoad.AddCallback(function(rootNodes)
{
   forEach(rootNodes, function(root)
   {
      // start all showhide elements as initially hidden unless they have the "toggler_opened" class
      Visibility_SetByClass('showhide', false, root, true);
      
      let nodes = Utilities_GetElementsByClass('toggler_id', null, root);
      for (let a of nodes)
      {
         let isOpen = Class_HasByElement(a, 'toggler_opened'); // initial state
         let sel = a.getAttribute('href').substr(1);
         let elem = Utilities_GetElementById(sel);
         if (elem)
         {
            if (Class_HasByElement(elem, 'toggle_sliding'))
            {
               elem.style.height = isOpen ? null : '0';
               Class_SetByElement(elem, 'toggle_opened', isOpen);
            }
            else
               Visibility_SetByElement(elem, isOpen);
         }
         
         a.addEventListener('click', Visibility_ToggleHandler);
      }
      
      nodes = Utilities_GetElementsByClass('toggler_class', null, root);
      for (let a of nodes)
      {
         let isOpen = Class_HasByElement(a, 'toggler_opened'); // initial state
         let sel = a.getAttribute('href').substr(1);
         
         let elems = Utilities_GetElementsByClass(sel, null, root);
         for (let elem of elems)
         {
            Visibility_SetByElement(elem, isOpen);
            
            if (Class_HasByElement(elem, 'toggle_sliding'))
            {
               elem.style.height = isOpen ? null : '0';
               Class_SetByElement(elem, 'toggle_opened', isOpen);
            }
            else
               Visibility_SetByElement(elem, isOpen);
         }
         
         a.addEventListener('click', Visibility_ToggleHandler);
      }
      
      // in the layout editor some items are NOT hidden, so the user can manage them
      let editor = Utilities_GetElementById('EditArea', root);
      if (editor && Class_HasByElement(editor, 'is-builder'))
      {
         Visibility_SetByClass('show_in_editor', true, editor, true);
      }
   });
});

