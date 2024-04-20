// ========================================================================
//        Copyright � 2012 Dominique Lacerte, All Rights Reserved.
// 
// Redistribution and use in source and binary forms are prohibited without 
//   prior written consent from Dominique Lacerte (internet@lacerte.org).
// ========================================================================

// Allows WYSIWYG editing of TEXTAREA controls, just by adding class='HtmlTextArea'.
// Optional class (choose only one):
//    HtmlTextArea - content is HTML in multiple lines
//    PlainTextArea - content is text in multiple lines
//    HtmlTextAreaSingleRow - content is HTML in one line only
//    PlainTextAreaSingleRow - content is text in one line only
//
// Optional data:
//    data-templatetype - the template type being edited, used by PlaceholderEditForm.php and SuggestionsEditForm.php

// Depends on ckeditor in ThirdParty folder - MUST BE INCLUDED (see Constants.php) except in Chrome extension

if (Browser.IsExtensionContent())
{
   var CKEDITOR = {   // there is no CKEDITOR in browser extension
      ENTER_BR: null,
      SHIFT: null,
      dtd: null,
      instances: {},
      replaceClass: null,
      disableAutoInline: true
   };
}
else
{
   CKEDITOR.replaceClass = null; // Disable replacing by class
   CKEDITOR.disableAutoInline = true;
}

HtmlTextArea =
   {
      configPlain:
      {
         versionCheck: false,       // fix for security error pop-up
         language: null,
         baseFloatZIndex: 100001,   // fix for {{X}} button not showing drop down menu
         disableNativeSpellChecker: false,
         extraPlugins: 'placeholder,placeholder_select,forum,quiz,scheduler,webinar,picture,video,resource,funnel,giveaway' +
            ',autogrow,ckawesome,colorbutton,emoji',
         removePlugins: 'elementspath,image',
         resize_enabled: false,
         enterMode: CKEDITOR.ENTER_BR,
         autoParagraph: false,
         contentsCss: './CSS/CKEditorContents.css',
         
         autoGrow_onStartup: true,
         autoGrow_minHeight: 120,
//      autoGrow_maxHeight: 500, iOS doesn't scroll properly while typing if there are CKEditor scrollbars
         
         toolbar: [
            {
               name: 'special', items: ['placeholder_select', 'forum', 'quiz', 'scheduler', 'webinar', 'picture',
                  'video', 'resource', 'funnel', 'giveaway', 'EmojiPanel', 'SpecialChar', 'Cut', 'Copy', 'PasteText', 'BulletedList', '-',
                  'Undo', 'Redo', '-', 'ai_suggestion']
            },
//         { name: 'edit_max', items: [ 'Maximize' ] },  leads to hang so removed for now
         ],
         allowedContent:
            {
               $1:
                  {
                     // Use the ability to specify elements as an object.
                     elements: CKEDITOR.dtd,
                     attributes: true,
                     styles: true,
                     classes: true
                  }
            },
         placeholder_select: {
            placeholders: {},
            format: '{{%placeholder%}}'
         },
         forum: {
            forums: {},
            format: '{{%forum%}}'
         },
         quiz: {
            quizzes: {},
            format: '{{%quiz%}}'
         },
         scheduler: {
            schedulers: {},
            format: '{{%scheduler%}}'
         },
         webinar: {
            webinars: {},
            format: '{{%webinar%}}'
         },
         picture: {
            pictures: {},
            format: '{{%picture%}}'
         },
         video: {
            videos: {},
            format: '{{%video%}}'
         },
         resource: {
            resources: {},
            format: '{{%resource%}}'
         },
         funnel: {
            funnels: {},
            format: '{{%funnel%}}'
         },
         giveaway: {
            giveaways: {},
            format: '{{%giveaway%}}'
         },
         placeholder: {
            placeholders: {}
         }
         /*      disallowedContent: 'script; *[on*]'   we need onclick for CC processing */
      },
      
      configHtml:
      {
         versionCheck: false,       // fix for security error pop-up
         language: null,
         baseFloatZIndex: 100001,   // fix for {{X}} button not showing drop down menu
         disableNativeSpellChecker: false,
         extraPlugins: 'font,imageeditor,widget,lineutils,placeholder,placeholder_select,forum,quiz,scheduler,webinar,picture,video,resource,' +
            'funnel,giveaway,autogrow,ckawesome,colorbutton,emoji',
         removePlugins: 'image',
         filebrowserBrowseUrl: '/PHP/UserInterface/ImageBrowser.php',
         filebrowserImageWindowWidth: '850',
         filebrowserImageWindowHeight: '480',
         toolbar: [
            {
               name: 'edit_undo',
               items: ['Source', '-', 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo', '-'/*, '-', 'Maximize' leads to hang so removed for now */,
                  'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', 'RemoveFormat', 'NumberedList', 'BulletedList', 'Link', 'Unlink']
            },
            '/',
            {
               name: 'style_font',
               items: ['Styles', 'Format', 'FontSize', 'TextColor'/*, 'ckawesome'*/, 'SpecialChar', 'EmojiPanel', 'Outdent', 'Indent', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock']
            },
            '/',
            {
               name: 'special',
               items: ['placeholder_select', 'forum', 'quiz', 'scheduler', 'webinar', 'picture', 'video', 'resource', 'funnel', 'giveaway', 'Image', 'Table', 'HorizontalRule', 'ai_suggestion']
            },
         ],
         
         resize_enabled: false,
         contentsCss: './CSS/CKEditorContents.css',
         
         autoGrow_onStartup: true,
         autoGrow_minHeight: 200,
//      autoGrow_maxHeight: 500, iOS doesn't scroll properly while typing if there are CKEditor scrollbars
         
         allowedContent:
            {
               $1:
                  {
                     // Use the ability to specify elements as an object.
                     elements: CKEDITOR.dtd,
                     attributes: true,
                     styles: true,
                     classes: true
                  }
            },
         placeholder_select: {
            placeholders: {},
            format: '{{%placeholder%}}'
         },
         forum: {
            forums: {},
            format: '{{%forum%}}'
         },
         quiz: {
            quizzes: {},
            format: '{{%quiz%}}'
         },
         scheduler: {
            schedulers: {},
            format: '{{%scheduler%}}'
         },
         webinar: {
            webinars: {},
            format: '{{%webinar%}}'
         },
         picture: {
            pictures: {},
            format: '{{%picture%}}'
         },
         video: {
            videos: {},
            format: '{{%video%}}'
         },
         resource: {
            resources: {},
            format: '{{%resource%}}'
         },
         funnel: {
            funnels: {},
            format: '{{%funnel%}}'
         },
         giveaway: {
            giveaways: {},
            format: '{{%giveaway%}}'
         },
         placeholder: {
            placeholders: {}
         }
         /*      disallowedContent: 'script; *[on*]'   we need onclick for CC processing */
      },
      
      configPlainSingleRow:
      {
         versionCheck: false,       // fix for security error pop-up
         language: null,
         baseFloatZIndex: 100001,   // fix for {{X}} button not showing drop down menu
         disableNativeSpellChecker: false,
         extraPlugins: 'placeholder,placeholder_select,doNothing,autogrow,ckawesome,colorbutton,emoji',
         removePlugins: 'elementspath',
         resize_enabled: false,
         enterMode: CKEDITOR.ENTER_BR,
         autoParagraph: false,
         ignoreEmptyParagraph: true,
         contentsCss: './CSS/CKEditorContents.css',
         autoGrow_onStartup: true,
         autoGrow_minHeight: 30,
         
         toolbar: [
            {
               name: 'special',
               items: ['placeholder_select', 'SpecialChar', 'EmojiPanel', 'Cut', 'Copy', 'PasteText', '-',
                  'Undo', 'Redo']
            }
         ],
         keystrokes: [
            [13, 'doNothing'],
            [CKEDITOR.SHIFT + 13, 'doNothing']
         ],
         allowedContent:
            {
               $1:
                  {
                     // Use the ability to specify elements as an object.
                     elements: CKEDITOR.dtd,
                     attributes: true,
                     styles: true,
                     classes: true
                  }
            },
         placeholder_select: {
            placeholders: {},
            format: '{{%placeholder%}}'
         },
         placeholder: {
            placeholders: {}
         }
         /*      disallowedContent: 'script; *[on*]'   we need onclick for CC processing */
      },
      
      configHtmlSingleRow:
      {
         versionCheck: false,       // fix for security error pop-up
         language: null,
         baseFloatZIndex: 100001,   // fix for {{X}} button not showing drop down menu
         disableNativeSpellChecker: false,
         extraPlugins: 'font,widget,lineutils,placeholder,placeholder_select,doNothing,autogrow,ckawesome,colorbutton,emoji',
         toolbar: [
            {
               name: 'edit_undo',
               items: ['Source', '-', 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo', '-',
                  'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', 'RemoveFormat', 'Link', 'Unlink']
            },
            '/',
            {
               name: 'style_font',
               items: ['Styles', 'Format', 'FontSize', 'TextColor'/*, 'ckawesome'*/, 'SpecialChar', 'EmojiPanel', '-', 'placeholder_select', 'Image']
            },
         ],
         autoParagraph: false,
         ignoreEmptyParagraph: true,
         resize_enabled: false,
         contentsCss: './CSS/CKEditorContents.css',
         
         autoGrow_onStartup: true,
         autoGrow_minHeight: 30,
         
         keystrokes: [
            [13, 'doNothing'],
            [CKEDITOR.SHIFT + 13, 'doNothing']
         ],
         allowedContent:
            {
               $1:
                  {
                     // Use the ability to specify elements as an object.
                     elements: CKEDITOR.dtd,
                     attributes: true,
                     styles: true,
                     classes: true
                  }
            },
         placeholder_select: {
            placeholders: {},
            format: '{{%placeholder%}}'
         },
         placeholder: {
            placeholders: {}
         }
         /*      disallowedContent: 'script; *[on*]'   we need onclick for CC processing */
      },
      disabledFeatures: [],
      
      Init: function(rootNodes)
      {
         forEach(rootNodes, function(root)
         {
            let elems = Utilities_GetThisOrChildrenBySelector(root, '.PlainTextArea,.HtmlTextArea,.PlainTextAreaSingleRow,.HtmlTextAreaSingleRow');
            for (let elem of elems)
            {
               HtmlTextArea.MakeHtmlTextArea(elem);
            }
         });
      },
      
      SetLanguage: function(language)
      {
         HtmlTextArea.configPlain.language = language;
         HtmlTextArea.configHtml.language = language;
         HtmlTextArea.configPlainSingleRow.language = language;
         HtmlTextArea.configHtmlSingleRow.language = language;
      },
      
      DisableFeatures: function(features)
      {
         HtmlTextArea.disabledFeatures = features;
         
         for (let feature of features)
         {
            HtmlTextArea.configPlain.extraPlugins = Utilities_ReplaceInString(HtmlTextArea.configPlain.extraPlugins, feature, '');
            HtmlTextArea.configHtml.extraPlugins = Utilities_ReplaceInString(HtmlTextArea.configHtml.extraPlugins, feature, '');
            HtmlTextArea.configPlainSingleRow.extraPlugins = Utilities_ReplaceInString(HtmlTextArea.configPlainSingleRow.extraPlugins, feature, '');
            HtmlTextArea.configHtmlSingleRow.extraPlugins = Utilities_ReplaceInString(HtmlTextArea.configHtmlSingleRow.extraPlugins, feature, '');
         }
      },
      
      // this is used by the Layout editor as a workaround since it loads later than the above call
      GetDisabledFeatures: function()
      {
         HtmlTextArea.disabledFeatures;
      },
      
      SetKnownFields: function(fields)
      {
         HtmlTextArea.configPlain.placeholder_select.placeholders = fields;
         HtmlTextArea.configHtml.placeholder_select.placeholders = fields;
         HtmlTextArea.configPlainSingleRow.placeholder_select.placeholders = fields;
         HtmlTextArea.configHtmlSingleRow.placeholder_select.placeholders = fields;
         
         HtmlTextArea.configPlain.placeholder.placeholders = fields;
         HtmlTextArea.configHtml.placeholder.placeholders = fields;
         HtmlTextArea.configPlainSingleRow.placeholder.placeholders = fields;
         HtmlTextArea.configHtmlSingleRow.placeholder.placeholders = fields;
      },
      
      // this is used by the Layout editor as a workaround since it loads later than the above call
      GetKnownFields: function()
      {
         return HtmlTextArea.configPlain.placeholder_select.placeholders;
      },
      
      Show: function(elem)
      {
         if (Browser.IsExtensionContent())
         {
            elem.style.display = '';
            return true;
         }
         
         let editor = CKEDITOR.instances[Utilities_ElementId(elem)];
         if (typeof editor == 'undefined')
         {
            elem.style.display = '';
            
            HtmlTextArea.MakeHtmlTextArea(elem);
            
            return true;
         }
         
         return false;
      },
      
      Hide: function(elem)
      {
         let result = false;
         let editor = Browser.IsExtensionContent() ? undefined : CKEDITOR.instances[Utilities_ElementId(elem)];
         if (typeof editor != 'undefined')
         {
            HtmlTextArea._UpdateValueFromEditor(editor, elem);
            
            let saved = elem.value; // the call below will save the value which will undo the logic above
            editor.destroy();
            
            if (Class_HasByElement(elem, 'PlainTextArea') || Class_HasByElement(elem, 'PlainTextAreaSingleRow'))
            {
               var isMultiRow = Class_HasByElement(elem, 'PlainTextArea');
               elem.value = HtmlTextArea.Unwrap(saved, isMultiRow);
            }
            else
               elem.value = saved;
            
            result = true;
         }
         
         if (elem.style.display != 'none')
         {
            elem.style.display = 'none';
            result = true;
         }
         
         return result;
      },
      
      IsVisible: function(elem)
      {
         if (Browser.IsExtensionContent())
         {
            return elem.style.display != 'none';
         }
         
         return typeof CKEDITOR.instances[Utilities_ElementId(elem)] != 'undefined' ||
            elem.style.display != 'none';  // hasn't been initialized yet but it is visible
      },
      
      IsHtmlTextArea: function(elem)
      {
         return Class_HasByElement(elem, 'HtmlTextArea') ||
            Class_HasByElement(elem, 'PlainTextArea') ||
            Class_HasByElement(elem, 'HtmlTextAreaSingleRow') ||
            Class_HasByElement(elem, 'PlainTextAreaSingleRow');
      },
      
      // some third party software like the Tango extension muck with the DOM and put elements into our editor
      // so we have to exclude these when saving the content
      _UpdateValueFromEditor(editor, elem)
      {
         // get the bad elements from the editors iframe and save them
         let saved = [];
         let iframe = editor.element.$.querySelector('iframe');
         if (iframe) // the editor may not yet be initialized?
         {
            let badElems = iframe.contentWindow.document.querySelectorAll('[id=tango-element-highlighter]');
            for (let badElem of badElems)
            {
               saved.push([badElem, badElem.parentElement, badElem.nextElementSibling]);
               badElem.parentElement.removeChild(badElem);
            }
         }
         
         editor.updateElement();
         
         // restore the bad elements where they were originally
         for (let temp of saved)
         {
            temp[1].insertBefore(temp[0], temp[2]);
         }
      },
      
      MakeHtmlTextArea: function(elem)
      {
         if (Browser.IsExtensionContent())
         {
            return;
         }
         
         // don't initialize items already intialized or hidden items (they'll be initialized when shown)
         if (typeof CKEDITOR.instances[Utilities_ElementId(elem)] != 'undefined' || elem.style.display != '' ||
            // do not initialize if it's in a template
            Utilities_HasClassAsParent(elem, 'MultiItemTemplate'))
            return;
         
         let isMultiRow = Class_HasByElement(elem, 'HtmlTextArea') || Class_HasByElement(elem, 'PlainTextArea');
         let isHtml = Class_HasByElement(elem, 'HtmlTextArea') || Class_HasByElement(elem, 'HtmlTextAreaSingleRow');
         let isRequired = elem.required;
         
         if (!isHtml)
         {
            elem.value = HtmlTextArea.Wrap(elem.value, isMultiRow);
         }
         
         let config = isMultiRow ?
            (isHtml ? HtmlTextArea.configHtml : HtmlTextArea.configPlain) :
            (isHtml ? HtmlTextArea.configHtmlSingleRow : HtmlTextArea.configPlainSingleRow);
         
         if (elem.hasAttribute('rows'))
            config.autoGrow_minHeight = elem.getAttribute('rows') * 30;
         
         let editor = CKEDITOR.replace(Utilities_ElementId(elem), config);
         if (isRequired) elem.required = true; // somehow this gets removed
         
         editor.on('change', function()
         {
            // call the onchange method so our form code knows things have changed
            FireElemChanged(elem);
         });
         
         if (isMultiRow && !Utilities_ArrayContains(HtmlTextArea.disabledFeatures, 'ai_suggestion'))
         {
            editor.addCommand("get_ai_suggestion", { // create named command
               exec: function(editor)
               {
                  HtmlTextArea._UpdateValueFromEditor(editor, elem); // not sure if this is needed
                  
                  let editingResourceID = EditingResourceID !== undefined ? EditingResourceID : null;
                  let contactID = Utilities_GetElementByName('ContactID') ? Utilities_GetElementByName('ContactID').value : null;
                  let templateType = elem.hasAttribute('data-templatetype') ? elem.getAttribute('data-templatetype') : null;
                  
                  DisplayInlineItemForm('SuggestionsEdit',
                     'Destination', elem.name,
                     'InitialContent', Utilities_HtmlToText(elem.value),
                     'EditingResourceID', editingResourceID,
                     'ContactID', contactID,
                     'TemplateType', templateType,
                     'VentureID', LimitVentureID ? LimitVentureID : '', // don't send "null" as a string to the server
                     'IsHTML', isHtml,
                     'CallbackMethod', 'HtmlTextArea_SuggestionReady'
                  );
               }
            });
            
            editor.ui.addButton('ai_suggestion', { // add new button and bind our command
               label: 'AI Suggestion',
               command: 'get_ai_suggestion',
               toolbar: 'special',
               icon: '/v2/Skins/AIAssistantTbDk.svg'
            });
         }
         
         if (isHtml)
         {
            // we add this here so the form validation sees the updated value
            FormPrepValues.AddCallback(function(e)
            {
               let editor = CKEDITOR.instances[Utilities_ElementId(elem)];
               if (typeof editor != 'undefined' /*&& HtmlTextArea.IsVisible(elem)*/)
               {
                  HtmlTextArea._UpdateValueFromEditor(editor, elem);
               }
               
               return true;
            });
            if (isMultiRow)
            {
               editor.on('paste', function(event)
               {
                  // make non-editable content editable
                  event.data.dataValue = event.data.dataValue.replace(/contenteditable=/gi, 'contentwaseditable=');
               });
            }
            else
            {
               editor.on('paste', function(event)
               {
                  // remove line break tags
                  event.data.dataValue = event.data.dataValue.replace(/<br[^>]*>/gi, ' ').replace(/<p>/g, " ").replace(/<\/p>/g, "");
                  // make non-editable content editable
                  event.data.dataValue = event.data.dataValue.replace(/contenteditable=/gi, 'contentwaseditable=');
               });
            }
         }
         else
         {
            let form = Utilities_GetParentByTag(elem, 'FORM');
            // DRL FIXIT? Every time the element is hidden/shown we'll register a new listener, we handle it but it's a waste.
            // we add this here so the form validation sees the updated value
            FormPrepValues.AddCallback(function(e)
            {
               let editor = CKEDITOR.instances[Utilities_ElementId(elem)];
               if (typeof editor != 'undefined' /*&& HtmlTextArea.IsVisible(elem)*/)
               {
                  HtmlTextArea._UpdateValueFromEditor(editor, elem);
                  elem.value = HtmlTextArea.Unwrap(elem.value, isMultiRow);
               }
               
               return true;
            });
            Utilities_AddEvent(form, "submit", function(e)
            {
               let editor = CKEDITOR.instances[Utilities_ElementId(elem)];
               if (typeof editor != 'undefined' /*&& HtmlTextArea.IsVisible(elem)*/)
               {
                  HtmlTextArea._UpdateValueFromEditor(editor, elem);
                  
                  let saved = elem.value; // the call below will save the value which will undo the logic above
                  editor.destroy();
                  elem.value = HtmlTextArea.Unwrap(saved, isMultiRow);
               }
            });
            editor.on('paste', function(event)
            {
               // convert line breaks to prevent them from being stripped
               event.data.dataValue = event.data.dataValue.replace(/<br([ ^])*\/>/gi, "_LB_PH_");
               // remove all other tags
               event.data.dataValue = event.data.dataValue.replace(/<([^>]+)>/g, ' ');
               // convert line breaks back
               event.data.dataValue = event.data.dataValue.replace(/_LB_PH_/g, "<br/>");
            });
         }
         
         elem.style.display = 'none';
      },
      
      UnmakeHtmlTextArea: function(elem)
      {
         if (Browser.IsExtensionContent())
         {
            return;
         }
         
         let editor = CKEDITOR.instances[Utilities_ElementId(elem)];
         if (typeof editor != 'undefined')
         {
            HtmlTextArea._UpdateValueFromEditor(editor, elem);
            
            let saved = elem.value; // the call below will save the value which will undo the logic above
            editor.destroy();
            elem.value = saved;
         }
      },
      
      Wrap: function(value, isMultiRow)
      {
         // DRL This encoding was messing up emoji's so I took it out. Not sure why we have it here?
         let result = value; //Encoder.htmlEncode(value, true);
         if (isMultiRow)
         {
            // handling for bullet lists
            result = result.replace(/\t\u2022 (.*)\n/g, '\t<li>$1</li>\n')    // all rows
            result = result.replace(/(?<!<\/li>\n)\t<li>/g, '<ul>\n\t<li>');  // first row
            result = result.replace(/(<\/li>\n)(?!\t)/g, '$1</ul>\n');        // last row

            result = result.replace(/&#10;/g, '<br />');
            result = result.replace(/(?<!(<\/li>)|(<\/ul>)|(<ul>))\n/g, '<br />');
         }
         return result;
      },
      
      Unwrap: function(value, isMultiRow)
      {
         let result = value;
         if (isMultiRow)
         {
            result = result.replace(/<br[^>]*>/gi, '\r').replace(/<p>/g, " ").replace(/<\/p>/g, "");
            
            // handling for bullet lists
            result = result.replace(/<ul>\n|<\/ul>\n/g, '');               // first and last rows
            result = result.replace(/\t<li>(.*)<\/li>/g, '\t\u2022 $1')    // all rows
         }
         return Encoder.htmlDecode(result);
      },
      
      /* We no longer need the resources listed on the client side.
         GetResourcesByType: function(type, resolve, reject)
         {
            var result = [];
            ResourcesHelper.LoadResourcesByType(type, function(array) {
               array.forEach(function (element)
               {
                  result.push({
                     name: element.name,
                     id: element.id
                  });
               });
      
               switch (type) {
               case 'forum':
                  HtmlTextArea.configPlain.forum.resources = result;
                  HtmlTextArea.configHtml.forum.resources = result;
                  break;
               case 'quiz':
                  HtmlTextArea.configPlain.quiz.resources = result;
                  HtmlTextArea.configHtml.quiz.resources = result;
                  break;
               case 'scheduler':
                  HtmlTextArea.configPlain.scheduler.resources = result;
                  HtmlTextArea.configHtml.scheduler.resources = result;
                  break;
               case 'webinar':
                  HtmlTextArea.configPlain.webinar.resources = result;
                  HtmlTextArea.configHtml.webinar.resources = result;
                  break;
               case 'image':
                  HtmlTextArea.configPlain.picture.resources = result;
                  HtmlTextArea.configHtml.picture.resources = result;
                  break;
               case 'video':
                  HtmlTextArea.configPlain.video.resources = result;
                  HtmlTextArea.configHtml.video.resources = result;
                  break;
               default:
                  break;
               }
      
               resolve();
            });
         },
      
         GetAllResources: function(resolve, reject)
         {
            ResourcesHelper.LoadResourcesByType('resource', function(data) {
               HtmlTextArea.configHtml.resource.resources = data;
               resolve();
            });
         }
       */
   }

function HtmlTextArea_SuggestionReady(destination, suggestion)
{
   let elem = Utilities_GetElementByName(destination);
   assert(elem != null);
   
   let editor = CKEDITOR.instances[Utilities_ElementId(elem)];
   assert(typeof editor != 'undefined');
   
   let isHtml = Class_HasByElement(elem, 'HtmlTextArea');
   if (!isHtml)
      suggestion = HtmlTextArea.Wrap(suggestion, true);
   editor.setData(suggestion);
}

DocumentLoad.AddCallback(HtmlTextArea.Init);
