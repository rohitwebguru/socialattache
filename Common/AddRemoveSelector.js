// ========================================================================
//        Copyright ? 2020 Dominique Lacerte, All Rights Reserved.
//
// Redistribution and use in source and binary forms are prohibited without
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

//	Provides a drop down list of available options, the ones that are not added
//	appear with a '+' prefix and are added when selected. There is also an X button
//	to remove the selected item from the added options. Each option in the list has
// an associated class that can be applied to UI elements on the page to show
// them when that option is selected and hide them when that option is NOT selected.
//
//	This code makes use of the PHP FormPrepAddRemoveSelector() and
//	FormParseAddRemoveSelector()

AddRemoveSelector = (function()
{
   var _formValuesUpdated = function(prefix, values)
   {
      let visibleLanguageInput = Utilities_GetElementByName(prefix + 'Language_Visible')
      
      // this code is specific to the usage of a template editor with a layout editor in an iFrame so
      // let's check if we're in that scenario and skip every other scenario
      if (visibleLanguageInput == null || !values.hasOwnProperty('SelectedLanguageCode'))
         return;
      
      let selectedLanguageCode = values['SelectedLanguageCode'];
      
      visibleLanguageInput.value = values['UsedLanguageCodes'].join(',');
      
      if (visibleLanguageInput.value)
      {
         let languageCodes = visibleLanguageInput.value.split(',');
         let radioInputs = Utilities_GetElementsByName(prefix + 'Language_Selected');
         
         for (let radioOption of radioInputs)
         {
            if (languageCodes.indexOf(radioOption.value) == -1)
            {
               radioOption.parentNode.removeChild(radioOption);
            }
         }
         
         for (let code of languageCodes)
         {
            let option = null;
            let options = visibleLanguageInput.parentNode.querySelectorAll('.tab_radio_button');
            
            for (let i = 0; i < options.length; i++)
            {
               if (options[i].value == code)
               {
                  option = options[i];
                  break;
               }
            }
            
            if (option == null)
            {
               option = AddRemoveSelector.createOption(prefix + 'Language', code, '');
               Utilities_InsertBeforeNode(visibleLanguageInput.parentNode, option, visibleLanguageInput);
            }
            
            if (option != null)
            {
               option.checked = false;
               
               if (selectedLanguageCode == option.value)
               {
                  option.checked = true;
               }
            }
         }
         
         let selectEL = Utilities_GetElementById(prefix + 'Language');
         
         if (selectEL)
         {
            selectEL.value = selectedLanguageCode;
         }
      }
   }
   
   var _getOptionId = function(name, selectedItem)
   {
      return name + '_Selected_' + selectedItem.replace(/[^a-z\d]/i, "");
   };
   
   var _createOptionInput = function(name, selectedItem, selectedLanguage)
   {
      let optionInput = document.createElement('input');
      optionInput.type = 'radio';
      optionInput.name = name + '_Selected';
      optionInput.id = _getOptionId(name, selectedItem);
      optionInput.setAttribute('data-language', selectedLanguage.replace('+', '').trim());
      optionInput.className = 'tab_radio_button';
      optionInput.value = selectedItem;
      optionInput.checked = true;
      
      return optionInput;
   }
   
   var _setRemoveBtnVisibility = function(name)
   {
      let visibleOptions = Utilities_GetElementByName(name + '_Visible');
      
      if (visibleOptions.value.indexOf(',') == -1) // don't allow removing the last item
      {
         Visibility_HideByClass(name + '_RemoveBtn');
      }
      else
      {
         Visibility_SetByClass(name + '_RemoveBtn', true);
      }
   }
   
   var _setCurrentLanguage = function(name, currentElement)
   {
      let menuSpan = Utilities_GetElementById('AddRemoveSelector_' + name)
         .querySelector('.dropdown-menu').firstElementChild;
      let languageSpan = menuSpan.querySelector('span');
      let imgIcon = menuSpan.querySelector('img');
      
      if (currentElement == null)
      {
         imgIcon.style.display = 'inline-block';
         languageSpan.innerHTML = Str("Language");
         return;
      }
      
      imgIcon.style.display = 'none';
      
      let language = currentElement.innerHTML;
      
      if (language.indexOf('+') != -1)
      {
         language = language.replace('+', '').trim();
      }
      
      languageSpan.innerHTML = language;
   }
   
   var _addItem = function(event, name, currentElement, classPrefix, selectedValue, selectedLanguage, isLayoutEditor)
   {
      let selectedItem = null;
      
      if (isLayoutEditor == true)
         selectedItem = selectedValue;
      else
         selectedItem = currentElement.value;
      
      let visibleOptions = Utilities_GetElementByName(name + '_Visible');
      let visibleValues = [];
      
      if (visibleOptions.value)
         visibleValues = visibleOptions.value.split(",");
      
      // if selected item is aready added then show/hide the necessary UI elements
      if (visibleValues.indexOf(selectedItem) !== -1)
      {
         AddRemoveSelector.changeItem(name, classPrefix, selectedItem, isLayoutEditor, currentElement);
         return false;
      }
      
      if (selectedItem)
         visibleValues.push(selectedItem);
      
      visibleOptions.value = visibleValues.join(',');
      
      let options = Utilities_GetElementsByName(name + '_Selected');
      
      for (let option of options)
      {
         option.checked = false;
         option.removeAttribute('checked');
      }
      
      let dummyInput = _createOptionInput(name, selectedItem, selectedLanguage);
      
      if (!isLayoutEditor)
         dummyInput.style.display = 'none';
      
      Utilities_InsertBeforeNode(visibleOptions.parentNode, dummyInput, visibleOptions);
      
      if (isLayoutEditor)
      {
         Layout_AdjustTranslatables(Utilities_GetElementById('EditArea'));
         
         _setCurrentLanguage(name, currentElement);
         
         let languageDivs = Utilities_GetElementById('AddRemoveSelector_' + name)
            .querySelector('ul').querySelectorAll('div');
         
         for (let elem of languageDivs)
         {
            if ((elem.innerHTML).replace('+', '').trim() == selectedLanguage)
            {
               elem.innerHTML = selectedLanguage.replace('+', '').trim();
            }
         }
      }
      
      _setRemoveBtnVisibility(name);
      
      // The LayoutEditor has code in JavaScript to add/remove versions as needed, but in the template
      // case the PHP code does it (perhaps we could change that?).
      if (!isLayoutEditor)
         RefreshForm();
   };
   
   var _updateVisibility = function()
   {
      // an item should be visible if it has the selected class from each of the selectors it's associated with
      
      let addRemoveSelectors = Utilities_GetElementsByClass('AddRemoveSelector');
      let selections = {};
      for (let addRemoveSelector of addRemoveSelectors)
      {
         let prefix = addRemoveSelector.getAttribute('data-prefix');
         if (!selections.hasOwnProperty(selections[prefix + 'hide_on_change']))
            selections[prefix + 'hide_on_change'] = prefix + addRemoveSelector.value;
         else
            Log_WriteError('There is more than one AddRemoveSelector handling the prefix ' + prefix + '!');
      }
      
      let addRemoveSelectorItems = Utilities_GetElementsByClass('AddRemoveSelectorItem');
      for (let addRemoveSelectorItem of addRemoveSelectorItems)
      {
         let visible = null;
         let classes = Class_GetByElement(addRemoveSelectorItem);
         for (let selectorType in selections)
         {
            if (Utilities_ArrayContains(classes, selectorType))
            {
               if (visible !== false)
                  visible = Utilities_ArrayContains(classes, selections[selectorType]);
            }
         }
         if (visible !== null)
            Visibility_SetByElement(addRemoveSelectorItem, visible);
         else
            Log_WriteError('There is an element marked as AddRemoveSelectorItem without a matching AddRemoveSelector! It has classes: ' +
               classes.join(', '));
      }
   }
   
   var _changeItem = function(name, classPrefix, selectedItem, isLayoutEditor, currentElement)
   {
      let selectEL = Utilities_GetElementById(name);
      let options = Utilities_GetElementsByName(name + '_Selected');
      
      if (!isLayoutEditor)
      {
         if (selectEL.value != selectedItem)
         {
            selectEL.value = selectedItem;
         }
      }
      
      for (let option of options)
      {
         if (option.value == selectedItem)
         {
            option.checked = true;
         }
         else
         {
            option.checked = false;
         }
      }
      
      _setRemoveBtnVisibility(name);
      _updateVisibility();
      
      if (isLayoutEditor)
      {
         _setCurrentLanguage(name, currentElement);
         
         MassageLayoutForEditing(Utilities_GetElementById('EditArea'));
      }
   }
   
   var _removeItem = function(name, classPrefix, isLayoutEditor)
   {
      let selectEL = null;
      let languageNodes = null;
      let selectedItem = null;
      
      if (isLayoutEditor)
      {
         languageNodes = Utilities_GetElementById('AddRemoveSelector_' + name)
            .querySelector('ul').querySelectorAll('div');
         selectedItem = Utilities_GetCheckedElementByName(name + '_Selected').value;
      }
      else
      {
         selectEL = Utilities_GetElementById(name);
         selectedItem = selectEL.options[selectEL.selectedIndex].value;
      }
      
      let visibleOptions = Utilities_GetElementByName(name + '_Visible');
      let visibleValues = visibleOptions.value.split(",");
      let id = name + '_Selected_' + selectedItem.replace(/[^a-z\d]/i, "");
      let option = Utilities_GetElementById(id);
      
      if (!option) return;
      
      let value = option.value;
      
      // if current tab is active, then we deactive it and then select the first one.
      if (option.checked == true)
      {
         option.checked = false;
         let siblingOptions = Utilities_GetElementsByName(option.name);
         let nextSelectedElement = null;
         let nextSelectedLanguageOption = null;
         
         for (let siblingOption of siblingOptions)
         {
            if (siblingOption != option)
            {
               nextSelectedLanguageOption = siblingOption;
               
               nextSelectedLanguageOption.checked = true;
               
               if (isLayoutEditor)
               {
                  for (let node of languageNodes)
                  {
                     if (node.innerHTML.trim() == nextSelectedLanguageOption.getAttribute('data-language'))
                     {
                        nextSelectedElement = node;
                     }
                  }
               }
               
               AddRemoveSelector.changeItem(name, classPrefix, nextSelectedLanguageOption.value, isLayoutEditor, nextSelectedElement);
               break;
            }
         }
         
         if (nextSelectedLanguageOption == null)
         {
            assert(0);  // we currently don't allow removing the final item
            _setCurrentLanguage(name, null);
         }
      }
      
      option.parentNode.removeChild(option);
      
      // update hidden visible options
      Utilities_RemoveFromArray(visibleValues, value);
      visibleOptions.value = visibleValues.join(',');
      
      if (isLayoutEditor)
      {
         // set the removed language with + in front of it.
         for (let node of languageNodes)
         {
            if (node.innerHTML.trim() == option.getAttribute('data-language'))
            {
               node.innerHTML = '+ ' + node.innerHTML;
            }
         }
         
         // if removed add the language then add placeholder text in the content editor.
         if (!visibleOptions.value)
         {
            assert(0);  // we currently don't allow removing the final item
            
            let builderInnerHTML =
               '<button type="button" class="row-add-initial">' +
               Str('Empty') + '<br><span>' + Str('+ Click to add content') + '</span>' +
               '</button>';
            
            element.innerHTML = builderInnerHTML;
         }
      }
      else
      {
         // set the removed language with + in front of it.
         for (let option of selectEL.options)
         {
            if (selectedItem == option.value)
            {
               option.text = '+ ' + option.text;
            }
         }
         
         if (!visibleOptions.value)
         {
            assert(0);  // we currently don't allow removing the final item
            
            let optionEl = document.createElement("option");
            optionEl.text = Str("Add");
            optionEl.value = 'empty';
            selectEL.insertBefore(optionEl, selectEL.childNodes[0]);
            selectEL.value = 'empty';
         }
      }
      
      _setRemoveBtnVisibility(name);
      
      // The LayoutEditor has code in JavaScript to add/remove versions as needed, but in the template
      // case the PHP code does it (perhaps we could change that?).
      if (isLayoutEditor)
         Layout_AdjustTranslatables(Utilities_GetElementById('EditArea'));
      else
         RefreshForm();
   }
   
   // exposing 
   return {
      addItem: _addItem,
      removeItem: _removeItem,
      changeItem: _changeItem,
      createOption: _createOptionInput,
      formValuesUpdated: _formValuesUpdated
   }
   
})();