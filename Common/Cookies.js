// ========================================================================
//        Copyright � 2013 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

function CookiesInit()
{
   return {
      lastCookiesFetched: null,
      cookies: {}
   };
}

function SetCookie(name, value, expiry)   // seconds
{
   let exdate = DateAndTime_Now(0).Add(expiry);
   
   if (Browser.IsExtensionBackground())
   {
      assert(Form_RootUri != null); // should be initialized
      let params = {
         'url': Form_RootUri,
         'name': name,
         'value': value
      };
      if (expiry != null)
         params['expirationDate'] = exdate.ToEpoch();
      chrome.cookies.set(params, function(cookie)
      {
         if (chrome.extension.lastError) Log_WriteError("Extension error setting cookie: " + chrome.extension.lastError.message);
         if (chrome.runtime.lastError) Log_WriteError("Runtime error setting cookie: " + chrome.runtime.lastError.message);
         
         let sharedData = Storage.GetSharedVar('Cookies', CookiesInit());
         
         sharedData.cookies[name] = value;
         
         Storage.SetSharedVar('Cookies', sharedData);
      });
   }
   else if (Browser.IsExtensionContent())
   {
      assert(0);  // cookies are read-only in the extension content scripts, but we could message the background script to update if needed
   }
   else
   {
      let time = '';
      if (expiry != null)
      {
         time = new Date();
         time.setTime(exdate.ToEpoch() * 1000);
         time = '; expires=' + time.toUTCString();
      }
      value = encodeURIComponent(value) + time + '; path=/';
      document.cookie = name + '=' + value;
   }
}

function DeleteCookie(name)
{
   if (Browser.IsExtensionBackground())
   {
      assert(Form_RootUri != null); // should be initialized
      let params = {
         'url': Form_RootUri,
         'name': name
      };
      chrome.cookies.remove(params, function()
      {
         if (chrome.extension.lastError) Log_WriteError("Extension error setting cookie: " + chrome.extension.lastError.message);
         if (chrome.runtime.lastError) Log_WriteError("Runtime error setting cookie: " + chrome.runtime.lastError.message);
         
         let sharedData = Storage.GetSharedVar('Cookies', CookiesInit());
         
         delete sharedData.cookies[name];
         
         Storage.SetSharedVar('Cookies', sharedData);
      });
   }
   else if (Browser.IsExtensionContent())
   {
      assert(0);  // cookies are read-only in the extension content scripts, but we could message the background script to update if needed
   }
   else
   {
      // expire the cookie to delete it
      let value = '; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/';
      document.cookie = name + '=' + value;
   }
}

function GetCookie(name, defaultValue)
{
   let value = defaultValue;
   
   if (Browser.IsExtension())
   {
      let sharedData = Storage.GetSharedVar('Cookies', null);
      
      if (sharedData != null)
      {
         if (sharedData.cookies.hasOwnProperty(name))
            value = sharedData.cookies[name];
      }
      else
      {
         Log_WriteErrorCallStack('Cookies have not yet been loaded when requesting "' + name + '"');
      }
   }
   else
   {
      let i, x, y, ARRcookies = document.cookie.split(';');
      for (i = 0; i < ARRcookies.length; i++)
      {
         x = ARRcookies[i].substr(0, ARRcookies[i].indexOf('='));
         y = ARRcookies[i].substr(ARRcookies[i].indexOf('=') + 1);
         x = x.replace(/^\s+|\s+$/g, '');
         if (x == name)
         {
            value = decodeURIComponent(y.replace(/\+/g, ' '));
            break;
         }
      }
   }
   
   return value;
}

function GetCookieSize()
{
   if (Browser.IsExtension())
   {
      assert(0);  // not yet implemented
   }
   else
   {
      return document.cookie.length;
   }
}

function GetCookies()
{
   let cookies = {};
   
   if (Browser.IsExtension())
   {
      let sharedData = Storage.GetSharedVar('Cookies', null);
      
      if (sharedData != null)
      {
         cookies = sharedData.cookies;
      }
      else
      {
         Log_WriteErrorCallStack('Cookies have not yet been loaded when requesting all cookies');
      }
   }
   else
   {
      if (document.cookie && document.cookie != '')
      {
         let split = document.cookie.split(';');
         for (let i = 0; i < split.length; i++)
         {
            let name_value = split[i].split('=');
            name_value[0] = name_value[0].replace(/^ /, '');
            cookies[decodeURIComponent(name_value[0])] = decodeURIComponent(name_value[1]);
         }
      }
   }
   
   return cookies;
}

// this must be called in the extension background once the URLs have been initialized
function Cookies_OnUserChanged()
{
   assert(Browser.IsExtensionBackground());
   
   assert(Form_RootUri != null); // should be initialized
   let params = {
      'url': Form_RootUri
   };
   // DRL FIXIT! This doesn't seem to get us all the cookies.
   chrome.cookies.getAll(params, function(cookies)
   {
      if (chrome.extension.lastError) Log_WriteError("Extension error getting cookies: " + chrome.extension.lastError.message);
      if (chrome.runtime.lastError) Log_WriteError("Runtime error getting cookies: " + chrome.runtime.lastError.message);
      
      let sharedData = Storage.GetSharedVar('Cookies', CookiesInit());
      
      for (let cookie of cookies)
         sharedData.cookies[cookie.name] = cookie.value;
      
      Storage.SetSharedVar('Cookies', sharedData);
   });
}
