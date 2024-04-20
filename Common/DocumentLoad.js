// ========================================================================
//        Copyright � 2012 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Allows the registration of methods that will be called after document load.


var _BusyIndicatorHoldCount = 0;

// keep the busy indicator on even after the callbacks have all been called
function BusyIndicatorHold()
{
   _BusyIndicatorHoldCount++;
}

function BusyIndicatorUnhold()
{
   _BusyIndicatorHoldCount--;
   if (_BusyIndicatorHoldCount == 0)
   {
      BusyIndicatorStop();
   }
}

var DocumentLoad =
   {
      // sometimes we load a chunk of the page later, and that chunk needs to be initialized just like the
      // rest of the page, so we save the callbacks for this purpose, so we can apply them on that chunk
      savedCallbacks: new Array(),
      callbacks: new Array(),
      nodes: null,		// if we are initializing a subset of the page, these are the nodes to initialize
      done: false,
      timer: null,
      retryCount: 0,
      
      TimerFunc: function()
      {
         // kill the timer
         if (DocumentLoad.timer)
         {
            clearInterval(DocumentLoad.timer);
            DocumentLoad.timer = null;
         }
         
         while (DocumentLoad.callbacks.length > 0)
         {
            var callback = DocumentLoad.callbacks.shift();
            
            try
            {
               callback(DocumentLoad.nodes);
            }
            catch (err)
            {
               alert("Exception: " + err.message + "\r\n" + err.stack);
            }
         }
         
         DocumentLoad.nodes = [document.body];
         
         if (_BusyIndicatorHoldCount == 0 && typeof BusyIndicatorStop === "function" && !Browser.IsExtension())
            BusyIndicatorStop();
      },
      
      Init: function()
      {
         // quit if this function has already been called
         if (DocumentLoad.done) return;
         // flag this function so we don't do the same thing twice
         DocumentLoad.done = true;
         DocumentLoad.nodes = [document.body];
         
         if (typeof BusyIndicatorStart === "function" && !Browser.IsExtension())
            BusyIndicatorStart(Str('Loading...'));
         DocumentLoad.timer = setInterval(function()
         {
            try
            {
               // in the Chrome extension we'll keep trying until the storage is ready
               if (!Browser.IsExtension() || Storage.IsAllStorageReady())
                  DocumentLoad.TimerFunc();
               else
               {
                  DocumentLoad.retryCount++;
                  
                  if ((DocumentLoad.retryCount % 20) == 0)
                     Log_WriteError('DocumentLoad: Storage still not ready after ' + (DocumentLoad.retryCount / 2) + ' seconds!');
               }
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 500);
      },
      
      InitChunk: function(nodes)
      {
         if (nodes.length == 0)
            return;
         
         assert(DocumentLoad.nodes.length == 1);
         DocumentLoad.nodes = nodes;
         DocumentLoad.callbacks = [...DocumentLoad.savedCallbacks];	// make a shallow copy
         
         if (typeof BusyIndicatorStart === "function" && !Browser.IsExtension())
            BusyIndicatorStart(Str('Loading...'));
         DocumentLoad.TimerFunc();
      },
      
      AddCallback: function(callback)
      {
         // we don't need any of the DocumentLoad callbacks in the background script
         if (Browser.IsExtensionBackground())
            return;
         
         DocumentLoad.savedCallbacks.push(callback);
         
         if (DocumentLoad.done)
            callback(DocumentLoad.nodes);	// document already loaded
         else
            DocumentLoad.callbacks.push(callback);
      }
   }

if (!Browser.IsExtensionBackground())
{
   if (document.readyState === 'loading')	// Loading hasn't finished yet
      document.addEventListener('DOMContentLoaded', DocumentLoad.Init);
   else											// DOMContentLoaded has already fired
      DocumentLoad.Init();	// call the onload callback
}
