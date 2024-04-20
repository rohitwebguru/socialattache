// returns an array
// each item value is an array containing the name of the item and any parameters as a nested array
// the name may take the following formats:
//    a string would have a name like: "the \"string\" contents" or 'the "string" contents'
//    a function would have a name like: MyFunction(
//    an "if" would have a name like: if (
//    an array would have a name like: [
//    array dereferencing would have a name like: x[
//    null would have a name like: null
// NOTE: we don't currently support curly braces
const JSParseLevelCommands = 0;
const JSParseLevelParams = 1;
const JSParseLevelPeriod = 2;
const JSParseLevelOperator = 3;
function extractFunctionsAndArguments(str, depth = 0, parseLevel = JSParseLevelCommands)
{
   let currentItem = "";
   let isInString = false;
   let isInOperator = false;
   let stringDelimiter = '';
   let results = [];
   
   for (let i = 0; i < str.length; i++)
   {
      let char = str[i];
      
      if (stringDelimiter == char)
      {
         assert(isInString);
         
         currentItem += char;
         stringDelimiter = '';
         isInString = false;
         
         results.push([currentItem.trim(), []]);
         
         currentItem = '';
      }
      else if (isInString)
      {
         if (char === '\\')   // escape character, skip and store the escaped character
         {
            assert(isInString);
            assert(i < str.length - 1);
            i++;
            char = str[i];
         }
         currentItem += char;
      }
      else if ("+-=!<>|&.".indexOf(char) != -1) // operators and .
      {
         if (isInOperator)
         {
            currentItem += char;
         }
         else
         {
            currentItem = currentItem.trim();
            if (currentItem != '')
               results.push([currentItem, []]);
   
            currentItem = char;
            isInOperator = true;
         }
      }
      else if (isInOperator)
      {
         isInOperator = false;
   
         // process the second part of a binary operator and
         // include the current character in the processing call
         let params = extractFunctionsAndArguments(str.substring(i), depth + 1,
            currentItem == '.' ? JSParseLevelPeriod : JSParseLevelOperator);
   
         // the last item returned was anything left unparsed, as a single item
         str = params.pop();
         assert(!is_array(str));
         assert(params.length == 1);
         i = -1;  // will be 0 when we get to the top of the loop
         params.unshift(results.pop());
   
         results.push([currentItem.trim(), params]);
   
         currentItem = '';
      }
      else if (char === '\'' || char === '"')
      {
         assert(!isInString);
   
         currentItem += char;
         stringDelimiter = char;
         isInString = true;
      }
      else if ((char == '(' || char == '[') && currentItem.trim() != '')
      {
         // include the open bracket so we know it's a function or an "if" or an array dereference
         currentItem += char;
   
         let params = extractFunctionsAndArguments(str.substring(i + 1), depth + 1,
            JSParseLevelParams);
   
         // the last item returned was anything left unparsed, as a single item
         str = params[params.length - 1];
         assert(!is_array(str));
         i = 0;  // will be 1 when we get to the top of the loop, skipping the ")", "]" or ";" (see below)
         params.splice(params.length - 1, 1);
   
         results.push([currentItem.trim(), params]);
   
         currentItem = '';
      }
      else if ((char === ',' && parseLevel <= JSParseLevelParams) ||
         (char == ';' && parseLevel <= JSParseLevelCommands))
      {
         currentItem = currentItem.trim();
         if (currentItem != '')
            results.push([currentItem, []]);
         
         currentItem = '';
      }
      else if (char === ',' || char == ';' ||
         char == '(' || char == '[' || char == ')' || char == ']')
      {
         assert(depth > 0);
   
         currentItem = currentItem.trim();
         if (currentItem != '')
            results.push([currentItem, []]);
   
         // the last item returned is anything left unparsed, as a single item, and we
         // return the current character in the result to be parsed by the caller
         results.push(str.substring(i).trim());
   
         return results;
      }
      else
      {
         currentItem += char;
      }
   }
   
   if (depth > 0)
   {
      // the last item returned is anything left unparsed, as a single item
      results.push('');
   }
   
   return results;
}

// takes the output from extractFunctionsAndArguments() and executes it
function execFunctionsAndArguments(items, obj=undefined, assignValue=undefined)
{
   if (obj == undefined)
      obj = window;
   
   let result = null;
   
   for (let i = 0; i < items.length; i++)
   {
      let name = items[i][0];
      let params = items[i][1];
      
      try
      {
         if (name.startsWith('"') || name.startsWith("'"))
         {
            // string value
            result = name.slice(1, -1);
            
            // DRL FIXIT! This is really not accurate...
            result = Utilities_ReplaceInString(result, "\\\\", "\\");
            result = Utilities_ReplaceInString(result, "\\\\", "\\");
            result = Utilities_ReplaceInString(result, "\\'", "'");
            result = Utilities_ReplaceInString(result, '\\"', '"');
            result = Utilities_ReplaceInString(result, "''", "'");
         }
         else if (Utilities_IsNumeric(name))
         {
            result = Number(name);
         }
         else if (name === 'true')
         {
            result = true;
         }
         else if (name === 'false')
         {
            result = false;
         }
         else if (name === 'null')
         {
            result = null;
         }
         else if (name === 'undefined')
         {
            result = undefined;
         }
         else
         {
            // try to figure out what we have now, is it a function, a property, etc.
            if (name.endsWith('('))
            {
               // function call or "if"
               
               if (name === 'if(' || name.startsWith('if '))
               {
                  assert(params.length === 1);
                  let param = execFunctionsAndArguments([params[0]], obj);
                  if (!param)
                     i++;  // skip the next command since the "if" failed
               }
               else if (name.substring(0, name.length - 1) in obj)
               {
                  for (let j = 0; j < params.length; j++)
                  {
                     // process each parameter which could in turn also be a function call etc. and get the
                     // result to store as parameters to pass into a function call
                     params[j] = execFunctionsAndArguments([params[j]]);
                  }
   
                  result = obj[name.substring(0, name.length - 1)](...params);
               }
               else
               {
                  Log_WriteError('Unrecognized exec code "' + name + '" in: ' + name);
                  return undefined;
               }
            }
            else if (name.endsWith('['))
            {
               // array
               
               if (name === '[')
               {
                  result = params;
               }
               else
               {
                  // array dereferencing
                  assert(params.length === 1);
                  name = name.substr(0, name.length - 1);

                  // this seems to be a special case where if we're looking for the window.arguments and there
                  // are none it should not throw an error, not sure why it doesn't in the "real" case but we
                  // use "arguments[0] || window.event" and it should just behave as "false || window.event"
                  if (name == 'arguments' && obj[name] === undefined)
                     return undefined;

                  let param = execFunctionsAndArguments([params[0]], obj);
                  return obj[name][param];
               }
            }
            else if (name == '.')
            {
               assert(params.length == 2);
               let param0 = execFunctionsAndArguments([params[0]], obj)
               result = execFunctionsAndArguments([params[1]], param0);
            }
            else if ("+-=!<>|&".indexOf(name[0]) !== -1)
            {
               assert(params.length == 2);
               
               let subItems = items.slice(i+1);
               if (name === '=')
               {
                  let param1 = execFunctionsAndArguments([params[1]])
                  result = execFunctionsAndArguments([params[0]], obj, param1);
               }
               else
               {
                  let param0 = execFunctionsAndArguments([params[0]])
                  let param1 = execFunctionsAndArguments([params[1]])
   
                  if (name === '||')
                     result = param0 || param1;
                  else if (name === '&&')
                     result = param0 && param1;
                  else if (name === '==')
                     result = param0 == param1;
                  else if (name === '===')
                     result = param0 === param1;
                  else if (name === '!=')
                     result = param0 != param1;
                  else if (name === '!==')
                     result = param0 !== param1;
                  else if (name === '>')
                     result = param0 > param1;
                  else if (name === '<')
                     result = param0 < param1;
                  else if (name === '>=')
                     result = param0 >= param1;
                  else if (name === '<=')
                     result = param0 <= param1;
                  else
                  {
                     Log_WriteError('Unrecognized exec operator "' + name + '"');
                     result = undefined;
                  }
               }
            }
            else if (name in obj)
            {
               if (assignValue !== undefined)
                  result = (obj[name] = assignValue);
               else
                  result = obj[name];
            }
            else
            {
               result = name; // native type, could be int, string, property name, etc.?
            }
         }
      }
      catch (e)
      {
         Log_WriteException(e, 'Error executing: ' + name);
         result = undefined;
      }
   }
   
   return result;
}