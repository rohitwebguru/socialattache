// ========================================================================
//        Copyright � 2008 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================


// DRL FIXIT? This fixed a problem with JSON.stringify() adding slashes to escape the resulting data.
// It doesn't seem to work here so it needs to be copied into your script code somehwere.
//if (window.Prototype)
//{
//    delete Array.prototype.toJSON;
//}

function convArrToObj(array)
{
   var thisEleObj = new Object();
   if (typeof array == "object")
   {
      for (var i in array)
      {
         var thisEle = convArrToObj(array[i]);
         thisEleObj[i] = thisEle;
      }
   }
   else
   {
      thisEleObj = array;
   }
   return thisEleObj;
}

function Json_ToString(values, replacer, space)
{
// DRL FIXIT? Maybe this would be a better fix than the global one we have in Constants.php?
//   let original_toJSON = Array.prototype.toJSON;
//   delete Array.prototype.toJSON;
   
   let result = JSON.stringify(values, replacer, space);
   if (result == '[]')
      result = JSON.stringify(convArrToObj(values), replacer, space);

//   if (original_toJSON != undefined)
//      Array.prototype.toJSON = original_toJSON;
   
   return result;
}

function Json_FromString(str)
{
   if (str == null || str.length == 0)
      return null;
   assert(Object.prototype.toString.call(str) !== '[object Object]');  // check if already decoded
   
   // DRL FIXIT! I don't know why I'm seeing this now, but I am getting three NUL characters at the beginning
   // of the response when I'm calling the server with GetResources. The server isn't sending them!
   var skip = 0;
   while (skip < str.length && str.charCodeAt(skip) === 0)
      skip++;
   if (skip > 0)
      str = str.substr(skip);

//let i = 0;
//let lines = str.split("\n");
//for (let line of lines)
//{
//   console.log('', i, line);
//   i += line.length + 1;
//}
   
   let result = null;
   try
   {
      result = JSON.parse(str, function(key, value)
      {
         if (value && typeof value === 'object')
         {
            let type = value.type;
            if (typeof type === 'string' && typeof window[type] === 'function')
            {
               return new (window[type])(value);
            }
         }
         return value;
      });
   }
   catch (e)
   {
      // if we have a position where the error occurs lets include the string at that point
      let i = e.message.indexOf('at position');
      if (i != -1)
      {
         i = e.message.substr(i + 12).split(' ')[0];
         let temp = str;
         if (i > 50)
         {
            temp = "... " + str.substr(i - 50);
            i = i - (i - 50) + 4;
         }
         temp = Utilities_ShortenWithEllipsis(temp.substr(0, i) + " ==> " + temp.substr(i), 100);
         e.message += "\r\n\r\n" + temp;
      }
      Log_WriteError(e.message);
      result = null;
   }
   return result;
}

// this method takes out comments, converts single quoted strings to double quoted,
// turns hash keys into strings, and removes trailing commas, also turns JavaScript like:
//   test1 = { myTest: 'value', };  // this is a test
//   test2 = { myTest: 'value' };   /* this too is a test
//                                     and a darn good one at that! */
// into:
//   {
//      "test1" : { "myTest": "value" },
//      "test1" : { "myTest": "value" }
//   }
function Json_ConvertJavaScriptToJson(str)
{
   // a newline inside a string (which would be a line terminated with a backslash) must be broken up for JSON
   str = Utilities_ReplaceInString(str, '\\\n', '');
   
   let i = 0;
   let ch = null;
   let lastCh = null;
   let inKey = true; // true: in key, false: in value, null: not in key nor in value
   let startKey = 0;
   let nesting = ''; // stack of pushed nesting types either { or [
   let startQuoted = null;
   let startComment = null;
   let lastComma = null;
   let wasWrapped = false;
   while (i < str.length)
   {
      ch = str[i];
      if (startComment != null)
      {
         // in a comment
         
         if (ch == '*' && str[startComment + 1] == '*' && str[i + 1] == '/')
         {
            str = str.replaceAt(startComment, '', i - startComment + 2);
            i = startComment;
            startComment = null;
         }
         else if (ch == '\n' && str[startComment + 1] == '/')
         {
            str = str.replaceAt(startComment, '', i - startComment);
            i = startComment;
            startComment = null;
         }
      }
      else if (startQuoted != null)
      {
         // in a string
         
         if (ch == str[startQuoted])
         {
            if (ch == "'")
            {
               // convert from single quoted to double quoted
               str = str.replaceAt(startQuoted, '"');
               str = str.replaceAt(i, '"');
            }
            startQuoted = null;  // no longer in a string
         }
         else if (ch == '\\')
         {
            if (str[i + 1] == "'")
            {
               // single quote does not need to be escaped inside a double quoted string so remove the slash
               str = str.substring(0, i) + str.substring(i + 1);
            }
            else
            {
               // this handles the case of a series of backslashes, so that an even numbered series
               // doesn't end up escaping the next character
               i++;
            }
            ch = null;
         }
         else if (ch == '"')
         {
            // escape the double quotes as they'll conflict when we switch the string to double quoted
            str = str.substring(0, i) + '\\' + str.substring(i);
            i++;
         }
      }
      else
      {
         if (ch == '=')
         {
            str = str.replaceAt(i, ':');
            ch = ':';   // fall through to handling below
            
            if (!wasWrapped)
            {
               wasWrapped = true;
               str = '{' + str + '}';
               assert(startKey !== null);
               startKey++;
               i++;
            }
         }
         else if (ch == ';')
         {
            str = str.replaceAt(i, ',');
            ch = ',';   // fall through to handling below
         }
         
         if (ch == '{' || ch == '[')
         {
            nesting += ch;
            inKey = ch == '{' ? true : null;
            startKey = null;
         }
         else if (ch == '}' || ch == ']')
         {
            if (lastComma)
            {
               // we saw a comma after the last key/value pair so we must remove it
               str = str.replaceAt(lastComma, '', 1);
               i--;
            }
            nesting = nesting.substr(0, nesting.length - 1);
            inKey = nesting.length == 0 || nesting[nesting.length - 1] == '{' ? true : null;
            startKey = null;
         }
         else if (ch == ',')
         {
            lastComma = i;
            inKey = nesting.length == 0 || nesting[nesting.length - 1] == '{' ? true : null;
            startKey = null;
         }
         else if (ch == ':')
         {
            if (inKey === true)
            {
               assert(startKey !== null);
               
               // keys must be enclosed in double quotes
               let key = str.substr(startKey, i - startKey).trim();
               if (key[0] != '"')
               {
                  assert(key[0] != "'");  // single quoted key should have been handled by quoted string code
                  
                  str = str.replaceAt(startKey, '"' + key + '"', i - startKey);
                  i = startKey + key.length + 2;
               }
               
               inKey = false;
               startKey = null;
            }
         }
         else if (ch == '/' && (str[i + 1] == '/' || str[i + 1] == '*'))
         {
            assert(startComment == null);
            startComment = i;
         }
         else if (ch == "'" || ch == '"' || ch == '/')
         {
            startQuoted = i;
            if (inKey)
            {
               assert(startKey === null);
               startKey = i;
            }
            lastComma = null;
         }
         
         if (startComment || startQuoted || ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n')
         {
            // comment, string, or whitespace
         }
         else if (ch != ',')
         {
            lastComma = null;
            
            if (inKey && startKey === null && ch != '{' && ch != '}' && ch != ']')
               startKey = i;
         }
      }
      
      lastCh = ch;
      i++;
   }
   
   assert(startQuoted === null);
   assert(startComment === null);
   assert(startKey === null);
   assert(lastComma === null);
   
   return str;
}
