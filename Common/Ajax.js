// ========================================================================
//        Copyright � 2018 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Usage:
//
// var url = 'http://localhost/Api.php';
// var params = {
//    'Action': 'GetString',
//    'StringUsage': '',
//    'StringKey': key
// };
//
// ajax.get(url, params, function(response) { echo(response); });

var ajax = {};
ajax.x = function()
{
   if (window.fetch)
   {
      let x =
         {
            timeout: 0,
            method: 'GET',
            url: null,
            async: true,
            requestHeaders: {},
            responseHeaders: {},
            responseText: null,
            myStatus: null,
            onloadend: null,
            onerror: null,
            ontimeout: null,
            open: function(method, url, async)
            {
               this.method = method;
               this.url = url;
               this.async = async;
            },
            setRequestHeader: function(name, value)
            {
               this.requestHeaders[name] = value;
            },
            getAllResponseHeaders: function()
            {
               return this.responseHeaders;
            },
            send: function(data)
            {
               assert(typeof this.url === 'string');
               let signal = null;
               let abortTimerID = null;
               if (this.timeout > 0)
               {
                  const controller = new AbortController();
                  abortTimerID = setTimeout(() => controller.abort(), this.timeout);
                  signal = controller.signal;
               }
               
               if (Object.keys(this.requestHeaders).length == 0)
                  this.requestHeaders['Content-type'] = 'text/plain;charset=UTF-8';
               
               fetch(this.url, {
                  signal: signal,
                  method: this.method,
                  mode: 'cors',
                  cache: 'no-cache',
                  credentials: 'same-origin',
                  headers: this.requestHeaders,
                  redirect: 'follow',
                  referrerPolicy: 'no-referrer',
                  body: data // body data type must match "Content-Type" header
               })
                  .then(response =>
                     {
                        if (abortTimerID)
                           clearTimeout(abortTimerID);
                        
                        this.responseHeaders = {};
                        for (let pair of response.headers.entries())
                           this.responseHeaders[pair[0]] = pair[1];
                        this.myStatus = response.status;
                        
                        response.text().then(data =>
                        {
                           this.responseText = data;
                           if (this.onloadend != null)
                              this.onloadend();
                        });
                     }
                  )
                  .catch(error =>
                  {
                     Log_WriteWarning('Passing error making ' + this.method + ' to ' + this.url + ': ' + error.message); // warning because caller should be logging as appropriate
                     if (error.name === 'AbortError')
                        this.ontimeout();
                     else
                        this.onerror({target: {status: error.name}});   // fake the structure we're expecting in the callback
                     
                     if (this.onloadend != null)
                        this.onloadend();
                  });
            }
         };
      
      return x;
   }
   
   if (typeof XMLHttpRequest !== 'undefined')
   {
      return new XMLHttpRequest();
   }
   var versions = [
      "MSXML2.XmlHttp.6.0",
      "MSXML2.XmlHttp.5.0",
      "MSXML2.XmlHttp.4.0",
      "MSXML2.XmlHttp.3.0",
      "MSXML2.XmlHttp.2.0",
      "Microsoft.XmlHttp"
   ];
   
   var xhr;
   for (var i = 0; i < versions.length; i++)
   {
      try
      {
         xhr = new ActiveXObject(versions[i]);
         break;
      }
      catch (e)
      {
      }
   }
   return xhr;
};

// timeout optional, in milliseconds
ajax.send = function(url, callback, method, paramsOrData, async, timeout, headers)
{
   assert(typeof url === 'string');
   if (async === undefined)
   {
      async = true;
   }
   var x = ajax.x();
   x.open(method, url, async);
   if (timeout != null)
      x.timeout = timeout;
// This is a pain when debugging and more importantly it causes long transfers to fail because this seems to
// be an overall timeout (and we really want a connection timeout). For this reason I've set a very long timeout.
   else
      x.timeout = 600000;  // 10 minutes
   if (callback)
      x.onloadend = function()
      {
         try
         {
            // Get the raw header string
            let headers = x.getAllResponseHeaders();
            let headerMap = {};
            
            if (headers.constructor === String)
            {
               // Convert the header string into an array
               // of individual headers
               let arr = headers.trim().split(/[\r\n]+/);
               
               // Create a map of header names to values
               arr.forEach(function(line)
               {
                  let parts = line.split(': ');
                  let header = parts.shift();
                  let value = parts.join(': ');
                  headerMap[header] = value;
               });
            }
            else
               headerMap = headers; // returned from "fetch" already as a map
            
            callback(x.responseText, x.hasOwnProperty('myStatus') ? x.myStatus : x.status, headerMap)
         }
         catch (e)
         {
            Log_WriteException(e, 'Exception making ' + method + ' to ' + url);
         }
      };
   x.onerror = function(e)
   {
      Log_WriteWarning('Error making ' + method + ' to ' + url + ': ' + e.target.status); // warning because caller should be logging as appropriate
   };
   x.ontimeout = function(e)
   {
      Log_WriteWarning('Timeout (' + x.timeout + ' ms) making ' + method + ' to ' + url);   // warning because caller should be logging as appropriate
      x.myStatus = 480;   // HTTP response for a timeout
   };
   if (headers != undefined)
   {
      for (let name of Object.keys(headers))
      {
         x.setRequestHeader(name, headers[name]);
      }
   }
   else if (method == 'POST')
   {
      x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
   }
   if (paramsOrData != null && typeof paramsOrData === "object" && !(paramsOrData instanceof String))
      paramsOrData = ConvertParamsForSending(paramsOrData).join('&');
   x.send(paramsOrData)
};

function ConvertParamsForSending(params)
{
   var query = [];
   for (var key in params)
   {
      if (Array.isArray(params[key]))
      {
         for (let i in params[key])
            if (params[key][i] !== null)
               query.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key][i]));
      }
      else
         query.push(encodeURIComponent(key) + '=' + (params[key] !== null ? encodeURIComponent(params[key]) : ''));
   }
   return query;
}

ajax.request = function(method, url, params, callback, async, timeout, headers)
{
   method = method.toUpperCase();
   
   if (Browser.IsExtensionContent())
   {
      assert(async == undefined || async == true);
      Messaging.SendMessageToBackground(
            {type: method, url: url, params: params, headers: headers, timeout: timeout})
         .then(resp =>
         {
            try
            {
               if (callback)
                  callback(resp.data, resp.httpCode, resp.headers);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making ' + method + ' to ' + url);
            }
         })
         .catch(e =>
         {
            Log_WriteException(e, 'Request ' + method + ': ' + url);
            try
            {
               if (callback)
                  callback(null, 500, []);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making ' + method + ' to ' + url);
            }
         });
      return;
   }
   
   let query = '';
   if (method != 'POST')
   {
      query = ConvertParamsForSending(params);
      params = null;
   }
   ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, method, params, async, timeout, headers);
};

ajax.asyncRequest = async function(method, url, params, timeout, headers)
{
   return new Promise((resolve, reject) =>
   {
      ajax.request(method, url, params, function(data, httpCode, headers)
      {
         resolve({data: data, httpCode: httpCode, headers: headers});
      }, true, timeout, headers);
   })
      .catch(e =>
      {
         Log_WriteException(e, url);
//      resolve({data: null, httpCode: 500, headers: []});
         throw e;
      });
};

ajax.get = function(url, params, callback, async, timeout, headers)
{
   if (Browser.IsExtensionContent())
   {
      assert(async == undefined || async == true);
      assert(headers == undefined);
      Messaging.SendMessageToBackground(
            {type: 'GET', url: url, params: params, timeout: timeout})
         .then(resp =>
         {
            try
            {
               if (callback)
                  callback(resp.data, resp.httpCode, resp.headers);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making GET to ' + url);
            }
         })
         .catch(e =>
         {
            Log_WriteException(e, 'GET: ' + url);
            try
            {
               if (callback)
                  callback(null, 500, []);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making GET to ' + url);
            }
         });
      return;
   }
   
   let query = ConvertParamsForSending(params);
   ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'GET', null, async, timeout, headers);
};

ajax.head = function(url, params, callback, async, timeout, headers)
{
   if (Browser.IsExtensionContent())
   {
      assert(async == undefined || async == true);
      assert(headers == undefined);
      Messaging.SendMessageToBackground(
            {type: 'HEAD', url: url, params: params, timeout: timeout})
         .then(resp =>
         {
            try
            {
               if (callback)
                  callback(resp.data, resp.httpCode, resp.headers);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making HEAD to ' + url);
            }
         })
         .catch(e =>
         {
            Log_WriteException(e, 'HEAD: ' + url);
            try
            {
               if (callback)
                  callback(null, 500, []);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making HEAD to ' + url);
            }
         });
      return;
   }
   
   let query = ConvertParamsForSending(params);
   ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'HEAD', null, async, timeout, headers);
};

ajax.post = function(url, paramsOrData, callback, async, timeout, headers)
{
   if (Browser.IsExtensionContent())
   {
      assert(async == undefined || async == true);
      assert(headers == undefined);
      Messaging.SendMessageToBackground(
            {type: 'POST', url: url, params: paramsOrData, timeout: timeout})
         .then(resp =>
         {
            try
            {
               if (callback)
                  callback(resp.data, resp.httpCode, resp.headers);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making POST to ' + url);
            }
         })
         .catch(e =>
         {
            Log_WriteException(e, 'POST: ' + url);
            try
            {
               if (callback)
                  callback(null, 500, []);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making POST to ' + url);
            }
         });
      return;
   }
   
   ajax.send(url, callback, 'POST', paramsOrData, async, timeout, headers);
};

ajax.delete = function(url, params, callback, async, timeout, headers)
{
   if (Browser.IsExtensionContent())
   {
      assert(async == undefined || async == true);
      assert(headers == undefined);
      Messaging.SendMessageToBackground(
            {type: 'DELETE', url: url, params: params, timeout: timeout})
         .then(resp =>
         {
            try
            {
               if (callback)
                  callback(resp.data, resp.httpCode, resp.headers);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making DELETE to ' + url);
            }
         })
         .catch(e =>
         {
            Log_WriteException(e, 'DELETE: ' + url);
            try
            {
               if (callback)
                  callback(null, 500, []);
            }
            catch (e)
            {
               Log_WriteException(e, 'Exception making DELETE to ' + url);
            }
         });
      return;
   }
   
   ajax.send(url, callback, 'DELETE', params, async, timeout, headers);
};

var _AjaxExecutionQueue = [];

function _AjaxExecutionFinalCallback(callback, data, httpCode)
{
   try
   {
      callback(data, httpCode);
   }
   catch (e)
   {
      Log_WriteException(e);
   }
}

// this is called on the top level window and finds the original window to make
// the callback, then initiates the nest execution as appropriate
function _AjaxExecutionCallback(url, data, httpCode)
{
   // dequeue the task that just finished
   var query = _AjaxExecutionQueue.shift();
   if (!query)
   {
      assert(0);
      return;
   }
   
   assert(url == query.url);  // just for sanity
   
   // DRL FIXIT? Not sure if we actually need _AjaxExecutionFinalCallback()?
   // call the callback from the correct window
   query.window._AjaxExecutionFinalCallback(query.callback, data, httpCode)
   
   _AjaxExecuteNextQueuedItem();
}

function _AjaxExecuteNextQueuedItem()
{
   // process the next item in the queue
   if (_AjaxExecutionQueue.length > 0)
   {
      setTimeout(function()
      {
         try
         {
            var query = _AjaxExecutionQueue[0];
            _ExecuteAjaxImmed(query.window, query.method, query.url, query.params, query.timeout, query.message);
         }
         catch (e)
         {
            Log_WriteException(e);
         }
      }, 500);
   }
}

// this method does the actual ajax call and calls the callback on the appropriate window when complete
function _ExecuteAjaxImmed(_window, method, url, params, timeout, message)
{
   if (typeof _window.BusyIndicatorStart === "function")
      _window.BusyIndicatorStart(message);
   
   switch (method)
   {
      case 'GET':
         ajax.get(url, params, function(data, httpCode)
         {
            try
            {
               _AjaxExecutionCallback(url, data, httpCode);
               if (typeof _window.BusyIndicatorStart === "function")
                  _window.BusyIndicatorStop();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, true, timeout);
         break;
      case 'POST':
         ajax.post(url, params, function(data, httpCode)
         {
            try
            {
               _AjaxExecutionCallback(url, data, httpCode);
               if (typeof _window.BusyIndicatorStart === "function")
                  _window.BusyIndicatorStop();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, true, timeout);
         break;
      case 'DELETE':
         ajax.delete(url, params, function(data, httpCode)
         {
            try
            {
               _AjaxExecutionCallbackurl, (data, httpCode);
               if (typeof _window.BusyIndicatorStart === "function")
                  _window.BusyIndicatorStop();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, true, timeout);
         break;
      default:
         assert(0);
         if (typeof _window.BusyIndicatorStart === "function")
            _window.BusyIndicatorStop();
         
         // so we don't stall the queue
         _AjaxExecutionQueue.shift();
         _AjaxExecuteNextQueuedItem();
         break;
   }
}

function _ExecuteAjax(_window, method, url, params, timeout, message, callback)
{
   // we just always go up the stack looking for the highest adjacent queue to use to avoid issues
   if (window.parent != window && window.parent._ExecuteAjax)
   {
      window.parent._ExecuteAjax(_window, method, url, params, timeout, message, callback);
      return;
   }
   
   var queryDetails =
      {
         window: _window,
         method: method,
         url: url,
         params: params,
         timeout: timeout,
         message: message,
         callback: callback,
      };
   _AjaxExecutionQueue.push(queryDetails);
   if (_AjaxExecutionQueue.length > 1)
      return;  // execute it when we're done with the current item
   
   setTimeout(function()
   {
      try
      {
         var query = _AjaxExecutionQueue[0];
         _ExecuteAjaxImmed(query.window, query.method, query.url, query.params, query.timeout, query.message);
      }
      catch (e)
      {
         Log_WriteException(e);
      }
   }, 500);
}

// timeout optional, in milliseconds
function ExecuteAjax(method, url, params, timeout, message, callback)
{
   _ExecuteAjax(window, method, url, params, timeout, message, callback)
}