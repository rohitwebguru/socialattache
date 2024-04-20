// This module will help us to avoid a long running processing from being overtaken by the next scheduled one, 
// and also catch the case where it's taking to long to process or got stuck.

const MaxOutstandingProcessingSeconds = 900;    // 15 minutes

function OutstandingProcessingInit()
{
   return {};
}

// when the browser is closed then launched, or the extension is installed/updated and launched
Environment.AddStartupListener(function()
{
   Log_WriteInfo('OutstandingProcessing app startup');
   
   Storage.AddLocalValuesLoadedListener(function()
   {
      let localData = Storage.GetLocalVar('OutstandingProcessing', OutstandingProcessingInit());
      
      let now = Date.now();
      
      // anything that didn't start in the last few seconds would have been from a previous instance of the
      // app and therefore the processing would have been aborted
      for (let key of Object.keys(localData))
         if (now - localData[key].started > 3000)
            localData[key].started = null;
      
      Storage.SetLocalVar('OutstandingProcessing', localData);
   });
});

function _getTimespanString(timeSpanMilli)
{
   let timeSpan = timeSpanMilli / 1000;
   let duration = sprintf("%02d", Utilities_Mod(timeSpan, 60));
   timeSpan = Utilities_Div(timeSpan, 60);
   duration = sprintf("%02d", Utilities_Mod(timeSpan, 60)) + ':' + duration;
   timeSpan = Utilities_Div(timeSpan, 60);
   duration = timeSpan + ':' + duration;
   return duration;
}

function OutstandingProcessing_Start(key, interProcessDelay)
{
   if (!navigator.onLine)
   {
      Log_WriteInfo('The browser appears to be offline, skipping processing of ' + key);
      return false;
   }
   
   if (key != 'Brands' && Form_RootUri == null)
   {  // unless this is a branding request, wait until branding has initialized
      Log_WriteInfo('Brands have not been retrieved or selected, skipping processing of ' + key);
      return false;
   }
   
   let localData = Storage.GetLocalVar('OutstandingProcessing', OutstandingProcessingInit());
   
   if (!localData.hasOwnProperty(key))
      localData[key] = {
         lastRun: 0,
         started: null
      };
   
   let now = Date.now();
   
   if (now - localData[key].lastRun < interProcessDelay * 1000)
      return false;
   
   if (localData[key].started)
   {
      let timeSpan = now - localData[key].started;
      if (timeSpan < MaxOutstandingProcessingSeconds * 1000)
      {
         Log_WriteWarning('Processing of ' + key + ' is still going after ' + _getTimespanString(timeSpan));
         return false;
      }
      
      Log_WriteError('Processing of ' + key + ' has been running for ' + _getTimespanString(timeSpan) +
         ', therefore allowing next scheduled processing');
      localData[key].started = null;
   }
   
   localData[key].started = now;
   
   Storage.SetLocalVar('OutstandingProcessing', localData);
   
   Log_WriteInfo('Starting processing of ' + key);
   return true;
}

function OutstandingProcessing_End(key)
{
   let localData = Storage.GetLocalVar('OutstandingProcessing', OutstandingProcessingInit());
   
   if (!localData.hasOwnProperty(key))
   {
      if (isSocialAttacheLoggedIn())  // user may have logged out
         Log_WriteErrorCallStack('Missing key ' + key + ', so there must be a bug somewhere!');
      else
         Log_WriteWarningCallStack('Missing key ' + key + ', but user is logged out.');
      return false;
   }
   
   if (localData[key].started == null)
   {
      Log_WriteWarning('Processing of ' + key + ' was either restarted or there is a bug in the code');
      return false;
   }
   
   let now = Date.now();
   
   Log_WriteInfo('Processing of ' + key + ' took ' + _getTimespanString(now - localData[key].started));
   
   localData[key].lastRun = now;
   localData[key].started = null;
   
   Storage.SetLocalVar('OutstandingProcessing', localData);
   
   return true;
}

function OutstandingProcessing_Clear(key)
{
   let localData = Storage.GetLocalVar('OutstandingProcessing', OutstandingProcessingInit());
   
   if (localData.hasOwnProperty(key) && localData[key].started == null)
      delete localData[key];
   
   Storage.SetLocalVar('OutstandingProcessing', localData);
}

function OutstandingProcessing_OnUserChanged()
{
   // force fresh for new account
   Storage.SetLocalVar('OutstandingProcessing', OutstandingProcessingInit());
}

function OutstandingProcessing_WakeFromSleep()
{
   let localData = Storage.GetLocalVar('OutstandingProcessing', OutstandingProcessingInit());
   
   let now = Date.now();
   for (let key in localData)
   {
      localData[key].started = now;
      Log_WriteInfo('Processing of ' + key + ' was interrupted by system sleep therefore resetting start time.');
   }
   
   Storage.SetLocalVar('OutstandingProcessing', localData);
}
