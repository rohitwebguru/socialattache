(function(name, factory)
{
   
   if (typeof window === "object")
   {
      
      // add to window 
      window[name] = factory();
      
      // add jquery plugin, if available  
      if (typeof jQuery === "object")
      {
         jQuery.fn[name] = function(options)
         {
            return this.each(function()
            {
               new window[name](this, options);
            });
         };
      }
   }
})("DragDropFactory", function()
{
   
   let _w = window,
      _b = document.body,
      _d = document.documentElement;
   
   // get position of mouse/touch in relation to viewport 
   let getPoint = function(e)
   {
      let scrollX = Math.max(0, _w.pageXOffset || _d.scrollLeft || (_b && _b.scrollLeft) || 0) - (_d.clientLeft || 0),
         scrollY = Math.max(0, _w.pageYOffset || _d.scrollTop || (_b && _b.scrollTop) || 0) - (_d.clientTop || 0),
         pointX = e ? (Math.max(0, e.pageX || e.clientX || 0) - scrollX) : 0,
         pointY = e ? (Math.max(0, e.pageY || e.clientY || 0) - scrollY) : 0;
      
      return {x: pointX, y: pointY};
   };
   
   // class constructor
   let Factory = function(container, options)
   {
      if (container && container instanceof Element)
      {
         this._container = container;
         this._options = options || {}; /* nothing atm */
         this._clickItem = null;
//         this._hovItem   = null;
         this._click = {};
         this._dragging = false;
         this._mousemoveHandler = null;
         this._touchmoveHandler = null;
         this._contextmenuHandler = null;
         
         
         this._container.setAttribute("data-is-sortable", 1);
         this._container.style["position"] = "static";
         
         window.addEventListener("mousedown", this._onPress.bind(this), true);
         window.addEventListener("mouseup", this._onRelease.bind(this), true);
         window.addEventListener("touchstart", this._touchHandler.bind(this), true);
         window.addEventListener("touchend", this._touchHandler.bind(this), true);
         window.addEventListener("touchcancel", this._touchHandler.bind(this), true);
         
         // window.addEventListener( "scroll", this._onScrollHandler.bind( this ), true );
      }
   };
   
   // class prototype
   Factory.prototype = {
      constructor: Factory,
      
      // serialize order into array list 
      toArray: function(attr)
      {
         attr = attr || "id";
         
         let data = [],
            item = null,
            uniq = "";
         
         for (let i = 0; i < this._container.children.length; ++i)
         {
            item = this._container.children[i],
               uniq = item.getAttribute(attr) || "";
            uniq = uniq.replace(/[^0-9]+/gi, "");
            data.push(uniq);
         }
         return data;
      },
      
      // serialize order array into a string 
      toString: function(attr, delimiter)
      {
         delimiter = delimiter || ":";
         return this.toArray(attr).join(delimiter);
      },
      
      // checks if mouse x/y is on top of an item 
      _isOnTop: function(item, x, y)
      {
         let box = item.getBoundingClientRect(),
            isx = (x > box.left && x < (box.left + box.width)),
            isy = (y > box.top && y < (box.top + box.height));
         return (isx && isy);
      },
      
      // DRL FIXIT! Use our Class_AddByElement() and Class_RemoveByElement() instead!
      // manipulate the className of an item (for browsers that lack classList support)
      _itemClass: function(item, task, cls)
      {
         let list = item.className.split(/\s+/),
            index = list.indexOf(cls);
         
         if (task === "add" && index == -1)
         {
            list.push(cls);
            item.className = list.join(" ");
         }
         else if (task === "remove" && index != -1)
         {
            list.splice(index, 1);
            item.className = list.join(" ");
         }
      },
      
      // swap position of two item in sortable list container 
      _swapItems: function(item1, item2)
      {
         let parent1 = item1.parentNode;
         let parent2 = item2.parentNode;
         
         if (parent1 === parent2 && item1.nextElementSibling == item2)
         {
            // let temp = item1;
            // item1 = item2;
            // item2 = temp;
            parent2.insertBefore(item1, item2.nextElementSibling);
         }
         else
         {
            parent2.insertBefore(item1, item2);
         }
         
         // parent2.insertBefore( item1, item2 );
      },
      
      // make a temp fake item for dragging and add to container 
      _makeDragItem: function(item)
      {
         this._trashDragItem();
         
         this._clickItem = item;
         this._itemClass(this._clickItem, "add", "active");
      },
      
      // remove drag item that was added to container 
      _trashDragItem: function()
      {
         if (this._clickItem)
         {
            this._itemClass(this._clickItem, "remove", "active");
            this._clickItem = null;
         }
      },
      
      // convert touch event to mouse event
      _touchHandler: function(e)
      {
         let touch = e.changedTouches[0];
         
         let simulatedEvent = document.createEvent("MouseEvent");
         simulatedEvent.initMouseEvent({
               touchstart: "mousedown",
               touchmove: "mousemove",
               touchend: "mouseup"
            }[e.type], true, true, window, 1,
            touch.screenX, touch.screenY,
            touch.clientX, touch.clientY, false,
            false, false, false, 0, null);
         touch.target.dispatchEvent(simulatedEvent);
         
         // e.preventDefault();
      },
      
      // on item press/drag 
      _onPress: function(e)
      {
         // DRL FIXIT! Got: Uncaught TypeError: e.target.className.includes is not a function
         if (e && e.target && e.target.className && typeof e.target.className.includes !== 'undefined' &&
            e.target.className.includes(this._options.handler))
         {
            e.preventDefault();
            
            this._dragging = true;
            this._click = getPoint(e);
            
            this._mousemoveHandler = this._onMove.bind(this);
            this._touchmoveHandler = this._touchHandler.bind(this);
            this._contextmenuHandler = function(e)
            {
               e.preventDefault();
            };
            this._selectstartHandler = function(e)
            {
               e.preventDefault();
            };
            
            window.addEventListener("mousemove", this._mousemoveHandler, true);
            window.addEventListener("touchmove", this._touchmoveHandler, {passive: false});
            // this was needed to disable the menu on Chromebook otherwise it comes up when you drag
            window.addEventListener("contextmenu", this._contextmenuHandler);
            // this was needed to disable selection in some cases
            window.addEventListener("selectstart", this._selectstartHandler);
            
            this._makeDragItem(e.target.parentNode);
            this._onMove(e);
         }
      },
      
      // on item release/drop 
      _onRelease: function(e)
      {
         this._dragging = false;
         this._trashDragItem();
         
         window.removeEventListener("mousemove", this._mousemoveHandler, true);
         window.removeEventListener("touchmove", this._touchmoveHandler, {passive: false});
         window.removeEventListener("contextmenu", this._contextmenuHandler);
         window.removeEventListener("selectstart", this._selectstartHandler);
         
         this._mousemoveHandler = null;
         this._touchmoveHandler = null;
         this._contextmenuHandler = null;
         this._selectstartHandler = null;
         
         this._options.handler == 'MultiItem_Drag' ?
            MultiItem.ReorderId(this._container) :
            MultiSelect.ReorderId(this._container.querySelector('.MultiSelect'), true);
         
         for (let b = 0; b < this._container.children.length; ++b)
         {
            let subItem = this._container.children[b];
            if (Class_HasByElement(subItem, 'DDF_UNINIT'))
            {
               Form_InitializeNode(subItem);
               Class_RemoveByElement(subItem, 'DDF_UNINIT');
            }
         }
      },
      
      // on item drag/move
      _onMove: function(e)
      {
         if (this._dragging)
         {
            e.preventDefault();
            
            let point = getPoint(e);
            
            // container is empty, move clicked item over to it on hover 
            if (this._container.children.length === 0 && this._isOnTop(this._container, point.x, point.y))
            {
               this._container.appendChild(this._clickItem);
               return;
            }
            
            // check if current drag item is over another item and swap places 
            for (let b = 0; b < this._container.children.length; ++b)
            {
               let subItem = this._container.children[b];
               
               if (subItem === this._clickItem)
               {
                  continue;
               }
               if (subItem.className.includes(this._options.item) && this._isOnTop(subItem, point.x, point.y))
               {
                  if (!Class_HasByElement(this._clickItem, 'DDF_UNINIT'))
                  {
                     Form_UninitializeNode(this._clickItem);
                     Class_AddByElement(this._clickItem, 'DDF_UNINIT');
                  }
                  if (!Class_HasByElement(subItem, 'DDF_UNINIT'))
                  {
                     Form_UninitializeNode(subItem);
                     Class_AddByElement(subItem, 'DDF_UNINIT');
                  }

//                  this._hovItem = subItem;
                  this._swapItems(this._clickItem, subItem);
               }
            }
            
            // Scrolling
            if (this._clickItem)
            {
               let bottom = window.innerHeight - this._clickItem.offsetHeight,
                  top = window.screenTop + this._clickItem.offsetHeight,
                  itemTop = this._clickItem.getBoundingClientRect().top + this._clickItem.offsetHeight;
               
               if (itemTop > bottom)
               {
                  //Down
                  console.log("DragDropFactory scrolling down");
                  window.scrollTo({
                     top: window.scrollY + itemTop,
                     behavior: 'smooth'
                  });
               }
               else if (itemTop < top)
               {
                  //Up
                  console.log("DragDropFactory scrolling up");
                  window.scrollTo({
                     top: 0,
                     behavior: 'smooth'
                  });
               }
               else
               {
                  console.log("DragDropFactory stop scrolling");
                  window.scrollBy({
                     top: 0
                  });
               }
            }
         }
      },
   };
   
   // export
   return Factory;
});

// helper init function 
function initSortable(listClass, containerIsParent, handler, item)
{
   let listObj = document.getElementsByClassName(listClass);
   for (let i = 0; i < listObj.length; i++)
   {
      let sortable = new DragDropFactory(containerIsParent ? listObj[i].parentNode : listObj[i], {
         handler: handler,
         item: item
      });
   }
}