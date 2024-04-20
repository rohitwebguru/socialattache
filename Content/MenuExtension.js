/**
 * @deprecated
 * @function iconHtml
 * @param {string} options: array of menu items
 * @param {object} triggerButtonStyles Add custom styles you want for the trigger button
 * @param {object} menuStyles Add custom styles you want for the menu, Obs: Position, z-index, top and left are locked for positioning the menu
 *
 function dropDownMenu(options, triggerButtonStyles = '', menuStyles = null, others = {}) {
    let defaultTriggerButtonStyles = 'margin-left: 5px;margin-right: 5px;'

    //Guarantee the others will become "" if doesn't follow the right pattern
    if (others == null || typeof others == "string"){
         others = {}
    }

    let dropdownTriggerButtonClasses = ['dropdown-menu', 'SA']

    if(typeof others.extraClassesButton != "undefined" && others.extraClassesButton != null){
       dropdownTriggerButtonClasses.push('SA_globalDropdown')
    }
    const button = Utilities_CreateElement('div', {
        class: dropdownTriggerButtonClasses,
        styles: defaultTriggerButtonStyles + Utilities_ParseStyleFromObject(triggerButtonStyles),
    });

    //Making sure the triggerButtonImgStyles have a default value if not set
    if (typeof others.triggerButtonImgStyles == 'undefined' || others.triggerButtonImgStyles == null || others.triggerButtonImgStyles === "") {
        others.triggerButtonImgStyles = {width: '19px', height: '19px'}
    }
    Utilities_CreateElement('img', {
        parent: button,
        src: ImagesUrl + 'IconWithBorder.svg',
        styles: others.triggerButtonImgStyles
    });
    // DRL FIXIT? This should be added as needed, not for every button.
    Utilities_CreateElement('img', {
       parent: button,
       class: 'filterActive',
       src: ImagesUrl + 'Common/Valid.png',
       styles: "position:absolute;display:none;width: 20px;right: -3px;bottom: -1px;"
    });

   Utilities_AddEvent(button, 'click', function(event) {
      const ul = createMenu(options, menuStyles);
   
      //Is changing the position of the UL to the dropdownButton click position, which will be always inside the dropdownButton
      // I offset by 10 in both axis so the mouse cursor is inside the menu and not right on the edge
      ul.style.top = (event.pageY-10)+"px"
      Class_ToggleByElement(ul, 'SA_dropdown-menu-popup-visible');
      //Creating an Orientation for the position from the mouse click the dropdown is going to show, if is going to show to the left or to the right of the click
      if(menuStyles.orientation === "right"){
         ul.style.left = (event.pageX-ul.offsetWidth+10)+"px"
      }else{
         ul.style.left = (event.pageX-10)+"px"
      }

       ul.focus();
       event.stopPropagation();
       event.preventDefault();
       return false;
   });

   return button;
}
 */
function createMenu(options, menuStyles)
{
   let hasSelectables = false
   for (const option of options)
   {
      if (typeof option.others != 'undefined' && typeof option.others.selectable != 'undefined' && option.others.selectable)
         hasSelectables = true;
   }
   
   const ul = createMenuElement(options, menuStyles);
   
   // we wrap the menu so we can have an SA class as a parent to apply our normalization styling
   let wrapper = Utilities_CreateElement('div', {class: ['SA']});
   wrapper.id = 'Pop-Up-Menu';
   wrapper.appendChild(ul);
   
   let old = Utilities_GetElementById('Pop-Up-Menu');
   if (old)
      old.remove();
   document.body.appendChild(wrapper);
   
   Utilities_AddEvent(ul, 'mouseleave', function(event)
   {
      Class_SetByElement(ul, 'SA_dropdown-menu-popup-visible', false)
      event.stopPropagation();
      event.preventDefault();
      return false;
   });
   
   Utilities_AddEvent(ul, 'click', function(event)
   {
      if (!hasSelectables)
      {
         Class_SetByElement(ul, 'dropdown-menu-visible', false);
      }
      event.stopPropagation();
      event.preventDefault();
      return false;
   });
   
   return ul;
}

function showCenteredMenu(options, menuStyles)
{
   const ul = createMenu(options, menuStyles);
   
   // the "!important" below allows us to override .SA_dropdown-menu-popup
   ul.style.cssText = "position:fixed !important; top:100px; left:50%; width:400px; margin-left:-200px; z-index:99999; max-height: none;";
   
   Class_ToggleByElement(ul, 'SA_dropdown-menu-popup-visible');
   
   ul.focus();
}

// classes is an array
function addActionIcon(elem, clickFunction, styles, icon, tooltip, classes)
{
   let button = _createStyledButtonOrMenu(clickFunction, styles, icon, tooltip, classes);
   addElementByButtonStyle(elem, button, styles.button);
   return button;
}

// classes is an array
function addDropDownMenu(elem, options, styles, icon, tooltip, classes)
{
   if (options.length == 0)
   {
      // we add the class because it's used by Pages.js when refreshing items
      Class_AddByElement(elem, classes);
      return null;
   }
   let button = _createStyledButtonOrMenu(options, styles, icon, tooltip, classes);
   addElementByButtonStyle(elem, button, styles.button);
   return button;
}

function addElementByButtonStyle(targetElement, newElement, styles)
{
   let locations = Array.isArray(styles.location) ? styles.location : [styles.location];
   let target = null;
   let offset = null;
   
   for (let location of locations)
   {
      // the location can be an optional selector followed by one of our keywords
      location = location.trim();
      let parts = location.split(' ');
      offset = parts[parts.length - 1];
      if (offset != 'FirstChild' && offset != 'LastChild' && offset != 'PreSibling' && offset != 'PostSibling')
      {
         Log_WriteErrorCallStack('Location is missing or has incorrect offset for button' + location);
         return;
      }
      let selector = location.substr(0, location.length - offset.length).trim();
      
      target = findElement(selector, null, targetElement);
      if (target != null)
         break;
   }
   if (target == null)
   {
      if (targetElement)   // if we started with no target (used for main menu) perhaps the page just isn't loaded yet?
         Log_WriteErrorCallStack('Target element not found for adding button!')
//      else
//         Log_WriteWarningCallStack('Target element not found for adding button!')
      return;
   }
   
   // if we are passed a document fragment we need to get a copy here so that we can set the dataset below
   let newNode = newElement.constructor.name == 'DocumentFragment'
      ? [].slice.call(newElement.childNodes, 0)[0]
      : newElement;
   
   if (offset == 'FirstChild')
   {
      target.insertBefore(newElement, target.firstChild);
   }
   else if (offset == 'LastChild')
   {
      target.appendChild(newElement);
   }
   else if (offset == 'PreSibling')
   {
      target.parentNode.insertBefore(newElement, target);
   }
   else if (offset == 'PostSibling')
   {
      target.parentNode.insertBefore(newElement, target.nextSibling);
   }
   else
   {
      Log_WriteErrorCallStack('Unrecognized offset value for button: ' + GetVariableAsString(styles.location));
   }
   
   // we must store the ID of the original target element for the Pages.js code to find it
   if (targetElement)   // not provided for the main menu - but perhaps we should to be consistent and catch bugs?
      newNode.dataset.sa_original_target = Utilities_ElementId(targetElement);
}

// icon, tooltip and classes (an array) are optional, icon is an override
function _createStyledButtonOrMenu(optionsOrFunction, styles, icon, tooltip, classes)
{
   // if any of the parts of the structure are missing, we'll get that missing part from the default
   if (typeof styles.button == 'undefined')
   {
      styles.button = constantStyles.ButtonAndMenuDefaults.button;
   }
   if (typeof styles.button.styles == 'undefined')
   {
      styles.button.styles = constantStyles.ButtonAndMenuDefaults.button.styles;
   }
   if (typeof styles.button.classes == 'undefined')
   {
      styles.button.classes = constantStyles.ButtonAndMenuDefaults.button.classes;
   }
   if (typeof styles.button.img == 'undefined')
   {
      styles.button.img = constantStyles.ButtonAndMenuDefaults.button.img;
   }
   if (typeof styles.button.img.src == 'undefined')
   {
      styles.button.img.src = constantStyles.ButtonAndMenuDefaults.button.img.src;
   }
   if (typeof styles.button.img.styles == 'undefined')
   {
      styles.button.img.styles = constantStyles.ButtonAndMenuDefaults.button.img.styles;
   }
   if (typeof styles.button.img.classes == 'undefined')
   {
      styles.button.img.classes = constantStyles.ButtonAndMenuDefaults.button.img.classes;
   }
   if (typeof styles.button.extraImages == 'undefined')
   {
      styles.button.extraImages = constantStyles.ButtonAndMenuDefaults.button.extraImages;
   }
   if (typeof styles.button.location == 'undefined')
   {
      styles.button.location = constantStyles.ButtonAndMenuDefaults.button.location;
   }
   if (typeof styles.menu == 'undefined')
   {
      styles.menu = constantStyles.ButtonAndMenuDefaults.menu;
   }
   if (typeof styles.menu.styles == 'undefined')
   {
      styles.menu.styles = constantStyles.ButtonAndMenuDefaults.menu.styles;
   }
   if (typeof styles.menu.classes == 'undefined')
   {
      styles.menu.classes = constantStyles.ButtonAndMenuDefaults.menu.classes;
   }
   if (typeof styles.menu.orientation == 'undefined')
   {
      styles.menu.orientation = constantStyles.ButtonAndMenuDefaults.menu.orientation;
   }
   if (typeof styles.others == 'undefined')
   {
      styles.others = constantStyles.ButtonAndMenuDefaults.others;
   }
   
   if (classes != null)
      classes = classes.concat(styles.button.classes);
   else
      classes = styles.button.classes;
   
   //Start Creating Elements
   const button = Utilities_CreateElement('div', {
      class: classes,
      styles: styles.button.styles,
   });
   
   if (icon)
      icon = SkinsUrl + icon; // DRL FIXIT? Maybe the "v2/Skins/" or "Images/" part should be specified so we know which prefix to use?
   else
      icon = ImagesUrl + styles.button.img.src;
   
   //Main Icon/Image for dropdown
   Utilities_CreateElement('img', {
      parent: button,
      src: icon,
      class: styles.button.img.classes,
      styles: styles.button.img.styles,
      title: tooltip ? tooltip : ''
   });
   //Add Extra Icons to the Dropdown Trigger Button
   for (let i in styles.button.extraImages)
   {
      Utilities_CreateElement('img', {
         parent: button,
         class: styles.button.extraImages[i].classes,
         src: ImagesUrl + styles.button.extraImages[i].src,
         styles: styles.button.extraImages[i].styles
      });
   }
   
   let clickFunction = typeof optionsOrFunction == 'function'
      ? function(event)
      {
         optionsOrFunction();
         // I'm trying to keep whatever might be on the page from triggering as well...
         event.stopPropagation();
         event.preventDefault();
         return false;
      }
      : function(event)
      {
         let hasSelectables = false
         for (const option of optionsOrFunction)
         {
            if (typeof option.others != 'undefined' && typeof option.others.selectable != 'undefined' && option.others.selectable)
               hasSelectables = true;
         }
         const ul = createStyledMenu(optionsOrFunction, styles.menu.styles, styles.menu.classes);
         
         // we wrap the menu so we can have an SA class as a parent to apply our normalization styling
         let wrapper = Utilities_CreateElement('div', {class: ['SA']});
         wrapper.id = 'Pop-Up-Menu';
         wrapper.appendChild(ul);
         
         let old = Utilities_GetElementById('Pop-Up-Menu');
         if (old)
            old.remove();
         document.body.appendChild(wrapper);
         
         //Is changing the position of the UL to the dropdownButton click position, which will be always inside the dropdownButton
         // I offset in both axis so the mouse cursor is inside the menu and not right on the edge
         ul.style.position = 'absolute';
         ul.style.top = (event.pageY - 20) + "px";   // DRL FIXIT? 10 used to work but now I need 20 to get the mouse inside??
         Class_ToggleByElement(ul, 'SA_dropdown-menu-popup-visible');
         //Creating an Orientation for the position from the mouse click the dropdown is going to show, if is going to show to the left or to the right of the click
         if (styles.menu.orientation === "right")
         {
            ul.style.left = (event.pageX - ul.offsetWidth + 10) + "px";
         }
         else
         {
            ul.style.left = (event.pageX - 10) + "px";
         }
         
         Utilities_AddEvent(ul, 'mouseleave', function(event)
         {
            Class_SetByElement(ul, 'SA_dropdown-menu-popup-visible', false);
            // I'm trying to keep whatever might be on the page from triggering as well...
            event.stopPropagation();
            event.preventDefault();
            return false;
         });
         
         Utilities_AddEvent(ul, 'click', function(event)
         {
            if (!hasSelectables)
            {
               Class_SetByElement(ul, 'dropdown-menu-visible', false);
            }
            // I'm trying to keep whatever might be on the page from triggering as well...
            event.stopPropagation();
            event.preventDefault();
            return false;
         });
         
         ul.focus();
         // I'm trying to keep whatever might be on the page from triggering as well...
         event.stopPropagation();
         event.preventDefault();
         return false;
      };
   
   Utilities_AddEvent(button, 'click', clickFunction);
   
   return button;
}


function popUpMenu(title, options, menuStyles = null, others = {})
{
   //Guarantee the others will become "" if doesn't follow the right pattern
   if (others == null || typeof others == "string")
   {
      others = {}
   }
   
   const ul = createMenuElement(options, menuStyles);
   
   // we wrap the menu so we can have an SA class as a parent to apply our normalization styling
   let wrapper = Utilities_CreateElement('div', {class: ['SA']});
   wrapper.id = 'Pop-Up-Menu';
   wrapper.appendChild(ul);
   
   if (title)
   {
      const label = Utilities_CreateElement('li', {innerText: title});
      ul.insertBefore(label, ul.firstElementChild);
   }
   
   let old = Utilities_GetElementById('Pop-Up-Menu');
   if (old)
      old.remove();
   document.body.appendChild(wrapper);

//   let hasSelectables = false
//   for (const option of options) {
//      if(typeof option.others != 'undefined' && typeof option.others.selectable != 'undefined' && option.others.selectable)
//         hasSelectables = true;
//   }
   
   // the "!important" below allows us to override .SA_dropdown-menu-popup
   ul.style.cssText = "position:fixed !important; top:100px; left:50%; width:400px; margin-left:-200px; z-index:99999;";
   
   ul.focus();
   
   Class_SetByElement(ul, 'SA_dropdown-menu-popup-visible', true);
   /*
      Utilities_AddEvent(div, 'mouseleave', function(event) {
         ul.remove();
         event.stopPropagation();
         event.preventDefault();
         return false;
      });
   */
   Utilities_AddEvent(ul, 'click', function(event)
   {
//      if(!hasSelectables){
      ul.remove();
//      }
      event.stopPropagation();
      event.preventDefault();
      return false;
   });
}

/**
 * @deprecated
 * @param options
 * @param menuStyles
 * @returns {*}
 */
function createMenuElement(options, menuStyles = null)
{
   //Default the z-index to make it sure is showing on top of everything after open
   if (menuStyles == null)
   {
      menuStyles = "z-index: 9999;"
   }
   const ul = Utilities_CreateElement('ul',
      {
         class: ['SA_dropdown-menu-popup'],
         styles: menuStyles
      });
   for (const option of options)
   {
      let others = {};
      if (typeof option.others != 'undefined')
         others = option.others;
      addMenuButton(ul, option.label, option.icon, option.cmd, others);
   }
   return ul;
}


function createStyledMenu(options, styles, classes)
{
   const ul = Utilities_CreateElement('ul',
      {
         class: classes,
         styles: styles
      });
   for (const option of options)
   {
      addStyledMenuButton(ul, option);
   }
   return ul;
}

/**
 * @deprecated
 * @param ul
 * @param text
 * @param icon
 * @param callback
 * @param other
 * @returns {*}
 */
function addMenuButton(ul, text, icon, callback, other)
{
   const button = Utilities_CreateElement('li', {parent: ul});
   const clickZone = Utilities_CreateElement('div', {parent: button});
   const id = "chckbx_" + Utilities_IntRand(100, 1000000);
   
   let input = null;
   if (typeof other.selectable != "undefined")
   {
      input = Utilities_CreateElement('input', {
         id: id,
         parent: clickZone,
         type: 'checkbox'
      });
      if (typeof other.selected != "undefined")
      {
         input.checked = other.selected
      }
   }
   if (icon)
   {
      let icon_path = (icon.indexOf('.png') != -1 || icon.startsWith('Icon')) ? ImagesUrl : SkinsUrl;
      Utilities_CreateElement('img', {
         class: 'iconsmall',
         src: icon_path + icon,
         parent: clickZone
      });
   }
   Utilities_CreateElement('label', {
      htmlFor: id,
      innerText: text,
      parent: clickZone
   });
   
   if (typeof callback != 'undefined' && callback != null)
   {
      Utilities_AddEvent(clickZone, 'click', function(event)
      {
//            event.preventDefault()   DRL Looks like we don't need this?
         if (typeof other.selectable == "undefined" || !other.selectable)
         {
            Class_SetByElement(ul, 'SA_dropdown-menu-popup-visible', false);
         }
         // DRL FIXIT! It looks like there's some code somewhere that is restoring the state of
         // the checkbox after this event handler so the workaround there is to wait and
         // take forceful action after.
         setTimeout(function()
         {
            try
            {
               if (input)
                  input.checked = !input.checked;
               
               callback(event.target, input ? input.checked : null);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 10);
         
         // NOTE: we let this event bubble up so the UL element can handle hiding the menu
      });
   }
   
   return button;
}


function addStyledMenuButton(ul, option)
{
   let {text, label, icon, cmd, callback} = option
   let other = {}
   if (option.other != null)
   {
      other = option.other;
   }
   
   const button = Utilities_CreateElement('li', {parent: ul});
   const clickZone = Utilities_CreateElement('div', {parent: button});
   const id = "chckbx_" + Utilities_IntRand(100, 1000000);
   
   let input = null;
   if (typeof other.selectable != "undefined")
   {
      input = Utilities_CreateElement('input', {
         id: id,
         parent: clickZone,
         type: 'checkbox'
      });
      if (typeof other.selected != "undefined")
      {
         input.checked = other.selected
      }
   }
   if (icon)
   {
      let icon_path = (icon.indexOf('.png') != -1 || icon.startsWith('Icon')) ? ImagesUrl : SkinsUrl;
      Utilities_CreateElement('img', {
         class: 'iconsmall',
         src: icon_path + icon,
         parent: clickZone
      });
   }
   Utilities_CreateElement('label', {
      htmlFor: id,
      innerText: text ?? label,
      parent: clickZone
   });
   
   if (callback == null)
   {
      callback = cmd;
   }
   
   if (typeof callback != 'undefined' && callback != null)
   {
      Utilities_AddEvent(clickZone, 'click', function(event)
      {
         //            event.preventDefault()   DRL Looks like we don't need this?
         if (typeof other.selectable == "undefined" || !other.selectable)
         {
            Class_SetByElement(ul, 'SA_dropdown-menu-popup-visible', false);
         }
         // DRL FIXIT! It looks like there's some code somewhere that is restoring the state of
         // the checkbox after this event handler so the workaround there is to wait and
         // take forceful action after.
         setTimeout(function()
         {
            try
            {
               if (input)
                  input.checked = !input.checked;
               
               callback(event.target, input ? input.checked : null);
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 10);
         
         // NOTE: we let this event bubble up so the UL element can handle hiding the menu
      });
   }
   
   return button;
}
