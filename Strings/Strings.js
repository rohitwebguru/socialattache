// ========================================================================
//        Copyright � 2018 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Dependencies: StringsForWeb.js, StringsForExtension.js

// Allows getting localized strings from the PHP server.
//
// Usage:
//
// let str = Str('This is an English string and key');

// NOTE: Keep this exactly the same as the one in Strings.php!
var Strings_SupportedLanguages = ['en-US', 'fr-CA', 'es-MX', 'pl', 'de-DE'];
// for the web case these two are initialized by the PHP generated code, and for the extension case
// they are initialized via the reqInitTab() method
var Strings_LanguageCode = null;
var Strings_Translations = null;         // this is the high performance version used by most browsers
//var Strings_Translations_File = {};    // this is a string representation of the above used by busted browsers like Chrome that can't load the above properly
var Strings_GenericLanguageCode = "glc";
var Strings_Array_Translations = {};
var Strings_OutstandingRequests = 0;
var Strings_TimeoutID = 0;
var Strings_ShowIDs = null;
var Strings_TranslationsWithID = {};   // these are not persisted since they're only used while manual translating

// any additional parameters are available inside the string as <0>, <1>, etc.
function Str(key)
{
   let parameters = Array.from(arguments);
   parameters.splice(0, 1);
   let str = _Str(key, null, null, null, null, parameters);
   for (let i = 1; i < arguments.length; i++)
   {
      str = Utilities_ReplaceInString(str, '<' + (i - 1) + '>', arguments[i]);
   }
   return str;
}

// the key is the singular version of the string, the pluralValue is the plural version of the string, and
// the pluralCount is the count which can also be used in the string with the replacement <0>, and any additional
// parameters are accessible as <1>, <2>, etc.
function StrPlurality(key, pluralValue, pluralCount)
{
   let str = _Str(key);
   for (let i = 3; i < arguments.length; i++)
   {
      str = Utilities_ReplaceInString(str, '<' + (i - 2) + '>', arguments[i]);
   }
   return str;
}

function _GetServerString(url, params, callback)
{
   params['StringCaller'] = Browser.IsExtension() ? 'extension' : 'web';
   
   if (Browser.IsExtensionContent())
   {
      // send a message to the background script to get the file for us
      Messaging.SendMessageToBackground({type: 'GET', url: url, params: params})
         .then(resp =>
         {
            if (resp == null)
            {
               callback(null);
               return;
            }
            
            if (resp.httpCode != 200)
               Log_WriteError("Got " + resp.httpCode + " response for string request " + url);
            
            callback(resp.data);
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
   }
   else
   {
      ajax.get(url, params, callback, true, 30 * 1000);
   }
}

function Strings_GetBestLanguageCode(languageCodes)
{
   for (let i in languageCodes)
   {
      let code = languageCodes[i];
      
      // look first for a full match
      for (let supportedCode of Strings_SupportedLanguages)
      {
         if (code == supportedCode)
         {
            return supportedCode;
         }
      }
      
      // ignore the second part of the language code if there isn't a full match
      code = code.split('-')[0];
      for (let supportedCode of Strings_SupportedLanguages)
      {
         if (code == supportedCode.split('-')[0])
         {
            return supportedCode;
         }
      }
   }
   
   // no matches!
   return Strings_SupportedLanguages[0];
}

function Strings_InitExtension(languageCode, translations)
{
   Strings_LanguageCode = languageCode;
   Strings_Translations = [];
   Strings_Translations[Strings_LanguageCode] = translations;
   // DRL FIXIT? We will want to implement this properly when add support for updating translations in the extension.
   Strings_TranslationsWithID = Strings_Translations;
}

// this would normally not be needed but in the browser extension case we need it
function Strings_Init(languageCodes)   // expects an array
{
   assert(0); // I believe the strings are now always provided.
   
   let temp = Strings_GetBestLanguageCode(languageCodes);
   if (temp == Strings_LanguageCode)
      return;
   
   Strings_LanguageCode = temp;
   if (Strings_Translations == null)
      Strings_Translations = {};
   if (Strings_Translations.hasOwnProperty(Strings_LanguageCode))
      return;
   
   Strings_Translations[Strings_LanguageCode] = {};
   
   let url = Form_RootUri + '/v2/Strings/Cache';
   let params = {
      'StringCaller': Browser.IsExtension() ? 'extension' : 'web',
      'LanguageCode': Strings_LanguageCode
   };
   
   if (Browser.IsExtensionContent())
   {
      // send a message to the background script to get the file for us
      Messaging.SendMessageToBackground({type: 'GET', url: url, params: params})
         .then(resp =>
         {
            if (resp == null)
            {
               Log_WriteError('Unable to get strings from server for language ' + Strings_LanguageCode + ': null');
               return;
            }
            if (resp.httpCode != 200)
            {
               Log_WriteError('Unable to get strings from server for language ' + Strings_LanguageCode + ': ' + resp.httpCode);
               return;
            }
            
            Strings_Translations[Strings_LanguageCode] = Json_FromString(resp.data);
            assert(Strings_Translations[Strings_LanguageCode] != null);
         })
         .catch(e =>
         {
            Log_WriteException(e);
            throw e;
         });
   }
   else
   {
      ajax.get(url, params, function(data, httpCode)
      {
         if (httpCode != 200)
         {
            Log_WriteError('Unable to get strings from server for language ' + Strings_LanguageCode + ': ' + httpCode);
            return;
         }
         
         Strings_Translations[Strings_LanguageCode] = Json_FromString(data);
         assert(Strings_Translations[Strings_LanguageCode] != null);
      }, true, 30 * 1000);
   }
}

function _Str(key, usage, value, pluralValue, pluralCount, parameters)
{
   if (value == null || value == undefined)
      value = key;
   hashKey = Utilities_Sha1(key);
   
   if (Strings_ShowIDs == null)
      Strings_ShowIDs = GetCookie('ShowStringIDs', false) ? true : false;
   
   if (Strings_LanguageCode == null)
   {
      assert(0); // I believe the strings are now always provided.
      assert(Browser.IsExtension() == true);
      Strings_Init(GetCookie('LanguageCodes', 'en-US').split(','));
      Log_WriteInfo("Languages in extension: " + Strings_LanguageCode);
   }
   else if (Strings_Translations === null)
   {
      assert(0); // I believe the strings are now always provided.
      assert(Browser.IsExtension() == false);
      Strings_Init([Strings_LanguageCode]);
   }
   
   let translationsCache = Strings_ShowIDs ? Strings_TranslationsWithID : Strings_Translations;
   
   if (!translationsCache.hasOwnProperty(Strings_LanguageCode))
   {
      Log_WriteError('Missing strings language: ' + Strings_LanguageCode);
      translationsCache[Strings_LanguageCode] = {};
   }
   
   let combinedKey = hashKey + '-' + (usage ? usage : '');
   if (pluralCount != null && pluralCount > 1)
      combinedKey += '-p';
   if (translationsCache[Strings_LanguageCode].hasOwnProperty(combinedKey))
   {
      value = translationsCache[Strings_LanguageCode][combinedKey];
      if (pluralCount != null)
         value = Utilities_ReplaceInString(value, '<0>', pluralCount);
      return value;
   }
   /*
      // this is for Chrome where the Strings_Translations is not properly loaded so
      // we try to look up the string ID manually
   
      let i = Strings_Translations_File.indexOf('"' + Strings_LanguageCode + '"');
      if (i >= 0 && !Strings_ShowIDs)
      {
         i += 7;
         i = Strings_Translations_File.indexOf(combinedKey, i);
         if (i > 0)
         {
            let iStart = Strings_Translations_File.indexOf('":"', i + combinedKey.length);
            assert(iStart > 0);
            iStart += 3;
            let iEnd = Strings_Translations_File.indexOf('",', iStart);
            assert(iEnd > 0);
            value = Strings_Translations_File.substr(iStart, iEnd-iStart);
            if (pluralCount != null)
               value = Utilities_ReplaceInString(value, '<0>', pluralCount);
            return value;
         }
      }
   */
   if (Strings_TimeoutID)
   {
      clearTimeout(Strings_TimeoutID);
      Strings_TimeoutID = null;
   }
   Strings_OutstandingRequests++;
   
   let params = {
      'StringLanguageCode': Strings_LanguageCode,
      'StringKey': key
   };
   if (usage != undefined && usage != null && usage != '')
      params['StringUsage'] = usage;
   if (value != undefined && value != null)
      params['StringValue'] = value;
   if (pluralValue != undefined && pluralValue != null)
      params['StringPluralValue'] = pluralValue;
   if (pluralCount != undefined && pluralCount != null)
      params['StringPluralCount'] = pluralCount;
   
   if (Form_RootUri == null)
   {
      let value = params['StringValue'];
      Log_WriteWarning('Server URL not yet initialized to get string, using original value: ' + value);
      return value;
   }
   
   _GetServerString(Form_RootUri + '/v2/Strings', params,
      function(response)
      {
         if (response == null)
         {
            let value = params['StringValue'];
            Log_WriteError('Got null response for string, using original value: ' + value);
            response = value;
         }
         translationsCache[Strings_LanguageCode][combinedKey] = response;
         /*
                  // also add the string to the cached file
                  let i = Strings_Translations_File.indexOf('"' + Strings_LanguageCode + '"');
                  if (i >= 0)
                  {
                     i += 9;  // get to the other side of the opening bracket
            
                     let value = Utilities_ReplaceInString(response, '"', '\x22');
                     Strings_Translations_File = Strings_Translations_File.substr(0, i) +
                        '"' + combinedKey + '":"' + value + '",' +
                        Strings_Translations_File.substr(i);
                  }
         */
         Strings_OutstandingRequests--;
         if (Strings_OutstandingRequests == 0 && !Browser.IsExtensionBackground())
         {
            Strings_TimeoutID = setTimeout(function()
            {
               try
               {
                  _ReplaceCachedArrayStrings();
                  ReplaceStrings(document.body);
                  CheckForStringIDs([document.body]);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 1000);
         }
      });
   

   // we used to update the string inline (below) but the user experience wasn't great, and sometimes the string
   // is placed somewhere that it isn't updated later so if this is the reference language just show the reference
   if (Strings_LanguageCode == 'en-US')
      return value;

   // put the string in the cache and we'll handle it when we get the response
   translationsCache[Strings_LanguageCode][combinedKey] = '{Str:' + combinedKey + '}';
   
   // DRL FIXIT! This will only work the first time this string is requested, subsequent requests for
   // the same string will not include the parameters!
   // DRL FIXIT! This will have issues if the parameter values contain the ":" separator!
   if (parameters == null) parameters = [];
   return '{Str:' + combinedKey + ':' + parameters.join('■') + '}';   // include the parameters inline
}

function StrButton(key, value)
{
   return _Str(key, 'button', value);
}

function StrLabel(key, value)  // label for a form entry field
{
   return _Str(key, 'label', value);
}

function StrOption(key, value) // option in a drop down list
{
   return _Str(key, 'option', value);
}

// returns: array of translated values with the same original keys
function StrArray(prefix, arr)
{
   // some arrays are re-used so let's cache them
   if (Strings_Array_Translations.hasOwnProperty(prefix))
      return Strings_Array_Translations[prefix];
   
   let result = {};
   let prefix2 = prefix + '_';
   for (let key in arr)
   {
      result[key] = _Str(prefix2 + key, 'array', arr[key]);
   }
   Strings_Array_Translations[prefix] = result;
   
   return result;
}

function _ReplaceCachedArrayStrings()
{
   let translationsCache = Strings_ShowIDs ? Strings_TranslationsWithID : Strings_Translations;
   
   for (let arrayKey in Strings_Array_Translations)
   {
      for (let strKey in Strings_Array_Translations[arrayKey])
      {
         if (Strings_Array_Translations[arrayKey][strKey].startsWith('{Str:'))
         {
            let combinedKey = Strings_Array_Translations[arrayKey][strKey].substr(5);
            combinedKey = combinedKey.substr(0, combinedKey.length - 2);  // remove ":}" from end
            if (combinedKey in translationsCache[Strings_LanguageCode] &&
               translationsCache[Strings_LanguageCode][combinedKey].substr(0, 5) != '{Str:')
            {
               Strings_Array_Translations[arrayKey][strKey] = translationsCache[Strings_LanguageCode][combinedKey];
            }
         }
      }
   }
}

function _ReplaceStrings(str)
{
   let translationsCache = Strings_ShowIDs ? Strings_TranslationsWithID : Strings_Translations;
   
   while (true)
   {
      let iStart = str.indexOf('{Str:');
      if (iStart == -1)
         break;
      
      iStart += 5;
      let iEnd = str.indexOf('}', iStart);
      let combinedKey = str.substr(iStart, iEnd - iStart);
      
      // key is optionally followed by parameters
      let parameters = [];
      let iArg = combinedKey.indexOf(':');
      if (iArg != -1)
      {
         parameters = combinedKey.substr(iArg + 1);
         if (parameters == '')
            parameters = [];
         else
            parameters = parameters.split('■');
         combinedKey = combinedKey.substr(0, iArg);
      }
      let value = null;
      
      if (combinedKey in translationsCache[Strings_LanguageCode] &&
         translationsCache[Strings_LanguageCode][combinedKey].substr(0, 5) != '{Str:')
      {
         value = translationsCache[Strings_LanguageCode][combinedKey];
      }
      else
      {
         /*
                  // this is for Chrome where the Strings_Translations is not properly loaded so
                  // we try to look up the string ID manually
            
                  let i = Strings_Translations_File.indexOf('"' + Strings_LanguageCode + '"');
                  if (i >= 0)
                  {
                     i += 7;
                     i = Strings_Translations_File.indexOf(combinedKey, i);
                     if (i > 0)
                     {
                        let iStart2 = Strings_Translations_File.indexOf('":"', i + combinedKey.length);
                        assert(iStart2 > 0);
                        iStart2 += 3;
                        let iEnd2 = Strings_Translations_File.indexOf('",', iStart2);
                        assert(iEnd2 > 0);
                        value = Strings_Translations_File.substr(iStart2, iEnd2 - iStart2);
         //               if (pluralCount != null)
         //                  value = Utilities_ReplaceInString(value, '<0>', pluralCount);
                     }
                  }
         */
      }
      
      if (value == null)
      {
         // we have to replace it with something in order to avoid endless loop
         value = 'string_error';
         Log_WriteError('String was not found: ' + combinedKey);
      }
      else
      {
         for (let i = 0; i < parameters.length; i++)
         {
            value = Utilities_ReplaceInString(value, '<' + i + '>', parameters[i]);
         }
      }
      
      str = str.substr(0, iStart - 5) + value + str.substr(iEnd + 1);
   }
   
   return str;
}

// because JavaScript scoping would give us a reference to "id" here we have to
// wrap this in another function to break this scoping
function _CreateStringFunc(id)
{
   return function()
   {
      let url = null;
      if (typeof (Form_ThisUri) !== 'undefined')
         url = Form_ThisUri;
      DisplayItemForm("TranslationEdit", "StringID", id, 'URL', url);
   };
};

function _ReplaceStringIDs(node)
{
   if (node.data.indexOf('[') !== -1)
   {
      let nextSibling = node.nextSibling; // store this so we add items in order (instead of reverse order)
      let ids = node.data.match(/ \[\d+\]/g);
      node.data = node.data.replace(/ \[\d+\]/g, "");
      if (ids != null)
      {
         for (let i = 0; i < ids.length; i++)
         {
            let id = ids[i].substr(2, ids[i].length - 3);
            let btn = document.createElement("BUTTON");
            Class_AddByElement(btn, "Strings_Translate");
//            let t = document.createTextNode(' ');
//            btn.appendChild(t);
            btn.onclick = _CreateStringFunc(id);
            node.parentNode.insertBefore(btn, nextSibling);
         }
      }
   }
}

function ReplaceStrings(node)
{
   if (node.nodeType == 1)	// element node
   {
      if (node.nodeName != "SCRIPT")
      {
         for (let i = 0; i < node.childNodes.length; i++)
         {
            ReplaceStrings(node.childNodes[i]);
         }
      }
      
      let attr = node.getAttributeNode("placeholder");   // for input fields with a placeholder
      if (attr)
      {
         attr.value = _ReplaceStrings(attr.value);
      }
      attr = node.getAttributeNode("format");            // for DateAndTimePre fields
      if (attr)
      {
         attr.value = _ReplaceStrings(attr.value);
      }
   }
   else if (node.nodeType == 3)	// text node
   {
      node.data = _ReplaceStrings(node.data);
   }
}

function ReplaceStringIDs(node)
{
   if (node.nodeType == 1)	// element node
   {
      if (node.nodeName != "SCRIPT" && node.nodeName != "BUTTON" && node.nodeName != "SELECT" && node.nodeName != "A")
      {
         for (let i = 0; i < node.childNodes.length; i++)
         {
            ReplaceStringIDs(node.childNodes[i]);
         }
      }
   }
   else if (node.nodeType == 3)	// text node
   {
      _ReplaceStringIDs(node);
   }
}

function CheckForStringIDs(rootNodes)
{
   if (Strings_ShowIDs == null)
      Strings_ShowIDs = GetCookie('ShowStringIDs') ? true : false;
   if (Strings_ShowIDs)
   {
      if (Strings_OutstandingRequests == 0)
      {
         forEach(rootNodes, function(root)
         {
            ReplaceStringIDs(root);
         });
      }
   }
}

DocumentLoad.AddCallback(function(rootNodes)
{
   setTimeout(function()
   {
      try
      {
         CheckForStringIDs(rootNodes);
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   }, 2000);
});
