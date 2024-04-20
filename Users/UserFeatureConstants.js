// Must exactly match PHP code:

var UserFeaturesContacts = 'cont';
var UserFeaturesContactHistories = 'chis';
var UserFeaturesContactTracking = 'ctrk';
var UserFeaturesGroups = 'grps';
var UserFeaturesEvents = 'evnt';
var UserFeaturesTasks = 'task';
var UserFeaturesTaskCompletions = 'tskc';
var UserFeaturesTags = 'tags';
var UserFeaturesEditTags = '+tag';
var UserFeaturesPipeline = 'pipe';
var UserFeaturesEditPipeline = '+pip';
var UserFeaturesTaskTemplates = 'tskt';
var UserFeaturesEditTaskTemplates = '+tkt';
var UserFeaturesEmailFrames = 'emfr';
var UserFeaturesEmailLayout = 'emly';
var UserFeaturesViewMessages = 'msgs';
var UserFeaturesSendMessages = 'smsg';
var UserFeaturesViewSocialPosts = 'vpst';
var UserFeaturesSendSocialPosts = 'spst';
var UserFeaturesFriendUnfriend = 'frnd';
var UserFeaturesGroupAcceptDecline = 'grmr';
var UserFeaturesGroupChatInvite = 'gciv';
var UserFeaturesSyncFriends = '=frd'; // get friends list
var UserFeaturesDocuments = 'docs';  // can view/edit but not add
var UserFeaturesAddDocuments = '+doc';
var UserFeaturesTemplates = 'temp';  // can view/edit but not add
var UserFeaturesAddTemplates = '+tmp';
var UserFeaturesPostsLibrary = 'plib';
var UserFeaturesAddPostsLibrary = '+plb';
var UserFeaturesSchedulers = 'schd';
var UserFeaturesAddSchedulers = '+sch';
var UserFeaturesQuizzes = 'quiz';
var UserFeaturesAddQuizzes = '+quz';
var UserFeaturesTraining = 'trng';
var UserFeaturesCourses = 'crse';
var UserFeaturesHelp = 'help';
var UserFeaturesVideoFunnels = 'vfnl';
var UserFeaturesOptInFunnels = 'optf';
var UserFeaturesWebSequences = 'wbsq';
var UserFeaturesFunnels = 'funl';
var UserFeaturesListservs = 'lsrv';
var UserFeaturesVentureAutomation = 'vena';
var UserFeaturesContactTagAutomation = 'ctga';
var UserFeaturesEventTagAutomation = 'etga';
var UserFeaturesFacebookPageAutomation = 'fbpa';
var UserFeaturesFacebookGroupMembersAdmin = 'fbgm';
var UserFeaturesFacebookGroupMembersNonAdmin = 'fgmn';
var UserFeaturesFacebookGroupAutomation = 'fbga';
var UserFeaturesGiveawayAutomation = 'giva';
var UserFeaturesIncentiveAutomation = 'inca';
var UserFeaturesAffiliateAutomation = 'affa';
//var UserFeaturesFacebookPublishers =    'fbpu';
//var UserFeaturesBlogPublishers =        'blpu';
var UserFeaturesPublishingCalendar = 'puca';
var UserFeaturesWatchedPosts = 'wpst';
var UserFeaturesWatchedGroupChats = 'wcht';
var UserFeaturesWatchedFriendsLists = 'wflt';
var UserFeaturesChatbots = 'bots';
var UserFeaturesBlogs = 'blog';
var UserFeaturesDiscussions = 'disc';
var UserFeaturesForums = 'frum';
var UserFeaturesWebinars = 'wbnr';
var UserFeaturesAddWebinars = '+wbr';
var UserFeaturesWebSites = 'webs';
var UserFeaturesWebShortLinks = 'slnk';
var UserFeaturesUniShortCodes = 'scod';
var UserFeaturesWebSiteTunneling = 'wtun';
var UserFeaturesRequestNotifications = 'noti';
var UserFeaturesSendNotifications = 'snot';
var UserFeaturesSummaryNotifications = 'smry';
var UserFeaturesDefaultReplacements = 'defr';  // user default replacements are always available, this is for flow charts, ventures, etc.
var UserFeaturesECommerce = 'ecom';  // payment processing
var UserFeaturesPlans = 'plan';  // creating plans to sell
var UserFeaturesTeams = 'team';
var UserFeaturesCustomContactFields = 'cfld';
var UserFeaturesContactReferrals = 'crfr';
//var UserFeaturesNonCompanyVenture =     'nven';
var UserFeaturesLocales = 'locl';
var UserFeaturesLanguages = 'lang';
var UserFeaturesTranslation = 'trns';
var UserFeaturesSiteTranslator = 'strn';
var UserFeaturesTranscription = 'tscr';
var UserFeaturesInteractiveVideo = 'intv';
var UserFeaturesSplitTesting = 'splt';
var UserFeaturesIssues = 'issu';
var UserFeaturesGiveaways = 'give';
var UserFeaturesTeamIncentives = 'incn';
var UserFeaturesTeamReports = 'tmrp';
var UserFeaturesPromotions = 'prom';
var UserFeaturesAffiliates = 'affi';
var UserFeaturesOpenAIBasic = 'oaib';
// sync providers
var UserFeaturesAppleSync = '=apl';
var UserFeaturesGoogleSync = '=ggl';
var UserFeaturesMicrosoftSync = '=msf';
var UserFeaturesFacebookSync = '=fbk';
var UserFeaturesInstagramSync = '=ing';
var UserFeaturesLinkedInSync = '=lin';
var UserFeaturesPinterestSync = '=pin';
var UserFeaturesTikTokSync = '=tik';
var UserFeaturesTwitterSync = '=twt';
var UserFeaturesVideoSync = '=vid';  // GoToMeeting, Zoom
var UserFeaturesSmsSync = '=sms';  // Twilio
var UserFeaturesEmailSync = '=eml';  // POP/SMTP/IMAP
// sync data types
var UserFeaturesSyncMessages = '=msg';
var UserFeaturesSyncContacts = '=cnt';
var UserFeaturesSyncTasks = '=tsk';
var UserFeaturesSyncEvents = '=evt';
//
var UserFeaturesVirtualAssistants = 'vass';
var UserFeaturesUserSupport = 'usup';
var UserFeaturesAdmin = 'admn';

var AssistantFeaturesMyBusiness = 'abiz';
var AssistantFeaturesTeamManagement = 'atmm';
var AssistantFeaturesContent = 'acnt';
var AssistantFeaturesMarketing = 'amrk';
var AssistantFeaturesAffiliatePrograms = 'aaff';
var AssistantFeaturesECommerce = 'aecm';
var AssistantFeaturesAdministration = 'aadm';
var AssistantFeaturesAccountAndSettings = 'aaas';
var AssistantFeaturesBilling = 'abill';

function UserHasFeature(feature)
{
   return Form_RootUri == null || GetCookie('AvailableFeatures', '').indexOf(feature) != -1;
}