var Timers =
   {
      _TimerHandlers: {},
      
      _TimerHandler: function(alarm)
      {
         if (alarm.name != 'Timers')
            return;
         
         let now = Date.now();
         for (let timerID in Timers._TimerHandlers)
         {
            if (Timers._TimerHandlers[timerID].runTime <= now)
            {
               try
               {
                  Timers._TimerHandlers[timerID].handler();
                  if (Timers._TimerHandlers[timerID].interval)
                     Timers._TimerHandlers[timerID].runTime += Timers._TimerHandlers[timerID].interval * 1000;
                  else
                     delete Timers._TimerHandlers[timerID];
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }
         }
      },
      
      // Note: in some environments the timer resolution is minutes
      // returns an ID that can be used to remove the timer
      AddRepeatingTimer: function(seconds, handler)
      {
         let timerID = null;
         
         if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            do
            {
               timerID = Utilities_IntRand(1000, 100000) + '';
            } while (Timers._TimerHandlers.hasOwnProperty(timerID));
            
            Timers._TimerHandlers[timerID] = {
               handler: handler,
               interval: seconds,
               runTime: Date.now() + (seconds * 1000)
            };
         }
         else
         {
            timerID = setInterval(function()
            {
               try
               {
                  handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, seconds * 1000);
         }
         
         return timerID;
      },
      
      RemoveRepeatingTimer: function(timerID)
      {
         if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            delete Timers._TimerHandlers[timerID];
         }
         else
         {
            clearInterval(timerID);
         }
      },
      
      // Note: in some environments the timer resolution is minutes
      // returns an ID that can be used to remove the timer
      AddTimer: function(seconds, handler)
      {
         let timerID = null;
         
         if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            do
            {
               timerID = Utilities_IntRand(1000, 100000) + '';
            } while (Timers._TimerHandlers.hasOwnProperty(timerID));
            
            Timers._TimerHandlers[timerID] = {
               handler: handler,
               interval: null,
               runTime: Date.now() + (seconds * 1000)
            };
         }
         else
         {
            timerID = setTimeout(function()
            {
               try
               {
                  handler();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, seconds * 1000);
         }
         
         return timerID;
      },
      
      RemoveTimer: function(timerID)
      {
         if (Browser.IsExtensionBackground())
         {
            // this is the Chrome extension background script
            delete Timers._TimerHandlers[timerID];
         }
         else
         {
            clearTimeout(timerID);
         }
      }
   };

if (Browser.IsExtensionBackground())
{
   // this is the Chrome extension background script
   chrome.alarms.onAlarm.addListener(Timers._TimerHandler);
   chrome.alarms.create('Timers', {periodInMinutes: 1});
}