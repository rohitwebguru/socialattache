function srchPathVcFB(item)
{
   return srchPath('vCardsFacebook', item);
}

function keywordVcFB(item)
{
   return localizedKeyword('vCardsFacebook', item);
}

function srchPathVcIG(item)
{
   return srchPath('vCardsInstagram', item);
}

function srchPathVcPI(item)
{
   return srchPath('vCardsPinterest', item);
}

function srchPathVcTT(item)
{
   return srchPath('vCardsTikTok', item);
}

function srchPathVcTW(item)
{
   return srchPath('vCardsTwitter', item);
}

function srchPathVcSN(item)
{
   return srchPath('vCardsSalesNavigator', item);
}

function vCardEncode(str)
{
   let Replacements = {
      "\\": "\\\\",
      "\n": "\\n",
      ',': '\,',
      ';': '\;',
   };
   
   if (str == null)
      return '';
   
   for (let i in Replacements)
   {
      str = Utilities_ReplaceInString(str, i, Replacements[i]);
   }
   
   return str;
}

function vCardEncodeDate(str)
{
   let d = DateAndTime_FromString(str);
   d = d.ToFormat('%-D');
   return d;
}

// address is an array matching the vCard spec and items may be null:
//   the post office box;
//   the extended address (e.g., apartment or suite number);
//   the street address;
//   the locality (e.g., city);
//   the region (e.g., state or province);
//   the postal code;
//   the country name (full name)
function vCardEncodeAddress(address)
{
   assert(address.length == 7);
   
   let result = [];
   for (let part of address)
      result.push(vCardEncode(part));
   
   return result.join(';');
}

// if we have a URL that likely points to a social profile we'll convert it to an IM
function convertUrlToSocialOrWebsite(url)
{
   const SocialDomains = [
      'facebook',
      'instagram',
      'pinterest',
      'tiktok',
      'linkedin',
      'twitter',
   ];
   
   url = normalizeUrl(url);
   
   // DRL FIXIT? Not sure this is needed since we're likely parsing a profile and already have the
   // social handle? It may result in false handles being created.
   // check for a profile URL like "https://www.facebook.com/saltyfoam" and convert it to
   // a social handle like "facebook:saltyfoam"
   if (url.includes('://'))
   {
      
      let path = Url_GetPath(url);
      let pathParts = path.split('/');
      
      if (pathParts.length == 1)
      {
         for (let i in SocialDomains)
         {
            let domain = SocialDomains[i];
            if (fuzzyDomainsMatch('https://' + domain, url))
            {
               url = domain + ':' + pathParts[0];
               break;
            }
         }
      }
   }
   
   return url;
}

function convertAddressesForvCard(addresses)
{
   let result = '';
   
   for (let i in addresses)
   {
      addresses[i] = convertUrlToSocialOrWebsite(addresses[i]);
   }
   Utilities_ArrayRemoveDuplicates(addresses);
   
   for (let i in addresses)
   {
      let address = addresses[i];
      let prefix = Url_GetProtocol(address);
      if (prefix == 'tel')
         result += "TEL:" + vCardEncode(Url_StripProtocol(address)) + "\n";
      else if (prefix == 'mailto')
         result += "EMAIL:" + vCardEncode(Url_StripProtocol(address)) + "\n";
      else if (address.includes('://'))
         result += "URL:" + vCardEncode(address) + "\n";
      else
         result += "IMPP:" + vCardEncode(address) + "\n";
   }
   
   return result;
}

// contactID is email format
function createErrorVCard(contactID)
{
   // return an empty vCard so the server knows there was an error
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nUID:" + vCardEncode(contactID) + "\n";
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nNOTE:SA_ERROR\nEND:VCARD";
   return vCard;
}

async function getVcardIdsAndType(protocol, address)
{
   let socialID = address;
   let impp = address;
   
   // can we convert from a username to a numeric ID?
   if (socialID.includes('fbun.socialattache.com'))
   {
      socialID = await getFacebookAddressFromId(getEmailPrefix(socialID), FacebookAddressFormatNumeric);
   }
   
   // can we convert from a numeric ID to a username?
   if (impp.includes('fbperid.socialattache.com') ||
      impp.includes('fbpage.socialattache.com'))
   {
      const temp = await getFacebookAddressFromId(getEmailPrefix(impp), FacebookAddressFormatUsername);
      if (temp)
         impp = temp;
   }
   
   // do the addresses have the correct type?
   if (!impp.includes('un.socialattache.com'))
      impp = null;        // it's an email or an ID, not an IM
   if (socialID && (protocol == 'mailto' || socialID.includes('un.socialattache.com')))
      socialID = null;    // it's an email or a username, not an ID
   
   // DRL FIXIT? Not sure if we should flag a page as an "org"?
   let kind = address.includes('fbrmid.socialattache.com')
      ? 'group'
      : 'individual';
   
   return [socialID, impp, kind];  // note the impp here is email format without protocol
}

// DRL FIXIT! Sometimes a profile seems unavailable (such as https://www.facebook.com/1192523757434002)
// and in that case we should return an error instead of returning an empty profile.
// The contactID (in email format) can be provided if known so we will add it if we don't see it in the parsed results
// as I have seen a page that had two IDs (the page ID 100063841410442 and the conversation ID 545405342287704
// did not match).
async function getvCardFromFacebookProfileOrPage(contactID)
{
   let url = window.location.href;
   assert(!url.includes('/groups/'));
   assert(!url.includes('/messages/'));
   
   let addr = null;
   let socialID = null;
   let kind = null;
   let addresses = []
   let name = null;
   let photo = null;
   let intro = null;
   let aboutBox = null;
   let address = null;
   let gender = null;
   let birthday = null;
   
   // parsing a Facebook contact is done in three passes, first their profile home page, then two of their about pages
   let error = null;
   if (!window.location.href.includes('/about') && !window.location.href.includes('=about'))
   {
      name = await waitForElement(srchPathVcFB('displayName'));
      if (name)
      {
         addr = await getFacebookAddressFromUrl(url, FacebookAddressFormatNumeric);
         if (addr == null)
         {
            Log_WriteErrorCallStack('Unable to get numeric ID for URL: ' + url);
            assert(contactID != null);
            return createErrorVCard(contactID);
         }
         
         let impp = null;
         [socialID, impp, kind] = await getVcardIdsAndType('fbp', addr);
         
         if (contactID && contactID.includes('@fbun.'))
            contactID = null;
         if (!socialID && !contactID)
            Log_WriteError('Unable to get social ID for profile: ' + window.location.href);
         
         if (impp)
            addresses.push('facebook:' + Url_GetEmailPrefix(impp));
         
         intro = findElement(srchPathVcFB('introduction'));
         
         // our profile logic may need the profile info in order to find the correct photo
         let profileID = Url_GetEmailPrefix(socialID ? socialID : contactID);
         let shortName = removeContentInBrackets(name);  // sometimes the bracketed part of the name is not included so we won't search with it
         setSelectorVariables({ProfileName: shortName, ProfileID: profileID});
         
         // - some profile photos don't seem to have a larger version we can access (should use smaller one?): https://www.facebook.com/dean.middleburgh
         // - some profile photos have a larger version that pops up when you click on it: https://www.facebook.com/jbnet
         // - some profile photos have a pop-up menu with an option you can click on to get a larger image: https://www.facebook.com/Jason.D.Grossman
         
         // DRL FIXIT! I think this code needs to be improved so we use the big image when we have one and
         // use the smaller image when we don't (i.e. https://www.facebook.com/holly.hanerlo). We also want
         // to improve the code to make it easier to update via Constants.js as there is logic here that could
         // be moved there.
         // For some profiles we need to click the menu item to get to the photo page (but not all!!).
         
         // if the photo is clickable click it
         if (await waitForElement(srchPathVcFB('profilePhotoButton'), 4))
         {
            // if there's a menu click the option in the menu
            await waitForElement(srchPathVcFB('dropdownMenuOpenProfilePhotoButton'), 4)
            
            // process the big photo
            let temp = await waitForElement(srchPathVcFB('bigProfilePhoto'), 4);
            if (temp != null)
            {
               if (temp.hasAttribute('src'))
                  photo = temp.getAttribute('src');
               else if (temp.hasAttribute('href'))
                  photo = temp.getAttribute('href');
               if (photo == null && temp.hasAttribute('data-store'))
               {
                  let data = JSON.parse(temp.getAttribute('data-store'));
                  photo = data.imgsrc;
               }
               if (!await waitForElement(srchPathVcFB('closeBigProfilePhoto')))
                  Log_WriteError('Close profile photo button not found at: ' + window.location.href);
            }
         }
         else
         {
            photo = await waitForElement(srchPathVcFB('inlineProfilePhoto'), 4);
         }
         if (photo == null)
            Log_WriteError('No photo obtained for Facebook profile at: ' + window.location.href);
         
         clearSelectorVariables();
      }
      else
      {
         error = "Unable to get name for Facebook profile at " + window.location.href;
      }
   }
   else
   {
      aboutBox = findElement(srchPathVcFB('aboutBox'));
      if (aboutBox)
      {
         // this is used to avoid matching on links for the profile pages
         let baseUrl = url.substring(0, url.indexOf('about'));
         setSelectorVariables({BaseURL: baseUrl});
         
         address = findElement(srchPathVcFB('livesIn'), null, aboutBox);
         gender = findElement(srchPathVcFB('gender'), null, aboutBox);
         birthday = findElement(srchPathVcFB('birthday'), null, aboutBox);
         let temps = findElements(srchPathVcFB('phones'), null, aboutBox);
         for (let temp of temps)
         {
            addresses.push(temp);
         }
         temps = findElements(srchPathVcFB('emails'), null, aboutBox);
         for (let temp of temps)
         {
            addresses.push(temp);
         }
         temps = findElements(srchPathVcFB('links'), null, aboutBox);
         for (let temp of temps)
         {
            addresses.push(temp);
         }
         
         clearSelectorVariables();
      }
      else
      {
         error = "Unable to get aboutBox for Facebook profile at " + window.location.href;
      }
   }
   // DRL FIXIT? Should add scraping of language(s) since that is found on the profile.
   
   if (name == null && aboutBox == null)
   {
      if (findElement(srchPathVcFB('unavailableProfile')))
         Log_WriteInfo("Facebook profile is not available 2 at " + window.location.href);
      else if (!findElement(srchPathVcFB('profileHasLoaded')))
      {
         Log_WriteInfo("Facebook profile is not loaded at " + window.location.href);
         return null;
      }
      else
         Log_WriteError(error);
      return createErrorVCard(contactID);
   }
   
   let timeZone = null;
   if (address)
      address = await LocaleAddress.NormalizeAddress(address);
   if (address)
      timeZone = await LocaleAddress.GetTimeZoneForAddress(address);
   
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:" + kind +
      // we prefer the numeric ID for the contact UID because it never changes
      "\nUID:" + vCardEncode(Url_StripProtocol(socialID ? socialID : contactID)) +
      "\nFN:" + vCardEncode(name) + "\n";
   if (intro)
      vCard += "NOTE:" + vCardEncode(intro) + "\n";
   if (photo)
      vCard += "PHOTO;VALUE=uri:" + vCardEncode(photo) + "\n";
   if (address)
      vCard += "ADR:" + vCardEncodeAddress(address) + "\n";
   if (socialID)
      vCard += "X-SOCIAL-ID:" + vCardEncode('fbp:' + socialID) + "\n";
   if (contactID && contactID != socialID)
      vCard += "X-SOCIAL-ID:" + vCardEncode('fbp:' + contactID) + "\n";
   if (timeZone)
      vCard += "TZ:" + vCardEncode(timeZone) + "\n";
   if (gender)
      vCard += "X-GENDER:" + vCardEncode(gender) + "\n";
   if (birthday)
      vCard += "BDAY:" + vCardEncode(DateAndTime_FromString(birthday).ToFormat('%/D')) + "\n";
   
   vCard += convertAddressesForvCard(addresses);
   
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nEND:VCARD";
   
   return vCard;
}

async function getvCardFromNameAndAddress(name, imType, protocol, address, groupID = null)
{
   let [socialID, impp, kind] = await getVcardIdsAndType(protocol, address);
   
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:" + kind +
      // we prefer the numeric ID for the contact UID because it never changes
      "\nUID:" + vCardEncode(Url_StripProtocol(socialID ? socialID : address)) +
      "\nFN:" + vCardEncode(name) + "\n";
   
   if (socialID)
      vCard += "X-SOCIAL-ID:" + vCardEncode(protocol + ':' + socialID) + "\n";
   if (impp)
      vCard += convertAddressesForvCard([imType + ':' + Url_GetEmailPrefix(impp)]);
   if (protocol == 'mailto')
      vCard += convertAddressesForvCard([protocol + ':' + address]);
   if (groupID)
      vCard += "X-ADDRESSBOOKSERVER-GROUP:" + vCardEncode(groupID) + "\n";
   
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nEND:VCARD";
   
   return vCard;
}

function getAddressFromInstagramProfile()
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   return id.length > 0 ? validateAddress(id + '@igun.socialattache.com') : null;
}

async function getvCardFromInstagramProfile(contactID)
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   
   let addresses = ['instagram:' + id];
   
   let name = await waitForElement(srchPathVcIG('profileName'));
   if (name == null)
   {
      if (findElement(srchPathVcIG('unavailableProfile')))
         Log_WriteInfo("Instagram profile is not available at " + window.location.href);
      else if (!findElement(srchPathVcIG('profileHasLoaded')))
      {
         Log_WriteInfo("Instagram profile is not loaded at " + window.location.href);
         return null;
      }
      else
         Log_WriteError("Unable to get name for Instagram profile " + window.location.href);
      return createErrorVCard(contactID);
   }
   name = Utilities_ReplaceInString(name.innerText.trim(), "\n", ' '); // DRL FIXIT! Move to selector.
   
   let shortName = removeContentInBrackets(name);  // this was for Facebook, may not be needed here?
   
   setSelectorVariables({ProfileName: shortName, ProfileID: id});
   
   let intro = findElement(srchPathVcIG('profileIntro'));
   let photo = findElement(srchPathVcIG('photoImage'));
   if (photo == null)
   {
      Log_WriteError('No photo obtained for Instagram profile at: ' + window.location.href);
   }
   
   clearSelectorVariables();
   
   id = validateAddress(id + '@igun.socialattache.com');
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:individual\nUID:" + vCardEncode(id) + "\nFN:" + vCardEncode(name) + "\n";
   if (intro)
      vCard += "NOTE:" + vCardEncode(intro) + "\n";
   if (photo)
      vCard += "PHOTO;VALUE=uri:" + vCardEncode(photo) + "\n";
   
   vCard += convertAddressesForvCard(addresses);
   
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nEND:VCARD";
   
   return vCard;
}

function getAddressFromTikTokProfile()
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   if (id.startsWith('@'))
      id = id.substr(1);
   
   return id.length > 0 ? validateAddress(id + '@ttun.socialattache.com') : null;
}

async function getvCardFromTikTokProfile(contactID)
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   if (id.startsWith('@'))
      id = id.substr(1);
   
   let addresses = ['tiktok:' + id];
   
   let name = await waitForElement(srchPathVcTT('profileName'));
   if (name == null)
   {
      Log_WriteError("Unable to get name for TikTok profile " + window.location.href);
      return createErrorVCard(contactID);
   }
   
   setSelectorVariables({ProfileName: name, ProfileID: id});
   
   let intro = findElement(srchPathVcTT('profileIntro'));
   // DRL FIXIT! The URLs seem to go to a TikTok provided warning page and the user has to click
   // through to the website! We should convert these (but it's not as easy as redirection)!
   let temps = findElements(srchPathVcTT('websiteA'));
   for (let temp of temps)
   {
      addresses.push(temp);
   }
   let photo = findElement(srchPathVcTT('photoImage'));
   if (photo == null)
   {
      Log_WriteError('No photo obtained for TikTok profile at: ' + window.location.href);
   }
   
   clearSelectorVariables();
   
   id = validateAddress(id + '@ttun.socialattache.com');
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:individual\nUID:" + vCardEncode(id) + "\nFN:" + vCardEncode(name) + "\n";
   if (intro)
      vCard += "NOTE:" + vCardEncode(intro) + "\n";
   if (photo)
      vCard += "PHOTO;VALUE=uri:" + vCardEncode(photo) + "\n";
   
   vCard += convertAddressesForvCard(addresses);
   
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nEND:VCARD";
   
   return vCard;
}

function getAddressFromPinterestProfile()
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   return id.length > 0 ? validateAddress(id + '@pintun.socialattache.com') : null;
}

async function getvCardFromPinterestProfile(contactID)
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   
   let addresses = ['pinterest:' + id];
   
   let name = await waitForElement(srchPathVcPI('profileName'));
   if (name == null)
   {
      Log_WriteError("Unable to get name for Pinterest profile " + window.location.href);
      return createErrorVCard(contactID);
   }
   
   setSelectorVariables({ProfileName: name, ProfileID: id});
   
   let temp = findElement(srchPathVcPI('profileWebsite'));
   if (temp != null)
      addresses.push(temp);
   let intro = findElement(srchPathVcPI('profileIntro'));
   let photo = findElement(srchPathVcPI('photoImage'));
   if (photo == null)
   {
      Log_WriteError('No photo obtained for Pinterest profile at: ' + window.location.href);
   }
   
   clearSelectorVariables();
   
   id = validateAddress(id + '@pintun.socialattache.com');
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:individual\nUID:" + vCardEncode(id) + "\nFN:" + vCardEncode(name) + "\n";
   if (intro)
      vCard += "NOTE:" + vCardEncode(intro) + "\n";
   if (photo)
      vCard += "PHOTO;VALUE=uri:" + vCardEncode(photo) + "\n";
   
   vCard += convertAddressesForvCard(addresses);
   
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nEND:VCARD";
   
   return vCard;
}

/*
async function getvCardFromSalesNavigatorProfile() {
    let intro = null;
    let birthday = null;
    let addresses = [];
    
    // DRL FIXIT!
    let id = null;
    assert(0);
    
    let name = await waitForElement(srchPathVcSN('profileName'));
    if (name == null) {
        Log_WriteError("Unable to get name for LinkedIn profile " + window.location.href);
        return createErrorVCard(contactID);
    }
    name = Utilities_ReplaceInString(temp.innerText.trim(), "\n", ' '); // DRL FIXIT! Move to selector.
    
    setSelectorVariables({ProfileName: name, ProfileID: id});
    
    let title = findElement(srchPathVcSN('profileTitle'));
    let company = findElement(srchPathVcSN('profileCompany'));
    let temp = findElement(srchPathVcSN('profileAbout'));
    if (temp != null) {
        let bttn = findElement(srchPathVcSN('profileAboutSeeMore'), null, temp);
        if (bttn == null)
        {
            intro = temp.innerText.trim();
        }
        else
        {
            bttn.click();
            temp = findElement(srchPathVcSN('profileAboutPopUp'));
            intro = temp.innerText.trim();
            bttn = findElement(srchPathVcSN('profileAboutClose'));
            bttn.click();
        }
    }
    let address = findElement(srchPathVcSN('profileLocation'));
    let photo = findElement(srchPathVcSN('photoImage'));
    if (photo == null) {
        Log_WriteError('No photo obtained for LinkedIn profile at: ' + window.location.href);
    }
    
    let temps = findElements(srchPathVcSN('profileLinks'));
    for (let temp of temps)
    {
        addresses.push(temp.href);
    }
    
    let bttn = findElement(srchPathVcSN('profileMoreMenu'));
    if (bttn != null) {
        bttn.click();   // DRL FIXIT! Clicking the button has no effect!!
        await sleep(1);
        bttn = findElement(srchPathVcSN('profileCopyProfileLink'));
        if (bttn != null) {
            let saved = MyClipboard.GetClipboardText();
            bttn.click();
            await sleep(1);
            id = MyClipboard.GetClipboardText();
            MyClipboard.CopyTextToClipboard(saved);
            id = id.substr(id.indexOf('/in/')+4);
            addresses.push('linkedin:' + id);
        }
    }
    
    let timeZone = null;
    if (address)
        address = await LocaleAddress.NormalizeAddress(address);
    if (address)
        timeZone = await LocaleAddress.GetTimeZoneForAddress(address);
    
    clearSelectorVariables();
    
    id = validateAddress(id + '@liun.socialattache.com');
    let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:individual\nUID:" + vCardEncode(id) + "\nFN:" + vCardEncode(name) + "\n";
    if (title)
        vCard += "TITLE:" + vCardEncode(title) + "\n";
    if (company)
        vCard += "ORG:" + vCardEncode(company) + "\n";
    if (intro)
        vCard += "NOTE:" + vCardEncode(intro) + "\n";
    if (photo)
        vCard += "PHOTO;VALUE=uri:" + vCardEncode(photo) + "\n";
    if (address)
        vCard += "ADR:" + vCardEncodeAddress(address) + "\n";
    if (timeZone)
        vCard += "TZ:" + vCardEncode(timeZone) + "\n";
    if (birthday)
        vCard += "BDAY:" + vCardEncodeDate(birthday) + "\n";
    
    vCard += convertAddressesForvCard(addresses);
    
    vCard += "REV:" + (new Date()).toISOString()
       .replace(/-/g, '').replace(/:/g, '')
       .substr(0, 15) + "Z\nEND:VCARD";
    
    return vCard;
}
*/
function getAddressFromTwitterProfile()
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   return id.length > 0 ? validateAddress(id + '@twitun.socialattache.com') : null;
}

async function getvCardFromTwitterProfile(contactID)
{
   let url = window.location.pathname;
   
   let id = url.split('/')[1];
   
   let addresses = ['twitter:' + id];
   
   let name = await waitForElement(srchPathVcTW('profileName'));
   if (name == null)
   {
      Log_WriteError("Unable to get name for Twitter profile " + window.location.href);
      return createErrorVCard(contactID);
   }
   
   setSelectorVariables({ProfileName: name, ProfileID: id});
   
   let intro = findElement(srchPathVcTW('profileIntro'));
   let address = findElement(srchPathVcTW('profileLocation'));
   let temp = findElement(srchPathVcTW('profileWebsite'));
   if (temp != null)
      addresses.push(Url_SetProtocol(temp, 'https'));
   let birthday = findElement(srchPathVcTW('profileBirthday'));
   let photo = findElement(srchPathVcTW('photoImage'));
   if (photo == null)
   {
      Log_WriteError('No photo obtained for Twitter profile at: ' + window.location.href);
   }
   
   let timeZone = null;
   if (address)
      address = await LocaleAddress.NormalizeAddress(address);
   if (address)
      timeZone = await LocaleAddress.GetTimeZoneForAddress(address);
   
   clearSelectorVariables();
   
   id = validateAddress(id + '@twitun.socialattache.com');
   let vCard = "BEGIN:VCARD\nVERSION:2.1\nKIND:individual\nUID:" + vCardEncode(id) + "\nFN:" + vCardEncode(name) + "\n";
   if (intro)
      vCard += "NOTE:" + vCardEncode(intro) + "\n";
   if (photo)
      vCard += "PHOTO;VALUE=uri:" + vCardEncode(photo) + "\n";
   if (address)
      vCard += "ADR:" + vCardEncodeAddress(address) + "\n";
   if (timeZone)
      vCard += "TZ:" + vCardEncode(timeZone) + "\n";
   if (birthday)
      vCard += "BDAY:" + vCardEncodeDate(birthday) + "\n";
   
   vCard += convertAddressesForvCard(addresses);
   
   vCard += "REV:" + (new Date()).toISOString()
      .replace(/-/g, '').replace(/:/g, '')
      .substr(0, 15) + "Z\nEND:VCARD";
   
   return vCard;
}

function getInstagramProfileAddressFromUrl(url)
{
   if (url == null)
   {
      return '';
   }
   let urlParts = url.split("/");
   let targetIndex = urlParts.length - 1;
   // Check if the last part is null
   if (urlParts[targetIndex] == '')
   {
      // If it's null, use the part before it
      targetIndex -= 1;
   }
   return urlParts[targetIndex];
}

function removeContentInBrackets(input)
{
   // Use regex to remove content within brackets
   const trimmedInput = input.replace(/\s*\(.*?\)\s*/g, '');
   return trimmedInput.trim();
}
