var ViewState =
   {
      // these classes are used to identify items in the DOM and don't change
      ItemClass: 'ViewStateItem',
      MainItemClass: 'ViewStateIsMainItem',
      LazyLoadClass: 'ViewStateLazyLoad',
      PagingWrapperClass: 'paging-wrapper',
      // these are working classes added and removed as needed
//   ScrollPositionSavedClass: 'ViewStateScrollPositionSaved',   // used to prevent saving the state again DRL FIXIT? Needed?
   IsFilteringClass: 'ViewStateIsFiltering',
//   IsLoadedClass: 'ViewStateIsLoaded',
   // attributes
   ScrollableIDAttribute: 'viewstate_scrollable_id',
   UrlAttribute: 'viewstate_url',
   ParamsAttribute: 'viewstate_params',
   FilterAttribute: 'viewstate_filter',
   
   SetViewState: function(elemID, name, value)
   {
      let viewID = FormGetViewOrProcessor();
      let viewState = sessionStorage.getItem(viewID);
      if (viewState == null)
         viewState = {};
      else
         viewState = Json_FromString(viewState);
      if (viewState[elemID] == undefined)
         viewState[elemID] = {};
      viewState[elemID][name] = value;
      viewState = Json_ToString(viewState);
      sessionStorage.setItem(viewID, viewState);
   },
   
   GetViewState: function(elemID, name, defaultValue = null)
   {
      let viewID = FormGetViewOrProcessor();
      let viewState = sessionStorage.getItem(viewID);
      if (viewState == null)
         return defaultValue;
      viewState = Json_FromString(viewState);
      if (viewState[elemID] == undefined || viewState[elemID][name] == undefined)
         return defaultValue;
      return viewState[elemID][name];
   },
   
   RemoveViewState: function(elemID, name)
   {
      let viewID = FormGetViewOrProcessor();
      let viewState = sessionStorage.getItem(viewID);
      if (viewState == null)
         return;
      viewState = Json_FromString(viewState);
      if (viewState[elemID] == undefined || viewState[elemID][name] == undefined)
         return;
      delete viewState[elemID][name];
      viewState = Json_ToString(viewState);
      sessionStorage.setItem(viewID, viewState);
   },
   
   ClearViewState: function(elemID)
   {
      let viewID = FormGetViewOrProcessor();
      let viewState = sessionStorage.getItem(viewID);
      if (viewState == null)
         return;
      viewState = Json_FromString(viewState);
      if (viewState[elemID] == undefined)
         return;
      delete viewState[elemID];
      viewState = Json_ToString(viewState);
      sessionStorage.setItem(viewID, viewState);
   },
   
   SaveScrollPosition: function(elemID)
   {
      if (FormIsLeaving())
      {
         // DRL FIXIT? I suspect we don't need to save it for each state, we can reset the values
         // when switching between filtered and non-filtered views.
         
         // if we are leaving a form (saving or cancelling) then we don't want to save any scroll
         // position since the form should reload at the top the next time it is loaded
         ViewState.RemoveViewState(elemID, 'ScrollPosition');
         ViewState.RemoveViewState(elemID, 'ScrollPosition-filtered');
//         Class_AddById(elemID, ViewState.ScrollPositionSavedClass); // don't save it again
         
         // NOTE: We clear the page when leaving as well since it should be on the first page when we return.
         ViewState.RemoveViewState(elemID, 'Page');
         return;
      }
      
      let name = 'ScrollPosition';
      if (Class_HasById(elemID, ViewState.IsFilteringClass))
         name = name + '-filtered';
      
      let scrollable = ViewState._GetScrollable(elemID);
      /*
            let x = -scrollable.getBoundingClientRect().left;
            let y = -scrollable.getBoundingClientRect().top;
            let docElem = document.documentElement;
            let scrollLeft = (window.pageXOffset || docElem.scrollLeft || document.body.scrollLeft || window.scrollX || x) - (docElem.clientLeft || 0);
            let scrollTop = (window.pageYOffset || docElem.scrollTop || document.body.scrollTop || window.scrollY || y) - (docElem.clientTop || 0);
      */
      let scrollLeft = scrollable.scrollLeft;
      let scrollTop = scrollable.scrollTop;
      
      // DRL FIXIT? Sometimes this is negative, should we delete it in that case too? Is that a bug?
      if (scrollTop == 0 && scrollLeft == 0)
         ViewState.RemoveViewState(elemID, name);
      else
         ViewState.SetViewState(elemID, name, scrollLeft + ',' + scrollTop);
   },
   
   RestoreScrollPosition: function(elemID)
   {
      let name = 'ScrollPosition';
      if (Class_HasById(elemID, ViewState.IsFilteringClass))
         name = name + '-filtered';
      
      let scrollPosition = ViewState.GetViewState(elemID, name);
      if (scrollPosition == null || window.location.hash) // don't set scroll position if URL is targeting a tag
         return;
      
      let scrollable = ViewState._GetScrollable(elemID);
      // we always SET the scroll values on the nearest scrollable
      scrollable = Utilities_GetScrollableElement(scrollable);
      scrollable.scrollLeft = scrollPosition.split(',')[0];
      scrollable.scrollTop = scrollPosition.split(',')[1];
   },
   
   HasScrollPosition: function(elemID)
   {
      let name = 'ScrollPosition';
      if (Class_HasById(elemID, ViewState.IsFilteringClass))
         name = name + '-filtered';
      
      return ViewState.GetViewState(elemID, name) != null;
   },
   
   ClearScrollPosition: function(elemID)
   {
      ViewState.RemoveViewState(elemID, 'ScrollPosition');
      ViewState.RemoveViewState(elemID, 'ScrollPosition-filtered');
      ViewState.RemoveViewState(elemID, 'Page');
//      Class_AddById(elemID, ViewState.ScrollPositionSavedClass); // don't save it again
   },
   
   _GetScrollable: function(elemID)
   {
      let elem = Utilities_GetElementById(elemID);
      assert(elem != null);
      // DRL I had a hell of a time getting the scroll position on iOS. In the end this hack for getting
      // the position of the wrapper (now identified by attribute) was the only way I found to do it.
      if (elem.hasAttribute(ViewState.ScrollableIDAttribute))
         return Utilities_GetElementById(elem.getAttribute(ViewState.ScrollableIDAttribute));
      else
         return Utilities_GetScrollableElement(elem);
   },
   
   SaveSelections: function(elemID = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         for (let elem of elems)
            ViewState.SaveSelections(elem.id);
         return;
      }
      
      if (FormIsLeaving())
      {
         // if we are leaving a form (saving or cancelling) then we don't want to save any selections
         ViewState.RemoveViewState(elemID, 'SelectAllEnabled');
         ViewState.RemoveViewState(elemID, 'Selections');
         return;
      }
      
      if (ViewState.GetViewState(elemID, 'SelectAllEnabled', FALSE))
      {
         let pageRows = Selections.GetAllRows(elemID);
         let pageSelections = Selections.GetSelections(elemID);
         
         // if some of the rows on the current page are not selected then we no longer have all of them selected
         if (pageRows.length == pageSelections.length)
            return;  // all are selected, so we are already up to date
         
         // at this point we need to get the full list of the items from the server to calculate the selected list
         ViewState.LoadIDs(elemID, false, function(selections)
         {
            // remove our special flag
            ViewState.RemoveViewState(elemID, 'SelectAllEnabled');
            
            let prefix = GetPrefix(pageRows[0]);
            
            // we need the prefixes removed and the IDs converted to integers for the code below to work
            StripPrefixes(pageRows);
            StripPrefixes(pageSelections);
            
            // remove all the IDs that are on this page (leaving the IDs from other pages intact)
            Utilities_RemoveFromArray(selections, pageRows);
            // add the selected IDs that are on this page
            Utilities_AddToArray(selections, pageSelections);
            
            AddPrefixes(selections, prefix);
            
            selections = Json_ToString(selections);
            ViewState.SetViewState(elemID, 'Selections', selections);
         });
         
         return;
      }
      
      let selections = ViewState.GetSelections(elemID);
      if (selections.length == 0)
         ViewState.RemoveViewState(elemID, 'Selections'); // no need to save the default
      else
      {
         selections = Json_ToString(selections);
         ViewState.SetViewState(elemID, 'Selections', selections);
      }
   },
   
   RestoreSelections: function(elemID = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         for (let elem of elems)
            ViewState.RestoreSelections(elem.id);
         return;
      }
      
      let selections = null;
      if (ViewState.GetViewState(elemID, 'SelectAllEnabled', FALSE))
      {
         selections = Selections.GetAllRows(elemID);
      }
      else
      {
         selections = ViewState.GetViewState(elemID, 'Selections', '[]');
         selections = Json_FromString(selections);
      }
      
      Selections.SetSelectedRows(elemID, selections);
   },
   
   GetMainSelections: function()
   {
      let elem = ViewState.GetMainView();
      if (elem == null)
         return [];
      
      return ViewState.GetSelections(elem.id);
   },
   
   GetSelections: function(elemID)
   {
      if (ViewState.GetViewState(elemID, 'SelectAllEnabled', FALSE))
         return ['_ALL_'];
      
      let selections = ViewState.GetViewState(elemID, 'Selections', '[]');
      selections = Json_FromString(selections);
      
      // remove all the IDs that are on this page (leaving the IDs from other pages intact)
      Utilities_RemoveFromArray(selections, Selections.GetAllRows(elemID));
      // add the selected IDs that are on this page
      Utilities_MergeIntoArray(selections, Selections.GetSelections(elemID));
      
      return selections;
   },
   
   SaveFilter: function(elemID = null, filter = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         for (let elem of elems)
            ViewState.SaveFilter(elem.id);
         return;
      }
      
      if (!ViewState.IsMainView(elemID))
         return;
      
      if (FormIsLeaving())
      {
         // if we are leaving a form (saving or cancelling) then we don't want to save any selections
         ViewState.RemoveViewState(elemID, 'Filter');
         return;
      }
      
      if (filter === null)
      {
         filter = Filtering.GetFilter();
         
         if (filter.hasOwnProperty('SearchFilterID') && filter['SearchFilterID'] == -1)
         {
            // the user has selected to edit filters, so we keep the old selected filter ID
            let temp = ViewState.GetViewState(elemID, 'Filter');
            if (temp != null)
               temp = Json_FromString(temp);
            if (temp != null && temp.hasOwnProperty('SearchFilterID'))
               filter['SearchFilterID'] = temp['SearchFilterID'];
         }
      }
      
      let hasFilter =
         (filter.hasOwnProperty('SearchFilterID') && filter['SearchFilterID']) ||
         (filter.hasOwnProperty('SearchTagIDs') && filter['SearchTagIDs']) ||
         (filter.hasOwnProperty('SearchText') && filter['SearchText']);
      
      if (hasFilter)
      {
         filter = Json_ToString(filter);
         ViewState.SetViewState(elemID, 'Filter', filter);
      }
      else
         ViewState.RemoveViewState(elemID, 'Filter'); // no need to save the default
   },
   
   RestoreFilter: function(elemID = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         for (let elem of elems)
            ViewState.RestoreFilter(elem.id);
         return;
      }
      
      let filter = ViewState.GetViewState(elemID, 'Filter');
      if (filter != null)
         filter = Json_FromString(filter);
      else
         filter = {};
      
      Filtering.SetFilter(filter);
   },
/*
   GetFilter: function(elemID = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         assert(elems.length == 1);
         for (let elem of elems)
            return ViewState.GetFilter(elem.id);
         return {};
      }
      
      if (!ViewState.IsMainView(elemID))
         return {};
      
      return Filtering.GetFilter();
   },
*/
   GetViewedPage: function(elemID)
   {
      let elems = Utilities_GetElementsByClass(ViewState.PagingWrapperClass, null,
         Utilities_GetElementById(elemID));
      if (elems.length)
      {
         let pagingInput = elems[0].firstElementChild;
         assert(pagingInput.nodeName == 'INPUT');
         return pagingInput.value;
      }
      
      return null;
   },
   
   GetFilter: function(elemID)
   {
      let viewElem = Utilities_GetElementById(elemID);
      let params = viewElem.hasAttribute(ViewState.ParamsAttribute) ? viewElem.getAttribute(ViewState.ParamsAttribute) : '{}';
   
      params = Json_FromString(params);
      let filter = params.hasOwnProperty('Filter') ? params['Filter'] : {};
   
      if (ViewState.IsMainView(elemID))
      {
         filter = Object.assign(filter, Filtering.GetFilter());
      }
      else if (elemID == 'UniConvoMessages')
      {
         // for the UniConvos page the second column lists the messages for the selected conversation
         let table = Utilities_GetElementById('content_table');
         let ids = SelectTable.GetSelectedIds(table);
         if (ids.length == 0)
            return;  // no conversation selected
         filter['UniConvoID'] = StripPrefix(ids[0]);
      }
      else if (elemID == 'WatchedPostMessages')
      {
         // for the WatchedPost page the second column lists the messages for the selected post
         let table = Utilities_GetElementById('content_table');
         let ids = SelectTable.GetSelectedIds(table);
         if (ids.length == 0)
            return;  // no conversation selected
         filter['ParentMessageID'] = StripPrefix(ids[0]);
      }
      
      return filter;
   },
   
   // if getData is false only the matching IDs will be retrieved
   _GetUrlAndParams: function(elemID, getData)
   {
      let viewElem = Utilities_GetElementById(elemID);

      let url = viewElem.getAttribute(ViewState.UrlAttribute);
      url = Form_RootUri + url;
   
      let params = viewElem.hasAttribute(ViewState.ParamsAttribute) ? viewElem.getAttribute(ViewState.ParamsAttribute) : '{}';
      params = Json_FromString(params);

      let filter = ViewState.GetFilter(elemID);
      params['Filter'] = Json_ToString(filter);
      
      let sect = Utilities_GetElementById('Filtering_DisplaySection');
      if (sect)
      {
         // convert "Home_MyBusiness_Contacts_USR_500" to "Home,MyBusiness,Contacts"
         let view = Utilities_ReplaceInString(sect.value.substring(0, sect.value.indexOf('_USR_')), '_', ',');
         params['View'] = view;
      }
      
      let page = null;
//      if (Class_HasById(elemID, ViewState.IsLoadedClass))
//      {
////         ViewState.SaveScrollPosition(elemID);
//         ViewState.SaveSelections(elemID);
//
//         page = ViewState.GetViewedPage(elemID);
//      }
//      else
      {
         page = ViewState.GetViewState(elemID, 'Page');
      }
      if (page !== null)
         params['ResultsPage'] = page;
//      delete params['DisplaySection']; // we never pass this for our API loads as the other params cover our needs
      
      if (!getData)
         url = Utilities_ReplaceInString(url, '/View', '/IDs')
      
      return [url, params];
   },
   
   LoadIDs: function(elemID, currentPageOnly, callback)
   {
      const [url, params] = ViewState._GetUrlAndParams(elemID, false);
      
      if (!currentPageOnly)
         delete (params['ResultsPage']);
      
      ajax.get(url, params, function(data, httpCode, headers)
      {
         if (httpCode != 200)
         {
            // server unavailable, network error, etc.
            Log_WriteError('Server is not available to get "' + url + '": ' + httpCode);
            return null;
         }
         
         callback(Json_FromString(data).data);
      }, true, 60 * 1000);
   },
   
   LoadView: function(elemID)
   {
      const [url, params] = ViewState._GetUrlAndParams(elemID, true);
      
      let viewElem = Utilities_GetElementById(elemID);
      
      // skip over everything that's an INPUT
      let elem = viewElem.firstElementChild;
      while (elem && elem.nodeName == 'INPUT')
         elem = elem.nextElementSibling;
   
      // add a "Loading..." message
      let msg = document.createElement('div');
      Class_AddByElement(msg, 'info_message');
      Class_AddByElement(msg, 'iframe_loading_message');
      msg.innerHTML = Str('Loading...');

      if (elem && elem.nodeName == 'IFRAME')
      {
         // this is used by graphs that return a PNG so it's placed in an iframe
         let query = ConvertParamsForSending(params);
         // the user experience is better if there's a visible change when the user clicks so I added this
         elem.src = 'about:blank';
         setTimeout(function()
         {
            try
            {
               // I add the time here to force refreshing the image even though the URL hasn't changed
               elem.src = url + '?' + query.join('&') + '&etag=' + new Date().getTime();
            }
            catch (e)
            {
               Log_WriteException(e);
            }
         }, 100);
         return;
      }

      // everything else will be replaced, so remove it
      while (elem)
      {
         let temp = elem;
         elem = elem.nextElementSibling;
         temp.parentElement.removeChild(temp);
      }
      
      viewElem.insertBefore(msg, viewElem.firstElementChild);
      
      ajax.get(url, params, function(data, httpCode, headers)
      {
         // remove the "Loading..." message
         if (viewElem.contains(msg))
            viewElem.removeChild(msg);
         else
            Log_WriteError('"Loading" message element not found!');  // DRL FIXIT? This happens sometimes.
         
         if (httpCode != 200)
         {
            // server unavailable, network error, etc.
            Log_WriteError('Server is not available to get "' + url + '": ' + httpCode);
            DisplayMessage(Str('There was a problem contacting the server.'), 'error');
            return;
         }
         
         data = Utilities_CreateHtmlNode(data);

         // insert the new items which could contain any of the paging, table and script
         let children = [...data.children];  // make a copy otherwise we'll end up with an empty array below
         viewElem.appendChild(data);

         // the elements created above need to be initialized
         DocumentLoad.InitChunk(children);

         ViewState.RestoreSelections(elemID);
         
         OnViewLoaded(elemID);
         
         let scrollInterval = setInterval(function()
         {
            if (document.readyState === 'complete')   // has page finished loading?
            {
               ViewState.RestoreScrollPosition(elemID);
               clearInterval(scrollInterval);

               let viewID = FormGetViewOrProcessor();
               
               // on the contacts page if there are still contacts selected add a warning to avoid a user
               // taking actions not knowing there are saved selections
               if (ViewState.IsMainView(elemID) &&
                  viewID && viewID.endsWith('Contacts') &&
                  Selections.GetSelections(elemID).length > 0)
                  DisplayMessage(Str('Note that you still have some selected contacts.'), 'info', 'center');
            }
         }, 500);
      }, true, 120 * 1000);
   },
   
   IsMainView: function(elemID)
   {
      return Class_HasById(elemID, ViewState.MainItemClass);
   },
   
   GetMainView: function()
   {
      let items = Utilities_GetElementsByClass(ViewState.MainItemClass);
      if (items.length != 1)
      {
         assert(items.length == 0);
         return null;
      }
      return items[0];
   },
   
   ChangeToPage: function(elemID, page)
   {
      let elem = Utilities_GetElementById(elemID);
      
      ViewState.SaveSelections(elemID);      // save the selections on this page
      ViewState.ClearScrollPosition(elemID); // the new page won't be using the old page's scrolling info
      
      ViewState.SetViewState(elemID, 'Page', page);
      
      ViewState.LoadView(elemID);
   },
   
   OnChangePage: function(event, page)
   {
      let elem = Utilities_GetParentByClass(event.target, ViewState.ItemClass);
      ViewState.ChangeToPage(elem.id, page);
   },
   
   _SavePageState: function()
   {
      let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
      for (let elem of elems)
      {
         assert(elem.id != undefined);
         ViewState.SaveScrollPosition(elem.id);
         ViewState.SaveSelections(elem.id);
         ViewState.SaveFilter(elem.id);
      }
   },
   
   SelectAllRows: function(elemID = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         for (let elem of elems)
            ViewState.SelectAllRows(elem.id);
         return;
      }
      
      Selections.SelectAllRows(elemID);
      
      ViewState.SetViewState(elemID, 'SelectAllEnabled', TRUE);
      ViewState.RemoveViewState(elemID, 'Selections');
      
      // make sure menu items are correctly enabled/disabled on load
      UpdateSelectionText();
   },
   
   DeselectAllRows: function(elemID = null)
   {
      if (elemID == null)
      {
         let elems = Utilities_GetElementsByClass(ViewState.ItemClass);
         for (let elem of elems)
            ViewState.DeselectAllRows(elem.id);
         return;
      }
      
      Selections.DeselectAllRows(elemID);
      
      ViewState.RemoveViewState(elemID, 'SelectAllEnabled');
      ViewState.RemoveViewState(elemID, 'Selections');
      
      // make sure menu items are correctly enabled/disabled on load
      UpdateSelectionText();
   },
   
   AllRowsSelected: function(elemID)
   {
      return ViewState.GetViewState(elemID, 'SelectAllEnabled', FALSE);
   },
};

DocumentLoad.AddCallback(function(rootNodes)
{
   for (let rootNode of rootNodes)
   {
      let elems = Utilities_GetElementsByClass(ViewState.ItemClass, null, rootNode);
      for (let elem of elems)
      {
         assert(elem.id != undefined);
         if (Class_HasByElement(elem, ViewState.LazyLoadClass))
         {
            if (ViewState.IsMainView(elem.id))
               ViewState.RestoreFilter(elem.id);
            ViewState.LoadView(elem.id);
         }
         else
         {
            setTimeout(function()
            {
               try
               {
                  ViewState.RestoreSelections(elem.id);
                  ViewState.RestoreScrollPosition(elem.id);
               }
               catch (e)
               {
                  Log_WriteException(e);
               }
            }, 500); // wait for page elements to adjust their sizing DRL FIXIT! This is a hack and doesn't always work.
         }
      }
   }
});

Form.AddBeforeUnloadCallback(ViewState._SavePageState);

PopUp.AddCallback(ViewState._SavePageState);