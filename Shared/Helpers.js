var pageLanguage = null;

function getPageLanguage()
{
   if (pageLanguage == null)
   {
      if (!Browser.IsExtensionBackground())
         pageLanguage = document.documentElement.lang;
      if (pageLanguage == null || pageLanguage == undefined || pageLanguage == '')
      {
         pageLanguage = navigator.language || navigator.userLanguage;
         if (pageLanguage == null || pageLanguage == undefined || pageLanguage == '')
         {
            Log_WriteError('Page language and browser language not specified for ' + location.href);
            pageLanguage = 'en-US';
         }
         else
            Log_WriteWarning('Page language not specified for ' + location.href + ' using browser language ' + pageLanguage);
      }
   }
   return pageLanguage;
}

function getBaseLanguage(language)
{
   return language.split('-')[0];
}

function getLanguage()
{
   return getBaseLanguage(getPageLanguage());
}

function srchPath(scraper, item)
{
   if (!elementPaths.hasOwnProperty(scraper) || !elementPaths[scraper].hasOwnProperty(item))
      throw new Error('Missing from Constants.js: elementPaths.' + scraper + '.' + item);
   return elementPaths[scraper][item];
}

function localizedKeywordItem(item, label)
{
   let pageLanguage = getPageLanguage();
   let baseLang = getBaseLanguage(pageLanguage);
   
   let lang = null;
   if (item.hasOwnProperty(pageLanguage))
      lang = pageLanguage;
   else if (item.hasOwnProperty(baseLang))
      lang = baseLang;
   else
   {
      lang = Utilities_ArrayFirstKey(item);
      Log_WriteError(label + ' is missing language ' + pageLanguage);
   }
   
   return item[lang];
}

function localizedKeyword(scraper, item)
{
   if (!localizedKeywords.hasOwnProperty(scraper) || !localizedKeywords[scraper].hasOwnProperty(item))
      throw new Error('Missing from Constants.js: localizedKeywords.' + scraper + '.' + item);
   return localizedKeywordItem(localizedKeywords[scraper][item], 'Scraper ' + scraper + ' keyword "' + item + '"');
}

function normalizeUrl(url)
{
   if (url.startsWith('https://l.facebook.com/l.php?u='))
   {
      url = Url_GetParam(url, 'u');             // get the redirect URL
      url = Url_SetParam(url, 'fbclid', null);  // remove this useless thing
   }
   // Format: https://external.fyvr1-1.fna.fbcdn.net/emg1/v/t13/954162180783484735?url=https%3A%2F%2Fwww.ctvnews.ca%2Fcontent%2Fdam%2Fctvnews%2Fen%2Fimages%2F2023%2F1%2F30%2Fhotel-zed-nooner-1-6252338-1675108271563.jpg&fb_obo=1&utld=ctvnews.ca&stp=c0.5000x0.5000f_dst-jpg_flffffff_p1000x522_q75&ccb=13-1&oh=06_AbEAIHH-t1N4Oz4-KmrSnTxvjcHJ5pz8TQnqVpT-mpHT-Q&oe=63DCEBD6&_nc_sid=b1eadf
   if (url.startsWith('https://external.') && url.includes('.fbcdn.net') && url.includes('?url='))
   {
      url = url.split('&fb_obo=')[0];           // remove the junk FB adds after the URL
      url = Url_GetParam(url, 'url');           // get the redirect URL
   }
   return url;
}

// the incoming format could be with a name prefix "Me <me@me.com>" or basic "me@me.com"
// DRL FIXIT? Add support for the name being in double quotes.
function getRawEmail(email)
{
   if (email.indexOf('<') != -1)
      email = Utilities_RemoveSurroundingAngleBrackets(email.split('<')[1].trim());
   return email;
}

function getEmailName(email)
{
   return Utilities_RemoveSurroundingQuotes(email.split('<')[0].trim());
}

function getEmailPrefix(email)
{
   return Url_GetEmailPrefix(getRawEmail(email));
}

function getEmailSuffix(email)
{
   return Url_GetEmailSuffix(getRawEmail(email));
}

// This function should be called whenever we create an address in order to catch issues at the source!
// checks for a valid address like "1234567@fbperid.socialattache.com" or "saltyfoam@fbun.socialattache.com"
// and returns it without changing it (for now?)
function validateAddress(address)
{
   let suffix = address.split('@')[1];
   let type = suffix.split('.')[0];
   let id = address.split('@')[0];
   
   let temp = type.endsWith('un') || type.endsWith('post')
      ? id.replace(/[^a-zA-Z0-9_\.\-]/g, '_')
      : id.replace(/[^0-9]/g, '_');
   
   if (temp != id || suffix.includes('>') || suffix.includes('@') || suffix.includes(':'))
      Log_WriteInfoCallStack('Invalid ' + type + ' address ' + address);
   
   return address;
}

// this compares the domains in URLs and allows for different suffixes due to
// Pinterest using country specific domains and also ignores the "www" prefix
function fuzzyDomainsMatch(url1, url2)
{
   if (url1 == null || url2 == null)
   {
      Log_WriteWarningCallStack('At least one of the urls was null while comparing, first "' + url1 + '" second "' + url2 + '"');
      return false;
   }
   
   let domain1 = Url_GetDomain(url1).toLowerCase();
   let domain2 = Url_GetDomain(url2).toLowerCase();
   
   domain1 = domain1.substr(0, domain1.lastIndexOf('.'));
   domain2 = domain2.substr(0, domain2.lastIndexOf('.'));
   
   if (domain1.startsWith('www.')) domain1 = domain1.substr(4);
   if (domain2.startsWith('www.')) domain2 = domain2.substr(4);
   
   return domain1 == domain2;
}

function fuzzyUrlStartsWith(url1, url2)
{
   if (!fuzzyDomainsMatch(url1, url2))          // ignores minor domain differences
      return false;
   
   // ignores parameters, except for our "View" and "FormProcessor" parameters handled below
   let path1 = Url_GetPath(url1);
   let path2 = Url_GetPath(url2);
   
   // ignores terminating slash
   if (path1.substr(path1.length - 1) == '/') path1 = path1.substr(0, path1.length - 1);
   if (path2.substr(path2.length - 1) == '/') path2 = path2.substr(0, path2.length - 1);
   
   // add our "View" and "FormProcessor" parameters
   if (Url_GetParam(url1, 'View') || Url_GetParam(url2, 'View'))
   {
      path1 += '|' + Url_GetParam(url1, 'View');
      path2 += '|' + Url_GetParam(url2, 'View');
   }
   if (Url_GetParam(url1, 'FormProcessor') || Url_GetParam(url2, 'FormProcessor'))
   {
      path1 += '|' + Url_GetParam(url1, 'FormProcessor');
      path2 += '|' + Url_GetParam(url2, 'FormProcessor');
   }
   
   return path1.startsWith(path2);
}

// you can provide "params" as an array of parameter names that should not be ignored if found
function fuzzyUrlsMatch(url1, url2, params)
{
   if (!fuzzyDomainsMatch(url1, url2))          // ignores minor domain differences
      return false;
   
   // ignores parameters, except for our "View" and "FormProcessor" parameters handled below
   let path1 = Url_GetPath(url1);
   let path2 = Url_GetPath(url2);
   
   // ignores terminating slash
   if (path1.substr(path1.length - 1) == '/') path1 = path1.substr(0, path1.length - 1);
   if (path2.substr(path2.length - 1) == '/') path2 = path2.substr(0, path2.length - 1);
   
   // add our "View" and "FormProcessor" parameters and anything passed in
   path1 += '|' + Url_GetParam(url1, 'View') + '|' + Url_GetParam(url1, 'FormProcessor');
   path2 += '|' + Url_GetParam(url2, 'View') + '|' + Url_GetParam(url2, 'FormProcessor');
   if (params != undefined)
   {
      for (let param of params)
      {
         path1 += '|' + Url_GetParam(url1, param);
         path2 += '|' + Url_GetParam(url2, param);
      }
   }
   
   if (path1 == path2)
      return true;
   
   // this is a special case for Facebook live videos where the URLs could be in either format:
   // https://www.facebook.com/watch/live/?ref=watch_permalink&v=957752992165299
   // https://www.facebook.com/cathyann0722/videos/957752992165299/
   if (url2.startsWith('https://www.facebook.com/watch/live'))
   {
      // swap to simplify code
      let temp = url1;
      url1 = url2;
      url2 = temp;
   }
   if (url1.startsWith('https://www.facebook.com/watch/live'))
   {
      const urlParams = new URLSearchParams(url1);
      let id = urlParams.get('v');
      if (id && url2.includes('videos/' + id + '/'))
         return true;
   }
   
   return false;
}

function contactsPageUrl()
{
   if (Form_MainUri != null)
      return Form_MainUri + '?View=Home,MyBusiness,Contacts';
   return null;
}

function publisherPageUrl()
{
   if (Form_MainUri != null)
      return Form_MainUri + '?View=Home,MyBusiness,Publisher';
   return null;
}

function syncsPageUrl()
{
   if (Form_MainUri != null)
      return Form_MainUri + '?View=Home,Settings,Syncs';
   return null;
}

// pattern: would usually be an entry from constantPaths in Constants.js
// replacements: is a name=>value hash of replacements to use in the pattern (i.e. "{{name}}" is replaced with "value")
function buildUrl(pattern, replacements)
{
   // provide some defaults from the current page if not passed in (only makes sense from content script)
   if (!replacements.hasOwnProperty('Scheme')) replacements['Scheme'] = window.location.protocol + '//';
   if (!replacements.hasOwnProperty('Domain')) replacements['Domain'] = window.location.hostname;
   if (!replacements.hasOwnProperty('Path')) replacements['Path'] = window.location.pathname;
   if (!replacements.hasOwnProperty('Parameters')) replacements['Parameters'] = window.location.search;
   
   let url = pattern;
   for (let name in replacements)
   {
      url = Utilities_ReplaceInString(url, '{{' + name + '}}', replacements[name]);
   }
   return url;
}

function loadConstantsFromJson(str)
{
   // The response contains some variables that we need to extract, parse and assign locally.
   // Theses variables must appear in this order:
   const variables = [
      'constants',
      'timings',
      'elementPaths',
      'localizedKeywords',
      'constantStyles',
      'constantPaths'
   ];
   let result = {};
   let iStart = [];
   let i = 0;
   for (let varName of variables)
   {
      iStart[i] = str.indexOf(varName + ' =');
      if (iStart[i] == -1)
      {
         Log_WriteError('Got invalid constants from server with length ' + str.length + ' while looking for ' + varName);
         return;
      }
      iStart[i] += varName.length + 2;
      i++;
   }
   for (i = 0; i < variables.length; i++)
   {
      let varName = variables[i];
      let nextStart = iStart.length > i + 1
         ? iStart[i + 1]
         : str.length;
      let iEnd = str.lastIndexOf(';', nextStart);
      assert(iEnd != -1);
      let value = Json_FromString(Json_ConvertJavaScriptToJson(str.substr(iStart[i], iEnd - iStart[i])));
      result[varName] = value;
   }
   return result;
}

// takes the form "fbp:username@fbun.socialattache.com" in it's various social ID types and the PROTOCOL IS OPTIONAL
// generalizes numeric FB page and FB person IDs into a common format so they are interchangeable for lookup
function normalizeContactAddress(addr)
{
   // make sure we're dealing with just the raw address
//   assert(addr.indexOf(':') != -1);
   assert(addr.indexOf('<') == -1);
   // use lowercase here so we can find case insensitive
   addr = addr.toLowerCase();
   // the Messenger client code can't tell the difference between pages and contacts so
   // we use a common ID style so they're interchangeable for lookups
   addr = Utilities_ReplaceInString(addr, '@fbperid.socialattache.com', '@numid.socialattache.com')
   addr = Utilities_ReplaceInString(addr, '@fbrmid.socialattache.com', '@numid.socialattache.com')
   addr = Utilities_ReplaceInString(addr, '@fbpage.socialattache.com', '@numid.socialattache.com')
   
   return addr;
}

function normalizeContactNameForIndex(name)
{
   if (name)
      name = Utilities_RemoveNonAlphanumericCharacters(name).toLowerCase() + '@name.socialattache.com';
   return name;
}

function getFirstLatestChatSyncTimestamp()
{
   return Date.now() - timings.FIRST_CHAT_IMPORT_DELTA * 1000;
}

function getLatestSyncTimestamp()
{
   return Date.now() - timings.FULL_CHAT_IMPORT_DELTA * 1000;
}
