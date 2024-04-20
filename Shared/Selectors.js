// A super selector can consist of any combination of selectors, and commands enclosed in curly braces that
// are applied individually to each of the matches found thus far. The following example looks for nodes by
// class, then goes to the parent of EACH match and searches from there for nodes by a second class, then
// for all of the matching elements returns the second segment of the href attribute:
//    "DIV.child1_class {parentElement} DIV.child2_class {nextElementSibling.href.split('/')[1]}"
// See our "Chrome Extension Design.odt" document for more information.

let sleepRequested = null;
let inlineVariables = {};

function _handleSuperSelector(root, superSelector)
{
   assert(root == document || root instanceof HTMLElement || typeof root == 'string');
   
   sleepRequested = null;
   inlineVariables = {};
   
   superSelector = ApplySelectorVariables(superSelector);
   
   // split the super selector into selectors, commands, and delimiters - we are separating on top level
   // groups of "{ xxx }" or "xxx,xxx" and skipping those characters inside "()" or "[]" parameters (and strings)
   let parts = Utilities_StringToArraySkipGroups(superSelector, "{},", {'(': ')', '[': ']'}, true);
   
   // each group has its current result which we then accumulate into the final result
   // when we start a new group
   let currentResult = [root];
   let finalResult = [];
   let requiresSorting = false;
   
   for (let i = 0; i < parts.length; i++)
   {
      parts[i] = parts[i].trim();
      
      if (parts[i] == '')
         continue;
      
      if (parts[i] == ',')
      {
         if (finalResult.length > 0 && currentResult.length > 0)
            requiresSorting = true; // we have results from multiple selectors so we'll need to sort to get them in the order they appear in the document
         
         // save what we have and start at the top with a new group
         finalResult = finalResult.concat(currentResult);
         currentResult = [root];
         continue;
      }
      
      if (parts[i].startsWith(':root'))
      { // this doesn't seem to work from inside the selector so we handle it specifically
         parts[i] = parts[i].substr(5);
         currentResult = [document.body];
      }
      if (parts[i].startsWith(':top'))
      {
         parts[i] = parts[i].substr(4);
         currentResult = [root];
      }
      
      if (currentResult.length == 0)
         continue;   // there are no results, so this group is done but there may be another group
      
      let objs = currentResult;
      currentResult = [];
      
      if (parts[i] == '{')
      {
         if (parts[i + 2] != '}') throw new Error('Super selector is missing closing bracket: ' + superSelector);
         
         let commands = parts[i + 1].trim();
         
         // each commands section (enclosed in "{" and "}") applies the commands to each individual result
         // collected thus far, unless the first command is "merge" in which case it needs all the results
         if (commands.startsWith('merge'))
         {
            currentResult = currentResult.concat(_handleCommands(root, objs, commands));
         }
         else
         {
            for (let obj of objs)
            {
               currentResult = currentResult.concat(_handleCommands(root, obj, commands));
            }
         }
         
         Utilities_ArrayRemoveDuplicates(currentResult);
         
         i += 2;         // we have parsed the three parts of the commands section: { X }
      }
      else
      {
         let selector = parts[i].trim();
         
         if (selector.startsWith('>'))
            selector = ':scope ' + selector;
         
         // each selector section applies the selector to each individual result collected thus far
         for (let obj of objs)
         {
            currentResult = currentResult.concat(_handleSelector(obj, selector));
         }
      }
   }
   
   if (finalResult.length > 0 && currentResult.length > 0)
      requiresSorting = true; // we have results from multiple selectors so we'll need to sort to get them in the order they appear in the document
   
   // save the result of the last group, and remove duplicates
   finalResult = finalResult.concat(currentResult);
   Utilities_ArrayRemoveDuplicates(finalResult);
   
   if (requiresSorting)
   {
      const allElements = Array.from(document.body.getElementsByTagName('*'));
      finalResult.sort((a, b) => (allElements.indexOf(a) > allElements.indexOf(b)) ? 1 : ((allElements.indexOf(b) > allElements.indexOf(a)) ? -1 : 0));
   }
   
   return finalResult;
}

// called from within super selector
// returns an array of matches
function _handleSelector(node, selector)
{
   for (let key of Object.keys(inlineVariables))
   {
      selector = Utilities_ReplaceInString(selector, '%%' + key + '%%', inlineVariables[key]);
   }
   
   return Array.from(node.querySelectorAll(selector));
}

// called from top level selector
// returns an array of matches
function _handleBasicSelector(node, selector)
{
   if (selector.startsWith(':root'))
   { // this doesn't seem to work from inside the selector so we handle it specifically
      selector = selector.substr(5);
      node = document.body;
   }
   selector = ApplySelectorVariables(selector);
   return Array.from(node.querySelectorAll(selector));
}

// DRL FIXIT? We should enhance this to support a super selector.
function _handleParentBySelector(node, selector)
{
   node = Utilities_GetParentBySelector(node, selector);
   return node ? node : undefined;
}

// DRL FIXIT? We should enhance this to support a super selector.
function _handleHasMatch(node, selector, negate)
{
   let test = Utilities_HasOffspringWithSelector(obj, params[0]);
   return (negate ? !test : test) ? node : undefined;
}

// DRL FIXIT? We should enhance this to support a super selector.
function _handleHasParentMatch(node, selector, negate)
{
   let test = Utilities_GetParentBySelector(node, selector) != null;
   return (negate ? !test : test) ? node : undefined;
}

// DRL FIXIT? We should enhance this to support a super selector.
function _handleHasSiblingMatch(node, selector, negate)
{
   let test = Utilities_HasSiblingWithSelector(obj, params[0]);
   return (negate ? !test : test) ? node : undefined;
}

// accepts string (to be converted to regexp) or regexp object
function _handleAttributeMatch(node, attribute, regexp, flags, negate)
{
   if (typeof regexp === 'string' || regexp instanceof String)
      regexp = new RegExp(regexp, flags);
   // convert "aria-label" to "ariaLabel"
   attribute = attribute.replace(/-([a-z])/g, function(match)
   {
      return match[1].toUpperCase();
   });
   let test = regexp.test(node[attribute]);
   return (negate ? !test : test) ? node : undefined;
}

// accepts string (to be converted to regexp) or regexp object
function _handleUrlMatch(node, regexp, negate)
{
   if (typeof regexp === 'string' || regexp instanceof String)
      regexp = new RegExp(regexp, 'i');
   let test = regexp.test(window.location.href);
   return (negate ? !test : test) ? node : undefined;
}

function _parseParameters(str)
{
   // split the parameters - we are separating on commas and skipping commas inside nested parameters (and strings)
   let params = Utilities_StringToArraySkipGroups(str, ",", {'(': ')', '[': ']'}, false);
   for (let i = 0; i < params.length; i++)
      params[i] = _parseParameter(params[i]);
   return params;
}

// this checks for strings and regex as those need special handling, as well as handling spaces around parameters
function _parseParameter(param)
{
   param = param.trim();   // we should always ignore any surrounding spaces
   
   if (param.startsWith('"') || param.startsWith("'"))
   {
      // this is a string format so we have to un-escape the string
      for (let i = 1; i < param.length - 2; i++)
      {
         if (param[i] == '\\')
         {
            // remove the backslash and skip over the escaped character
            param = param.substr(0, i) + param.substr(i + 1);
         }
      }
      
      param = param.substr(1, param.length - 2);
   }
   else if (param.startsWith('/'))
   {
      // sometimes we need the slash escaped: new RegExp(/\//)
      // and sometimes we don't: new RegExp("/")
      // and since we're converting from the former to the latter we need to unescape it
      param = Utilities_ReplaceInString(param, "\\/", "/");
      
      let iFlags = param.lastIndexOf('/'); // get index of last slash (any flags come after)
      let regexp = param.substr(1, iFlags - 1); // remove start and end slashes
      param = new RegExp(regexp, param.substr(iFlags + 1));
   }
   else if (Utilities_IsAlphabetic(param.substr(0, 1)))
   {
      // a variable name
      
      let parts = param.split('.');
      let value = window;
      for (let i = 0; i < parts.length; i++)
      {
         if (!(parts[i] in value))
            throw new Error('Selector parameter ' + param + ' is undefined at ' + parts[i]);
         
         value = value[parts[i]];
      }
      
      // if this is our localized array we need to find the appropriate language
      if (parts[0] == 'localizedKeywords' && typeof value !== 'string' && !(value instanceof String))
         param = localizedKeywordItem(value, 'selector parameter ' + param);
      else
         param = value;
   }
   else
   {
      // this should be a number
   }
   
   return param;
}

// the objs passed in could be one item or an array, but whatever it is we apply the commands string to it
// returns an array of results
function _handleCommands(root, objs, commands)
{
   // split the commands - we are separating on periods and open square brackets, skipping those inside
   // parameters, square brackets, and strings
   commands = Utilities_StringToArraySkipGroups(commands, ".[", {'(': ')', '[': ']'}, true);
   
   // the above splits "[" on its own so we'll put it back where it belongs and while we're at it we'll trim
   // the items and remove empty items and dots as those are skipped anyway and this will simplify our code
   for (let i = 0; i < commands.length; i++)
   {
      if (commands[i] == '[')
      {
         commands[i + 1] = '[' + commands[i + 1];
         commands = commands.slice(0, i).concat(commands.slice(i + 1));
      }
      else
      {
         commands[i] = commands[i].trim();
         if (commands[i] == '' || commands[i] == '.')
         {
            commands = commands.slice(0, i).concat(commands.slice(i + 1));
            i--;
         }
      }
   }
   
   return _handleCommandsArray(root, objs, commands);
}

// the objs passed in could be one item or an array, but whatever it is we apply the commands array to it
// returns an array of results
function _handleCommandsArray(root, objs, commands)
{
   let result = objs;
   
   for (let i = 0; i < commands.length; i++)
   {
      let command = commands[i];
      
      for (let key of Object.keys(inlineVariables))
      {
         command = Utilities_ReplaceInString(command, '%%' + key + '%%', inlineVariables[key]);
      }
      
      // params is null if there were no () specified, otherwise it's an array
      let params = null;
      let j = command.indexOf('(');   // DRL FIXIT? We don't handle a "(" inside "[]".
      if (j != -1)
      {
         params = _parseParameters(command.substr(j + 1, command.length - j - 2));
         command = command.substr(0, j);
      }
      
      objs = result;
      result = [];
      
      if (command == 'fork')
      {            // apply the rest of the commands to the individual results
         if (params != null && params.length > 0) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         commands = commands.slice(i + 1); // skip "fork"
         for (let obj of objs)
         {
            result = result.concat(_handleCommandsArray(obj, commands));
         }
         break;                          // we've parsed all of the commands
      }
      
      if (command == 'merge')
      {
         if (i != 0) throw new Error('Super selector command "' + command + '" must be the first item in the {} section');
         if (params && params.length == 1)
            result = [objs.join(params[0])];    // combine all the results thus far - and they must be strings
         else if (params == null)
            result = objs;
         else
            assert(0);
      }
      else
      {
         result = _handleCommand(root, objs, command, params);
         
         // an HTMLCollection messes with our code so convert to array
         if (result instanceof HTMLCollection)
            result = Array.from(result);
      }
      
      if (result == undefined || result == null ||
         (Array.isArray(result) && result.filter(x =>
         {
            return x !== null && x !== undefined;
         }).length == 0))
      {
         result = [];
         break;  // there are no results, so we're done
      }
      
      // we don't remove null items from the result here because the next command may be [x] to get one of the items
   }
   
   // what we return here will be used as the result of the selector to this point so we don't want to
   // return nulls in this result and some commands may return an array containing nulls (such as a match()
   // with multiple groups separated by |)
   if (Array.isArray(result))
      result = result.filter(x =>
      {
         return x !== null && x !== undefined;
      });
   
   return result;
}

// the obj passed in could be one item or an array, but whatever it is we apply the command to it
// a command could return undefined (I think), null, a single result, or an array of results
// params is null if there were no () specified, otherwise it's an array
// NOTE: can return a variety of types such as HTMLCollection for example which the caller must handle
function _handleCommand(root, obj, command, params)
{
   try
   {
      if (command.startsWith('['))
      {
         let index = command.substr(1, command.length - 2);
         if (index.startsWith('-'))
            index = obj.length-index.substring(1); // support array indexing from the end
         return obj[index];
      }
      else if (command.startsWith('"') || command.startsWith('"'))
         return _parseParameters(command)[0];    // this will parse the string but maybe there's a better way?
      else if (params === null)
      { // no brackets is an object property or one of our special commands
         if (command == 'root')
         {
            return [document.body];
         }
         else if (command == 'top')
         {
            return [root];
         }
         else
            return obj[command];
      }
      else if (command == 'saveAs')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         inlineVariables[params[0]] = obj;
         return obj;
      }
      else if (command == 'getText')
      {
         if (params.length != 0) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return DOMToText(obj).trim();
      }
      else if (command == 'getUrlParameter')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return Url_GetParam(obj, params[0]);
      }
      else if (command == 'decodeUriComponent')
      {
         if (params.length != 0) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return Url_DecodeURIComponent(obj);
      }
      else if (command == 'parentBySelector')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return _handleParentBySelector(obj, params[0]);
      }
      else if (command == 'selfOrChildrenBySelector')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return Utilities_GetThisOrChildrenBySelector(obj, params[0]);
      }
      else if (command == 'has' || command == '!has')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return _handleHasMatch(obj, params[0], command.substr(0, 1) == '!');
      }
      else if (command == 'hasParent' || command == '!hasParent')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return _handleHasParentMatch(obj, params[0], command.substr(0, 1) == '!');
      }
      else if (command == 'hasSibling' || command == '!hasSibling')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return _handleHasSiblingMatch(obj, params[0], command.substr(0, 1) == '!');
      }
      else if (command == 'propMatch' || command == '!propMatch')
      {
         if (params.length != 2 && params.length != 3) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         params.push('');    // in case the third parameter was not provided
         return _handleAttributeMatch(obj, params[0], params[1], params[2], command.substr(0, 1) == '!');
      }
      else if (command == 'urlMatch' || command == '!urlMatch')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         return _handleUrlMatch(obj, params[0], command.substr(0, 1) == '!');
      }
      else if (command == 'click')
      {
         if (params.length != 0) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         obj.click();
         return obj;
      }
      else if (command == 'simulateClick')
      {
         if (params.length != 0) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         pressNonButton(obj);
         return obj;
      }
// This was added to try and solve issue 252 Get Facebook post permalink from the post date
//        else if (command == 'simulateMouseClick') { // simulate mouse click
//            if (params.length != 0) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
//            simulateMouseClick(obj);
//            return obj;
//        }
      else if (command == 'sleep')
      {
         if (params.length != 1) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         sleepRequested = params[0];
         return obj;
      }
      else if (command == 'pressKey')
      {
         if (params.length != 2) throw new Error('Super selector command "' + command + '" has wrong number of parameters');
         simulateKeyDown(params[0], params[1]);
         return obj;
      }
      else
         return obj[command].apply(obj, params);
   }
   catch (e)
   {
      Log_WriteException(e, 'Error executing command "' + command + '"');
      Log_WriteInfo('Object: ' + GetVariableAsString(obj));
      Log_WriteInfo('Command: ' + command);
      Log_WriteInfo('Parameters: ' + GetVariableAsString(params));
      if (Array.isArray(obj))
         Log_WriteInfo('It looks like your object is an array. Maybe you need to add [0] or fork() before this command?');
      return undefined;
   }
}

// selectorVariables can be referenced in the Constants.js file in order to match on context specific values
var selectorVariables = {};

function addSelectorVariable(name, value)
{
   selectorVariables[name] = value;
}

function clearSelectorVariables()
{
   selectorVariables = {};
}

function setSelectorVariables(placeholders)
{
   selectorVariables = placeholders;
}

function ApplySelectorVariables(str)
{
   for (let key of Object.keys(selectorVariables))
   {
      str = Utilities_ReplaceInString(str, '%%' + key + '%%', selectorVariables[key]);
      str = Utilities_ReplaceInString(str, '##' + key + '##', Utilities_RegexpEscape(selectorVariables[key]));
   }
   return str;
}

// NOTE: Selector can be an array to wait for multiple options and can be of our "super selector" format.
// if exceptionName is provided an Error will be thrown if the element is not found
async function waitForElement(selector, timeoutSeconds = null, root = null, exceptionName = null)
{
   if (!Array.isArray(selector))
      selector = [selector];
   if (root == null)
      root = document.body;
   if (timeoutSeconds == null)
      timeoutSeconds = 20;
   assert(timeoutSeconds <= 600);  // check that caller isn't passing milliseconds
   let startTimeInMs = Date.now();
   while (true)
   {
      for (let i = 0; i < selector.length; i++)
      {
         let elems = _handleSuperSelector(root, selector[i]);
         if (elems.length > 0)
         {
            if (sleepRequested)
               await sleep(sleepRequested);
            return elems[0];
         }
      }
//console.log(DateAndTime_Now().ToFormat('%/D %:T') + ' waiting for ' + (timeoutSeconds * 1000) + ' elapsed time: ' + (Date.now() - startTimeInMs));
      await sleep(0.3);
//console.log(DateAndTime_Now().ToFormat('%/D %:T') + ' done sleeping, elapsed time: ' + (Date.now() - startTimeInMs));
      if (timeoutSeconds && Date.now() - startTimeInMs > timeoutSeconds * 1000)
      {
         if (exceptionName != null)
         {
            throw new Error(exceptionName + " not found");
         }
         else
         {
            return null;
         }
      }
   }
}

// items are returned in the order they appear on the page
// NOTE: If the selectors is an array this will only return the results from the first selector
// with matches!
// if exceptionName is provided an Error will be thrown if the element is not found
async function waitForElements(selectors, timeoutSeconds = null, root = null, exceptionName = null)
{
   if (!Array.isArray(selectors))
      selectors = [selectors];
   if (root == null)
      root = document.body;
   if (timeoutSeconds == null)
      timeoutSeconds = 20;
   assert(timeoutSeconds <= 600);  // check that caller isn't passing milliseconds
   let startTimeInMs = Date.now();
   while (true)
   {
      for (let i = 0; i < selectors.length; i++)
      {
         let elems = _handleSuperSelector(root, selectors[i]);
         if (elems != null && elems.length > 0)
         {
            if (sleepRequested)
               await sleep(sleepRequested);
            return elems;
         }
      }
      if (timeoutSeconds && Date.now() - startTimeInMs > timeoutSeconds * 1000)
      {
         if (exceptionName != null)
         {
            throw new Error(exceptionName + " not found");
         }
         else
         {
            return [];
         }
      }
      await sleep(0.3);
   }
}

// selectorSuffix might be something like ":not(.SA_augmented)" to add to each selector
// items are returned in the order they appear on the page
// NOTE: If the selectors is an array this will only return the results from the first selector
// with matches!
function findElements(selectors, selectorSuffix, root)
{
   if (!Array.isArray(selectors))
      selectors = [selectors];
   else
      selectors = selectors.slice();   // create a copy so we don't change the original!
   if (selectorSuffix == null)
      selectorSuffix = '';
   if (root == null)
      root = document.body;
   if (selectors.length == 1 && (selectors[0] == null || selectors[0] == ''))  // no selector returns original element
      return [root];
   
   if (selectors.join('').indexOf('{') == -1)
   { // use the faster version if we're not using super selectors
      // we test for each selector in the array return the first thing != [] we find
      for (let selector of selectors)
      {
         assert(selectorSuffix == '' || selector.indexOf(',') == -1);  // would need special handling, like below
         let elems = _handleBasicSelector(root, selector + selectorSuffix);
         // elems results for
         // let elems = findElements(srchPathPG('profileNameMsngr'), ':not(.SA_augmented):not(.SA_ButtonIcon)');
         // [0-3] => elems = []
         // => selectors are bad
         if (elems == null)
         {
            assert(0);  // I think this never happens
         }
         else if (elems.length > 0)
         {
            return elems;
         }
      }
   }
   else
   {
      for (let selector of selectors)
      {
         let elems = _handleSuperSelector(root, selector);
         // special handling to remove items that don't match the suffix
         if (elems.length > 0)
         {
            if (selectorSuffix)
            {
               for (let i = 0; i < elems.length; i++)
               {
                  if (!elems[i].matches(selectorSuffix))
                  {
                     elems = elems.slice(0, i).concat(elems.slice(i + 1));
                     i--;
                  }
               }
            }
            if (elems.length > 0)
            {
               if (sleepRequested != null) throw new Error('Synchronous super selector command requested sleep')
               return elems;
            }
         }
      }
   }
   
   return [];
}

function findElement(selector, selectorSuffix, root)
{
   let elems = findElements(selector, selectorSuffix, root);
   if (elems.length == 0)
      return null;
   return elems[0];
}

async function waitForElementsGone(selector, timeout = 20, root)
{
   let startedAt = new Date().getTime() / 1000
   let isGone = false;
   do
   {
      if (findElement(selector, null, root) == null)
      {
         isGone = true;
      }
      await sleep(1);
   } while (!isGone && startedAt - (new Date().getTime() / 1000) < timeout);
   return isGone;
}