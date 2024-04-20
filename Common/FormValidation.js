// ========================================================================
//        Copyright � 2008 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

function _getElemsValues(elems)
{
   let result = {};
   for (let key of Object.keys(elems))
   {
      result[key] = elems[key].value;
   }
   return result;
}

var previousAddressValues = {};

async function ValidateForm(form)
{
   // For our logic to work this array must be ordered like the vCard spec:
   //   the post office box;
   //   the extended address (e.g., apartment or suite number);
   //   the street address;
   //   the locality (e.g., city);
   //   the region (e.g., state or province);
   //   the postal code;
   //   the country name (full name)
   const AddressFields =
      [
         'Post_Office_Box',
         'Extended_Address',
         'Street_Address',
         'City',
         'Region',
         'Postal_Code',
         'Country'
      ];
   let errorMessage = '';
   
   // no validation when we are editing a page (that contains a form)
   if (Class_HasByElement(form, 'layout_editor'))
      return true;
   
   let addressElems = {};
   let hasMissing = false;
   let errorElems = [];
   let warningElems = [];
   let infoElems = [];
   let elems = Utilities_GetElementsByAttribute(['required', 'validated']);
   
   // collect the address fields...
   
   for (let elem of elems)
   {
      // ignore elements in templates as these don't get used
      if (Utilities_GetParentByClass(elem, 'MultiItemTemplate') != null)
      {
         continue;
      }
      
      if (elem.hasAttribute('validated'))
      {
         if (elem.tagName == "INPUT")
         {
            if (elem.type.toLowerCase() == 'email' || elem.name.toLowerCase().includes('email'))
            {
               // NOTE: I allow ending the prefix with "=" because this is used in our Facebook story post IDs but I don't
               // know if it is a valid email address?
               if (elem.value.length > 0 && (elem.value.length < 5 || !/\w+[\w+\.\-_=\+]*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(elem.value)))
               {
                  if (errorMessage != null)
                     errorMessage += ' ';
                  errorMessage += Str('Please provide a valid email address.');
                  errorElems.push(elem);
               }
            }
            else if (elem.type.toLowerCase() == 'tel' || elem.name.toLowerCase().includes('phone'))
            {
               if (elem.value.length > 0 && (elem.value.length < 5 || !/^\+?[0-9 \-\.\(\)\,extp]+$/.test(elem.value)))
               {
                  if (errorMessage != null)
                     errorMessage += ' ';
                  errorMessage += Str('Please provide a valid telephone number.');
                  errorElems.push(elem);
               }
            }
            else
            {
               let found = false;
               for (let key of AddressFields)
               {
                  if (elem.name.endsWith(key))
                  {
                     let prefix = elem.name.substring(0, elem.name.length - key.length);
                     if (!addressElems.hasOwnProperty(prefix))
                        addressElems[prefix] = {};
                     addressElems[prefix][key] = elem;
                     found = true;
                  }
               }
               if (!found)
               {
                  Log_WriteError('Unsupported validated element name: ' + elem.name);
               }
            }
         }
         else if (elem.tagName == "SELECT" && elem.selectedIndex != -1)
         {
            let found = false;
            for (let key of AddressFields)
            {
               if (elem.name.endsWith(key))
               {
                  let prefix = elem.name.substring(0, elem.name.length - key.length);
                  if (!addressElems.hasOwnProperty(prefix))
                     addressElems[prefix] = {};
                  addressElems[prefix][key] = elem;
                  found = true;
               }
            }
            if (!found)
            {
               Log_WriteError('Unsupported validated element name: ' + elem.name);
            }
         }
         else
         {
            Log_WriteError('Unsupported validated element tag: ' + elem.tagName);
         }
      }
   }
   
   // validate address fields...
   
   let addressErrorElems = [];   // we need to tell address errors apart from the above errors, we'll merge them below
   for (let prefix in addressElems)
   {
      // if the items haven't changed since the last submit then the user has accepted them
      if (previousAddressValues.hasOwnProperty(prefix) &&
         Utilities_ArrayEquals(previousAddressValues[prefix], _getElemsValues(addressElems[prefix])))
         continue;
      
      // we can validate with minimum of city and region, or city and country otherwise we can get weird results
      if (addressElems[prefix].hasOwnProperty('City') && addressElems[prefix]['City'].value &&
         ((addressElems[prefix].hasOwnProperty('Region') && addressElems[prefix]['Region'].value != '_NULL_') ||
            (addressElems[prefix].hasOwnProperty('Country') && addressElems[prefix]['Country'].value != '_NULL_')))
      {
         let address = '';
         for (let key of AddressFields)   // we need them in this order
            if (addressElems[prefix].hasOwnProperty(key) && addressElems[prefix][key].value != '_NULL_')
               address += ' ' + addressElems[prefix][key].value;
         address = address.trim();
         
         if (address.length > 0)
         {
            let values = await LocaleAddress.NormalizeAddress(address); // returned in the same order as AddressFields
            
            // the form may be missing one or both of Post_Office_Box and Extended_Address so we will place these
            // values elsewhere as needed so they don't get stripped out
            if (values[0] && !addressElems[prefix].hasOwnProperty('Post_Office_Box'))
               values[1] = (values[0] + ' ' + values[1]).trim();
            if (values[1] && !addressElems[prefix].hasOwnProperty('Extended_Address'))
               values[2] = (values[2] + ' ' + values[1]).trim();
            
            for (let i in values)
            {
               let key = AddressFields[i];
               
               // some fields may not appear on the form
               if (!addressElems[prefix].hasOwnProperty(key))
                  continue;
               
               let addressElem = addressElems[prefix][key];
               let elemValue = addressElem.value.trim();
               if (elemValue == '_NULL_')
                  elemValue = '';
               
               if (values[i] == '' && elemValue != '')
               {
                  // if the normalized address does not contain a value and the provided address did contain
                  // a value then we assume that value was invalid (error case)
               }
               // the normalized value differs from the provided value
               else if (values[i] != '' && values[i] != elemValue)
               {
                  if (addressElem.tagName == 'SELECT')
                  {
                     // NOTE: if it is not found we'll handle it as an error
                     for (let j in addressElem.options)
                     {
                        if (addressElem.options[j].value == values[i] || addressElem.options[j].text == values[i])
                        {
                           if (j == addressElem.selectedIndex)
                              addressElem = null;  // no change because it matches the text
                              // if this address has already been checked then we don't replace the value
                           // as the user has the option to change it and keep it if they decide it is valid
                           else if (!previousAddressValues.hasOwnProperty(prefix))
                           {
                              addressElem.options[j].selected = true;
                              if (elemValue)
                                 warningElems.push(addressElem);  // replacing the user value
                              else
                                 infoElems.push(addressElem);     // providing a missing value
                              addressElem = null;  // we've handled it
                           }
                           break;
                        }
                     }
                  }
                  else
                  {
                     // if this address has already been checked then we don't replace the value
                     // as the user has the option to change it and keep it if they decide it is valid
                     if (!previousAddressValues.hasOwnProperty(prefix))
                     {
                        addressElem.value = values[i];
                        if (elemValue)
                           warningElems.push(addressElem);  // replacing the user value
                        else
                           infoElems.push(addressElem);     // providing a missing value
                        addressElem = null;  // we've handled it
                     }
                  }
               }
               else
                  addressElem = null;  // no error
               
               if (addressElem)
                  addressErrorElems.push(addressElem); // the user provided value was kept
            }
         }
      }
   }
   if (addressErrorElems.length > 0)
   {
      if (errorMessage != null)
         errorMessage += ' ';
      errorMessage += Str('Please confirm the address value(s) you provided that appear to be incorrect.');
      errorElems = errorElems.concat(addressErrorElems);
   }
   if (warningElems.length > 0)
   {
      if (errorMessage != null)
         errorMessage += ' ';
      errorMessage += Str('Please confirm the updated address value(s).');
   }
   else if (infoElems.length > 0)
   {
      if (errorMessage != null)
         errorMessage += ' ';
      errorMessage += Str('Please confirm the new address value(s) provided.');
   }
   
   // check for missing required values...
   
   for (let elem of elems)
   {
      // ignore elements in templates as these don't get used
      if (Utilities_GetParentByClass(elem, 'MultiItemTemplate') != null)
      {
         continue;
      }
      
      if (elem.hasAttribute('required') &&
         // some elements need to be checked even when hidden as long as they are initialized because there
         // are UI pieces that replace the element while hidden
         ((Class_HasByElement(elem, 'MultiSelect') && Class_HasByElement(elem, 'initialized')) ||
            !Class_HasByElement(elem, 'hide_element')) &&
         !Utilities_GetParentByClass(elem, 'hide_element'))
      {
         let isProvided = false;
         
         if (elem.tagName == 'INPUT')
         {
            if (elem.type == 'checkbox' || elem.type == 'radio')
            {
               for (let elem2 of elems)
               {
                  if (elem2.name == elem.name && elem2.checked)
                  {
                     isProvided = true;
                     break;
                  }
               }
            }
            else
            {
               isProvided = elem.value.length > 0;
            }
         }
         else if (elem.tagName == 'TEXTAREA')
         {
            isProvided = elem.value.length > 0;
         }
         else if (elem.tagName == 'SELECT')
         {
            isProvided = elem.selectedIndex != -1;
//            for (var j = 0; j < elem.options.length; j++)
//            {
//               if (elem.options[j].selected)
//               {
//                  isError = false;
//                  break;
//               }
//            }
         }
         else
         {
            assert(0);
            isProvided = elem.value.length > 0;
         }
         
         if (!isProvided)
         {
            errorElems.push(elem);
            hasMissing = true;
         }
      }
   }
   
   if (hasMissing)
   {
      if (errorMessage != null)
         errorMessage += ' ';
      errorMessage += Str('Please provide the missing value(s).');
   }
   
   // indicate which fields have an error or a warning (and remove the indicator if it's been fixed)...
   
   // apply class to any labels as well as the actual element
   for (let elem of errorElems)
   {
      let labels = Utilities_GetLabelsForInputElement(elem);
      for (let label of labels)
         errorElems.push(label);
   }
   for (let elem of warningElems)
   {
      let labels = Utilities_GetLabelsForInputElement(elem);
      for (let label of labels)
         warningElems.push(label);
   }
   for (let elem of infoElems)
   {
      let labels = Utilities_GetLabelsForInputElement(elem);
      for (let label of labels)
         infoElems.push(label);
   }
   
   for (let elem of elems)
   {
      let hasInfo = Utilities_ArrayContains(infoElems, elem);
      let hasWarning = Utilities_ArrayContains(warningElems, elem);
      let hasError = Utilities_ArrayContains(errorElems, elem);
      
      Class_SetByElement(elem, 'validation_info', hasInfo && !hasWarning && !hasError);
      Class_SetByElement(elem, 'validation_warning', hasWarning && !hasError);
      Class_SetByElement(elem, 'validation_error', hasError);
      
      // some elements are replaced with another element (like FilterSelect) and the original is hidden
      let vis = elem.name ? Utilities_GetElementById(Utilities_StripBracketsFromElementName(elem.name) + '_ReplacementElement') : null;
      // similarly to the above but for CKEditor replaced items
      if (vis == null) vis = Utilities_GetElementById('cke_' + elem.id);
      
      if (vis)
      {
         Class_SetByElement(vis, 'validation_info', hasInfo && !hasWarning && !hasError);
         Class_SetByElement(vis, 'validation_warning', hasWarning && !hasError);
         Class_SetByElement(vis, 'validation_error', hasError);
      }
      
      Visibility_SetById(Utilities_StripBracketsFromElementName(elem.name) + '_validation_error', hasError);
   }
   
   // save to have available for the next submit
   previousAddressValues = {};
   for (let prefix in addressElems)
      previousAddressValues[prefix] = _getElemsValues(addressElems[prefix]);
   
   if (errorMessage != '')
   {
      DisplayValidationMessage(errorMessage);
      return false;
   }
   
   return true;
}
