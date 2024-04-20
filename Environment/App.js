// DRL FIXIT! I believe this is not used, and if it is it should be replaced with: !Browser.IsExtension()
chrome = {IsApp: true};

// DRL FIXIT! We should move this somewhere, perhaps in Browser class, and implement it as appropriate.
navigator = {onLine: true};

// DRL FIXIT! This is used in Browser.js and we should change that.
webvViewDetails = {
   TabId: 0,
   WindowId: 0,
   Url: '',
   IsVisible: true,
   ...webvViewDetails,
}

var AddTabCreatedHandlers = [];

var AddTabRemovedHandlers = [];

var AddWindowCreatedHandlers = [];

var AddWindowRemovedHandlers = [];


var promiseLock = false;

SA_PROMISES = {};

async function globalPromise(key, codeBlock)
{
   async function sleep(msec)
   {
      return new Promise(resolve => setTimeout(resolve, msec));
   }
   
   while (promiseLock)
   {
      console.info("Waiting for promise lock release start");
      await sleep(1000);
      console.info("Waiting for promise lock release end");
      continue;
   }
   
   promiseLock = true;
   try
   {
      if (!SA_PROMISES[key])
      {
         let resolveCodeBlock, rejectCodeBlock;
         let promise = new Promise(function(resolve, reject)
         {
            resolveCodeBlock = resolve;
            rejectCodeBlock = reject;
            codeBlock(resolve, reject);
         });
         
         promise.resolve = resolveCodeBlock;
         promise.reject = rejectCodeBlock;
         promise.then(function(data)
            {
               // console.log("SA_PROMISES before delete", JSON.stringify(SA_PROMISES), new Date());
               delete SA_PROMISES[key];
               // console.log("SA_PROMISES after delete", JSON.stringify(SA_PROMISES), new Date());
               return data;
            },
            function(error)
            {
               console.error("Error in global promise", error, key);
               console.log("SA_PROMISES before delete", JSON.stringify(SA_PROMISES), new Date());
               delete SA_PROMISES[key];
               console.log("SA_PROMISES after delete", JSON.stringify(SA_PROMISES), new Date());
               return null;
            });
         // console.log("SA_PROMISES before add", JSON.stringify(SA_PROMISES), new Date());
         SA_PROMISES[key] = promise;
         // console.log("SA_PROMISES after add", JSON.stringify(SA_PROMISES), new Date());
         // setTimeout(function () {promiseLock = false;}, 500);
         promiseLock = false;
         return promise;
      }
      
      // setTimeout(function () {promiseLock = false;}, 500);
      promiseLock = false;
      return null;
   }
   catch (error)
   {
      console.error("Error occured in global promise: ", error, JSON.stringify(error), new Date());
      // setTimeout(function () {promiseLock = false;}, 500);
      promiseLock = false;
   }
   finally
   {
      // promiseLock = false;
      // console.log("Global Promise finally block promiseLock:", promiseLock);
      //setTimeout(function () { console.log("Global Promise finally block timeout promiseLock:", promiseLock); }, 1000);
      // setTimeout(function () { console.log("Global Promise finally block timeout promiseLock:", promiseLock); }, 1000);
   }
}

function resolveGlobalPromise(key, data)
{
   try
   {
      if (SA_PROMISES[key])
      {
         SA_PROMISES[key].resolve(data);
      }
      else
      {
         console.error("Promise key not found, Key:", key, JSON.stringify(SA_PROMISES));
      }
   }
   catch (error)
   {
      console.error("Error occured in resolveGlobalPromise", error);
   }
}

function addAppTypePrefix(type)
{
   if (type.indexOf("#SA#-") === -1)
   {
      type = "#SA#-" + type;
   }
   
   return type;
}

function removeAppTypePrefiex(type)
{
   if (type.indexOf("#SA#-") > -1)
   {
      type = type.replace("#SA#-", "");
   }
   
   return type;
}

