// ===================================================================
// Client code

function dataURItoBlob(dataURI)
{
   let byteString = atob(dataURI.split(',')[1]);
   let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
   let ab = new ArrayBuffer(byteString.length);
   let ia = new Uint8Array(ab);
   for (let i = 0; i < byteString.length; i++)
   {
      ia[i] = byteString.charCodeAt(i);
   }
   return new Blob([ab], {type: mimeString});
}

var blobResult = null;
async function requestBlobChunk(url, resolve)
{
   Messaging.SendMessageToBackground({type: 'getBlob', url: url})
      .then(chunk =>
      {
         reqPing();
         
         if (chunk === null)
         {
            Log_WriteError('Unable to get blob from URL: ' + url);
            resolve(null);                      // error condition
            blobResult = null;
         }
         else if (chunk !== true)
         {
            Log_WriteInfo("Got blob chunk: " + url);
            blobResult = blobResult + chunk;    // accumulate
            requestBlobChunk(url, resolve);     // request next chunk
         }
         else
         {
            Log_WriteInfo("Got entire blob: " + url);
            resolve(dataURItoBlob(blobResult)); // got the whole blob
            blobResult = null;
         }
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

async function reqGetBlob(url)
{
   return new Promise((resolve, reject) =>
      {
         assert(blobResult === null);
         blobResult = '';
         requestBlobChunk(url, resolve);  // start fetching the blob
      })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

// ===================================================================
// Background code

const BlobChunkSize = 8 * 1024 * 1024; // the maximum message size is 16MB so chunk at 8MB to be safe and efficient
var cachedBlobs = {};                  // allow multiple outstanding requests with different URLs
function fetchBlobChunk(url, sendResponse)
{
   // DRL FIXIT? We could optimize the logic so we don't have to send two messages for small blobs.
   
   if (cachedBlobs.hasOwnProperty(url))
   {
      if (cachedBlobs[url].length !== 0)
      {
         Log_WriteInfo("Sending blob chunk: " + url);
         let chunk = cachedBlobs[url].substring(0, BlobChunkSize);
         cachedBlobs[url] = cachedBlobs[url].substring(chunk.length);
         sendResponse(chunk);
      }
      else
      {
         Log_WriteInfo("Finished sending blob: " + url);
         delete cachedBlobs[url];
         sendResponse(true);  // done
      }
      return;
   }
   
   Log_WriteInfo("Start fetching blob: " + url);
   startingLongRunningOperation('getBlob');  // the client won't be able to ping during the fetch
   
   fetch(url)
      .then(response => response.blob())
      .then(data =>
      {
         Log_WriteInfo("Start reading blob: " + url);
         
         let reader = new FileReader();
         reader.addEventListener("load", function()
         {
            Log_WriteInfo("Finished fetching blob: " + url);
            finishedLongRunningOperation('getBlob');
            
            cachedBlobs[url] = reader.result;      // cache the blob for sending
            fetchBlobChunk(url, sendResponse);     // initiate sending the first chunk to the client
         }, false);
         reader.readAsDataURL(data);
      })
      .catch(error =>
      {
         Log_WriteError("Error getting blob \"" + url + "\": " + error);
         finishedLongRunningOperation('getBlob');
         
         sendResponse(null);
      });
}

