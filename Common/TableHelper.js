// ========================================================================
//        Copyright � 2017 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Utilities used in conjunction with FilterTable and SelectTable and EditTree.

var _SelectAllEnabled = false;
var _IgnoreSelectionChange = false;

// return "row_" or "node_" style prefix from an ID (without the underscore), or null if no prefix
function GetPrefix(id)
{
   let i = id.lastIndexOf("_");
   if (i == -1) return null;
   return id.substr(0, i);
}

function GetSuffix(id)
{
   let i = id.lastIndexOf("_");
   if (i == -1) return null;
   return id.substr(i + 1);
}

// remove "row_" or "node_" style prefix from an ID
function StripPrefix(id)
{
   let i = id.lastIndexOf("_");
   if (i != -1)
      id = id.substr(i + 1);
   return id;
}

function StripSuffix(id)
{
   let i = id.lastIndexOf("_");
   if (i != -1)
      id = id.substr(0, i);
   return id;
}

// remove "row_" or "node_" style prefix from IDs
function StripPrefixes(ids)
{
   for (let i = 0; i < ids.length; i++)
   {
      ids[i] = StripPrefix(ids[i]);
   }
}

function AddPrefixes(ids, prefix)
{
   prefix += '_';
   for (let i = 0; i < ids.length; i++)
   {
      ids[i] = prefix + ids[i];
   }
}

function SelectAllRows()
{
   assert(!IsViewStatePage());
   
   _SelectAllEnabled = true;
   let table = Utilities_GetElementById('content_table');
   if (table != null)
   {
      _IgnoreSelectionChange = true;      // don't clear _SelectAllEnabled!
      SelectTable.SelectAllRows(table);
      _IgnoreSelectionChange = false;
   }
   let tree = Utilities_GetElementsByClass('edittree')[0];
   if (tree != null)
   {
      _IgnoreSelectionChange = true;      // don't clear _SelectAllEnabled!
      EditTree.SelectAllRows(tree);
      _IgnoreSelectionChange = false;
   }
}

function DeselectAllRows()
{
   assert(!IsViewStatePage());
   
   let table = Utilities_GetElementById('content_table');
   if (table != null)
   {
      SelectTable.ClearSelection(table);
   }
   let tree = Utilities_GetElementsByClass('edittree')[0];
   if (tree != null)
   {
      EditTree.ClearSelection(tree);
   }
   _SelectAllEnabled = false;
}

function AllRowsSelected()
{
   assert(!IsViewStatePage());
   return _SelectAllEnabled;
}

function SendSelectedItemsEmail()
{
   let table = Utilities_GetElementById("content_table");
   let selectedIds = SelectTable.GetSelectedIds(table);
   let filteredIds = FilterTable.GetFilteredIds(table);
   selectedIds = Utilities_UnionArrays(selectedIds, filteredIds);
   StripPrefixes(selectedIds);
   window.location.href = "mailto:" + selectedIds.join(",");
}

function TableSearchChanged()
{
   // whenever the user changes the selection we turn off "select all" mode
   if (!_IgnoreSelectionChange)
      _SelectAllEnabled = false;
}

SelectTable.AddSelectionChangedCallback(TableSearchChanged);
