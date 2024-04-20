var Selections =
   {
      GetSelections: function(elemID)
      {
         let selections = [];
         
         let elem = Utilities_GetElementById(elemID);
         assert(elem != null);
         
         let elems = Utilities_GetElementsByClass('select_table', NULL, elem, true);
         for (let table of elems)
         {
            if (table == elem || table.parentElement == elem) // avoid matching on views within views
            {
               Utilities_MergeIntoArray(selections, SelectTable.GetSelectedIds(table));
            }
         }
         
         elems = Utilities_GetElementsByClass('edittree', NULL, elem, true);
         for (let tree of elems)
         {
            if (tree == elem || tree.parentElement == elem) // avoid matching on views within views
            {
               Utilities_MergeIntoArray(selections, EditTree.GetSelectedIds(tree));
            }
         }
         
         return selections;
      },
      
      GetAllRows: function(elemID)
      {
         let allIDs = [];
         
         let elem = Utilities_GetElementById(elemID);
         assert(elem != null);
         
         let elems = Utilities_GetElementsByClass('select_table', NULL, elem, true);
         for (let table of elems)
         {
            if (table == elem || table.parentElement == elem) // avoid matching on views within views
            {
               Utilities_MergeIntoArray(allIDs, SelectTable.GetIds(table));
            }
         }
         
         elems = Utilities_GetElementsByClass('edittree', NULL, elem, true);
         for (let tree of elems)
         {
            if (tree == elem || tree.parentElement == elem) // avoid matching on views within views
            {
               Utilities_MergeIntoArray(allIDs, EditTree.GetIds(tree));
            }
         }
         
         return allIDs;
      },
      
      // DRL FIXIT? I don't think this belongs here?
      GetRowCount: function(elemID)
      {
         let elem = Utilities_GetElementById(elemID);
         assert(elem != null);
         
         let count = 0;
         
         let elems = Utilities_GetElementsByClass('select_table', NULL, elem, true);
         for (let table of elems)
         {
            if (table == elem || table.parentElement == elem) // avoid matching on views within views
               count += SelectTable.GetIds(table).length;
         }
         
         elems = Utilities_GetElementsByClass('edittree', NULL, elem, true);
         for (let tree of elems)
         {
            if (tree == elem || tree.parentElement == elem) // avoid matching on views within views
               count += EditTree.GetIds(tree).length;
         }
         
         return count;
      },
      
      SetSelectedRows: function(elemID, selections)
      {
         let elem = Utilities_GetElementById(elemID);
         
         let elems = Utilities_GetElementsByClass('select_table', NULL, elem, true);
         for (let table of elems)
         {
            if (table == elem || table.parentElement == elem) // avoid matching on views within views
            {
               SelectTable.ClearSelection(table);
               SelectTable.SelectIds(selections, table);
            }
         }
         
         elems = Utilities_GetElementsByClass('edittree', NULL, elem, true);
         for (let tree of elems)
         {
            if (tree == elem || tree.parentElement == elem) // avoid matching on views within views
            {
               EditTree.ClearSelection(tree);
               EditTree.SelectIds(selections, tree);
            }
         }
      },
      
      SelectAllRows: function(elemID)
      {
         let elem = Utilities_GetElementById(elemID);
         
         let elems = Utilities_GetElementsByClass('select_table', NULL, elem, true);
         for (let table of elems)
         {
            if (table == elem || table.parentElement == elem) // avoid matching on views within views
               SelectTable.SelectAllRows(table);
         }
         
         elems = Utilities_GetElementsByClass('edittree', NULL, elem, true);
         for (let tree of elems)
         {
            if (tree == elem || tree.parentElement == elem) // avoid matching on views within views
               EditTree.SelectAllRows(tree);
         }
      },
      
      DeselectAllRows: function(elemID)
      {
         let elem = Utilities_GetElementById(elemID);
         
         let elems = Utilities_GetElementsByClass('select_table', NULL, elem, true);
         for (let table of elems)
         {
            if (table == elem || table.parentElement == elem) // avoid matching on views within views
               SelectTable.ClearSelection(table);
         }
         
         elems = Utilities_GetElementsByClass('edittree', NULL, elem, true);
         for (let tree of elems)
         {
            if (tree == elem || tree.parentElement == elem) // avoid matching on views within views
               EditTree.ClearSelection(tree);
         }
      },
   };
