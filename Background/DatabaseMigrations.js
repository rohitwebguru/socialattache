let DatabaseMigrations =
   {
      CurrentVersion: 12,
      
      // Add new migrations here and update the version number above!
      
      MigrateToVersion12: function()
      {
         // added new properties
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         localData.skipMakingPostsUntil = null;
         localData.skipMakingCommentsUntil = null;
         Storage.SetLocalVar('BG_FB', localData);
         
         // added new property
         localData = Storage.GetLocalVar('BG_IG', BackGroundInstagramInit());
         localData.skipMakingPostsUntil = null;
         Storage.SetLocalVar('BG_IG', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion11: function()
      {
         // the last migration had a bug using "local" instead of "shared"
         
         let sharedData = Storage.GetSharedVar('Syncs', SyncsInit());
         
         // added new property
         sharedData['socialLoggedOutTimes'] = {};
         
         Storage.SetSharedVar('Syncs', sharedData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion10: function()
      {
         let localData = Storage.GetSharedVar('Syncs', SyncsInit());
         
         // added new property
         localData['socialLoggedOutTimes'] = {};
         
         Storage.SetLocalVar('Syncs', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion9: function()
      {
         // removed some no longer used items
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         delete localData['friends'];
         delete localData['watchedFriendsLists'];
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion8: function()
      {
         // added the "s" to "List" in skipCheckingCustomListsUntil
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         if (!localData.hasOwnProperty('skipCheckingCustomListsUntil'))
            localData.skipCheckingCustomListsUntil = 0;
         else
            Log_WriteError('BG_FB -> skipCheckingCustomListsUntil already exists!');
         
         delete localData['skipCheckingCustomListUntil'];
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion7: function()
      {
         // changed skipCheckingGroupsUntil item to an object in the Facebook background data
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         localData.skipCheckingGroupsUntil = {};
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion6: function()
      {
         // added the skipCheckingCustomListUntil item to the Facebook background data
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         if (!localData.hasOwnProperty('skipCheckingCustomListUntil'))
            localData.skipCheckingCustomListUntil = 0;
         else
            Log_WriteError('BG_FB -> skipCheckingCustomListUntil already exists!');
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion5: function()
      {
         // added the skipActionUntil item to the Facebook background data
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         if (!localData.hasOwnProperty('skipActionUntil'))
            localData.skipActionUntil = {};
         else
            Log_WriteError('BG_FB -> skipActionUntil already exists!');
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion4: function()
      {
         // added the skipCheckingFriendsUntil item to the Facebook background data
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         if (!localData.hasOwnProperty('skipCheckingFriendsUntil'))
            localData.skipCheckingFriendsUntil = 0;
         else
            Log_WriteError('BG_FB -> skipCheckingFriendsUntil already exists!');
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion3: function()
      {
         // added the skipCheckingPostsUntil and skipCheckingGroupsUntil items to the Facebook background data
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         if (!localData.hasOwnProperty('skipCheckingPostsUntil'))
            localData.skipCheckingPostsUntil = 0;
         else
            Log_WriteError('BG_FB -> skipCheckingPostsUntil already exists!');
         
         if (!localData.hasOwnProperty('skipCheckingGroupsUntil'))
            localData.skipCheckingGroupsUntil = 0;
         else
            Log_WriteError('BG_FB -> skipCheckingGroupsUntil already exists!');
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion2: function()
      {
         // added the skipCheckingMessagesUntil item to the Facebook background data
         
         let localData = Storage.GetLocalVar('BG_FB', BackGroundFacebookInit());
         
         if (!localData.hasOwnProperty('skipCheckingMessagesUntil'))
            localData.skipCheckingMessagesUntil = 0;
         else
            Log_WriteError('BG_FB -> skipCheckingMessagesUntil already exists!');
         
         Storage.SetLocalVar('BG_FB', localData);
         
         Migration.DatabaseMigratedOneVersion();
      },
      
      MigrateToVersion1: function()
      {
         // the contactInfos are no longer stored in the DB so free up that space
         Storage.SetStorage('Session',
            {
               contactInfos: undefined
            },
            function()
            {
               Migration.DatabaseMigratedOneVersion();
            });
      }
   };
