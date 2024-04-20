// ========================================================================
//        Copyright � 2019 Dominique Lacerte, All Rights Reserved.
//
// Redistribution and use in source and binary forms are prohibited without
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================


function File_GetFilename(path)
{
   return path.replace(/^.*(\\|\/|\:)/, '');
}

function File_GetFilenameWithoutExtension(path)
{
   var filename = File_GetFilename(path);
   return filename.substring(0, filename.lastIndexOf('.')) || filename;
}

function File_GetPath(path)
{
   var i = path.lastIndexOf('\\');
   var j = path.lastIndexOf('/');
   return i > j ? path.substr(0, i + 1) : (j >= 0 ? path.substr(0, j + 1) : '');
}

function File_GetExtension(path)
{
   var filename = File_GetFilename(path);
   var i = filename.lastIndexOf('.');
   return i >= 0 ? filename.substring(i + 1) : '';
}
