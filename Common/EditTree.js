// ========================================================================
//        Copyright © 2017 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Allows the selection of tree nodes and the moving of tree nodes to 
// reorganize the tree.
//
// NOTE: IE requires that the draggable element be an <A> tag with the HREF set (even if just to #) or an IMG tag!
//
// DRL FIXIT! I was still unable to get this to work for IE, look at the following which does work:
// https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/dropEffect
//
// The "edittree_selectable" class on the root allows the user to select the rows, otherwise the user can't select
// the rows but they can be selected programmatically.

/* Sample HTML:

   These items are templated:<br />
   <span id="file_added" class="edittree_draggable edittree_templated" style="border: solid"><img class="iconsmall" src="img/FileIcon.png" /> New File</span><br />
   <span id="folder_added" class="edittree_folder edittree_draggable edittree_templated" style="border: solid"><img class="iconsmall" src="img/FolderIcon.png" /> New Folder</span><br />
   <br />
   These items are NOT templated:<br />
   <span id="file_added2" class="edittree_draggable edittree_nottemplated" style="border: solid"><img class="iconsmall" src="img/FileIcon.png" /> New File</span><br />
   <span id="folder_added2" class="edittree_folder edittree_draggable edittree_nottemplated" style="border: solid"><img class="iconsmall" src="img/FolderIcon.png" /> New Folder</span><br />
   
   <!-- put the templates in a hidden DIV... -->
   <div style="display: none;">
      <span id="file_added_template" class="edittree_draggable edittree_droppable">
         <img class="iconsmall" src="img/FileIcon.png" />
         <select name="Icon">
            <option value="Contact">Contact</option>
            <option value="Event">Event</option>
            <option value="Task">Task</option>
            <option value="Resource">Resource</option>
         </select>
         <input type="text" name="Title" placeholder="Title" />
      </span>
      <span id="folder_added_template" class="edittree_folder edittree_draggable edittree_droppable">
         <img class="iconsmall" src="img/FolderIcon.png" />
         <select name="Icon">
            <option value="Contact">Contact</option>
            <option value="Event">Event</option>
            <option value="Task">Task</option>
            <option value="Resource">Resource</option>
         </select>
         <input type="text" name="Title" placeholder="Title" />
      </span>
   </div>
   
   <br /><br />

   <div class="edittree edittree_selectable">
      <ul>
         <li><span id="node_1003" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ContactIcon.png" /> Contacts</span></li>
         <li>
            <span id="node_1004" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/EventIcon.png" /> <span>Events</span></span>
            <ul>
               <li><span id="node_1081" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/EventIcon.png" /> <span>Event 1</span></span></li>
               <li><span id="node_1082" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/EventIcon.png" /> <span>Event 2</span></span></li>
               <li><span id="node_1083" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/EventIcon.png" /> <span>Event 3</span></span></li>
               <li><span id="node_1084" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/EventIcon.png" /> <span>Event 4</span></span></li>
               <li><span id="node_1085" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/EventIcon.png" /> <span>Event 5</span></span></li>
            </ul>
         </li>
         <li><span id="node_1007" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/TaskIcon.png" /> Tasks</span></li>
         <li>
            <span id="node_1006" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/VentureIcon.png" /> Ventures</span>
            <ul>
               <li>
                  <span id="node_1002" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/SubItemIcon.png" />Venture 1</span>
                  <ul>
                     <li>
                        <span id="node_1001" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" />Resources</span>
                        <ul>
                           <li><span id="node_1021" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Resource 1</span></li>
                           <li><span id="node_1022" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Resource 2</span></li>
                           <li><span id="node_1023" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Resource 3</span></li>
                           <li><span id="node_1024" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Resource 4</span></li>
                           <li><span id="node_1025" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Resource 5</span></li>
                        </ul>
                     </li>
                     <li><span id="node_1005" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/TagIcon.png" /> Tags</span>
                        <ul>
                           <li><span id="node_1031" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Tags 1</span></li>
                           <li><span id="node_1032" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Tags 2</span></li>
                           <li><span id="node_1033" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Tags 3</span></li>
                           <li><span id="node_1034" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Tags 4</span></li>
                           <li><span id="node_1035" class="edittree_draggable edittree_droppable"><img class="iconsmall" src="img/ResourceIcon.png" /> Tags 5</span></li>
                        </ul>
                     </li>
                  </ul>
               </li>
               <li><span id="node_1041" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/SubItemIcon.png" />Venture 2</span></li>
               <li><span id="node_1042" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/SubItemIcon.png" />Venture 3</span></li>
               <li><span id="node_1043" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/SubItemIcon.png" />Venture 4</span></li>
               <li><span id="node_1044" class="edittree_folder edittree_draggable edittree_droppable"><img class="iconsmall" src="img/SubItemIcon.png" />Venture 5</span></li>
            </ul>
         </li>
      </ul>
 */


EditTree =
   {
      // constants for the drag callback
      DropNone: 0,
      DropCopy: 1,
      DropMove: 2,
      ServerCopy: 3, // a parent in the heirarchy was a DropCopy and the server copied all the children, including this one so it already exists on the server
      
      DragTypeNone: 0,     // no dragging
      DragTypeNormal: 1,   // item dragged from this browser page
      DragTypeFile: 2,     // file dragged from OS
      DragTypeLink: 3,     // item dragged from another browser page
      
      filteringCallbacks: new Array(),
      selectionCallbacks: new Array(),
      dragCallbacks: new Array(),
      dropCallbacks: new Array(),
      dropTarget: null,
      dragEnterItem: null,
      dragType: 0,
      dropType: 0,
      
      dragEnable: false,
      draggedParentFolderID: null,
      
      fileList: [],
      
      listHeadClassName: 'list_head',
      
      Init: function(rootNodes)
      {
         for (let root of rootNodes)
         {
            let tree = Utilities_GetThisOrChildrenBySelector(root, '.edittree')[0];
            if (tree)
            {
               let draggables = document.querySelectorAll('.edittree_draggable,.edittree_droppable,.edittree_selectable');
               for (let draggable of draggables)
               {
                  if (GetPrefix(draggable.id) == 'new')
                  {
                     // make sure our "new" ID won't re-use existing values
                     let i = StripPrefix(draggable.id);
                     if (i > EditTree.new_id)
                        EditTree.new_id = i;
                  }
                  EditTree.setupDragElement(draggable);
               }
               
               if (Class_HasByElement(tree, 'edittree_disabled'))
               {
                  EditTree.dragEnable = true;   // set the flag so the code below executes
                  EditTree.DisableEditableTree();
               }
               else
               {
                  EditTree.dragEnable = false;  // set the flag so the code below executes
                  EditTree.EnableEditableTree();
               }
            }
         }
      },
      
      AddFilteringCallback: function(callback)
      {
         EditTree.filteringCallbacks.push(callback);
      },
      
      AddSelectionCallback: function(callback)
      {
         EditTree.selectionCallbacks.push(callback);
      },
      
      AddDragCallback: function(callback)
      {
         EditTree.dragCallbacks.push(callback);
      },
      
      AddDropCallback: function(callback)
      {
         EditTree.dropCallbacks.push(callback);
      },
      
      // ============================================================
      // Scroll handling...
      
      scrollableElem: null,
      scrollTimer: "",
      scrollDX: 0,
      scrollDY: 0,
      
      StartScroll: function(node)
      {
         if (!node) return;
         if (EditTree.scrollableElem) return;
         
         MainLayout_UpdateFilterDisplay(true);  // fix for iOS scrolling
         
         EditTree.scrollableElem = node;
         
         // we don't get mouse move events while dragging so this is how we get the mouse position
         document.addEventListener('dragover', EditTree.scrollHandler);
         
         EditTree.scrollTimer = window.setInterval(function()
         {
            try
            {
               if (EditTree.scrollDX == 0 && EditTree.scrollDY == 0)
                  return;

//console.log("EditTree scrolling " + EditTree.scrollDX + "," + EditTree.scrollDY + " from " + EditTree.scrollableElem.scrollLeft + "," + EditTree.scrollableElem.scrollTop);
// had to do this to get it to work in all browser whether maximized or not...
               EditTree.scrollableElem.scrollLeft += EditTree.scrollDX;
               EditTree.scrollableElem.scrollTop += EditTree.scrollDY;
               document.documentElement.scrollLeft += EditTree.scrollDX;
               document.documentElement.scrollTop += EditTree.scrollDY;
               document.body.scrollLeft += EditTree.scrollDX;
               document.body.scrollTop += EditTree.scrollDY;
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 300);
      },
      
      StopScroll: function()
      {
         if (EditTree.scrollTimer != "")
         {
            window.clearInterval(EditTree.scrollTimer);
            document.removeEventListener('dragover', EditTree.scrollHandler);
         }
         EditTree.scrollTimer = "";
         EditTree.scrollableElem = null;
         
         MainLayout_UpdateFilterDisplay(false); // fix for iOS scrolling
      },
      
      scrollHandler: function(e)
      {
//console.log("EditTree scrollHandler");
         e = e || window.e;
         
         let headerHeight = MainLayout_HeaderHeight();
         let footerHeight = MainLayout_FooterHeight();
         
         // get the viewport dimensions minus any fixed content
         let viewportWidth = Utilities_ViewportWidth();
         let viewportHeight = Utilities_ViewportHeight() - headerHeight - footerHeight;
         
         // make 8% around the edge the area where scrolling occurs
         let activeWidth = viewportWidth / 12.5;
         let activeHeight = viewportHeight / 12.5;
         
         let boundaries = {
            left: 0,
            top: headerHeight,
            width: viewportWidth,
            height: viewportHeight
         };
         
         // DRL FIXIT? We may want to turn off scrolling when the mouse is outside the scrollable area?
         
         EditTree.scrollDX = 0;
         if (e.clientX < boundaries.left + activeWidth)
         {
            EditTree.scrollDX = -(boundaries.left + activeWidth - e.clientX);
         }
         else if (e.clientX > boundaries.left + boundaries.width - activeWidth)
         {
            EditTree.scrollDX = e.clientX - (boundaries.left + boundaries.width - activeWidth);
         }
         EditTree.scrollDY = 0;
         if (e.clientY < boundaries.top + activeHeight)
         {
            EditTree.scrollDY = -(boundaries.top + activeHeight - e.clientY);
         }
         else if (e.clientY > boundaries.top + boundaries.height - activeHeight)
         {
            EditTree.scrollDY = e.clientY - (boundaries.top + boundaries.height - activeHeight);
         }
      },
      
      // ============================================================
      // Dragging helpers...
      
      setupDragElement: function(span)
      {
         if (Class_HasByElement(span, 'edittree_draggable'))
         {
            span.setAttribute("draggable", "true");   // for Firefox
            for (let child of span.children)
            {
               // This seems required for MS Edge?
               child.setAttribute("draggable", "true");
            }
            
            span.addEventListener('dragstart', EditTree.handleDragStart, false);
            span.addEventListener('dragend', EditTree.handleDragEnd, false);
         }
         if (Class_HasByElement(span, 'edittree_draggable') || Class_HasByElement(span, 'edittree_selectable'))
         {
            let elems = Utilities_GetElementsByClass('selected_indicator', null, span);
            if (elems.length > 0)
               elems[0].addEventListener('click', EditTree.handleClick, false);
            else
               span.addEventListener('click', EditTree.handleClick, false);
            
            span.addEventListener('touchstart', EditTree.handleTouchStart, false);
            span.addEventListener('touchend', EditTree.handleTouchEnd, false);
         }
         if (Class_HasByElement(span, 'edittree_droppable'))
         {
            span.addEventListener('dragenter', EditTree.handleDragEnter, false);
            span.addEventListener('dragover', EditTree.handleDragOver, false);
            span.addEventListener('dragleave', EditTree.handleDragLeave, false);
            span.addEventListener('drop', EditTree.handleDrop, false);
         }
      },
      
      updateDropType: function(target)
      {
         EditTree.dropType = EditTree.DropMove;
         for (let callback of EditTree.dragCallbacks)
         {
            let temp = callback(EditTree.draggingItems, target);
            if (temp < EditTree.dropType)
               EditTree.dropType = temp;
         }
      },
      
      // ============================================================
      // Selection helpers...
      
      selected: [],
      touched: false,
      
      handleClickOrTouchAction: function(elem, shiftKey)
      {
         let root = Utilities_GetThisOrParentByClass(elem, ['edittree']);
         
         // if the tree is not selectable we ignore the click, if the root is null
         // then the target is a palette item and therefore is selectable
         if (root != null && !Class_HasByElement(root, 'edittree_selectable'))
            return;
         
         let target = Utilities_GetThisOrParentByClass(elem, ['edittree_draggable', 'edittree_selectable']);
         
         // ignore the click/touch if there is a selection indicator and the touch wasn't on that indicator
         let elems = Utilities_GetElementsByClass('selected_indicator', null, target);
         if (elems.length > 0 && elem != elems[0])
            return;
         
         if (shiftKey)
         {
            // shift mouse click extends the selection
            EditTree.multiSelectByShift(target);
         }
         else
         {
            // - mouse click toggles selection
            // - ctrl-mouse click toggles selection
            EditTree.multiSelectByCtrl(target);
         }
         
         // Reset border to selected element
         EditTree.displaySelectedItems();
      },
      
      handleClick: function(e)
      {
         // DRL In the pipeline page the similar code in EditGrid was firing when I clicked on an <A> element
         // and preventing it from working so I added this check there and applied it here as well since these classes are so similar.
         if (!Class_HasByElement(e.target, 'edittree_draggable') &&
            !Class_HasByElement(e.target, 'edittree_selectable') &&
            !Class_HasByElement(e.target, 'selected_indicator'))
            return;
         
         e.preventDefault();
         // DRL added these to prevent multiple events getting here for the same click
         Utilities_StopEventPropagation(e);
         e.stopImmediatePropagation();
         
         if (!EditTree.touched)
         {
            EditTree.handleClickOrTouchAction(e.target, e.shiftKey);
         }
      },
      
      handleTouchStart: function(e)
      {
         EditTree.touched = true;
         
         setTimeout(function()
         {
            try
            {
               if (EditTree.dragType == EditTree.DragTypeNone)
               {
                  EditTree.handleClickOrTouchAction(e.target, FALSE);
               }
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 200);
         
         if (!EditTree.dragEnable)
         {
            e.stopPropagation();
         }
      },
      
      handleTouchEnd: function(e)
      {
         setTimeout(function()
         {
            try
            {
               EditTree.touched = false;
               EditTree.dragType = EditTree.DragTypeNone;
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 200);
      },
      
      multiSelectByCtrl: function(target)
      {
         let include = -1;
         for (let i = 0; i < EditTree.selected.length; i++)
         {
            if (EditTree.selected[i] == target)
            {
               include = i;
               break;
            }
         }
         
         if (include > -1)
         {
            EditTree.selected.splice(include, 1);
         }
         else
         {
            EditTree.addToSelection(target);
         }
      },
      
      multiSelectByShift: function(target)
      {
         if (EditTree.selected.length == 0)
         {
            EditTree.multiSelectByCtrl(target);
         }
         else
         {
            // Recreate array between previous element and current element
            let element = EditTree.selected[0];
            EditTree.removeNonSiblingsFromSelection(target);
            
            let spans = document.querySelectorAll('.edittree_draggable,.edittree_selectable');
            
            let first = null;
            let found = false;
            for (let span of spans)
            {
               if (first != null)
               {
                  EditTree.addToSelectionIfSibling(span);
               }
               
               // if we find the original start item, or we find the current item
               if (span == element || span == target)
               {
                  if (first != null)
                  {
                     first = null;
                  }
                  else if (!found)   // don't start selection again a second time
                  {
                     first = span;
                     found = true;
                     EditTree.addToSelectionIfSibling(span);
                  }
               }
            }
         }
      },
      
      removeNonSiblingsFromSelection: function(target)
      {
         let parent = Utilities_GetParentByTag(target, "UL");
         let idx = 0;
         let changed = false;
         while (idx < EditTree.selected.length)
         {
            if (parent != Utilities_GetParentByTag(EditTree.selected[idx], "UL"))
            {
               EditTree.selected.splice(idx, 1);
               changed = true;
            }
            else
            {
               idx++;
            }
         }
         
         return EditTree.addToSelection(target) || changed;
      },
      
      addToSelectionIfSibling: function(target)
      {
         if (EditTree.selected.length && Utilities_GetParentByTag(target, "UL") != Utilities_GetParentByTag(EditTree.selected[0], "UL"))
         {
            return false;
         }
         
         return EditTree.addToSelection(target);
      },
      
      addToSelection: function(target)
      {
         for (idx = 0; idx < EditTree.selected.length; idx++)
         {
            if (EditTree.selected[idx] == target)
               return false;
         }
         
         EditTree.selected.push(target);
         return true;
      },
      
      // ============================================================
      // ghost element for drag...
      
      ghostElements: [],
      
      deleteGhostElements: function()
      {
         let ghostEl = document.querySelectorAll('.ghostElement');
         for (let element of ghostEl)
         {
            element.parentNode.removeChild(element);
         }
         
         EditTree.ghostElements = [];
      },
      
      addGhostEvent: function(clon)
      {
         clon.addEventListener('drop', EditTree.handleDrop, false);
         clon.addEventListener('dragover', EditTree.handleDragOver, false);
      },
      
      createGhostElements: function()
      {
         EditTree.deleteGhostElements();
         
         let length = 0;
         
         for (let span of EditTree.draggingItems)
         {
            let clon;
            if (Class_HasByElement(span, 'edittree_templated'))
            {
               clon = document.querySelector('#' + span.id + "_template").cloneNode(true);
            }
            else
            {
               clon = span.cloneNode(true);
            }
            Class_AddByElement(clon, 'ghostElementNode');
            Class_AddByElement(clon, 'edittree_droppable');   // you can drop on ghost nodes
            clon.style.opacity = '0.5';
            clon.id = 'ghost_' + length;
            let li = document.createElement('li');
            Class_AddByElement(li, 'ghostElement');
            li.appendChild(clon);
            EditTree.addGhostEvent(clon);
            EditTree.ghostElements.push(li);
            length++;
         }
      },
      
      repositionGhostElement: function()
      {
         let target = EditTree.dropTarget;
         if (target == null)
         {
            EditTree.toggleInitDragItems("block");
            return;
         }
         
         EditTree.toggleInitDragItems("none");
         
         if (EditTree.addType == 'folder')
         {
            if (!Class_HasByElement(target, "edittree_folder"))
            {
               assert(0);  // there's a bug in the drag handler or in our code that calls the drag handler!
               target = EditTree.GetParentNode(target);
               assert(target != null);
            }
            
            EditTree.addItemsToFolder(target, EditTree.ghostElements, false);
         }
         else if (EditTree.addType == 'before')
         {
            EditTree.insertItemsBefore(target, EditTree.ghostElements, false);
         }
         else if (EditTree.addType == 'after')
         {
            EditTree.insertItemsAfter(target, EditTree.ghostElements, false);
         }
      },
      
      // ===========================
      // Dragging event handlers on closed target...
      IsToggleOpened: function(target)
      {
         const listHeadDiv = target.querySelector('.' + EditTree.listHeadClassName);
         if (listHeadDiv.firstElementChild == null ||
            !listHeadDiv.firstElementChild.firstElementChild ||
            listHeadDiv.firstElementChild.firstElementChild.tagName.toLowerCase() != 'a')
         {
            return true;
         }
         
         return Class_HasByElement(listHeadDiv.firstElementChild.firstElementChild, "toggler_opened");
      },
      
      DrawFolderHoverBorderOnTarget: function(target)
      {
         // remove the border on other folders
         EditTree.RemoveFolderHoverBorderOnTargets();
         
         target.classList.add('tree_folder_hover_border');
      },
      
      RemoveFolderHoverBorderOnTargets: function()
      {
         let folders = document.querySelectorAll('.tree_folder_hover_border');
         for (let folder of folders)
            folder.classList.remove('tree_folder_hover_border');
      },
      
      ToggleFolderOpenClose: function(target)
      {
         let ul = null;
         let dest_li = Utilities_GetThisOrParentByTag(target, "LI");
         if (dest_li == null)
         {
            // tree root
            dest_li = target.parentElement;
         }
         
         ul = dest_li.querySelector('.edittree_folder + ul');
         if (ul && ul.getAttribute('id'))
         {
            const childrenID = ul.getAttribute('id');
            
            Visibility_SetById(childrenID, true);
            Visibility_ShowById(childrenID);
            
            const listHeadDiv = target.querySelector('.' + EditTree.listHeadClassName);
            if (listHeadDiv &&
               listHeadDiv.firstElementChild &&
               listHeadDiv.firstElementChild.firstElementChild &&
               listHeadDiv.firstElementChild.firstElementChild.tagName.toLowerCase() == 'a')
            {
               const destToggle = listHeadDiv.firstElementChild.firstElementChild;
               listHeadDiv.firstElementChild.firstElementChild.click();
            }
         }
      },
      
      // ============================================================
      // Dragging event handlers...
      
      draggingItems: [],
      lastFolderHover: null,
      lastFolderHoverTimerID: null,
      
      handleDragItemToClosedFolder: function(target)
      {
         const destTarget = EditTree.getDragEnterItem(target, 0);
   
         if (destTarget != EditTree.lastFolderHover)
         {
            EditTree.lastFolderHover = null;
            if (EditTree.lastFolderHoverTimerID)
            {
               clearTimeout(EditTree.lastFolderHoverTimerID);
               EditTree.lastFolderHoverTimerID = null;
               EditTree.RemoveFolderHoverBorderOnTargets();
            }
         }

         if (destTarget &&
            destTarget != EditTree.lastFolderHover &&
            destTarget.parentNode &&
            Class_HasByElement(destTarget.parentNode, "edittree_folder") &&
            !Class_HasByElement(destTarget, 'ghostElement') &&
            destTarget.firstElementChild &&
            destTarget.firstElementChild.firstElementChild &&
            destTarget.firstElementChild.firstElementChild.tagName.toLowerCase() == 'a')
         {
            const destToggle = destTarget.firstElementChild.firstElementChild;
            EditTree.DrawFolderHoverBorderOnTarget(destTarget.parentNode);
            EditTree.lastFolderHover = destTarget;
            EditTree.lastFolderHoverTimerID = setTimeout(function ()
            {
               EditTree.lastFolderHoverTimerID = null;
               EditTree.ToggleFolderOpenClose(destTarget.parentNode);
               EditTree.RemoveFolderHoverBorderOnTargets();
            }, 2000);
         }
      },
      
      handleDragStart: function(e)
      {
//      let context = e.currentTarget.dataset.hasOwnProperty('context')
//        ? e.currentTarget.dataset.context
//         : 'NaN';
         
         EditTree.lastStepPosition = {
            x: e.clientX,
            y: e.clientY
         };
         let tree = Utilities_GetElementsByClass('edittree')[0];
         let enabled = !Class_HasByElement(tree, 'edittree_disabled');
         let target = Utilities_GetThisOrParentByClass(e.target, 'edittree_draggable');
         
         // DRL FIXIT! The DragDropTouch.js code sends this event even with no target!
         if ((!enabled || target == null) /*&& context !== 'header'*/)
         {
            e.preventDefault();
            return false;
         }
         
         let dt = e.dataTransfer;
         dt.effectAllowed = 'copyMove';
         
         let userAgent = window.navigator.userAgent;
         let msie = userAgent.indexOf('MSIE ');       //Detect IE
         let trident = userAgent.indexOf('Trident/'); //Detect IE 11
         let edge = userAgent.indexOf('Edge');
         if (msie > 0 || trident > 0 || edge > 0)
         {
            // this is required by IE and Edge...
            dt.setData('text', '');
         }
         else
         {
            // this is required by Firefox...
            dt.setData('text/html', '');
         }
         
         EditTree.draggingItems = [];
         
         // see if the dragged item is one of the selected items
         let include = -1;
         for (let i = 0; i < EditTree.selected.length; i++)
         {
            if (EditTree.selected[i] == target)
            {
               include = i;
               break;
            }
         }
         
         // if the dragged item is one of the selected items, then drag all the selected items
         if (include > -1)
         {
            for (let span of EditTree.selected)
            {
               EditTree.draggingItems.push(span);
//            span.style.visibility = 'hidden';
//            span.style.transition = '0.3s';  
            }
         }
         else
         {
            EditTree.draggingItems.push(target);
         }
         
         if (EditTree.draggingItems.length == 0)
         {
            e.preventDefault();
            return false;
         }
         
         for (let span of EditTree.draggingItems)
         {
            if (span.dataset.draggable_url)
            {
               let url = span.dataset.draggable_url.substr(span.dataset.draggable_url.toLowerCase().indexOf(':http') + 1);
               
               // the icon that was dragged as well as some other stuff usually appears in the list so remove it
               while (e.dataTransfer.items.length > 0)
                  e.dataTransfer.items.remove(0);
               
               // Let's give some different formats depending on what the user may be dragging to...
               e.dataTransfer.setData('DownloadURL', span.dataset.draggable_url);
               e.dataTransfer.setData('text/uri-list', url);
               
               let thumbnail = span.querySelector('.edit_tree_thumbnail');
               if (thumbnail == null)
               {
                  thumbnail = span.querySelector('.edit_tree_icon');
                  if (thumbnail == null)
                  {
                     thumbnail = document.createElement("img");
                     thumbnail.src = Utilities_ReplaceInString(url, '/Data', '/Thumbnail');
                  }
               }
               e.dataTransfer.setDragImage(thumbnail, 0, 0);
            }
         }
         /*
               // if we are dragging multiple items, use a special icon
               if (EditTree.selected.length > 1)
               {
                  let img = new Image();
                  img.src = "img/multiple.jpeg";
                  dt.setDragImage(img, -20, -20);
               }
         */
//      if (dt.setDragImage instanceof Function)
//         dt.setDragImage(new Image(), 0, 0);   // don't show anything while dragging
         
         EditTree.dragType = EditTree.DragTypeNormal;
         EditTree.dropType = EditTree.DropNone;
         
         EditTree.initDragItems();
         
         EditTree.StartScroll(Utilities_GetScrollableParentElement(target));
         
         EditTree.createGhostElements();
         EditTree.repositionGhostElement();
      },
      
      toggleInitDragItems: function(toggle)
      {
         for (let item of EditTree.draggingItems)
         {
            // the children of the dragged item are next to it in the UL
            // element so we'll go up to the parent to get them all, unless
            // this is a an item dragged from somewhere off the tree in
            // which case the parent won't be an LI element
            if (item.parentNode && item.parentNode.tagName == 'LI')
               item = item.parentNode;
            
            let spans = item.querySelectorAll('.edittree_droppable_temp');
            for (let span of spans)
            {
               setTimeout(function()
               {
                  try
                  {
                     span.style.display = toggle;
                     span.style.opacity = toggle == "block" ? "0.5" : "1";
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 1);
            }
         }
      },
      
      initDragItems: function()
      {
         // make the dragging items not droppable so you can't drop to self or child of self
         for (let item of EditTree.draggingItems)
         {
            // the children of the dragged item are next to it in the UL
            // element so we'll go up to the parent to get them all, unless
            // this is a an item dragged from somewhere off the tree in
            // which case the parent won't be an LI element
            if (item.parentNode && item.parentNode.tagName == 'LI')
               item = item.parentNode;
            
            let spans = item.querySelectorAll('.edittree_droppable');
            for (let span of spans)
            {
               Class_AddByElement(span, 'edittree_droppable_temp');
               Class_RemoveByElement(span, 'edittree_droppable');
               setTimeout(function()
               {
                  try
                  {
                     span.style.display = "none";
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 0);
            }
            // I'm not sure why we make them not draggable?
            spans = item.querySelectorAll('.edittree_draggable');
            for (let span of spans)
            {
               Class_AddByElement(span, 'edittree_draggable_temp');
               Class_RemoveByElement(span, 'edittree_draggable');
               span.setAttribute("draggable", "false");   // for Firefox
               setTimeout(function()
               {
                  try
                  {
                     span.style.display = "none";
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 0);
            }
         }
      },
      
      // NOTE: This can be called multiple times on the same objects!
      uninitDragItems: function()
      {
         // restore the drag/drop settings of the dragging items
         for (let item of EditTree.draggingItems)
         {
            // the children of the dragged item are next to it in the UL
            // element so we'll go up to the parent to get them all, unless
            // this is a an item dragged from somewhere off the tree in
            // which case the parent won't be an LI element
            if (item.parentNode && item.parentNode.tagName == 'LI')
               item = item.parentNode;
            
            // add droppable to avoid missing, sometimes droppable_temp disappeared before display blocked.
            let spans = item.querySelectorAll('.edittree_droppable_temp, .edittree_droppable');
            for (let span of spans)
            {
               Class_AddByElement(span, 'edittree_droppable');
               Class_RemoveByElement(span, 'edittree_droppable_temp');
               
               // add setTimeout and try catch to prevent disappearing since this happen too earlier before executing initDragItems completely.
               setTimeout(function()
               {
                  try
                  {
                     span.style.display = "block";
                     span.style.opacity = "1";
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 0);
            }
            
            // add droppable to avoid missing, sometimes droppable_temp disappeared before display blocked.
            spans = item.querySelectorAll('.edittree_draggable_temp, .edittree_draggable');
            for (let span of spans)
            {
               Class_AddByElement(span, 'edittree_draggable');
               Class_RemoveByElement(span, 'edittree_draggable_temp');
               span.setAttribute("draggable", "true");   // for Firefox
               
               // add setTimeout and try catch to prevent disappearing since this happen too earlier before executing initDragItems completely.
               setTimeout(function()
               {
                  try
                  {
                     span.style.display = "block";
                     span.style.opacity = "1";
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 0);
            }
         }
      },
      
      handleDragEnd: function(e)
      {
         /*     let context = e.currentTarget.dataset.hasOwnProperty('context')
                ? e.currentTarget.dataset.context
                : 'NaN';
              if (context === 'header') {
                EditTree.EnableEditing();
              }*/
   
         EditTree.lastFolderHover = null;
         if (EditTree.lastFolderHoverTimerID)
         {
            clearTimeout(EditTree.lastFolderHoverTimerID);
            EditTree.lastFolderHoverTimerID = null;
            EditTree.RemoveFolderHoverBorderOnTargets();
         }
         
         // DRL FIXIT! The DragDropTouch.js code sends this event even if we're not dragging!
         if (EditTree.dragType == EditTree.DragTypeNone)
            return;
         
         e.preventDefault();
         
         if (EditTree.dropTarget)
         {
//         // remove dotted line from target
//         Class_RemoveByElement(EditTree.dropTarget, 'edittree_droptarget');
            EditTree.dropTarget = null;
         }
         
         
         // remove selection from elements
         EditTree.selected = [];
         EditTree.displaySelectedItems();
         
         EditTree.deleteGhostElements();
         
         EditTree.uninitDragItems();
         EditTree.draggingItems = [];
         
         EditTree.StopScroll();
         
         EditTree.addType = '';
         EditTree.lastPosition = {};
         EditTree.lastStepPosition = {};
         EditTree.direction = '';
         
         EditTree.dragType = EditTree.DragTypeNone;
      },
      
      lastPosition: {},
      lastStepPosition: {},
      direction: '',
      addType: '',
      tabSize: 26,
      
      handleDragOver: function(e)
      {
         if (EditTree.dragEndTimer)
         {
            // when dragging from another window we often get the case where we get a dragLeave even though there
            // will be lots of valid dragOver afterwards, so in this case we ignore the pending dragEnd
            console.log('still seeing dragOver so canceling pending dragEnd');
            clearTimeout(EditTree.dragEndTimer);
            EditTree.dragEndTimer = null;
         }
         else
         {
            const destTarget = EditTree.getDragEnterItem(e.target, 0);
            if (EditTree.dragEnterItem == null)
            {
               if (!destTarget)
               {
                  console.log('handleDragOver skip');
                  return;
               }
               
               // should be dragged to the left or right even if the target is the ghost element.
               EditTree.dragEnterItem = e.target;
            }
         }
         
         EditTree.dragEnterItem = e.target;
         
         // open closed folder
         EditTree.handleDragItemToClosedFolder(EditTree.dragEnterItem);
         
         // this isn't getting called in some cases, perhaps when this dragover handler is applied,
         // so we'll pass it on to update the scrolling
         EditTree.scrollHandler(e);
         
         if (typeof (EditTree.lastPosition.x) != 'undefined')
         {
            //get the change from last position to this position
            const deltaX = EditTree.lastPosition.x - e.clientX,
               deltaY = EditTree.lastPosition.y - e.clientY;
            
            //check which direction had the highest amplitude and then figure out direction by checking if the value is greater or less than zero
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0)
            {
               EditTree.direction = 'left'
            }
            else if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0)
            {
               EditTree.direction = 'right'
            }
            else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0)
            {
               EditTree.direction = 'up'
            }
            else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < 0)
            {
               EditTree.direction = 'down'
            }
         }
         
         //set the new last position to the current for next time
         EditTree.lastPosition = {
            x: e.clientX,
            y: e.clientY
         };
         
         if (EditTree.dragType == EditTree.DragTypeNone ||
            !EditTree.CheckIfDragEnabled() ||
            EditTree.draggingItems.length == 0)
         {
         }
         else
         {
            let found = null;
            let isReposition = false;
            
            // if we are dragging over a ghost item or one of its children just keep the same drop info from the target
            for (let span of EditTree.ghostElements)
            {
               if (span == e.target || Utilities_HasAsChild(span, e.target))
               {
                  found = span;
               }
            }
            
            let target = found
               ? found.firstElementChild
               : Utilities_GetThisOrParentByClass(e.target, 'edittree_droppable');
            
            if (target == null)
            {
               EditTree.dropType = EditTree.DropNone;
               return;
            }
            
            let temp = null;
            if (e.hasOwnProperty('offsetY'))
            {
               temp = {top: e.offsetX, left: e.offsetY};
            }
            else
            {
               // DRL FIXIT? DragDropTouch.js doesn't seem to provide the offsetY...
               temp = Utilities_GetOffset2(target);
               temp.top = e.clientY - temp.top;
               temp.left = e.clientX - temp.left;
            }
            
            let done = EditTree.dropType != EditTree.DropNone;
            
            // here we look for a place to drop, and if it isn't good we loop trying again at a higher level
            // in the tree until we run out of options
            do
            {
               let parent = null;
               let siblingNodes;
               const saved_dropType = EditTree.dropType;
               const saved_addType = EditTree.addType;
               const saved_dropTarget = EditTree.dropTarget;
               const saved_lastStepPosition = EditTree.lastStepPosition;
               
               if (!found)
               {
                  parent = EditTree.GetParentNode(target); // tree root doesn't have a parent or siblings
                  
                  siblingNodes = parent ? EditTree.GetChildNodes(parent) : [target];
                  const childNodes = EditTree.GetChildNodes(target);
                  
                  let cb = EditTree.DropMove;
                  for (let callback of EditTree.dragCallbacks)
                  {
                     const cb_temp = callback(EditTree.draggingItems, target);
                     if (cb_temp < cb)
                        cb = cb_temp;
                  }
                  if (cb != EditTree.DropNone)
                  {
                     EditTree.addType = 'folder';//should change target according to direction, check when up - EditTree.dropTarget = target;
                     
                     if (!Class_HasByElement(target, "edittree_folder"))
                        target = Utilities_GetThisOrParentByClass(target, ['edittree_droppable', 'edittree_folder']);
                     
                     EditTree.dropTarget = target;
                     
                     if (EditTree.direction == 'up')
                     {
                        if (temp.top < target.offsetHeight * 2 / 3)
                        {
                           let destLi = Utilities_GetThisOrParentByTag(target, "LI");
                           let destUl = Utilities_GetThisOrParentByTag(destLi, "UL");
                           if (destUl.children)
                           {
                              let list_items = Array.prototype.slice.call(destUl.children);
                              let itemIndex = list_items.indexOf(destLi);
                              if (itemIndex > 0)
                                 EditTree.dropTarget = destUl.childNodes[itemIndex - 1].firstElementChild;
                              else
                              {
                                 let parentLi = Utilities_GetThisOrParentByTag(destUl, "LI");
                                 EditTree.dropTarget = parentLi ? parentLi.firstElementChild : null;
                              }
                           }
                           else
                           {
                              let parentLi = Utilities_GetThisOrParentByTag(destUl, "LI");
                              EditTree.dropTarget = parentLi ? parentLi.firstElementChild : null;
                           }
                        }
                     }
                  }
                  else
                  {
                     EditTree.dropTarget = target;
                     
                     if (EditTree.direction == 'up')
                     {
                        if (temp.top < target.offsetHeight * 2 / 3)
                           EditTree.addType = 'before';
                        else if (childNodes.length == 0 && target == siblingNodes[siblingNodes.length - 1])
                           EditTree.addType = 'after';
                     }
                     else if (EditTree.direction == 'down')
                     {
                        let firstNode = null;
                        let i = 0;
                        for (i = 0; i < siblingNodes.length; i++)
                        {
                           if (siblingNodes[i].id.startsWith('ghost')) break;
                           firstNode = siblingNodes[i];
                        }
                        (siblingNodes.length > 1 && i == 0) ? (firstNode = siblingNodes[1]) : null;
                        if ((Utilities_GetOffset2(target).top + (target.offsetHeight / 2)) < e.clientY)
                           EditTree.addType = 'after';
                        else if (target == firstNode)
                           EditTree.addType = 'before';
                        else if (childNodes.length == 0 && temp.top >= target.offsetHeight / 2)
                           EditTree.addType = 'after';
                     }
                  }
                  
                  EditTree.lastStepPosition = {
                     x: e.clientX,
                     y: e.clientY
                  };
                  
                  isReposition = true;
               }
               else
               {
                  if (EditTree.direction == 'right' && (e.clientX - EditTree.lastStepPosition.x) > EditTree.tabSize)
                  {
                     let parentNode = EditTree.GetParentNode(target); // Getting undefined variable "parentNode" error if no "let"
                     siblingNodes = EditTree.GetChildNodes(parentNode);
                     let i = 0;
                     for (i = 0; i < siblingNodes.length; i++)
                     {
                        if (target == siblingNodes[i])
                           break;
                     }
                     if (i > 0 && siblingNodes[i - 1].classList.contains('edittree_folder'))
                     {
                        EditTree.addType = 'folder';
                        EditTree.lastStepPosition = {
                           x: e.clientX,
                           y: e.clientY
                        };
                        EditTree.dropTarget = siblingNodes[i - 1];
                        isReposition = true;
                     }
                  }
                  if (EditTree.direction == 'left' && (EditTree.lastStepPosition.x - e.clientX) > EditTree.tabSize)
                  {
                     parent = EditTree.GetParentNode(found);
                     const parent_parent = EditTree.GetParentNode(parent);
                     if (parent && parent_parent && parent.classList.contains('edittree_draggable'))
                     {
                        EditTree.addType = 'after';
                        EditTree.dropTarget = parent;
                        EditTree.lastStepPosition = {
                           x: e.clientX,
                           y: e.clientY
                        };
                        isReposition = true;
                     }
                  }
                  
                  if (!isReposition)   // no change
                     return;
               }
               
               // the callback below wants to be passed the element that the dragged item will be dropped into
               let targ = EditTree.dropTarget;
               if (targ != null && EditTree.addType != 'folder')
                  targ = EditTree.GetParentNode(targ);
               
               if (targ == null || !Class_HasByElement(targ, 'edittree_droppable'))
                  EditTree.dropType = EditTree.DropNone;
               else
                  EditTree.updateDropType(targ);
               
               done = EditTree.dropType != EditTree.DropNone;
               
               // if we can't drop here keep looking up the tree until we find something
               if (!done)
               {
                  if (target == parent)
                     done = true;      // avoid endless loop
                  target = parent;
                  
                  // keep using the last ghost position until we find something new
                  EditTree.dropType = saved_dropType;
                  EditTree.addType = saved_addType;
                  EditTree.dropTarget = saved_dropTarget;
                  EditTree.lastStepPosition = saved_lastStepPosition;
               }
               
            } while (target != null && !done);
            
            if (EditTree.dropType == EditTree.DropNone)
               return;
            
            if (EditTree.dropType == EditTree.DropCopy)
               e.dataTransfer.dropEffect = 'copy';
            else
               e.dataTransfer.dropEffect = 'move';
            
            if (isReposition == true)
               EditTree.repositionGhostElement();
         }
         
         e.preventDefault();   // allow drop
      },
      
      getLabel: function(elem)
      {
         if (elem == null)
            return 'null';
         
         let temp = Utilities_GetThisOrParentByClass(elem, 'edittree_file');
         if (temp)
            return temp.tagName + ' ' + temp.id;
         temp = Utilities_GetThisOrParentByClass(elem, 'edittree_folder');
         if (temp)
            return temp.tagName + ' ' + temp.id;
         
         return elem.tagName;
      },
      
      dragEndTimer: null,
      
      getDragEnterItem: function(target, i)
      {
         // Get the correct drag-enter item as consistent.
         if (Class_HasByElement(target, EditTree.listHeadClassName))
         {
            return target;
         }
         
         if (!target.parentNode || i == 4)
         {
            return null; // if deep is greater than 4 or parentNode is null, target isn't draggable
         }
         
         i++;
         
         return EditTree.getDragEnterItem(target.parentNode, i);
      },
      
      handleDragEnter: function(event)
      {
         event.preventDefault();
         
         if (EditTree.dragEndTimer)
         {
            clearTimeout(EditTree.dragEndTimer);
            EditTree.dragEndTimer = null;
         }
         
         const eventTarget = EditTree.getDragEnterItem(event.target, 0);
         // NOTE: sometimes we get the enter for the new area before the leave of the last area, so this handles
         // the leave that we haven't yet received, and we'll ignore it when we do get it later
         if (EditTree.dragEnterItem)
         {
            const enterTarget = EditTree.getDragEnterItem(EditTree.dragEnterItem, 0);
            if (eventTarget != enterTarget)
            {
               console.log('handleDragEnter skip');
               EditTree.dragEnterItem = event.target;
               assert(EditTree.dragEnterItem != null);
               return;
            }
         }
         
         EditTree.direction = '';
         EditTree.dragEnterItem = event.target;
         
         // open closed folder
         EditTree.handleDragItemToClosedFolder(EditTree.dragEnterItem);
         
         // when dragging from another window we don't get start/end only enter/leave
         if (EditTree.CheckIfDragEnabled() &&   // drag-and-drop allowed
            (EditTree.dragType == EditTree.DragTypeNone || EditTree.dragType == EditTree.DragTypeFile) &&
            (EditTree.CheckIfDraggingFile(event) || EditTree.CheckIfDraggingLink(event)))
         {
            EditTree.dropType = EditTree.DropCopy;
            EditTree.addType = 'folder';
            EditTree.dropTarget = Utilities_GetThisOrParentByClass(event.target, ['edittree_droppable', 'edittree_folder']);
            if (EditTree.dragType == EditTree.DragTypeFile && !Class_HasByElement(EditTree.dropTarget, 'edittree_folder'))
               EditTree.addType = 'before';
            EditTree.lastStepPosition =
               {
                  x: event.clientX,
                  y: event.clientY
               };
            EditTree.draggingItems = [];
            
            let templateEl = document.querySelector('#file_added_template');
            if (templateEl == null)
            {
               Log_WriteError("Missing template \"file_added_template\" on page!");
               templateEl = document.createElement('div');
            }
            
            const cloneEl = templateEl.cloneNode(true);
            cloneEl.getElementsByClassName('row_label')[0].innerHTML = Str('Drop Here');
            cloneEl.id = 'file_added';
            
            Class_AddByElement(cloneEl, 'edittree_templated'); // since our item is not in the tree
            Class_AddByElement(cloneEl, 'edittree_draggable');
            Class_AddByElement(cloneEl, 'edittree_droppable');
            Class_AddByElement(cloneEl, 'TreeNode_SourceItem');
            
            EditTree.draggingItems.push(cloneEl);
            
            assert(EditTree.CheckIfDraggingFile(event) || EditTree.CheckIfDraggingLink(event));
            EditTree.dragType = EditTree.CheckIfDraggingFile(event) ? EditTree.DragTypeFile : EditTree.DragTypeLink;
            
            EditTree.initDragItems();
            
            // DRL FIXIT? Should this be event.target? cloneEl isn't even part of the page!
            EditTree.StartScroll(Utilities_GetScrollableParentElement(cloneEl));
            
            EditTree.createGhostElements();
            EditTree.repositionGhostElement();
         }
      },
      
      handleDragLeave: function(e)
      {
         const eventTarget = EditTree.getDragEnterItem(e.target, 0);
         // NOTE: sometimes we get the enter for the new area before the leave of the last area, so this handles
         // the leave that we haven't yet received, and we'll ignore it when we do get it later
         if (EditTree.dragEnterItem)
         {
            const enterTarget = EditTree.getDragEnterItem(EditTree.dragEnterItem, 0);
            if (eventTarget == enterTarget)
            {
               console.log('handleDragLeave skip');
               EditTree.dragEnterItem = e.target;
               assert(EditTree.dragEnterItem != null);
               return;
            }
         }
         EditTree.dragEnterItem = null;
         
         // remote initiated dragging ends when the item leaves
         if (EditTree.dragType != EditTree.DragTypeNone && EditTree.dragType != EditTree.DragTypeNormal)
         {
            // do this on a timer so that if we get a handleDragEnter we can skip it otherwise the positioning
            // of the ghost items gets reset and they don't get positioned well
            if (EditTree.dragEndTimer)
               clearTimeout(EditTree.dragEndTimer);
            EditTree.dragEndTimer = setTimeout(function()
            {
               try
               {
                  EditTree.dragEndTimer = null;
                  EditTree.handleDragEnd(e);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 100);
         }
      },
      
      handleDrop: function(e)
      {
         // DRL FIXIT! The DragDropTouch.js code sends this event even if we're not dragging!
         if (EditTree.dragType == EditTree.DragTypeNone)
            return;
         
         // DRL FIXIT! The DragDropTouch.js code sends this event even with no target!
         if (!EditTree.dropTarget)
            return;
         
         let target = EditTree.dropTarget;
         
         assert(!Class_HasByElement(target, "ghostElement"));
         assert(!Class_HasByElement(target, "ghostElementNode"));
         
         if (EditTree.dragType == EditTree.DragTypeFile)
         {
            // this will be handled by the dropzone code
            
            // Utilities_StopEventPropagation(e);
            // e.stopImmediatePropagation();
            e.preventDefault();      // prevent default action which could be open link, etc.
            return;
         }
         
         // if we're not dropping in the middle then the parent is the actual target
         let parent = EditTree.addType == 'folder' ? target : EditTree.GetParentNode(target);
         if (!Class_HasByElement(parent, 'edittree_droppable'))
            EditTree.dropType = EditTree.DropNone;
         else
            EditTree.updateDropType(parent);
         
         if (EditTree.dropType != EditTree.DropNone)
         {
            // we must restore the dragging items to their original state before we copy them below
            // and we should also do this before we hand them off to the callbacks as we don't know
            // what they'll be used for then
            EditTree.uninitDragItems();
            
            if (EditTree.dragType == EditTree.DragTypeNormal)
            {
               // we don't want an array of the wrappers, we want an array of the actual items
               let draggingItems = [];
               for (let node of EditTree.draggingItems)
               {
                  // make sure we handle both the data elements and the wrappers here
                  draggingItems.push(node.tagName == 'LI' ? node.firstElementChild : node);
               }
               
               let isCopy = EditTree.dropType == EditTree.DropCopy;
               let newItems = [];
               if (EditTree.addType == 'after')
               {
                  EditTree.insertItemsAfter(target, draggingItems, isCopy, newItems);
               }
               else if (EditTree.addType == 'folder')
               {
                  EditTree.addItemsToFolder(target, draggingItems, isCopy, newItems);
               }
               else if (EditTree.addType == 'before')
               {
                  EditTree.insertItemsBefore(target, draggingItems, isCopy, newItems);
               }
               
               setTimeout(function()
               {
                  try
                  {
                     // allow this to occur asynchronously because otherwise the dropped element was still invisible
                     // and the ghost elements showing which messed up our code trying to figure out the siblings
                     for (let callback of EditTree.dropCallbacks)
                     {
                        callback(draggingItems, newItems, parent, EditTree.dropType);
                     }
                     
                     // allow this to occur asynchronously to allow the page to settle first
                     for (let span of newItems)
                     {
                        OnElemAdded(span, EditTree.dropType);
                     }
                     FireElemChanged(parent);
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 200);
            }
            else if (EditTree.dragType == EditTree.DragTypeLink)
            {
               let url = event.dataTransfer.getData('text/uri-list');  // this comes from the drag icon in Chrome
               
               BusyIndicatorStart(Str('Copying...'));
               let params = {
                  FromUrl: url,
                  ResourceFolderID: EditTree._GetElementID(parent, true),
               };
               ajax.post('/v2/Resources', params, function(resp, httpCode)
               {
                  BusyIndicatorStop();
                  
                  resp = Json_FromString(resp);
                  
                  if (resp.status != 'success')
                  {
                     DisplayMessage(Str('Resource wasn\'t copied: <0>', resp.message), 'error');
                  }
                  else
                  {
                     resp = resp.data;
                     
                     assert(EditTree.draggingItems.length == 1);
                     let ghostElem = EditTree.draggingItems[0];
                     EditTree.draggingItems = [];
                     
                     let newElem = EditTree.CreateNewItem(parent, 'file_' + resp.ResourceID, 'file', resp.Name, false, EditTree.DropNone);
                     
                     let ul = parent.nextElementSibling;
                     assert(ul.tagName == 'UL');
                     let ghostLi = Utilities_GetElementsByClass('ghostElement', 'LI', ul, true)[0];
                     assert(ghostLi.tagName == 'LI');
                     newElem = newElem.parentNode;
                     assert(newElem.tagName == 'LI');
                     
                     // move the new elements LI parent to the correct spot, right before the ghost elements LI parent
                     ul.insertBefore(newElem, ghostLi);
                  }
                  
                  if (!EditTree.dragEndTimer)
                     EditTree.dragEndTimer = setTimeout(function()
                     {
                        try
                        {
                           EditTree.dragEndTimer = null;
                           EditTree.handleDragEnd(e);
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                     }, 200);
               });
            }
            else
            {
               assert(0);  // unexpected drag type
            }
         }
         
         // Utilities_StopEventPropagation(e);
         // e.stopImmediatePropagation();
         e.preventDefault();      // prevent default action which could be open link, etc.
      },
      
      // ============================================================
      // Dragging helpers...
      
      // ============================================================
      // Tree insertion helpers...
      
      new_id: 0,
      
      getListElementToPaste: function(node, isCopy, newItems)
      {
         let addedTarget = null;
         
         // NOTE: This method should be passed the actual element, but the "ghost" code calls this method
         // with the LI wrapper.
         let span = node.tagName == 'LI' ? node.firstElementChild : node;
         
         if (isCopy || Class_HasByElement(span, 'edittree_templated') || Class_HasByElement(span, 'edittree_nottemplated'))
         {
            if (Class_HasByElement(span, 'edittree_templated'))
            {
               span = document.querySelector('#' + span.id + "_template").cloneNode(true);
               Class_RemoveByElement(span, "edittree_templated");
            }
            else
            {
               span = span.cloneNode(true);
               
               if (Class_HasByElement(span, 'edittree_nottemplated'))
               {
                  Class_RemoveByElement(span, "edittree_nottemplated");
                  
                  // non-templated items can't have the droppable attribute otherwise you'd be able to drop onto them so we add it here
                  Class_AddByElement(span, "edittree_droppable");
               }
            }
            
            if (isCopy)
               span.dataset.source_id = span.id; // save the source ID so the callback can access it
            EditTree.new_id++;
            span.id = "new_" + EditTree.new_id;
            
            addedTarget = document.createElement("LI");
            addedTarget.appendChild(span);
            
            EditTree.setupDragElement(span);
            
            Class_RemoveByElement(span, "edittree_selecteditem");
            
            if (newItems != null)
               newItems.push(span);
         }
         else
         {
            // already on the tree
            addedTarget = Utilities_GetThisOrParentByTag(span, "LI");
         }
         
         return addedTarget;
      },
      
      insertItemsAfter: function(node, items, isCopy, newItems)
      {
         let ul = null;
         let dest_li = Utilities_GetThisOrParentByTag(node, "LI");
         if (dest_li == null)
         {
            // tree root
            ul = node.parentElement.querySelector('ul');
         }
         else
         {
            ul = Utilities_GetParentByTag(dest_li, "UL");
         }
         
         for (let i = items.length - 1; i >= 0; i--)
         {
            let span = items[i];
            let new_li = EditTree.getListElementToPaste(span, isCopy, newItems);
            if (dest_li != null && dest_li.nextElementSibling)
            {
               ul.insertBefore(new_li, dest_li.nextElementSibling);
            }
            else
            {
               ul.appendChild(new_li);
            }
         }
      },
      
      insertItemsBefore: function(node, items, isCopy, newItems)
      {
         // don't allow inserting above the root node
         if (Utilities_GetThisOrParentByTag(node, "LI") == null)
//      if (!Class_HasByElement(node, "edittree_draggable"))
         {
            return;
         }
         let ul = null;
         let dest_li = Utilities_GetThisOrParentByTag(node, "LI");
         if (dest_li == null)
         {
            // tree root
            ul = node.parentElement;
            if (ul.tagName != 'UL')
               ul = ul.querySelector('ul');
         }
         else
         {
            ul = Utilities_GetParentByTag(dest_li, "UL");
         }
         
         for (let span of items)
         {
            let new_li = EditTree.getListElementToPaste(span, isCopy, newItems);
            if (dest_li != null)
            {
               ul.insertBefore(new_li, dest_li);
            }
            else
            {
               ul.appendChild(new_li);
            }
         }
      },
      
      addItemsToFolder: function(node, items, isCopy, newItems)
      {
         let dest_li = Utilities_GetThisOrParentByTag(node, "LI");
         if (dest_li == null)
         {
            // tree root
            dest_li = node.parentElement;
         }
         
         let ul = dest_li.querySelector('.edittree_folder + ul');  // added edittree_folder to skip UL as a menu
         if (ul == null)
         {
            // add children id for toggle hide/show
            const destFolder = dest_li.querySelector('.edittree_folder');
            let childrenID = 'children_';
            if (destFolder)
               childrenID += destFolder.id;
            const ventureID = Tree_GetVentureID(destFolder);//add venture id if multiple ventures
            if (ventureID)
               childrenID += '_venture_' + ventureID;
            
            ul = document.createElement("UL");
            ul.setAttribute('id', childrenID); // sometimes `ul.id = something;` doesn't work on the old browsers.
            dest_li.appendChild(ul);
         }
         
         for (let span of items)
         {
            const new_li = EditTree.getListElementToPaste(span, isCopy, newItems);
            if (new_li != node)   // skip dropping on self
            {
               if (EditTree.direction == 'right')
               {
                  ul.appendChild(new_li);
               }
               else
               {
                  ul.insertBefore(new_li, ul.firstElementChild);
               }
            }
         }
      },
      
      displaySelectedItems: function()
      {
         let temp = document.querySelectorAll('.edittree_draggable,.edittree_selectable');
         
         // Remove borders
         for (let span of temp)
         {
            if (String(span.id).search('_template') == -1)    // skip templates
            {
               Class_RemoveByElement(span, "edittree_selecteditem");
            }
         }
         
         // Add border to new selected elements
         for (let span of EditTree.selected)
         {
            Class_AddByElement(span, "edittree_selecteditem");
         }
         
         for (let callback of EditTree.selectionCallbacks)
         {
            callback(null);
         }
      },
      
      _GetElementID: function(elem, strip_id_prefix)
      {
         if (strip_id_prefix === false) return elem.id;
         
         let substrs = elem.id.split("_");
         let id = substrs[substrs.length - 1];
         if (substrs[0] == "new")
         {
            id = "-" + id;   // use negative number for newly added items
         }
         return id;
      },
      
      // the cell passed in is the LI element (or the DIV for the root)
      _SaveNode: function(cell, strip_id_prefix, dataKeys, result)
      {
         let children = [];
         let ulNode = null;
         
         if (cell.tagName == 'LI')   // if first item is LI then this isn't the root
         {
            let dataNode = cell.firstElementChild;
            
            let dataset = dataNode.dataset;
            
            /* DRL FIXIT? I think this was added so a node cold have an edit box for the label and other properties that
               the user can edit but this is not the correct place for this logic. If we need this behavior the logic
               should be pushed into a callback.
                     // take the existing configuration and add/replace any input fields to it
                     let fields = Form_GetValues(dataNode);
                     for (let property in fields)
                     {
                        if (fields.hasOwnProperty(property))
                        {
                           config[property] = fields[property];
                        }
                     }
            */
            let nodeData =
               {
                  NodeID: EditTree._GetElementID(dataNode, strip_id_prefix),
                  Children: children
               };
            
            if (dataKeys != null)
            {
               for (const i in dataKeys)
               {
                  let dest = dataKeys[i];
                  let destType = null;
                  let destKey = i;
                  if (dest.indexOf(' ') != -1)
                  {
                     destType = dest.split(' ')[0];
                     destKey = dest.split(' ')[1];
                  }
                  
                  if (dataset.hasOwnProperty(i))
                  {
                     if (destType == 'json')
                        nodeData[destKey] = Json_FromString(dataset[i]);
                     else
                        nodeData[destKey] = dataset[i];
                  }
               }
            }
            
            result.push(nodeData);   // push it ahead so the nodes are in the same order as parsed
            
            ulNode = dataNode.nextElementSibling;
            assert(ulNode == null || ulNode.tagName == 'UL');
         }
         else
         {
            // root node
            ulNode = cell;
            while (ulNode != null && ulNode.tagName != 'UL')
            {
               ulNode = ulNode.nextElementSibling;
            }
         }
         
         if (ulNode != null)
         {
            for (let i = 0; i < ulNode.children.length; i++)
            {
               let childNode = ulNode.children[i];
               
               if (!Class_HasByElement(childNode, 'ghostElement') &&   // skip any left over ghost nodes
                  childNode.firstElementChild != null)   // DRL FIXIT! this is a workaround for a bug that seems to happen when we drag files over to a new folder?
               {
                  // this pushes the children onto the array that we put (by reference) into the parent
                  children.push(EditTree._GetElementID(childNode.firstElementChild, strip_id_prefix));
                  
                  EditTree._SaveNode(childNode, strip_id_prefix, dataKeys, result);
               }
            }
         }
      },
      
      // ============================================================
      // Public methods...
      
      IsEditing: function()
      {
         return EditTree.dragEnable;
      },
      
      ToggleEditing: function()
      {
         if (EditTree.dragEnable)
         {
            // event.currentTarget.innerHTML = 'Edit';
            EditTree.DisableEditableTree();
         }
         else
         {
            // event.currentTarget.innerHTML = 'Done';
            EditTree.EnableEditableTree();
         }
      },
      
      EnableEditableTree: function()
      {
         if (!EditTree.dragEnable)
         {
            let tree = Utilities_GetElementsByClass('edittree')[0];
            
            Class_RemoveByElement(tree, 'edittree_disabled');
            EditTree.dragEnable = true;
            
            let draggables = document.querySelectorAll('.edittree_draggable');
            for (let draggable of draggables)
            {
               draggable.setAttribute("draggable", "true");   // for Firefox
               for (let child of draggable.children)
               {
                  // This seems required for MS Edge?
                  child.setAttribute("draggable", "true");
               }
            }
            
            EditTree.EnableDropzone();
         }
      },
      
      DisableEditableTree: function()
      {
         if (EditTree.dragEnable)
         {
            let tree = Utilities_GetElementsByClass('edittree')[0];
            
            Class_AddByElement(tree, 'edittree_disabled');
            EditTree.dragEnable = false;
            
            let draggables = document.querySelectorAll('.edittree_draggable');
            for (let draggable of draggables)
            {
               draggable.setAttribute("draggable", "false");   // for Firefox
               for (let child of draggable.children)
               {
                  // This seems required for MS Edge?
                  child.setAttribute("draggable", "false");
               }
            }
            
            EditTree.DisableDropzone();
         }
      },
      
      UploadURLToDropzone: function(elem, url, folderID)
      {
         // add progress bar
         let progress = document.createElement('div');
         Class_AddByElement(progress, 'uploadProgress');
         progress.style.width = 0;
         elem.appendChild(progress);
         
         // initialize dropzone
         let dropzone = new Dropzone('#' + elem.id, {
            elementID: elem.id,
            url: '/v2/Resources',
            paramName: 'File',
            forceFallback: false,
            chunking: true,
            forceChunking: true,
            chunkSize: 500000,
            retryChunks: true,
            parallelUploads: 1,
            previewTemplate: `<div></div>`,
            params: function(files, xhr, chunk)
            {
               // this method gets called before each chunk is sent to the server and what we return
               // here gets sent to the server as data fields that it can use to process the chunk
               if (chunk)
               {
                  return {
                     ClientFileID: chunk.file.upload.uuid,
                     Filename: chunk.file.name,
                     FileSize: chunk.file.totalSize,
                     SequenceNumber: chunk.index,
                     SequenceOffset: chunk.index * this.options.chunkSize,
                     // we want a new resource ID to be created once the file is uploaded
                     AddResource: true
                  };
               }
            },
            chunksUploaded: function(file, done)
            {
               done();
               // Clear dragType after uploaded
               EditTree.dragType = EditTree.DragTypeNone;
            },
            init: function()
            {
               this.on('uploadprogress', function(file, progress, bytesSent)
               {
                  progress = bytesSent / file.totalSize * 100;
                  elem.getElementsByClassName('uploadProgress')[0].style.width = (progress + "%");
               });
               
               this.on("sending", function(file, xhr, formData)
               {
                  formData.append('ResourceFolderID', folderID);
                  formData.append('Conflict', 'replace');
               });
               
               this.on('success', function(file)
               {
                  let response = JSON.parse(file.xhr.responseText);
                  if (response.status == 'success' && elem)
                  {
                     elem.id = 'file_' + response.data.ResourceID;
                     
                     // remove progress bar
                     let progressElement = elem.getElementsByClassName('uploadProgress')[0];
                     progressElement.parentNode.removeChild(progressElement);
                     
                     // replace file name
                     let nameElement = elem.getElementsByClassName('row_label')[0];
                     nameElement.innerHTML = response.data.Name;
                  }
               });
            }
         });
         
         dropzone.addFile(url);
      },
      
      EnableDropzone: function()
      {
         let tree = Utilities_GetElementsByClass('edittree')[0];
         Class_AddByElement(tree, 'dropzone');
         tree.id = 'edittree_dropzone';
         
         if (tree.dropzone)
         {
            tree.dropzone.destroy();
         }
         
         window.addEventListener("drop", function(e)
         {
            e = e || event;
            if (Utilities_GetParentByClass(e.target, 'edittree') == null)
            {
               EditTree.deleteGhostElements();
               e.preventDefault();
            }
         }, false);
         
         new Dropzone('#' + tree.id,
            {
               elementID: tree.id,
               url: '/v2/Resources',
               paramName: 'File',
               // maxFiles: 1, // This should be disabled for multi files uploading.
               maxFilesize: 2000,    // 2GB (about an hour of video) must match $MaxResourceSize in PHP
               chunkSize: 1000000,   // 1MB
               forceFallback: false, // used to test the case where the browser doesn't support drag-n-drop
               chunking: true,
               forceChunking: true,  // seems our code doesn't currently work in non-chunk mode
               retryChunks: true,
               parallelUploads: 1,
               autoProcessQueue: false,
               previewTemplate: `<div></div>`,
               
               params: function(files, xhr, chunk)
               {
                  // this method gets called before each chunk is sent to the server and what we return
                  // here gets sent to the server as data fields that it can use to process the chunk
                  if (chunk)
                  {
                     return {
                        ClientFileID: chunk.file.upload.uuid,
                        Filename: chunk.file.name,
                        FileSize: chunk.file.size,
                        SequenceNumber: chunk.index,
                        SequenceOffset: chunk.index * this.options.chunkSize,
                        // we want a new resource ID to be created once the file is uploaded
                        AddResource: true
                     };
                  }
               },
               chunksUploaded: function(file, done)
               {
                  done();
                  // Clear dragType after uploaded
                  EditTree.dragType = EditTree.DragTypeNone;
               },
               init: function()
               {
                  let myDropzone = this;
                  let draggingItems = [];
                  
                  this.on('drop', function(event)
                  {
                     if (EditTree.dragType != EditTree.DragTypeFile)
                     {
                        return;
                     }
                     if (EditTree.ghostElements[0].parentNode == null)
                     {
                        // this sometimes happened when dragging a file and dropping it quickly onto the page, and also
                        // when dropping an item onto a quiz that shouldn't be dropped (hence the DropNone)
                        assert(EditTree.dropType == EditTree.DropNone);
                        return;
                     }
                     event.preventDefault();
                     if (EditTree.CheckIfDraggingFile(event))   // we are dropping files and folders from the file system
                     {
                        let parentNode = EditTree.GetParentNode(EditTree.ghostElements[0]);
                        EditTree.draggedParentFolderID = parentNode.id.startsWith('folder_') ? parseInt(parentNode.id.split('_')[1]) : -1;
                        
                        if (EditTree.draggedParentFolderID == null || EditTree.draggedParentFolderID == -1)
                           EditTree.fileList = [];
                     }
                     setTimeout(function()
                     {
                        try
                        {
                           if (EditTree.draggedParentFolderID == -1) return;
                           
                           let chain = Promise.resolve(0);
                           
                           chain = EditTree._MakeDropzoneUploadQueueList(
                              myDropzone, chain, myDropzone.files, 0, EditTree.fileList, EditTree.draggedParentFolderID, EditTree.draggedParentFolderID, [], []
                           );
                           
                           chain.then(function()
                           {
                              // create folder and file structure on the edit tree with template elements
                              let container = document.createElement('li');
                              let generateFolderStructure = function(list, parentID, el)
                              {
                                 list.forEach(function(item)
                                 {
                                    if (item.folderID === parentID)
                                    {
                                       if (item.type === 'file' && item.processed === false)
                                       {
                                          if (item.id === null)
                                          {
                                             // DRL FIXIT? I'm not sure the ID being passed here is correct?
                                             EditTree.CreateNewItem(el, item.clientFileID, 'file', item.name, true, EditTree.DropNone);
                                          }
                                          else
                                          {
                                             let fileEl = document.querySelector('#file_' + item.id);
                                             let progress = document.createElement('div');
                                             Class_AddByElement(progress, 'uploadProgress');
                                             progress.style.width = 0;
                                             fileEl ? fileEl.appendChild(progress) : null;
                                             fileEl ? fileEl.id = item.clientFileID : null;
                                          }
                                       }
                                       else if (item.type === 'folder')
                                       {
                                          let folder = document.querySelector('#folder_' + item.id);
                                          let currentEl;
                                          if (folder)
                                             currentEl = folder.nextSibling;
                                          else
                                          {
                                             currentEl = document.createElement('ul');
                                             let currentDiv = document.querySelector('#folder_added_template').cloneNode(true);
                                             currentDiv.getElementsByClassName('row_label')[0].innerHTML = item.name;
                                             currentDiv.id = 'folder_' + item.id;
                                             
                                             let li = document.createElement('li');
                                             li.appendChild(currentDiv);
                                             li.appendChild(currentEl);
                                             
                                             el.appendChild(li);
                                             
                                             EditTree.setupDragElement(currentDiv);
                                          }
                                          generateFolderStructure(list, item.id, currentEl);
                                       }
                                    }
                                 });
                              }
                              
                              generateFolderStructure(EditTree.fileList, EditTree.draggedParentFolderID, container);
                              
                              // the result of the above is one or more <LI> inside an <LI> container and we only want the interior one
                              if (container.children.length > 0)
                              {
                                 let ghostEl = document.querySelectorAll('.ghostElement');
                                 assert(ghostEl.length == 1);
                                 // I use the parent/next here because the ghost element seems to get
                                 // destroyed below in the loop somehow (callback?)
                                 let parent = ghostEl[0].parentNode;
                                 let last = ghostEl[0].nextElementSibling;
                                 assert(parent.tagName == 'UL')
                                 
                                 while (container.children.length)
                                 {
                                    let elem = container.children[container.children.length - 1];
                                    assert(elem.tagName == 'LI');
                                    assert(elem.innerText.length != 0); // why this?
                                    parent.insertBefore(elem, last);
                                    last = elem;
                                 }
                              }
                              
                              EditTree.deleteGhostElements();
                              
                              // upload files manually
                              myDropzone.processQueue();
                           })
                        }
                        catch (e)
                        {
                           Log_WriteException(e);
                        }
                     }, 200);
                  });
                  this.on("sending", function(file, xhr, formData)
                  {
                     assert(file.upload != undefined);
                     let sendingFile = EditTree.fileList.find(function(f)
                     {
                        return f.type === 'file' && f.clientFileID === file.upload.uuid;
                     });
                     
                     if (sendingFile)
                     {
                        formData.append('ResourceFolderID', sendingFile.folderID);
                        formData.append('Conflict', 'replace');
                     }
                  });
                  this.on('uploadprogress', function(file, progress, bytesSent)
                  {
                     assert(file.upload != undefined);
                     progress = bytesSent / file.size * 100;
                     let uploadEl = Utilities_GetElementById(file.upload.uuid);
                     if (uploadEl)
                        uploadEl.getElementsByClassName('uploadProgress')[0].style.width = (progress + "%");
                  });
                  this.on('success', function(file)
                  {
                     myDropzone.options.autoProcessQueue = true;
                     let uploadEl = Utilities_GetElementById(file.upload.uuid);
                     let response = JSON.parse(file.xhr.responseText);
                     if (response.status == 'success' && uploadEl)
                     {
                        uploadEl.id = 'file_' + response.data.ResourceID;
                        
                        // remove progress bar
                        let progressElement = uploadEl.getElementsByClassName('uploadProgress')[0];
                        progressElement.parentNode.removeChild(progressElement);
                        
                        draggingItems.push(uploadEl);
                     }
                  });
                  this.on('error', function(file, errorMessage)
                  {
                     alert("error: " + errorMessage);
                  });
                  this.on('queuecomplete', function()
                  {
                     // initialized variables so that we can continue drag and drop
                     
                     myDropzone.options.autoProcessQueue = false;
                     myDropzone.files = [];
                     EditTree.fileList = [];
                     EditTree.draggedParentFolderID = -1;
                  });
               }
            });
      },
      
      DisableDropzone: function()
      {
         let tree = Utilities_GetElementsByClass('edittree')[0];
         Class_RemoveByElement(tree, 'dropzone');
         if (tree.dropzone)
         {
            tree.dropzone.destroy();
         }
         
         window.addEventListener("dragover", function(e)
         {
            e = e || event;
            e.preventDefault();
         }, false);
         window.addEventListener("drop", function(e)
         {
            e = e || event;
            e.preventDefault();
         }, false);
      },
      
      CheckIfDraggingFile: function(e)
      {
         let dt = e && e.dataTransfer;
         let isFile = dt && dt.types && Utilities_ArrayContains(dt.types, "Files");
         return isFile;
      },
      
      CheckIfDraggingLink: function(e)
      {
         let dt = e && e.dataTransfer;
         let isLink = dt && dt.types && Utilities_ArrayContains(dt.types, "text/uri-list");
         return isLink;
      },
      
      CheckIfDragEnabled: function()
      {
         let tree = document.getElementsByClassName('edittree')[0];
         let enabled = !tree.className.includes('edittree_disabled');
         return enabled;
      },
      
      GetIds: function(root)
      {
         // the children of the item are next to it in the UL
         // element so we'll go up to the parent to get them all
         let parent = root;
         if (parent.parentNode.tagName == 'LI')
            parent = parent.parentNode;
         
         let temp = parent.querySelectorAll('.edittree_draggable');
         
         let result = [];
         for (let elem of temp)
         {
            // the root element will appear if we went up one element to get the LI, so strip it
            if (elem.id != root.id && String(elem.id).search('_template') == -1)   // skip templates
            {
               result.push(elem.id);
            }
         }
         return result;
      },
      
      GetFilteredIds: function(root)
      {
         let temp = Utilities_GetElementsByClass('edittree_draggable', null, root);
         
         let result = [];
         for (let elem of temp)
         {
            if (Visibility_IsShownByElement(elem.parentNode))
            {
               if (String(elem.id).search('_template') == -1)   // skip templates
               {
                  result.push(elem.id);
               }
            }
         }
         return result;
      },
      
      GetSelectedIds: function(root)
      {
         let result = [];
         for (let elem of EditTree.selected)
         {
            assert(String(elem.id).search('_template') == -1);   // skip templates
            result.push(elem.id);
         }
         return result;
      },
      
      SelectIds: function(ids, root)
      {
         let changed = false;
         
         let temp = Utilities_GetElementsByClass('edittree_draggable', null, root);
         
         for (let id of ids)
         {
            assert(String(id).search('_template') == -1);   // skip templates
            
            for (let elem of temp)
            {
               if (elem.id == id)
               {
                  if (EditTree.addToSelection(elem))
                     changed = true;
               }
            }
         }
         
         // Reset border to selected elements
         if (changed)
            EditTree.displaySelectedItems();
      },
      
      UnselectIds: function(ids, root)
      {
         let changed = false;
         
         for (let id of ids)
         {
            for (let elem of EditTree.selected)
            {
               if (elem.id == id)
               {
                  Utilities_RemoveFromArray(EditTree.selected, elem);
                  changed = true;
               }
            }
         }
         
         // Reset border to selected elements
         if (changed)
            EditTree.displaySelectedItems();
      },
      
      SelectAllRows: function(root)
      {
         let temp = Utilities_GetElementsByClass('edittree_selectable', null, root);
         let ids = [];
         
         for (let elem of temp)
         {
            assert(String(elem.id).search('_template') == -1);   // skip templates
            
            ids.push(elem.id);
         }
         
         EditTree.SelectIds(ids, root);
      },
      
      ClearSelection: function(root)
      {
         EditTree.UnselectIds(EditTree.GetSelectedIds(root));
      },
      
      // item passed is the tree div, returns JSON, dataKeys is array of items to save from the element data and can
      // contain a destination type to perform some conversion such as:
      //
      // let result = EditTree.SaveTree(tree, false,
      //    {
      //       'entries' : 'Entries',        take elem.data.entries and store it in result[i].Entries
      //       'config' : 'json Config',     this will be converted to JSON before storing in result[i].Config
      //    });
      SaveTree: function(root, strip_id_prefix, dataKeys)
      {
         let result = [];
         if (root.firstElementChild)
            EditTree._SaveNode(root.firstElementChild, strip_id_prefix, dataKeys, result);
         return result;
      },
      
      // this handles templated items too
      AddNewItem: function(elem, parentElem, root, dropType)
      {
         assert(Class_HasByElement(parentElem, 'edittree_droppable'));
         let target = Utilities_GetThisOrParentByClass(parentElem, 'edittree_droppable');
         assert(target != null);
         
         let isCopy = dropType == EditTree.DropCopy || dropType == EditTree.ServerCopy;
         let newItems = [];
         if (Class_HasByElement(target, "edittree_folder"))
         {
            EditTree.addItemsToFolder(target, [elem], isCopy, newItems);
         }
         else
         {
            EditTree.insertItemsAfter(target, [elem], isCopy, newItems);
         }
         
         for (let span of newItems)
         {
            OnElemAdded(span, dropType);
         }
         
         FireElemChanged(target);
         
         return Utilities_GetElementById("new_" + EditTree.new_id);
      },
      
      
      CopyChildren: function(sourceParent, destination, root, recursive, serverCopiesItem)
      {
         let children = EditTree.GetChildNodes(sourceParent);
         
         for (let child of children)
         {
            let newElem = EditTree.CopyAndAddNewItem(child, destination, root, recursive,
               serverCopiesItem, serverCopiesItem);  // returns new cloned element with new ID and dataset.source_id
         }
      },
      
      CopyAndAddNewItem: function(elem, parentElem, root, recursive, serverCopiesItem, serverCopiesChildren)
      {
         if (recursive == null) recursive = false;
         
         assert(!Class_HasByElement(elem, "edittree_nottemplated"));
         assert(!Class_HasByElement(elem, "edittree_templated"));
         Class_AddByElement(elem, "edittree_nottemplated");                    // force the call below to create a copy
         let newElem = EditTree.AddNewItem(elem, parentElem, root,
            serverCopiesItem ? EditTree.ServerCopy : EditTree.DropCopy);      // returns new cloned element with new ID
         Class_RemoveByElement(elem, "edittree_nottemplated");                 // restore classes
         if (recursive)
         {
            let children = EditTree.GetChildNodes(elem);
            for (let child of children)
            {
               EditTree.CopyAndAddNewItem(child, newElem, root, recursive, serverCopiesChildren, serverCopiesChildren);
            }
         }
         return newElem;
      },
      
      // NOTE: folder parameter can be the parent folder to contain the new item or it can be an empty LI that
      // is a temporary placeholder for the new item, and if id is null then a new id will be generated.
      // DRL FIXIT? It seems weird to me that we're placing an LI inside an LI as described above?
      CreateNewItem: function(folder, id, type, name, showProgress, dropType, insertBeforeElem = null)
      {
         if (id == null)
         {
            EditTree.new_id++;
            id = "new_" + EditTree.new_id;
         }
         
         if (folder.tagName != 'LI')
         {
            let orig = folder;
            while (folder != null && folder.tagName != 'UL')
            {
               folder = folder.nextElementSibling;
            }
            if (folder == null)
            {
               folder = document.createElement("UL");
               let childrenID = 'children_';
               if (orig)
                  childrenID += orig.id;
               const ventureID = Tree_GetVentureID(orig);//add venture id if multiple ventures
               if (ventureID)
                  childrenID += '_venture_' + ventureID;
               folder.setAttribute('id', childrenID);
               orig.parentNode.appendChild(folder);
            }
         }
         
         let templateEl = document.querySelector('#' + type + '_added_template');
         if (templateEl == null)
         {
            // if it's not one of our recognized templates it's likely something like "link_video" that uses "file" instead
            templateEl = document.querySelector('#file_added_template');
            if (templateEl == null)
            {
               Log_WriteError("Missing template \"file_added_template\" on page!");
               return null;
            }
         }
         
         let fileEl = document.createElement('li');
         let cloneEl = templateEl.cloneNode(true);
         if (showProgress)
         {
            let progress = document.createElement('div');
            Class_AddByElement(progress, 'uploadProgress');
            progress.style.width = '0px';
            cloneEl.appendChild(progress);
         }
         let labels = cloneEl.getElementsByClassName('row_label');
         if (labels.length > 0)
            cloneEl.getElementsByClassName('row_label')[0].innerHTML = name;
         cloneEl.id = id;
         fileEl.appendChild(cloneEl);
         
         if (insertBeforeElem)
         {
            insertBeforeElem = Utilities_GetThisOrParentByTag(insertBeforeElem, "LI");
            assert(insertBeforeElem != null);
            insertBeforeElem.parentNode.insertBefore(fileEl, insertBeforeElem);
         }
         else
            folder.appendChild(fileEl);
         
         EditTree.setupDragElement(cloneEl);
         
         Class_RemoveByElement(cloneEl, "edittree_selecteditem");
         
         // DRL FIXIT? Should we be calling the callbacks and FireElemChanged() here?
         
         OnElemAdded(cloneEl, dropType);
         
         return cloneEl;
      },
      
      DeleteItems: function(ids, root)
      {
         if (ids.length == 0) return;
         
         for (let id of ids)
         {
            let span = Utilities_GetElementById(id);
            if (span)
            {
               const parent = span.parentElement;
               const parentUL = parent.parentElement;
               parent.remove(span);
               Utilities_RemoveFromArray(EditTree.selected, span);
               // Reset Toggle Button if toggle able and dropType is DropCopy or Delete Items
               if (parentUL && (parentUL.tagName.toUpperCase() == 'UL' || parentUL.tagName.toUpperCase() == 'OL'))
               {
                  const destLi = parentUL.parentElement;
                  if (destLi && destLi.tagName.toUpperCase() == 'LI')
                  {
                     const dragDiv = destLi.querySelector('.edittree_folder');
                     if (dragDiv)
                     {
                        if (EditTree.dropType == EditTree.DropCopy && !parentUL.getAttribute('id'))
                        {
                           const toggleButton = dragDiv.querySelector('.list_head > div > a.toggler_id');
                           // reset toggle button if it's folder and has children
                           if (toggleButton)
                           {
                              const dragDivID = dragDiv.getAttribute('id');
                              let childrenID = 'children_' + dragDivID;
                              const ventureID = Tree_GetVentureID(destLi);
                              if (ventureID)
                              { // add venture id in case multiple ventures on the same page
                                 childrenID += '_venture_' + ventureID;
                              }
                              toggleButton.setAttribute('foldertoggleid', dragDivID);
                              toggleButton.href = '#' + childrenID;
                              parentUL.setAttribute('id', childrenID);
                              Visibility_SetById(childrenID, Class_HasByElement(toggleButton, "toggler_opened"));
                              toggleButton.addEventListener('click', Visibility_ToggleHandler);
                           }
                        }
                        else if (!parentUL.children.length)
                        {
                           // remove parent ul and toggle folder open button if no children and still available toggle.
                           const toggleEl = dragDiv.querySelector('.list_head > div > a[href="#' + parentUL.getAttribute('id') + '"].toggler_id');
                           if (toggleEl)
                           {
                              const toggleParent = toggleEl.parentElement;
                              toggleEl.href = '#';
                              toggleEl.className = 'toggler_none';
                              toggleEl.removeAttribute('foldertoggleid');
                              parentUL.parentElement.removeChild(parentUL);
                           }
                        }
                     }
                  }
               }
            }
         }
         
         // Reset border to selected elements
         EditTree.displaySelectedItems();
         
         let tree = Utilities_GetElementsByClass('edittree')[0];
         FireElemChanged(tree);
      },
      
      GetPreviousSiblingNode: function(elem)
      {
         let previousSibling = null;
         let parent = EditTree.GetParentNode(elem);
         if (parent)
         {
            let children = EditTree.GetChildNodes(parent);
            for (let cur of children)
            {
               if (cur == elem)
                  break;
               if (!Class_HasByElement(cur, 'ghostElementNode'))
                  previousSibling = cur;
            }
         }
         return previousSibling;
      },
      
      GetParentNode: function(elem)
      {
         // check that the element is in a tree!
         assert(Utilities_GetParentByClass(elem, 'edittree') != null);
         
         let ul = Utilities_GetParentByTag(elem, "UL");
         if (ul == null)
            return null;
         return ul.previousElementSibling;
      },
      
      GetChildNodes: function(elem)
      {
         let children = [];
         
         // check that the element is in a tree!
         // OR the element is a template (templates aren't under a tree)
         assert(Utilities_GetParentByClass(elem, 'edittree') != null || Utilities_GetParentByClass(elem, 'header_templates') != null);
         
         let ulNode = elem;
         while (ulNode != null && ulNode.tagName != 'UL')
         {
            ulNode = ulNode.nextElementSibling;
         }
         
         if (ulNode != null)
         {
            for (let i = 0; i < ulNode.children.length; i++)
            {
               let childNode = ulNode.children[i];
               if (childNode.firstElementChild == null || childNode.firstElementChild.style.display === 'none')
                  continue;
               else
                  children.push(childNode.firstElementChild);
            }
         }
         
         return children;
      },
      
      Filter: function(searchString, searchClasses)
      {
         if (searchClasses == null)
            searchClasses = new Array();
         
         if (empty(searchString) && searchClasses.length == 0)
         {
            EditTree.ClearFilter();
         }
         else
         {
            if (EditTree._timer)
               clearTimeout(EditTree._timer);
            
            EditTree._searchClasses = searchClasses;
            EditTree._searchString = strtolower(searchString);
            
            EditTree._rows = [];
            let treeRoot = Utilities_GetElementsByClass('edittree', 'DIV', document.body);
            if (treeRoot.length > 0)
            {
               // only include rows inside the treeroot, so that template rows don't get counted
               EditTree._rows = Utilities_GetElementsByClass('edittree_file', 'DIV', treeRoot[0]);
            }
            EditTree._iRow = 0;
            EditTree._timer = setTimeout(function()
            {
               try
               {
                  EditTree._FilterFunc();
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 100);
         }
      },
      
      ClearFilter: function()
      {
         if (EditTree._timer)
            clearTimeout(EditTree._timer);
         
         EditTree._searchClasses = null;
         EditTree._searchString = null;
         EditTree._rows = [];
         let treeRoot = Utilities_GetElementsByClass('edittree', 'DIV', document.body);
         if (treeRoot.length > 0)
         {
            // only include rows inside the treeroot, so that template rows don't get counted
            EditTree._rows = Utilities_GetElementsByClass('edittree_file', 'DIV', treeRoot[0]);
         }
         EditTree._iRow = 0;
         EditTree._timer = setTimeout(function()
         {
            try
            {
               EditTree._ClearFunc();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 100);
      },
      
      _FilterFunc: function()
      {
         if (EditTree._timer)
         {
            // kill the timer
            clearTimeout(EditTree._timer);
            EditTree._timer = null;
            
            let count = 0;
            while (count < 200 && EditTree._iRow < EditTree._rows.length)
            {
               let elem = EditTree._rows[EditTree._iRow];
               let visible = EditTree._MatchesClasses(elem, EditTree._searchClasses) &&
                  EditTree._MatchesString(elem, EditTree._searchString);
               Visibility_SetByElement(elem.parentNode, visible);
               count++;
               EditTree._iRow++;
            }
            
            if (EditTree._iRow < EditTree._rows.length)
            {
               EditTree._timer = setTimeout(function()
               {
                  try
                  {
                     EditTree._FilterFunc();
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 100);
            }
            else
            {
               for (let callback of EditTree.filteringCallbacks)
               {
                  callback(EditTree._table);
               }
            }
         }
      },
      
      _MatchesClasses: function(elem, searchClasses)
      {
         if (searchClasses.length == 0) return true;
         
         // if we're dealing with an array of arrays then ALL of them must be true
         if (is_array(searchClasses[0]))
         {
            let result = true;
            for (let subClasses of searchClasses)
            {
               if (!EditTree._MatchesClasses(elem, subClasses))
                  result = false;
            }
            return result;
         }
         
         // if we're dealing with a simple array then ANY of the items must be true
         return Utilities_ArraysMeet(Utilities_StringToArray(elem.className, ' '), searchClasses);
      },
      
      _MatchesString: function(elem, searchString)
      {
         let text = FilterTable.GetInnerText(elem);
         return Utilities_StringContains(strtolower(text), searchString);
      },
      
      _ClearFunc: function()
      {
         if (EditTree._timer)
         {
            // kill the timer
            clearTimeout(EditTree._timer);
            EditTree._timer = null;
            
            let count = 0;
            while (count < 200 && EditTree._iRow < EditTree._rows.length)
            {
               let elem = EditTree._rows[EditTree._iRow];
               Visibility_ShowByElement(elem.parentNode);
               count++;
               EditTree._iRow++;
            }
            
            if (EditTree._iRow < EditTree._rows.length)
            {
               EditTree._timer = setTimeout(function()
               {
                  try
                  {
                     EditTree._ClearFunc();
                  }
                  catch (e)
                  {
                     Log_WriteException(e);
                  }
               }, 100);
            }
            else
            {
               for (let callback of EditTree.filteringCallbacks)
               {
                  callback(EditTree._table);
               }
            }
         }
      },
      
      _CheckContainsFile: function(uuid, list)
      {
         let i;
         for (i = 0; i < list.length; i++)
         {
            if (list[i].clientFileID === uuid)
            {
               list[i].processed = true;
               return true;
            }
         }
         return false;
      },
      
      // Make Dropzone upload queue file list
      _MakeDropzoneUploadQueueList: async function(myDropzone, chain, files, fileIndex, fileList, originalParentFolderID, parentFolderID, overwriteList, cancelList)
      {
         if (files && fileIndex == files.length)
         {
            return new Promise(function(resolve)
            {
               resolve([
                  fileList,
                  parentFolderID,
                  overwriteList,
                  cancelList
               ]);
            });
         }
         
         let file = files[fileIndex];
         let path = file.fullPath ? file.fullPath : file.name;
         let splits = path.split('/');
         
         chain.then(function(idx)
         {
            return 0;
         });
         
         // Should use "for()", while() loop not working for await
         for (let index = 0; index < splits.length; index++)
         {
            let name = splits[index];
            
            if (index == splits.length - 1) // this is file part.
            {
               await chain.then(function(idx)
               {
                  return new Promise(function(resolve)
                  {
                     // look for a resource with a conflicting name in the folder
                     let params = {'Filter': Json_ToString({'Name':name})}
                     ajax.get('/v2/Folders/' + parentFolderID + '/Resources', params,
                        function(data, httpCode)
                        {
                           data = JSON.parse(data);
//                           if (data.length > 0)
                           {
                              resolve(data);
                           }
// DRL FIXIT? I'm not sure if we need to be checking folders here for a conflicting name?
//                           else
//                           {
//                              // otherwise look for a folder with a conflicting name in the folder
//                              let params = {'Filter': Json_ToString({'Name':name})}
//                              ajax.get('/v2/Folders/' + parentFolderID + '/Folders', params,
//                                 function(data, httpCode)
//                                 {
//                                    data = JSON.parse(data);
//                                    resolve(data);
//                                 }
//                              )
//                           }
                        }
                     )
                  })
                     .then(function(response)
                     {
                        if (response.status == 'success')
                        {
                           let items = response.data;
                           if (items.length === 0) // this means the file is not existing on db
                           {
                              if (!EditTree._CheckContainsFile(file.upload.uuid, fileList))
                              {
                                 fileList.push({
                                    type: 'file',
                                    name: name,
                                    folderID: parentFolderID,
                                    clientFileID: file.upload.uuid,
                                    processed: false,
                                    id: null
                                 });
                              }
                           }
                           else if (!EditTree._CheckContainsFile(file.upload.uuid, fileList)) // this means the file is existing on db
                           {
                              if (idx !== 0)
                              {
                                 // DRL FIXIT? Could the conflicting item be a folder?
                                 let item = items[Object.keys(items)[0]];
                                 fileList.push({
                                    type: 'file',
                                    name: name,
                                    folderID: parentFolderID,
                                    clientFileID: file.upload.uuid,
                                    processed: false,
                                    id: item.ResourceID
                                 });
                              }
                              else // if this is root item(file)
                              {
                                 let confirm = window.confirm(Str("There is already a resource named \"<0>\". Do you want to overwrite it?", name));
                                 if (confirm === false)
                                 {
                                    myDropzone.removeFile(file);
                                 }
                                 else
                                 {
                                    if (!EditTree._CheckContainsFile(file.upload.uuid, fileList))
                                    {
                                       // DRL FIXIT? Could the conflicting item be a folder?
                                       let item = items[Object.keys(items)[0]];
                                       fileList.push({
                                          type: 'file',
                                          name: name,
                                          folderID: parentFolderID,
                                          clientFileID: file.upload.uuid,
                                          processed: false,
                                          id: item.ResourceID
                                       });
                                    }
                                 }
                              }
                           }
                        }
                        
                        return idx + 1;
                     });
               });
            }
            else // else is folder
            {
               await chain.then(function(idx)
               {
                  // Should be same root parent ID if same sibling
                  let filterParentFolderID = originalParentFolderID;
                  if (index > 0)
                  {
                     filterParentFolderID = parentFolderID;
                  }
                  
                  return new Promise(function(resolve)
                  {
                     
                     ajax.post(
                        '/Api.php?Action=GetResourceFolders&Filter={%22ParentResourceFolderID%22%3A' + filterParentFolderID + '%2C%22Name%22%3A%22%27' + name + '%27%22}', {},
                        function(data, httpCode)
                        {
                           data = JSON.parse(data);
                           resolve(data);
                        },
                        false
                     );
                  })
                     .then(function(response)
                     {
                        let folders = response.data.folders;
                        if (folders.length != 0)
                        {
                           let folderData = Object.values(folders);
                           let resourceFolderId = folderData.length ? folderData[0].ResourceFolderID : parentFolderID;
                           
                           let exist = fileList.find(function(folder)
                           {
                              return folder.id === resourceFolderId;
                           });
                           
                           if (exist)
                           {
                              parentFolderID = resourceFolderId;
                           }
                           else
                           {
                              fileList.push({
                                 type: 'folder',
                                 name: name,
                                 folderID: parentFolderID,
                                 id: resourceFolderId
                              });
                              
                              parentFolderID = resourceFolderId;
                              
                              if (overwriteList.includes(folderData[0].ParentResourceFolderID) === true)
                                 overwriteList.push(resourceFolderId);
                              if (cancelList.includes(folderData[0].ParentResourceFolderID) === true)
                                 cancelList.push(resourceFolderId);
                              
                              if (overwriteList.includes(resourceFolderId) === false &&
                                 cancelList.includes(resourceFolderId) === false)
                              {
                                 let confirm = window.confirm(Str("There is already a folder named \"<0>\". Do you want to overwrite it?", name));
                                 if (confirm === true) overwriteList.push(resourceFolderId);
                                 else cancelList.push(resourceFolderId);
                              }
                              
                              if (cancelList.includes(resourceFolderId))
                                 myDropzone.removeFile(file);
                           }
                           
                           return idx + 1;
                        }
                        else
                        {
                           return new Promise(function(resolve)
                           {
                              ajax.post(
                                 '/v2/Folders/' + parentFolderID,
                                 {
                                    'Name': name
                                 },
                                 function(data, httpCode)
                                 {
                                    data = JSON.parse(data);
                                    resolve(data);
                                 }
                              );
                           })
                              .then(function(response)
                              {
                                 if (response.status == 'success')
                                 {
                                    fileList.push({
                                       type: 'folder',
                                       name: name,
                                       folderID: parentFolderID,
                                       id: response.data.ResourceFolderID
                                    });
                                    
                                    parentFolderID = response.data.ResourceFolderID;
                                 }
                                 
                                 return idx + 1;
                              });
                        }
                     });
               });
            }
         }
         
         if (fileIndex < files.length && files[fileIndex + 1])
         {
            fileIndex++;
            
            await EditTree._MakeDropzoneUploadQueueList(
               myDropzone, chain, myDropzone.files, fileIndex, fileList, originalParentFolderID, parentFolderID, overwriteList, cancelList
            );
         }
         else
         {
            return new Promise(function(resolve)
            {
               resolve([
                  fileList,
                  parentFolderID,
                  overwriteList,
                  cancelList
               ]);
            });
         }
      },
   }

DocumentLoad.AddCallback(EditTree.Init);
