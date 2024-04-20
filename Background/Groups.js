function GroupsInit()
{
   return {
      groupInfos: {}
   };
}

if (Browser.IsExtensionBackground())
{
   Timers.AddRepeatingTimer(60, async function()
   {
      if (ActionSelection_IsSystemIdleTime())
         return;
      Log_WriteInfo('Groups alarm');
      _updateGroupInfos();        // this is async
   });
}

// DRL FIXIT! Not async.
async function reqGetGroupInfos()
{
   return getGroupInfos();
}

function getGroupInfos()
{
   let sharedData = Storage.GetSharedVar('Groups', GroupsInit());
   
   return sharedData.groupInfos;
}

function reloadGroupInfos()
{
   // we get notified after the group info is imported so we don't have to wait
   
   OutstandingProcessing_Clear('Groups');
   
   _updateGroupInfos(); // this is async
}

async function _updateGroupInfos()
{
   return new Promise((resolve, reject) =>
   {
      if (!isSocialAttacheLoggedIn() || !OutstandingProcessing_Start('Groups', timings.GROUPS_CHECK_DELAY))
      {
         resolve(false);
         return;
      }
      
      var params = {
         'Fields': 'GroupUid,ResourceID,GroupURL,ImportMembers,MemberCount,IsAdmin'
      };
      const url = getBrandID() == BrandID_LocalFile
         ? Environment.GetAssetUrl('Data/CommunityGroups.json')
         : Form_RootUri + '/v2/CommunityGroups';
      
      ajax.get(url, params, function(resp, httpCode)
      {
         let sharedData = Storage.GetSharedVar('Groups', GroupsInit());
         let result = false;
         
         if (resp && httpCode == 200)
         {
            let lastGroupInfos = sharedData.groupInfos;
            sharedData.groupInfos = {};
            
            resp = Json_FromString(Json_ConvertJavaScriptToJson(resp));
            // NOTE: For some reason using (let groupID in resp.data) below skipped groups.
            for (let groupID of Object.keys(resp.data))
            {
               let groupInfo = resp.data[groupID];
   
               // we want to index by FB group identifier instead of ID
               let groupUid = Url_GetEmailPrefix(groupInfo.GroupUid);
               
               // keep track of groups removed with this update
               delete (lastGroupInfos[groupUid]);
               
               // if we have both a personal and a business entry keep the business one
               if (sharedData.groupInfos.hasOwnProperty(groupUid) && Url_GetProtocol(groupInfo.GroupUid) != 'fb')
                  continue;
               
               sharedData.groupInfos[groupUid] = groupInfo;
            }
            
            Storage.SetSharedVar('Groups', sharedData);
            
            // trying to catch case where extension is trying to update group questions for a group that does not exist in the DB
            if (Object.keys(lastGroupInfos).length > 0)
            {
               Log_WriteError('When updating group infos removed group(s): ' + GetVariableAsString(lastGroupInfos));
            }
            
            result = true;
         }
         else if (httpCode == null || httpCode == 0 || httpCode == 401 || httpCode == 480)
         {
            // server unavailable, network error, etc.
            Log_WriteWarning('Server is not available to get group infos: ' + httpCode);
         }
         else
         {
            Log_WriteError('Error getting groups info: ' + httpCode);
         }
         
         OutstandingProcessing_End('Groups');
         resolve(result);
      }, true, timings.MEDIUM_AJAX_REQUEST * 1000);
   })
      .catch(e =>
      {
         Log_WriteException(e);
         throw e;
      });
}

function Groups_OnUserChanged()
{
   // force refresh from new account
   Storage.SetSharedVar('Groups', GroupsInit());
   
   // initiate fetching the new accounts data
   _updateGroupInfos();    // this is async
}

