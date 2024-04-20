const CheckBrand_NoBrands = 'no_brands';
const CheckBrand_BrandNotSelected = 'brand_not_selected';
const CheckBrand_BrandReady = 'brand_ready';

function BrandsInit()
{
   return {
      brands: {},
      brandID: parseInt(DefaultBrandID)
   };
}

if (Browser.IsExtensionBackground())
{
   // when the browser is closed then launched, or the extension is installed/updated and launched
   Environment.AddStartupListener(function()
   {
      Log_WriteInfo('Brands app startup');
      
      Storage.AddSharedValuesLoadedListener(function()
      {
//            // make sure we're working with the latest brands
//            OutstandingProcessing_Clear('Brands');
//            await _updateBrands();
         
         checkBrand();           // kick off brand loading and setup
      });
   });
   
   Timers.AddRepeatingTimer(60, function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('Brands alarm');
      _updateBrands();    // this is async
   });
}

function isBrandingInitialized()
{
   let sharedData = Storage.GetSharedVar('Brands', BrandsInit());
   return Object.keys(sharedData.brands).length > 0;
}

// DRL FIXIT! Not async.
async function reqGetBrandInfos()
{
   let sharedData = Storage.GetSharedVar('Brands', BrandsInit());
   return sharedData;
}

async function reqSetBrandID(brandID)
{
   // must be handled by the background script
   return Messaging.SendMessageToBackground({type: 'setBrandID', brandID: brandID});
}

async function _updateBrands()
{
   return new Promise((resolve, reject) =>
   {
      let sharedData = Storage.GetSharedVar('Brands', BrandsInit());

      if (!OutstandingProcessing_Start('Brands', sharedData.brands.length > 0 ? timings.BRANDS_CHECK_DELAY : 0))
      {
         resolve(false);
         return;
      }
      
      var params = {
         'Fields': 'VentureID,Name,RootURL,ExtensionLoginResourceID'
      };
      const url = DefaultBrandID == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/Brands.json')
         // we always use the system URL to get brands except in local developer case where we'll use the chosen brands URL
         : (DefaultBrandID == BrandID_LocalFile ? getBrand(getBrandID()).RootURL : SystemRootUrl) + '/v2/Brands';
      
      ajax.get(url, params, function(resp, httpCode)
      {
         let result = false;
         if (resp && httpCode == 200)
         {
            resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
            
            let sharedData = Storage.GetSharedVar('Brands', BrandsInit());
            
            sharedData.brands = resp.data
            if (DefaultBrandID != BrandID_LocalFile && DefaultBrandID != BrandID_MustChoose)
            {
               // this is a branded extension, meaning that it only supports one brand
               sharedData.brandID = parseInt(DefaultBrandID);
               Utilities_TrimArrayByKey(sharedData.brands, DefaultBrandID);
            }
            else if (!sharedData.brands.hasOwnProperty(sharedData.brandID))
            {
               // brand not found, use the default - which could be BrandID_MustChoose!
               sharedData.brandID = parseInt(DefaultBrandID);
            }
            
            Storage.SetSharedVar('Brands', sharedData);
            
            result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get brands: ' + httpCode);
         }
         else
         {
            Log_WriteError('Error getting brands: ' + httpCode);
         }
         
         OutstandingProcessing_End('Brands');
         resolve(result);
      }, true, timings.SHORT_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function getBrandID()
{
   let sharedData = Storage.GetSharedVar('Brands', BrandsInit());

//    Log_SetMetaLogging('Brands', 'Brand: ' + sharedData.brandID);
   
   return sharedData.brandID;
}

function setBrandID(brandID)
{
   let localData = Storage.GetSharedVar('Brands', BrandsInit());
   
   assert(localData.brands.hasOwnProperty(brandID));
   if (localData.brandID == parseInt(brandID))
      return;
   localData.brandID = parseInt(brandID);

//    Log_SetMetaLogging('Brands', 'Brand: ' + localData.brandID);
   
   Storage.SetSharedVar('Brands', localData);
   
   let brand = getBrand();
   assert(brand != null);
   _setupBrand(brand);
}

function getBrand()
{
   let sharedData = Storage.GetSharedVar('Brands', BrandsInit());
   
   if (!sharedData.brands.hasOwnProperty(sharedData.brandID))
   {
      if (sharedData.brandID == BrandID_MustChoose)
         Log_WriteInfo('Brand has not yet been chosen from: ' + Object.keys(sharedData.brands).join(', '));
      else
         Log_WriteInfo('Brand ' + sharedData.brandID + ' not available in: ' + Object.keys(sharedData.brands).join(', '));
      return null;
   }
   
   return sharedData.brands[sharedData.brandID];
}

function _setupBrand(brand)
{
   if (brand == null)
   {
      Log_WriteError('Passed null brand!');
      return CheckBrand_BrandNotSelected;
   }
   
   if (Form_RootUri == brand.RootURL)
      return CheckBrand_BrandReady;
   
   Log_WriteInfo('Setting up brand ' + brand.Name + ' (' + brand.VentureID + ') using ' + (brand.RootURL ? brand.RootURL : 'JSON files'));
   Form_RootUri = brand.RootURL;
   Form_MainUri = brand.RootURL ? brand.RootURL + '/Main.php' : null;
   
   OutstandingProcessing_OnUserChanged();
   Cookies_OnUserChanged();      // this must be done after the URLs are set
   Session_OnUserChanged();      // may need to log in, or at least switch accounts
   Tags_OnUserChanged();
   Contacts_OnUserChanged();
   Filters_OnUserChanged();
   Groups_OnUserChanged();
   Help_OnUserChanged();
   SyncDevices_OnUserChanged();
   SyncSettings_OnUserChanged();
   SyncStatistics_OnUserChanged();
   Syncs_OnUserChanged();
   TabManager_OnUserChanged();   // refresh tabs so they are updated to use the new brand
   
   return CheckBrand_BrandReady;
}

// returns one of the CheckBrand_Xxx constants
function checkBrand()
{
   let brand = getBrand();
   if (brand)
      return _setupBrand(brand);
   
   let sharedData = Storage.GetSharedVar('Brands', BrandsInit());
   
   if (Object.keys(sharedData.brands).length > 0)
      return CheckBrand_BrandNotSelected;
   
   Log_WriteInfo('No branding info, loading it!');
   
   _updateBrands()
      .then(resp =>
      {
         if (!resp)
         {
            Log_WriteError("Error loading brands!");
         }
         else
            _setupBrand(getBrand());
      })
      .catch(error =>
      {
         Log_WriteError("Error loading brands: " + error);
      });
   
   return CheckBrand_NoBrands;
}
