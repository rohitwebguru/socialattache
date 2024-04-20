var Filtering =
   {
      IsFilteringEmpty: function(filtering)
      {
         return filtering == null ||
            (filtering['SearchText'] == '' && filtering['SearchFilterID'] == null &&
               (!filtering.hasOwnProperty('SearchTagIDs') || filtering['SearchTagIDs'].length == 0) &&   // this was added later, so legacy support
               Utilities_HashEquals(filtering['SearchClasses'], {}));
      },
      
      GetFilter: function()
      {
         //   let sect = Utilities_GetElementById('Filtering_DisplaySection');
         
         //   // some pages have been converted to use this more efficient means of filtering results:
         //   assert(sect && !HasFormChanged() && DisplaySectionAlwaysUsesServerFiltering(sect.value));
         
         let filter = {};
         if (Utilities_GetElementById('SearchFilterID'))
         {
            //      // convert "Home_MyBusiness_Contacts_USR_500" to "Home,MyBusiness,Contacts"
            //      let view = Utilities_ReplaceInString(sect.value.substr(0, sect.value.indexOf('_USR_')), '_', ',');
            let searchFilter = Utilities_GetElementById('SearchFilterID');
            let searchFilterIDs = [];
            for (let option of searchFilter.options)
            {
               if (option.value != '_NULL_' && option.selected)
                  searchFilterIDs.push(option.value);
            }

            let searchTagIDs = [];
            let tagsElem = Utilities_GetElementById('SearchTagIDs');
            let textElem = Utilities_GetElementById('search_text');
            
            if (tagsElem)
            {
               for (let option of tagsElem.options)
               {
                  if (option.selected)
                     searchTagIDs.push(option.value);
               }
            }
            
            filter = {
               //         'View': view,
               //         'DisplaySection': sect.value,
               'SearchFilterID': searchFilterIDs.join(','), // single item for filter but can be multiple for reports
               'SearchTagIDs': searchTagIDs,
               'SearchText': textElem ? textElem.value : ''
            };
         }
         else
         {
            // this is the case of a dashboard for example where there are no filtering controls
         }
         
         return filter;
      },
      
      SetFilter: function(filter)
      {
         let filterElem = Utilities_GetElementById('SearchFilterID');
         if (filter.hasOwnProperty('SearchFilterID') && filter['SearchFilterID'])
         {
            filterElem.value = filter['SearchFilterID'];
         }
         else if (filterElem)
         {
            for (let option of filterElem.options)
            {
               option.selected = false;
            }
         }
         
         let tagsElem = Utilities_GetElementById('SearchTagIDs');
         if (tagsElem)
         {
            for (let option of tagsElem.options)
            {
               option.selected = false;
            }
            
            if (filter.hasOwnProperty('SearchTagIDs'))
            {
               let searchTagIDs = Array.isArray(filter['SearchTagIDs'])
                  ? filter['SearchTagIDs']
                  : filter['SearchTagIDs'].split(',');   // DRL FIXIT? We should be removing this eventually.
               for (let option of tagsElem.options)
               {
                  option.selected = searchTagIDs.indexOf(option.value) >= 0;
               }
            }
         }
         
         let searchElem = Utilities_GetElementById('search_text');
         if (filter.hasOwnProperty('SearchText') && filter['SearchText'])
         {
            searchElem.value = filter['SearchText'];
         }
         else if (searchElem)
            searchElem.value = '';
         
         assert(!filter.hasOwnProperty('SearchClasses'));
      },
      
      ClearFiltering: function()
      {
         let text = document.getElementById("search_text");
         if (text) text.value = "";
         
         let elems = Utilities_GetElementsByClass('search_selector');
         for (let elem of elems)
         {
            if (elem.tagName == 'INPUT' && elem.type == 'checkbox')
            {
               checkbox.checked = false;
            }
            else if (elem.tagName == 'SELECT')
            {
               if (Class_HasByElement(elem, 'MultiSelect'))
               {
                  MultiSelect.ClearSelections(elem);
               }
               else
               {
                  for (let j = 0; j < elem.options.length; j++)
                  {
                     elem.options[j].selected = false;
                  }
               }
            }
         }
      }
   };
