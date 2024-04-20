// this is matched with the same named method in ContentHelpers.js
async function getFinalUrl(url)
{
   return new Promise((resolve, reject) =>
   {
      fetch(url, {method: 'HEAD'})
         .then(response =>
         {
            if (response != null)
               resolve(response.url);
            else
            {
               Log_WriteWarning("No result getting final url \"" + url + "\"");
               resolve(null);
            }
         })
         .catch(error =>
         {
            Log_WriteError("Error getting final url \"" + url + "\": " + error);
            resolve(url);
         });
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// this is matched with the same named method in ContentHelpers.js
async function fetchPage(url)
{
   return new Promise((resolve, reject) =>
   {
      // I had issues with CORS when making some requests from the front end content scripts so I instead
      // make them from the background script and send them through our proxy, unless it's for our API.
      let proxyUrl = url;
      if (Form_RootUri != null && Url_GetDomain(proxyUrl).toLowerCase() != Url_GetDomain(Form_RootUri).toLowerCase())
         proxyUrl = Form_RootUri + '/v2/Proxy?url=' + encodeURIComponent(proxyUrl);
      
      ajax.get(proxyUrl, {}, function(data, httpCode, headers)
      {
         if (httpCode != 200)
         {
            if (httpCode != 401 && httpCode != 403 && httpCode != 404)
               Log_WriteWarning("Got " + httpCode + " response for " + url + " to get URL: " + url);
            resolve(null);
            return;
         }
         
         resolve(data);
      }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}
