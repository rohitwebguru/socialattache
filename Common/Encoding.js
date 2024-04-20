// ========================================================================
//        Copyright � 2018 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

/*
// From http://www.webtoolkit.info
var Base64 =
{
   
   // private property
   _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
   
   // public method for encoding
   encode: function (input)
   {
      var output = "";
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0;
      
      input = Base64._utf8_encode(input);
      
      while (i < input.length) {
         chr1 = input.charCodeAt(i++);
         chr2 = input.charCodeAt(i++);
         chr3 = input.charCodeAt(i++);
         
         enc1 = chr1 >> 2;
         enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
         enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
         enc4 = chr3 & 63;
         
         if (isNaN(chr2)) {
            enc3 = enc4 = 64;
         }
         else if (isNaN(chr3)) {
            enc4 = 64;
         }
         
         output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
      } // Whend
      
      return output;
   }, // End Function encode
   
   
   // public method for decoding
   decode: function (input)
   {
      var output = "";
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0;
      
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      while (i < input.length) {
         enc1 = this._keyStr.indexOf(input.charAt(i++));
         enc2 = this._keyStr.indexOf(input.charAt(i++));
         enc3 = this._keyStr.indexOf(input.charAt(i++));
         enc4 = this._keyStr.indexOf(input.charAt(i++));
         
         chr1 = (enc1 << 2) | (enc2 >> 4);
         chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
         chr3 = ((enc3 & 3) << 6) | enc4;
         
         output = output + String.fromCharCode(chr1);
         
         if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
         }
         
         if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
         }
         
      } // Whend
      
      output = Base64._utf8_decode(output);
      
      return output;
   }, // End Function decode
   
   
   // private method for UTF-8 encoding
   _utf8_encode: function (string)
   {
      var utftext = "";
      string = string.replace(/\r\n/g, "\n");
      
      for (var n = 0; n < string.length; n++) {
         var c = string.charCodeAt(n);
         
         if (c < 128) {
            utftext += String.fromCharCode(c);
         }
         else if ((c > 127) && (c < 2048)) {
            utftext += String.fromCharCode((c >> 6) | 192);
            utftext += String.fromCharCode((c & 63) | 128);
         }
         else {
            utftext += String.fromCharCode((c >> 12) | 224);
            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
            utftext += String.fromCharCode((c & 63) | 128);
         }
         
      } // Next n
      
      return utftext;
   }, // End Function _utf8_encode
      
      // private method for UTF-8 decoding
   _utf8_decode: function (utftext)
   {
      var string = "";
      var i = 0;
      var c, c1, c2, c3;
      c = c1 = c2 = 0;
      
      while (i < utftext.length) {
         c = utftext.charCodeAt(i);
         
         if (c < 128) {
            string += String.fromCharCode(c);
            i++;
         }
         else if ((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i + 1);
            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
         }
         else {
            c2 = utftext.charCodeAt(i + 1);
            c3 = utftext.charCodeAt(i + 2);
            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
         }
         
      } // Whend
      
      return string;
   } // End Function _utf8_decode
}
*/

function stringToUTF8(str)
{
   var bytes = [];
   
   Array.from(str).forEach(function(character)
   {
      var code = character.codePointAt(0);
      
      if (code <= 127)
      {
         var byte1 = code;
         
         bytes.push(byte1);
      }
      else if (code <= 2047)
      {
         var byte1 = 0xC0 | (code >> 6);
         var byte2 = 0x80 | (code & 0x3F);
         
         bytes.push(byte1, byte2);
      }
      else if (code <= 65535)
      {
         var byte1 = 0xE0 | (code >> 12);
         var byte2 = 0x80 | ((code >> 6) & 0x3F);
         var byte3 = 0x80 | (code & 0x3F);
         
         bytes.push(byte1, byte2, byte3);
      }
      else if (code <= 2097151)
      {
         var byte1 = 0xF0 | (code >> 18);
         var byte2 = 0x80 | ((code >> 12) & 0x3F);
         var byte3 = 0x80 | ((code >> 6) & 0x3F);
         var byte4 = 0x80 | (code & 0x3F);
         
         bytes.push(byte1, byte2, byte3, byte4);
      }
      
   });
   
   return bytes;
}

function utf8ToString(bytes, fallback)
{
   var valid = undefined;
   var codePoint = undefined;
   var codeBlocks = [0, 0, 0, 0];
   
   var result = "";
   
   for (var offset = 0; offset < bytes.length; offset++)
   {
      var byte = bytes[offset];
      
      if ((byte & 0x80) == 0x00)
      {
         codeBlocks[0] = byte & 0x7F;
         
         codePoint = codeBlocks[0];
      }
      else if ((byte & 0xE0) == 0xC0)
      {
         codeBlocks[0] = byte & 0x1F;
         
         byte = bytes[++offset];
         if (offset >= bytes.length || (byte & 0xC0) != 0x80)
         {
            valid = false;
            break;
         }
         
         codeBlocks[1] = byte & 0x3F;
         
         codePoint = (codeBlocks[0] << 6) + codeBlocks[1];
      }
      else if ((byte & 0xF0) == 0xE0)
      {
         codeBlocks[0] = byte & 0xF;
         
         for (var blockIndex = 1; blockIndex <= 2; blockIndex++)
         {
            byte = bytes[++offset];
            if (offset >= bytes.length || (byte & 0xC0) != 0x80)
            {
               valid = false;
               break;
            }
            
            codeBlocks[blockIndex] = byte & 0x3F;
         }
         if (valid === false)
         {
            break;
         }
         
         codePoint = (codeBlocks[0] << 12) + (codeBlocks[1] << 6) + codeBlocks[2];
      }
      else if ((byte & 0xF8) == 0xF0)
      {
         codeBlocks[0] = byte & 0x7;
         
         for (var blockIndex = 1; blockIndex <= 3; blockIndex++)
         {
            byte = bytes[++offset];
            if (offset >= bytes.length || (byte & 0xC0) != 0x80)
            {
               valid = false;
               break;
            }
            
            codeBlocks[blockIndex] = byte & 0x3F;
         }
         if (valid === false)
         {
            break;
         }
         
         codePoint = (codeBlocks[0] << 18) + (codeBlocks[1] << 12) + (codeBlocks[2] << 6) + (codeBlocks[3]);
      }
      else
      {
         valid = false;
         break;
      }
      
      result += String.fromCodePoint(codePoint);
   }
   
   if (valid === false)
   {
      if (!fallback)
      {
         throw new TypeError("Malformed utf-8 encoding.");
      }
      
      result = "";
      
      for (var offset = 0; offset != bytes.length; offset++)
      {
         result += String.fromCharCode(bytes[offset] & 0xFF);
      }
   }
   
   return result;
}

function decodeBase64(text, binary)
{
   if (/[^0-9a-zA-Z\+\/\=]/.test(text))
   {
      throw new TypeError("The string to be decoded contains characters outside of the valid base64 range.");
   }
   
   var codePointA = 'A'.codePointAt(0);
   var codePointZ = 'Z'.codePointAt(0);
   var codePointa = 'a'.codePointAt(0);
   var codePointz = 'z'.codePointAt(0);
   var codePointZero = '0'.codePointAt(0);
   var codePointNine = '9'.codePointAt(0);
   var codePointPlus = '+'.codePointAt(0);
   var codePointSlash = '/'.codePointAt(0);
   
   function getCodeFromKey(key)
   {
      var keyCode = key.codePointAt(0);
      
      if (keyCode >= codePointA && keyCode <= codePointZ)
      {
         return keyCode - codePointA;
      }
      else if (keyCode >= codePointa && keyCode <= codePointz)
      {
         return keyCode + 26 - codePointa;
      }
      else if (keyCode >= codePointZero && keyCode <= codePointNine)
      {
         return keyCode + 52 - codePointZero;
      }
      else if (keyCode == codePointPlus)
      {
         return 62;
      }
      else if (keyCode == codePointSlash)
      {
         return 63;
      }
      
      return undefined;
   }
   
   var codes = Array.from(text).map(function(character)
   {
      return getCodeFromKey(character);
   });
   
   var bytesLength = Math.ceil(codes.length / 4) * 3;
   
   if (codes[codes.length - 2] == undefined)
   {
      bytesLength = bytesLength - 2;
   }
   else if (codes[codes.length - 1] == undefined)
   {
      bytesLength--;
   }
   
   var bytes = new Uint8Array(bytesLength);
   
   for (var offset = 0, index = 0; offset < bytes.length;)
   {
      var code1 = codes[index++];
      var code2 = codes[index++];
      var code3 = codes[index++];
      var code4 = codes[index++];
      
      var byte1 = (code1 << 2) | (code2 >> 4);
      var byte2 = ((code2 & 0xf) << 4) | (code3 >> 2);
      var byte3 = ((code3 & 0x3) << 6) | code4;
      
      bytes[offset++] = byte1;
      bytes[offset++] = byte2;
      bytes[offset++] = byte3;
   }
   
   if (binary)
   {
      return bytes;
   }
   
   return utf8ToString(bytes, true);
}

function encodeBase64(bytes)
{
   if (bytes === undefined || bytes === null)
   {
      return "";
   }
   
   if (bytes instanceof Array)
   {
      bytes = bytes.filter(function(item)
      {
         return Number.isFinite(item) && item >= 0 && item <= 255;
      });
   }
   
   if (!(bytes instanceof Uint8Array || bytes instanceof Uint8ClampedArray || bytes instanceof Array))
   {
      if (typeof (bytes) == "string")
      {
         var str = bytes;
         bytes = Array.from(unescape(encodeURIComponent(str))).map(function(ch)
         {
            return ch.codePointAt(0);
         });
      }
      else
      {
         throw new TypeError("bytes must be of type Uint8Array or String.");
      }
   }
   
   var keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'];
   var fillKey = '=';
   
   var byte1 = undefined, byte2 = undefined, byte3 = undefined;
   var sign1 = ' ', sign2 = ' ', sign3 = ' ', sign4 = ' ';
   
   var result = "";
   
   for (var index = 0; index < bytes.length;)
   {
      var fillUpAt = false;
      
      byte1 = bytes[index++];
      byte2 = bytes[index++];
      byte3 = bytes[index++];
      
      if (byte2 === undefined)
      {
         byte2 = 0;
         fillUpAt = 2;
      }
      
      if (byte3 === undefined)
      {
         byte3 = 0;
         if (!fillUpAt)
         {
            fillUpAt = 3;
         }
      }
      
      sign1 = keys[byte1 >> 2];
      sign2 = keys[((byte1 & 0x3) << 4) + (byte2 >> 4)];
      sign3 = keys[((byte2 & 0xf) << 2) + (byte3 >> 6)];
      sign4 = keys[byte3 & 0x3f];
      
      if (fillUpAt > 0)
      {
         if (fillUpAt <= 2)
         {
            sign3 = fillKey;
         }
         if (fillUpAt <= 3)
         {
            sign4 = fillKey;
         }
      }
      
      result += sign1 + sign2 + sign3 + sign4;
      
      if (fillUpAt)
      {
         break;
      }
   }
   
   return result;
}

function hexToBase64(str)
{
   return encodeBase64(String.fromCharCode.apply(null, str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" ")));
}