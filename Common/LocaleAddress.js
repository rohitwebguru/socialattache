// ========================================================================
//        Copyright � 2018 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Allows parsing a mailing address to get its parts, and normalizing its display.

// Depends on Google API and GoogleApiKey

LocaleAddress =
   {
      _GetAddressPartByType: function(geoParts, validationParts, type)
      {
         // It seems that when the Geocode API has the value it is more accurate than what the Validation API
         // returns, but sometimes the Geocode API doesn't have the information. For example the Geocode API
         // is missing information for Australia, but the Geocode will correct a bad Canadian postal code where
         // the Validation API leaves it as bad.
         
         let geoValue = '';
         for (let part of geoParts)
         {
            if (Utilities_ArrayContains(part.types, type) && part.long_name)
            {
               geoValue = part.short_name;
               break;
            }
         }
         
         let validationValue = '';
         for (let part of validationParts)
         {
            if (part.componentType == type)
            {
               validationValue = part.componentName.text;
               break;
            }
         }
         
         if (geoValue == '')
            return validationValue;
         if (validationValue == '')
            return geoValue;
         
         // prefer the Geocode postal code
         return type == 'postal_code' ? geoValue : validationValue;
      },
      
      _GetValidationAddressPartByType: function(parts, type)
      {
         for (let part of parts)
         {
            if (part.componentType == type)
               return part.componentName.text;
         }
         
         return '';
      },
      
      // Typically the address is a string with: street address, city, state, postal code, country
      // Items may be left off (i.e. only state and country) or the country may be left off for US
      // and CA, but other formats may be supported.
      // Returns an array matching the vCard spec:
      //   the post office box;
      //   the extended address (e.g., apartment or suite number);
      //   the street address;
      //   the locality (e.g., city);
      //   the region (e.g., state or province);
      //   the postal code;
      //   the country name (full name)
      // Any missing values are "" and never null.
      NormalizeAddress: async function(address)
      {
         if (address.trim() == '')
            return null;
         
         if (GoogleApiKey)
         {
            let geoParts = [];
            let validationParts = [];
            
            let data = null;
            let url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURI(address) +
               '&key=' + encodeURI(GoogleApiKey);
            let response = await ajax.asyncRequest('GET', url, {});
            if (response.httpCode != 200)
            {
               Log_WriteError("Error getting geocode for \"" + address + "\": " + response.httpCode);
            }
            else
            {
               data = Json_FromString(response.data);
               if (data.status == 'OK')
                  geoParts = data.results[0].address_components;
               else
                  Log_WriteError("Error getting geocode for \"" + address + "\": " + data.error_message);
            }
            
            data = null;
            url = 'https://addressvalidation.googleapis.com/v1:validateAddress?key=' + encodeURI(GoogleApiKey);
            let body = '{"address": {"addressLines": ["' + Utilities_ReplaceInString(address, '"', '\\"') + '"]}}';
            response = await ajax.asyncRequest('POST', url, body, null, {'Content-Type': 'application/json'});
            if (response.httpCode != 200)
            {
               Log_WriteError("Error getting validation for \"" + address + "\": " + response.httpCode);
            }
            else
            {
               data = Json_FromString(response.data);
//            if (data.status != 'OK')
//            {
//               Log_WriteError("Error getting validation for \"" + address + "\": " + data.error_message);
//            }
               if (data)
                  validationParts = data.result.address.addressComponents;
            }
            
            // sometimes there's a suffix we can add
            let postalCodeSuffix = LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'postal_code_suffix');
            if (postalCodeSuffix)
               postalCodeSuffix = '-' + postalCodeSuffix;
            else
               postalCodeSuffix = '';
            
            return [
               LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'subpremise'),
               LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'premise'),
               (LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'street_number') + ' ' +
                  LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'route')).trim(),
               LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'locality'),
               LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'administrative_area_level_1'),
               LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'postal_code') + postalCodeSuffix,
               LocaleAddress._GetAddressPartByType(geoParts, validationParts, 'country'),
            ];
         }
         
         let parts = address.split(',');
         for (let i in parts)
            parts[i] = parts[i].trim();
         
         // it's possible we are passed the city and state, so check if we find a country in the last part
         if (parts.length == 2)
         {
            let part1 = parts[1].toUpperCase();
            let isState = LocaleRegionCANamesByCode.hasOwnProperty(part1) ||
               LocaleRegionUSNamesByCode.hasOwnProperty(part1);
            let isCountry = LocaleCountryNamesByCode.hasOwnProperty(part1) ||
               LocaleCountryNamesLookup.hasOwnProperty(part1);
            
            // when we get a two character code that's a state and a country we'll prefer the state
            if (isState || !isCountry)
            {
               // we can try to guess the country from the state
               if (LocaleRegionUSNamesByCode.hasOwnProperty(part1))
                  parts[2] = 'US';
               else if (LocaleRegionCANamesByCode.hasOwnProperty(parts[1].toUpperCase()))
                  parts[2] = 'CA';
               else
                  parts.push(''); // country is not specified
            }
         }
         
         if (parts.length > 3)
         { // sometimes the county is included and we don't want it
            assert(parts.length == 4);
            parts.splice(1, 1);
         }
         while (parts.length < 3)
            parts.unshift('');
         
         // DRL FIXIT! We need better handling here to get the other parts
         return [
            '',
            '',
            '',
            parts[0],
            parts[1],
            '',
            parts[2],
         ];
      },
      
      // address is an array as returned by NormalizeAddress, but other formats should be supported
      GetTimeZoneForAddress: async function(address)
      {
         if (GoogleApiKey == null)
         {
            return null;
         }
         
         address = address.slice();  // get a copy since we'll be changing it
         Utilities_RemoveFromArray(address, null);
         address = address.join(', ');
         // DRL FIXIT! We likely already performed this request via NormalizeAddress() so we are
         // paying twice! We should cache the lat/long from the original query in a static variable.
         let url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURI(address) +
            '&key=' + encodeURI(GoogleApiKey);
         let response = await ajax.asyncRequest('GET', url, {});
         if (response.httpCode != 200)
         {
            Log_WriteError("Error getting geocode for \"" + address + "\": " + response.httpCode);
            return null;
         }
         let data = Json_FromString(response.data);
         if (data.status != 'OK')
         {
            Log_WriteError("Error getting geocode for \"" + address + "\": " + data.error_message);
            return null;
         }
         let location = data.results[0].geometry.location;
         
         url = 'https://maps.googleapis.com/maps/api/timezone/json?location=' +
            encodeURI(location.lat + ',' + location.lng) +
            '&timestamp=' + parseInt(Date.now() / 1000) + '&sensor=false' +
            '&key=' + encodeURI(GoogleApiKey);
         response = await ajax.asyncRequest('GET', url, {});
         if (response.httpCode != 200)
         {
            Log_WriteError("Error getting time zone for \"" + address + "\": " + response.httpCode);
            return null;
         }
         data = Json_FromString(response.data);
         if (data.status != 'OK')
         {
            Log_WriteError("Error getting time zone for \"" + address + "\": " + data.error_message);
            return null;
         }
         return data.timeZoneId;
      }
   };
