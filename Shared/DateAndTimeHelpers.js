function keywordDAT(item)
{
   return localizedKeyword('DateAndTime', item);
}

function toTwoDigits(nb)
{
   assert(nb >= 0);
   return nb < 10 ? '0' + nb : '' + nb;
}

function timestampToString(timestamp)
{
   if (timestamp === null)
      return null;
   if (!timestamp)
   {
      assert(0, "Got invalid timestamp: \"" + timestamp + "\"");
      return null;
   }
   let d = new Date(timestamp);
   if (d.getTime() == NaN)
   {
      assert(0, "Got invalid timestamp: \"" + timestamp + "\"");
      return null;
   }
   return d.getUTCFullYear() + "-" + toTwoDigits(d.getUTCMonth() + 1) + "-" + toTwoDigits(d.getUTCDate()) + " " +
      toTwoDigits(d.getUTCHours()) + ":" + toTwoDigits(d.getUTCMinutes()) + ":" + toTwoDigits(d.getUTCSeconds());
}


// the passed date is of the form YYYY/MM/DD HH:MM:SS and is in GMT
function stringToTimestamp(dateStr)
{
   if (dateStr === null)
      return null;
   if (!dateStr)
   {
      assert(0, "Got invalid dateStr: \"" + dateStr + "\"");
      return null;
   }
   let timestamp = (new Date(dateStr + ' GMT')).getTime(); // convert GMT string date to milliseconds
   if (!timestamp)
   {
      assert(0, "Got timestamp \"" + timestamp + "\" from invalid dateStr \"" + dateStr + "\"");
      return null;
   }
   return timestamp;
}

// handles a string like "1d", "1 d", "1 semaine", "1 mois", "2 minutes" and negative numbers are OK
// DRL FIXIT! Merge this support into parseDateTime() below.
function timeToDelta(text)
{
   // all time are in seconds
   const vals = [
      {word: keywordDAT('UnitStrings').minute, time: SecondsPerMinute},
      {word: keywordDAT('UnitStrings').hour, time: SecondsPerHour},
      {word: keywordDAT('UnitStrings').day, time: SecondsPerDay},
      {word: keywordDAT('UnitStrings').week, time: SecondsPerWeek},
      {word: keywordDAT('UnitStrings').month, time: SecondsPerDay * 30},
      {word: keywordDAT('UnitStrings').year, time: SecondsPerWeek * 52}
   ];
   
   text = text.trim();
   const numberOfVal = text.match(/^[\-0-9]+/)[0];
   text = text.match(/[a-zA-Z]+$/i)[0];
   
   let val = undefined;
   // text examples: 'm', 'y', 'mois', 'semaines', 'j', 'minutes'...
   if (text.length == 1)
   {
      val = vals.find(v => text.startsWith(v.word.substring(0, 1)));
   }
   else
   {
      // the first 2 characters are enough to differentiate vals
      // for example: months, minutes, an, => mo, mi, an
      val = vals.find(v => text.startsWith(v.word.substring(0, 2)));
   }
   
   // DRL FIXIT! Need to return null on error!
   
   return (val ? val.time : vals[0].time) * parseInt(numberOfVal) * 1000; // returning in ms
}

// This method words for the following situations without case sensitiveness
//
// Example for time ago
// Plural: (int) seconds ago, (int) minutes ago, (int) hours ago, (int) days ago, (int) weeks ago, (int) months ago, (int) years ago
// Singular: (int) second ago, (int) minute ago, (int) hour ago, (int) day ago, (int) week ago, (int) month ago, (int) year ago
//
// On considering a week day in the past
// On monday, On tuesday, On wednesday, On thursday, On friday, On saturday, On sunday
//
// DRL FIXIT! Merge this support into parseDateTime() below.
function convertTimeAgoToTimestamp(ago, quiet)
{
   
   const baseLang = getBaseLanguage(getPageLanguage());
   if (baseLang == "fr")
   {
      const needToConvertPattern = new RegExp(keywordFBG('needToConvert'), 'i');
      if (needToConvertPattern.test(ago))
      { // ... à 21 juin 2022
         // convert date to english format
         const frDateRegex = new RegExp(keywordDAT("frDate"), 'i');
         const match = ago.match(frDateRegex);
         const day = match[1];
         const month = keywordDAT("fullMonthsInEnglish")[match[2]];
         const year = match[3];
         ago = `${year}, ${month}, ${day}`;
      }
   }
   if (new Date(ago) instanceof Date && !isNaN(new Date(ago)))
   {
      return (new Date(ago)).getTime();
   }
   ago = ago.trim().toLowerCase();
   
   // start off with a date that has a fixed time, so that when this method is called repeatedly a few minutes
   // apart with the same date what we will return is consistent
   let date = new Date()
   date.setHours(12);
   date.setMinutes(0);
   date.setSeconds(0);
   date.setMilliseconds(0);
   
   // this doesn't handle "Today at..."
   if (ago == keywordDAT('Today').toLowerCase())
   {
      return date.getTime();
   }
   
   // this doesn't handle "Yesterday at..."
   if (ago == keywordDAT('Yesterday').toLowerCase())
   {
      date.setDate(date.getDate() - 1);
      return date.getTime();
   }
   
   const weekDay = new RegExp(keywordFBG('weekDayPattern'), 'i');
   if (weekDay.test(ago))
   {
      let daysInWeeks = keywordDAT('daysInWeekLowercase');
      
      let target = 1 + daysInWeeks.findIndex(day => ago.includes(day));
      if (target == 0)
      {
         if (!quiet)
            Log_WriteError('Error Day not found in ' + baseLang + ' : with ' + ago);
         return null;
      }
      
      date.setDate(date.getDate() - (date.getDay() == target ? 7 : (date.getDay() + (7 - target)) % 7))
      return date.getTime();
   }
   
   let amount = ago.split(' ')[0]
   let unit = ago.split(' ')[1]
   if (amount === keywordDAT('oneA') || amount === keywordDAT('oneAn'))
   { // "an hour ago" | "une heure"
      amount = 1;
   }
   else if (!Utilities_IsInteger(amount))
   {
      if (!quiet)
         Log_WriteError('Unable to decode time ago from "' + ago + '" at ' + window.location.href);
      return null;
   }
   
   const valSingular = keywordDAT('UnitStrings');
   const valPlurial = keywordDAT('UnitStringsPlurial');
   
   switch (unit)
   {
      case valPlurial.second:
      case valSingular.second:
         date = new Date();   // need to be more accurate than the fixed time we set above
         date.setMilliseconds(0);
         return date.getTime() - (amount * 1000)
      case valPlurial.minute:
      case valSingular.minute:
         date = new Date();   // need to be more accurate than the fixed time we set above
         date.setSeconds(0);
         date.setMilliseconds(0);
         return date.getTime() - (amount * 1000 * 60)
      case valPlurial.hour:
      case valSingular.hour:
         date = new Date();   // need to be more accurate than the fixed time we set above
         date.setMinutes(0);
         date.setSeconds(0);
         date.setMilliseconds(0);
         return date.getTime() - (amount * 1000 * 60 * 60)
      case valPlurial.day:
      case valSingular.day:
         return date.getTime() - (amount * 1000 * 60 * 60 * 24)
      case valPlurial.week:
      case valSingular.week:
         return date.getTime() - (amount * 1000 * 60 * 60 * 24 * 7)
      case valPlurial.month:
      case valSingular.month:
         return date.getTime() - (amount * 1000 * 60 * 60 * 24 * 30)
      case valPlurial.year:
      case valSingular.year:
         return date.getTime() - (amount * 1000 * 60 * 60 * 24 * 365)
      default:
         if (!quiet)
            Log_WriteError('Invalid unit "' + unit + '" from "' + ago + '" at ' + window.location.href);
         return null;
   }
}

function testEnglishHour(baseLang, h, amOrpm)
{
   if (baseLang == "en" && amOrpm != null)
   {
      h = parseInt(h);
      if (h < 12 && amOrpm.toUpperCase() == keywordDAT('Suffix').PM)
      {  // if 12 hours format, the PM will convert to 24 hours format
         h = h + 12;
         h = h.toString();
      }
      else if (h == 12 && amOrpm.toUpperCase() == keywordDAT('Suffix').AM)
      {  // 12:xx AM is 0 hours
         h = 0;
         h = h.toString();
      }
   }
   return h;
}

// Parses date and times in various formats, such as:
// I didn't find the equivalent in french
// Today at 11:00
// June 22 at 11:00 AM
function parseDateTimeToTimestamp(dateTime)
{
   if (dateTime == null || dateTime == '')
      return null;
   
   let date = {Y: 0, M: 0, D: 0, h: 0, m: 0, s: 0, value: new Date(), invalid: 'Invalid Date'};
   date.value = new Date(dateTime);
   
   const baseLang = getBaseLanguage(getPageLanguage());
   
   let originalDateTime = dateTime;
   // DRL FIXIT! We should switch to using DateAndTime_FromString() and add the
   // support there for missing formats and languages.
   // Only english datetime are accepted by Javascript Date
   // 6/15/20, 4:35 AM
   // Jan 5, 2021, 8:15 PM
   if (dateTime.length <= 8 || // 11:27 AM | 11 h 47
      dateTime.includes(keywordDAT('MsgTime').sent) ||   // case where the date is from today or yesterday
      dateTime.includes(keywordDAT('MsgTime').TodayAt))
   {
      if (dateTime.length <= 8)
      {
         dateTime = keywordDAT('MsgTime').TodayAt + dateTime;  // convert to "Today at 12:31 PM"
      }
      
      const today = new Date();           // we only handle here today and yesterday
      const recentDateTime = new RegExp(keywordDAT('MsgTime').RecentDateTime + keywordDAT('MsgHoursAndMinutes'));
      
      if (recentDateTime.test(dateTime))
      {              // You sent Today at 12:35PM | Aujourd'hui à 11 h 45
         if (RegExp.$1 == keywordDAT('Yesterday'))
            today.setDate(today.getDate() - 1);
         
         let h = parseInt(RegExp.$2);
         let m = parseInt(RegExp.$3);

         let ampm = RegExp.$4;
         if (ampm == null)
            Log_WriteError('Got null AM/PM for time 1: ' + dateTime);

         h = testEnglishHour(baseLang, h, ampm);
         
         today.setHours(h, m, 0);    // set seconds to 0 otherwise there's a chance the order will be wrong for close messages
         date.value = today;
      }
   }
   else if (dateTime.length <= 12 && (/^[a-z]{3}/i).test(dateTime))
   { // Ven. 23 h 10 | Sun 11:00 PM
      
      const matchRegex12 = new RegExp(keywordDAT("MsgSameWeek"), 'i');
      const match = dateTime.match(matchRegex12);
      let currentDate = new Date();
      
      if (!match)
      {
         Log_WriteError('Error converting Facebook timestamp message : ' + dateTime);
         date.value = currentDate;
      }
      else
      {
         const days = keywordDAT('DaysInWeek3');
         const currentDay = keywordDAT('DaysInWeek3')[currentDate.getDay()];
         
         date.Y = currentDate.getFullYear();
         date.M = keywordDAT("MonthName3")[currentDate.getMonth()];
         date.D = match[1] ? match[1].toLowerCase() : currentDay;  // day in 3 initial (Mon, Tue ...)
         // day may not be there if same day
         const currentDayIndex = days.indexOf(currentDay);
         const dateDayIndex = days.indexOf(date.D);
         let deltaDay = null;
         if (currentDayIndex > dateDayIndex)
         { // NOTE: if they're the same it's not today, it's last week
            deltaDay = currentDayIndex - dateDayIndex;
         }
         else
         {
            deltaDay = 7 + (currentDayIndex - dateDayIndex);
         }
         
         // Note: the change in date could change the month and year
         currentDate.setDate(currentDate.getDate() - deltaDay);
         
         date.h = parseInt(match[2]);
         date.m = parseInt(match[3]);
   
         let ampm = match[4];
         if (ampm == null)
            Log_WriteError('Got null AM/PM for time 2: ' + dateTime);

         date.h = testEnglishHour(baseLang, date.h, ampm);
         
         currentDate.setHours(date.h, date.m, 0);
         
         date.value = currentDate;
      }
   }
   else if ((/[0-9]{4}/).test(dateTime))
   { // Jan 24, 2022, 2:23 PM |8 jun 2022 16 h 30
      const month = dateTime.match(/([a-z]{3})/i)[1].toLowerCase();
      const matchRegex4Digits = new RegExp(keywordDAT('MsgHoursAndMinutes'))
      const msgHoursAndMinutes = dateTime.match(matchRegex4Digits);
      let h = msgHoursAndMinutes[1];
      let m = msgHoursAndMinutes[2];
   
      let ampm = msgHoursAndMinutes[3];
      if (ampm == null)
         Log_WriteError('Got null AM/PM for time 3: ' + dateTime);

      h = testEnglishHour(baseLang, h, ampm);

      date.value = new Date(
         `${keywordDAT("MonthsInEnglish")[month]} ${dateTime.match(/[0-9]{1,2}/)[0]}, ${dateTime.match(/[0-9]{4}/)[0]} ${h}:${m}`
      )
   }
   else if ((/^([0-9]{1,2}(\/|-)){2}[0-9]{1,2}/).test(dateTime))
   { // 12/26/21, 3:48 PM | 21-12-22 19 h 26
      const matchRegex = new RegExp(keywordDAT("MsgOldDate"));
      const dateMatch = dateTime.match(matchRegex);
      if (baseLang == 'fr')
      {
         date.value = new Date(
            "20" + dateMatch[1],
            dateMatch[2] - 1, // months between 0-11
            dateMatch[3],
            dateMatch[4],
            dateMatch[5]
         )
      }
      else if (baseLang == 'en')
      {
         let h = dateMatch[4];

         let ampm = dateMatch[6];
         if (ampm == null)
            Log_WriteError('Got null AM/PM for time 4: ' + dateTime);
   
         h = testEnglishHour(baseLang, h, ampm);
         
         date.value = new Date(
            "20" + dateMatch[3],
            dateMatch[1] - 1,
            dateMatch[2],
            h,
            dateMatch[5]
         )
      }
   }
   else
   {
      Log_WriteError('Page language not specified for ' + location.href + "using " + baseLang);
   }
   
   let result = date.value == date.invalid ? null : date.value.getTime();
   if (result != null && result > Date.now())
   {
      Log_WriteError('Incoming value of "' + originalDateTime + '" is resulting in future timestamp: ' + result);
   }
   return result;
}

// DRL FIXIT? I believe this is only used by Instagram scraper and I believe we should merge this logic into parseDateTimeToTimestamp().
function parseDateTime(dateTime)
{
   let date = new Date();
   if (dateTime.includes(','))
   {
      date = new Date(dateTime);
   }
   else
   {
      let parts = dateTime.trim().split(' ');
      if (parts.length == 2)
      {
         if (parts[1].length == 2)
         {
            parts.unshift(keywordDAT('Today'));
         }
         else
         {
            parts[2] = parts[1].slice(-2);
            parts[1] = parts[1].slice(0, -2);
         }
      }
      let diff = 0;
      if (parts[0] == keywordDAT('Today'))
      {
      }
      else if (parts[0] == keywordDAT('Yesterday'))
      {
         diff = 1;
      }
      else if (keywordDAT('DaysInWeek').indexOf(parts[0]) != -1)
      {
         diff = date.getDay() - keywordDAT('DaysInWeek').indexOf(parts[0]);
         if (diff <= 0)
         {
            diff = 7 + diff;
         }
      }
      else
      {
         Log_WriteError('Unrecognized interval key in "' + dateTime + '" for language ' + pageLanguage);
         throw new Error("Got invalid timestamp")
      }
      date.setDate(date.getDate() - diff);
      date = new Date(date.toString().substring(0, 16) + parts[1] + ' ' + parts[2]);
   }
   let d = date.getTime();
   if (timestampToString(d) == null)
   {
      Log_WriteError('Got invalid timestamp converting string "' + dateTime + '"  for language ' + pageLanguage);
      throw new Error("Got invalid timestamp")
   }
   return d;
}

