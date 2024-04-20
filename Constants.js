// NOTE: This file is parsed by our code so don't change the top level variable names nor their order!

CONSTANTS_VERSION = "1.118";

NO_EXTERNAL_ID = 'NO_EXTERNAL_ID';              // the external source doesn't provide IDs, we'll create one
// there are a number of possible error conditions for sending a message or post:
// - permanent failure due to incorrect scraping - important that we're notified when this is the case!
// - permanent failure of the recipient (recipient account was closed, recipient blocked sender, etc.)
// - permanent failure of the message (the message is flagged as spam or is somehow unsupported)
// - temporary failure of the message (the window lost focus)
// - temporary failure of the sender (rate limiting)
ERROR_EXTERNAL_ID = 'ERROR_EXTERNAL_ID';        // there was a fatal error sending the message or post
RETRY_EXTERNAL_ID = 'RETRY_EXTERNAL_ID';        // there was a possibly temporary error sending the message or post
LIMITED_EXTERNAL_ID = 'LIMITED_EXTERNAL_ID';    // pause all sending for a long delay - handled in extension

PRIMARY_TAB = 'PRIMARY';
GENERAL_TAB = 'GENERAL';

BACKGROUND_PROVIDED_TAB_ID = 'background_provided_tab_id';

const FB_DATA_NAME = 'FacebookScrape';
const IG_DATA_NAME = 'InstagramScrape';
const PINT_DATA_NAME = 'PinterestScrape';
const TT_DATA_NAME = 'TikTokScrape';
const TWIT_DATA_NAME = 'TwitterScrape';

const ScraperSyncs = [
    FB_DATA_NAME,
    IG_DATA_NAME,
    PINT_DATA_NAME,
    TT_DATA_NAME,
    TWIT_DATA_NAME,
];

constants = {
    MINIMUM_TAB_WIDTH: 1024,        // some sites provide a different UI for narrow view
    MAXIMUM_MESSAGES_PER_CHUNK: 100,
    MAXIMUM_FRIENDS_PER_CHUNK: 100,
    MAXIMUM_COMMENTS_PER_CHUNK: 100,    // using 200 resulted in "The message port closed before a response was received." so I set messages to 150 as well since they're similar size
    MAXIMUM_MEMBERS_PER_CHUNK: 200,
    
    USE_FACEBOOK_MSG_SEND_API: true,
    USE_FACEBOOK_GROUP_MEMBER_IMPORT_API: true,
    USE_FACEBOOK_GROUP_POST_API: true,
};

timings = {     // all these values are in seconds
    SHORT_AJAX_REQUEST: 60, // DRL FIXIT! Reduce this back to 15 after v2.6
    MEDIUM_AJAX_REQUEST: 60,
    LONG_AJAX_REQUEST: 600,
    CHECK_FOR_UPDATED_CONSTANTS: 300,
    SA_NOT_LOGGED_IN_DELAY: 60,
    SOCIAL_NOT_LOGGED_IN_DELAY: 120,
    TAB_NOT_VISIBLE_DELAY: 5,
    UI_RECHECK_DELAY: 3,
    IDLE_LOOP_DELAY: 10,                    // the syncs take turns so this is the rate at which each checks if it's his turn yet
    BUSY_LOOP_DELAY: 10,                    // the delay between actions in a specific sync
    INTER_SYNC_RUN_DELAY: 10,               // delay between runs of any syncs (end of last and start of next)
    SYNC_RUN_FREQUENCY: 30,                 // frequency of runs for a specific sync (start to start)
    
    FIRST_CHAT_IMPORT_DELTA: 604800,        // go back a maximum of one week in chats (messages in each chat goes back the full amount)
    FULL_CHAT_IMPORT_DELTA: 31449600,       // go back a maximum of one year
    CHAT_IMPORT_CHUNK_DELTA: 1209600,       // go back two weeks at a time to avoid taking too long
    
    // after checking this, how long to wait before processing anything else for this sync?
    BLOCKED_MESSAGE_DELAY: 3600,
    INTER_CONVERSATION_CHECK_DELAY: 60,
    INTER_FRIENDS_CHECK_DELAY: 30,
    INTER_CUSTOM_LIST_CHECK_DELAY: 30,
    INTER_CUSTOM_LIST_UPDATE_DELAY: 60,     // we do an update after a check so this is the more important of the two
    INTER_GROUP_CHECK_DELAY: 120,
    INTER_GROUP_MEMBER_CHECK_DELAY: 10,
    // The values are the inter-action delay, the delay between each page for a multi-page action or for a retry.
    // NOTE: For multiple page actions and retries we only count once for all pages towards the daily maximum.
    Commands: {
        'FetchContact': {ActionDelay: 30, PageDelay: 10},
        'Friend': {ActionDelay: 10, PageDelay: 10},
        'Unfriend': {ActionDelay: 120, PageDelay: 10},
        'GroupAccept': {ActionDelay: 120, PageDelay: 10},
        'GroupDecline': {ActionDelay: 10, PageDelay: 10},
        'GroupMemberAnswers': {ActionDelay: 20, PageDelay: 10},
        'GroupChatInvite': {ActionDelay: 30, PageDelay: 10},
        // DRL FIXIT! We'll need to split this per social platform (FB, IG, etc.)
        'SendMessage': {ActionDelay: 90, PageDelay: 10},
        'MakePost': {ActionDelay: 90, PageDelay: 10},
        'MakeComment': {ActionDelay: 90, PageDelay: 10},
    },

    UPLOAD_SUCCESS_MESSAGE_DELAY: 8,
    SYNC_LOGIN_DELAY: 15,                   // this delay prevents us from asking the user to link accounts one right after the other
    BRAND_SELECTION_TRIED_REOFFER: 120,     // wait this long after the user has been provided with the brand selection to ask again
    ACCOUNT_LOGIN_CHECK: 120,               // check if logged in this often (we also check each time we get the sync data from the server)
    ACCOUNT_LOGIN_OFFERED_REOFFER: 15,      // wait this long after we've returned the offer because while the prompt is up we could get another request
    ACCOUNT_LOGIN_TRIED_REOFFER: 3600,      // wait this long after the user has tried logging in to ask again (also check more often during this time)
    ACCOUNT_LOGIN_REFUSED_REOFFER: 86400,   // wait this long after the user has refused logging in to ask again
    SOCIAL_LOGIN_REMINDER_REOFFER: 3600,    // wait this long after reminding the user they're logged out before reminding them again
    SOCIAL_LOGIN_REMINDER_TIMEOUT: 300,     // how long to show the message (needed because we show it on all matching social tabs)
    READY_SYNC_CHECK_DELAY: 900,
    MISSING_SYNC_CHECK_DELAY: 60,
    LINK_SYNC_REFUSED_REOFFER: 86400,
    SYNC_PROCESSING_PING_DELAY: 30,
    SYNC_PROCESSING_THROTTLED_DELAY: 60,
    SYNC_MAX_SCRAPE_TIME: 300,              // let other scrapers have a shot if this one is taking a long time
    SYNC_MAX_SCRAPE_TIME_LONG: 1200,        // as above for long operations, for example parsing post comments may take a long time, and we must start back at the beginning if we get interrupted
    SCRAPING_EXCEPTION_DELAY: 300,
    THROTTLED_DELAY: 910,                   // stop scraping for a while and recheck, so this is half the below plus a tiny bit so that it aligns with after the action below has taken place
    THROTTLED_REFRESH_DELAY: 1800,          // wait, update the URL, wait, then recreate the tab if we've been throttled too long
    SCRAPER_INACTIVITY_REFRESH_DELAY: 300,  // if scraping tab hasn't been active we'll go through the same steps as above, but quicker
    BROWSER_IDLE_TIME: 300,
    
    // delays for contacting the server
    CONTACTS_CHECK_DELAY: 600,
    CONTACT_TAGS_CHECK_DELAY: 600,
    GROUPS_CHECK_DELAY: 600,
    BRANDS_CHECK_DELAY: 21600,
    FILTERS_CHECK_DELAY: 600,               // groups can only be changed via the extension so the only scenario is another extension running
    HELP_CHECK_DELAY: 3600,
    SYNC_DEVICES_CHECK_DELAY: 120,          // we don't want two machines sending the same message so we check frequently
    SYNC_SETTINGS_CHECK_DELAY: 600,         // settings don't change often
    SYNC_STATISTICS_SEND_DELAY: 600,        // statistics are not all that important

    // delays between re-scraping of each type
    INSTAGRAM_ACCOUNTS_CHECK_DELAY: 1200,
    MESSAGES_SCRAPE_DELAY: 300,             // message scraping is fairly time sensitive, but should be very efficient
    FRIENDS_SCRAPE_DELAY: 86400,            // friends scraping is very low priority and is a full import each time
    WATCHED_POSTS_CHECK_DELAY: 1800,        // watching posts is not very time sensitive
    WATCHED_CUSTOM_LISTS_CHECK_DELAY: 1800,   // watching custom friends list is not very time sensitive
//    WATCHED_GROUP_CHATS_CHECK_DELAY: 1800,  // watching group chats is fairly time sensitive - but only if there's automation??
    WATCHED_GROUP_REQUESTS_DELAY: 900,      // scraping new group requests is fairly time sensitive
    WATCHED_GROUP_MEMBERS_DELAY: 1800,      // scraping new group members is fairly time sensitive, but we speed this up after accepting someone
    WATCHED_GROUP_STAFF_DELAY: 21600,       // scraping new group staff is not very time sensitive, and we don't have dates so it's a full import each time (6 hours)
//    WATCHED_GROUP_QUESTIONS_DELAY: 86400,   // scraping group question changes is not very time sensitive (6 hours)
//    WATCHED_GROUP_QUESTIONS_NO_IMPORT_MULTIPLIER: 4,    // for groups where we don't import members, let's go back and check questions only once a day

    // I had to make this really long to get results in some cases
    FB_WATCHED_GROUP_MEMBERS_NO_CHANGE_TIMEOUT: 60,     // if we see no change for this amount of time we give up and assume we are throttled
    FB_CONVERSATIONS_NO_CHANGE_TIMEOUT: 60,             // if we see no change for this amount of time we give up and assume we have all the conversations or we are throttled
    
    // delay between each scroll request when there's data needing to be loaded at the end of a page
    FB_CONVERSATIONS_SCRAPE_SCROLL_DELAY: 7,
    FB_CONVERSATIONS_SCRAPE_SCROLL_AFTER_FOCUS_DELAY: 5,
    FB_MESSAGES_SCRAPE_SCROLL_DELAY: 7,
    FB_FRIENDS_SCRAPE_SCROLL_DELAY: 7,
    FB_GROUP_POSTS_SCROLL_DELAY: 7,
    FB_WATCHED_POST_SCROLL_DELAY: 5,
    FB_WATCHED_GROUP_REQUESTS_SCROLL_DELAY: 5,
    FB_WATCHED_GROUP_MEMBERS_SCROLL_DELAY: 5,
    FB_WATCHED_GROUP_MEMBERS_SCROLL_AFTER_FOCUS_DELAY: 5,
    FB_WATCHED_GROUP_STAFF_SCROLL_DELAY: 5,
    FB_WATCHED_CUSTOM_LIST_SCROLL_DELAY: 3,

    // let's put our polling automations to rest periodically and see if this reduces our memory footprint
    // and these hour start/end pairs are inclusive/exclusive and in local time
    SYSTEM_IDLE_HOURS: [[23, 24], [0, 6]], // Remove after v2.63
    SYSTEM_IDLE_DELAY: 300,
};

elementPaths = {
    Facebook: {
        throttled:
        [
            'DIV[role=dialog] H2 {propMatch("innerText", localizedKeywords.Facebook.Throttled)}',
            'DIV[role=dialog] {propMatch("aria-label", localizedKeywords.Facebook.Throttled)},DIV[id="splash-screen"]'
        ],
        // these extract the respective ID from the page HTML
        extractUserID: [
            '"userVanity":"[a-zA-Z0-9\\.\\-_]+","userID":"(\\d+)"',
            'LEGACY_(\\d+)_boosted_post',
            'href="/photo/\\?fbid=\\d+&amp;set=[A-Za-z]{2,4}\\.(\\d+)"',
            'href="/photo/\\?fbid=\\d+&set=[A-Za-z]{2,4}\\.(\\d+)"',
        ],
        // these extract the respective username from the page HTML
        extractUserName: [
            '"userVanity":"([a-zA-Z0-9\\.\\-_]+)","userID":"\\d+"'
        ],
        extractPageID: [
            '"pageID":"(\\d+)"',
            '"page":{"id":"(\\d+)"},"',
            'href="/(\\d+)/videos/"'
        ],
        extractGroupID: [
            'content="fb:\\/\\/group\\/(\\d+)"',
            'content="fb:\\/\\/group\\/\\?id=(\\d+)"',
        ],
        isPageType: [
            '"__typename":"Page","name":"[^"]+","id":"%%ItemID%%"',
            '"__typename":"Page","id":"%%ItemID%%"',
        ],
        isUserType: [
            '"__typename":"User","name":"[^"]+","id":"%%ItemID%%"',
            '"__typename":"User","id":"%%ItemID%%"',
            '"userVanity":"[^"]+","userID":"%%ItemID%%"',   // not sure if this distinguishes from page?
        ],
    },
    FacebookFrd: {
        friendsListNav: "div[aria-label='All friends'][role='navigation']",
        friendsList: 'div {parentBySelector("div[data-visualcompletion="ignore"][data-thumb="1"]").parentElement}',
        friendsListItems: "div[data-visualcompletion='ignore-dynamic']",
        friendAddress: 'a {href}',
        friendNoAddress: 'SPAN > SPAN > SPAN {propMatch("innerText","##FriendName##")}',
        friendName: 'span[dir="auto"] > span > span {innerText}',
        customList: 'div[aria-label="Custom Lists"][role="navigation"] div[data-visualcompletion="ignore-dynamic"] a[role="link"] {firstChild}',
        customListUid: '{parentBySelector("A").propMatch("href", "/lists/").href.match(/[0-9]+/g)}',
        customListName: '{childNodes[1]} span {innerText}',
        customListAdd: 'div[aria-label="Custom Lists"][role="navigation"] div[data-visualcompletion="ignore-dynamic"] > div[role="button"]',
        customListAddText: 'div[aria-label="Create New List"][role="dialog"] label input[type="text"]',
        customListAddConfirm: 'div[aria-label="Create New List"][role="dialog"] div[aria-label="Confirm"][role="button"]',

        customListItemsContainer: [
// This only works when you navigate to the list, not when you go to it directly by URL.
//            'DIV[aria-label="Custom Lists"][role="main"]',
            'DIV.x78zum5.xdt5ytf.x10cihs4.x1t2pt76.x1n2onr6.x1ja2u2z',
        ],
    
        // these three are very similar to the ones at friendsListProfileActions, keep them in sync!
        // look for the element that has both the A (name and URL) and the remove button
        customListItems: 'DIV > SPAN > SPAN > A {parentBySelector("DIV:has(DIV[aria-label="Tap to Delete"][role="button"])")}',
        customListFriendUrl: 'DIV > SPAN > SPAN > A {href}',
        customListFriendName: 'DIV > SPAN > SPAN > A {innerText}',

        customListFriendRemove: 'DIV[aria-label="Tap to Delete"][role="button"]',
        customListEditMenu: 'DIV[aria-label="Edit Custom List"][role="button"]',
        customListAddButton: [
            'DIV[aria-label="Add Friends"][role="button"]',
            'DIV[aria-label="Manage"][role="button"]',
            'DIV[aria-label="Add/Remove"][role="button"]',
            'DIV[role="menuitem"] SPAN {propMatch("innerText", "Add Friends|Manage|Add/Remove")}',
        ],
        customListEditBox: 'DIV:not([aria-label])[aria-labelledby][role="dialog"]',
        // This appears to be all the available friends, so we could use this for adding people to a list?
        customListFriendsList1: [   // DRL Change the name and comment out after v1.47!
           'data-sjs="">({"require+\\W.+bootstrap_keywords".+[^<]*]]]})',
           'data-sjs>({"require+\\W.+bootstrap_keywords".+[^<]*]]]})',
           '>({"require"\\:\\[\\["ScheduledServerJS"+\\W.+bootstrap_keywords".+[^<]*]]]})'
        ],
        customListFriendsList2: [
            '({"data":{"node":{"__typename":"FriendList"[^<]*"extensions":{"is_final":true}})'
        ],
        searchFriendsBox: 'input[placeholder="Search for a friend"]',
        filteredFriendResults: 'DIV[data-visualcompletion="ignore-dynamic"] DIV[role=button]',
        filteredFriendCancel: 'DIV[role=dialog] DIV[aria-label=Close][role=button]',
        filteredFriendResultName: 'DIV > SPAN {innerText}',
        filteredFriendSave: 'DIV[aria-label="Save"][role="button"]',
    },
    FacebookMsgs: {
        // there are likely one message status for every sent message so we grab the last one using slice(-1)
        // the "DIV[role=main]" avoids matching on the hidden pop-up message list
        // these can return a string if possible, otherwise any object to identify the case
        messageCheckSending: [
            'DIV[role=main] div[data-testid=messenger_delivery_status] {merge.slice(-1)} svg > title {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSending).textContent.trim()}',
            'DIV[role=main] DIV[data-scope=messages_table] SVG > TITLE {merge.slice(-1)} {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSending).textContent.trim()}',
            'DIV[role=main] DIV[data-scope=messages_table] DIV > SPAN > SPAN {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSending).textContent.trim()}',
        ],
        messageCheckPermanentFailure: [
            'DIV[role=main] div[data-testid=messenger_delivery_status] {merge.slice(-1)} svg > title {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSendFailure).textContent.trim()}',
            'DIV[role=main] DIV[data-scope=messages_table] SVG > TITLE {merge.slice(-1)} {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSendFailure).textContent.trim()}',
            'DIV[role=main] DIV[data-scope=messages_table] DIV > SPAN > SPAN {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSendFailure).textContent.trim()}',
        ],
        messageCheckRateLimitFailure: '#No_Match_For_Now',
        messageCheckTemporaryFailure: '#No_Match_For_Now',
        messageCheckSentSuccess: [
            'DIV[role=main] div[data-testid=messenger_delivery_status] {merge.slice(-1)} svg > title {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSendSuccess).textContent.trim()}',
            'DIV[role=main] DIV[data-scope=messages_table] SVG > TITLE {merge.slice(-1)} {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSendSuccess).textContent.trim()}',
            'DIV[role=main] DIV[data-scope=messages_table] DIV > SPAN > SPAN {propMatch("textContent", localizedKeywords.FacebookMsgs.MsgSendSuccess).textContent.trim()}',
        ],
        // the "DIV[role=main]" avoids matching on the hidden pop-up message list
        messageRows: 'DIV[role=main] div[data-testid="message-container"]',
        // the message list may include an item called "Marketplace" which opens up a sub-list and for now we want to
        // ignore those which is why I added the fist part below
        chatsList           : [
           "[data-testid='mwthreadlist-item-open'] [data-testid='mwthreadlist-item']",
           'DIV[role=row] > DIV[role=gridcell] > A {parentElement.parentElement}',
           'DIV[aria-label=Chats] DIV[role=row] > DIV[role=gridcell] A {parentBySelector("DIV[role=row]")}'
        ],
        chatTimestamp       : [
           ".qzhwtbm6.knvmm38d .ojkyduve .g0qnabr5",
           ".hzawbc8m > .ltmttdrg > .m9osqain > .g0qnabr5",
           'SPAN:not(:has(SPAN)) {propMatch("innerText", "^[0-9]{1,2} ?[a-z]$")}'  // 1h, 1 h, 10d, 10 d, 35m, 35 m
        ],
        chatParsingThrottled: 'DIV[role=main] SPAN {propMatch("innerText", localizedKeywords.FacebookMsgs.ChatParsingThrottled)},DIV[id="splash-screen"]',
        chatLinkUrl : "a[role='link'] {href}", // chat link for fetching the chat id
        conversationSelection: 'a[role="link"] {click().sleep(5)}', // long sleep since it sometimes takes a while for convo to switch
        messageBox          : "div[role='main']",// the current conversation box
        messageBoxParticipantName: 'DIV {propMatch("ariaLabel", localizedKeywords.FacebookMsgs.ParticipantName).ariaLabel.match(localizedKeywords.FacebookMsgs.ParticipantName)[1]}',
        messageBoxRoomName: [
//            "DIV[role='main'] {propMatch('ariaLabel', localizedKeywords.FacebookMsgs.GroupName).ariaLabel.match(localizedKeywords.FacebookMsgs.GroupName)[1]}",
            "DIV[role=main] DIV > H1 > SPAN {innerText}"
        ],
        messageScrollBox: '[data-release-focus-from="CLICK"]',  // this is not really the scrollbox, but we look for the parent scrollable
        messageBoxMain          : "DIV[role='main']",
        messageBoxMainAttr          : "DIV[role='main'] {ariaLabel}",
    
        messagesScrollBox: 'div[role=main] [data-release-focus-from="CLICK"]',  // this is not really the scrollbox, but we look for the parent scrollable
        dateDivs: 'div[role=main] div[role=gridcell][data-scope=messages_table]:has(DIV[data-scope=date_break])',
        messageAndDateDivs: 'div[role=main] div[role=gridcell][data-scope=messages_table] {!propMatch("innerText", localizedKeywords.FacebookMsgs.YouCanNowMessage)}',
        messageTimestampStr : "div[data-scope='date_break'] {innerText.trim()}",
        encryptedConvoButton: "DIV[role=button][aria-label=Continue]",
        editBox             : "div[role=textbox]",
        sendButton          : [
            'div[role=button][aria-label="Press enter to send"]',
            "div > div:nth-child(1) > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div > div.j83agx80.cbu4d94t.d6urw2fd.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.pfnyh3mw.jifvfom9.gs1a9yip.owycx6da.btwxx1t3.j83agx80.buofh1pr.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.l9j0dhe7.du4w35lb.cbu4d94t.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.g5gj957u.j83agx80.dp1hu0rb > div > div > div > div > div > div.rq0escxv.du4w35lb.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.g5gj957u.j83agx80.cbu4d94t.l9j0dhe7.ni8dbmo4.stjgntxs > div.iqfcb0g7.tojvnm2t.a6sixzi8.k5wvi7nf.q3lfd5jv.pk4s997a.bipmatt0.cebpdrjk.qowsmv63.owwhemhu.dp1hu0rb.dhp61c6y.l9j0dhe7.iyyx5f41.a8s20v7p > div > div > div > div.ntk0jbrt.pfnyh3mw > div > form > div > div.j83agx80.l9j0dhe7.aovydwv3.ni8dbmo4.stjgntxs.nred35xi.n8tt0mok.hyh9befq > span:nth-child(4) > div",
        ],
        messageAttachmentInput: [
            "INPUT[type=file]",
            "input.mkhogb32",
            "div > div:nth-child(1) > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div > div.j83agx80.cbu4d94t.d6urw2fd.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.pfnyh3mw.jifvfom9.gs1a9yip.owycx6da.btwxx1t3.j83agx80.buofh1pr.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.l9j0dhe7.du4w35lb.cbu4d94t.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.g5gj957u.j83agx80.dp1hu0rb > div > div > div > div > div > div > div.iqfcb0g7.tojvnm2t.a6sixzi8.k5wvi7nf.q3lfd5jv.pk4s997a.bipmatt0.cebpdrjk.qowsmv63.owwhemhu.dp1hu0rb.dhp61c6y.l9j0dhe7.iyyx5f41.a8s20v7p > div > div > div > div.ntk0jbrt.pfnyh3mw > div > form > div > div.aovydwv3.ni8dbmo4.stjgntxs.nred35xi.pmk7jnqg.k4urcfbm.flx89l3n.l9l1gxur.agkhgkm8 > div > input:nth-child(1)"
        ],
        basicEditBox: 'form textarea',
        basicForm: 'form[method="post"][enctype="multipart/form-data"]',
        basicMessageAttachmentInputOne: 'form input[name="file1"]',
        basicMessageAttachmentInputTwo: 'form input[name="file2"]',
        basicMessageAttachmentInputThree: 'form input[name="file3"]',
        // these can return a string if possible, otherwise any object to identify the case
        basicMessageCheckPermanentFailure: [
            '{urlMatch(/upload\\.facebook\\.com/g)} DIV#objects_container > DIV[title] {propMatch("title", localizedKeywords.FacebookMsgs.BasicMsgSendPermanentFailure).title.trim()}',
            'DIV > SPAN {propMatch("innerText",localizedKeywords.FacebookMsgs.BasicMsgInvalidRecipientFailure)}'
        ],
        basicMessageCheckRateLimitFailure: [
            // this appears to be a group chat specific error because the group chat doesn't appear in the mobile version...
            '{urlMatch(/upload\\.facebook\\.com/g)} DIV[role=main] SPAN {propMatch("innerText", localizedKeywords.FacebookMsgs.BasicMsgSendRateLimitFailure).innerText.trim()}',
            '{urlMatch(/upload\\.facebook\\.com/g)} DIV#objects_container > DIV[title] {title.trim()}',
        ],
        basicMessageCheckTemporaryFailure: '{urlMatch(/error_code/g)}',
        basicMessageCheckSentSuccess:
        [
            '{urlMatch(/mbasic\\.facebook\\.com\\/messages/g)} DIV[id="messageGroup"] ABBR {propMatch("innerText", "Just now")}'
//            '{urlMatch(/mbasic\\.facebook\\.com\\/messages/g)}',    // match almost anything for now
        ],
        sideBarButton: [
            'div.t6p9ggj4.tkr6xdv7 > div > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.pfnyh3mw.d2edcug0.hpfvmrgz.p8fzw8mz.pcp91wgn.iuny7tx3.ipjc6fyt > div > div > span > span > div > div.bp9cbjyn.pq6dq46d.mudddibn.taijpn5t.l9j0dhe7.ciadx1gn > div',
            'DIV[role=button] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationInformation)}'
        ],
        sideBarMenu: [
            'div.rq0escxv.pfnyh3mw.jifvfom9.gs1a9yip.owycx6da.btwxx1t3.j83agx80.buofh1pr.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.l9j0dhe7.du4w35lb.cbu4d94t.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.g5gj957u.j83agx80.dp1hu0rb > div > div > div > div > div > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.kuivcneq.g5gj957u.f4tghd1a.ifue306u.t63ysoy8 > div',
            'DIV[role=list]'
        ],
        sideBarMenuContainsMembers: [
            'DIV[role=list] {propMatch("innerText", localizedKeywords.FacebookMsgs.ChatMembers)}'
        ],
        
        conversationBox: 'DIV[aria-label=Chats] DIV[role=row] A[href*="%%ConversationID%%"] {closest("DIV[role=row]")}',
        conversationActionsButtonOpen: 'DIV[aria-label=Menu] {click()}',
        conversationActionsButtonClose: 'DIV[aria-label=Menu] {click()}',
        conversationMarkAsUnreadButton: [
            ':root DIV[role=menu] DIV[role=menuitem] {propMatch("innerText", localizedKeywords.FacebookMsgs.MarkAsUnread)}',
            'A[role=link] SPAN.xk50ysn > SPAN'
        ],
        conversationMarkAsReadButton: [
            ':root DIV[role=menu] DIV[role=menuitem] {propMatch("innerText", localizedKeywords.FacebookMsgs.MarkAsRead)}',
            'DIV[aria-label="Mark as read"]',
            'A[role=link] SPAN.x1s688f > SPAN'
        ],

        isSentChat: 'SPAN {propMatch("innerText", localizedKeywords.FacebookMsgs.SelfSent)}',
        isReceivedChat: [
            // sometimes an attachment will have the persons name so I added the !hasParent() checks
            'SPAN:not(:has(SPAN)) {propMatch("innerText", "^##ParticipantFirstName##$").!hasParent("A[aria-label=\"Open attachment\"]")}',  // a person will use the first name
            'SPAN:not(:has(SPAN)) {propMatch("innerText", "^##ParticipantName##$").!hasParent("A[aria-label=\"Open attachment\"]")}',       // a page will use the whole name
            'DIV:not(:has(DIV)) {propMatch("innerText", localizedKeywords.FacebookMsgs.TheyReplied)}',
        ],

        activeChatButtonTimestamp: 'a[aria-current="page"] span[data-testid="timestamp"]{innerText}',

        messageHeaderTitleContainer: [  // DRL FIXIT? Should this be merged with messengerConversationHeader?
            // group chat (must come before the one-on-one)
            'DIV[role=main] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationWith)} H1 > SPAN > SPAN {parentBySelector("DIV[role=button]").parentElement}',
            // one-on-one conversation
            'div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.g5gj957u.p8fzw8mz.iuny7tx3.ipjc6fyt.hyh9befq > div > div:nth-child(1)',
            'DIV[role=main] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationWith)} A H1 {parentBySelector("A[role=link]").parentElement}',
            'DIV[role=main] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationWith)} A {parentElement}',
        ],
        messageIsUnread: [
           'DIV {propMatch("aria-label", localizedKeywords.FacebookMsgs.MarkAsRead)}',
           'span.hihg3u9x.ggxiycxj.l9j0dhe7.hnhda86s.oo9gr5id.l3itjdph'
        ],
        messageNotViewed: [
            // William
            'svg[data-testid="message-delivery-status-icon-delivered"]',
            // Dominique
            'svg > title {propMatch("innerHTML", localizedKeywords.FacebookMsgs.ConversationDeliveredOrSent)}',
        ],
        messageViewedButNotAnswered: 'div[aria-hidden="true"] > div[role="row"] svg[role="img"]',
        messageIsNotResponded: [
            'div.bp9cbjyn.j83agx80.m9osqain.frgo5egb > span:first-of-type > span {propMatch("innerText",localizedKeywords.FacebookMsgs.ConversationNotResponded)}',
            'DIV[data-testid="threadlist-last-message"] > SPAN:first-of-type > SPAN {propMatch("innerText",localizedKeywords.FacebookMsgs.ConversationNotResponded)}',
            'SPAN:not(:has(SPAN)) {propMatch("innerText", "^[1-9]{1,2}[a-z]$").parentBySelector("DIV")} > SPAN:first-of-type > SPAN {propMatch("innerText",localizedKeywords.FacebookMsgs.ConversationNotResponded)}'  // 1h, 12d, 1m - then go up to DIV and down to subject
        ],
        messageIsOnline: [ // a green dot on the photo
            'span.pq6dq46d.jllm4f4h.iwuwq2lu.g5oefq77.oo8ov1ci.ce1xcart.bsodd3zb.xthkpp0z.s45kfl79.emlxlaya.bkmhp75w.spb7xbtv',
            'span.fxk3tzhb.p8bhzyuu.s9ok87oh.s9ljgwtm.lxqftegz.bf1zulr9.gvytbark.hh61tlkm.ntrxh2kl.jjmr0tki.fyx3dgpn.i1ozlmoo.rwcj441r.l81i4mgl.b0f3p4px.bshgfmwz.qmqpeqxj.e7u6y3za.qwcclf47.nmlomj2f'
        ],
        chatContactButtonsElements: [
            // for William
            'div[aria-label="Chats"] div[data-testid="mwthreadlist-item-open"]',
            // for Dominique
            'div[aria-label="Chats"] div[data-testid="mwthreadlist-item"]',
            'DIV[aria-label="Chats"] DIV[role=gridcell] A[role=link] {parentBySelector("DIV[role=gridcell]")}'
        ],
        messageElementWithId: 'a {href.match(/[0-9]+/g)}',  // relative from the above
        chatContactsActionBar: [
            '{urlMatch(/facebook\\.com/)} div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.pfnyh3mw.i1fnvgqd.bp9cbjyn.owycx6da.btwxx1t3.jei6r52m.wkznzc2l.n851cfcs.dhix69tm.ahb00how > div > div > div.rq0escxv.l9j0dhe7.du4w35lb.cbu4d94t.d2edcug0.hpfvmrgz.aovydwv3.j83agx80.dz1kfvuc.kb5gq1qc.pfnyh3mw.taijpn5t.b0upgy8r > div',
            '{urlMatch(/facebook\\.com/)} DIV[role=navigation] A[href="/messages/new/"] {parentElement.parentElement}',
            '{urlMatch(/messenger\\.com/)} div[data-testid=mw_skytale_left_rail_header] div.bp9cbjyn.j83agx80.k4urcfbm > div.bp9cbjyn.j83agx80.rj1gh0hx.buofh1pr.g5gj957u.bkfpd7mw',
            '{urlMatch(/messenger\\.com/)} DIV[data-testid=mw_skytale_left_rail_header] A[href="/new/"] {parentElement}',
            '{urlMatch(/messenger\\.com/)} A[aria-label="New message"] {parentElement.parentElement.parentElement}'
        ],
    
        body: [
            // if there's an IMG image and the alt is short (up to 4 byte unicode equivalent of a
            // smiley) we include its alt - we have this limitation to avoid matching on a contact photo
            // if there's an SVG image (usually a thumbs up) we include its title
            'DIV.x14ctfv:not(:has(DIV.x14ctfv)) {innerText},SPAN > IMG {propMatch("alt","^.{1,4}$").alt},DIV > SVG > title {textContent}',
            'DIV > SPAN > SPAN {innerText}',        // "Attachment Unavailable" message
            'DIV[aria-label=Play] {"Audio Clip"}',  // if there's only an audio clip let's provide a notice of this
        ],
        skipMessage: 'DIV[aria-label*="unsent a message"]',
        attachmentA: [
            'a[role="link"]:not([target="_blank"])',
        ],
        inlineAttachmentUrl: [
            'div[role=img][style*=background-image] { style.backgroundImage.match(/url\\("(.*)"\\)/)[1] }', // inline image
            'a[role=link][aria-label="Open photo"] img { href }', // image
            'a[role=link][target=_blank] { href }', // video link
        ],
        attachmentImageSrc: 'DIV[role=dialog] IMG:not([src*="data:"]) {src}',
        otherAttachmentsDownloadHref: 'a[aria-label="Download"]{href}',
        closeAttachmentPopup: 'div[role=dialog] {!hasParent("DIV[hidden]")} div[aria-label="Close"]',
        conversationIdChats: '\\/t\\/([0-9]+)',
        
        groupMessageScrapeCloseUsersModal: 'div[aria-label="Close"] i',
        isSentGroupChat: '???',
        isReceivedGroupChat: '???',
        // DRL FIXIT! I think that if it is sent it is always "by me".
        isSentByMe: 'span{propMatch("innerText", "You sent")}',
        
        roomInviteBtnAddPeopleClick: 'DIV[role="listitem"] DIV[role=button] SPAN {propMatch("innerText", "Add people").click()}',
        roomInviteBtnCollapseClick: 'DIV[role="listitem"] {propMatch("innerText", "Chat Members").click()}',
        roomInviteSearchContainer: 'DIV[aria-label="Add people"] INPUT[aria-label="Search"]',
        roomInviteUserBtnClick: 'DIV[aria-label="Add people"] DIV[role="checkbox"] SPAN[dir="auto"] {click()}',
        roomInviteCloseBtnClick: [
            'DIV[aria-hidden="false"] DIV[aria-label="Close"][role=button] {click()}',
            'DIV[role=dialog] DIV[aria-label="Close"][role=button] {click()}',
        ],
        roomInviteAddPeopleBtnClick: 'div[aria-label="Add people"][role="button"] {click()}'
    },
    FacebookPosts: {
        composer: [
            // for Dominique
            'DIV[role=button][onclick*=Composer]',
            // for William
            'div.k4urcfbm.g5gj957u.buofh1pr.j83agx80.ll8tlv6m > div > div.m9osqain.a5q79mjw.gy2v8mqq.jm1wdb64.k4urcfbm.qv66sw1b > span'
        ],
        postTextarea: [
            // for Dominique
            'TEXTAREA.composerInput',
            // for William
            'form div._5rpb > div[role="textbox"]'
        ],
        openPostAttachmentInput: [
            // for Fabien
            'div {propMatch("aria-label", localizedKeywords.FacebookPosts.openPostAttachmentInput)}',
            // for Dominique
            'BUTTON[type=button][data-sigil*=photo-button]',
            // for William
            'form > div > div.rq0escxv.du4w35lb.ms05siws.pnx7fd3z.b7h9ocf4.pmk7jnqg.j9ispegn.kr520xx4.pedkr2u6.oqq733wu > div > div > div > div.ihqw7lf3.discj3wi.l9j0dhe7 > div.scb9dxdr.sj5x9vvc.dflh9lhu.cxgpxx05.dhix69tm.wkznzc2l.i1fnvgqd.j83agx80.rq0escxv.ibutc8p7.l82x9zwi.uo3d90p7.pw54ja7n.ue3kfks5.tr4kgdav.eip75gnj.ccnbzhu1.dwg5866k.cwj9ozl2.bp9cbjyn > div:nth-child(2) > div > div:nth-child(1) > div > span > div > div > div:nth-child(1) > div > div > div.bp9cbjyn.j83agx80.taijpn5t.l9j0dhe7.datstx6m.k4urcfbm > i'
        ],
        postAttachmentInput: 'div.j83agx80.cbu4d94t.buofh1pr.l9j0dhe7 > div.scb9dxdr.qt6c0cv9.dflh9lhu.jb3vyjys > div > div.l9j0dhe7.du4w35lb.rq0escxv.j83agx80.cbu4d94t.d2edcug0.d8ncny3e.buofh1pr.g5gj957u.tgvbjcpo.cxgpxx05.sj5x9vvc > div > div > input',
        shareWith: [
            "#m_privacy_button_text_id",
            'div.a8nywdso.ihqw7lf3.rz4wbd8a.discj3wi.dhix69tm.wkznzc2l.j83agx80.bp9cbjyn > div.cbu4d94t.j83agx80 > div > div > div > div > div > span > div > div > div > span'
        ],
        sharePublic: [
            "LABEL[data-store*=\"300645083384735\"]",
            "div > div.ow4ym5g4.auili1gw.rq0escxv.j83agx80.buofh1pr.g5gj957u.i1fnvgqd.oygrvhab.cxmmr5t8.hcukyx3x.kvgmc6g5.hpfvmrgz.qt6c0cv9.jb3vyjys.l9j0dhe7.du4w35lb.bp9cbjyn.btwxx1t3.dflh9lhu.scb9dxdr.nnctdnn4 > div.ow4ym5g4.auili1gw.rq0escxv.j83agx80.buofh1pr.g5gj957u.i1fnvgqd.oygrvhab.cxmmr5t8.hcukyx3x.kvgmc6g5.tgvbjcpo.hpfvmrgz.qt6c0cv9.rz4wbd8a.a8nywdso.jb3vyjys.du4w35lb.bp9cbjyn.btwxx1t3.l9j0dhe7 > div.n851cfcs.ozuftl9m.n1l5q3vz.l9j0dhe7.o8rfisnq > div > div > i"
        ],
//      backgrounds: "DIV[role=button]._2k39",
        postButton: [
            "button[value=\"Post\"]",
            "div.rq0escxv.du4w35lb.ms05siws.pnx7fd3z.b7h9ocf4.pmk7jnqg.j9ispegn.kr520xx4.pedkr2u6.oqq733wu > div > div > div > div.ihqw7lf3.discj3wi.l9j0dhe7 > div.k4urcfbm.discj3wi.dati1w0a.hv4rvrfc.i1fnvgqd.j83agx80.rq0escxv.bp9cbjyn > div > div"
        ],
//    errorMessage: "div#open_view_error",
        progressBar: "SPAN[role=progressbar]",

//    get Comments

        postContainer2 : [
            // look for the element that has both the comment section and the SVG behind the video as a child as that will be the tree "root" of the post
            '{urlMatch(/\\/watch\\/\\?ref\\=saved/g)} DIV[role=button] > SPAN {propMatch("innerText",localizedKeywords.FacebookPosts.MostRelevant).parentBySelector("DIV:has(SVG[preserveAspectRatio])")}',
            '{urlMatch(/\\/watch\\/\\?ref\\=saved/g)} DIV#watch_feed SPAN {propMatch("innerText",localizedKeywords.FacebookPosts.NoComments).parentBySelector("DIV:has(SVG[preserveAspectRatio])")}',
            '{urlMatch(/\\/watch\\/\\?ref\\=saved/g)} DIV#watch_feed DIV.j83agx80.ad2k81qe.f9o22wc5.iq01arzp',
            // live videos have a fairly different format
            '{urlMatch(/\\/watch\\/live\\//g)} DIV.sq6gx45u.buofh1pr.cbu4d94t.j83agx80',
            // find the parent that has both the video presentation and the leave a comment button
            '{urlMatch(/\\/watch\\/live\\//g)} DIV[aria-label=Video] DIV[role=presentation] {parentBySelector("DIV:has(DIV[aria-label="Leave a comment"])")}',
            // at "/facebook.com\/[^\/]+\/videos\/[0-9]+/g" the post is at this DIV
            '{urlMatch(/facebook.com\\/[^\\/]+\\/videos\\/[0-9]+/g)} div[role="complementary"]',
            // look for the element that has both the ... menu button and the comment input control as a child as that will be the tree "root" of the post
            'DIV[aria-haspopup="menu"][role=button] > SVG {parentBySelector("DIV:has(DIV > FORM)")}',
            // look for the element that has both the ... menu button and the "Most Relevant" drop down as a child as that will be the tree "root" of the post
            // DRL FIXIT? What if there are no comments yet (see how I handle this case above)?
            'DIV[role=button] > SPAN {propMatch("innerText",localizedKeywords.FacebookPosts.MostRelevant).parentBySelector("DIV:has(DIV[aria-label="Actions for this post"])")}',
            // this seems to work elsewhere, but matches on comments above
//            "div[role=article]"
        ],
        // Facebook is now popping up some posts in a dialog when we try to action the comments, so we have to parse in the dialog
        postContainerPopup : 'DIV[role=dialog] DIV[aria-hidden=false] {propMatch("innerText", "Write a comment")}',
        postLoaded : "div[role=button]",
        notAGroupMember : 'DIV[aria-label="Join group"]',
        postUnavailable : 'a {propMatch("aria-label", localizedKeywords.FacebookPosts.postUnavailable)}',
        postVideoPause: 'div {propMatch("aria-label", localizedKeywords.FacebookPosts.postVideoPause)}',
        postAuthorURL : [
            // duplicated for FB posts below
            // NOTE: live video won't have an author we can easily get, so it's parsed at the "saved posts" page
            '{selfOrChildrenBySelector("H2 A")[0].href}',
            '{selfOrChildrenBySelector("A")[0].href}',
        ],
        
        postCommentComposerInput: [
            'input#composerInput',
            'textarea#composerInput'
        ],
        postCommentMentionsHidden: 'input[data-sigil*="mentionsHiddenInput"]',
        postCommentSubmitBtn: 'button[data-sigil*="composer-submit"]',

        articleActionsButton: 'div[aria-label="Actions for this post"]',
        articleSave: [
            'div[role="button"] span {propMatch("innerText", localizedKeywords.FacebookPosts.SavePostOrVideo)}',
            'div[role="menuitem"] span {propMatch("innerText", localizedKeywords.FacebookPosts.SavePostOrVideo)}',
        ],
        articleUnsave: [
            'div[role="button"] span {propMatch("innerText", localizedKeywords.FacebookPosts.UnsavePostOrVideo)}',
            'div[role="menuitem"] span {propMatch("innerText", localizedKeywords.FacebookPosts.UnsavePostOrVideo)}',
        ],
    
        articleSaveToListDialog: 'DIV[role=dialog][aria-label="Save To"]',
        // the following are relative to the above
        articleSaveToListAnyItem: 'DIV[role=radio] SPAN > SPAN',
        articleSaveToList: 'DIV[role=radio] SPAN > SPAN {propMatch("innerText", "For Automation Only").click()}',
        articleCreateCollectionButtonClick: 'DIV[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.CreateCollection).click()}',
        articleCreateCollectionEdit: 'INPUT[type=text]',
        articleSaveCollectionButtonClick: 'DIV[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.SaveCollection).click()}',
        articleSaveDoneClick: [
            // in fr-CA aria-label="Terminer"
            'div {propMatch("aria-label", localizedKeywords.FacebookPosts.articleSave).click()}',
            // Doms case it comes up as a black alert box in the lower left corner of the screen.
            ':root div[role=alert] a[href*="/saved"]'
        ],

        actionsDialog: 'div[role="menu"] div[aria-hidden="false"]',
        postContainerForCheckingAvailableScrapingMethod: [
            // starting from the ... menu
            // look for the element that has both the ... menu button and the "Share/Send" button as children as that will be the tree "root" of the post
            '{parentBySelector("DIV:has(DIV[aria-haspopup="menu"][role=button] > SVG):has(DIV[role=button] DIV > SPAN)")}',
//            '{parentBySelector("div[role="article"]")}',
//            '{parentElement.parentElement.parentElement.parentElement}'
        ],
        // aria label automatically translate itself
        // Actions for this post => Actions pour cette publication (fr-CA)
        postActionsBoxBtnForCheckingAvailableScrapingMethod: 'div {propMatch("aria-label", localizedKeywords.FacebookPosts.postActionsBoxBtnForCheckingAvailableScrapingMethod)}',
        postActionsBoxForCheckingAvailableScrapingMethod: [
            // for William
            'div[role="menu"] div[aria-hidden="false"]',
            // for Dominique
            'div[role="dialog"][aria-label="Post actions"] div[role="button"]',
            '#watch_feed > div > div > div > div > div:nth-child(2) div[aria-label="More"]'
        ],
        // postShareButton: 'div[aria-label="Send this to friends or post it on your timeline."]',
        postShareButton: 'div {propMatch("aria-label", localizedKeywords.FacebookPosts.postShareButton)}',
        // postShareDialogCopyLinkButton: "div[role='dialog'] {propMatch('innerText', 'Copy link')} div[data-visualcompletion='ignore-dynamic'] {propMatch('innerText', 'Copy link')} span {propMatch('innerText', 'Copy link')}",
        postShareDialogCopyLinkButton: "div[role='dialog'] {propMatch('innerText', localizedKeywords.FacebookPosts.shareDialogCopyLinkButton)} div[data-visualcompletion='ignore-dynamic'] {propMatch('innerText', localizedKeywords.FacebookPosts.shareDialogCopyLinkButton)} span {propMatch('innerText', localizedKeywords.FacebookPosts.shareDialogCopyLinkButton)}",
        postShareDialogCopyConfirmationBox: 'ul li {propMatch("innerText", "Link copied")}',
        checkImagePostHref: 'A[href*="photo/?fbid="]',
        imagePostHref: 'A[href*="photo/?fbid="] {href}',
        postActionBoxActionButtonsForScrapingViaSaving: [
            // should match articleSave and articleUnsave!
            'div[role="button"] span {propMatch("innerText", localizedKeywords.FacebookPosts.SavePostOrVideo)}',
            'div[role="menuitem"] span {propMatch("innerText", localizedKeywords.FacebookPosts.SavePostOrVideo)}',
            'div[role="button"] span {propMatch("innerText", localizedKeywords.FacebookPosts.UnsavePostOrVideo)}',
            'div[role="menuitem"] span {propMatch("innerText", localizedKeywords.FacebookPosts.UnsavePostOrVideo)}',
        ],
        checkPostActionBoxActionButtonsForScrapingViaEmbed: [
            'div[role="menuitem"] {propMatch("innerText", "Embed")}'
        ],
        postActionBoxActionButtonsForScrapingViaEmbed: [
            'div[role="menuitem"] {propMatch("innerText", "Embed")}'
        ],
        postHrefScrapingViaEmbed: 'DIV[role=dialog] input[aria-label="Sample code input"] {value.match(/(?<=href=)(.*)(?=&show_text=)/gm).decodeUriComponent()}',
        closeEmbedDialogButton: 'DIV[role=dialog] DIV[aria-label=Close]',
        postHrefViaPostedTimeLink: [
            // matches on comment link, but we have to remove the comment part so it's a permanent link
            // we also ignore inside a SPAN as this would be a link inside the post body
            'A[href*="/posts/"] {!hasParent("SPAN").href.replace(/\\?.*/, "")}',
            'h4 {parentBySelector("A").!propMatch("/users/").href}',
            'h3 {parentBySelector("A").!propMatch("/users/").href}',
            // 6 parents => next sibling => first a => child[1] => a
            // 53 47
        ],
        feedPostMbasic: 'input[name="view_overview"] {propMatch("value", localizedKeywords.FacebookPosts.feedPostMbasic)}',
        pagePostMbasic: 'input[name="view_post"] {propMatch("value", localizedKeywords.FacebookPosts.pagePostMbasic)}',
        storyPostCreate: 'a[href="/stories/create/"]',
        storyPostTextBtn: 'DIV[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.storyPostText)}',
        storyPostText: [
            // when you haven't added an image first
            'LABEL[aria-label="Start typing"] TEXTAREA',
            // when you have already added an image
            'DIV[role=textbox][aria-label="Start typing"]',
        ],
        storyPostAttachment: 'input[type="file"]',
        storyPostSubmit: 'DIV[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.storyPostSubmit)}',
        storyPostGoToNewPost: 'DIV.x1o62bnf {propMatch("innerText", localizedKeywords.FacebookPosts.storyPostYourStory)} DIV[role=button]',
        publicAudienceLink: 'FIELDSET > LABEL SPAN {propMatch("innerText", localizedKeywords.FacebookPosts.publicAudience).parentBySelector("LABEL")} INPUT[type=radio] {nextSibling}',
        publicAudienceDone: 'INPUT[type=submit][value=Done]',
        pageAttachmentError: 'div[id="objects_container"] > div > div > span',
        feedAttachmentError: 'div[id="objects_container"] > div > div > span',
        pagePostTextField: 'textarea[name="xc_message"]',
        feedPostTextField: 'textarea[name="xc_message"]',
        pagePostAttachment: 'input[type="image"]',
        feedPostAttachment: 'input[type="image"]',
        pagePostAddAttachmentButton: 'input[name="view_photo"]',
        feedPostAddAttachmentButton: 'input[name="view_photo"]',
        pagePostButton: 'input[name="view_post"]',
        feedPostButton: 'input[name="view_post"]',
        pagePostAttachment1: 'input[name="file1"]',
        pagePostAttachment2: 'input[name="file2"]',
        pagePostAttachment3: 'input[name="file3"]',
        feedPostAttachment1: 'input[name="file1"]',
        feedPostAttachment2: 'input[name="file2"]',
        feedPostAttachment3: 'input[name="file3"]',
        pagePostAttachmentPreviewButton: 'input[name="add_photo_done"]',
        feedPostAttachmentPreviewButton: 'input[name="add_photo_done"]',
        feedPostPrivacy: 'input[name="view_privacy"]',
        mComposerBtn: '#MComposer div[role="button"]',
        mPrivacyBtn: '#m_privacy_button_text_id',
        mAudienceOptions: 'fieldset[data-sigil="audience-options-list"] > label > div > div',
        mComposerInput: 'textarea.composerInput',
        mMentionsHidden: 'input[data-sigil=" mentionsHiddenInput"]',
        mSubmitBtn: 'button[data-sigil="submit_composer"]',
        watchLivePath: "/watch/live/",
    },
    FacebookGroupPosts: {
        // composer: 'div.rq0escxv.l9j0dhe7.du4w35lb.hpfvmrgz.buofh1pr.g5gj957u.aov4n071.oi9244e8.bi6gxh9e.h676nmdw.aghb5jc5.gile2uim.qmfd67dx > div:nth-child(1) > div > div > div > div.bp9cbjyn.j83agx80.ihqw7lf3.hv4rvrfc.dati1w0a.pybr56ya > div',
        composer: 'a {propMatch("aria-label", localizedKeywords.FacebookPosts.composer).parentElement.parentElement.nextSibling}',
        postTextarea: 'DIV[role=dialog] FORM DIV[role=textbox]',
        openPostAttachmentInput: 'DIV[role=dialog] FORM DIV[role=button][aria-label="Photo/video"]',
        postAttachmentInput: 'DIV[role=dialog] FORM INPUT[type=file]',
        postButton: 'DIV[role=dialog] FORM DIV[role=button][aria-label=Post]',
        progressBar: "SPAN[role=progressbar]",  // not currently used

        // comment on group post using mbasic.facebook.com
        postCommentComposerInput: 'textarea#composerInput',
        postCommentSubmitBtn: 'input[type=submit][value=Comment]',
    },
    FacebookComments: {
        // for live video the comments appear on a different page
        commentsFromLiveButton: '{urlMatch(/facebook.com\\/watch\\/live\\//g)} SPAN {propMatch("innerText", localizedKeywords.FacebookPosts.Comments, "i").parentBySelector("DIV[role=button]")}',
        // usually there's a drop down list of comment options
        postOpenCommentsButton: [
// DRL FIXIT! This was for William but it breaks in my case because it matches in the open and closed state.
//            'div.bp9cbjyn.j83agx80.pfnyh3mw.p1ueia1e > div:nth-child(1) > div > span',
            'div[role=button][aria-expanded=false] {propMatch("innerText", localizedKeywords.FacebookPosts.Comments)}',
            'div[role=button]:not([aria-expanded]) span {propMatch("innerText", localizedKeywords.FacebookPosts.Comments)}'
        ],
        postHideCommentsButton: [
            'div[aria-label="Hide"][role="button"]',
            'div[role=button][aria-expanded=true] {propMatch("innerText", localizedKeywords.FacebookPosts.Comments)}'
        ],
        postMostRelevantCommentSelector: 'div[role=button] span {propMatch("innerText", localizedKeywords.FacebookPosts.MostRelevant)}',
        postShowAllCommentsButtonOnMostRelevantCommentSelector: [
            // pick "All Comments" over "Newest"
            ':root div[role=menu] div[role=menuitem] span {propMatch("innerText", localizedKeywords.FacebookPosts.allComments)}',
            ':root div[role=menu] div[role=menuitem] span {propMatch("innerText", localizedKeywords.FacebookPosts.Newest)}'
        ],
        viewMoreComments: 'div[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.viewMoreComments)}',
        commentContainers: 'div[role=article][aria-label*="Comment by"],div[role=article][aria-label*="Reply by"]',
        // the following are relative to the container
        commentTimestamp : [
            '[role=link][tabindex="0"] {propMatch("innerText", /^([0-9]+)/).innerText}', // must start with a number such as "1d" or "1 d"
            'DIV[role=article] {propMatch("aria-label", /comment (\\d+ .* ago)$/).ariaLabel.match(/comment (\\d+ .* ago)$/)[1]}', // looks like: Reply by Ching Schueddig to Kim Harris-Mustafa's comment 19 hours ago
            'DIV[role=article] {propMatch("aria-label", /comment ([an]{1,2} .* ago)$/).ariaLabel.match(/comment ([an]{1,2} .* ago)$/)[1]}', // looks like: Reply by Ching Schueddig to Kim Harris-Mustafa's comment a day ago|an hour ago
        ],
        commentAuthor : "a > span > span",
        commentAuthorUrl : 'a > span > span {parentBySelector("a").href}',
        commentAuthorRoles : [
            'span div:not([role=button]) span[dir="auto"] {propMatch("innerText", /[^\\+]/).innerText}',   // the button check is to avoid "Follow" button, the "+" check is to skip "+2" type items
            'div[aria-label="Identity Badges"] div span {innerText}',
        ],
        commentSeeMoreButton : 'div[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.SeeMore)}',
        commentText2: "span > div > div[dir=auto] {getText()}",

        // if we don't wait long enough here the following selectors will match on the wrong textbox
        replyButton: 'ul li div {propMatch("innerText", "Reply").click().sleep(5)}',
        // go up to the nearest parent with the textbox then go to the textbox
        mentionEditBox: '{parentBySelector(":has(DIV[role=textbox])")} DIV[role=textbox]',
        // DRL FIXIT? I think this box is the one for the post, in case the one right under the reply button isn't found?
        inputEditBox: '{parentBySelector(":has(DIV[role=textbox])")} DIV[role=textbox]'
    },
    FacebookGroups: {
        facebookGroupIDForPage: [
            // group admin
            'A[href*="/groups/"][href*="/overview"] {href.match(/\\/groups\\/([0-9]+)\\/overview/)[1]}',
            // non-member or member with group members shown
            'A[href*="/groups/"][href*="/user/"] {href.match(/\\/groups\\/([0-9]+)\\/user\\//)[1]}',
            // non-member with no group members shown
            'SCRIPT {innerText.match(/"groupID":"(\\d+)"/)[1]}',
        ],

        // we use this to identify whether the group page has loaded (we're not being throttled, maybe this is a bad name)
        facebookGroupHasLoaded: [
            'DIV[role=main] A[href*=members',      // group members page
            'DIV[role=main] DIV[aria-label=Create]', // group questions page
            'DIV[role=main] H2 SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.AboutThisGroup)}', // not a member
            'A {propMatch("aria-label", localizedKeywords.FacebookGroups.ContentUnavailable)}'   // no access to group
        ],
        // we use this to identify whether the logged in user can administer the group
        facebookGroupCanAdminister: "DIV [aria-label='Group navigation'] DIV > SPAN {propMatch('innerText', localizedKeywords.FacebookGroups.CommunityHome)}",
        facebookGroupContentUnavailable : [
            'a {propMatch("aria-label", localizedKeywords.FacebookGroups.ContentUnavailable)}',
            'SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.TemporarilyUnavailable)}'   // page is broken for now
        ],
    
        facebookGroupName: [
            'DIV[role=main] H1 A[href*="/groups/"] {innerText}',
            'DIV[role=main] H2 A[href*="/groups/"] {innerText}'
        ],
        isFacebookGroupMember: 'DIV[role=main] DIV[aria-label="Joined"][role=button],DIV[role=main] DIV[aria-label="Invite"][role=button]',
        isFacebookGroupAdmin: 'DIV[aria-label="Group navigation"] A[href*="/member-requests/"]',
        facebookGroupQuestionsContainer: 'div[role=main]',
        // if the above returns no results the below checks we're actually scraping OK
        facebookGroupHasNoQuestions: 'DIV[role=main] DIV[aria-label] {propMatch("aria-label", localizedKeywords.FacebookGroups.AddQuestion)}',
        // if it has the question label and the "Delete" button it's the wrapper for the question element
        facebookGroupQuestions: 'DIV > SPAN[dir=auto] {propMatch("innerText", localizedKeywords.FacebookGroups.QuestionLabel).parentBySelector("DIV:has(DIV[aria-label*="Delete"])")}',
        facebookGroupQuestionTypeText: 'DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.WriteYourAnswer)}',
        facebookGroupQuestionTypeOptions: 'DIV > I[data-visualcompletion="css-img"]',
        facebookGroupQuestionTextLabel: [
            'DIV.bdao358l.om3e55n1.g4tp4svg.alzwoclg.cqf1kptm.jez8cy9q.gvxzyvdx.aeinzg81.i5oewl5a.nnzkd6d7.bmgto6uh.f9xcifuu > SPAN[dir=auto] {innerText}',
            'DIV.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xeuugli.xsyo7zv.x16hj40l.x10b6aqq.x1yrsyyn > SPAN[dir=auto] {innerText}'
        ],
        // this is currently the same as the above label
        facebookGroupQuestionOptionsLabel: [
           'DIV.bdao358l.om3e55n1.g4tp4svg.alzwoclg.cqf1kptm.jez8cy9q.gvxzyvdx.aeinzg81.i5oewl5a.nnzkd6d7.bmgto6uh.f9xcifuu > SPAN[dir=auto] {innerText}',
           'DIV.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xeuugli.xsyo7zv.x16hj40l.x10b6aqq.x1yrsyyn > SPAN[dir=auto] {innerText}'
        ],
        facebookGroupQuestionOptionsLabels: 'DIV > I[data-visualcompletion="css-img"] {parentElement.parentElement} SPAN {innerText}',
        // The checkbox and radio buttons have been a pain to figure out. Facebook keeps changing the styling and
        // image size and filename and the last time I checked the PNG seems to be a long image containing multiple
        // icons and the background-position Y value is used to select the most appropriate one, but this value
        // changes because as I mentioned the image size changes.
        facebookGroupQuestionIconUrl: 'I[data-visualcompletion="css-img"] {style.backgroundImage.substring(5).replace("\\")", "")}',
        facebookGroupQuestionIconYOffset: 'I[data-visualcompletion="css-img"] {style.backgroundPosition.match(/[-\\d]+px ([-\\d]+)px/)[1]}',
        facebookGroupQuestionIconWidth: [
            'I[data-visualcompletion="css-img"] {style.backgroundSize.match(/([-\\d]+)px [-\\d]+px/)[1]}',
            'I[data-visualcompletion="css-img"] {style.width.match(/([-\\d]+)px/)[1]}'
        ],
        // remove these after v2.80...
        facebookGroupQuestionIsCheckbox: 'I[style*="XzlAawcKgDp.png"],I[style*="background-position: 0px -168"],I[style*="background-size: 25px"]',
        facebookGroupQuestionIsRadio: 'I[style*="Y1xA6EPY3kw.png"],I[style*="DaH-gEMOrSR.png"],I[style*="background-position: 0px -100px;"],I[style*="background-size: 31px"],I[style*="background-size: 16px"],I[style*="background-position: 0px -415"]',
    
        memberRequestsNone: [
            'DIV[role=main] SPAN {propMatch("aria-label", localizedKeywords.FacebookGroups.NoGroupRequests)}',
            'DIV[role=main] SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.NoPendingMembers)}',
        ],
        memberRequestContainer: 'DIV[aria-label="Group content"] DIV.xamitd3.x1sy10c2.xieb3on.x193iq5w.xrljuej.x1aody8q',
        // the parent of both the SVG and the Approve button is the container of the request
        // NOTE: the below is similar to memberRequestContainerItem
        memberRequestContainers: 'A SVG {parentBySelector("DIV:has(DIV[aria-label*=Approve]:not([aria-label="Approve all"])[role=button])").parentElement}',
        // The regexp returns an array, the first is the full string so remove it, the rest can contain undefined items but our Selector.js code removes those leaving only the matched date (if any)
        memberRequestContainerDate: [
            'DIV > SPAN > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.MemberDate).innerText.match(localizedKeywords.FacebookGroups.MemberDateMatch).slice(1)}',
            'DIV > DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.MemberDate).innerText.match(localizedKeywords.FacebookGroups.MemberDateMatch).slice(1)}'
        ],
        memberCreatedGroup: [
            'DIV > SPAN > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.CreatedGroup)}',
            'DIV > DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.CreatedGroup)}'
        ],

        memberRequestContainerName: 'span > span > span > a {innerText.trim()}',
        // below is almost identical to the above as it's the same element
        memberRequestsProfileUrl:   'span > span > span > a {href}',
        memberRequestReferrerUrl: [
            'DIV > DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.InvitedBy)} A[href*="/user/"] {href}',
        ],
        memberRequestQuestionElement: 'ul li',
        memberRequestQuestionElementQuestionAnswerText: 'span',
        memberRequestLinks: 'a[role=link] {href}',
        // NOTE: the below is similar to memberRequestContainers
        memberRequestContainerItem : 'a[href="/groups/%%GroupID%%/user/%%UserID%%/"] {parentBySelector("DIV:has(DIV[aria-label=Approve][role=button])").parentElement}',
        memberRequestApproveButton: 'DIV[aria-label=Approve][role=button]',
        memberRequestDeclineButton: 'DIV[aria-label=Decline][role=button]',
        memberRequestOpenMoreMenu: 'DIV[aria-label="More request options"][role=button] {click().sleep(1)}',
        memberRequestMoreMenuItemDecline: 'DIV[role=menuitem] SPAN {propMatch("innerText","Decline with feedback").click().sleep(1)}',    // DRL FIXIT? Translation.
        memberRequestDeclineOtherRadio: 'DIV[role=dialog][aria-label="Decline with feedback"] DIV[aria-checked=false][role=radio] {merge.[-1].click()}',
        memberRequestDeclineOtherReason: 'DIV[role=dialog][aria-label="Decline with feedback"] TEXTAREA',
        memberRequestDeclineOtherClose: 'DIV[role=dialog][aria-label="Decline with feedback"] DIV[role=button][aria-label="Decline"] {click()}',
    
        staffMembersContainer: "DIV[role=main] DIV > H2 > SPAN {propMatch('innerText', localizedKeywords.FacebookGroups.SectionGroupStaff).parentBySelector('DIV:has([role='listitem'])')}",
        // this is from the above, and is the root for the following
        staffMemberContainerElement: "[role='listitem']",
        staffMemberName: 'span > span > span > a {innerHTML}',
        staffMemberProfileUrl: 'span > span > span > a {propMatch("href",/((?<=user\\/).*(?=\\/))|((?<=user\\/).*(?=\\/)?)/g).href}',
        staffMemberRoles: [
            'div > span > span > div > span > span.a8c37x1j.ni8dbmo4.stjgntxs.l9j0dhe7.ltmttdrg.g0qnabr5 {innerText.trim()}',
            'div > span > span > div > span > span {innerText.trim()}',
        ],
    
        memberCount: [
           'A[href*="/members/"] {propMatch("innerText", localizedKeywords.FacebookGroups.MemberCount).innerText.split(" ")[0].replace(",","")}',
           'SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.MemberCount).innerText.split(" ")[-1].replace(",","")}'
        ],
        memberGatherContainer: [
            // when the list is a parent of the header
            "DIV[role=main] DIV > H2 > SPAN {propMatch('innerText', localizedKeywords.FacebookGroups.SectionGroupMembers).parentBySelector('DIV[role=list]')}",
            "DIV[role=main] DIV > H2 > SPAN {propMatch('innerText', localizedKeywords.FacebookGroups.SectionGroupMembers).parentBySelector('DIV:has(DIV[role=listitem])')}",
            // when we have to go up and then back down to find the list NEXT to the header
            "DIV[role=main] DIV > H2 > SPAN {propMatch('innerText', localizedKeywords.FacebookGroups.SectionGroupMembers).parentBySelector('DIV.bdao358l.om3e55n1.g4tp4svg.alzwoclg.cqf1kptm.cgu29s5g.dnr7xe2t')} DIV[role=list]",
        ],
        allMembersGatheredToScrape: "[role='listitem']",
        // from each of the above members as a starting point, here's what we can get...
        memberGatherContainerName: [
            "SPAN > SPAN > SPAN > A[role=link] {innerText}",
            // closed account?
            "DIV > SPAN > SPAN > A[role=link] {innerText}",
            // someone without a name, shows their email address instead and it's not clickable, was invited?
            "DIV > DIV > SPAN:not(:has(A)) {innerText}",
        ],
        // The regexp returns an array, the first is the full string so remove it, the rest can contain undefined items but our Selector.js code removes those leaving only the matched date (if any)
        memberGatherContainerDate: 'DIV > SPAN > SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.MemberDate).innerText.match(localizedKeywords.FacebookGroups.MemberDateMatch).slice(1)}',
        memberGatherContainerUrl: [
            "SPAN > SPAN > SPAN > A[role=link] {href}",
            // closed account?
            "DIV > SPAN > SPAN > A[role=link] {href}",
        ],
        memberGatherContainerInvitedOnly: 'SPAN > DIV {propMatch("innerText", localizedKeywords.FacebookGroups.InvitedOnly)}',
        // closed account?
        memberGatherContainerNoUrl: [
            'DIV > SPAN > SPAN > A[role=link] {propMatch("href","#")}',
            // someone without a name, shows their email address instead and it's not clickable, was invited?
            "DIV > DIV > SPAN:not(:has(A)) {innerText}",
        ],
        memberReferrerUrl: [
            'SPAN > DIV {propMatch("innerText", localizedKeywords.FacebookGroups.InvitedBy)} A[href*="/user/"] {href}',
        ],
    
        memberProfileUnavailable: 'DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.UnavailableProfile)}',
        memberProfileLoaded: 'SPAN > SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.Intro)}',
        memberAnswersContainer: 'SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.SectionMembershipQuestions).parentBySelector(":has(DIV[role=button])")}',
        memberViewAnswersButton: 'SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.ViewAnswers).parentBySelector("DIV[role=button]")}',
        memberViewNoAnswersYetButton: 'SPAN {propMatch("innerText", localizedKeywords.FacebookGroups.NoAnswersYet).parentBySelector("DIV[role=button]")}',
        memberQuestionsDialog: 'div[aria-label="Membership questions"]',
        memberQuestionsContainer: [ // DRL FIXIT? This should be called memberQuestionContainers as it returns an array.
            // Dominique
            'DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.pfnyh3mw.d2edcug0.hpfvmrgz.buofh1pr > DIV {merge.slice(1)}',  // the first item is the dialog header so we remove it to get only the question items
            // William (for Dominique this SOMETIMES matched on the "Edit Answers" button)
            'div > div > div h2 {parentElement.parentElement.lastChild.lastChild.lastChild.lastChild.lastChild.children}',
        ],
        memberQuestionsContainerQuestion: [
            // Dominique
            '.j83agx80.cbu4d94t.ew0dbk1b.irj2b8pg > div > span{merge[0].innerText}',    // the first match is the question
            // William
            'span > span{merge[0].innerText}',
        ],
        memberQuestionsContainerAnswer: [
            // Dominique
            '.j83agx80.cbu4d94t.ew0dbk1b.irj2b8pg > div > span{merge[1].innerText}',    // the second match is the answer
            // William (for Dominique there was no second match)
            'span > span{merge[1].innerText}',
        ],
    },
    FacebookProfile:{
        // this button can appear in a section for "People You May Know" so we have to exclude those and we
        // currently do it by looking for a parent DIV though it would be better to check for a sibling but
        // we need to enhance hasSibling() to support super selectors
        friendButton: [
            // looks like "friend" could be upper or lower case
            'DIV[role="main"] DIV[role=button][aria-label="Add Friend"] {hasParent("DIV.alzwoclg.o7bt71qk.hnay576k.rng1terr.osvssn79.a62vtrwy,DIV.xsgj6o6.xw3qccf.x1xmf6yo.x1w6jkce.xusnbm3")}',
            'DIV[role="main"] DIV[role=button][aria-label="Add friend"] {hasParent("DIV.alzwoclg.o7bt71qk.hnay576k.rng1terr.osvssn79.a62vtrwy,DIV.xsgj6o6.xw3qccf.x1xmf6yo.x1w6jkce.xusnbm3")}'
        ],
        cancelFriendButton: [
            // looks like "request" could be upper or lower case
            'DIV[role="main"] DIV[role=button][aria-label="Cancel Request"]',
            'DIV[role="main"] DIV[role=button][aria-label="Cancel request"]'
        ],
        unfriendButton: [
            'div.iqfcb0g7.tojvnm2t.a6sixzi8.k5wvi7nf.q3lfd5jv.pk4s997a.bipmatt0.cebpdrjk.qowsmv63.owwhemhu.dp1hu0rb.dhp61c6y.l9j0dhe7.iyyx5f41.a8s20v7p > div > div > div.rq0escxv.jgsskzai.cwj9ozl2.nwpbqux9.io0zqebd.m5lcvass.fbipl8qg.nwvqtn77.ni8dbmo4.stjgntxs > div > div > div > div.j83agx80.cbu4d94t.buofh1pr.l9j0dhe7 > div > div:nth-child(3) > div.bp9cbjyn.j83agx80.btwxx1t3.buofh1pr.i1fnvgqd.hpfvmrgz > div > div > span',
            'DIV[role="main"] DIV[role=button][aria-label="Friends"]'
        ],
    },
    InstagramMsgs: {
        primaryTabIsActive: "div.x1n2onr6.x6s0dn4.x78zum5 a[href='/direct/inbox/']",
        generalTabIsActive: "div.x1n2onr6.x6s0dn4.x78zum5 a[href='/direct/inbox/general/']",
        chatInfoName: "[role='button'] [aria-labelledby] > div:nth-child(2) > div:nth-child(2)",
        chatInfoButton: 'SVG[aria-label="View Thread Details"] {parentBySelector("BUTTON")}',
        chatInfoCloseButton: [
            'SVG[aria-label="Navigate back to chat from thread details"] {parentBySelector("BUTTON")}',  // old
            "div.pV7Qt._6Rvw2.qF0y9.Igw0E.IwRSH.YBx95.ybXk5._4EzTm.i0EQd > div:nth-child(2) button"  // first button in second column
        ],
        // the chat wrapper contains both the profile image and the conversation info text, and from there we
        // want to get just the users name(s)
        chatElem: 'SPAN[role=link][tabindex="-1"] > IMG[alt*="profile"] {parentBySelector("DIV:has(DIV > SPAN > SPAN")} DIV > SPAN > SPAN',
        chatElemName: '',
        chatsLoading: '[data-visualcompletion="loading-state"]',

        threadMessagesOpenButton: 'DIV[role="listitem"] {parentBySelector("DIV")}',
        threadDetailsMessagesUsername: "DIV[role=button] > DIV[aria-labelledby] DIV._aacl._aaco._aacw._aacx._aad6 {innerText}",
        threadMessagesCloseButton: 'DIV svg[aria-label="Navigate back to chat from thread details"] {parentBySelector("BUTTON")}',

        dateDivs: 'SECTION > DIV DIV:not(:has(DIV)) {propMatch("innerText", "am$|pm$|AM$|PM$")}',    // change to pass "i" flag after v1.51
        messageAndDateDivs: 'SECTION > DIV DIV[role=listbox]:not(:has(DIV[role=listbox])), SECTION > DIV DIV:not(:has(DIV)) {propMatch("innerText", "am$|pm$")}',
        sentFolderCheck: '{parentBySelector("DIV[role=listbox]")} ._acqu',
        inboxFolderCheck: '{parentBySelector("DIV[role=listbox]")} ._acqv',
        body: "span {innerText} {merge('')}",
        audioAttachments: "audio > source {src}",
        videoAttachments: "video > source {src}",
        imageAttachments: "img {src}",
    
        openAccountsDialogClick: 'SVG[aria-label="Down chevron icon"] {parentBySelector("BUTTON").click().sleep(1)}',
        accountsItem: "DIV[role=dialog] DIV[aria-labelledby]",
        accountsItemButtonClick: "{simulateClick().sleep(3)}",
        closeAccountsDialogClick: 'SVG[aria-label="Close"] {parentBySelector("BUTTON").click().sleep(1)}',
        
        newMessageButton: 'div[role="button"] {propMatch("innerText", "Send message")}',
        userSearch: '[name="queryBox"]',
        userList: 'H1 {propMatch("innerText", "New message")} {parentElement.nextSibling.nextSibling.nextSibling.firstChild.firstChild} > div[role="button"]',
        nextButton: ".cB_4K:not([disabled])",
        infoButton: "BUTTON.wpO6b.ZQScA",
        messageTextarea: ".ItkAi textarea",
        sendButton: ".JI_ht > button",
        loginDialogBoxCloseButton: 'button svg[aria-label="Close"]{.parentElement}',


        chatContactButtonsElements: 'DIV[aria-label="Chats"] DIV[role=listitem] {parentElement}',
        messengerSidebarContactName: 'IMG {parentElement.parentElement.parentElement.parentElement.nextSibling.firstChild} SPAN {innerText}',
        messengerSidebarContactUsername: ".NeverMatchesAnything",  // looks like there's no way to get it
        messengerActionsHeader: 'svg[aria-label="New message"]{parentElement.parentElement}',
        messageIsUnread: 'span[data-visualcompletion="ignore"]',
        messageIsOnline: 'div:not(:has(SPAN)) {propMatch("innerText", "Active")}',
        
        conversationHeader: 'div._ab8s._ab8w._ab94._ab99._ab9f._ab9m._ab9o._abcm > div._ab61',
        conversationHeaderName: 'div._aa4o div:nth-child(2) button {innerText}',
        conversationHeaderNameElement: 'div._aa4o div:nth-child(2) button',
        conversationHeaderAddress: "div._aa4o div:nth-child(1) button img {alt.split(\"'s\")[0]}",
        contactTagsLocation: 'div._ab8s._ab8w._ab94._ab99._ab9f._ab9m._ab9o._abcm > div._ab61 > div > div > div > div',
        chatContactsActionBar: [
            '{urlMatch(/instagram\\.com/)} svg[aria-label="New message"] {parentElement.parentElement.parentElement.parentElement}'
        ],
        messageNotViewed: [
            'svg > title {propMatch("innerHTML", localizedKeywords.FacebookMsgs.ConversationDeliveredOrSent)}',
        ],
        messageIsNotResponded: [
            'div.bp9cbjyn.j83agx80.m9osqain.frgo5egb > span:first-of-type > span {propMatch("innerText",localizedKeywords.InstagramMsgs.ConversationNotResponded)}',
            'DIV[data-testid="threadlist-last-message"] > SPAN:first-of-type > SPAN {propMatch("innerText",localizedKeywords.InstagramMsgs.ConversationNotResponded)}',
            'SPAN:not(:has(SPAN)) {propMatch("innerText", "^[1-9]{1,2}[a-z]$").parentBySelector("DIV")} > SPAN:first-of-type > SPAN {propMatch("innerText",localizedKeywords.InstagramMsgs.ConversationNotResponded)}',  // 1h, 12d, 1m - then go up to DIV and down to subject
        ],
        messageViewedButNotAnswered: 'SPAN:not(:has(SPAN)) {propMatch("innerText", "^[1-9]{1,2}[a-z]$").parentBySelector("DIV")} > SPAN:first-of-type > SPAN {propMatch("innerText",localizedKeywords.InstagramMsgs.ConversationNotResponded)}',
    },
    InstagramPosts: {
        instagramButton: "#media_manager_chrome_bar_instagram_icon",
        createPostButton: [
            "#mediaManagerLeftNavigation .yukb02kx",
            "DIV.tb2mzrle.kpktq7sn.lvc0iid1.p7k9k0yn.aj9uqy00.aut7kocs.fislnrqo.reiujez5 DIV[role=button]"],
        instagramFeedButton: 'div[role="menu"] div[role="menuitem"]',
        slidingTray: "#creator_studio_sliding_tray_root",
        addFileButton: "div[aria-haspopup] i",
        uploadFileButton: "div.uiContextualLayer.uiContextualLayerBelowLeft a:first-of-type",
        accountNames: '#creator_studio_sliding_tray_root [role="button"] span > div[style]',
        fromFileUploadButton: 'input[type="file"]',
        captionTextarea: 'div[aria-autocomplete="list"]',
        postButton: "._3qnf > ._1qjd",
        tabHeader: "#tabHeader",
        tabHeaderDropdown: "#tabHeader i",
        dropdownAccountNames: ".uiScrollableAreaContent > div > div > div:nth-child(3) > div:first-child",
        singleAccountName: "#tabHeader > div> div:nth-child(2) > div"
    },
    PinterestScrape: {
        randomDialogCloseBttn: "DIV[role=dialog] BUTTON[aria-label=cancel]",
        headerProfile: 'div[data-test-id="header-profile"] > a',
        createButton: 'div[data-test-id="boardActionsButton"] button',
        createPinButton: 'div[data-test-id="Create Pin"] div[role="button"]',
        pinTitleTextarea: 'textarea[id^="pin-draft-title"]',
        imageInput: 'input[id^="media-upload-input"]',
        descriptionTextarea: 'div[aria-autocomplete="list"]',
        linkTextarea: 'textarea[id^="pin-draft-link"]',
        altTextButton: 'div[data-tutorial-id^="pin-builder-title"] button',
        altTextarea: 'textarea[id^="pin-draft-alttext"]',
        boardSelectButton: "button[data-test-id=\"board-dropdown-select-button\"]",
        boardSearchInput: "input#pickerSearchField",
        foundBoards: '[data-test-id="boardWithoutSection"] div[role="button"]',
        createBoardButton: 'div[data-test-id="create-board"] div[role="button"]',
        createBoardFinalButton: 'div[aria-label="Board form"] button',
        savePinButton: 'button[data-test-id="board-dropdown-save-button"]',
        seeItNowButton: 'div[data-test-id="seeItNow"] > a',
        messagesButton: [
            'button[aria-label=Messages]',
            '[aria-label=Messages][role=button]'
        ],
        chatDivs: '.appContent > .zI7 ul > div [role="button"]',
        chatTimestamp: ".Eqh .swG",
        backButton: 'button[aria-label="Back to conversations list"]',
        moreParticipants: '.appContent > .zI7 > div >div > div:first-child [style="cursor: none;"] > div',
        participants: '.appContent BUTTON[aria-label="Back to conversations list"] {parentElement} DIV > a',
        participantID: '{href.replace(/\\/+$/,"").split("/").pop()}',   // get the last segment from the path
        participantName: "{innerText.trim()}",
        messageDivs: ".appContent > DIV.zI7 > DIV > DIV > DIV:nth-child(2) > DIV > DIV.Jea > DIV > DIV > DIV > DIV > DIV > DIV.hjj",
        composeButton: 'button[aria-label="Compose new message"]',
        returnToConversationsButton: "button[aria-label=\"Back to conversations list\"]",
        contactSearch: "#contactSearch",
        searchResults: ".Cii .Ll2 > div",
        messageTextarea: "#messageDraft",
        messageSendButton: "button[aria-label=\"Send message to conversation\"]",
        classElemUnk: '.Fje',
        pinterestMessageBody: 'span {innerText}',
    },
    TikTokScrape: {
        findLoggedUserId: 'html {html().match(/uniqueId":".*?(",)/g}',
        videoInput: 'input[type="file"]',
        coverCandidate: "video.candidate",
        captionTextarea: "div[aria-autocomplete]",
        canviewPublic: 'input[type="radio"][value="0"]',
        canviewPrivate: 'input[type="radio"][value="1"]',
        canviewFriends: 'input[type="radio"][value="2"]',
        allowComments: 'input[value="comment"]',
        allowDuet: 'input[value="duet"]',
        allowStitch: 'input[value="stitch"]',
        postButton: [
           "button.btn-post",   // older version
           "button.tiktok-btn-pc-primary"
        ],
        viewProfileButton: "div.modal > div:nth-child(3)",
        videoLinks: [
            "div.video-feed a",  // older version
            "div[data-e2e=user-post-item] a"
        ],
        messageEditor: 'div.notranslate.public-DraftEditor-content',
        conversationMessages: 'DIV.conversation-container DIV.conversation-main > DIV',
        sendMessageButton: 'div.send-button',
        profileMessageSendButton: '.tiktok-1djryq8-DivMessageContainer > a',
        parentSpanContainsCheck: '{parent} span {classList.contains("checked")}',
    },
    TikTokMessages: {
        chatScroll: '.side-scroll-wrapper',
        chatsList: '.side-scroll-wrapper > div',
        chatTimestamp: '.info-time',
        userUniqueId: '.unique-id',
        participantName: '.nickname',
        chatsListItemClickAble: '.info-text-wrapper',
        messageBox: '.conversation-main',
        messageContainer: '.conversation-main > div',
        messageContainerMsg: '.conversation-main > div.conversation-item-wrapper',
        parentFromMessageDivMyself: 'div {classList}',
    },
    TwitterScrape: {
        homeButton: 'a[href="/home"]',
        tweetTextarea: 'div[aria-multiline]',
        imageInput: 'input[type="file"]',
        errorMessage: 'DIV[role=alert]',
        tweetButton: 'div[data-testid="tweetButtonInline"]',
        tweetLink: 'div[data-testid="tweet"] a[aria-label]',
        messagesPage: 'a[aria-label="Direct Messages"] div',
        composeMessage: 'a[aria-label="Compose a DM"] div',
        searchProfile: 'input[aria-label="Search query"]',
        profilesList: [
            'li[role="listitem"] div[dir="ltr"] span',  // old
            "DIV[data-testid=typeaheadResult] DIV[data-testid=TypeaheadUser] > DIV:nth-child(2) DIV.css-901oao.css-bfa6kz.r-14j79pv.r-18u37iz.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-qvutc0 > SPAN"
        ],
        messageNextButton: 'div[data-testid="nextButton"]',
        messageTextarea: 'div[data-testid="dmComposerTextInput"]',
        inputFile: 'input[type="file"]',
        sendMessageButton: 'div[aria-label="Send"]',
        cancelMessageButton: 'div[aria-modal="true"] div[aria-label="Close"]',
        conversationsList: 'div[aria-label="Timeline: Messages"] > div >  div',
        // NOTE: there are differences depending on how wide the window is.
        messagesContainer: [
            'section[aria-labelledby="detail-header"] > div:nth-child(2) > div  > div > div  > div > div  > div > div:last-child  > div > div',
            "DIV.css-1dbjc4n.r-16y2uox.r-1h0z5md.r-1jgb5lz > DIV > DIV"
        ],
        // messagesContainer: "[role=\"main\"] > div > div > div > div:nth-child(2) > div > div > div > div > div > div > div"
        chatProfileLink: [
            '[aria-labelledby="detail-header"] [role="button"] > div > div:nth-child(1) [role="link"] {href.replace("/", "").trim()}',
            'DIV[data-testid="UserCell"][role="button"] > div > div:nth-child(2) A[role="link"] {href.replace("/", "").trim()}'
        ],
        chatProfileName: [
            '[aria-labelledby="detail-header"] [role="button"] > div A[role="link"] span > span {innerText.trim()}',
            'DIV[data-testid="UserCell"][role="button"] > div > div:nth-child(2) A[role="link"] span > span {innerText.trim()}'
        ],
        chatInfo: '[aria-label="Conversation info"], [aria-label="Group info"]',
        chatInfoBack: '[aria-label="Back"]',
        msgTimeButton: '> div[role="button"] > div > div > div[dir="auto"]',  // this is actually a parameter to find(), and we have the intermediate divs to avoid getting the "Seen"
        msgEntry: '[data-testid="messageEntry"]',
        msgLink: 'div[data-focusable="true"][role="link"]',
        chatsTab: 'div[role="tab"]',
        returnFromChatsTab: 'div[aria-label="Back"][role="button"]',
        children: '{childNodes}',
        firstChildOfFirstChild: '{childNodes[0]}{childNodes[0]}',
    },
    Pages: {
        // DRL FIXIT? For this section we may want to conform to the following for each platform for conversation pages:
        // - an entry to find the header for a conversation - our icon is positioned here
        // - an entry to find the display name (name) inside the header
        // - an entry to find the username (handle) inside the header
        // and perhaps similar standards for profile pages and posts. The goal being that we can easily change the
        // constants when the site changes their UI, preferably without having to change our code.
        profileNameFB: [
            "DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.pfnyh3mw.taijpn5t.gs1a9yip.owycx6da.btwxx1t3.ihqw7lf3.cddn0xzi SPAN > H1.gmql0nx0.l94mrbxd.p1ri9a11.lzcic4wl.bp9cbjyn.j83agx80 {innerText}",
            "DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.g5gj957u.d2edcug0.hpfvmrgz.on77hlbc.buofh1pr.o8rfisnq.ph5uu5jm.b3onmgus.ihqw7lf3.ecm0bbzt DIV.bi6gxh9e.aov4n071 > H2.gmql0nx0.l94mrbxd.p1ri9a11.lzcic4wl.d2edcug0.hpfvmrgz > SPAN {innerText}",
            "DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.pfnyh3mw.d2edcug0.bp9cbjyn.jb3vyjys DIV.bi6gxh9e.aov4n071 > SPAN > H1 {innerText}",
            "div > div:nth-child(1) > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div > div.j83agx80.cbu4d94t.d6urw2fd.dp1hu0rb.l9j0dhe7.du4w35lb > div.j83agx80.cbu4d94t.dp1hu0rb > div > div > div:nth-child(1) > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.pfnyh3mw.taijpn5t.gs1a9yip.owycx6da.btwxx1t3.ihqw7lf3.cddn0xzi > div > div > div > div.j83agx80.psu0lv52.mpmpiqla.ahl66waf.tmq14sqq.rux31ns4.gy1kt949.sjcfkmk3.dti9y0u4.nyziof1z > div > div > div > div > div > span > h1 {innerText}",
            'DIV[role=main] SPAN > DIV > H1 {innerText}',
            'DIV[role=main] DIV > SPAN > H1 {innerText}',
            'DIV[role=main] DIV > H2 > SPAN > SPAN {innerText}',
        ],
        facebookProfileActions: [
            'div.btwxx1t3.j83agx80.bp9cbjyn div[aria-label="localizedKeywords.FacebookProfile.Message"] {parentElement.parentElement.parentElement}',
            'div[data-pagelet="ProfileActions"] div[aria-label="localizedKeywords.FacebookProfile.Message"] {parentElement.parentElement.parentElement}',
            // the tabindex=-1 below is the only way we distinguish this scenario from the "Message" button on a contact hover! (below)
            // 'DIV[role="main"] DIV[role=button]:not([tabindex="-1"]) {propMatch("aria-label", localizedKeywords.FacebookProfiles.Message).parentElement.parentElement.parentElement}',
            // It should be parent element of action buttons.
            // I've seen pages with two Message buttons, one having a parent that is hidden, so we check for this
            'DIV[role="main"] DIV[role=button]:not([tabindex="-1"]) {propMatch("aria-label", localizedKeywords.FacebookProfiles.Message).!hasParent("DIV[hidden]").parentElement.parentElement.parentElement.parentElement}',
        ],
        
        // these three are very similar to the ones at customListItems, keep them in sync!
        // first we find the wrapper for the friends section, then we find each individual friend item
        friendsListProfileActions: 'DIV[aria-label="Custom Lists"][role="main"] DIV > SPAN > SPAN > A {parentBySelector("DIV:has(DIV[aria-label="Tap to Delete"][role="button"])")}',
        friendsListProfileUrl: 'DIV > SPAN > SPAN > A {href}',
        friendsListProfileName: 'DIV > SPAN > SPAN > A {innerText}',
        
        personCardFB: 'DIV[role=dialog] DIV[role=button] {propMatch("aria-label", localizedKeywords.FacebookProfiles.Message).parentBySelector("DIV[style]")}',
        personCardFBProfileURL: [
            'A:not([href*="/stories/"]):not([href*="l.facebook.com/l.php"]) SPAN {parentBySelector("A").href}',
            'A[role=link]:not([href*="/stories/"]):not([href*="l.facebook.com/l.php"]):not(:has(SVG)):not(:has(IMG)) {href}',
        ],
        personCardFBName: [
            'SPAN > A[role=link]:not(:has(SVG)):not(:has(IMG)) {innerText.trim()}',
            'A:not(:has(SVG)):not(:has(IMG)) SPAN {parentElement.innerText.trim()}',
        ],
        // DRL FIXIT! We should split this for items with different URL styles using urlMatch!
        postAuthorFB: [
            // live
            '{urlMatch(/facebook.com\\/watch\\/live\\//g)} div[role=main] div[data-instancekey] div.l9j0dhe7.fdg1wqfs.jq4qci2q.av1wybal.j102wcjv a',
            // everything else
            "DIV[role=article] DIV.pybr56ya.dati1w0a.hv4rvrfc.n851cfcs.btwxx1t3.j83agx80.ll8tlv6m DIV.j83agx80.cbu4d94t DIV.qzhwtbm6.knvmm38d > SPAN.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.oi732d6d.ik7dh3pa.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.fe6kdd0r.mau55g9w.c8b282yb.iv3no6db.jq4qci2q.a3bd9o3v.knj5qynh.m9osqain.hzawbc8m",
            "DIV[role=article] DIV.pybr56ya.dati1w0a.hv4rvrfc.n851cfcs.btwxx1t3.j83agx80.ll8tlv6m DIV.j83agx80.cbu4d94t DIV.qzhwtbm6.knvmm38d > SPAN > H4 SPAN > A[role=link]",
            // posts on someones profile page
            "DIV[role=article] DIV.pybr56ya.dati1w0a.hv4rvrfc.n851cfcs.btwxx1t3.j83agx80.ll8tlv6m DIV.j83agx80.cbu4d94t DIV.qzhwtbm6.knvmm38d > SPAN > H3 SPAN > A[role=link]",
            "DIV[role=article] DIV.pybr56ya.dati1w0a.hv4rvrfc.n851cfcs.btwxx1t3.j83agx80.ll8tlv6m DIV.j83agx80.cbu4d94t DIV.qzhwtbm6.knvmm38d > SPAN > H2 SPAN > A[role=link]",
            'div.buofh1pr > div > div:nth-child(1) > span > div > h2 > span > span > a',
            'div.rs0gx3tq.oi9244e8.buofh1pr > div > div:nth-child(1) > span > h2 > span > a',
            'div[role="complementary"] span[dir="auto"] > h2',
            'div[aria-label="Videos on Facebook Watch"] div[aria-label="Like"][role="button"]{parentElement}',
            'div[role="complementary"] h2 a[role="link"]',
            'div#watch_feed h2 a[role="link"]'      // https://www.facebook.com/watch/?ref=saved&v=356971973159738
//            'div[role=main] div[role=article]'
        ],
        generalPostMenuLocation: [
            // looking for the clickable date element as this will hold the permalink, and it must contain a
            // SPAN to be the date link otherwise it's likely someone's name link
            // your personal profile page, the ":not(:has(b/strong))" avoids matching on a persons name
            '[aria-labelledby] SPAN:not(:has(strong)) > A:not([aria-hidden=true]):has([aria-labelledby]):not(:has(b)).x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz',
            '[aria-labelledby] SPAN:not(:has(strong)) > A:not([aria-hidden=true]):has([aria-labelledby]):not(:has(b)).x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xt0b8zv.xo1l8bm',
            '[aria-labelledby] A:not([aria-hidden=true]):has([aria-labelledby]):not(:has(strong)):not(:has(b)).x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g',
            // here we also check the /user/ for some user cases not caught by the SPAN check
            'SVG[title^="Shared with"] {parentElement.parentElement.parentElement.parentElement} A:has(SPAN):not([aria-hidden=true]):not([href*="/user/"])',
            // want to support group scheduled posts too (before they are posted)
            '[aria-labelledby] SPAN:not(:has(strong)) > A:not([aria-hidden=true]):not(:has(b)).x1i10hfl.xjbqb8w.x6umtig.x1b1mbwd.xaqea5y.xav7gou.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xt0b8zv.xo1l8bm',
/* No longer needed now that we use the "date" item, but keeping the below in case Facebook breaks this.
            // personal feed, groups
            '{urlMatch(/facebook.com\\/$|facebook.com\\/groups\\//g)} div {propMatch("aria-label", localizedKeywords.FacebookPosts.postActionsBoxBtnForCheckingAvailableScrapingMethod).parentElement}',
            // pages and profiles
            '{urlMatch(/facebook.com\\/[a-zA-Z0-9]+(\\/$|\\/search|\\/\\?)?|facebook.com\\/profile\\.php/g)}  div {propMatch("aria-label", localizedKeywords.FacebookPosts.postActionsBoxBtnForCheckingAvailableScrapingMethod).parentElement}',
            'div[role=main] > #watch_feed > div > div > div > div > div div[aria-label="More"][role="button"]'
*/
        ],
        facebookOpenPostWatchLive: 'div.i09qtzwb.rq0escxv.n7fi1qx3.pmk7jnqg.j9ispegn.kr520xx4.nhd2j8a9',
        savedPostExpandList: 'DIV[role=navigation] DIV[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.SeeMoreList).click()}',
        savedPostChooseList: 'DIV[role=listitem] SPAN > SPAN {propMatch("innerText", "For Automation Only").click().sleep(3)}',
        // this is the wrapper of the saved post item
        savedPostActionsContainerFB: [
            // For William
            'div.hpfvmrgz.knvmm38d.dhix69tm.i1fnvgqd.buofh1pr.cbu4d94t.j83agx80 > div > div:nth-child(3) > div.lhclo0ds.btwxx1t3.j83agx80 {parentNode.parentNode.parentNode}',
            // For Dom, DRL FIXIT? This isn't showing in a very good location!
            //'a[href] div.pmk7jnqg.k4urcfbm.datstx6m img {parentNode.parentNode.parentNode.parentNode.parentNode.parentNode}'
            'DIV.p8bdhjjv > DIV.alzwoclg.om3e55n1.mfclru0v',
            // find wrapper as element having both the ... menu and the post IMG as children
            'DIV[role=main] DIV[aria-label] {propMatch("aria-label", localizedKeywords.FacebookPosts.More)} i {parentBySelector("DIV:has(IMG)")}'
        ],
        // find the type of the post which is displayed in a SPAN as either "Post" or "Video"
        isSupportedSavedPostType: 'DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookPosts.SupportedSavedPostTypes)}',
        savedPostActionsCollectionFB: [
            'div[role="main"] a[role="link"] span span'
        ],
        savedPostActionsCollectionAppendMenuToFB: '{parentElement.parentElement.parentElement.parentElement}',
        savedPostActionsCollectionPermanentLinkFB: '{parentElement.parentElement.href}',
        // these are starting from the savedPostActionsContainerFB node
        savedPostHref: "a {href}",
        savedPostAuthorURL: [
            'A > SPAN {parentElement.!propMatch("href", "/watch").href}',   // sometimes we get two matches and the first one is the "watch" URL so skip it
            "a {nextElementSibling} > :nth-child(2) span > a {href}",
        ],
//        savedPostAuthorName: "a {nextElementSibling} > :nth-child(2) span > a > span {innerText.trim()}",
        savedPostBody: "a span span {innerText.trim()}",
        savedPostUnsaveMenuClick: 'DIV[role=button] {propMatch("aria-label", localizedKeywords.FacebookPosts.More).click()}',
        savedPostUnsaveButtonClick: ':root DIV[role=menuitem] {propMatch("innerText", localizedKeywords.FacebookPosts.RemoveFromCollection).click().sleep(1)}',
    
        groupMenuLocation: [
            // old group layout, next to group name
//            'div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.d2edcug0.g5gj957u.p8fzw8mz.pcp91wgn.ipjc6fyt.rj1gh0hx.dtpq6qua.p01isnhg.ihqw7lf3.bkfpd7mw > div',
            // new group layout 10 Aug 22, to the left of "Create post" or "Joined" button
//            '[role=main] DIV[aria-label="Create post"] {parentBySelector("DIV")}',
//            '[role=main] DIV[aria-label="Joined"] {parentBySelector("DIV")}',
            // next to ... menu button
            // the not() below avoids matching on some posts that have a "..." menu as well
            '[role=main] DIV[aria-label=More]:not(.xt0b8zv) i {parentBySelector("DIV[aria-label=More]").parentElement.parentElement}'
        ],
    
//        facebookGroupQuestions: 'div.sej5wr8e div.tvmbv18p > span[dir="auto"]',
//        facebookGroupQuestionsTypeElement: '{parentElement.parentElement.parentElement.nextSibling.nextSibling.innerText}',
//        facebookGroupQuestionsLabel: '{parentElement.parentElement.parentElement.nextSibling.innerText}',
//        facebookGroupQuestionOptionElements: '{parentElement.parentElement.parentElement.nextSibling.nextSibling.firstChild.firstChild.children}',
//        facebookGroupQuestionsOptionElementInnerText: '{innerText}',
//        facebookGroupQuestionsOptionElementLabel: '{parentElement.parentElement.parentElement.nextSibling.innerText}',
    
        /* instagramConversationHeader: 'div.x1vjfegm > div > div > div:nth-child(2) a {parentElement}', */
        instagramConversationHeader: 'DIV[role="main"] {firstChild.firstChild.firstChild.firstChild}',
        instagramConversationHeaderName: 'DIV {firstChild.firstChild.nextSibling.firstChild.firstChild} SPAN {innerText}',
        instagramConversationHeaderNameElement: 'DIV {firstChild.firstChild.nextSibling.firstChild.firstChild}',
        // select all the sender icons and get the URL from one of them
        //instagramConversationHeaderAddress: "div._aa4o div:nth-child(1) button img {alt.split(\"'s\")[0]}",
        instagramConversationHeaderAddress: "div.x1vjfegm > div > div > div:nth-child(2) a {href.split(\"'s\")[0]}",

        instagramMessengerSidebarContacts: 'DIV[role="listitem"]',
        instagramMessengerSidebarContactNameElement: 'DIV {nextSibling.firstChild} DIV',
        instagramMessengerSidebarContactName: 'DIV {nextSibling.firstChild} DIV {innerText}',
        instagramMessengerSidebarContactUsername: ".NeverMatchesAnything",  // looks like there's no way to get it
        
        pinterestConversationHeader: "DIV.QLY._he.p6V.zI7.iyn.Hsu DIV.tBJ.dyH.iFc.sAJ.O2T.tg7.IZT.mWe.CKL A {parentElement}",
        pinterestConversationHeaderName: "A {innerText.trim()}",
        pinterestConversationHeaderAddress: "A {href.split('/')[3]}", // https://www.pinterest.ca/MyName/
        twitterConversationHeader: "DIV[data-testid=conversation] > DIV",
        twitterConversationHeaderName: "DIV.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1wbh5a2.r-dnmrzs.r-1ny4l3l > DIV:nth-child(1) SPAN {innerText.trim()}",
        twitterConversationHeaderAddress: "DIV.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1wbh5a2.r-dnmrzs.r-1ny4l3l > DIV:nth-child(2) SPAN {propMatch('innerText', /@/).innerText.replace('@', '').trim()}",
        tiktokConversationHeader: "div.conversation-header",
        tiktokConversationHeaderName: "p.nickname {innerText}",
        tiktokConversationHeaderAddress: "p.unique-id {propMatch('innerText', /@/).innerText.replace('@', '').trim()}",

        // also used for group chats below
        messengerConversationHeader: [  // DRL FIXIT? Should this be merged with messageHeaderTitleContainer?
            // one-on-one conversation
            // messenger.com
            'DIV[role=main] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationWith)} A H1 {parentBySelector("A[role=link]")}',
            // facebook.com/messages
            'DIV[role=main] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationWith)} A H2 {parentBySelector("A[role=link]")}',
            // group chat
            'DIV[role=main] {propMatch("aria-label", localizedKeywords.FacebookMsgs.ConversationWith)} H1 > SPAN > SPAN {parentBySelector("DIV[role=button]")}',

            // works with fr-CA and english on messenger and facebook
            'H1 > SPAN > SPAN.a8c37x1j {parentBySelector("DIV[role=button]")}',
            // For Dominique in both
            'H2 > SPAN.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.oi732d6d.ik7dh3pa.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.fe6kdd0r.mau55g9w.c8b282yb.iv3no6db.a5q79mjw.g1cxx5fr.lrazzd5p.oo9gr5id.oqcyycmt {parentBySelector("DIV[role=button]")}',
            // in Messenger.com?? Dom: If I put this first I get multiple matches.
            'DIV.f4tghd1a.ifue306u.kuivcneq.t63ysoy8 SPAN > A[role=link] {parentBySelector("DIV[role=button]")}',
            'div h1 span span'
        ],
        messengerConversationHeaderName: "SPAN > SPAN {innerText}",  // offset from the above
        messengerConversationHeaderProfileID: "{href.match(/\\/([0-9]+)/)[1]}",  // also offset from the above
        messengerConversationListItem: [
            // for William
            'div[data-testid="mwthreadlist-item-open"] a',
            // for Dominique Messenger.com
            'DIV[role=gridcell] > DIV > A[role=link]',
            'DIV[aria-label="Chats"] DIV[role=gridcell] > A[role=link]',
            // for Facebook.com/messages
            'DIV[aria-label="Chats"] DIV[role=gridcell] > DIV > DIV > DIV > A[role=link]',
        ],
        messengerConversationListItemName: "SPAN > SPAN {innerText}",  // offset from the above, may return multiple, use first
        // this has to work for both "facebook.com/messages/t" and "messenger.com/t"
        messengerConversationListItemID: "{href.match(/\\/t\\/([0-9]+)/)[1]}",  // also offset from the above
        
        // Removed in v1.109...
        // based from messengerConversationHeader
        messengerGroupChatParticipantsBtnClick: '{click()}',    // the header is clickable
        messengerGroupChatParticipantsCloseBtnClick: 'DIV:not([aria-hidden="true"]) DIV[aria-label="Close"][role=button] {click()}',
        messengerGroupChatParticipantsPopup: 'div[role="dialog"]:not([aria-label=Notifications])',
        // the parent of both the IMG and the ... menu is the container of the participant
        messengerGroupChatParticipantContainers: 'svg[role="img"] {parentBySelector("DIV:has(DIV[aria-expanded][role=button])")}',
        // the following are based from the above
        messengerGroupChatParticipantUserId: 'svg[role="img"] {parentBySelector("A").href.match(/\\/t\\/([0-9]*)\\//)[1]}',
        messengerGroupChatParticipantName: 'div > span > span {innerText}',
        // End removal
    
        messengerGroupChatSidebarOpenParticipants: 'div[aria-label="Chat members"][aria-expanded="false"]',
        messengerGroupChatSidebarParticipantContainers: 'div[aria-label="Chat members"] {parentElement.parentElement} div[role="listitem"]:has(div[aria-label*="Message"])',
        messengerGroupChatSidebarParticipantMenu: '[aria-haspopup="menu"]',
        messengerGroupChatSidebarParticipantUserId: ':root [role="menuitem"] {propMatch("innerText", "View profile").href.match("facebook.com/([0-9]+)/")[1]}',
        messengerGroupChatSidebarParticipantName: 'div > span > span {innerText}',
        
        profileNameInsta: "main[role=main] > div > header > section > ul {nextSibling.firstChild}",
        postAuthorInsta: "article > div",
        postPageAuthorInsta: 'main[role=main]',
        postWrapperPint: "DIV[data-test-id=pinWrapper]",
        returnToConversationsButtonPint: "button[aria-label=\"Back to conversations list\"]",
        conversationNamePint: "SPAN A",
        pinterestPostPageDropdownButtonLocationSelector: 'div[data-test-id="closeupActionBar"] > div > div[data-test-id="closeup-action-items"]',
        profileNameTikTok: [
           "DIV.share-title-container > H2.share-title",    // old?
           "DIV[data-e2e=user-page] H2[data-e2e=user-title]"
        ],
        postWrapperTikTok: "DIV[class*=DivVideoCardContainer]",

        profileNameSalesNavigator: "SPAN.profile-topcard-person-entity__name",
        profileNameTwitter: [
           "DIV.css-1dbjc4n.r-6gpygo.r-14gqq1x > DIV.css-1dbjc4n.r-1wbh5a2.r-dnmrzs.r-1ny4l3l > DIV.css-1dbjc4n.r-1wbh5a2.r-dnmrzs.r-1ny4l3l > DIV.css-1dbjc4n.r-1awozwy.r-18u37iz.r-dnmrzs > DIV.css-901oao.r-18jsvk2.r-1qd0xha.r-1vr29t4.r-bcqeeo.r-qvutc0",
           "DIV.css-901oao.r-1awozwy.r-18jsvk2.r-6koalj.r-37j5jr.r-adyw6z.r-1vr29t4.r-135wba7.r-bcqeeo.r-1udh08x.r-qvutc0 > SPAN.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0 > SPAN.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0",
            "div[data-testid=\"UserName\"] div[dir=auto] span span"
        ],
        postWrapperTwitter: "ARTICLE[data-testid=tweet] > DIV:first-child",
        
        gmailSender: [
            "TD[role=gridcell] SPAN[email]",                                        // email list view
            "DIV[role=listitem] TABLE.cf.gJ > TBODY > TR:first-child SPAN[email]"   // email item view
        ],
        gmailSenderName: "{getAttribute('name')}",
        gmailSenderEmail: "{getAttribute('email')}",
        outlookSender: "DIV[draggable=true] DIV.MtC_r.Lf0qr.jYIx5 > SPAN[title]",
        outlookSenderName: "{innerText.trim()}",
        outlookSenderEmail: "{getAttribute('title')}",

        profileNamePint: 'h1'
    },
    FacebookStories:{
        // NOTE: This must work for both the current story: (https://www.facebook.com/stories/1690134494403225/UzpfSVNDOjgxNjA3NzU1OTkwNzcyNw==/?bucket_count=9&source=story_tray)
        // as well as the story archive: https://www.facebook.com/stories/?card_id=UzpfSVNDOjEwNTE4OTcyODU2NjM0Njg%3D&view_single=true
        facebookStoryContentPanel: [
            '{urlMatch(/story_tray/g)} VIDEO {parentBySelector("DIV[data-id]").parentElement.parentElement.parentElement}',
            '{urlMatch(/story_tray/g)} IMG {parentBySelector("DIV[data-id]").parentElement.parentElement.parentElement}',
            '{urlMatch(/card_id/g)} DIV[data-id]:not([title]) {parentElement.parentElement.parentElement}',
        ],
        storyId: 'div[data-id] {getAttribute("data-id")}',
        storyPlayBtn: [
            'DIV[aria-label="Play"]',
            // we include this here just so the logic in the code doesn't fire an error when there's no button
            'DIV[role="button"] {propMatch("innerText", "Click to view story")}',
        ],
        storyPauseBtn: "div[aria-label='Pause']",
        storyIsLoaded: [    // the ... menu button on the story
            'DIV[role=button] DIV[aria-haspopup=menu]',
            'DIV[role=button][aria-haspopup=menu]',
            'DIV[role="button"] {propMatch("innerText", "Click to view story")}',
        ],
        previousStoryButton: 'DIV[id] DIV[role="button"]:has(DIV[aria-label="Previous Bucket"]) {click().sleep(2)}',
        getFacebookStoryNormalText: 'DIV[data-id] > DIV:nth-child(1) > DIV:nth-child(2) > DIV > DIV > DIV {innerText}',
        getFacebookStoryImageText: 'DIV[data-id] > DIV:last-child > DIV:last-child > DIV > DIV > DIV > DIV {innerText}',
        // this is used from the archive page...
        getFacebookStoryImage: [
           'DIV[data-id] > DIV:nth-child(1) > DIV > IMG {src}',
           // if this is a video we can get an image from the details on the right
           'DIV[aria-label="self story card"] IMG {src}'
        ],
        // this is used from the story page...
        getFacebookStoryVideo: 'VIDEO {src}',
        // when viewing the active story the reactions are in a slide-in item
        openFacebookStoryReactions: ':root DIV > I[aria-label="Show more"] {click().sleep(2)}',
        getFacebookStoryReactions: [
            // when viewing them in the slide-in
            ':root DIV[aria-label=Close][role=button] {parentElement} DIV[role=button] DIV > SVG[aria-hidden=true] > MASK {parentBySelector("DIV[role=button]")}',
            // when viewing them in the panel on the right
            ':root DIV[role=button] DIV > SVG[aria-hidden=true] > MASK {parentBySelector("DIV[role=button]")}',
        ],
        getReactionType: 'DIV > IMG[src*="data:image/svg"]',
        // these are in the Messenger pop-up...
        getReactionAuthorUrl: ':root div[role="banner"] {parentElement} > DIV[data-visualcompletion="ignore"] DIV[aria-label="Chat settings"] DIV > A {href}',
        getReactionAuthorName: ':root div[role="banner"] {parentElement} > DIV[data-visualcompletion="ignore"] DIV[aria-label*="Messages in conversation with"] SPAN > SPAN:not(:has(SPAN)) {parentElement.innerText}',
        closeReactionDetail: ':root div[role="banner"] {parentElement} > DIV[data-visualcompletion="ignore"] DIV[aria-label="Close chat"]',
        viewVideoButton: ':root DIV[id] DIV[role="button"] > SPAN {propMatch("innerText", "Click to view story")} {parentBySelector("div[role="button"]").click().sleep(4)}'
    },

    PostsFacebook: {
        // for a saved post on a page by itself
        postAuthorFB: [
            'H2 > SPAN SPAN > A',       // sometimes there's a STRONG in between
            'H3 > SPAN SPAN > A',       // sometimes there's a STRONG in between
            'SPAN > H2 > SPAN > A',
        ],
    
        postWrapperFromAuthor: [
            // finds the wrapper element given the author element
            // look for the element that has both the ... menu button and the "Share/Send" button as children as that will be the tree "root" of the post
            '{parentBySelector("DIV:has(DIV[aria-haspopup="menu"][role=button] > SVG):has(DIV[role=button] DIV > SPAN)")}',
        ],
    
        // these are from the wrapper above...
        postAuthorName: [
            // this one has to come first so that in a group post we catch the author item and not the group item
            '{selfOrChildrenBySelector("SPAN > SPAN > A > B")[0].parentElement.innerText.trim()}',
            '{selfOrChildrenBySelector("H2 A")[0].innerText.trim()}',
            '{selfOrChildrenBySelector("H3 A")[0].innerText.trim()}',
            '{selfOrChildrenBySelector("H4 A")[0].innerText.trim()}',
            '{selfOrChildrenBySelector("A")[0].innerText.trim()}',
        ],
        postAuthorURL: [
            // duplicated for FB comments above
            // NOTE: live video won't have an author we can easily get, so it's parsed at the "saved posts" page
            // this one has to come first so that in a group post we catch the author item and not the group item
            '{selfOrChildrenBySelector("SPAN > SPAN > A > B")[0].parentElement.href}',
            '{selfOrChildrenBySelector("H2 A")[0].href}',
            '{selfOrChildrenBySelector("H3 A")[0].href}',
            '{selfOrChildrenBySelector("H4 A")[0].href}',
            '{selfOrChildrenBySelector("A")[0].href}',
        ],
        postSeeMore: "DIV[role=button] {}",
        postSeeMoreClick: 'DIV[role=button] {propMatch("innerText", localizedKeywords.FacebookPosts.SeeMoreList).click().sleep(1)}',
        // DRL NOTE: This is now used for parsing the body of a post where it is normally seen such as
        // the feed as well as on a permalink page.
        postBody: [
            // this for an image post like https://www.facebook.com/photo/?fbid=522980346496628&set=a.519576596837003
            '{urlMatch(/facebook\\.com\\/photo\\//g)} :root DIV[role=complementary] DIV:not([class]) > DIV > SPAN {getText().trim().replace(/See less$/, "")}',
            // text post on a permalink page
            '{urlMatch(/\\/posts\\/|\\/permalink\\//g)} DIV[style] DIV[style][id] {getText()}',
            // this is for a text post in a group like https://www.facebook.com/groups/MBOBgroup/posts/1127899744755670/ or https://www.facebook.com/groups/MBOBgroup/permalink/1127899744755670/
            // I changed "/posts/" to "/groups/" below so it'll also work for group feed URLs
            '{urlMatch(/\\/groups\\/|\\/permalink\\//g)} DIV:not([class]) DIV[id] > SPAN {!propMatch("innerText","Comment$|Comments$").getText()}',    // match span first as the below could be an image
            '{urlMatch(/\\/groups\\/|\\/permalink\\//g)} DIV:not([class]) DIV[id] > DIV {getText()}',
            "DIV[data-ad-preview] > DIV > DIV.qzhwtbm6.knvmm38d > SPAN.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.oi732d6d.ik7dh3pa.fgxwclzu.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.fe6kdd0r.mau55g9w.c8b282yb.iv3no6db.jq4qci2q.a3bd9o3v.knj5qynh.oo9gr5id.hzawbc8m {getText()}",
            // image post in a group
            "DIV[data-ad-preview] > DIV > DIV > SPAN {getText()}",
            // for a post on a profile
            'DIV[id].x1yx25j4.x13crsa5.x6x52a7.x1rxj1xn.xxpdul3 {getText()}',
            "DIV.qt6c0cv9.hv4rvrfc.dati1w0a.jb3vyjys > DIV.f530mmz5.b1v8xokw.o0t2es00.oo9gr5id > DIV.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.c1et5uql {getText()}",
            // for a text, image or video post in a group
            "DIV.j83agx80.cbu4d94t.ew0dbk1b.irj2b8pg SPAN.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.oi732d6d.ik7dh3pa.ht8s03o8.a8c37x1j.fe6kdd0r.mau55g9w.c8b282yb.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.iv3no6db.jq4qci2q.a3bd9o3v.b1v8xokw.oo9gr5id.hzawbc8m {getText()}",
            // for a text post with a background in a group
            // DRL FIXIT? This post body has multiple pieces and we're only getting the first one:
            // https://www.facebook.com/realsabahali/posts/pfbid02C42XAKBKYE7XcRuBCB4WtdWiPa8ou36rFYEJnyHhy7Wi43H3avhgUhTjVUpxoxtBl
            "DIV:not([aria-hidden]) >DIV > DIV > DIV.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.c1et5uql {getText()}",
            'DIV[role=complementary] DIV > SPAN.xzsf02u.x1yc453h {getText()}',
        ],
        postImageUrls: [
            'A[role=link] DIV > IMG {src}',
            // this for an image post like https://www.facebook.com/photo/?fbid=522980346496628&set=a.519576596837003
            '{urlMatch(/facebook\\.com\\/photo\\//g)} :root IMG[data-visualcompletion] {src}',
            // this is for the cover image on a video post like https://www.facebook.com/groups/MBOBgroup/posts/1126253778253600/
            'DIV[data-instancekey] DIV[data-visualcompletion] > IMG {src}',
        ],
        postImageAltsStr: [
            'A[role=link] DIV > IMG[alt] {alt}{merge.join(" ")}',
            // this for an image post like https://www.facebook.com/photo/?fbid=522980346496628&set=a.519576596837003
            '{urlMatch(/facebook\\.com\\/photo\\//g)} :root IMG[data-visualcompletion][alt] {alt}{merge.join(" ")}'
        ],
        // some videos have their own post links
        postVideoLinkUrl: 'A VIDEO[src] {parentBySelector("A").href}',
        // some videos don't have their own post links, and skip videos posted in the comments (must check for both "Comment..." and "Reply...")
        postVideoUrl: 'VIDEO[src] {!hasParent("DIV[aria-label*=Comment]").!hasParent("DIV[aria-label*=Reply]").src}',

        postMenuButton: "[role=button][aria-haspopup=menu]",
        postMenu: ".j34wkznp.qp9yad78.pmk7jnqg.kr520xx4 [role=menuitem]",
        postPopupInput: "[role=dialog] input[type=text]",
        postPopupClose: "[role=dialog] [aria-label=Close]",
    
        // these are for video posts at a URL like https://www.facebook.com/watch/?ref=saved&v=906661030549648
        // so there's no post wrapper but there are multiple posts on the page so we have to be careful to
        // match on the first one
        videoPostAuthorName: [
            // this one has to come first so that in a group post we catch the author item and not the group item
            '{selfOrChildrenBySelector("SPAN > SPAN > A > B")[0].parentElement.innerText.trim()}',
            '{selfOrChildrenBySelector("H2 A")[0].innerText.trim()}',
            '{selfOrChildrenBySelector("H3 A")[0].innerText.trim()}',
            '{selfOrChildrenBySelector("H4 A")[0].innerText.trim()}',
            '{selfOrChildrenBySelector("A")[0].innerText.trim()}',
        ],
        videoPostAuthorURL: [
            'SPAN > SPAN > A > B {parentElement.href}',
            'H2 A > SPAN {parentElement.href}',
        ],
        // DRL FIXIT! This currently assumes a group post but what about a page or profile post??
        videoPostMessageBoxURL: [
            'SPAN > SPAN > A[href*="/groups/"] > B {parentElement.href}',
            'H2 A[href*="/groups/"] > SPAN {parentElement.href}',
        ],
    },
    PostsInstagram: {
        postWrapper: "ARTICLE",
        postAuthor: ".xt0psk2 > a",
        postSeeMore: "BUTTON.sXUSN",
        postBody: [
            "DIV[data-testid=post-comment-root] > SPAN._8Pl3R > SPAN",
            "DIV > UL > DIV > LI DIV > SPAN"
        ],
        postImages: "DIV.eLAPa > DIV.KL4Bh > IMG",
        postVideo: "VIDEO",
        postCommentButton: 'svg[aria-label="Comment"] {parentElement.parentElement}',
        postDialog: 'div[role="dialog"] > article[role="presentation"]',
        postTimestamp: 'time[datetime] {getAttribute("datetime")}'
    },
    PostsPinterest: {
        postAuthor: "DIV.tBJ.dyH.iFc.MF7.pBj.DrD.IZT.swG.z-6",
        postBody: "A > DIV.tBJ.dyH.iFc.MF7.pBj.DrD.mWe",
        postImage: "IMG",
        postVideo: "VIDEO",
    },
    PostsTikTok: {
        postWrapper: "DIV[class*=DivItemContainer]",
        postAuthor: "H3[class*=H3AuthorTitle]",
        postBody: "DIV[data-e2e*=video-desc]",
        postImage: "IMG[class*=ImgPoster]",
        postVideo: "DIV[class*=DivBasicPlayerWrapper] VIDEO",
        postBtnShare: "{parentElement} div.tiktok-wc6k4c-DivActionItemContainer.e1e0ediu0 span[data-e2e=\"share-icon\"] {parentElement}",
        postBtnEmbed: "a[data-e2e=\"video-share-embed\"]",
        postIdGetter: "textarea.tiktok-myg5zh-TextareaEmbedCode {value.match(/data-video-id=\"[0-9]+/gm)[0].replace('data-video-id=\"',\"\")}"
    },
    PostsTwitter: {
        postWrapper: "ARTICLE",
        postAuthorName: "a[role=link] > div > div > div > span > span",
        postAuthor: "a[role=link] > div > div > div > span > span {parentElement.parentElement.parentElement.parentElement.parentElement.href}",
        postBody1: "DIV[lang][dir] SPAN",    // could be multiple matches on the same line
        postBody2: [    // multiple matches separated by newlines...
            "DIV[data-testid=\"card.layoutSmall.detail\"] SPAN > SPAN",
            "DIV[data-testid=\"card.layoutLarge.detail\"] SPAN > SPAN"
        ],
        postImages: [
            "DIV[data-testid=tweetPhoto] > IMG",
            "DIV[data-testid=\"card.layoutSmall.media\"] IMG",
            "DIV[data-testid=\"card.layoutLarge.media\"] IMG"
        ],
        postVideo: "DIV[data-testid=videoPlayer] VIDEO",
        postTwitterParseDate: "{innerHTML.match(/[0-9]+:[0-9]+ (PM|AM) · [^\n]* [0-9]+, 20[0-9][0-9]/g)[0].replace(' ·', '')}"
    },
    vCardsFacebook: {
        unavailableProfile: 'DIV > SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.UnavailableProfile)}',
        profileHasLoaded: 'DIV[role=main] DIV[role=tablist]', // we use this to identify whether profile page has loaded (we're not being throttled)
        displayName: [
            // in some cases the result had "\n" so I strip them out of all of these as I'm not sure which ones need it
            'DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.pfnyh3mw.taijpn5t.gs1a9yip.owycx6da.btwxx1t3.ihqw7lf3.cddn0xzi SPAN > H1.gmql0nx0.l94mrbxd.p1ri9a11.lzcic4wl.bp9cbjyn.j83agx80 {innerText.replace("\n","").trim()}',
            'DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.g5gj957u.d2edcug0.hpfvmrgz.on77hlbc.buofh1pr.o8rfisnq.ph5uu5jm.b3onmgus.ihqw7lf3.ecm0bbzt DIV.bi6gxh9e.aov4n071 > H2.gmql0nx0.l94mrbxd.p1ri9a11.lzcic4wl.d2edcug0.hpfvmrgz > SPAN {innerText.replace("\n","").trim()}',
            'DIV.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.pfnyh3mw.d2edcug0.bp9cbjyn.jb3vyjys DIV.bi6gxh9e.aov4n071 > SPAN  H1 {innerText.replace("\n","").trim()}',
            'div[data-pagelet="ProfileActions"] {parentElement.parentElement}  h1 {innerText.replace("\n","").trim()}',
            // Dominique pages:
            'DIV[role=main] DIV.bi6gxh9e.aov4n071 > H2 > SPAN > SPAN {innerText.replace("\n","").trim()}',
            'DIV[role=main] DIV.mfn553m3.th51lws0 > H2 > SPAN > SPAN {innerText.replace("\n","").trim()}',
            // Dominique profiles:
            'DIV[role=main] SPAN > DIV > H1 {innerText.replace("\n","").trim()}',
            'DIV[role=main] DIV > SPAN > H1 {innerText.replace("\n","").trim()}'
        ],
        // the introduction is on the profiles "home" page
        introduction: 'SPAN > SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.Intro).parentBySelector("DIV:has(IMG)")} DIV.x2b8uid.xdppsyt.x1l90r2v > SPAN {innerText.trim()}',
        // these other items are on one of the two about pages we check, inside an about box
        aboutBox: [
            // for a profile URL with via vanity name
            'SPAN > A[href*="/about"] {parentBySelector("DIV:has(IMG)")}',
            // for a profile URL lacking a vanity name
            'SPAN > A[href*="=about"] {parentBySelector("DIV:has(IMG)")}',
        ],
        livesIn: 'SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.LivesIn).innerText.match(localizedKeywords.FacebookProfiles.LivesIn)[1].trim()}',
        gender: 'SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.Gender).innerText.trim()}',
        birthday: 'SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.Birthday).innerText.trim()}',
        // this matches on a bunch of things that aren't phones so we check for telephone formats, and then we add the "tel:" prefix
        phones: 'SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.PhoneAddr).innerText.replace(/([\\s\\S]*)/,\'tel:$1\')}',
        // this matches on a bunch of things that aren't emails so we check for email format, and then we add the "mailto:" prefix
        emails: 'SPAN {propMatch("innerText", localizedKeywords.FacebookProfiles.EmailAddr).innerText.replace(/([\\s\\S]*)/,\'mailto:$1\')}',
        links: [
            // clickable
            'A:not([href*="%%BaseURL%%"]) {href}',
            // not clickable
            'SPAN:not(:has(A)) {propMatch("innerText", "^http://|^https://").innerText}',
        ],
        // is the profile image clickable to get a bigger version?
        profilePhotoButton: [
            'div[aria-label="Page profile photo"][role="button"] svg {parentBySelector("div[role="button"]").click().sleep(2)}',
            'div[role="button"][aria-label] {propMatch("aria-label", selectorVariables.ProfileName)} svg {parentBySelector("div[role="button"]").click().sleep(2)}',
            // the hasParent() below was added to skip reels that also have a matching link
            'div[role=main] A[aria-label][role=link] svg[data-visualcompletion][role=img] {!hasParent("A[href*=\\"/reel/\\"]").parentBySelector("A[aria-label][role=link]").click().sleep(2)}',
            'svg {propMatch("aria-label", selectorVariables.ProfileName)} {parentBySelector("A[aria-label][role=link]").click().sleep(2)}',
        ],
        // on some profiles (and pages?) there's a menu that comes up, and this is the menu item to click
        dropdownMenuOpenProfilePhotoButton: 'a[role="menuitem"] {propMatch("innerText", "View profile picture").click().sleep(2)}',
        bigProfilePhoto: [
            'img[data-visualcompletion=media-vc-image]',    // when the image comes up directly
            'div[role=menu] a[href*="facebook.com/photo"]'  // when a menu comes up first it contains the URL we can get the image from
        ],
        closeBigProfilePhoto: [
            'div[aria-label=Close] {merge.pressKey("Escape",27).sleep(2)}',    // clicking it refreshes the page, but escape key closes it
            'div[role=main] > div:nth-child(1) div[aria-label][role=button] {merge[0].click().sleep(2)}'    // click almost anywhere I think to close menu
        ],
        // We only do this on the "about" page so we're not parsing photos twice.
        inlineProfilePhoto: [
            // sometimes the "role=none" is good and "role=img" matches on a friend's icon, whereas other times the
            // first doesn't match and the second match is what we want, so order is important
           // only
            '{urlMatch("/about")} div[role=main] svg {propMatch("aria-label", selectorVariables.ProfileName)} image {getAttribute("xlink:href")}',
            '{urlMatch("/about")} div[role=main] A {propMatch("aria-label", "##ProfileName## profile photo")} image {getAttribute("xlink:href")}',
            '{urlMatch("/about")} div[role=main] A[aria-label][role=link] svg[data-visualcompletion][role=img] image {getAttribute("xlink:href")}'
        ]
    },
    vCardsInstagram: {
        unavailableProfile: 'DIV > SPAN {propMatch("innerText", localizedKeywords.InstagramProfiles.UnavailableProfile)}',
        profileHasLoaded: 'DIV[role=button] SVG[aria-label="Options"]', // we use this to identify whether profile page has loaded (we're not being throttled)
        profileName: [
            'MAIN[role=main] HEADER SECTION DIV._aa_c > SPAN',
            'DIV.-vDIg > H1.rhpdm',
            'DIV.QGPIr > span.qyrsm.se6yk',
        ],
        profileIntro: [
            'MAIN[role=main] HEADER SECTION DIV._aa_c > DIV {innerText.trim()}',
            'DIV.-vDIg > span {innerText.trim()}',
            'DIV.QGPIr > DIV.MMzan.uL8Hv {innerText.trim()}',
        ],
        photoImage: [
            'MAIN[role=main] IMG {src}',
            'MAIN[role=main] IMG[data-testid=user-avatar] {src}',
        ]
    },
    vCardsPinterest: {
        profileName: 'DIV[data-test-id="profile-header"] H1 {innerText.replace("\n","").trim()}',
        profileWebsite: 'DIV[data-test-id="profile-header"] A {href}',
        profileIntro: 'DIV[data-test-id="profile-header"] SPAN.tBJ.dyH.iFc.sAJ.O2T.zDA.IZT.swG {!propMatch("innerText","^@").innerText.trim()}',    // ignore span beginning with @ as possible username
        photoImage: 'DIV[data-test-id="profile-header"] IMG {src}',
    },
    vCardsTikTok: {
        profileName: [
            "DIV.share-title-container > H1.share-sub-title",        // old??
            "DIV[data-e2e=user-page] H1[data-e2e=user-subtitle] {innerText.trim()}"
        ],
        profileIntro: [
            "HEADER.jsx-4037782421.share-layout-header.share-header > H2.share-desc.mt10",       // old??
            "DIV[data-e2e=user-page] H2[data-e2e=user-bio] {innerText.trim()}"
        ],
        websiteA: [
            "HEADER.jsx-4037782421.share-layout-header.share-header > DIV > A",      // old??
            "DIV[data-e2e=user-page] A[data-e2e=user-link] {href}"
        ],
        photoImage: [
            "DIV.image-wrap.user-page-header > SPAN.tiktok-avatar.tiktok-avatar-circle > IMG",   // old??
            "DIV[data-e2e=user-page] DIV[data-e2e=user-avatar] IMG {src}"
        ],
    },
    vCardsSalesNavigator: {
        profileName: "SPAN.profile-topcard-person-entity__name",
        profileTitle: "SPAN.profile-topcard__summary-position-title {innerText.trim()}",
        profileCompany: "DIV.profile-topcard__summary-position > SPAN > A {innerText.trim()}",
        profileAbout: "SPAN.profile-topcard__summary-content",
        profileAboutSeeMore: "BUTTON.profile-topcard__summary-expand-link",
        profileAboutClose: "BUTTON[data-test-modal-close-btn]",
        profileAboutPopUp: "DIV.profile-topcard__summary-modal-content",
        profileLocation: "DIV.profile-topcard__location-data {innerText.trim()}",
        photoImage: "BUTTON[data-test-profile-topcard=\"photo-expand-button\"] > DIV > IMG {src}",
        profileLinks: "A.profile-topcard__contact-info-item-link",
        profileMoreMenu: "DIV.profile-topcard-actions > DIV:nth-child(4) > BUTTON",
        profileCopyProfileLink: "DIV[data-control-name=\"copy_linkedin\"]",
    },
    vCardsTwitter: {
        profileName: [
            'DIV.css-1dbjc4n.r-6gpygo.r-14gqq1x > DIV.css-1dbjc4n.r-1wbh5a2.r-dnmrzs.r-1ny4l3l > DIV.css-1dbjc4n.r-1wbh5a2.r-dnmrzs.r-1ny4l3l > DIV.css-1dbjc4n.r-1awozwy.r-18u37iz.r-dnmrzs > DIV.css-901oao.r-18jsvk2.r-1qd0xha.r-1vr29t4.r-bcqeeo.r-qvutc0 {innerText.replace("\n","").trim()}', // old
            'DIV.css-901oao.r-1awozwy.r-18jsvk2.r-6koalj.r-37j5jr.r-adyw6z.r-1vr29t4.r-135wba7.r-bcqeeo.r-1udh08x.r-qvutc0 > SPAN.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0 > SPAN.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0 {innerText.replace("\n","").trim()}'
        ],
        profileIntro: 'DIV[data-testid=UserDescription] {innerText.replace("\n","").trim()}',
        profileWebsite: 'DIV[data-testid=UserProfileHeader_Items] > A.css-4rbku5.css-18t94o4.css-901oao.css-16my406.r-13gxpu9.r-1loqt21.r-4qtqp9.r-poiln3.r-zso239.r-bcqeeo.r-qvutc0 {!propMatch("innerText","twitter.com").innerText.trim()}',
        profileLocation: 'DIV[data-testid=UserProfileHeader_Items] > SPAN.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0:nth-of-type(1) {innerText.replace("\n","").trim()}',
        profileBirthday: 'DIV[data-testid=UserProfileHeader_Items] > SPAN.css-901oao.css-16my406.r-poiln3.r-bcqeeo.r-qvutc0:nth-of-type(2) {!propMatch("innerText","^Joined").match(/(?:Born[ ]*)?(.+)/g)}',
        photoImage: [
            "A[data-focusable=true] IMG[draggable=true].css-9pa8cd {src}", // old
            "A[role=link] IMG[draggable=true].css-9pa8cd {src}"
        ],
    },
    Accounts: {
        facebookSimpleAccountId: [
            '{urlMatch(/mbasic\\.facebook\\.com/g)} input[name="tids"] {value.split(":")[1]}',
            // the user ID is in the Messages link URL
            '{urlMatch(/upload\\.facebook\\.com/g)} a[href*="mbasic.facebook.com/messages/"] {href.match(/tid=cid\\.c\\.([0-9]*)%3A/g)}',
        ],
        facebookAccountErrorMessage: "DIV.message *[data-sigil=\"error-message\"]",
        tiktokElemCheckLogin: [
            '#sigi-persisted-data {innerHTML.match(/uniqueId":".*?(",)/g)}',
            '__NEXT_DATA__',
            'div[data-e2e=profile-icon]',
            'div.avatar .tiktok-avatar'
        ],
        tiktokGetUid: "#sigi-persisted-data {innerHTML.match(/uid\":\".*?([0-9]+)/g).replace(\"uid\\\":\\\"\", \"\")}",
        tiktokGetUsername: '#sigi-persisted-data {innerHTML.match(/uniqueId":".*?(",)/g)}',
        twitterElemCheckLogin: 'script {innerHTML.match(/fetchStatus":".*?("},)/g)}',
        twitterGetUsername: 'script {innerHTML.match(/screen_name":".*?(",)/g)}',
        twitterGetId: 'script {innerHTML.match(/fetchStatus":{"\\d+/g)}',
        twitterGetIdReplace: 'fetchStatus":{"',
        pinterestElemCheckLogin: '#__PWS_DATA__ {innerHTML.match(/isAuthenticated":.*?(,)/g)}',
        pinterestElemCheckLoginNeedToInclude: 'true',
        pinterestGetUsername: '#HeaderContent div[data-test-id="button-container"] a {href.split("/")[3]}'
    },
    Instagram: {
        throttled: [
            'MAIN[role=main] SPAN {propMatch("innerText", localizedKeywords.Instagram.Throttled)}'
        ],
    }
};

localizedKeywords = {
    DateAndTime: {
        "UnitStrings" : {
            // all is in the singular as we match it with the startWith method
            "en" : { "second": "second", "minute" : "minute", "hour" : "hour", "day" : "day", "week" : "week", "month": "month", "year" : "year" },
            "fr" : { "second": "seconde", "minute" : "minute", "hour" : "heure", "day" : "jour", "week" : "semaine", "month": "mois", "year" : "an" },
        },
        "MsgTime" : {
            "en" : {
                "sent"           : "sent",
                "RecentDateTime" : "(Today|Yesterday) at ",// this is a string regex
                "TodayAt"        : "Today at "
            },
            "fr": {
                "sent"           : "envoyé",
                "RecentDateTime" : "(Aujourd'hui|Hier) à ",
                "TodayAt"        : "Aujourd'hui à "
            }
        },
        "Today": {
            "en": "Today"
        },
        "Yesterday": {
            "en": "Yesterday",
            "fr": "Hier"
        },
        "Suffix" : {
            "en" : {
                "AM"             : "AM",
                "PM"             : "PM",
            }
        },
        "DaysInWeek": {
            "en": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        "DaysInWeek3": {
            "en": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
            "fr": ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"]
        },
        "MonthName3": {
            "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            // "Aou" and after are not tested
            "fr": ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Déc"]
        },
        "MonthsInEnglish": {
            "en": {
                "jan": "January",
                "feb": "February",
                "mar": "March",
                "apr": "April",
                "may": "May",
                "jun": "June",
                "jul": "July",
                "aug": "August",
                "sep": "September",
                "oct": "October",
                "nov": "November",
                "dec": "December",
            },
            "fr": {
                "jan": "January",
                "fév": "February",
                "mar": "March",
                "avr": "April",
                "mai": "May",
                "jun": "June",
                "jul": "July",
                // untested...
                "aou": "August",
                "sep": "September",
                "oct": "October",
                "nov": "November",
                "déc": "December",
            }
        },
        "MsgHoursAndMinutes": {
            // match example: en: "11:29 AM", "8:01 PM" | fr: "11 h 29" | "9 h 24"
            "en": "([0-9]{1,2}):([0-9]{2})\\s?([A-Z]+)?",
            "fr": "([0-9]{1,2}) ?h ?([0-9]{2})"
        },
        "MsgSameWeek": {
            // match example: en: "Mon 11:29 AM" | fr: "Lun. 11 h 19"
            "en": "^([a-z]{3})? ?([0-9]+):([0-9]+)\\s?([a-z]+)?$",
            "fr": "^([a-z]{3})?.? ?([0-9]+) ?h ?([0-9]+)$"
        },
        "MsgOldDate": {
            // match example: en: "01/02/03, 3:48 PM" | fr: 21-12-22 19 h 26
            "en": "([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{1,2}).{0,2}([0-9]{1,2}):([0-9]{1,2})\\s?([A-Z]{2})?",
            "fr": "([0-9]{1,2})-([0-9]{1,2})-([0-9]{1,2}) ?([0-9]{1,2}) ?h ?([0-9]{1,2})"
        },
        "daysInWeekLowercase": {
            "en": ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            "fr": ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
        },
        "oneA": {
            "en": "a",
            "fr": "un"
        },
        "oneAn": {
            "en": "an",
            "fr": "une"
        },
        "UnitStringsPlurial" : {
            // all is in the singular as we match it with the startWith method
            "en" : { "second": "seconds", "minute" : "minutes", "hour" : "hours", "day" : "days", "week" : "weeks", "month": "months", "year" : "years" },
            "fr" : { "second": "secondes", "minute" : "minutes", "hour" : "heures", "day" : "jours", "week" : "semaines", "month": "mois", "year" : "ans" },
        },
        "frDate": {
            "fr": '([0-9]{1,2}) ?([A-zÀ-ú]+) ?([0-9]{4})'
        },
        "fullMonthsInEnglish": {
            "fr": {
                "janvier": "January",
                "février": "February",
                "mars": "March",
                "avril": "April",
                "mai": "May",
                "juin": "June",
                "juillet": "July",
                "août": "August",
                "septembre": "September",
                "octobre": "October",
                "novembre": "November",
                "décembre": "December",
            }
        }
    },
    InstagramMsgs: {
        "ConversationNotResponded": {
            "en": "^(?!You:|Active|This account can).*",
        },
        "Today": {
            "en": "Today",
        },
        "Yesterday": {
            "en": "Yesterday",
        },
        "DaysInWeek": {
            "en": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        }
    },
    Facebook: {
        "Throttled" : {
            "en" : "Temporarily Blocked",
            "fr" : "Temporairement bloqué" // not sure about this selector
        }
    },
    // DRL FIXIT? These are not localized strings so perhaps move them to a new section?
    FacebookApi: {
        "AccountInfoRegex" : "\"ACCOUNT_ID\":\"([^\"]+)\"|USER_ID\":\"([^\"]+)\"|NAME\":\"([^\"]+)\"",
        "DtsgRegex" : "\"DTSGInitialData\":\\s*{\\s*\"token\":\\s*\"([^\"]+)\"",
        "GroupPostUrlRegex": "(https:\\/\\/www\\.facebook\\.com\\/groups\\/\\d+\\/permalink\\/\\d+\\/)",
        "MembersQueryID" : "{[^}]*(?=GroupsCometMembersRootQueryRelayPreloader)?(?=.*queryID\"\\s*:\\s*\"(\\d+)\")(?=.*GroupsCometMembersRootQueryRelayPreloader)[^}]*?}"
    },
    FacebookFrd: {},
    FacebookMsgs: {
        "Today": {
            "en": "Today"
        },
        "SelfSent" : {
            "en" : "^(You sent|You replied|You forwarded)",
            "fr" : "^Vous avez envoyé"  // DRL FIXIT! The above has changed.
        },
        "TheyReplied" : {
            "en" : "replied to (you|themself|your story)$"
        },
        "ParticipantName" : {
            "en" : "^Messages in conversation with (.+)$",
            "fr" : "^Conversation avec (.+)$"   // DRL FIXIT! Needs updating since I updated the English (not the shorter version wasn't always correct which is why I switched it)!
        },
        "ChatParsingThrottled" : {
            "en" : "temporarily blocked",
        },
//        "GroupName" : {
//            "en" : "^Conversation with(.+)$",
//            "fr" : "^Nom de la conversation(.+)$"   // DRL FIXIT? May need updating since I updated the English?
//        },
        "ConversationWith": {
            "en" : "^(Conversation with|Conversation titled)",  // the second part is for a renamed group chat
            "fr" : "^Nom de la conversation"   // DRL FIXIT! Needs updating since I updated the English!
        },
        "ConversationInformation" : {
            "en" : "Conversation information|Chat Information",
        },
        "ConversationDeliveredOrSent": {
            "en": "Delivered|Sent"
        },
        "ConversationNotResponded": {
            "en": "^(?!You:|You sent|Reacted|This account can).*"
        },
        "YouCanNowMessage": {
            // "You replied to" catches the "replied" part so we don't try to parse it
            // some of these others are Facebook inline notifications and not actual messages
            "en": "^(You can now message|You can now call|You are now connected|You replied to|You opened this conversation|You unsent a message|You tagged|This account can't|Sponsored$)"
        },
        "MsgSending": {
            "en": "Sending"
        },
        "MsgSendSuccess": {
            "en": "Delivered|Sent"
        },
        "MsgSendFailure": {
            "en": "Couldn't send"
        },
        "BasicMsgSendPermanentFailure": {
            "en": "You can't share this link"
        },
        "BasicMsgSendRateLimitFailure": {
            "en": "cannot be displayed right now"
        },
        "BasicMsgInvalidRecipientFailure": {
            "en": "The Receiver Is Invalid"
        },
        // these include the group membership roles too
        "MessageFromRoles" : {
            "en" : {
                "Author"        : "Author",
                "GroupAdmin"    : "Admin",
                "GroupModerator": "Moderator",
                "GroupExpert"   : "Group expert",
                "TopFan"        : "Top fan",
                "RisingFan"     : "Rising fan",
                "TopContributor": "Top contributor",
                "NewContributor": "New contributor",
                "Subscriber"    : "Subscriber",
                "NewMember"     : "New member",
            },
            "fr" : {
                "Author"        : "Auteur",
                "GroupAdmin"    : "Administrateur",
                "GroupModerator": "Moderateur",
                "GroupExpert"   : "Expert du groupe",
                "TopFan"        : "Super fan",
                "RisingFan"     : "Rising fan",         // DRL FIXIT? Translation.
                "TopContributor": "Top contributor",    // DRL FIXIT? Translation.
                "NewContributor": "New contributor",    // DRL FIXIT? Translation.
                "Subscriber"    : "Supporter",
                "NewMember"     : "New member",         // DRL FIXIT? Translation.
            },
        },
        "MarkAsRead": {
            "en": "Mark as read",
            "fr": "Marquer comme lu"
        },
        "MarkAsUnread": {
            "en": "Mark as unread",
        },
        "ChatMembers": {
            "en": "Chat Members|Chat members",
            "fr": "Membres de la discussion"    // DRL FIXIT? Check case?
        },
    },
    PinterestScrape: {
        "s": {  // seconds
            "en": "s",
        },
        "m": {  // minutes
            "en": "m",
        },
        "h": {  // hours
            "en": "h",
        },
        "d": {  // days
            "en": "d",
        },
        "w": {  // weeks
            "en": "w",
        },
        "y": {  // years
            "en": "y",
        }
    },
    TwitterScrape: {
        "was sent": {
            "en": "was sent",
        },
        "Today": {
            "en": "Today",
        },
        "Yesterday": {
            "en": "Yesterday",
        },
        "DaysInWeek": {
            "en": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        }
    },
    FacebookPosts: {
        "More": {
            "en": "More"
        },
        "RemoveFromCollection": {
            "en": "Remove from collection"
        },
        "SeeMoreList": {
            "en": "See more"
        },
        "SupportedSavedPostTypes": {
            "en": 'Video|Post'
        },
        "Public": {
            "en": "Public",
            "fr": "Public"
        },
        "Embed" : {
            "en" : "Embed"
        },
        "MostRelevant" : {
            "en" : "Oldest|Most relevant|Top comments",
            "fr" : "Plus pertinents"    // DRL FIXIT! The English version was changed.
        },
        "NoComments" : {
            "en" : "Be the first to leave a comment.",
        },
        "allComments" : {
            "en" : "All comments",
            "fr": "Tous les commentaires"
        },
        "Newest" : {
            "en" : "Newest|Most recent",
            "fr" : "Les plus récents"
        },
        // In my tests some posts have two "more" buttons, one at the top to see older comments/answers and another
        // at the bottom to see newer ones. We also have the "View 1 more reply" and "5 replies" type buttons
        // that open up the replies to a comment/answer. The selector we use must match all of these so that as we
        // iterate through this loop we eventually click them all.
        "viewMoreComments" : {
            // negative lookahead to make sure string doesn't include "Hide"
            "en" : "(?!.*Hide).*(more comment|previous comment|more answer|previous answer|more reply|more replies|1 Reply|\\d+ Replies)",
            // DRL FIXIT! French is missing the "Hide" part!
            "fr" : "(plus de commentaires|commentaires précédents|autres commentaires|réponses précédentes|réponse précédente|autre réponse|autres réponses|1 réponse|\\d+ réponses)"
        },
        "SeeMore" : {
            "en" : "See More",
            "fr" : "Voir Plus"
        },
        "Comments" : {
            "en" : "^(Comments|\\d+ Comments)$",
            "fr" : "^(commentaires|\\d+ commentaires)$"
        },
        "UnsavePostOrVideo": {
            "en" : "(Unsave post|Unsave video)",
            //add by fabien
            "fr" : "(Annuler l'enregistrement de la publication|Annuler l'enregistrement de la vidéo)"
        },
        "SavePostOrVideo": {
            "en" : "(Save post|Save video)",
            // test fabien
            "fr" : "(Sauvegarder la publication|Enregistrer la vidéo)"
        },
        "postActionsBoxBtnForCheckingAvailableScrapingMethod": {
            "en": "Actions for this post",
            // sometimes the first post of the feed as the property Actions for this post
            "fr": "(Actions pour cette publication|Actions for this post)"
        },
        "articleSave": {
            "en": "Done",
            "fr": "Terminer"
        },
        "CreateCollection": {
            "en": "New Collection",
        },
        "SaveCollection": {
            "en": "Create",
        },
        "postShareButton": {
            "en": "Send this to friends or post it on your timeline.",
            "fr": "Envoyez ceci à vos amis ou publiez-le sur votre journal."
        },
        "shareDialogCopyLinkButton": {
            "en": "Copy link",
            "fr": "Copier le lien"
        },
        "feedPostMbasic": {
            "en": "More",
        },
        "pagePostMbasic": {
            "en": "Post",
            "fr": "Publier"
        },
        "storyPostText": {
            // the button differs, when you haven't added an image first, or when you have added an image already
            "en": "Create a text story|Add text",
        },
        "storyPostSubmit": {
            "en": "Share to story",
        },
        "storyPostYourStory": {
            "en": "Your story",
        },
        "composer": {
            "en": "Profile",
            "fr": "Profil"
        },
        "publicAudience": {
            "en": "Public",
            "fr": "Public"
        },
        "openPostAttachmentInput": {
            "en": "Photo/Video",
            "fr": "Photo / vidéo"
        },
        "yourProfilePhoto": {
            "en": "Your profile",
            "fr": "(Your profile|Votre profil)",
        },
        "postUnavailable": {
            "en": "Go to News Feed",
            "fr": "Aller au fil d’actualité"
        },
        "postVideoPause": {
            "en": "Pause",
            "fr": "Suspendre"
        }
    },
    FacebookStories: {
        "Viewers": {
            "en": "\\d+ viewers"
        }
    },
    FacebookProfiles: {
        "Message": {
            "en": "Message",
            "fr": "Envoyer un message"
        },
        "UnavailableProfile" : {
            "en": "This content isn't available|This Page Isn't Available"
        },
        "Intro" : {
            "en": "^Intro$"
        },
        "LivesIn" : {
            "en": "^Lives in (.+)"
        },
        "Gender" : {
            "en": "^(Male|Female)$"
        },
        "Birthday" : {
            // starts with the month, followed by the day, could be followed by the year and could include a comma before the year
            "en": "^(January|February|March|April|May|June|July|August|September|October|November|December) \\d{1,2}(,? \\d{4})?$"
        },
        "PhoneAddr" : {
            // this is a telephone validation regexp and does not need to be localized
            "en": "^(\\+\\d{1,3}( )?)?((\\(\\d{3}\\))|\\d{3})[- .]?\\d{3}[- .]?\\d{4}$"
        },
        "EmailAddr" : {
            // this is an email validation regexp and does not need to be localized
            "en": "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$"
        }
    },
    FacebookGroups: {
        "AboutThisGroup": {
            "en": "About this group",
        },
        "ContentUnavailable": {
            "en": "Go to News Feed",
            "fr": "Aller au fil d’actualité"
        },
        "TemporarilyUnavailable": {
            "en": "This Page Isn't Available Right Now",
        },
        "AddQuestion": {
            "en": "Add question",
        },
        "QuestionLabel": {
            "en": "^Question",
        },
        "WriteYourAnswer": {
            "en": "Write your answer...",
            "fr": "Écrivez votre réponse..."
        },
        "NewToTheGroup": {
            "en": "New to the group",
            "fr": "dans le groupe"
        },
        "toRemove": {
            "en": ['Joined '],
            "fr": ['environ ', 'de ']
        },
        "weekDayPattern": {
            "en": "(monday)|(tuesday)|(wednesday)|(thursday)|(friday)|(saturday)|(sunday)",
            "fr": "(lundi)|(mardi)|(mercredi)|(jeudi)|(vendredi)|(samedi)|(dimanche)"
        },
        "needToConvert": {
            'en': '',   // DRL FIXIT? Is this intended to be blank??
            'fr': 'à|le '
        },
        "CommunityHome" : {
            "en": "Community home"
        },
        "Members" : {
            "en": "Members"
        },
        "SectionGroupRequests" : {
            "en": "Approve"
        },
        "NoGroupRequests" : {
            "en": "No pending members"
        },
        "NoPendingMembers" : {
            "en": "No pending members"
        },
        "SectionGroupStaff" : {
            "en": "Admins & moderators"
        },
        "SectionGroupMembers" : {
            "en": "New to the group"
        },
        "MemberCount" : {
            "en": "[\\d,]+ members$|^Members[^\\da-z]+[\\d,]+|^Member[^\\da-z]+[\\d,]+"
        },
        "InvitedOnly" : {
            "en": "^Joined$"    // a "Joined" label on its own appears to mean invited but hasn't joined yet
        },
        "InvitedBy" : {
            // "JoinedInvited" and "Joined\nInvited" seem to be Facebook typos which is why there's no ^ before Invited.
            "en": "^Added by|Invited by"
        },
        "MemberDate" : {
            // "JoinedInvited" and "Joined\nInvited" seem to be Facebook typos which is why there's no ^ before Invited.
            "en": "^Requested|^Joined|^Added by|Invited by|^Created group"
        },
        "CreatedGroup" : {
            "en": "^Created group"
        },
        "MemberDateMatch" : {
            // For testing...
            // Invited by Sarah Cadiza on September 13, 2022
            // Invited by Sarah Cadiza about 2 weeks ago
            // Invited by Sarah Cadiza last Friday
            // Invited by Sarah Cadiza 2 hours ago
            // Invited by Sarah Cadiza an hour ago
            // Invited by Sarah Cadiza a day ago
            // Invited by Sarah Cadiza today
            // Added by Sarah Cadiza on September 13, 2022
            // Added by Sarah Cadiza about 2 weeks ago
            // Added by Sarah Cadiza last Friday
            // Added by Sarah Cadiza 2 hours ago
            // Added by Sarah Cadiza an hour ago
            // Added by Sarah Cadiza a day ago
            // Added by Sarah Cadiza today
            // Requested on September 13, 2022
            // Requested about 2 weeks ago
            // Requested last Friday
            // Requested 2 hours ago
            // Requested an hour ago
            // Requested a day ago
            // Requested today
            // Joined on September 13, 2022
            // Joined about 2 weeks ago
            // Joined last Friday
            // Joined 2 hours ago
            // Joined an hour ago
            // Joined a day ago
            // Joined today
            // Created group on September 13, 2022
            // Created group last Friday
            // Created group about 2 weeks ago
            // Created group 2 hours ago
            // Created group an hour ago
            // Created group a day ago
            // Created group today
            // first half deals with the formats containing a name, second half on those not containing a name
            // "JoinedInvited" and "Joined\nInvited" seem to be Facebook typos which is why there's no ^ before Invited.
            "en": "(?:(?:Invited by|^Added by|^Joined) (?:\\D+?) (?:about |on |last |(?=an |a |today|yesterday|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\\d))|(?:^Requested|^Joined|^Invited|^Created group) (?:about |on |last |(?=an |a |today|yesterday|\\d)))(.*)"
        },
        "SectionMembershipQuestions" : {
            "en": "Membership questions"
        },
        "ViewAnswers" : {
            "en": "View Answers|View answers"
        },
        "NoAnswersYet" : {
            "en": "No Answers yet|No answers yet"
        },
        "NoAnswer" : {
            "en" : "No Answer",
        },
        "AgreedToGroupRules" : {
            "en" : "^Agreed to Group Rules$",
        },
        "DidntAgreeToGroupRules" : {
            "en" : "^Has Not Agreed to Group Rules$",
        }
    },
    vCardsFacebook: {
        "Lives in": {
            "en": "Lives in",
            "fr": "Habite à",
        }
    },
    InstagramProfiles: {
        "UnavailableProfile" : {
            "en": "this page isn't available"
        },
    },
    Instagram: {
        "Throttled" : {
            "en" : "Sorry, this page isn't available.",
        }
    }
};

constantStyles = {
    ButtonAndMenuDefaults: {
        button: {
            styles: 'margin-left: 5px;margin-right: 5px; cursor: pointer;', // DRL FIXIT? Could we fix so we don't need to set cursor for our buttons?
            classes: ['dropdown-menu', 'SA'],
            img: {
                src: 'IconWithBorder.svg',
                styles: "width: 21px;",
                classes: [],
            },
            extraImages: [],
            location: 'LastChild'
        },
        menu: {
            // Default the z-index to make it sure is showing on top of everything after open
            styles: 'z-index:9999;',
            classes: ['SA_dropdown-menu-popup'],
            orientation: 'right'
        },
    },
    Facebook: {
        MainMenuButton: {
            button: {
                styles: 'position:fixed; top:150px; right:10px; z-index:100;',
                img: {
                    styles: 'width:35px;height:35px;',
                },
                location: 'div[role="main"] {parentElement} PreSibling'
            },
        },
        FeedPage: {
            GeneralPostsDateDropDown: {
                button: {
                    location: 'FirstChild'  // has to be inside the A element so the hover will populate the HREF
                },
            },
        },
        PostPage: {
            GeneralPostsDateDropDown: {
                button: {
                    location: 'FirstChild'  // has to be inside the A element so the hover will populate the HREF
                },
            },
        },
        ProfilePage: {
            ActionButton: {
                button: {
                    styles: 'margin-left: 5px;margin-right: 5px;margin-top: 7px;background-color: #e4e6eb;padding: 0px;border-radius: 7px;',
                    img: {
                        styles: 'width:23px;height:23px;padding:7px 7px 4px 7px;',
                    },
                    location: 'FirstChild'
                },
            },
            ActionButtonWrapper: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
        FriendsListPage: {
            ActionButtonWrapper: {
                button: {
                    // see friendsListProfileActions
                    location: 'DIV > SPAN > SPAN > A {parentElement.parentElement} LastChild'
                },
            },
        },
        GroupPage: {
            ActionButton:{
                button: {
                    styles: 'margin-left: 5px;margin-right: 5px;background-color: #e4e6eb;padding: 0px;border-radius: 7px;',
                    img: {
                        styles: 'width:23px;height:23px;padding:7px 7px 4px 7px;',
                    },
                    location: 'PreSibling'
                },
            }
        },
        SavedPostsPage: {
            ActionButton: {
                button: {
                    styles: "background-color: #e4e6eb;padding: 7px;border-radius: 5px;",
                    location: 'DIV {propMatch("aria-label", localizedKeywords.FacebookPosts.More)} {parentNode.parentNode} LastChild'
                },
            },
        },
        ProfileHoverCard: {
            ActionButton: {
                button: {
                    styles: 'margin-left: 5px;margin-right: 5px;background-color: #e4e6eb;padding: 0px;border-radius: 7px;',
                    img: {
                        styles: 'width:23px;height:23px;padding:7px 7px 4px 7px',
                    },
                    location: 'DIV[role=button][aria-label=Message] {parentElement.parentElement} PostSibling'
                },
            },
            LinkPreview: {
                button: {
                    styles: 'margin-top: 0;margin-bottom: 5px;padding: 1px 16px;',
                    img: {
                        styles: 'width:23px;height:23px;padding:7px 7px 4px 7px',
                    },
                    location: 'DIV[role=dialog][aria-label="Link preview"][aria-modal=true] {firstChild.lastChild} PreSibling'
                },
            },
        },
        StoriesPage: {
            GeneralStoryDropDown: {
                button: {
                    styles: 'position: absolute; top: 70px; right: 4px; z-index: 999999;',
                    location: 'FirstChild',
                },
            }
        },
        MessengerPage: {
            FilterContactsButton: {
                button: {
                    styles: "margin: 0px 3px 0px 10px;background-color: #F5F5F5;padding: 0px; border-radius: 50%;",
                    img: {
                        styles: "width:23px;height:23px;padding:6px 6px 2px 6px",
                    },
                    extraImages: [
                        {
                            src: 'Common/Valid.png',
                            styles: 'position:absolute;display:none;width: 20px;right: -3px;bottom: -1px;',
                            classes: ['filterActive'],
                        }
                    ]
                },
            },
            MessengerConversationHeaderButton: {
            },
            MessengerConversationListItemButton: {
                button: {
                    styles: "position: absolute;top: 5px; right:5px;",
                },
            },
            MessengerConversationHeaderTags: {
                button: {
                    location: 'PostSibling'
                },
            },
            MessengerGroupChatParticipantButton: {
                button: {
                    styles: "position: absolute;top: 17px; right:32px;",
                },
            },
        },
    },
    Messenger: {
        MessengerPage: {
            FilterContactsButton: {
                button: {
                    styles: "margin: 0px 3px 0px 10px;background-color: #F5F5F5;padding: 0px; border-radius: 50%;",
                    img: {
                        styles: "width:23px;height:23px;padding:6px 6px 2px 6px",
                    },
                    extraImages: [
                        {
                            src: 'Common/Valid.png',
                            styles: 'position:absolute;display:none;width: 20px;right: -3px;bottom: -1px;',
                            classes: ['filterActive'],
                        }
                    ]
                },
            },
            MessengerConversationHeaderButton: {
            },
            MessengerConversationListItemButton: {
                button: {
                    styles: "position: absolute;top: 5px; right:5px;",
                },
            },
            MessengerConversationHeaderTags: {
                button: {
                    location: 'PostSibling'
                },
            },
            MessengerGroupChatParticipantButton: {
                button: {
                    styles: "position: absolute;top: 17px; right:32px;",
                },
            },
        },
        MainMenuButton: {
            button: {
                styles: 'position:fixed; top:150px; right:10px; z-index:100;',
                img: {
                    styles: 'width:35px;height:35px;',
                },
                location: 'div[role="main"] PreSibling'
            },
        },
    },
    Instagram: {
        MainMenuButton: {
            button: {
                styles: 'position:fixed; top:150px; right:10px; z-index:100;',
                img: {
                    styles: 'width:35px;height:35px;',
                },
                location: 'div[id="splash-screen"] PreSibling'
            },
        },
        FeedPage: {
            GeneralPostsDateDropDown:{
                button: {
                    styles: 'position: relative;margin-left: 5px;margin-right: 5px;',
                    location: [
                        'SPAN:has(time) time PreSibling',
                        'DIV:has(SPAN){propMatch("innerText","Sponsored").parentBySelector("SPAN")} PostSibling'
                    ]
                },
            }
        },
        PostPage: {
            GeneralPostsDateDropDown:{
                button: {
                    styles: 'position: relative;margin-left: 5px;margin-right: 5px;',
                    location: 'SPAN[dir="auto"] PostSibling'
                },
            }
        },
        ProfilePage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
        MessengerPage: {
            ActionButton: {
                button: {
                    styles: 'position:absolute;right:0px;top:3px;cursor:pointer;',
                    location: 'FirstChild'
                },
            },
            ActionButtonSidebar: {
                button: {
                    styles: 'position:absolute;right:0;z-index:9999;cursor:pointer;',
                    location: 'FirstChild'
                },
            },

            FilterContactsButton: {
                button: {
                    styles: "margin: 0px 3px 0px 10px;background-color: #F5F5F5;padding: 0px; border-radius: 50%;",
                    img: {
                        styles: "width:23px;height:23px;padding:6px 6px 2px 6px",
                    },
                    extraImages: [
                        {
                            src: 'Common/Valid.png',
                            styles: 'position:absolute;display:none;width: 20px;right: -3px;bottom: -1px;',
                            classes: ['filterActive'],
                        }
                    ]
                },
            },
        },
    },
    Pinterest: {
        MainMenuButton: {
            button: {
                styles: 'position:fixed; top:150px; right:0px; z-index:9999;',
                img: {
                    styles: 'width:35px;height:35px',
                },
                location: '.mainContainer PreSibling'
            },
        },
        FeedPage: {
            GeneralPostsDropDown:{
                button: {
                    styles: "position: absolute; top:10px; left:10px;",
                },
            },
        },
        PostPage: {
            ActionButton:{
                button: {
                    styles: "position: relative;",
                },
            },
        },
        ProfilePage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
        MessagingPage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
    },
    TikTok: {
        MainMenuButton: {
            button: {
                styles: 'position:absolute; top:75px; right:10px; z-index:100;',
                img: {
                    styles: 'width:35px;height:35px;',
                },
                location: '#app div:nth-child(1) PreSibling'
            },
        },
        FeedPage: {
            GeneralPostsActionButton:{
                button: {
                    styles: "border: none;background: none;outline: none;padding: 0;position: relative;display: -webkit-box;display: -webkit-flex;display: -ms-flexbox;display: flex;-webkit-align-items: center;-webkit-box-align: center;-ms-flex-align: center;align-items: center;cursor: pointer;-webkit-flex-direction: column;-ms-flex-direction: column;flex-direction: column;background-color: #f1f1f2;padding: 12px;border-radius: 50px;",
                    img: {
                        styles: "height: 25px; width: 25px;",
                    },
                    location: '{parentElement.parentElement} .tiktok-wc6k4c-DivActionItemContainer FirstChild'
                },
                menu: {
                    styles: 'z-index:9999;overflow: hidden;',
                },
            },
        },
        ProfilePage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
        MessagingPage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
    },
    Twitter: {
        MainMenuButton: {
            button: {
                styles: 'position:fixed; top:8px; right:0px; z-index:9999;',
                img: {
                    styles: 'width:35px;height:35px;',
                },
                location: '#react-root PreSibling'
            },
        },
        FeedPage: {
            GeneralPostsDropDown: {
                button: {
                    styles: 'top: 13px;right: 25px;position: absolute;',
                },
            },
        },
        ProfilePage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
        MessagingPage: {
            ActionButton: {
                button: {
                    location: 'FirstChild'
                },
            },
        },
    },
    Gmail: {
        MainMenuButton: {
            button: {
                styles: 'position:relative; z-index:100; margin-left:16px; margin-top:13px;',
                img: {
                    styles: 'width:25px;height:25px;',
                },
                location: [
                    'div.no > div.nH.vxm5ce.nn div[role="complementary"] div[role="tablist"] PreSibling',
                    'div.no > div.nH.bAw.nn div[role="complementary"] div[role="tablist"] PreSibling'
                ]
            },
        },
        MessagingPage: {
            ActionButton: {
                button: {
                    img: {
                        styles: "width: 12px;",
                    },
                    location: 'PreSibling'
                },
            },
        },
    },
    Outlook: {
        MainMenuButton: {
            button: {
                styles: 'position:relative; z-index:100; margin-top:19px;',
                img: {
                    styles: 'width:33px;height:33px;',
                },
                location: '#whatsnew {parentElement.parentElement} PreSibling'
            },
        },
        MessagingPage: {
            ActionButton: {
                button: {
                    img: {
                        styles: "width: 12px;",
                    },
                    location: 'PreSibling'
                },
            },
        },
    },
};

constantPaths = {
    Facebook: {
        // we add an "action" parameter here so the content scripts can differentiate
        sendMessengerMsg: "{{Origin}}/messages/t/{{ConversationID}}?action=send",
        sendTextMessageApiUrl: "https://mbasic.facebook.com/messages/send/?icm=1&refid=12",
        sendImageMessageApiUrl: "https://upload.facebook.com/_mupload_/mbasic/messages/attachment/photo/",
        graphqlApiUrl: "https://www.facebook.com/api/graphql/",
        uploadPhotoForPostApi: "https://upload.facebook.com/ajax/react_composer/attachments/photo/upload?__user={{UserFbId}}&__a=1&fb_dtsg={{DtsgToken}}&jazoest=25273",
        basicSendMessengerMsg: "https://mbasic.facebook.com/messages/photo/?ids={{ConversationID}}&tids%5B0%5D=cid.c.{{ConversationID}}%3A{{AccountID}}&message_text&cancel=https%3A%2F%2Fmbasic.facebook.com%2Fmessages%2Fread%2F%3Ffbid%3D{{ConversationID}}%26request_type%3Dsend_success%26_rdr&_rdr",
        basicSendMessengerRoomMsg: "https://mbasic.facebook.com/messages/photo/?ids&tids%5B0%5D=cid.g.{{ConversationID}}&message_text&cancel=https%3A%2F%2Fmbasic.facebook.com%2Fmessages%2Fread%2F%3Ftid%3D{{ConversationID}}%26request_type%3Dsend_success%26_rdr&_rdr",
        watchedCustomLists: "https://www.facebook.com/lists/{{listId}}",
//        watchedGroupChat: "https://www.messenger.com/t/{{groupChatId}}",
        watchedGroupHome: "https://www.facebook.com/groups/{{groupId}}",    // remove after ext v2.81
        watchedGroupRequests: "https://www.facebook.com/groups/{{groupId}}/member-requests",
        watchedGroupStaff: "https://www.facebook.com/groups/{{groupId}}/members/admins",
        watchedGroupMembers: "https://www.facebook.com/groups/{{groupId}}/members",
        watchedGroupMemberAnswers: "https://www.facebook.com/groups/{{groupId}}/user/{{userId}}",
        watchedGroupQuestions: "https://www.facebook.com/groups/{{groupId}}/membership_questions",
        savedPostsPage: 'https://www.facebook.com/saved',
        contactFetchUrls: [
            // get intro from home page, and the rest from two about pages
            // these URLs work with numeric IDs because that's what we have at this point
            '{base_url}/profile.php?id={contact_id}',
            '{base_url}/profile.php?id={contact_id}&sk=about',
            '{base_url}/profile.php?id={contact_id}&sk=about_contact_and_basic_info',
        ]
    },
    Instagram: {
        contactFetchUrls: '{base_url}/{contact_id}',
        sendMessengerMsg: '{{Origin}}/direct/t/{{ConversationID}}?action=send',
    },
    Pinterest: {
        contactFetchUrls: '{base_url}/{contact_id}/_created'
    },
    TikTok: {
        contactFetchUrls: '{base_url}/@{contact_id}'
    },
    Twitter: {
        contactFetchUrls: '{base_url}/{contact_id}'
    }
};
