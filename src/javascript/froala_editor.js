/*!
 * froala_editor v1.1.9 (http://editor.froala.com)
 * Copyright 2014-2014 Froala
 */

if (typeof jQuery === "undefined") { throw new Error("Froala requires jQuery") }

/*jslint browser: true, debug: true, vars: true, devel: true, expr: true, jQuery: true */

!function ($) {
  'use strict';

  // EDITABLE CLASS DEFINITION
  // =========================

  var Editable = function (element, options) {
    // Set options
    this.options = $.extend({}, Editable.DEFAULTS, $(element).data(), typeof options == 'object' && options);

    // Find out browser
    this.browser = Editable.browser();

    // List of disabled options.
    this.disabledList = [];

    this._id = ++Editable.count;

    this.blurred = true;

    this.init(element);
  };

  Editable.count = 0;

  Editable.VALID_NODES = ['P', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'LI', 'TD'];

  Editable.LANGS = [];

  Editable.DEFAULTS = {
    allowedImageTypes: ['jpeg', 'jpg', 'png', 'gif'],
    alwaysBlank: false,
    alwaysVisible: false,
    autosave: false,
    autosaveInterval: 10000,
    blockTags: ['n', 'p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    borderColor: '#252528',
    buttons: ['bold', 'italic', 'underline', 'strikeThrough', 'fontSize', 'fontFamily', 'color', 'sep',
      'formatBlock', 'blockStyle', 'align', 'insertOrderedList', 'insertUnorderedList', 'outdent', 'indent', 'sep',
      'createLink', 'insertImage', 'insertVideo', 'insertHorizontalRule', 'undo', 'redo', 'html'
    ],
    crossDomain: true,
    customButtons: {},
    customDropdowns: {},
    customText: false,
    defaultImageWidth: 300,
	defaultImageAlt: 'Image Alt',
    direction: 'ltr',
    disableRightClick: false,
    editorClass: '',
    headers: {},
    height: 'auto',
    icons: {}, // {cmd: {type: 'x', value: 'y'}}
    inlineMode: true,
    initOnClick: false,
    language: 'en_us',
    linkList: [],
    linkText: true,
    linkClasses: {},
    maxHeight: 'auto',
    minHeight: 'auto',
    noFollow: true,
    paragraphy: true,
    placeholder: 'Type something',
    plainPaste: false,
    preloaderSrc: '',
    saveURL: null,
    saveParams: {},
    saveRequestType: 'POST',
    simpleAmpersand: false,
    shortcuts: true,
    spellcheck: false,
    theme: null,
    toolbarFixed: true,
    trackScroll: false,
    unlinkButton: true,
    typingTimer: 200,
    width: 'auto',
    withCredentials: false,
    zIndex: 1000
  };

  /**
   * Destroy editable object.
   */
  Editable.prototype.destroy = function () {
    this.sync();

    this.hide();

    if (this.isHTML) {
      this.html();
    }

    this.focus();
    this.clearSelection();
    this.$element.blur();

    if (this.$bttn_wrapper) {
      this.$bttn_wrapper.html('').removeData().remove();
    }

    if (this.$editor) {
      this.$editor.html('').removeData().remove();
    }

    if (this.$image_editor) {
      this.$image_editor.html('').removeData().remove();
    }

    if (this.$image_wrapper) {
      this.$image_wrapper.html('').removeData().remove();
    }

    if (this.$link_wrapper) {
      this.$link_wrapper.html('').removeData().remove();
    }

    if (this.$video_wrapper) {
      this.$video_wrapper.html('').removeData().remove();
    }

    if (this.$popup_editor) {
      this.$popup_editor.html('').removeData().remove();
    }

    if (this.$overlay) {
      this.$overlay.html('').removeData().remove();
    }

    if (this.$image_modal) {
      this.hideMediaManager();
      this.$image_modal.html('').removeData().remove();
    }

    if (!this.isLink) {
      this.$element.replaceWith(this.getHTML());
      if (this.$box && !this.editableDisabled) {
        this.$box.removeClass('froala-box');
        this.$box.find('.html-switch').remove();
        this.$box.removeData('fa.editable');
        clearTimeout(this.typingTimer);
      }
    } else {
      this.$element.removeData('fa.editable');
    }

    clearTimeout(this.ajaxInterval);
    clearTimeout(this.typingTimer);

    // Off element events.
    this.$element.off('mousedown mouseup click keydown keyup focus keypress touchstart touchend touch drop');
    this.$element.off('mousedown mouseup click keydown keyup focus keypress touchstart touchend touch drop', '**');

    // Off window events.
    $(window).off('mouseup.' + this._id);
    $(window).off('keydown.' + this._id);
    $(window).off('keyup.' + this._id);
    $(window).off('hide.' + this._id);
    $(window).off('scroll.' + this._id);

    // Off document events.
    $(document).off('selectionchange.' + this._id);

    if (this.$upload_frame !== undefined) {
      this.$upload_frame.remove();
    }

    if (this.$textarea) {
      this.$box.remove();
      this.$textarea.removeData('fa.editable');
      this.$textarea.show();
    }
  };

  /**
   * Set callbacks.
   *
   * @param event - Event name
   * @param data - Data to pass to the callback.
   * @param sync - Do a sync after calling the callback.
   */
  Editable.prototype.callback = function (event, data, sync) {
    if (sync === undefined) {
      sync = true;
    }

    var resp = true;

    // DEPRECATED
    var prop = event + 'Callback';
    if (this.options[prop] && $.isFunction (this.options[prop])) {
      if (data) {
        resp = this.options[prop].apply(this, data);
      } else {
        resp = this.options[prop].call(this);
      }
    }
    // DEPRECATED

    if (data) {
      resp = this.$box.trigger('editable.' + event, data);
    } else {
      resp = this.$box.trigger('editable.' + event);
    }

    // Will break image resize if does sync.
    if (sync === true) {
      this.sync();
    }

    if (resp === undefined) {
      return true;
    }

    return resp;
  };

  /**
   * Cleanup before doing sync.
   *
   * @param $element - jQuery element to make cleanup on.
   */
  Editable.prototype.syncCleanHTML = function (html, keep_markers) {
    // Clear empty spans. Probably markers.
    var newHtml;

    if (keep_markers) {
      newHtml = html.replace(/<span((?!class\s*=\s*["']?f-marker["']?)[^>])*?><\/span>/gi, '');
      while (html != newHtml) {
        html = newHtml;
        newHtml = html.replace(/<span((?!class\s*=\s*["']?f-marker["']?)[^>])*?><\/span>/gi, '');
      }
    }
    else {
      // Remove span.
      newHtml = html.replace(/<span[^>]*?><\/span>/g, '');
      while (html != newHtml) {
        html = newHtml;
        newHtml = html.replace(/<span[^>]*?><\/span>/g, '');
      }
    }

    return html;
  }

  Editable.prototype.syncClean = function ($element, keep_markers) {
    // Clear empty spans. Probably markers.
    var e_selector = 'span:empty';
    if (keep_markers) {
      e_selector = 'span:empty:not(.f-marker)';
    }

    // Remove spans that do not have any attributes and are empty.
    var ok = false;
    var each_span = function (index, span) {
      if (span.attributes.length === 0) {
        $(span).remove();
        ok = false;
      }
    };

    var spans = $element.find(e_selector)
    while (spans.length && ok === false) {
      ok = true;
      spans.each (each_span);
      spans = $element.find(e_selector);
    }
  };

  /**
   * Sync between textarea and content.
   */
  Editable.prototype.sync = function () {
    if (!this.isHTML) {
      this.raiseEvent('sync');

      this.disableImageResize();

      if (!this.isLink && !this.isImage) {
        this.$element.trigger('placeholderCheck');
      }

      if (!this.isResizing() && !this.isLink && !this.isImage && !this.options.editInPopup && !this.android() && !this.imageMode) {
        this.cleanify();
      }

      var html = this.getHTML();

      // Check if content has changed.
      if (!this.isHTML) {
        if (this.trackHTML !== html && this.trackHTML != null) {
          this.callback('contentChanged', [], false);
          this.refreshImageList();
          this.refreshButtons();
          this.trackHTML = html;
        } else if (this.trackHTML == null) {
          this.trackHTML = html;
        }
      }

      // Set textarea value.
      if (this.$textarea) {
        this.$textarea.val(html);
      }
    }
  };

  /**
   * Check if the element passed as argument is empty or not.
   *
   * @param element - Dom Object.
   */
  Editable.prototype.emptyElement = function (element) {
    if (element.tagName == 'IMG' || $(element).find('img').length > 0) {
      return false;
    }

    if ($(element).find('input, iframe').length > 0) {
      return false;
    }

    var text = $(element).text();

    for (var i = 0; i < text.length; i++) {
      if (text[i] !== '\n' && text[i] !== '\r' && text[i] !== '\t') {
        return false;
      }
    }

    return true;
  };

  Editable.prototype.continueInit = function () {
    this.browserFixes();

    if (!this.isImage && !this.isLink && !this.options.editInPopup) {
      this.initUndoRedo();

      this.enableTyping();

      this.initShortcuts();
    }


    this.initEditor();

    if (!this.isLink) {
      this.initDrag();
    }

    this.initOptions();

    this.initEditorSelection();

    this.initAjaxSaver();

    if (!this.isLink || this.isImage) {
      this.initImageResizer();

      this.initImagePopup();
    }

    this.initLink();

    this.setLanguage();

    this.setCustomText();

    if (!this.isImage && !this.isLink) {
      this.registerPaste();
    }

    this.$element.blur();

    this.initialized = true;

    this.refreshButtons(true);

    this.callback('initialized', [], false);
  }

  /**
   * Init.
   *
   * @param element - The element on which to set editor.
   */
  Editable.prototype.init = function (element) {
    this.initElement(element);

    this.initElementStyle();

    if (this.options.initOnClick) {
      if (!this.isLink && !this.isImage && !this.options.editInPopup) {
        $(element).attr('contenteditable', true);
      }

      $(element).bind('mousedown', $.proxy(function () {
        $(element).unbind('mousedown');

        $(element).attr('contenteditable', false);
        this.saveSelectionByMarkers();
        this.continueInit();
        this.restoreSelectionByMarkers();

        this.hideOtherEditors();
      }, this))
    }
    else {
      this.continueInit();
    }
  };

  Editable.prototype.mobile = function () {
    return this.iOS() || this.android() || this.blackberry();
  }

  Editable.prototype.iOS = function () {
    return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  }

  Editable.prototype.iPad = function () {
    return /(iPad)/g.test(navigator.userAgent);
  }

  Editable.prototype.iPhone = function () {
    return /(iPhone)/g.test(navigator.userAgent);
  }

  Editable.prototype.iPod = function () {
    return /(iPod)/g.test(navigator.userAgent);
  }

  Editable.prototype.android = function () {
    return /(Android)/g.test(navigator.userAgent);
  }

  Editable.prototype.blackberry = function () {
    return /(Blackberry)/g.test(navigator.userAgent);
  }

  /**
   * Init element.
   *
   * @param element
   */
  Editable.prototype.initElement = function (element) {
    // Element is <textarea>, convert it to div.
    if (element.tagName == 'TEXTAREA') {
      this.$textarea = $(element);

      if (this.$textarea.attr('placeholder') !== undefined && this.options.placeholder == 'Type something') {
        this.options.placeholder = this.$textarea.attr('placeholder');
      }

      this.$element = $('<div>').html(this.$textarea.val());
      this.$textarea.before(this.$element).hide();

      // Before submit textarea do a sync.
      this.$textarea.parents('form').bind('submit', $.proxy(function () {
        if (this.isHTML) {
          this.html();
        } else {
          this.sync();
        }
      }, this));
    }

    else if (element.tagName == 'A') {
      this.isLink = true;
      this.selectionDisabled = true;
      this.editableDisabled = true;
      this.options.buttons = [];
      this.$element = $(element);
      this.options.paragraphy = false;
      this.$box = this.$element;
    }

    else if (element.tagName == 'IMG') {
      var img_float = $(element).css('float')
      if ($(element).parent().get(0).tagName == 'A') {
        element = $(element).parent()
      }

      this.isImage = true;
      this.editableDisabled = true;
      this.imageList = [];
      this.options.buttons = [];
      this.options.paragraphy = false;
      this.options.imageMargin = 'auto';
      $(element).wrap('<div>');
      this.$element = $(element).parent();
      this.$element.css('display', 'inline-block');
      this.$element.css('max-width', '100%');
      this.$element.css('margin-left', 'auto');
      this.$element.css('margin-right', 'auto');
      this.$element.css('float', img_float);
      this.$element.addClass('f-image');
      this.$box = $(element);
    }

    else if (this.options.editInPopup) {
      this.$element = $(element);
      this.$box = this.$element;
      this.editableDisabled = true;
      this.options.buttons = [];

      this.$element.on('click', $.proxy(function (e) {
        e.preventDefault();
      }, this));
    }

    else {
      // Remove format block if the element is not a DIV.
      if (element.tagName != 'DIV' && this.options.buttons.indexOf('formatBlock') >= 0) {
        this.disabledList.push('formatBlock');
      }

      this.$element = $(element);
    }

    if (!this.isImage && !this.isLink && !this.options.editInPopup) {
      this.$box = this.$element;
      this.$element = $('<div>');
      this.setHTML(this.$box.html(), false);
      this.$box.html(this.$element).addClass('froala-box');

      this.$element.on('keyup', $.proxy(function (e) {
        var keyCode = e.which;

        // Check if there is any empty div.
        if (keyCode == 13) {
          this.webkitParagraphy();
        }
      }, this))
    }

    // Drop event.
    this.$element.on('drop', $.proxy(function () {
      setTimeout($.proxy(function () {
        $('html').click();
        this.$element.find('.f-img-wrap').each (function (i, e) {
          if ($(e).find('img').length === 0) {
            $(e).remove();
          }
        })
      }, this), 1);
    }, this));

    // Sync.
    this.sync();
  };

  Editable.prototype.webkitParagraphy = function () {
    this.$element.find('*').each ($.proxy(function (index, elem) {
      if (this.emptyElement(elem) && elem.tagName == 'DIV') {
        if (this.options.paragraphy === true) {
          var $p = $('<p><br/></p>');
          $(elem).replaceWith($p);

          this.setSelection($p.get(0));
        }
      }
    }, this));
  }

  /**
   * Trim text.
   */
  Editable.prototype.trim = function (text) {
    return String(text).replace(/^\s+|\s+$/g, '');
  };

  /**
   * Unwrap text from editor.
   */
  Editable.prototype.unwrapText = function () {
    if (!this.options.paragraphy) {
      this.$element.find('div').each (function (index, elem) {
        if ($(elem).attr('style') === undefined) {
          $(elem).replaceWith($(elem).html() + '<br/>');
        }
      })
    }
  }

  /**
   * Wrap text from editor.
   */
  Editable.prototype.wrapText = function () {
    // No need to do it if image or link.
    if (this.isImage || this.isLink) {
      return false;
    }

    this.webkitParagraphy();

    var newWrap = [];
    var INSIDE_TAGS = ['SPAN', 'A', 'B', 'I', 'EM', 'U', 'S', 'STRONG', 'STRIKE', 'FONT', 'IMG'];

    var that = this;

    var mergeText = function () {
      if (newWrap.length === 0) {
        return;
      }

      var $div;
      if (that.options.paragraphy === true) {
        $div = $('<p>');
      } else {
        $div = $('<div>');
      }

      var $wrap_0 = $(newWrap[0]);
      if (newWrap.length == 1 && $wrap_0.attr('class') == 'f-marker') {
        newWrap = []
        return;
      }

      for (var i = 0; i < newWrap.length; i++) {
        var $wrap_obj = $(newWrap[i]);
        $div.append($wrap_obj.clone());
        if (i == newWrap.length - 1) {
          $wrap_obj.replaceWith($div);
        } else {
          $wrap_obj.remove();
        }
      }

      newWrap = [];
    }

    this.$element
      .contents()
      .filter(function () {
        var $this = $(this);

        // Check if node is text, not empty and it is an inside tag.
        if ((this.nodeType == Node.TEXT_NODE && $this.text().trim().length > 0) || INSIDE_TAGS.indexOf(this.tagName) >= 0) {
          newWrap.push(this);
        }

        // Empty text. Remove it.
        else if ((this.nodeType == Node.TEXT_NODE && $this.text().trim().length === 0)) {
          $this.remove();
        }

        // Merge text so far.
        else {
          mergeText();
        }
      });

    mergeText();

    // Add an invisible character at the end of empty elements.
    this.$element.find('> p, > div').each (function (index, elem) {
      if ($(elem).text().trim().length === 0 &&
        $(elem).find('img').length === 0 &&
        $(elem).find('br').length === 0) {
        $(elem).append('<br/>');
      }
    });

    this.$element.find('div:empty, > br').remove();
  };

  /**
   * Set a HTML into the current editor.
   *
   * @param html - The HTML to set.
   * @param sync - Passing false will not sync after setting the HTML.
   */
  Editable.prototype.setHTML = function (html, sync) {
    this.no_verify = true;
    if (sync === undefined) {
      sync = true;
    }

    // Clean.
    html = this.clean(html, true, false);

    // Remove unecessary spaces.
    html = html.replace(/>\s+</g, '><');

    this.$element.html(html);

    this.imageList = [];
    this.refreshImageList();

    if (this.options.paragraphy) {
      this.wrapText();
    }

    if (sync === true) {
      this.restoreSelectionByMarkers();
      this.sync();
    }
    this.no_verify = false;

    this.$element.find('span').data('fr-verified', true);
  };

  /**
   * Register paste event.
   */
  Editable.prototype.registerPaste = function () {
    var that = this;
    this.$element.get(0).onpaste = function () {
      if (!that.isHTML) {
        if (!that.callback('beforePaste', [], false)) {
          return false;
        }

        that.pasting = true;

        // Save selection
        that.saveSelection();

        var scrollPosition = $(window).scrollTop();

        // Remove and store the editable content
        var $pasteDiv = $('<div contenteditable="true" style="position: fixed; top: 0; left: -9999px; width: 0; z-index: 99999;"></div>').appendTo('body');

        $pasteDiv.focus();

        window.setTimeout(function () {
          // Get pasted content
          var pastedFrag = $pasteDiv.html();
          $pasteDiv.remove();

          $(window).scrollTop(scrollPosition);

          // Restore selection.
          that.restoreSelection();

          if (!that.options.plainPaste) {
            if (pastedFrag.match(/(class=\"?Mso|style=\"[^\"]*\bmso\-|w:WordDocument)/gi)) {
              that.insertHTML(that.wordClean(pastedFrag));
            } else {
              that.insertHTML(that.clean(pastedFrag, false, true));
            }
          } else {
            that.insertHTML(pastedFrag.replace(/<(?!br\s*\/?)[^>]+>/g, ''));
          }

          that.sync();

          that.cleanify();

          that.$element.trigger('placeholderCheck');

          that.pasting = false;

          that.callback('afterPaste');
        }, 1);
      }
    };
  };

  /**
   * Get content from the pasted frag.
   */
  Editable.prototype._extractContent = function (node) {
    var frag = document.createDocumentFragment();
    var child;

    while ((child = node.firstChild)) {
      frag.appendChild(child);
    }

    return frag;
  };


  /**
   * Word clean.
   */
  Editable.prototype.wordClean = function (html) {
    console.log ('da')

    // Single item list.
    html = html.replace(
      /<p(.*?)class="MsoListParagraph"([\s\S]*?)>([\s\S]*?)<\/p>/gi,
      '<ul><li><p>$3</p></li></ul>'
    );

    // List start.
    html = html.replace(
      /<p(.*?)class="MsoListParagraphCxSpFirst"([\s\S]*?)>([\s\S]*?)<\/p>/gi,
      '<ul><li><p>$3</p></li>'
    );

    // List middle.
    html = html.replace(
      /<p(.*?)class="MsoListParagraphCxSpMiddle"([\s\S]*?)>([\s\S]*?)<\/p>/gi,
      '<li><p>$3</p></li>'
    );

    // List end.
    html = html.replace(/<p(.*?)class="MsoListParagraphCxSpLast"([\s\S]*?)>([\s\S]*?)<\/p>/gi, '<li><p>$3</p></li></ul>');

    // Clean list bullets.
    html = html.replace(/<span([^<]*?)style="mso-list:Ignore"([\s\S]*?)>([\s\S]*?)<span/gi, '<span><span');

    // Webkit clean list bullets.
    html = html.replace(/<!--\[if \!supportLists\]-->([\s\S]*?)<!--\[endif\]-->/gi, '');

    // Remove mso classes.
    html = html.replace(/(\n|\r| class=(")?Mso[a-zA-Z]+(")?)/gi, ' ');

    // Remove comments.
    html = html.replace(/<!--[\s\S]*?-->/gi, '');

    // Remove tags but keep content.
    html = html.replace(/<(\/)*(meta|link|span|\\?xml:|st1:|o:|font)(.*?)>/gi, '');

    // Remove no needed tags.
    var word_tags = ['style', 'script', 'applet', 'embed', 'noframes', 'noscript'];
    for (var i = 0; i < word_tags.length; i++) {
      var regex = new RegExp('<' + word_tags[i] + '.*?' + word_tags[i] + '(.*?)>', 'gi');
      html = html.replace(regex, '');
    }

    // Remove attributes.
    html = html.replace(/([\w\-]*)=("[^<>"]*"|'[^<>']*'|\w+)/gi, '');

    // Remove spaces.
    html = html.replace(/&nbsp;/gi, '');

    // Remove empty tags.
    var oldHTML;
    do {
      oldHTML = html;
      html = html.replace(/<[^\/>][^>]*><\/[^>]+>/gi, '');
    } while (html != oldHTML);

    return html;
  }

  Editable.prototype.isClosingTag = function (tag) {
    // Detect closing tag.
    return tag.match(/^<\/([a-zA-Z0-9]+)([^<]+)*>$/gi) !== null;
  }

  Editable.prototype.tagName = function (tag) {
    return tag.replace(/^<\/?([a-zA-Z0-9]+)([^<]+)*>$/gi, '$1').toLowerCase();
  }

  Editable.prototype.isSelfClosingTag = function (tag) {
    var self_enclosing_tags = ['br', 'button', 'input', 'img'];
    var tag_name = this.tagName(tag);

    return self_enclosing_tags.indexOf(tag_name) >= 0;
  }

  Editable.prototype.tabs = function (tabs_no) {
    var html = '';

    for (var k = 0; k < tabs_no; k++) {
      html += '  ';
    }

    return html;
  }

  /**
   * Clean tags.
   */
  Editable.prototype.cleanTags = function (html) {
    var char;
    var i;
    var ok;
    var last;

    var format_tags = ['P', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'UL', 'OL', 'LI', 'TABLE', 'TBODY', 'THEAD', 'TFOOT', 'TR', 'TH', 'TD'];
    var open_tags = [];
    var dom = [];

    html = html.replace(/\n/gi, '');

    // Iterate through the html.
    for (i = 0; i < html.length; i++) {
      char = html.charAt(i);

      // Tag start.
      if (char == '<') {
        // Tag end.
        var j = html.indexOf('>', i + 1);
        if (j !== -1) {
          // Get tag.
          var tag = html.substring(i, j + 1);
          var tag_name = this.tagName(tag);

          // Closing tag.
          var is_closing = this.isClosingTag(tag);

          // Self enclosing tag.
          if (this.isSelfClosingTag(tag)) {
            dom.push(tag);
          }
          // New open tag.
          else if (!is_closing) {
            // Keep tag in dom.
            dom.push(tag);

            // Store open tag.
            open_tags.push({
              tag_name: tag_name,
              i: (dom.length - 1)
            });

          } else {
            ok = false;
            last = true;

            // Search for opened tag.
            while (ok === false && last !== undefined) {
              // Get last node.
              last = open_tags.pop();

              // Remove nodes that are not closed correctly.
              if (last !== undefined && last.tag_name !== tag_name) {
                dom.splice(last.i, 1);
              } else {
                ok = true;

                // Last tag should be the correct one and not undefined.
                if (last !== undefined) {
                  dom.push(tag);
                }
              }
            }
          }

          // Update i position.
          i = j;
        }
      } else {
        // Store character.
        dom.push(char);
      }
    }

    // Remove open tags.
    while (open_tags.length > 0) {
      last = open_tags.pop();
      dom.splice(last.i, 1);
    }

    // Build the new html.
    html = '';
    open_tags = 0;
    for (i = 0; i < dom.length; i++) {
      if (dom[i].length == 1) {
        html += dom[i];
      }
      else if (format_tags.indexOf(this.tagName(dom[i]).toUpperCase()) < 0) {
        html += dom[i];
      }
      else if (this.isSelfClosingTag(dom[i])) {
        html += dom[i];
      }
      else if (!this.isClosingTag(dom[i])) {
        html += '\n' + this.tabs(open_tags) + dom[i];
        open_tags += 1;
      }
      else {
        open_tags -= 1;
        if (html.length > 0 && html[html.length - 1] == '\n') {
          html += this.tabs(open_tags);
        }

        html += dom[i] + '\n';
      }
    }

    // Remove starting \n.
    if (html[0] == '\n') {
      html = html.substring(1, html.length);
    }

    // Remove ending \n.
    if (html[html.length - 1] == '\n') {
      html = html.substring(0, html.length - 1);
    }

    return html;
  };


  /**
   * Clean the html.
   */
  Editable.prototype.clean = function (html, allow_id, clean_style, allowed_tags, allowed_attrs) {
    // List of allowed attributes.
    if (!allowed_attrs) {
      allowed_attrs = ['title', 'href', 'alt', 'src', 'style', 'width', 'height', 'target', 'rel', 'name', 'value', 'type', 'colspan', 'rowspan', 'size', 'color', 'cellpadding', 'cellspacing', 'valign', 'align', 'autocomplete', 'background', 'bgcolor', 'contenteditable', 'tabindex', 'data-.*'];
    }

    // List of allowed tags.
    if (!allowed_tags) {
      allowed_tags = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'span', 'b', 'u', 'i', 'strong', 'em', 'strike', 'img', 'ul', 'ol', 'li', 'iframe', 'a'];
    }

    // Keep or not id and class.
    if (allow_id === true) {
      allowed_attrs.push('id');
      allowed_attrs.push('class');
    }

    // Remove script tag.
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove all tags not in allowed tags.
    var at_reg = new RegExp('<\\/?((?!(?:' + allowed_tags.join('|') + '))\\w+)[^>]*?>', 'gi');
    html = html.replace(at_reg, '');

    // Remove all attributes not in allowed attrs.
    var aa_reg = new RegExp('<([^>]*)( (?!(?:' + allowed_attrs.join('|') + '))\\[a-zA-Z0-9-]+)=(?:\'[^\']*\'|""[^""]*""|[^\\s>]+)([^>]*)>', 'gi');
    html = html.replace(aa_reg, '<$1$3>');

    // Sanitize SRC or HREF.
    var s_reg = new RegExp('<([^>]*)(src|href)=(\'[^\']*\'|""[^""]*""|[^\\s>]+)([^>]*)>', 'gi');
    html = html.replace(s_reg, $.proxy(function (str, a1, a2, a3, a4) {
      return '<' + a1 + a2 + '="' + this.sanitizeURL(a3.replace(/^["'](.*)["']\/?$/gi, '$1')) + '"' + a4 + '>';
    }, this));

    // Clean style.
    if (clean_style) {
      var style_reg = new RegExp('style="[a-zA-Z0-9:;\\.\\s\\(\\)\\-\\,]*"', 'gi');
      html = html.replace(style_reg, '');
    }

    // Clean tags.
    html = this.cleanTags(html);

    return html;
  };

  /**
   * Clean new lines.
   */
  Editable.prototype.cleanNewLine = function (html) {
    var r = new RegExp('\\n', 'g');
    return html.replace(r, '');
  };

  /**
   * Init style for element.
   */
  Editable.prototype.initElementStyle = function () {
    // Enable content editable.
    if (!this.editableDisabled) {
      this.$element.attr('contenteditable', true);
    }

    var cls = 'froala-element ' + this.options.editorClass;

    if (this.browser.msie && Editable.getIEversion() < 9) {
      cls += ' ie8';
    }

    // Remove outline.
    this.$element.css('outline', 0);

    if (!this.browser.msie) {
      cls += ' not-msie';
    }

    this.$element.addClass(cls);
  };

  /**
   * Init undo support.
   */
  Editable.prototype.initUndoRedo = function () {
    if (this.isEnabled('undo') || this.isEnabled('redo')) {
      // Undo stack array.
      this.undoStack = [];
      this.undoIndex = 0;
      this.saveUndoStep();
    }

    this.disableBrowserUndo();
  };

  /**
   * Typing is saved in undo stack.
   */
  Editable.prototype.enableTyping = function () {
    this.typingTimer = null;

    this.$element.on('keydown', $.proxy(function () {
      clearTimeout(this.typingTimer);
      this.ajaxSave = false;

      this.oldHTML = this.getHTML();

      this.typingTimer = setTimeout($.proxy(function () {
        if (this.getHTML().replace(/[\u3041-\u3096]|[\u30A0-\u30FF]|[\u4E00-\u9FFF]/gi, '') != this.oldHTML.replace(/[\u3041-\u3096]|[\u30A0-\u30FF]|[\u4E00-\u9FFF]/gi, '')) {
          // Add in undo stack.
          this.saveUndoStep();

          // Do sync.
          this.sync();
        }
      }, this), Math.max(this.options.typingTimer, 200));
    }, this));
  };

  Editable.prototype.removeMarkersByRegex = function (html) {
    return html.replace(/<span[^>]*? class\s*=\s*["']?f-marker["']?[^>]+>([\S\s][^\/])*<\/span>/gi, '');
  };

  Editable.prototype.getImageHTML = function () {
    return JSON.stringify({
      src: this.$element.find('img').attr('src'),
      style: this.$element.find('img').attr('style'),
      alt: this.$element.find('img').attr('alt'),
      width: this.$element.find('img').attr('width'),
      link: this.$element.find('a').attr('href'),
      link_title: this.$element.find('a').attr('title'),
      link_target: this.$element.find('a').attr('target')
    })
  };

  Editable.prototype.getLinkHTML = function () {
    return JSON.stringify ({
      body: this.$element.html(),
      href: this.$element.attr('href'),
      title: this.$element.attr('title'),
      popout: this.$element.hasClass('popout'),
      nofollow: this.$element.attr('ref') == 'nofollow',
      blank: this.$element.attr('target') == '_blank',
      left: this.$element.parents('.navbar-left').length > 0,
      'class': this.$element.attr('class').replace(/froala-element/, '').replace(/not-msie/, '').replace(/ +(?= )/g,'').split(' ').sort().join(' ')
    })
  };

  /**
   * Get HTML from the editor.
   */
  Editable.prototype.getHTML = function (keep_markers, add_fr_tag) {
    if (add_fr_tag === undefined) add_fr_tag = false;
    if (keep_markers === undefined) keep_markers = false;

    if (this.isHTML) {
      return this.$html_area.val();
    }

    if (this.isImage) {
      return this.getImageHTML();
    }

    if (this.isLink) {
      return this.getLinkHTML();
    }

    // Add f-link to links.
    this.$element.find('a').data('fr-link', true);

    // fr-tag class.
    if (add_fr_tag) {
      this.$element.find('p, h1, h2, h3, h4, h5, h6, pre, blockquote, table, ul, ol, img').addClass('fr-tag');
    }

    // Set image margin.
    this.$element.find('.f-img-editor > img').each($.proxy(function (index, elem) {
      this.addImageClass($(elem), this.getImageClass($(elem).parent().attr('class')));
    }, this));

    // Clone element.
    var html = this.$element.html();

    // Restore image margin.
    this.$element.find('.f-img-editor > img').removeClass('fr-fin fr-fil fr-fir');

    // Restore fr-tag class.
    this.$element.find('p, h1, h2, h3, h4, h5, h6, pre, blockquote, table, ul, ol, img').removeClass('fr-tag');

    // Clean unwanted elements.
    html = this.syncCleanHTML(html, keep_markers);

    // Remove contenteditable attribute.
    html = html.replace(/\s*contenteditable="[^"]*"/gi, '')

    // Remove empty link.
    html = html.replace(/<a[^>]*?><\/a>/g, '')

    if (!keep_markers) {
      // Remove markers.
      html = this.removeMarkersByRegex(html);
    }

    // Remove image handles.
    html = html.replace(/<span[^>]*? class\s*=\s*["']?f-img-handle[^>]+><\/span>/gi, '');

    // Remove f-img-editor.
    html = html.replace(/^([\S\s]*)<span[^>]*? class\s*=\s*["']?f-img-editor[^>]+>([\S\s]*)<\/span>([\S\s]*)$/gi, '$1$2$3');

    // Remove image wrapper.
    html = html.replace(/^([\S\s]*)<span[^>]*? class\s*=\s*["']?f-img-wrap[^>]+>([\S\s]*)<\/span>([\S\s]*)$/gi, '$1$2$3');

    // Remove f-video-editor.
    html = html.replace(/^([\S\s]*)<span[^>]*? class\s*=\s*["']?f-video-editor[^>]+>([\S\s]*)<\/span>([\S\s]*)$/gi, '$1$2$3');

    // Ampersand fix.
    html = html.replace(/\&amp;/gi, '&');
    if (this.options.simpleAmpersand) {
      html = html.replace(/\&amp;/gi, '&');
    }

    // Remove data-fr-verified
    html = html.replace(/ data-fr-verified="true"/gi, '');

    // Remove new lines.
    html = html.replace(/\n/gi, '');

    html = html.replace(/\u200B/gi, '');

    return html;

  };

  /**
   * Get the text from the current element.
   */
  Editable.prototype.getText = function () {
    return this.$element.text();
  };

  /**
   * Make ajax requests if autosave is enabled.
   */
  Editable.prototype.initAjaxSaver = function () {
    this.ajaxHTML = this.getHTML();
    this.ajaxSave = true;

    this.ajaxInterval = setInterval($.proxy(function () {
      var html = this.getHTML();
      if (this.ajaxHTML != html && this.ajaxSave) {
        if (this.options.autosave) {
          this.save();
        }

        this.ajaxHTML = html;
      }

      this.ajaxSave = true;
    }, this), Math.max(this.options.autosaveInterval, 100));
  };

  /**
   * Disable browser undo.
   */
  Editable.prototype.disableBrowserUndo = function () {
    $('body').keydown(function (e) {
      var keyCode = e.which;
      var ctrlKey = (e.ctrlKey || e.metaKey) && !e.altKey;

      if (!this.isHTML && ctrlKey) {
        if (keyCode == 75) {
          e.preventDefault();
          return false;
        }

        if (keyCode == 90 && e.shiftKey) {
          e.preventDefault();
          return false;
        }

        if (keyCode == 90) {
          e.preventDefault();
          return false;
        }
      }
    });
  };

  /**
   * Save current HTML in undo stack.
   */
  Editable.prototype.saveUndoStep = function () {
    if (this.isEnabled('undo') || this.isEnabled('redo')) {
      while (this.undoStack.length > this.undoIndex) {
        this.undoStack.pop();
      }

      var html = this.getHTML(true);

      if (this.undoStack[this.undoIndex - 1] && this.removeMarkersByRegex(this.undoStack[this.undoIndex - 1]) == html) {
        return false;
      }

      if (this.selectionInEditor() && this.$element.is(':focus')) {
        this.saveSelectionByMarkers();
      }

      this.undoStack.push(this.getHTML(true));
      this.undoIndex++;

      if (this.selectionInEditor() && this.$element.is(':focus')) {
        this.restoreSelectionByMarkers();
      }

      this.refreshUndoRedo();
    }
  };

  /**
   * Enable editor shortcuts.
   */
  Editable.prototype.initShortcuts = function () {
    if (this.options.shortcuts) {
      this.$element.on('keydown', $.proxy(function (e) {
        var keyCode = e.which;
        var ctrlKey = (e.ctrlKey || e.metaKey) && !e.altKey;

        if (!this.isHTML && ctrlKey) {
          // CTRL + f
          if (keyCode == 70) {
            // this.repositionEditor()
            this.show(null);
            return false;
          }

          // CTRL + b
          if (keyCode == 66) {
            return this.execDefaultShortcut('bold');
          }

          // CTRL + i
          if (keyCode == 73) {
            return this.execDefaultShortcut('italic');
          }

          // CTRL + u
          if (keyCode == 85) {
            return this.execDefaultShortcut('underline');
          }

          // CTRL + k
          if (keyCode == 75) {
            return this.execDefaultShortcut('createLink');
          }

          // CTRL + p
          if (keyCode == 80) {
            this.repositionEditor();
            return this.execDefaultShortcut('insertImage');
          }

          // CTRL + a
          if (keyCode == 65) {
            return this.execDefaultShortcut('selectAll');
          }

          // CTRL + ]
          if (keyCode == 221) {
            return this.execDefaultShortcut('indent');
          }

          // CTRL + [
          if (keyCode == 219) {
            return this.execDefaultShortcut('outdent');
          }

          // CTRL + h
          if (keyCode == 72) {
            return this.execDefaultShortcut('html');
          }

          // CTRL + 0
          if (keyCode == 48) {
            return this.execDefaultShortcut('formatBlock', 'n');
          }

          // CTRL + 1
          if (keyCode == 49) {
            return this.execDefaultShortcut('formatBlock', 'h1');
          }

          // CTRL + 2
          if (keyCode == 50) {
            return this.execDefaultShortcut('formatBlock', 'h2');
          }

          // CTRL + 3
          if (keyCode == 51) {
            return this.execDefaultShortcut('formatBlock', 'h3');
          }

          // CTRL + 4
          if (keyCode == 52) {
            return this.execDefaultShortcut('formatBlock', 'h4');
          }

          // CTRL + 5
          if (keyCode == 53) {
            return this.execDefaultShortcut('formatBlock', 'h5');
          }

          // CTRL + 6
          if (keyCode == 54) {
            return this.execDefaultShortcut('formatBlock', 'h6');
          }

          // CTRL + "
          if (keyCode == 222) {
            return this.execDefaultShortcut('formatBlock', 'blockquote');
          }

          // CTRL + \
          if (keyCode == 220) {
            return this.execDefaultShortcut('formatBlock', 'pre');
          }

          // Strikethrough
          if (keyCode == 83)  {
            return this.execDefaultShortcut('strikeThrough');
          }

          // CTRL + SHIFT + z
          if (keyCode == 90 && e.shiftKey) {
            this.redo();
            e.stopPropagation();
            return false;
          }

          // CTRL + z
          if (keyCode == 90) {
            this.undo();
            e.stopPropagation();
            return false;
          }
        }

        // tab
        if (keyCode == 9 && !e.shiftKey) {
          e.preventDefault();
          this.insertHTML('&nbsp;&nbsp;&nbsp;&nbsp;', false);
        } else if (keyCode == 9 && e.shiftKey) {
          e.preventDefault();
        }
      }, this));
    }
  };

  /*
   * Check if element is text empty.
   */
  Editable.prototype.textEmpty = function (element) {
    var text = $(element).text().replace(/(\r\n|\n|\r|\t)/gm, '');

    return (text === '' || element === this.$element.get(0)) && $(element).find('br').length === 0;
  }

  /*
   * Focus in element.
   */
  Editable.prototype.focus = function (try_to_focus) {
    if (try_to_focus === undefined) try_to_focus = true;

    if (this.text() !== '') {
      this.$element.focus();
      return;
    }

    if (!this.isHTML) {
      if (try_to_focus && !this.pasting) {
        if (!this.browser.webkit) {
          this.$element.blur();
        }

        this.$element.focus();
      }

      if (this.pasting && !this.$element.is(':focus')) {
        this.$element.focus();
      }

      var range = this.getRange();

      if (this.text() === '' && (range && (range.startOffset === 0 || range.startContainer === this.$element.get(0)))) {
        var i;
        var element;
        var elements = this.getSelectionElements();

        if (elements.length >= 1 && elements[0] !== this.$element.get(0)) {
          for (i = 0; i < elements.length; i++) {
            element = elements[i];
            if (!this.textEmpty(element)) {
              this.setSelection(element);
              return;
            }
          }
        }

        elements = this.$element.find(Editable.VALID_NODES.join(','));
        for (i = 0; i < elements.length; i++) {
          element = elements[i];
          if (!this.textEmpty(element)) {
            this.setSelection(element);
            return;
          }
        }

        this.setSelection(this.$element.get(0));
      }
    }
  };

  // http://stackoverflow.com/questions/6690752/insert-html-at-caret-in-a-contenteditable-div/6691294#6691294
  Editable.prototype.insertHTML = function (html, selectPastedContent) {
    if (!this.isHTML) {
      this.focus();
    }

    if (this.browser.msie) {
      var sel;
      var range;
      if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
          range = sel.getRangeAt(0);
          range.deleteContents();

          var el = document.createElement('div');
          el.innerHTML = html;

          var frag = document.createDocumentFragment();
          var node;
          var lastNode;

          while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          var firstNode = frag.firstChild;
          range.insertNode(frag);

          // Preserve the selection
          if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            if (selectPastedContent) {
              range.setStartBefore(firstNode);
            } else {
              range.collapse(true);
            }
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } else if ((sel = document.selection) && sel.type != 'Control') {
        // IE < 9
        var originalRange = sel.createRange();
        originalRange.collapse(true);
        sel.createRange().pasteHTML(html);
        if (selectPastedContent) {
          range = sel.createRange();
          range.setEndPoint('StartToStart', originalRange);
          range.select();
        }
      }
    }
    else {
      document.execCommand('inserthtml', null, html);
      this.focus();
    }
  };

  /**
   * Run shortcut.
   *
   * @param command - Command name.
   * @param val - Command value.
   * @returns {boolean}
   */
  Editable.prototype.execDefaultShortcut = function (command, val) {
    if (this.isEnabled(command)) {
      this.exec(command, val);
      return false;
    }

    return true;
  };

  /**
   * Init editor.
   */
  Editable.prototype.initEditor = function () {
    var cls = 'froala-editor';
    if (this.isTouch()) {
      cls += ' touch';
    }
    if (this.browser.msie && Editable.getIEversion() < 9) {
      cls += ' ie8';
    }

    this.$editor = $('<div class="' + cls + '" style="display: none;">');
    $('body').append(this.$editor);

    if (this.options.inlineMode) {
      this.initInlineEditor();
    } else {
      this.initBasicEditor();
    }
  };

  Editable.prototype.toolbarTop = function () {
    $(window).on('scroll resize', $.proxy(function () {
      if (!this.options.toolbarFixed && !this.options.inlineMode) {
        // && $(window).scrollTop() + this.$editor.height() < this.$box.offset().top + this.$box.height()
        if ($(window).scrollTop() > this.$box.offset().top && $(window).scrollTop() < this.$box.offset().top + this.$box.height()) {
          this.$editor.addClass('f-scroll');
          this.$box.css('padding-top', this.$editor.height());
          this.$editor.css('top', $(window).scrollTop() - this.$box.offset().top);
        } else {
          if ($(window).scrollTop() < this.$box.offset().top) {
            this.$editor.removeClass('f-scroll');
            this.$box.css('padding-top', '');
            this.$editor.css('top', '');
          }
        }
      }
    }, this));
  };

  /**
   * Basic editor.
   */
  Editable.prototype.initBasicEditor = function () {
    this.$element.addClass('f-basic');

    this.$popup_editor = this.$editor.clone();
    this.$popup_editor.appendTo($('body'));

    this.$editor.addClass('f-basic').show();
    this.$editor.insertBefore(this.$element);

    this.toolbarTop();
  };

  /**
   * Inline editor.
   */
  Editable.prototype.initInlineEditor = function () {
    this.$popup_editor = this.$editor;
  };

  /**
   * Init drag for image insertion.
   */
  Editable.prototype.initDrag = function () {
    // Drag and drop support.
    this.drag_support = {
      filereader: typeof FileReader != 'undefined',
      formdata: !!window.FormData,
      progress: 'upload' in new XMLHttpRequest()
    };
  };

  /**
   * Init options.
   */
  Editable.prototype.initOptions = function () {
    this.setDimensions();

    this.setBorderColor();

    if (!this.isImage && !this.isLink) {
      this.setPlaceholder();

      this.setPlaceholderEvents();
    }

    this.setSpellcheck();

    this.setImageUploadURL();

    this.setButtons();

    this.setDirection();

    this.setTextNearImage();

    this.setZIndex();

    this.setTheme();

    if (this.options.editInPopup) {
      this.buildEditPopup();
    }
  };

  /**
   * Determine if is touch device.
   */
  Editable.prototype.isTouch = function () {
    return WYSIWYGModernizr.touch && window.Touch !== undefined;
  };

  /**
   * Selection events.
   */
  Editable.prototype.initEditorSelection = function () {
    // Hide event.
    $(window).on('hide.' + this._id, $.proxy(function () {
      if (!this.isResizing()) {
        this.hide(false);
      }
    }, this));

    this.$element.on('focus', $.proxy(function () {
      if (this.blurred) {
        this.blurred = false;

        this.callback('focus', [], false);
      }
    }, this));

    // Hide editor on mouse down.
    this.$element.on('mousedown touchstart', $.proxy(function () {
      if (!this.isResizing()) {
        this.closeImageMode();
        this.hide();
      }
    }, this));

    if (this.options.disableRightClick) {
      // Disable right click.
      this.$element.contextmenu($.proxy(function (e) {
        e.preventDefault();

        if (this.options.inlineMode) {
          this.$element.focus();
        }

        return false;
      }, this))
    }

    // Mouse up on element.
    this.$element.on('mouseup touchend', $.proxy(function (e) {
      if (!this.isResizing()) {
        var text = this.text();

        // There is text selected.
        if ((text !== '' || this.options.alwaysVisible || this.options.editInPopup || ((e.which == 3 || e.button == 2) && this.options.inlineMode && !this.isImage && this.options.disableRightClick)) && !this.link && !this.imageMode) {
          e.stopPropagation();
          setTimeout($.proxy(function () {
            text = this.text();
            if ((text !== '' || this.options.alwaysVisible || this.options.editInPopup || ((e.which == 3 || e.button == 2) && this.options.inlineMode && !this.isImage && this.options.disableRightClick)) && !this.link && !this.imageMode) {
              this.show(e);

              if (this.options.editInPopup) {
                this.showEditPopup();
              }
            }
          }, this), 0);
        }

        // We are in basic mode. Refresh button state.
        else if (!this.options.inlineMode) {
          e.stopPropagation();
          this.refreshButtons();
        }

        this.imageMode = false;
      }
    }, this));


    // Image click. stop propagation.
    this.$element.on('mousedown', 'img, a', $.proxy(function (e) {
      if (!this.isResizing()) {
        e.stopPropagation();
      }
    }, this));


    // Add resizing data.
    this.$element.on('mousedown touchstart', '.f-img-handle', $.proxy(function () {
      this.$element.attr('data-resize', true);
    }, this));


    // Remove resizing data.
    this.$element.on('mouseup', '.f-img-handle', $.proxy(function (e) {
      var $img = $(e.target).prevAll('img');
      setTimeout($.proxy(function () {
        this.$element.removeAttr('data-resize');
        $img.click();
      }, this), 0);
    }, this));


    // Hide editor if not in inline mode.
    this.$editor.on('mouseup', $.proxy(function (e) {
      if (!this.isResizing()) {
        e.stopPropagation();

        if (this.options.inlineMode === false) {
          this.hide();
        }
      }
    }, this));


    this.$editor.on('mousedown', '.fr-dropdown-menu', $.proxy(function (e) {
      e.stopPropagation();
      this.noHide = true;
    }, this));

    this.$popup_editor.on('mousedown', '.fr-dropdown-menu', $.proxy(function (e) {
      e.stopPropagation();
      this.noHide = true;
    }, this));


    // Mouse up on editor. If we have text or we are in image mode stop it.
    this.$popup_editor.on('mouseup', $.proxy(function (e) {
      if (!this.isResizing()) {
        e.stopPropagation();
      }
    }, this));


    // Stop event propagation in link wrapper.
    if (this.$link_wrapper) {
      this.$link_wrapper.on('mouseup', $.proxy(function (e) {
        if (!this.isResizing()) {
          e.stopPropagation();
          this.$link_wrapper.trigger('hideLinkList');
        }
      }, this));
    }


    // Stop event propagation in link wrapper.
    if (this.$edit_popup_wrapper) {
      this.$edit_popup_wrapper.on('mouseup', $.proxy(function (e) {
        if (!this.isResizing()) {
          e.stopPropagation();
        }
      }, this));
    }


    // Stop event propagation in image wrapper.
    if (this.$image_wrapper) {
      this.$image_wrapper.on('mouseup', $.proxy(function (e) {
        if (!this.isResizing()) {
          e.stopPropagation();
        }
      }, this));
    }


    // Stop event propagation in video wrapper.
    if (this.$video_wrapper) {
      this.$video_wrapper.on('mouseup', $.proxy(function (e) {
        if (!this.isResizing()) {
          e.stopPropagation();
        }
      }, this));
    }


    // Stop event propagation on overlay.
    if (this.$overlay) {
      this.$overlay.on('mouseup', $.proxy(function (e) {
        if (!this.isResizing()) {
          e.stopPropagation();
        }
      }, this));
    }


    // Stop event propagation in modal.
    if (this.$image_modal) {
      this.$image_modal.on('mouseup', $.proxy(function (e) {
        if (!this.isResizing()) {
          e.stopPropagation();
        }
      }, this));
    }

    // Add scrolling event.
    if (this.options.trackScroll) {
      $(window).bind('scroll.' + this._id, $.proxy(function () {
        clearTimeout(this.scrollTimer);
        this.isScrolling = true;
        this.scrollTimer = setTimeout($.proxy(function () {
          this.isScrolling = false;
        }, this), 2500);
      }, this));

      // Mouse up anywhere else.
      $(window).on('scroll', $.proxy(function () {
        $(window).trigger('scroll.' + this._id)
      }, this));
    }

    // Window mouseup for current editor.
    $(window).on('mouseup.' + this._id, $.proxy(function () {
      if (!this.isResizing() && !this.isScrolling) {
        this.$bttn_wrapper.find('button[data-cmd]').removeClass('active');

        if (this.selectionInEditor() && !this.$element.is(':focus') && !this.pasting) {
          this.selectionDisabled = true;
          this.callback('blur');
          this.blurred = true;
          this.clearSelection();
          this.selectionDisabled = false;
        }

        if (this.selectionInEditor() && this.text() !== '' && !this.isTouch()) {
          this.show(null);
        } else if (this.$popup_editor.is(':visible')) {
          this.hide();
          this.closeImageMode();
          this.imageMode = false;
        }
      }
    }, this));


    // Mouse up anywhere else.
    $(window).on('mouseup', $.proxy(function () {
      $(window).trigger('window.' + this._id)
    }, this));


    // Selection changed. Touch support..
    $(document).on('selectionchange.' + this._id, $.proxy(function (e) {
      if (!this.isResizing() && !this.isScrolling) {
        clearTimeout(this.selectionChangedTimeout);
        this.selectionChangedTimeout = setTimeout($.proxy(function () {
          if (this.options.inlineMode && this.selectionInEditor() && this.link !== true && this.isTouch()) {
            var text = this.text();

            // There is text selected.
            if (text !== '') {
              if (!this.iPhone() && !this.iPod()) {
                this.show(null);
              } else {
                this.hide();
              }

              e.stopPropagation();
            } else {
              this.hide();
              this.closeImageMode();
              this.imageMode = false;
            }
          }
        }, this), 75);
      }
    }, this));


    // Selection changed.
    $(document).on('selectionchange', function (e) {
      $(document).trigger('selectionchange.' + this._id, [e]);
    });


    // Key down anywhere on window.
    $(window).bind('keydown.' + this._id, $.proxy(function (e) {
      var keyCode = e.which;

      if (this.imageMode) {
        // Insert br before image if enter is hit.
        if (keyCode == 13) {
          this.$element.find('.f-img-editor').parents('.f-img-wrap').before('<br/>')
          this.sync();
          this.$element.find('.f-img-editor img').click();
          return false;
        }

        // Delete.
        if (keyCode == 46 || keyCode == 8) {
          this.removeImage(this.$element.find('.f-img-editor'));
          return false;
        }
      }

      var ctrlKey = (e.ctrlKey || e.metaKey) && !e.altKey;
      if (!ctrlKey && this.$popup_editor.is(':visible')) {
        this.hide();
        this.closeImageMode();
      }
    }, this));


    // Keydown.
    $(window).bind('keydown', function (e) {
      $(window).trigger('keydown.' + this._id, [e]);
    });


    // Key up anywhere on window.
    $(window).bind('keyup.' + this._id, $.proxy(function () {
      if (this.selectionInEditor() && this.text() !== '') {
        this.repositionEditor();
      }
    }, this));


    // Keydown.
    $(window).bind('keyup', function (e) {
      $(window).trigger('keyup.' + this._id, [e]);
    });
  };

  /**
   * Set textNearImage.
   *
   * @param text - Placeholder text.
   */
  Editable.prototype.setTextNearImage = function (enable) {

    if (enable !== undefined) {
      this.options.textNearImage = enable;
    }

    if (this.options.textNearImage === true) {
      this.$element.removeClass('f-tni');
    } else {
      this.$element.addClass('f-tni');
    }
  };

  /**
   * Set placeholder.
   *
   * @param text - Placeholder text.
   */
  Editable.prototype.setPlaceholder = function (text) {

    if (text) {
      this.options.placeholder = text;
    }

    if (this.$textarea) {
      this.$textarea.attr('placeholder', this.options.placeholder);
    }

    this.$element.attr('data-placeholder', this.options.placeholder);
  };

  Editable.prototype.isEmpty = function () {
    var text = this.$element.text().replace(/(\r\n|\n|\r|\t|\u0020)/gm, '');
    return text === '' &&
      this.$element.find('img, iframe, input').length === 0 &&
      this.$element.find('p > br, div > br').length === 0 &&
      this.$element.find('li, h1, h2, h3, h4, h5, h6, blockquote, pre').length === 0;
  };

  Editable.prototype.fakeEmpty = function ($element) {
    if ($element === undefined) {
      $element = this.$element;
    }

    var text = $element.text().replace(/(\r\n|\n|\r|\t)/gm, '');
    return text === '' && ($element.find('p, div').length == 1 && $element.find('p > br, div > br').length == 1)
      && $element.find('img, table, iframe, input').length === 0;
  }

  Editable.prototype.setPlaceholderEvents = function () {
    this.$element.on('focus', $.proxy(function () {
      if (this.$element.text() === '') {
        this.focus(false);
      }
    }, this))

    this.$element.on('keyup keydown focus placeholderCheck', $.proxy(function () {
      if (this.pasting) {
        return false;
      }

      if (this.options.editInPopup) {
        return false;
      }

      if (!this.isHTML) {
        // Empty.
        if (this.isEmpty() && !this.fakeEmpty() && !this.isHTML) {

          var $p;
          var focused = this.selectionInEditor() || this.$element.is(':focus');

          if (this.options.paragraphy) {
            $p = $('<p><br/></p>');
            this.$element.html($p);

            if (focused) {
              this.setSelection($p.get(0));
            }

            this.$element.addClass('f-placeholder');
          } else {
            this.$element.addClass('f-placeholder');
          }
        }

        // There is a p.
        else if (!this.$element.find('p').length && this.options.paragraphy) {
          // Wrap text.
          this.wrapText();

          // Place cursor.
          if (this.$element.find('p, div').length && this.text() === '') {
            this.setSelection(this.$element.find('p, div')[0], this.$element.find('p, div').text().length, null, this.$element.find('p, div').text().length);
          } else {
            this.$element.removeClass('f-placeholder');
          }
        }

        // Not empty at all.
        else if (this.fakeEmpty() === false || this.$element.find(Editable.VALID_NODES.join(',')).length > 1) {
          this.$element.removeClass('f-placeholder');
        }

        else {
          this.$element.addClass('f-placeholder');
        }
      }
    }, this));

    this.$element.trigger('placeholderCheck');
  };

  /**
   * Set element dimensions.
   *
   * @param width - Editor width.
   * @param height - Editor height.
   */
  Editable.prototype.setDimensions = function (height, width, minHeight, maxHeight) {

    if (height) {
      this.options.height = height;
    }

    if (width) {
      this.options.width = width;
    }

    if (minHeight) {
      this.options.minHeight = minHeight;
    }

    if (maxHeight) {
      this.options.maxHeight = maxHeight;
    }

    if (this.options.height != 'auto') {
      this.$element.css('height', this.options.height);
    }

    if (this.options.minHeight != 'auto') {
      this.$element.css('minHeight', this.options.minHeight);
    }

    if (this.options.maxHeight != 'auto') {
      this.$element.css('maxHeight', this.options.maxHeight);
    }

    if (this.options.width != 'auto') {
      this.$box.css('width', this.options.width);
    }
  };

  /**
   * Set element direction.
   *
   * @param dir - Text direction.
   */
  Editable.prototype.setDirection = function (dir) {
    if (dir) {
      this.options.direction = dir;
    }

    if (this.options.direction != 'ltr' && this.options.direction != 'rtl') {
      this.options.direction = 'ltr';
    }

    if (this.options.direction == 'rtl') {
      this.$element.addClass('f-rtl');
      this.$editor.addClass('f-rtl');
      this.$popup_editor.addClass('f-rtl');
      if (this.$image_modal) {
        this.$image_modal.addClass('f-rtl');
      }
    } else {
      this.$element.removeClass('f-rtl');
      this.$editor.removeClass('f-rtl');
      this.$popup_editor.removeClass('f-rtl');
      if (this.$image_modal) {
        this.$image_modal.removeClass('f-rtl');
      }
    }
  };

  Editable.prototype.setZIndex = function (zIndex) {
    if (zIndex) {
      this.options.zIndex = zIndex;
    }

    this.$editor.css('z-index', this.options.zIndex);
    this.$popup_editor.css('z-index', this.options.zIndex + 1);
    if (this.$overlay) {
      this.$overlay.css('z-index', this.options.zIndex + 2);
    }
    if (this.$image_modal) {
      this.$image_modal.css('z-index', this.options.zIndex + 3);
    }
  }

  Editable.prototype.setTheme = function (theme) {
    if (theme) {
      this.options.theme = theme;
    }

    if (this.options.theme != null) {
      this.$editor.addClass(this.options.theme + '-theme');
      this.$popup_editor.addClass(this.options.theme + '-theme');
      if (this.$box) {
        this.$box.addClass(this.options.theme + '-theme');
      }
      if (this.$image_modal) {
        this.$image_modal.addClass(this.options.theme + '-theme');
      }
    }
  }

  /**
   * Set editor colors.
   *
   * @param color
   */
  Editable.prototype.setBorderColor = function (color) {
    if (color) {
      this.options.borderColor = color;
    }

    var rgb = Editable.hexToRGB(this.options.borderColor);
    if (rgb !== null) {
      this.$editor.css('border-color', this.options.borderColor);
      this.$editor.attr('data-border-color', this.options.borderColor);

      if (this.$image_modal) {
        this.$image_modal.find('.f-modal-wrapper').css('border-color', this.options.borderColor);
      }

      if (!this.options.inlineMode) {
        this.$element.css('border-color', this.options.borderColor);
      }
    }
  };

  Editable.prototype.setSpellcheck = function (enable) {
    if (enable !== undefined) {
      this.options.spellcheck = enable;
    }

    this.$element.attr('spellcheck', this.options.spellcheck);
  };

  Editable.prototype.customizeText = function (customText) {
    if (customText) {
      var list = this.$editor.find('[title]').add(this.$popup_editor.find('[title]'));

      if (this.$image_modal) {
        list = list.add(this.$image_modal.find('[title]'));
      }

      list.each($.proxy(function (index, elem) {
        for (var old_text in customText) {
          if ($(elem).attr('title').toLowerCase() == old_text.toLowerCase()) {
            $(elem).attr('title', customText[old_text]);
          }
        }
      }, this));


      list = this.$editor.find('[data-text="true"]').add(this.$popup_editor.find('[data-text="true"]'))
      if (this.$image_modal) {
        list = list.add(this.$image_modal.find('[data-text="true"]'));
      }

      list.each($.proxy(function (index, elem) {
        for (var old_text in customText) {
          if ($(elem).text().toLowerCase() == old_text.toLowerCase()) {
            $(elem).text(customText[old_text]);
          }
        }
      }, this));
    }
  };

  Editable.prototype.setLanguage = function (lang) {
    if (lang !== undefined) {
      this.options.language = lang;
    }

    if ($.Editable.LANGS[this.options.language]) {
      this.customizeText($.Editable.LANGS[this.options.language].translation);
      if ($.Editable.LANGS[this.options.language].direction) {
        this.setDirection($.Editable.LANGS[this.options.language].direction);
      }

      if ($.Editable.LANGS[this.options.language].translation[this.options.placeholder]) {
        this.setPlaceholder($.Editable.LANGS[this.options.language].translation[this.options.placeholder]);
      }
    }
  };

  Editable.prototype.setCustomText = function (customText) {
    if (customText) {
      this.options.customText = customText;
    }

    if (this.options.customText) {
      this.customizeText(this.options.customText);
    }
  };

  Editable.prototype.execHTML = function () {
    this.html();
  };

  Editable.prototype.initHTMLArea = function () {
    this.$html_area = $('<textarea wrap="hard">').keydown(function (e) {
      var keyCode = e.keyCode || e.which;

      if (keyCode == 9) {
        e.preventDefault();
        var start = $(this).get(0).selectionStart;
        var end = $(this).get(0).selectionEnd;

        // set textarea value to: text before caret + tab + text after caret
        $(this).val($(this).val().substring(0, start) + '\t' + $(this).val().substring(end));

        // put caret at right position again
        $(this).get(0).selectionStart = $(this).get(0).selectionEnd = start + 1;
      }
    });
  };

  Editable.prototype.command_dispatcher = {
    align: function (command) {
      var dropdown = this.buildDropdownAlign(command);
      var btn = this.buildDropdownButton(command, dropdown, 'fr-selector');
      this.$bttn_wrapper.append(btn);
    },

    formatBlock: function (command) {
      var dropdown = this.buildDropdownFormatBlock(command);
      var btn = this.buildDropdownButton(command, dropdown);
      this.$bttn_wrapper.append(btn);
    },

    createLink: function (command) {
      var btn = this.buildDefaultButton(command);
      this.$bttn_wrapper.append(btn);
    },

    insertImage: function (command) {
      var btn = this.buildDefaultButton(command);
      this.$bttn_wrapper.append(btn);
    },

    undo: function (command) {
      var btn = this.buildDefaultButton(command);
      this.$bttn_wrapper.append(btn);
    },

    redo: function (command) {
      var btn = this.buildDefaultButton(command);
      this.$bttn_wrapper.append(btn);
    },

    html: function (command) {
      var btn = this.buildDefaultButton(command);
      this.$bttn_wrapper.append(btn);

      if (this.options.inlineMode) {
        this.$box.append($(btn).clone(true).addClass('html-switch').attr('title', 'Hide HTML').click($.proxy(this.execHTML, this)));
      }

      this.initHTMLArea();
    }
  }

  /**
   * Set buttons for editor.
   *
   * @param buttons
   */
  Editable.prototype.setButtons = function (buttons) {
    if (buttons) {
      this.options.buttons = buttons;
    }

    this.$editor.append('<div class="bttn-wrapper" id="bttn-wrapper-' + this._id + '">');
    this.$bttn_wrapper = this.$editor.find('#bttn-wrapper-' + this._id);

    if (this.isTouch()) {
      this.$bttn_wrapper.addClass('touch');
    }

    var dropdown;
    var btn;

    // Add commands to editor.
    for (var i = 0; i < this.options.buttons.length; i++) {
      var button_name = this.options.buttons[i];

      if (button_name == 'sep') {
        if (this.options.inlineMode) {
          this.$bttn_wrapper.append('<div class="f-clear"></div><hr/>');
        } else {
          this.$bttn_wrapper.append('<span class="f-sep"></span>');
        }
        continue;
      }

      var command = Editable.commands[button_name];
      if (command === undefined) {
        command = this.options.customButtons[button_name];

        if (command === undefined) {
          command = this.options.customDropdowns[button_name];

          if (command === undefined) {
            continue;
          }
          else {
            btn = this.buildCustomDropdown(command);
            this.$bttn_wrapper.append(btn);
            continue;
          }
        } else {
          btn = this.buildCustomButton(command);
          this.$bttn_wrapper.append(btn);
          continue;
        }
      }

      command.cmd = button_name;

      var command_dispatch = this.command_dispatcher[command.cmd];

      if (command_dispatch) {
        command_dispatch.apply(this, [command]);
      } else {
        if (command.seed) {
          dropdown = this.buildDefaultDropdown(command);
          btn = this.buildDropdownButton(command, dropdown);
        } else {
          btn = this.buildDefaultButton(command);
        }

        this.$bttn_wrapper.append(btn);
      }
    }

    this.$bttn_wrapper.find('button[data-cmd="undo"], button[data-cmd="redo"]').prop('disabled', true);

    // Create link anyway.
    this.buildCreateLink();

    // Init image anyway.
    this.buildInsertImage();
    if (this.options.mediaManager) {
      this.buildMediaManager();
    }

    // Assign events.
    this.bindButtonEvents();
  };

  /**
   * Create button for command.
   *
   * @param command - Command name.
   * @returns {*}
   */
  Editable.prototype.buildDefaultButton = function (command) {
    var btn = '<button type="button" class="fr-bttn" title="' + command.title + '" data-cmd="' + command.cmd + '">';

    if (this.options.icons[command.cmd] === undefined) {
      btn += this.addButtonIcon(command);
    } else {
      btn += this.prepareIcon(this.options.icons[command.cmd], command.title);
    }

    btn += '</button>';

    return btn;
  };

  /*
   * Prepare icon.
   */
  Editable.prototype.prepareIcon = function (icon, title) {
    switch (icon.type) {
      case 'font':
        return this.addButtonIcon({
          icon: icon.value
        });

      case 'img':
        return this.addButtonIcon({
          icon_img: icon.value,
          title: title
        });

      case 'txt':
        return this.addButtonIcon({
          icon_txt: icon.value
        });
    }
  };


  /**
   * Add icon to button.
   *
   * @param $btn - jQuery object.
   * @param command - Command name.
   */
  Editable.prototype.addButtonIcon = function (command) {
    if (command.icon) {
      return '<i class="' + command.icon + '"></i>';
    } else if (command.icon_alt) {
      return '<i class="for-text">' + command.icon_alt + '</i>';
    } else if (command.icon_img) {
      return '<img src="' + command.icon_img + '" alt="' + command.title + '"/>';
    } else if (command.icon_txt) {
      return '<i>' + command.icon_txt + '</i>';
    } else {
      return command.title;
    }
  };

  Editable.prototype.buildCustomButton = function (button) {
    var $btn = $('<button type="button" class="fr-bttn" title="' + button.title + '">' + this.prepareIcon(button.icon, button.title) + '</button>');

    $btn.on('click touchend', $.proxy(function (e) {
      e.stopPropagation();
      e.preventDefault();

      button.callback.apply(this);
    }, this));

    return $btn;
  };

  Editable.prototype.callDropdown = function ($btn, button, text) {
    $btn.on('click touch', $.proxy(function () {
      button.options[text].apply(this);
    }, this))
  };

  Editable.prototype.buildCustomDropdown = function (button) {
    // Dropdown button.
    var btn_wrapper = '<div class="fr-bttn fr-dropdown">';

    btn_wrapper += '<button type="button" class="fr-trigger" title="' + button.title + '">' + this.prepareIcon(button.icon, button.title) + '</button>';

    var $dropdown = $('<ul class="fr-dropdown-menu"></ul>');

    for (var text in button.options) {
      var $btn = $('<a href="#">' + text + '</a>');
      var $m_btn = $('<li>').append($btn);

      this.callDropdown($btn, button, text)
      $dropdown.append($m_btn);
    }

    return $(btn_wrapper).append($dropdown);
  };

  /**
   * Default dropdown.
   *
   * @param command - Command.
   * @param cls - Dropdown custom class.
   * @returns {*}
   */
  Editable.prototype.buildDropdownButton = function (command, dropdown, cls) {
    cls = cls || '';

    // Dropdown button.
    var btn_wrapper = '<div class="fr-bttn fr-dropdown ' + cls + '" data-name="' + command.cmd + '">';

    var btn = '<button type="button" class="fr-trigger" title="' + command.title + '">' + this.addButtonIcon(command) + '</button>';

    btn_wrapper += btn;
    btn_wrapper += dropdown;
    btn_wrapper += '</div>';

    return btn_wrapper;
  };

  /**
   * Dropdown for align.
   *
   * @param command
   * @returns {*}
   */
  Editable.prototype.buildDropdownAlign = function (command) {
    var dropdown = '<ul class="fr-dropdown-menu f-align">';

    // Iterate color seed.
    for (var j = 0; j < command.seed.length; j++) {
      var align = command.seed[j];

      dropdown += '<li data-cmd="' + align.cmd + '" title="' + align.title + '"><a href="#"><i class="' + align.icon + '"></i></a></li>';
    }

    dropdown += '</ul>';

    return dropdown;
  };



  /**
   * Dropdown for formatBlock.
   *
   * @param command
   * @returns {*}
   */
  Editable.prototype.buildDropdownFormatBlock = function (command) {
    var dropdown = '<ul class="fr-dropdown-menu">';

    // Iterate format block seed.
    for (var j = 0; j < command.seed.length; j++) {
      var cmd = command.seed[j];

      if ($.inArray(cmd.value, this.options.blockTags) == -1) {
        continue;
      }

      var format_btn = '<li data-cmd="' + command.cmd + '" data-val="' + cmd.value + '">';
      format_btn += '<a href="#" data-text="true" class="format-' + cmd.value + '" title="' + cmd.title + '">' + cmd.title + '</a></li>';

      dropdown += format_btn;
    }

    dropdown += '</ul>';

    return dropdown;
  };

  /**
   * Dropdown for formatBlock.
   *
   * @param command
   * @returns {*}
   */
  Editable.prototype.buildDefaultDropdown = function (command) {
    var dropdown = '<ul class="fr-dropdown-menu">';

    // Iterate format block seed.
    for (var j = 0; j < command.seed.length; j++) {
      var cmd = command.seed[j];

      var format_btn = '<li data-cmd="' + (cmd.cmd || command.cmd) + '" data-val="' + cmd.value + '" data-param="' + (cmd.param || command.param) + '">'
      format_btn += '<a href="#" data-text="true" class="' + cmd.value + '" title="' + cmd.title + '">' + cmd.title + '</a></li>';

      dropdown += format_btn;
    }

    dropdown += '</ul>';

    return dropdown;
  };

  Editable.prototype.createEditPopupHTML = function () {
    var html = '<div class="froala-popup froala-text-popup" style="display:none;">';
    html += '<h4><span data-text="true">Edit text</span><i title="Cancel" class="fa fa-times" id="f-text-close-' + this._id + '"></i></h4></h4>';
    html += '<div class="f-popup-line"><input type="text" placeholder="http://www.taihuoniao.com" class="f-lu" id="f-ti-' + this._id + '">';
    html += '<button data-text="true" type="button" class="f-ok" id="f-edit-popup-ok-' + this._id + '">OK</button>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  /**
   * Build create link.
   */
  Editable.prototype.buildEditPopup = function () {
    this.$edit_popup_wrapper = $(this.createEditPopupHTML());
    this.$popup_editor.append(this.$edit_popup_wrapper);

    this.$edit_popup_wrapper.find('#f-ti-' + this._id).on('mouseup keydown', function (e) {
      e.stopPropagation();
    });

    this.addListener('hidePopups', $.proxy(function () {
      this.$edit_popup_wrapper.hide();
    }, this));

    this.$edit_popup_wrapper.on('click', '#f-edit-popup-ok-' + this._id, $.proxy(function () {
      this.$element.text(this.$edit_popup_wrapper.find('#f-ti-' + this._id).val());
      this.sync();
      this.hide();
    }, this));

    // Close button.
    this.$edit_popup_wrapper
      .on('click', 'i#f-text-close-' + this._id, $.proxy(function () {
        this.hide();
      }, this))
  };

  /**
   * Make request with CORS.
   *
   * @param method
   * @param url
   * @returns {XMLHttpRequest}
   */
  Editable.prototype.createCORSRequest = function (method, url) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {

      // Check if the XMLHttpRequest object has a "withCredentials" property.
      // "withCredentials" only exists on XMLHTTPRequest2 objects.
      xhr.open(method, url, true);

      // Set with credentials.
      if (this.options.withCredentials) {
        xhr.withCredentials = true;
      }

      // Set headers.
      for (var header in this.options.headers) {
        xhr.setRequestHeader(header, this.options.headers[header]);
      }

    } else if (typeof XDomainRequest != 'undefined') {

      // Otherwise, check if XDomainRequest.
      // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
      xhr = new XDomainRequest();
      xhr.open(method, url);
    } else {
      // Otherwise, CORS is not supported by the browser.
      xhr = null;

    }
    return xhr;
  };

  /**
   * Check if command is enabled.
   *
   * @param cmd - Command name.
   * @returns {boolean}
   */
  Editable.prototype.isEnabled = function (cmd) {
    return $.inArray(cmd, this.options.buttons) >= 0;
  };


  /**
   * Bind events for buttons.
   */
  Editable.prototype.bindButtonEvents = function () {
    this.bindDropdownEvents();

    this.bindCommandEvents();
  };

  Editable.prototype.canTouch = function (e) {
    var elem = e.currentTarget;

    if (e.type == 'touchend') {
      $(elem).data('touched', true);
    }

    if (e.type == 'mouseup' && e.which != 1) {
      return false;
    }

    if (e.type == 'mouseup' && $(elem).data('touched')) {
      return false;
    }

    return true;
  }

  /**
   * Bind events for dropdown.
   */
  Editable.prototype.bindDropdownEvents = function () {
    var that = this;

    // Dropdown event.
    this.$bttn_wrapper.on('mouseup touchend', '.fr-dropdown .fr-trigger', function (e) {
      e.stopPropagation();
      e.preventDefault();

      if (!that.canTouch(e)) return false;

      if (e.type == 'touchend' && that.android()) {
        that.saveSelectionByMarkers();
        setTimeout(function () {
          that.restoreSelectionByMarkers();
        }, 10);
      }

      if (that.options.inlineMode === false) {
        that.hide();
      }

      $(this)
        .toggleClass('active')
        .trigger('blur');

      that.closeImageMode();
      that.refreshButtons();
      that.imageMode = false;

      that.$bttn_wrapper.find('.fr-dropdown').not($(this).parent())
        .find('.fr-trigger')
        .removeClass('active');
    });

    $(window).on('mouseup selectionchange', $.proxy(function () {
      this.$bttn_wrapper.find('.fr-dropdown .fr-trigger').removeClass('active');
    }, this));

    this.$element.on('mouseup', 'img, a', $.proxy(function () {
      this.$bttn_wrapper.find('.fr-dropdown .fr-trigger').removeClass('active');
    }, this));

    // Dropdown selector event.
    this.$bttn_wrapper.find('.fr-selector button.fr-bttn')
      .bind('select', function () {
        $(this).parents('.fr-selector').find(' > button > i').attr('class', $(this).find('i').attr('class'));
      })
      .on('click touch', function () {
        $(this).parents('ul').find('button').removeClass('active');
        $(this).parents('.fr-selector').removeClass('active').trigger('mouseout');
        $(this).trigger('select');
      });


    this.$bttn_wrapper.on('click', 'li[data-cmd] > a', function (e) {
      e.preventDefault();
    });
  };

  /**
   * Bind events for button command.
   */
  Editable.prototype.bindCommandEvents = function () {
    var that = this;

    this.$bttn_wrapper.on('mouseup touchend touchmove', 'button[data-cmd], li[data-cmd], span[data-cmd]', $.proxy(function (e) {
      var elem = e.currentTarget;

      if (e.type != 'touchmove') {
        e.stopPropagation();
        e.preventDefault();

        if (!this.canTouch(e)) return false;

        if ($(elem).data('dragging')) {
          $(elem).removeData('dragging');
          return false;
        }

        var cmd = $(elem).data('cmd');
        var val = $(elem).data('val');
        var param = $(elem).data('param');

        if (e.type == 'touchend' && that.android()) {
          this.saveSelectionByMarkers();
        }

        that.exec(cmd, val, param);
        that.$bttn_wrapper.find('.fr-dropdown .fr-trigger').removeClass('active');

        if (e.type == 'touchend' && that.android()) {
          this.restoreSelectionByMarkers();
        }
      }

      else {
        $(elem).data('dragging', true);
      }
    }, this));
  };

  /**
   * Undo.
   */
  Editable.prototype.undo = function () {
    if (this.undoIndex > 1) {
      var cHTML = this.getHTML();

      var step = this.undoStack[--this.undoIndex - 1];
      this.$element.html(step);
      this.restoreSelectionByMarkers();

      // (newHTML, oldHTML)
      this.callback('undo', [this.getHTML(), cHTML]);

      if (this.text() !== '') {
        this.repositionEditor();
      }
      else {
        this.hide();
      }

      this.refreshUndoRedo();
      this.focus();
      this.refreshButtons();
    }
  };

  /**
   * Redo.
   */
  Editable.prototype.redo = function () {
    if (this.undoIndex < this.undoStack.length) {
      var cHTML = this.$element.html();

      var step = this.undoStack[this.undoIndex++];
      this.$element.html(step);
      this.restoreSelectionByMarkers();

      // (newHTML, oldHTML)
      this.callback('redo', [this.getHTML(), cHTML]);

      if (this.text() !== '') {
        this.repositionEditor();
      }
      else {
        this.hide();
      }

      this.refreshUndoRedo();
      this.focus();
      this.refreshButtons();
    }
  };

  /**
   * Save in DB.
   */
  Editable.prototype.save = function () {
    if (!this.callback('beforeSave', [], false)) {
      return false;
    }

    if (this.options.saveURL) {
      var params = {};
      for (var key in this.options.saveParams) {
        var param = this.options.saveParams[key];
        if (typeof(param) == 'function') {
          params[key] = param.call(this);
        } else {
          params[key] = param;
        }
      }

      $.ajax({
        type: this.options.saveRequestType,
        url: this.options.saveURL,
        data: $.extend({ body: this.getHTML() }, this.options.saveParams),
        crossDomain: this.options.crossDomain,
        xhrFields: {
          withCredentials: this.options.withCredentials
        },
        headers: this.options.headers
      })
      .done($.proxy(function (data) {
        // data
        this.callback('afterSave', [data]);
      }, this))
      .fail($.proxy(function () {
        // (error)
        this.callback('saveError', ['Save request failed on the server.']);
      }, this));

    } else {
      // (error)
      this.callback('saveError', ['Missing save URL.']);
    }
  };

  Editable.prototype.sanitizeURL = function (url) {
    if (/^https?:\/\//.test(url)) {
      url = String(url)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
    }
    else {
      url = encodeURIComponent(url)
                .replace(/%23/g, '#')
                .replace(/%2F/g, '/')
                .replace(/%25/g, '%')
                .replace(/mailto%3A/g, 'mailto:')
                .replace(/%3F/g, '?')
                .replace(/%3D/g, '=')
                .replace(/%26/g, '&')
                .replace(/%2C/g, ',')
                .replace(/%3B/g, ';')
                .replace(/%2B/g, '+')
                .replace(/%40/g, '@');
    }

    return url;
  }

  Editable.prototype.option = function (prop, val) {
    if (prop === undefined) {
      return this.options;
    } else if (prop instanceof Object) {
      this.options = $.extend({}, this.options, prop);

      this.initOptions();
      this.setCustomText();
      this.setLanguage();
    } else if (val !== undefined) {
      this.options[prop] = val;

      switch (prop) {
        case 'borderColor':
          this.setBorderColor();
          break;
        case 'direction':
          this.setDirection();
          break;
        case 'height':
        case 'width':
        case 'minHeight':
        case 'maxHeight':
          this.setDimensions();
          break;
        case 'spellcheck':
          this.setSpellcheck();
          break;
        case 'placeholder':
          this.setPlaceholder();
          break;
        case 'customText':
          this.setCustomText();
          break;
        case 'language':
          this.setLanguage();
          break;
        case 'textNearImage':
          this.setTextNearImage();
          break;
        case 'zIndex':
          this.setZIndex();
          break;
        case 'theme':
          this.setTheme();
          break;
      }
    } else {
      return this.options[prop];
    }
  };

  // EDITABLE PLUGIN DEFINITION
  // ==========================

  var old = $.fn.editable;

  $.fn.editable = function (option) {
    var arg_list = [];
    for (var i = 0; i < arguments.length; i++) {
      arg_list.push(arguments[i]);
    }

    if (typeof option == 'string') {
      var returns = [];

      this.each(function () {
        var $this = $(this);
        var editor = $this.data('fa.editable');

        if (editor[option]) {
          var returned_value = editor[option].apply(editor, arg_list.slice(1));
          if (returned_value === undefined) {
            returns.push(this);
          } else if (returns.length === 0) {
            returns.push(returned_value);
          }
        }
        else {
          return $.error('Method ' +  option + ' does not exist in Froala Editor.');
        }
      });

      return (returns.length == 1) ? returns[0] : returns;
    }
    else if (typeof option === 'object' || !option) {
      return this.each(function () {
        var that = this;
        var $this = $(that);
        var editor = $this.data('fa.editable');

        if (!editor) $this.data('fa.editable', (editor = new Editable(that, option)));
      });
    }
  };

  $.fn.editable.Constructor = Editable;
  $.Editable = Editable;

  $.fn.editable.noConflict = function () {
    $.fn.editable = old;
    return this;
  };
}(window.jQuery);

(function ($) {
  $.Editable.commands = {
    bold: {
      title: 'Bold',
      icon: 'fa fa-bold',
      shortcut: '(Ctrl + B)'
    },

    italic: {
      title: 'Italic',
      icon: 'fa fa-italic',
      shortcut: '(Ctrl + I)'
    },

    underline: {
      cmd: 'underline',
      title: 'Underline',
      icon: 'fa fa-underline',
      shortcut: '(Ctrl + U)'
    },

    strikeThrough: {
      title: 'Strikethrough',
      icon: 'fa fa-strikethrough'
    },

    formatBlock: {
      title: 'Format Block',
      icon: 'fa fa-paragraph',
      seed: [{
        value: 'n',
        title: 'Normal'
      }, {
        value: 'p',
        title: 'Paragraph'
      }, {
        value: 'pre',
        title: 'Code'
      }, {
        value: 'blockquote',
        title: 'Quote'
      }, {
        value: 'h1',
        title: 'Heading 1'
      }, {
        value: 'h2',
        title: 'Heading 2'
      }, {
        value: 'h3',
        title: 'Heading 3'
      }, {
        value: 'h4',
        title: 'Heading 4'
      }, {
        value: 'h5',
        title: 'Heading 5'
      }, {
        value: 'h6',
        title: 'Heading 6'
      }]
    },

    align: {
      title: 'Alignment',
      icon: 'fa fa-align-center',
      seed: [{
        cmd: 'justifyLeft',
        title: 'Align Left',
        icon: 'fa fa-align-left'
      }, {
        cmd: 'justifyCenter',
        title: 'Align Center',
        icon: 'fa fa-align-center'
      }, {
        cmd: 'justifyRight',
        title: 'Align Right',
        icon: 'fa fa-align-right'
      }, {
        cmd: 'justifyFull',
        title: 'Justify',
        icon: 'fa fa-align-justify'
      }]
    },

    insertOrderedList: {
      title: 'Numbered List',
      icon: 'fa fa-list-ol'
    },

    insertUnorderedList: {
      title: 'Bulleted List',
      icon: 'fa fa-list-ul'
    },

    outdent: {
      title: 'Indent Less',
      icon: 'fa fa-dedent',
      activeless: true,
      shortcut: '(Ctrl + <)'
    },

    indent: {
      title: 'Indent More',
      icon: 'fa fa-indent',
      activeless: true,
      shortcut: '(Ctrl + >)'
    },

    selectAll: {
      title: 'Select All',
      icon: 'fa fa-file-text',
      shortcut: '(Ctrl + A)'
    },

    createLink: {
      title: 'Insert Link',
      icon: 'fa fa-link',
      shortcut: '(Ctrl + K)'
    },

    insertImage: {
      title: 'Insert Image',
      icon: 'fa fa-picture-o',
      activeless: true,
      shortcut: '(Ctrl + P)'
    },

    undo: {
      title: 'Undo',
      icon: 'fa fa-undo',
      activeless: true,
      shortcut: '(Ctrl+Z)',
      disabled: function () { return true; }
    },

    redo: {
      title: 'Redo',
      icon: 'fa fa-repeat',
      activeless: true,
      shortcut: '(Shift+Ctrl+Z)',
      disabled: function () { return true; }
    },

    html: {
      title: 'Show HTML',
      icon: 'fa fa-code'
    },

    save: {
      title: 'Save',
      icon: 'fa fa-floppy-o'
    },

    insertHorizontalRule: {
      title: 'Insert Horizontal Line',
      icon: 'fa fa-minus'
    }
  };

  $.Editable.prototype.execCommand = {
    formatBlock: function (cmd, val) {
      this.formatBlock(val);
    },

    createLink: function () {
      this.insertLink();
    },

    insertImage: function () {
      this.insertImage();
    },

    indent: function () {
      this.indent();
    },

    outdent: function () {
      this.outdent(true);
    },

    justifyLeft: function (cmd) {
      this.align(cmd);
    },

    justifyRight: function (cmd) {
      this.align(cmd);
    },

    justifyCenter: function (cmd) {
      this.align(cmd);
    },

    justifyFull: function (cmd) {
      this.align(cmd);
    },

    insertOrderedList: function (cmd) {
      this.formatList(cmd);
    },

    insertUnorderedList: function (cmd) {
      this.formatList(cmd);
    },

    undo: function () {
      this.undo();
    },

    redo: function () {
      this.redo();
    },

    html: function () {
      this.html();
    },

    save: function () {
      this.save();
    },

    selectAll: function (cmd, val) {
      this.$element.focus();
      this.execDefault(cmd, val);
    },

    insertHorizontalRule: function (cmd, val) {
      this.execDefault(cmd, val);
      this.hide();
    }
  };


  /**
   * Exec command.
   *
   * @param cmd
   * @param val
   * @returns {boolean}
   */
  $.Editable.prototype.exec = function (cmd, val, param) {
    var cmds_without_selection = [
      'html', 'undo', 'redo', 'selectAll', 'save',
      'insertImage', 'insertVideo', 'insertTable'
    ];

    if (!this.selectionInEditor() && cmds_without_selection.indexOf(cmd) < 0) {
      return false;
    } else if (this.selectionInEditor()) {
      // Start in this mode.
      if (this.text() === '') {
        if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline' || cmd == 'strikeThrough') {
          this._startInDefault(cmd);
          return false;
        }

        else if (cmd == 'fontSize') {
          this._startInFontExec('font-size', cmd, val);
          return false;
        }

        else if (cmd == 'fontFamily') {
          this._startInFontExec('font-family', cmd, val);
          return false;
        }

        else if (cmd == 'backColor') {
          this._startInFontExec('background-color', cmd, val);
          return false;
        }

        else if (cmd == 'foreColor') {
          this._startInFontExec('color', cmd, val);
          return false;
        }
      }

      var no_selection_cmds = [
        'insertHorizontalRule', 'fontSize', 'formatBlock', 'blockStyle', 'indent', 'outdent',
        'justifyLeft', 'justifyRight', 'justifyFull', 'justifyCenter', 'html', 'undo', 'redo',
        'selectAll', 'save', 'insertImage', 'insertVideo', 'insertOrderedList', 'insertUnorderedList',
        'insertTable', 'insertRowAbove', 'insertRowBelow', 'deleteRow', 'insertColumnBefore',
        'insertColumnAfter', 'deleteColumn', 'insertHeader', 'deleteHeader', 'insertCellBefore',
        'insertCellAfter', 'deleteCell', 'mergeCells', 'splitHorizontal', 'splitVertical', 'deleteTable'
      ];

      if (this.text() === '' && no_selection_cmds.indexOf(cmd) < 0) {
        return false;
      }
    }

    if (this.execCommand[cmd]) {
      this.execCommand[cmd].apply(this, [cmd, val, param]);
    } else {
      this.execDefault(cmd, val);
    }

    var no_undo = ['undo', 'redo', 'selectAll', 'createLink', 'insertImage', 'html', 'insertVideo'];
    if (no_undo.indexOf(cmd) < 0) {
      this.saveUndoStep();
    }

    if (cmd != 'createLink' && cmd != 'insertImage') {
      this.refreshButtons();
    }
  };

  /**
   * Set html.
   */
  $.Editable.prototype.html = function () {
    var html;

    if (this.isHTML) {
      this.isHTML = false;

      html = this.$html_area.val();
      html = this.clean(html, true, false);

      this.$box.removeClass('f-html');
      this.$html_area.blur();

      this.no_verify = true;
      this.$element.html(html);
      this.cleanify(false);
      this.no_verify = false;

      this.$element.attr('contenteditable', true);
      this.$editor.find('.fr-bttn:not([data-cmd="html"]), .fr-trigger').prop('disabled', false);
      this.$editor.find('.fr-bttn[data-cmd="html"]').removeClass('active');
      this.saveUndoStep();

      if (this.options.paragraphy) {
        this.wrapText();
      }

      // Hack to focus right.
      this.$element.blur();
      this.focus();

      this.refreshButtons();

      // (html)
      this.callback('htmlHide', [html]);

    } else {
      this.$element.removeClass('f-placeholder');

      this.cleanify(false);

      if (this.options.inlineMode) {
        html = '\n\n' + this.cleanTags(this.getHTML(false, false));
      } else {
        html = this.cleanTags(this.getHTML(false, false));
      }

      html = html.replace(/\&amp;/g, '&')

      this.$html_area.val(html).trigger('resize');

      if (this.options.inlineMode) {
        this.$box.find('.html-switch').css('top', this.$box.css('padding-top'));
      }

      this.$html_area.css('height', this.$element.height() - 1);
      this.$element.html('').append(this.$html_area).removeAttr('contenteditable');
      this.$box.addClass('f-html');
      this.$editor.find('button.fr-bttn:not([data-cmd="html"]), button.fr-trigger').prop('disabled', true);
      this.$editor.find('.fr-bttn[data-cmd="html"]').addClass('active');

      this.hide();
      this.imageMode = false;

      this.isHTML = true;

      this.$element.blur();

      this.$element.removeAttr('contenteditable');

      // html
      this.callback('htmlShow', [html]);
    }
  };

  /**
   * Format block.
   *
   * @param val
   */
  $.Editable.prototype.formatBlock = function (val, cls, param) {
    if (this.disabledList.indexOf('formatBlock') >= 0) {
      return false;
    }

    if (this.browser.msie && $.Editable.getIEversion() < 9) {
      document.execCommand('formatBlock', false, '<' + val + '>');
      return false;
    }

    // Wrap text.
    this.saveSelectionByMarkers();
    this.wrapText();
    this.restoreSelectionByMarkers();

    var elements = this.getSelectionElements();
    this.saveSelectionByMarkers();
    var $sel;

    for (var i = 0; i < elements.length; i++) {
      var $element = $(elements[i]);

      if (this.fakeEmpty($element)) {
        continue;
      }

      // Format or no format.
      if (val == 'n') {
        if (this.options.paragraphy) {
          $sel = $('<div>').html($element.html());
        }
        else {
          $sel = $element.html() + '<br/>';
        }
      } else {
        $sel = $('<' + val + '>').html($element.html());
      }

      if ($element.get(0) != this.$element.get(0) && $element.get(0).tagName != 'LI' && $element.get(0).tagName != 'TD' && $element.get(0).tagName != 'TH') {
        var attributes = $element.prop('attributes');

        // Set attributes but not class.
        if ($sel.attr) {
          for (var j = 0; j < attributes.length; j++) {
            if (attributes[j].name !== 'class') {
              $sel.attr(attributes[j].name, attributes[j].value);
            }
          }
        }

        var block_style;
        if (this.options.blockStyles) {
          this.options.blockStyles[val];
        }

        if (block_style === undefined) {
          block_style = this.options.defaultBlockStyle;
        }

        try {
          // Remove the class if it is checked.
          if ($element.hasClass(cls)) {
            $sel.addClass($element.attr('class')).removeClass(cls);
          }

          // Class should be added. Remove other styles for it.
          else {
            // Filter class.
            if ($element.attr('class') !== undefined && block_style !== undefined && (this.options.blockStylesToggle || param == 'toggle')) {
              var classes = $element.attr('class').split(' ');

              // Check each class of the current element.
              for (var k = 0; k < classes.length; k++) {
                var m_cls = classes[k];

                // Add class to the element if it is not in the list.
                if (block_style[m_cls] === undefined && param === undefined) {
                  $sel.addClass(m_cls);
                } else if (block_style[m_cls] !== undefined && param === 'toggle') {
                  $sel.addClass(m_cls);
                }
              }
            }
            else {
              $sel.addClass($element.attr('class'))
            }

            if (cls != '*') {
              $sel.addClass(cls);
            }
          }
        }
        catch (ex) {}

        $element.replaceWith($sel);
      } else {
        $element.html($sel);
      }
    }

    this.unwrapText();
    this.restoreSelectionByMarkers();

    this.callback('formatBlock');

    this.repositionEditor();
  };

  /**
   * Format list.
   *
   * @param val
   */
  $.Editable.prototype.formatList = function (cmd) {
    if (this.browser.msie && $.Editable.getIEversion() < 9) {
      document.execCommand(cmd, false, false);
      return false;
    }

    var replace_list = false;
    if (!this.isActive(cmd)) {
      replace_list = true;
    }

    this.saveSelectionByMarkers();

    var elements = this.getSelectionElements();

    var all = true;
    var replaced = false;

    var $element;

    // Clean elements.
    for (var i = 0; i < elements.length; i++) {
      $element = $(elements[i]);

      // Check if current element rezides in LI.
      if ($element.parents('li').length > 0 || $element.get(0).tagName == 'LI') {
        var $li;
        if ($element.get(0).tagName == 'LI') {
          $li = $element;
        }
        else {
          $li = $element.parents('li');
        }

        // Mark where to close and open again ol.
        if ($element.parents('ol').length > 0) {
          $li.before('<span class="close-ol" data-fr-verified="true"></span>');
          $li.after('<span class="open-ol" data-fr-verified="true"></span>');
        }

        // Mark where to close and open again ul.
        else if ($element.parents('ul').length > 0) {
          $li.before('<span class="close-ul" data-fr-verified="true"></span>');
          $li.after('<span class="open-ul" data-fr-verified="true"></span>');
        }
        $li.replaceWith($li.contents());

        replaced = true;
      } else {
        all = false;
      }
    }

    if (replaced) {
      this.$element.find('ul, ol').each (function (index, list) {
        var $list = $(list);

        var oldHTML = '<' + list.tagName.toLowerCase() + '>' + $list.html() + '</' + list.tagName.toLowerCase() + '>';
        oldHTML = oldHTML.replace(new RegExp('<span class="close-ul" data-fr-verified="true"></span>', 'g'), '</ul>');
        oldHTML = oldHTML.replace(new RegExp('<span class="open-ul" data-fr-verified="true"></span>', 'g'), '<ul>');
        oldHTML = oldHTML.replace(new RegExp('<span class="close-ol" data-fr-verified="true"></span>', 'g'), '</ol>');
        oldHTML = oldHTML.replace(new RegExp('<span class="open-ol" data-fr-verified="true"></span>', 'g'), '<ol>');
        $list.replaceWith(oldHTML);
      })

      // Remove empty ul and ol.
      this.$element.find('ul, ol').each (function (index, list) {
        var $list = $(list);
        if ($list.find('li').length === 0) {
          $list.remove();
        }
      });
    }

    this.clearSelection();

    if (all === false || replace_list === true) {

      this.wrapText();

      this.restoreSelectionByMarkers();

      elements = this.getSelectionElements();

      this.saveSelectionByMarkers();

      var $list = $('<ol>');
      if (cmd == 'insertUnorderedList') {
        $list = $('<ul>');
      }
      for (var j = 0; j < elements.length; j++) {
        $element = $(elements[j]);

        if ($element.get(0) == this.$element.get(0)) {
          continue;
        }

        $list.append($('<li>').append($element.clone()));
        if (j != elements.length - 1) {
          $element.remove();
        } else {
          $element.replaceWith($list);
          $list.find('li');
        }
      }

      this.unwrapText();
    }

    this.restoreSelectionByMarkers();

    this.repositionEditor();

    this.callback(cmd);
  };

  /**
   * Align.
   *
   * @param val
   */
  $.Editable.prototype.align = function (val) {
    if (this.browser.msie && $.Editable.getIEversion() < 9) {
      document.execCommand(val, false, false);
      return false;
    }

    var elements = this.getSelectionElements();

    if (val == 'justifyLeft') {
      val = 'left';
    } else if (val == 'justifyRight') {
      val = 'right';
    } else if (val == 'justifyCenter') {
      val = 'center';
    } else if (val == 'justifyFull') {
      val = 'justify';
    }

    for (var i = 0; i < elements.length; i++) {
      $(elements[i]).css('text-align', val);
    }

    this.repositionEditor();

    // (val)
    this.callback('align', [val]);
  };

  /**
   * Indent.
   *
   * @param outdent - boolean.
   */
  $.Editable.prototype.indent = function (outdent) {
    if (this.browser.msie && $.Editable.getIEversion() < 9) {
      if (!outdent) {
        document.execCommand('indent', false, false);
      } else {
        document.execCommand('outdent', false, false);
      }
      return false;
    }

    var margin = 20;
    if (outdent) {
      margin = -20;
    }

    // Wrap text.
    this.saveSelectionByMarkers();
    this.wrapText();
    this.restoreSelectionByMarkers();

    var elements = this.getSelectionElements();

    this.saveSelectionByMarkers();

    for (var i = 0; i < elements.length; i++) {
      var $element = $(elements[i]);

      if ($element.parentsUntil(this.$element, 'li').length > 0) {
        $element = $element.parentsUntil(this.$element, 'li');
      }

      if ($element.get(0) != this.$element.get(0)) {
        var oldMargin = parseInt($element.css('margin-left').replace(/px/, ''), 10);
        var newMargin = Math.max(0, oldMargin + margin);
        $element.css('marginLeft', newMargin);

        if ($element.get(0).tagName === 'LI') {
          if (newMargin % 60 === 0) {
            if ($element.parents('ol').length === 0) {
              $element.css('list-style-type', 'disc');
            } else {
              $element.css('list-style-type', 'decimal');
            }
          }
          else if (newMargin % 40 === 0) {
            if ($element.parents('ol').length === 0) {
              $element.css('list-style-type', 'square');
            } else {
              $element.css('list-style-type', 'lower-latin');
            }
          }
          else {
            if ($element.parents('ol').length === 0) {
              $element.css('list-style-type', 'circle');
            } else {
              $element.css('list-style-type', 'lower-roman');
            }
          }
        }
      } else {
        var $sel = $('<div>').html($element.html());
        $element.html($sel);
        $sel.css('marginLeft', Math.max(0, margin));
      }
    }

    this.unwrapText();
    this.restoreSelectionByMarkers();
    this.repositionEditor();

    if (!outdent) {
      this.callback('indent');
    }
  };

  /**
   * Outdent.
   */
  $.Editable.prototype.outdent = function () {
    this.indent(true);

    this.callback('outdent');
  };

  /**
   * Insert link.
   */
  $.Editable.prototype.insertLink = function () {
    this.showInsertLink();

    if (!this.options.inlineMode) {
      this.positionPopup('createLink');
    }

    this.saveSelection();

    var link = this.getSelectionLink() || '';
    var links = this.getSelectionLinks();
    if (links.length > 0) {
      this.$link_wrapper.find('input[type="checkbox"]').prop('checked', $(links[0]).attr('target') == '_blank');
    } else {
      this.$link_wrapper.find('input[type="checkbox"]').prop('checked', this.options.alwaysBlank);
    }

    this.$link_wrapper.find('.f-external-link').attr('href', link || '#');
    this.$link_wrapper.find('input[type="text"]').val(link.replace(/\&amp;/g, '&') || 'http://');
  };

  /**
   * Insert image.
   */
  $.Editable.prototype.insertImage = function () {
    this.closeImageMode();
    this.imageMode = false;

    this.showInsertImage();

    this.saveSelection();

    if (!this.options.inlineMode) {
      this.positionPopup('insertImage');
    }

    this.imageMode = false;

    this.$image_wrapper.find('input[type="text"]').val('');
  };

  /**
   * Run default command.
   *
   * @param cmd - command name.
   * @param val - command value.
   */
  $.Editable.prototype.execDefault = function (cmd, val) {
    document.execCommand(cmd, false, val);

    if (cmd == 'insertOrderedList') {
      this.$bttn_wrapper.find('[data-cmd="insertUnorderedList"]').removeClass('active');
    } else if (cmd == 'insertUnorderedList') {
      this.$bttn_wrapper.find('[data-cmd="insertOrderedList"]').removeClass('active');
    }

    this.callback(cmd);
  };

  $.Editable.prototype._startInDefault = function (cmd, val) {
    this.$element.focus();
    this.$bttn_wrapper.find('[data-cmd="' + cmd + '"]').toggleClass('active');
    if (val === undefined) {
      document.execCommand(cmd, false, false);
    }
    else {
      document.execCommand(cmd, false, val);
    }
  }

  $.Editable.prototype._startInFontExec = function (prop, cmd, val) {
    this.$element.focus();

    try {
      var range = this.getRange();
      var boundary = range.cloneRange();

      boundary.collapse(false);

      var $span = $('<span data-inserted="true" data-fr-verified="true" style="' + prop + ': ' + val + ';">&#8203;</span>', document);
      boundary.insertNode($span[0]);
      boundary.detach();

      $span = this.$element.find('[data-inserted]');
      $span.removeAttr('data-inserted');

      this.setSelection($span.get(0), 1);
    }
    catch (ex) {}
  }

  /**
   * Remove format.
   */
  $.Editable.prototype.removeFormat = function () {
    document.execCommand('removeFormat', false, false);
    document.execCommand('unlink', false, false);
  };

  /**
   * Set font size or family.
   *
   * @param val
   */
  $.Editable.prototype.inlineStyle = function (prop, cmd, val, callback_data) {

    // Preserve font size.
    if (this.browser.webkit && prop != 'font-size') {
      var hasFontSizeSet = function ($span) {
        return $span.attr('style').indexOf('font-size') >= 0;
      }

      this.$element.find('span').each (function (index, span) {
        var $span = $(span);

        if ($span.attr('style') && hasFontSizeSet($span)) {
          $span.data('font-size', $span.css('font-size'));
          $span.css('font-size', '');
        }
      })
    }

    // Apply format.
    document.execCommand('fontSize', false, 4);

    // Restore font size.
    if (this.browser.webkit && prop != 'font-size') {
      this.$element.find('span').each (function (index, span) {
        var $span = $(span);

        if ($span.data('font-size')) {
          $span.css('font-size', $span.data('font-size'));
          $span.removeData('font-size');
        }
      })
    }

    this.saveSelectionByMarkers();

    // Clean font.
    var clean_format = function (index, elem) {
      var $elem = $(elem);
      if ($elem.css('prop') != val) {
        $elem.css(prop, '');
      }

      if ($elem.attr('style') === '') {
        $elem.replaceWith($elem.html());
      }
    }

    // Remove all fonts with size=3.
    this.$element.find('font').each(function (index, elem) {
      var $span = $('<span data-fr-verified="true" style="' + prop + ': ' + val + ';">' + $(elem).html() + '</span>');
      $(elem).replaceWith($span);

      $span.find('span').each(clean_format)
    });

    this.restoreSelectionByMarkers();
    this.repositionEditor();

    // (val)
    if (callback_data === undefined) {
      callback_data = [val];
    }

    this.callback(cmd, callback_data);
  };

})(jQuery);

(function ($) {
  $.Editable.prototype._events = {};

  $.Editable.prototype.addListener = function (event_name, callback) {
    var events      = this._events;
    var callbacks   = events[event_name] = events[event_name] || [];

    callbacks.push(callback);
  }

  $.Editable.prototype.raiseEvent = function (event_name, args) {
    if (args === undefined) args = [];

    var callbacks = this._events[event_name];
    if (callbacks) {
      for (var i = 0, l = callbacks.length; i < l; i++) {
        callbacks[i].apply(this, args);
      }
    }
  }
})(jQuery);

(function ($) {
  /**
   * Check command state.
   */
  $.Editable.prototype.isActive = function (cmd, val) {
    switch (cmd) {
      case 'fontFamily':
        return this._isActiveFontFamily(val);

      case 'fontSize':
        return this._isActiveFontSize(val);

      case 'backColor':
        return this._isActiveBackColor(val);

      case 'foreColor':
        return this._isActiveForeColor(val);

      case 'formatBlock':
        return this._isActiveFormatBlock(val);

      case 'blockStyle':
        return this._isActiveBlockStyle(val);

      case 'createLink':
      case 'insertImage':
        return false;

      case 'justifyLeft':
      case 'justifyRight':
      case 'justifyCenter':
      case 'justifyFull':
        return this._isActiveAlign(cmd);

      case 'html':
        return this._isActiveHTML();

      case 'undo':
      case 'redo':
      case 'save':
        return false;

      default:
        return this._isActiveDefault(cmd);
    }
  };

  $.Editable.prototype._isActiveFontFamily = function (val) {
    var element = this.getSelectionElement();
    if ($(element).css('fontFamily').replace(/ /g, '') === val.replace(/ /g, '')) {
      return true;
    }

    return false;
  };

  $.Editable.prototype._isActiveFontSize = function (val) {
    var element = this.getSelectionElement();
    if ($(element).css('fontSize') === val) {
      return true;
    }

    return false;
  };

  $.Editable.prototype._isActiveBackColor = function (val) {
    var element = this.getSelectionElement();
    while ($(element).get(0) != this.$element.get(0)) {
      if ($(element).css('background-color') === val) {
        return true;
      }

      if ($(element).css('background-color') == 'transparent' || $(element).css('background-color') == 'rgba(0, 0, 0, 0)') {
        element = $(element).parent();
      }
      else {
        return false;
      }
    }

    return false;
  };

  $.Editable.prototype._isActiveForeColor = function (val) {
    try {
      if (document.queryCommandValue('foreColor') === val) {
        return true;
      }
    } catch (ex) {}

    return false;
  };

  $.Editable.prototype._isActiveFormatBlock = function (val) {
    if (val.toUpperCase() === 'CODE') {
      val = 'PRE';
    }
    else if (val.toUpperCase() === 'N') {
      val = 'DIV';
    }

    var $element = $(this.getSelectionElement());

    while ($element.get(0) != this.$element.get(0)) {
      if ($element.get(0).tagName == val.toUpperCase()) {
        return true;
      }

      $element = $element.parent();
    }

    return false;
  };

  $.Editable.prototype._isActiveBlockStyle = function (val) {
    var $element = $(this.getSelectionElement());

    while ($element.get(0) != this.$element.get(0)) {
      if ($element.hasClass(val)) {
        return true;
      }

      $element = $element.parent();
    }

    return false;
  };

  $.Editable.prototype._isActiveAlign = function (cmd) {
    var elements = this.getSelectionElements();

    if (cmd == 'justifyLeft') {
      cmd = 'left';
    } else if (cmd == 'justifyRight') {
      cmd = 'right';
    } else if (cmd == 'justifyCenter') {
      cmd = 'center';
    } else if (cmd == 'justifyFull') {
      cmd = 'justify';
    }

    if (cmd == $(elements[0]).css('text-align')) {
      return true;
    }

    return false;
  };

  $.Editable.prototype._isActiveHTML = function () {
    if (this.isHTML) {
      return true;
    }

    return false;
  };

  $.Editable.prototype._isActiveDefault = function (cmd) {
    try {
      if (document.queryCommandState(cmd) === true) {
        return true;
      }
    } catch (ex) {}

    return false;
  };
})(jQuery);

(function ($) {
  $.Editable.prototype.refresh_disabled = [
    'createLink',
    'insertImage',
    'undo',
    'redo',
    'save'
  ];

  $.Editable.prototype.refresh_dispatcher = {
    fontSize: function (elem) {
      this.refreshFontSize(elem);
    },

    fontFamily: function (elem) {
      this.refreshFontFamily(elem);
    },

    formatBlock: function (elem) {
      this.refreshFormatBlock(elem);
    },

    justifyLeft: function (elem) {
      this.refreshAlign(elem);
    },

    justifyRight: function (elem) {
      this.refreshAlign(elem);
    },

    justifyCenter: function (elem) {
      this.refreshAlign(elem);
    },

    justifyFull: function (elem) {
      this.refreshAlign(elem);
    },

    html: function (elem) {
      if (this.isActive('html')) {
        $(elem).addClass('active');
      } else {
        $(elem).removeClass('active');
      }
    }
  };

  $.Editable.prototype.registerRefreshEvent = function (key, func) {
    this.refresh_dispatcher[key] = func;
  }

  $.Editable.prototype.refreshBlocks = function () {
    // Update format block first so that we can refresh block style list.
    this.$bttn_wrapper.find('[data-cmd="formatBlock"]').each($.proxy(function (index, elem) {
      this.refreshFormatBlock(elem);
    }, this));
  }

  /**
   * Refresh button state.
   */
  $.Editable.prototype.refreshButtons = function (force_refresh) {
    if (((!this.selectionInEditor() || this.isHTML) && !(this.browser.msie && $.Editable.getIEversion() < 9)) && !force_refresh) {
      return false;
    }

    this.refreshBlocks();

    // Add disabled where necessary.
    for (var i = 0; i < this.options.buttons.length; i++) {
      var button = this.options.buttons[i];
      if ($.Editable.commands[button] === undefined) {
        continue;
      }

      if ($.Editable.commands[button].disabled !== undefined && $.Editable.commands[button].disabled.call(this) === true) {
        this.$editor.find('[data-name="' + button + '"] button').prop('disabled', true);
      }
      else {
        this.$editor.find('[data-name="' + button + '"] button').removeProp('disabled');
      }
    }

    // Refresh undo / redo.
    this.refreshUndoRedo();

    this.raiseEvent('refresh');

    this.$bttn_wrapper.find('[data-cmd]').not('[data-cmd="formatBlock"]').each($.proxy(function (index, elem) {
      var cmd = $(elem).data('cmd');

      if (this.refresh_dispatcher[cmd]) {
        this.refresh_dispatcher[cmd].apply(this, [elem]);
      } else {
        this.refreshDefault(elem);
      }

    }, this));
  };

  /**
   * Refresh format block.
   *
   * @param elem
   */
  $.Editable.prototype.refreshFormatBlock = function (elem) {
    if (this.disabledList.indexOf('formatBlock') >= 0) {
      $(elem).parents('.fr-dropdown').attr('data-disabled', true);
    }

    $(elem).removeClass('active');
    if (this.isActive($(elem).data('cmd'), $(elem).data('val'))) {
      $(elem).addClass('active');
    }
  };

  /**
   * Refresh undo, redo buttons.
   */
  $.Editable.prototype.refreshUndoRedo = function () {

    if (this.isEnabled('undo') || this.isEnabled('redo')) {
      if (this.$editor === undefined) return;

      this.$bttn_wrapper.find('[data-cmd="undo"], [data-cmd="redo"]').prop('disabled', false);

      if (this.undoStack.length === 0 || this.undoIndex <= 1 || this.isHTML) {
        this.$bttn_wrapper.find('[data-cmd="undo"]').prop('disabled', true);
      }

      if (this.undoIndex == this.undoStack.length || this.isHTML) {
        this.$bttn_wrapper.find('[data-cmd="redo"]').prop('disabled', true);
      }
    }
  };

  /**
   * Refresh default buttons.
   *
   * @param elem
   */
  $.Editable.prototype.refreshDefault = function (elem) {
    $(elem).removeClass('active');

    if (this.isActive($(elem).data('cmd'))) {
      $(elem).addClass('active');
    }
  };

  /**
   * Refresh alignment.
   *
   * @param elem
   */
  $.Editable.prototype.refreshAlign = function (elem) {
    var cmd = $(elem).data('cmd');

    if (this.isActive(cmd)) {
      $(elem).parents('ul').find('li').removeClass('active');
      $(elem).addClass('active');
      $(elem).parents('.fr-dropdown').find('.fr-trigger i').attr('class', $(elem).find('i').attr('class'));
    }
  };

  /**
   * Refresh foreground color.
   *
   * @param elem
   */
  $.Editable.prototype.refreshForeColor = function (elem) {
    $(elem).removeClass('active');
    if (this.isActive('foreColor', elem.style.backgroundColor)) {
      $(elem).addClass('active');
    }
  };

  /**
   * Refresh background color.
   *
   * @param elem
   */
  $.Editable.prototype.refreshBackColor = function (elem) {
    $(elem).removeClass('active');

    if (this.isActive('backColor', elem.style.backgroundColor)) {
      $(elem).addClass('active');
    }
  };

  /**
   * Refresh font size.
   *
   * @param elem
   */
  $.Editable.prototype.refreshFontSize = function (elem) {
    $(elem).removeClass('active');
    if (this.isActive('fontSize', $(elem).data('val'))) {
      $(elem).addClass('active');
    }
  };


  /**
   * Refresh font family.
   *
   * @param elem
   */
  $.Editable.prototype.refreshFontFamily = function (elem) {
    $(elem).removeClass('active');
    if (this.isActive('fontFamily', $(elem).data('val'))) {
      $(elem).addClass('active');
    }
  };

})(jQuery);

(function ($) {
  /**
   * Get selection text.
   *
   * @returns {string}
   */
  $.Editable.prototype.text = function () {
    var text = '';

    if (window.getSelection) {
      text = window.getSelection();
    } else if (document.getSelection) {
      text = document.getSelection();
    } else if (document.selection) {
      text = document.selection.createRange().text;
    }

    return text.toString();
  };

  /**
   * Determine if selection is inside current editor.
   *
   * @returns {boolean}
   */
  $.Editable.prototype.selectionInEditor = function () {
    var parent = this.getSelectionParent();
    var inside = false;

    if (parent == this.$element.get(0)) {
      inside = true;
    }

    if (inside === false) {
      $(parent).parents().each($.proxy(function (index, elem) {
        if (elem == this.$element.get(0)) {
          inside = true;
        }
      }, this));
    }

    return inside;
  };

  /**
   * Get current selection.
   *
   * @returns {string}
   */
  $.Editable.prototype.getSelection = function () {
    var selection = '';
    if (window.getSelection) {
      selection = window.getSelection();
    } else if (document.getSelection) {
      selection = document.getSelection();
    } else {
      selection = document.selection.createRange();
    }

    return selection;
  };

  /**
   * Get current range.
   *
   * @returns {*}
   */
  $.Editable.prototype.getRange = function () {
    var ranges = this.getRanges();
    if (ranges.length > 0) {
      return ranges[0];
    }

    return null;
  };

  $.Editable.prototype.getRanges = function () {
    var sel = this.getSelection();

    // Get ranges.
    if (sel.getRangeAt && sel.rangeCount) {
      var ranges = [];
      for (var i = 0; i < sel.rangeCount; i++) {
        ranges.push(sel.getRangeAt(i));
      }

      return ranges;
    }

    if (document.createRange) {
      return [document.createRange()];
    } else {
      return [];
    }
  }

  /**
   * Clear selection.
   *
   * @returns {*}
   */
  $.Editable.prototype.clearSelection = function () {
    if (window.getSelection) {
      if (window.getSelection().empty) {  // Chrome
        window.getSelection().empty();
      } else if (window.getSelection().removeAllRanges) {  // Firefox
        window.getSelection().removeAllRanges();
      }
    } else if (document.selection) {  // IE?
      document.selection.empty();
    }
  };

  /**
   * Get the element where the current selection starts.
   *
   * @returns {*}
   */
  $.Editable.prototype.getSelectionElement = function () {
    var sel = this.getSelection();

    if (sel.rangeCount) {
      var node = sel.getRangeAt(0).startContainer;

      // Get parrent if node type is not DOM.
      if (node.nodeType != 1) {
        node = node.parentNode;
      }

      // Search for node deeper.
      if ($(node).children().length > 0 && $($(node).children()[0]).text() == this.text()) {
        node = $(node).children()[0];
      }

      // Make sure the node is in editor.
      var p = node;
      while (p.tagName != 'BODY') {
        if (p == this.$element.get(0)) {
          return node;
        }

        p = $(p).parent()[0]
      }
    }

    return this.$element.get(0);
  };

  /**
   * Get the parent of the current selection.
   *
   * @returns {*}
   */
  $.Editable.prototype.getSelectionParent = function () {
    var parent = null;
    var sel;

    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
        parent = sel.getRangeAt(0).commonAncestorContainer;
        if (parent.nodeType != 1) {
          parent = parent.parentNode;
        }
      }
    } else if ((sel = document.selection) && sel.type != 'Control') {
      parent = sel.createRange().parentElement();
    }

    if (parent != null && ($.inArray(this.$element.get(0), $(parent).parents()) >= 0 || parent == this.$element.get(0))) {
      return parent;
    }
    else {
      return null;
    }
  };

  /**
   * Check if DOM node is in range.
   *
   * @param range - A range object.
   * @param node - A DOM node object.
   * @returns {*}
   */
  // From: https://code.google.com/p/rangy/source/browse/trunk/test/intersectsnode.html
  $.Editable.prototype.nodeInRange = function (range, node) {
    var nodeRange;
    if (range.intersectsNode) {
      return range.intersectsNode(node);
    } else {
      nodeRange = node.ownerDocument.createRange();
      try {
        nodeRange.selectNode(node);
      } catch (e) {
        nodeRange.selectNodeContents(node);
      }

      return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) == -1 &&
        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) == 1;
    }
  };


  /**
   * Get the valid element of DOM node.
   *
   * @param node - DOM node.
   * @returns {*}
   */
  $.Editable.prototype.getElementFromNode = function (node) {
    if (node.nodeType != 1) {
      node = node.parentNode;
    }

    while (node !== null && $.Editable.VALID_NODES.indexOf(node.tagName) < 0) {
      node = node.parentNode;
    }

    if (node != null && node.tagName == 'LI' && $(node).find($.Editable.VALID_NODES.join()).length > 0) {
      return null;
    }

    if ($.makeArray($(node).parents()).indexOf(this.$element.get(0)) >= 0) {
      return node;
    } else {
      return null;
    }
  };

  /**
   * Find next node as a child or as a sibling.
   *
   * @param node - Current node.
   * @returns {DOM Object}
   */
  $.Editable.prototype.nextNode = function (node, endNode) {
    if (node.hasChildNodes()) {
      return node.firstChild;
    } else {
      while (node && !node.nextSibling && node != endNode) {
        node = node.parentNode;
      }
      if (!node || node == endNode) {
        return null;
      }

      return node.nextSibling;
    }
  };

  /**
   * Find the nodes within the range passed as parameter.
   *
   * @param range - A range object.
   * @returns {Array}
   */
  $.Editable.prototype.getRangeSelectedNodes = function (range) {
    var node = range.startContainer;
    var endNode = range.endContainer;

    // Special case for a range that is contained within a single node
    if (node == endNode && node.tagName != 'TR') {
      return [node];
    }

    if (node == endNode && node.tagName == 'TR') {
      var child_nodes = node.childNodes;
      var start_offset = range.startOffset;

      if (child_nodes.length > start_offset && start_offset >= 0) {
        var td = child_nodes[start_offset];
        if (td.tagName == 'TD' || td.tagName == 'TH') {
          return [td];
        }
      }
    }

    // Iterate nodes until we hit the end container
    var rangeNodes = [];
    while (node && node != endNode) {
      rangeNodes.push(node = this.nextNode(node, endNode));
    }

    // Add partially selected nodes at the start of the range
    node = range.startContainer;
    while (node && node != range.commonAncestorContainer) {
      rangeNodes.unshift(node);
      node = node.parentNode;
    }

    return rangeNodes;
  };

  /**
   * Get the nodes that are in the current selection.
   *
   * @returns {Array}
   */
  // Addapted from http://stackoverflow.com/questions/7781963/js-get-array-of-all-selected-nodes-in-contenteditable-div
  $.Editable.prototype.getSelectedNodes = function () {
    // IE gt 9. Other browsers.
    if (window.getSelection) {
      var sel = window.getSelection();
      if (!sel.isCollapsed) {
        var ranges = this.getRanges();
        var nodes = [];
        for (var i = 0; i < ranges.length; i++) {
          nodes = $.merge(nodes, this.getRangeSelectedNodes(ranges[i]));
        }

        return nodes;
      } else if (this.selectionInEditor()) {
        var container = sel.getRangeAt(0).startContainer;
        if (container.nodeType == 3)
          return [container.parentNode];
        else
          return [container];
      }
    }

    return [];
  };


  /**
   * Get the elements that are selected.
   *
   * @returns {Array}
   */
  $.Editable.prototype.getSelectionElements = function () {
    var actualNodes = this.getSelectedNodes();
    var nodes = [];

    $.each(actualNodes, $.proxy(function (index, node) {
      if (node !== null) {
        var element = this.getElementFromNode(node);
        if (nodes.indexOf(element) < 0 && element != this.$element.get(0) && element !== null) {
          nodes.push(element);
        }
      }
    }, this));

    if (nodes.length === 0) {
      nodes.push(this.$element.get(0));
    }

    return nodes;
  };

  /**
   * Get the URL from selection.
   *
   * @returns {string}
   */
  $.Editable.prototype.getSelectionLink = function () {
    var links = this.getSelectionLinks();

    if (links.length > 0) {
      return $(links[0]).attr('href');
    }

    return null;
  };

  /**
   * Save current selection.
   */
  // From: http://stackoverflow.com/questions/5605401/insert-link-in-contenteditable-element
  $.Editable.prototype.saveSelection = function () {
    if (!this.selectionDisabled) {
      var i;
      var len;
      var ranges;
      var sel = this.getSelection();

      if (sel.getRangeAt && sel.rangeCount) {
        ranges = [];
        for (i = 0, len = sel.rangeCount; i < len; i += 1) {
          ranges.push(sel.getRangeAt(i));
        }
        this.savedRanges = ranges;
      } else {
        this.savedRanges = null;
      }
    }
  };

  /**
   * Restore if there is any selection saved.
   */
  $.Editable.prototype.restoreSelection = function () {
    if (!this.selectionDisabled) {
      var i;
      var len;
      var sel = this.getSelection();

      if (this.savedRanges) {
        sel.removeAllRanges();
        for (i = 0, len = this.savedRanges.length; i < len; i += 1) {
          sel.addRange(this.savedRanges[i]);
        }
      }
    }
  };

  /**
   * Save selection using markers.
   */
  $.Editable.prototype.saveSelectionByMarkers = function () {
    if (!this.selectionDisabled) {
      var ranges = this.getRanges();

      this.removeMarkers();

      for (var i = 0; i < ranges.length; i++) {
        this.placeMarker(ranges[i], true, i); // Start.
        this.placeMarker(ranges[i], false, i); // End.
      }
    }
  };

  /**
   * Check if there is any selection stored.
   */
  $.Editable.prototype.hasSelectionByMarkers = function () {
    // Get markers.
    var markers = this.$element.find('.f-marker[data-type="true"]');

    if (markers.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Restore selection using markers.
   */
  $.Editable.prototype.restoreSelectionByMarkers = function () {
    if (!this.selectionDisabled) {
      var sel;

      // Get markers.
      var markers = this.$element.find('.f-marker[data-type="true"]');

      // Clean selection.
      if (markers.length > 0) {
        sel = this.getSelection();
        if (!this.mobile()) {
          this.focus();
        } else if (!this.$element.is(':focus')) {
          this.$element.focus();
        }

        this.clearSelection();
      }

      // Add ranges.
      for (var i = 0; i < markers.length; i++) {
        var id = $(markers[i]).data('id');
        var start_marker = markers[i];
        var end_marker = this.$element.find('.f-marker[data-type="false"][data-id="' + id + '"]');

        // Make sure there is an end marker.
        if (end_marker.length > 0) {
          end_marker = end_marker[0];

          try {
            var range = document.createRange();
            range.setEndBefore(end_marker);
            range.setStartAfter(start_marker);

            sel.addRange(range);
          } catch (ex) {}
        }
      }

      // Remove used markers.
      if (markers.length > 0) {
        if (!this.editableDisabled && !this.isHTML && !this.options.editInPopup) {
          this.$element.attr('contenteditable', true);
        }

        this.removeMarkers();
      }
    }
  };

  /**
   * Set selection start.
   *
   * @param sn - Start node.
   * @param fn - Final node.
   */
  $.Editable.prototype.setSelection = function (sn, so, fn, fo) {
    // Check if there is any selection first.
    var sel = this.getSelection();
    if (!sel) return;

    // Clean other ranges.
    this.clearSelection();

    // Sometimes this throws an error.
    try {
      // Start selection.
      if (!fn) fn = sn;
      if (so === undefined) so = 0;
      if (fo === undefined) fo = so;

      // Set ranges (https://developer.mozilla.org/en-US/docs/Web/API/range.setStart)
      var range = this.getRange();
      range.setStart(sn, so);
      range.setEnd(fn, fo);

      // Add range to current selection.
      sel.addRange(range);
    } catch (e) { }
  };


  /**
   * Insert marker at start/end of range.
   *
   * @param range
   * @param marker - true/false for begin/end.
   */
  $.Editable.prototype.placeMarker = function (range, marker, i) {
    try {
      var boundary = range.cloneRange();

      boundary.collapse(marker);

      boundary.insertNode($('<span class="f-marker" data-fr-verified="true" data-id="' + i + '" data-type="' + marker + '">', document)[0]);
      boundary.detach();
    } catch (ex) {

    }
  };

  /**
   * Remove markers.
   */
  $.Editable.prototype.removeMarkers = function () {
    this.$element.find('.f-marker').remove();
  };

  // From: http://www.coderexception.com/0B1B33z1NyQxUQSJ/contenteditable-div-how-can-i-determine-if-the-cursor-is-at-the-start-or-end-of-the-content
  $.Editable.prototype.getSelectionTextInfo = function (el) {
    var atStart = false;
    var atEnd = false;
    var selRange;
    var testRange;

    if (window.getSelection) {
      var sel = window.getSelection();
      if (sel.rangeCount) {
        selRange = sel.getRangeAt(0);
        testRange = selRange.cloneRange();

        testRange.selectNodeContents(el);
        testRange.setEnd(selRange.startContainer, selRange.startOffset);
        atStart = (testRange.toString() === '');

        testRange.selectNodeContents(el);
        testRange.setStart(selRange.endContainer, selRange.endOffset);
        atEnd = (testRange.toString() === '');
      }
    } else if (document.selection && document.selection.type != 'Control') {
      selRange = document.selection.createRange();
      testRange = selRange.duplicate();

      testRange.moveToElementText(el);
      testRange.setEndPoint('EndToStart', selRange);
      atStart = (testRange.text === '');

      testRange.moveToElementText(el);
      testRange.setEndPoint('StartToEnd', selRange);
      atEnd = (testRange.text === '');
    }

    return { atStart: atStart, atEnd: atEnd };
  };

  /**
   * Check if selection is at the end of block.
   */
  $.Editable.prototype.endsWith = function (string, suffix) {
    return string.indexOf(suffix, string.length - suffix.length) !== -1;
  }
})(jQuery);

(function ($) {
  /**
   * Transform a hex value to an RGB array.
   *
   * @param hex - HEX string.
   * @returns {Array}
   */
  $.Editable.hexToRGB = function (hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  /**
   * Transform a hex string to an RGB string.
   *
   * @param val - HEX string.
   * @returns {string}
   */
  $.Editable.hexToRGBString = function (val) {
    var rgb = this.hexToRGB(val);
    return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
  };

  /**
   * Find the IE version.
   *
   * @returns {integer}
   */
  $.Editable.getIEversion = function () {
    /*global navigator */
    var rv = -1;
    var ua;
    var re;

    if (navigator.appName == 'Microsoft Internet Explorer') {
      ua = navigator.userAgent;
      re = new RegExp('MSIE ([0-9]{1,}[\\.0-9]{0,})');
      if (re.exec(ua) !== null)
        rv = parseFloat(RegExp.$1);
    } else if (navigator.appName == 'Netscape') {
      ua = navigator.userAgent;
      re = new RegExp('Trident/.*rv:([0-9]{1,}[\\.0-9]{0,})');
      if (re.exec(ua) !== null)
        rv = parseFloat(RegExp.$1);
    }
    return rv;
  };

  /**
   * Find current browser.
   *
   * @returns {Object}
   */
  $.Editable.browser = function () {
    var browser = {};

    if (this.getIEversion() > 0) {
      browser.msie = true;
    } else {
      var ua = navigator.userAgent.toLowerCase();

      var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
        /(webkit)[ \/]([\w.]+)/.exec(ua) ||
        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
        /(msie) ([\w.]+)/.exec(ua) ||
        ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
        [];

      var matched = {
        browser: match[1] || '',
        version: match[2] || '0'
      };

      if (match[1]) browser[matched.browser] = true;
      if (parseInt(matched.version, 10) < 9 && browser.msie) browser.oldMsie = true;

      // Chrome is Webkit, but Webkit is also Safari.
      if (browser.chrome) {
        browser.webkit = true;
      } else if (browser.webkit) {
        browser.safari = true;
      }
    }

    return browser;
  };

})(jQuery);

(function ($) {
  /**
   * Show editor
   */
  $.Editable.prototype.show = function (e) {

    if (e === undefined) return;

    if (this.options.inlineMode || this.options.editInPopup) {
      if (e !== null && e.type !== 'touchend') {
        var x = e.pageX;
        var y = e.pageY;

        // Fix releasing cursor outside.
        if (x < this.$element.offset().left) {
          x = this.$element.offset().left;
        }

        if (x > this.$element.offset().left + this.$element.width()) {
          x = this.$element.offset().left + this.$element.width();
        }

        if (y < this.$element.offset.top) {
          y = this.$element.offset().top;
        }

        if (y > this.$element.offset().top + this.$element.height()) {
          y = this.$element.offset().top + this.$element.height();
        }

        // Make coordinates decent.
        if (x < 20) x = 20;
        if (y < 0) y = 0;

        // Show by coordinates.
        this.showByCoordinates(x, y);

        // Hide other editors.
        $('.froala-editor:not(.f-basic)').hide();

        // Show editor.
        this.$editor.show();

        if (this.options.buttons.length === 0 && !this.options.editInPopup) {
          this.$editor.hide();
        }
      } else {
        $('.froala-editor:not(.f-basic)').hide();
        this.$editor.show();
        this.repositionEditor();
      }
    }

    this.hidePopups();
    if (!this.options.editInPopup) {
      this.showEditPopupWrapper();
    }

    this.$bttn_wrapper.show();
    this.refreshButtons();

    this.imageMode = false;
  };

  $.Editable.prototype.hideDropdowns = function () {
    this.$bttn_wrapper.find('.fr-dropdown .fr-trigger').removeClass('active');
    this.$bttn_wrapper.find('.fr-dropdown .fr-trigger');
  };

  /**
   * Hide inline editor.
   */
  $.Editable.prototype.hide = function (propagateable) {

    if (!this.initialized) {
      return false;
    }

    if (propagateable === undefined) {
      propagateable = true;
    }

    // Hide other editors.
    if (propagateable) {
      this.hideOtherEditors();
    }

    // Command to hide from another editor.
    else {
      this.closeImageMode();
      this.imageMode = false;
    }

    this.$popup_editor.hide();
    this.hidePopups(false);
    this.hideDropdowns();
    this.link = false;
  };

  /**
   * Hide other editors from page.
   */
  $.Editable.prototype.hideOtherEditors = function () {
    for (var i = 1; i <= $.Editable.count; i++) {
      if (i != this._id) {
        $(window).trigger('hide.' + i);
      }
    }
  }

  $.Editable.prototype.hideBttnWrapper = function () {
    if (this.options.inlineMode) {
      this.$bttn_wrapper.hide();
    }
  };

  $.Editable.prototype.showBttnWrapper = function () {
    if (this.options.inlineMode) {
      this.$bttn_wrapper.show();
    }
  };

  $.Editable.prototype.showEditPopupWrapper = function () {
    if (this.$edit_popup_wrapper) {
      this.$edit_popup_wrapper.show();

      setTimeout($.proxy(function () {
        this.$edit_popup_wrapper.find('input').val(this.$element.text()).focus().select()
      }, this), 1);
    }
  };

  $.Editable.prototype.hidePopups = function (hide_btn_wrapper) {
    if (hide_btn_wrapper === undefined) hide_btn_wrapper = true;

    if (hide_btn_wrapper) {
      this.hideBttnWrapper();
    }

    this.raiseEvent('hidePopups');
  }

  $.Editable.prototype.showEditPopup = function () {
    this.showEditPopupWrapper();
  };
})(jQuery);

(function ($) {
  /**
   * Get bounding rect around selection.
   *
   * @returns {Object}
   */
  $.Editable.prototype.getBoundingRect = function () {
    var boundingRect;

    if (!this.isLink) {
      boundingRect = this.getRange().getBoundingClientRect();
    } else {
      boundingRect = {}
      var $link = this.$element;

      boundingRect.left = $link.offset().left - $(window).scrollLeft();
      boundingRect.top = $link.offset().top - $(window).scrollTop();
      boundingRect.width = $link.outerWidth();
      boundingRect.height = parseInt($link.css('padding-top').replace('px', '')) + $link.height();
      boundingRect.right = 1;
      boundingRect.bottom = 1;
      boundingRect.ok = true;
    }

    return boundingRect;
  };

  /**
   * Reposition editor using boundingRect.
   *
   * @param position - Force showing the editor.
   */
  $.Editable.prototype.repositionEditor = function (position) {
    var boundingRect;
    var x;
    var y;

    if (this.options.inlineMode || position) {
      boundingRect = this.getBoundingRect();
      this.showBttnWrapper();

      if (boundingRect.ok || (boundingRect.left >= 0 && boundingRect.top >= 0 && boundingRect.right > 0 && boundingRect.bottom > 0)) {
        x = boundingRect.left + (boundingRect.width) / 2;
        y = boundingRect.top + boundingRect.height;
        if (!this.iPad()) {
          x = x + $(window).scrollLeft();
          y = y + $(window).scrollTop();
        }
        this.showByCoordinates(x, y);
      } else if (!this.options.alwaysVisible) {
        document.execCommand('selectAll', false, false);
        boundingRect = this.getBoundingRect();
        x = boundingRect.left;
        y = boundingRect.top + boundingRect.height;
        if (!this.iPad()) {
          x = x + $(window).scrollLeft();
          y = y + $(window).scrollTop();
        }
        this.showByCoordinates(x, y - 20);
        this.getRange().collapse(false);
      } else {
        this.hide();
      }

      if (this.options.buttons.length === 0) {
        this.hide();
      }
    }
  };

  $.Editable.prototype.showByCoordinates = function (x, y) {
    x = x - 20;
    y = y + 15;

    var editor_width = Math.max(this.$popup_editor.width(), 250);

    if (x + editor_width >= $(window).width() - 50 && (x + 40) - editor_width > 0) {
      this.$popup_editor.addClass('right-side');
      x = $(window).width() - (x + 40);
      this.$popup_editor.css('top', y);
      this.$popup_editor.css('right', x);
      this.$popup_editor.css('left', 'auto');
    } else if (x + editor_width < $(window).width() - 50) {
      this.$popup_editor.removeClass('right-side');
      this.$popup_editor.css('top', y);
      this.$popup_editor.css('left', x);
      this.$popup_editor.css('right', 'auto');
    } else {
      this.$popup_editor.removeClass('right-side');
      this.$popup_editor.css('top', y);
      this.$popup_editor.css('left', Math.max(($(window).width() - editor_width), 10) / 2);
      this.$popup_editor.css('right', 'auto');
    }

    this.$popup_editor.show();
  };

  /**
   * Set position for popup editor.
   */
  $.Editable.prototype.positionPopup = function (command) {
    if ($(this.$editor.find('button.fr-bttn[data-cmd="' + command + '"]')).length) {
      var $btn = this.$editor.find('button.fr-bttn[data-cmd="' + command + '"]');
      var w = $btn.width();
      var h = $btn.height() - 15;
      var x = $btn.offset().left + w / 2;
      var y = $btn.offset().top + h;
      this.showByCoordinates(x, y)
    }
  };

})(jQuery);

(function ($) {
  $.Editable.image_commands = {
    floatImageLeft: {
      title: 'Float Left',
      icon: {
        type: 'font',
        value: 'fa fa-align-left'
      }
    },

    floatImageNone: {
      title: 'Float None',
      icon: {
        type: 'font',
        value: 'fa fa-align-justify'
      }
    },

    floatImageRight: {
      title: 'Float Right',
      icon: {
        type: 'font',
        value: 'fa fa-align-right'
      }
    },

    linkImage: {
      title: 'Insert Link',
      icon: {
        type: 'font',
        value: 'fa fa-link'
      }
    },

    replaceImage: {
      title: 'Replace Image',
      icon: {
        type: 'font',
        value: 'fa fa-exchange'
      }
    },

    removeImage: {
      title: 'Remove Image',
      icon: {
        type: 'font',
        value: 'fa fa-trash-o'
      }
    }
  };

  $.Editable.DEFAULTS = $.extend($.Editable.DEFAULTS, {
    imageButtons: ['floatImageLeft', 'floatImageNone', 'floatImageRight', 'linkImage', 'replaceImage', 'removeImage'],
    imageDeleteURL: null,
    imageDeleteParams: {},
    imageMove: true,
    imageResize: true,
    imageLink: true,
    imageUpload: true,
    imageUploadParams: {},
    imageUploadParam: 'file',
    imageUploadToS3: false,
    imageUploadURL: 'http://i.froala.com/upload',
    imagesLoadURL: 'http://i.froala.com/images',
    imagesLoadParams: {},
    maxImageSize: 1024 * 1024 * 10, // 10 Mb.
    textNearImage: true
  })

  $.Editable.prototype.hideImageEditorPopup = function () {
    if (this.$image_editor) {
      this.$image_editor.hide();
    }
  };

  $.Editable.prototype.showImageEditorPopup = function () {
    if (this.$image_editor) {
      this.$image_editor.show();
    }

    if (!this.options.imageMove) {
      this.$element.attr('contenteditable', false);
    }
  };

  $.Editable.prototype.showImageWrapper = function () {
    if (this.$image_wrapper) {
      this.$image_wrapper.show();
    }
  };

  $.Editable.prototype.hideImageWrapper = function (image_mode) {
    if (this.$image_wrapper) {
      if (!this.$element.attr('data-resize') && !image_mode) {
        this.closeImageMode();
        this.imageMode = false;
      }

      this.$image_wrapper.hide();
    }
  };

  $.Editable.prototype.showInsertImage = function () {
    this.hidePopups();

    this.showImageWrapper();
  };

  $.Editable.prototype.showImageEditor = function () {
    this.hidePopups();

    this.showImageEditorPopup();
  };

  $.Editable.prototype.insertImageHTML = function () {
    var html = '<div class="froala-popup froala-image-popup" style="display: none;"><h4><span data-text="true">Insert image</span><i title="Cancel" class="fa fa-times" id="f-image-close-' + this._id + '"></i></h4>';

    html += '<div id="f-image-list-' + this._id + '">';

    if (this.options.imageUpload) {
      html += '<div class="f-popup-line drop-upload">';
      html += '<div class="f-upload" id="f-upload-div-' + this._id + '"><strong data-text="true">Drop Image</strong><br>(<span data-text="true">or click</span>)<form target="frame-' + this._id + '" enctype="multipart/form-data" encoding="multipart/form-data" action="' + this.options.imageUploadURL + '" method="post" id="f-upload-form-' + this._id + '"><input id="f-file-upload-' + this._id + '" type="file" name="' + this.options.imageUploadParam + '" accept="image/*"></form></div>';

      if (this.browser.msie && $.Editable.getIEversion() <= 9) {
        html += '<iframe id="frame-' + this._id + '" name="frame-' + this._id + '" src="javascript:false;" style="width:0; height:0; border:0px solid #FFF; position: fixed; z-index: -1;" data-loaded="true"></iframe>';
      }

      html += '</div>';
    }

    if (this.options.imageLink) {
      html += '<div class="f-popup-line"><label><span data-text="true">Enter URL</span>: </label><input id="f-image-url-' + this._id + '" type="text" placeholder="http://taihuoniao.com"><button class="f-browse" id="f-browser-' + this._id + '"><i class="fa fa-search"></i></button><button data-text="true" class="f-ok" id="f-image-ok-' + this._id + '">OK</button></div>';
    }

    html += '</div>';
    html += '<p class="f-progress" id="f-progress-' + this._id + '"><span></span></p>';
    html += '</div>';

    return html;
  }

  $.Editable.prototype.iFrameLoad = function () {
    var $iframe = this.$image_wrapper.find('iframe#frame-' + this._id);
    if (!$iframe.data('loaded')) {
      $iframe.data('loaded', true);
      return false;
    }

    try {
      var $form = this.$image_wrapper.find('#f-upload-form-' + this._id);

      // S3 upload.
      if (this.options.imageUploadToS3) {
        var domain = $form.attr('action')
        var key = $form.find('input[name="key"]').val()
        var url = domain + key;

        this.writeImage(url);
        if (this.options.imageUploadToS3.callback) {
          this.options.imageUploadToS3.callback.call(this, url, key);
        }
      }

      // Normal upload.
      else {
        var response = $iframe.contents().text();
        this.parseImageResponse(response);
      }
    }
    catch (ex) {
      // Same domain.
      this.throwImageError(7);
    }
  }

  /**
   * Build insert image.
   */
  $.Editable.prototype.buildInsertImage = function () {
    // Add image wrapper to editor.
    this.$image_wrapper = $(this.insertImageHTML());
    this.$popup_editor.append(this.$image_wrapper);

    var that = this;

    this.addListener('hidePopups', $.proxy(function () {
      this.hideImageWrapper(true);
    }), this);

    // Init progress bar.
    this.$progress_bar = this.$image_wrapper.find('p#f-progress-' + this._id);

    // Build drag and drop upload.
    if (this.options.imageUpload) {
      // Build upload frame.
      if (this.browser.msie && $.Editable.getIEversion() <= 9) {
        var iFrame = this.$image_wrapper.find('iframe').get(0);

        if (iFrame.attachEvent) {
          iFrame.attachEvent('onload', function () { that.iFrameLoad() });
        } else {
          iFrame.onload  = function () { that.iFrameLoad() };
        }
      }

      // File was picked.
      this.$image_wrapper.on('change', 'input[type="file"]', function () {
        // Files were picked.
        if (this.files !== undefined) {
          that.uploadFile(this.files);
        }

        // IE 9 upload.
        else {
          var $form = $(this).parents('form');
          $form.find('input[type="hidden"]').remove();
          var key;
          for (key in that.options.imageUploadParams) {
            $form.prepend('<input type="hidden" name="' + key + '" value="' + that.options.imageUploadParams[key] + '" />');
          }

          if (that.options.imageUploadToS3 !== false) {
            for (key in that.options.imageUploadToS3.params) {
              $form.prepend('<input type="hidden" name="' + key + '" value="' + that.options.imageUploadToS3.params[key] + '" />');
            }

            $form.prepend('<input type="hidden" name="' + 'success_action_status' + '" value="' + 201 + '" />');
            $form.prepend('<input type="hidden" name="' + 'X-Requested-With' + '" value="' + 'xhr' + '" />');
            $form.prepend('<input type="hidden" name="' + 'Content-Type' + '" value="' + '' + '" />');
            $form.prepend('<input type="hidden" name="' + 'key' + '" value="' + that.options.imageUploadToS3.keyStart + (new Date()).getTime() + '-' + $(this).val().match(/[^\/\\]+$/) + '" />');
          } else {
            $form.prepend('<input type="hidden" name="XHR_CORS_TRARGETORIGIN" value="' + window.location.href + '" />');
          }

          that.$image_wrapper.find('#f-image-list-' + that._id).hide();
          that.$progress_bar.show();
          that.$progress_bar.find('span').css('width', '100%').text('Please wait!');
          that.showInsertImage();

          $form.submit();
        }

        // Chrome fix.
        $(this).val('');
      });

      // Add drag and drop support.
      this.buildDragUpload();
    }

    // URL input for insert image.
    this.$image_wrapper.on('mouseup keydown', '#f-image-url-' + this._id, $.proxy(function (e) {
      e.stopPropagation();
    }, this));

    // Create a list with all the items from the popup.
    this.$image_wrapper.on('click', '#f-image-ok-' + this._id, $.proxy(function () {
      this.writeImage(this.$image_wrapper.find('#f-image-url-' + this._id).val(), true);
    }, this));

    // Wrap things in image wrapper.
    this.$image_wrapper.on('click', '#f-image-close-' + this._id, $.proxy(function () {
      this.$bttn_wrapper.show();
      this.hideImageWrapper(true);

      if (this.options.inlineMode && this.options.buttons.length === 0) {
        if (this.imageMode) {
          this.showImageEditor();
        } else {
          this.hide();
        }
      }

      if (!this.imageMode) {
        this.restoreSelection();
      }

      if (!this.options.inlineMode && !this.imageMode) {
        this.hide();
      } else if (this.imageMode) {
        this.showImageEditor();
      }
    }, this))

    this.$image_wrapper.on('click', function (e) {
      e.stopPropagation();
    });

    this.$image_wrapper.on('click', '*', function (e) {
      e.stopPropagation();
    });
  };


  // Delete an image.
  $.Editable.prototype.deleteImage = function ($img) {
    if (this.options.imageDeleteURL) {
      var deleteParams = this.options.imageDeleteParams;
      deleteParams.info = $img.data('info');
      deleteParams.src = $img.attr('src');
      $.ajax({
        type: 'POST',
        url: this.options.imageDeleteURL,
        data: deleteParams,
        crossDomain: this.options.crossDomain,
        xhrFields: {
          withCredentials: this.options.withCredentials
        },
        headers: this.options.headers
      })
      .done($.proxy(function (data) {
        if ($img.parent().parent().hasClass('f-image-list')) {
          $img.parent().remove();
        } else {
          $img.parent().removeClass('f-img-deleting');
        }

        this.callback('imageDeleteSuccess', [data], false);
      }, this))
      .fail($.proxy(function () {
        $img.parent().removeClass('f-img-deleting');
        this.callback('imageDeleteError', ['Error during image delete.'], false);
      }, this));
    }
    else {
      $img.parent().removeClass('f-img-deleting');
      this.callback('imageDeleteError', ['Missing imageDeleteURL option.'], false);
    }
  };

  /**
   * Initialize actions for image handles.
   */
  $.Editable.prototype.imageHandle = function () {
    var that = this;

    var $handle = $('<span data-fr-verified="true">').addClass('f-img-handle').on({
      // Start to drag.
      movestart: function (e) {
        that.hide();
        that.$element.addClass('f-non-selectable').attr('contenteditable', false);
        that.$element.attr('data-resize', true);

        $(this).attr('data-start-x', e.startX);
        $(this).attr('data-start-y', e.startY);
      },

      // Still moving.
      move: function (e) {
        var $elem = $(this);
        var diffX = e.pageX - parseInt($elem.attr('data-start-x'), 10);

        $elem.attr('data-start-x', e.pageX);
        $elem.attr('data-start-y', e.pageY);

        var $img = $elem.prevAll('img');
        var width = $img.width();
        if ($elem.hasClass('f-h-ne') || $elem.hasClass('f-h-se')) {
          $img.attr('width', width + diffX);
        } else {
          $img.attr('width', width - diffX);
        }

        that.callback('imageResize', [], false);
      },

      // Drag end.
      moveend: function () {
        $(this).removeAttr('data-start-x');
        $(this).removeAttr('data-start-y');

        that.$element.removeClass('f-non-selectable');
        if (!that.isImage) {
          that.$element.attr('contenteditable', true);
        }

        that.callback('imageResizeEnd');

        $(this).trigger('mouseup');
      }
    });

    return $handle;
  };

  /**
   * Disable image resizing from browser.
   */
  $.Editable.prototype.disableImageResize = function () {
    // Disable resize for FF.
    if (this.browser.mozilla) {
      try {
        document.execCommand('enableObjectResizing', false, false);
        document.execCommand('enableInlineTableEditing', false, false);
      } catch (ex) {}
    }
  };

  $.Editable.prototype.isResizing = function () {
    return this.$element.attr('data-resize');
  };

  $.Editable.prototype.getImageClass = function (cls) {
    var classes = cls.split(' ');

    if (classes.indexOf('fr-fir') >= 0) {
      return 'fr-fir';
    }

    if (classes.indexOf('fr-fil') >= 0) {
      return 'fr-fil';
    }

    return 'fr-fin';
  };

  $.Editable.prototype.addImageClass = function ($obj, cls) {
    $obj.removeClass('fr-fin fr-fir fr-fil').addClass(cls);
  };

  /**
   * Image controls.
   */
  $.Editable.prototype.initImageResizer = function () {

    this.disableImageResize();

    var that = this;

    // Image drop.
    if (document.addEventListener) {
      document.addEventListener('drop', $.proxy(function () {
        setTimeout($.proxy(function () {
          that.closeImageMode();
          that.imageMode = false;
          that.hide();
          this.sync();
          this.clearSelection();
        }, this), 10);
      }, this));
    }

    // Image mouse down.
    this.$element.on('mousedown', 'img', function () {
      if (!that.isResizing()) {
        that.imageHTML = that.getHTML();

        // Remove content editable if move is not allowed or MSIE.
        if (!that.options.imageMove || that.browser.msie) {
          that.$element.attr('contenteditable', false);
        }
      }
    });

    // Image mouse up.
    this.$element.on('mouseup', 'img', function () {
      if (!that.isResizing()) {
        // Add contenteditable back after move.
        if (!that.options.imageMove && !that.isImage && !that.isHTML) {
          that.$element.attr('contenteditable', true);
        }
      }
    });

    // Image click.
    this.$element.on('click touchend', 'img', function (e) {
      if (!that.isResizing()) {
        e.preventDefault();
        e.stopPropagation();

        // Close other images.
        that.closeImageMode();

        // iPad Fix.
        that.$element.blur();

        // Unmark active buttons in the popup.
        that.$image_editor.find('button').removeClass('active');

        // Mark active float.
        var image_float = $(this).css('float');

        if ($(this).hasClass('fr-fil')) {
          image_float = 'left';
        } else if ($(this).hasClass('fr-fir')) {
          image_float = 'right';
        }

        that.$image_editor.find('button[data-cmd="floatImage' + image_float.charAt(0).toUpperCase() + image_float.slice(1) + '"]').addClass('active');

        // Set alt for image.
        that.$image_editor.find('.f-image-alt input[type="text"]').val($(this).attr('alt') || $(this).attr('title'));

        // Hide basic editor.
        that.showImageEditor();

        // Wrap image with image editor.
        if (!($(this).parent().hasClass('f-img-editor') && $(this).parent().get(0).tagName == 'SPAN')) {
          var image_class = that.getImageClass($(this).attr('class'));

          $(this).wrap('<span data-fr-verified="true" class="f-img-editor ' + image_class + '"></span>');

          if ($(this).parents('.f-img-wrap').length === 0 && !that.isImage) {
            if ($(this).parents('a').length > 0) {
              $(this).parents('a:first').wrap('<span data-fr-verified="true" class="f-img-wrap ' + image_class + '"></span>');
            } else {
              $(this).parent().wrap('<span data-fr-verified="true" class="f-img-wrap ' + image_class + '"></span>');
            }
          } else {
            that.addImageClass($(this).parents('.f-img-wrap'), image_class);
          }
        }

        // Remove float classes.
        $(this).removeClass('fr-fin fr-fir fr-fil');

        // Get image handle.
        var $handle = that.imageHandle();

        // Remove old handles.
        $(this).parent().find('.f-img-handle').remove();

        // Add Handles.
        if (that.options.imageResize) {
          $(this).parent().append($handle.clone(true).addClass('f-h-ne'));
          $(this).parent().append($handle.clone(true).addClass('f-h-se'));
          $(this).parent().append($handle.clone(true).addClass('f-h-sw'));
          $(this).parent().append($handle.clone(true).addClass('f-h-nw'));
        }

        // No selection needed. We have image.
        that.clearSelection();

        // Reposition editor.
        that.showByCoordinates($(this).offset().left + $(this).width() / 2, $(this).offset().top + $(this).height());

        // Image mode power.
        that.imageMode = true;

        that.$bttn_wrapper.find('.fr-bttn').removeClass('active');
      }
    });
  };

  /**
   * Init popup for image.
   */
  $.Editable.prototype.initImagePopup = function () {
    this.$image_editor = $('<div class="froala-popup froala-image-editor-popup" style="display: none">');

    var $buttons = $('<div class="f-popup-line">').appendTo(this.$image_editor);
    for (var i = 0; i < this.options.imageButtons.length; i++) {
      var cmd = this.options.imageButtons[i];
      if ($.Editable.image_commands[cmd] === undefined) {
        continue;
      }
      var button = $.Editable.image_commands[cmd];

      var btn = '<button class="fr-bttn" data-cmd="' + cmd + '" title="' + button.title + '">';

      if (this.options.icons[cmd] !== undefined) {
        btn += this.prepareIcon(this.options.icons[cmd], button.title);
      } else {
        btn += this.prepareIcon(button.icon, button.title);
      }

      btn += '</button>';

      $buttons.append(btn);
    }

    this.addListener('hidePopups', this.hideImageEditorPopup);

    $('<div class="f-popup-line f-image-alt">')
      .append('<label><span data-text="true">Title</span>: </label>')
      .append($('<input type="text">').on('mouseup keydown', function (e) {
        e.stopPropagation();
      }))
      .append('<button class="f-ok" data-text="true" data-cmd="setImageAlt" title="OK">OK</button>')
      .appendTo(this.$image_editor);

    var that = this;

    this.$image_editor.find('button').click(function (e) {
      e.stopPropagation();
      that[$(this).attr('data-cmd')](that.$element.find('span.f-img-editor'));
    });

    this.$popup_editor.append(this.$image_editor);
  };

  /**
   * Float image to the left.
   */
  $.Editable.prototype.floatImageLeft = function ($image_editor) {
    this.addImageClass($image_editor, 'fr-fil');

    if (this.isImage) {
      this.$element.css('float', 'left')
    }

    this.saveUndoStep();
    this.callback('floatImageLeft');

    $image_editor.find('img').click();
  };

  /**
   * Align image center.
   */
  $.Editable.prototype.floatImageNone = function ($image_editor) {
    this.addImageClass($image_editor, 'fr-fin');

    if (!this.isImage) {
      if ($image_editor.parent().get(0) == this.$element.get(0)) {
        $image_editor.wrap('<div style="text-align: center;"></div>');
      } else {
        $image_editor.parents('.f-img-wrap:first').css('text-align', 'center');
      }
    }

    if (this.isImage) {
      this.$element.css('float', 'none')
    }

    this.saveUndoStep();
    this.callback('floatImageNone');

    $image_editor.find('img').click();
  };

  /**
   * Float image to the right.
   */
  $.Editable.prototype.floatImageRight = function ($image_editor) {
    this.addImageClass($image_editor, 'fr-fir');

    if (this.isImage) {
      this.$element.css('float', 'right')
    }

    this.saveUndoStep();
    this.callback('floatImageRight');

    $image_editor.find('img').click();
  };

  /**
   * Link image.
   */
  $.Editable.prototype.linkImage = function ($image_editor) {
    this.showInsertLink();

    this.imageMode = true;

    if ($image_editor.parent().get(0).tagName == 'A') {
      this.$link_wrapper.find('input[type="text"]').val($image_editor.parent().attr('href'));
      this.$link_wrapper.find('.f-external-link').attr('href', $image_editor.parent().attr('href'));

      if ($image_editor.parent().attr('target') == '_blank') {
        this.$link_wrapper.find('input[type="checkbox"]').prop('checked', true);
      } else {
        this.$link_wrapper.find('input[type="checkbox"]').prop('checked', false);
      }
    } else {
      this.$link_wrapper.find('input[type="text"]').val('http://');
      this.$link_wrapper.find('.f-external-link').attr('href', '#');
      this.$link_wrapper.find('input[type="checkbox"]').prop('checked', this.options.alwaysBlank);
    }
  };

  /**
   * Replace image with another one.
   */
  $.Editable.prototype.replaceImage = function ($image_editor) {

    this.showInsertImage();
    this.imageMode = true;

    this.$image_wrapper.find('input[type="text"]').val($image_editor.find('img').attr('src'));

    this.showByCoordinates(this.$popup_editor.offset().left + 20, this.$popup_editor.offset().top - 15);
  };

  /**
   * Remove image.
   */
  $.Editable.prototype.removeImage = function ($image_editor) {
    var img = $image_editor.find('img').get(0);

    var message = 'Are you sure? Image will be deleted.';
    if ($.Editable.LANGS[this.options.language]) {
      message = $.Editable.LANGS[this.options.language].translation[message];
    }

    // Ask to remove.
    if (confirm(message)) {
      // (src)
      if (this.callback('beforeRemoveImage', [$(img)], false)) {
        if ($image_editor.parents('.f-img-wrap').length) {
          $image_editor.parents('.f-img-wrap').remove();
        } else {
          $image_editor.remove();
        }
        this.refreshImageList(true);

        this.hide();

        this.saveUndoStep();
        this.wrapText();
        this.callback('afterRemoveImage', [$(img)]);
        this.focus();

        this.imageMode = false;
      }
    }
    else {
      $image_editor.find('img').click();
    }
  };

  /**
   * Set image alt.
   */
  $.Editable.prototype.setImageAlt = function ($image_editor) {
    $image_editor.find('img').attr('alt', this.$image_editor.find('.f-image-alt input[type="text"]').val());
    $image_editor.find('img').attr('title', this.$image_editor.find('.f-image-alt input[type="text"]').val());

    this.saveUndoStep();
    this.hide();
    this.closeImageMode();
    this.callback('setImageAlt');
  };

  /*
   * Add image wrapper.
   */
  $.Editable.prototype.addImageWrapper = function () {
  }

  /**
   * Add drag and drop upload.
   *
   * @param $holder - jQuery object.
   */
  $.Editable.prototype.buildDragUpload = function () {
    var that = this;

    that.$image_wrapper.on('dragover', '#f-upload-div-' + this._id, function () {
      $(this).addClass('f-hover');
      return false;
    });

    that.$image_wrapper.on('dragend', '#f-upload-div-' + this._id, function () {
      $(this).removeClass('f-hover');
      return false;
    });

    that.$image_wrapper.on('drop', '#f-upload-div-' + this._id, function (e) {
      $(this).removeClass('f-hover');
      e.preventDefault();
      e.stopPropagation();

      that.uploadFile(e.originalEvent.dataTransfer.files);
    });
  };

  $.Editable.prototype.hideImageLoader = function () {
    this.$progress_bar.hide();
    this.$progress_bar.find('span').css('width', '0%').text('');
    this.$image_wrapper.find('#f-image-list-' + this._id).show();
  };

  /**
   * Insert image command.
   *
   * @param image_link
   */
  $.Editable.prototype.writeImage = function (image_link, sanitize) {
    if (sanitize) {
      image_link = this.sanitizeURL(image_link);
    }

    var img = new Image();
    img.onerror = $.proxy(function () {
      this.hideImageLoader();
      this.throwImageError(1);
    }, this);

    if (this.imageMode) {
      img.onload = $.proxy(function () {
        var $img = this.$element.find('.f-img-editor > img');
        $img.attr('src', image_link);

        this.hide();
        this.hideImageLoader();
        this.$image_editor.show();

        this.saveUndoStep();

        // call with (image HTML)
        this.callback('replaceImage', [$img.get(0)]);
      }, this);

      img.src = image_link;

      return false;
    }

    img.onload = $.proxy(function () {
      this.insertLoadedImage(image_link, sanitize);
    }, this);

    img.src = image_link;
  };

  $.Editable.prototype.insertLoadedImage = function (image_link) {
    // Restore saved selection.
    this.restoreSelection();
    this.focus();

    // Image was loaded fine.
    this.callback('imageLoaded', [image_link], false);

    // Build image string.
    var img_s = '<img class="fr-fin" alt="'+ this.options.defaultImageAlt +'" src="' + image_link + '" width="' + this.options.defaultImageWidth + '">';

    // Search for start container.
    var selected_element = this.getSelectionElements()[0];
    var range = this.getRange();
    var $span = (!this.browser.msie && $.Editable.getIEversion() > 8 ? $(range.startContainer) : null);

    // Insert was called with image selected.
    if ($span && $span.hasClass('f-img-wrap')) {

      // Insert image after.
      if (range.startOffset === 1) {
        $span.after('<p><span class="f-marker" data-type="true" data-id="0"></span><br/><span class="f-marker" data-type="false" data-id="0"></span></p>');
        this.restoreSelectionByMarkers();
        this.getSelection().collapseToStart();

      }

      // Insert image before.
      else if (range.startOffset === 0) {
        $span.before('<p><span class="f-marker" data-type="true" data-id="0"></span><br/><span class="f-marker" data-type="false" data-id="0"></span></p>');
        this.restoreSelectionByMarkers();
        this.getSelection().collapseToStart();
      }

      // Add image.
      this.insertHTML(img_s);
    }

    // Insert in table.
    else if (this.getSelectionTextInfo(selected_element).atStart && selected_element != this.$element.get(0) && selected_element.tagName != 'TD' && selected_element.tagName != 'TH' && selected_element.tagName != 'LI') {
      $(selected_element).before('<p>' + img_s + '</p>');
    }

    // Normal insert.
    else {
      this.insertHTML(img_s);
    }

    // IE fix.
    this.$element.find('img').each(function (index, elem) {
      elem.oncontrolselect = function () {
        return false;
      };
    });

    // Hide image controls.
    this.hide();
    this.hideImageLoader();

    // Save in undo stack.
    this.saveUndoStep();

    // Focus after upload.
    this.focus();

    // Have to wrap image.
    this.wrapText();

    // (imageURL)
    this.callback('insertImage', [image_link]);
  };

  $.Editable.prototype.throwImageErrorWithMessage = function (message) {
    this.callback('imageError', [{
      message: message,
      code: 0
    }], false);

    this.hideImageLoader();
  }

  $.Editable.prototype.throwImageError = function (code) {
    var status = 'Unknown image upload error.';
    if (code == 1) {
      status = 'Bad link.';
    } else if (code == 2) {
      status = 'No link in upload response.';
    } else if (code == 3) {
      status = 'Error during file upload.';
    } else if (code == 4) {
      status = 'Parsing response failed.';
    } else if (code == 5) {
      status = 'Image too large.';
    } else if (code == 6) {
      status = 'Invalid image type.';
    } else if (code == 7) {
      status = 'Image can be uploaded only to same domain in IE 8 and IE 9.'
    }

    this.callback('imageError', {
      code: code,
      message: status
    }, false);

    this.hideImageLoader();
  };

  /**
   * Upload files to server.
   *
   * @param files
   */
  $.Editable.prototype.uploadFile = function (files) {
    if (!this.callback('beforeFileUpload', [files], false)) {
      return false;
    }

    if (files !== undefined && files.length > 0) {
      var formData;

      if (this.drag_support.formdata) {
        formData = this.drag_support.formdata ? new FormData() : null;
      }

      if (formData) {
        var key;
        for (key in this.options.imageUploadParams) {
          formData.append(key, this.options.imageUploadParams[key]);
        }

        // Upload to S3.
        if (this.options.imageUploadToS3 !== false) {
          for (key in this.options.imageUploadToS3.params) {
            formData.append(key, this.options.imageUploadToS3.params[key]);
          }

          formData.append('success_action_status', '201');
          formData.append('X-Requested-With', 'xhr');
          formData.append('Content-Type', files[0].type);
          formData.append('key', this.options.imageUploadToS3.keyStart + (new Date()).getTime() + '-' + files[0].name);
        }

        formData.append(this.options.imageUploadParam, files[0]);

        // Check image max size.
        if (files[0].size > this.options.maxImageSize) {
          this.throwImageError(5);
          return false;
        }

        // Check image types.
        if (this.options.allowedImageTypes.indexOf(files[0].type.replace(/image\//g,'')) < 0) {
          this.throwImageError(6);
          return false;
        }
      }

      if (formData) {
        var xhr;
        if (this.options.crossDomain) {
          xhr = this.createCORSRequest('POST', this.options.imageUploadURL);
        } else {
          xhr = new XMLHttpRequest();
          xhr.open('POST', this.options.imageUploadURL);
        }

        xhr.onload = $.proxy(function () {
          this.$progress_bar.find('span').css('width', '100%').text('Please wait!');
          try {
            if (this.options.imageUploadToS3) {
              if (xhr.status == 201) {
                this.parseImageResponseXML(xhr.responseXML);
              } else {
                this.throwImageError(3);
              }
            }
            else {
              if (xhr.status >= 200 && xhr.status < 300) {
                this.parseImageResponse(xhr.responseText);
              } else {
                this.throwImageError(3);
              }
            }
          } catch (ex) {
            // Bad response.
            this.throwImageError(4);
          }
        }, this);

        xhr.onerror = $.proxy(function () {
          // Error on uploading file.
          this.throwImageError(3);

        }, this);

        xhr.upload.onprogress = $.proxy(function (event) {
          if (event.lengthComputable) {
            var complete = (event.loaded / event.total * 100 | 0);
            this.$progress_bar.find('span').css('width', complete + '%');
          }
        }, this);

        xhr.send(formData);

        this.$image_wrapper.find('#f-image-list-' + this._id).hide();
        this.$progress_bar.show();
        this.showInsertImage();
      }
    }
  };

  $.Editable.prototype.parseImageResponse = function (response) {
    try {
      var resp = $.parseJSON(response);
      if (resp.link) {
        this.writeImage(resp.link);
      } else if (resp.error) {
        this.throwImageErrorWithMessage(resp.error);
      } else {
        // No link in upload request.
        this.throwImageError(2);
      }
    } catch (ex) {
      // Bad response.
      this.throwImageError(4);
    }
  };

  $.Editable.prototype.parseImageResponseXML = function (xml_doc) {
    try {
      var link = $(xml_doc).find('Location').text();
      var key = $(xml_doc).find('Key').text();

      // Callback.
      this.options.imageUploadToS3.callback.call(this, link, key);

      if (link) {
        this.writeImage(link);
      } else {
        // No link in upload request.
        this.throwImageError(2);
      }
    } catch (ex) {
      // Bad response.
      this.throwImageError(4);
    }
  }


  $.Editable.prototype.setImageUploadURL = function (url) {
    if (url) {
      this.options.imageUploadURL = url;
    }

    if (this.options.imageUploadToS3) {
      this.options.imageUploadURL = 'https://' + this.options.imageUploadToS3.bucket + '.' + this.options.imageUploadToS3.region + '.amazonaws.com/';
    }
  }

  $.Editable.prototype.closeImageMode = function () {
    this.$element.find('span.f-img-editor > img').each($.proxy(function (index, elem) {
      this.addImageClass($(elem), this.getImageClass($(elem).parent().attr('class')));

      if ($(elem).parents('.f-img-wrap').length > 0) {
        if ($(elem).parent().parent().get(0).tagName == 'A') {
          $(elem).siblings('span.f-img-handle').remove().end().unwrap().parent().unwrap();
        } else {
          $(elem).siblings('span.f-img-handle').remove().end().unwrap().unwrap();
        }
      } else {
        $(elem).siblings('span.f-img-handle').remove().end().unwrap();
      }
    }, this));

    if (this.$element.find('span.f-img-editor').length) {
      this.$element.find('span.f-img-editor').remove();
      this.$element.parents('span.f-img-editor').remove();
    }

    this.$element.removeClass('f-non-selectable');
    if (!this.editableDisabled && !this.isHTML) {
      this.$element.attr('contenteditable', true);
    }

    if (this.$image_editor) {
      this.$image_editor.hide();
    }
  };

  $.Editable.prototype.refreshImageList = function (no_check) {
    if (!this.isLink && !this.options.editInPopup) {
      this.addImageWrapper();

      var newListSrc = [];
      var newList = [];
      var that = this;
      this.$element.find('img').each (function (index, img) {
        var $img = $(img);
        newListSrc.push($img.attr('src'));
        newList.push($img);

        // Add the right class.
        if ($img.parents('.f-img-editor').length === 0 && !$img.hasClass('fr-fil') && !$img.hasClass('fr-fir') && !$img.hasClass('fr-fin')) {
          // Set floating margin.
          var $parent;
          if ($img.css('float') == 'right') {
            $parent = $img.parent();
            if ($parent.hasClass('f-img-editor')) {
              $parent.addClass('fr-fir');
            } else {
              $img.addClass('fr-fir');
            }
          } else if ($img.css('float') == 'left') {
            $parent = $img.parent();
            if ($parent.hasClass('f-img-editor')) {
              $parent.addClass('fr-fil');
            } else {
              $img.addClass('fr-fil');
            }
          } else {
            $parent = $img.parent();
            if ($parent.hasClass('f-img-editor')) {
              $parent.addClass('fr-fin');
            } else {
              $img.addClass('fr-fin');
            }
          }
        }

        if (!that.options.textNearImage) {
          $img.addClass('fr-tni');
        } else {
          $img.removeClass('fr-tni');
        }

        $img.css('margin', '');
        $img.css('float', '');
      });

      if (no_check === undefined) {
        for (var i = 0; i < this.imageList.length; i++) {
          if (newListSrc.indexOf(this.imageList[i].attr('src')) < 0) {
            this.callback('afterRemoveImage', [this.imageList[i]], false);
          }
        }
      }

      this.imageList = newList;
    }
  };

})(jQuery);

(function ($) {
  $.Editable.prototype.showLinkWrapper = function () {
    if (this.$link_wrapper) {
      this.$link_wrapper.show();
      this.$link_wrapper.trigger('hideLinkList');
      this.$link_wrapper.trigger('hideLinkClassList');
      setTimeout($.proxy(function () {
        this.$link_wrapper.find('input[type="text"]').focus().select();
      }, this), 0);

      this.link = true;
    }
  };

  $.Editable.prototype.hideLinkWrapper = function () {
    if (this.$link_wrapper) {
      this.$link_wrapper.hide();
    }
  };

  $.Editable.prototype.showInsertLink = function () {
    this.hidePopups();

    this.showLinkWrapper();
  };

  /**
   * Initialize links.
   */
  $.Editable.prototype.initLink = function () {
    var that = this;

    var cancel_click = function (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    var link_click = function (e) {
      e.stopPropagation();
      e.preventDefault();

      that.link = true;

      that.clearSelection();
      that.removeMarkers();

      if (!that.selectionDisabled) {
        $(this).before('<span class="f-marker" data-type="true" data-id="0" data-fr-verified="true"></span>');
        $(this).after('<span class="f-marker" data-type="false" data-id="0" data-fr-verified="true"></span>');
      }

      that.restoreSelectionByMarkers();

      that.exec('createLink');

      var href = $(this).attr('href') || '';

      that.$link_wrapper.find('input.f-lt').val($(this).text());
      if (!that.isLink) {
        // Simple ampersand.
        that.$link_wrapper.find('input.f-lu').val(href.replace(/\&amp;/g, '&'));
        that.$link_wrapper.find('.f-external-link').attr('href', href);
      }
      else {
        if (href == '#') {
          href = '';
        }

        // Simple ampersand.
        that.$link_wrapper.find('input#f-lu-' + that._id).val(href.replace(/\&amp;/g, '&'));
        that.$link_wrapper.find('.f-external-link').attr('href', href || '#');
      }

      that.$link_wrapper.find('input[type="checkbox"]').prop('checked', $(this).attr('target') == '_blank');

      that.$link_wrapper.find('li.f-choose-link-class').each ($.proxy(function (index, elem) {
        if ($(this).hasClass($(elem).data('class'))) {
          $(elem).click();
        }
      }, this));

      // Show editor.
      that.showByCoordinates($(this).offset().left + $(this).outerWidth() / 2, $(this).offset().top + (parseInt($(this).css('padding-top')) || 0) + $(this).height());

      // Focus on the link wrapper.
      that.$link_wrapper.find('input.f-lu').focus()

      // Make sure we close image mode.
      that.closeImageMode();

      // Show link wrapper.
      that.showInsertLink();
    };

    // Click on a link.
    if (!this.isLink) {
      if (this.iOS()) {
        this.$element.on('click', 'a', cancel_click);
        this.$element.on('touchend', 'a', link_click);
      } else {
        this.$element.on('click', 'a', link_click);
      }
    } else {
      if (this.iOS()) {
        this.$element.on('click', cancel_click);
        this.$element.on('touchend', link_click);
      } else {
        this.$element.on('click', link_click);
      }
    }
  };

  /**
   * Write link in document.
   *
   * @param url - Link URL.
   * @param blank - New tab.
   */
  $.Editable.prototype.writeLink = function (url, text, cls, blank, nofollow) {
    if (this.options.noFollow) {
      nofollow = true;
    }

    if (this.options.alwaysBlank) {
      blank = true;
    }

    var nofollow_string = '';
    var blank_string = '';

    // No follow and link is external.
    if (nofollow === true && /^https?:\/\//.test(url)) {
      nofollow_string = 'rel="nofollow"';
    }

    if (blank === true) {
      blank_string = 'target="_blank"';
    }

    url = this.sanitizeURL(url);

    if (this.imageMode) {
      if (url !== '') {
        if (this.$element.find('.f-img-editor').parent().get(0).tagName != 'A') {
          this.$element.find('.f-img-editor').wrap('<a data-fr-link="true" href="' + url + '" ' + blank_string + ' ' + nofollow_string + '></a>');
        } else {

          var $link = this.$element.find('.f-img-editor').parent();

          if (blank === true) {
            $link.attr('target', '_blank');
          } else {
            $link.removeAttr('target');
          }

          if (nofollow === true) {
            $link.attr('rel', 'nofollow');
          } else {
            $link.removeAttr('rel');
          }

          $link.removeClass(Object.keys(this.options.linkClasses).join(' '));
          $link.attr('href', url).addClass(cls);
        }

        // (URL)
        this.callback('insertImageLink', [url]);
      } else {
        if (this.$element.find('.f-img-editor').parent().get(0).tagName == 'A') {
          $(this.$element.find('.f-img-editor').get(0)).unwrap();
        }

        this.callback('removeImageLink');
      }

      this.saveUndoStep();
      this.showImageEditor();
      this.$element.find('.f-img-editor').find('img').click();

      this.link = false;
    }
    else {
      if (!this.isLink) {
        this.restoreSelection();
        document.execCommand('unlink', false, url);
        this.saveSelectionByMarkers();
        this.$element.find('span[data-fr-link="true"]').each(function (index, elem) {
          $(elem).replaceWith($(elem).html());
        });
        this.restoreSelectionByMarkers();
      } else {
        if (text === '') {
          text = this.$element.text();
        }
      }

      // URL is not empty.
      if (url !== '') {
        var links;
        if (!this.isLink) {
          document.execCommand('createLink', false, url);
          links = this.getSelectionLinks();
        }
        else {
          this.$element.text(text);
          links = [this.$element.attr('href', url).get(0)];
        }

        for (var i = 0; i < links.length; i++) {
          if (blank === true) {
            $(links[i]).attr('target', '_blank');
          } else {
            $(links[i]).removeAttr('target');
          }

          if (nofollow === true && /^https?:\/\//.test(url)) {
            $(links[i]).attr('rel', 'nofollow');
          } else {
            $(links[i]).removeAttr('rel');
          }

          $(links[i]).data('fr-link', true);
          $(links[i]).removeClass(Object.keys(this.options.linkClasses).join(' '));
          $(links[i]).addClass(cls);
        }

        this.$element.find('a:empty').remove();

        // URL
        this.callback('insertLink', [url]);
      } else {
        if (!this.isLink) {
          this.$element.find('a:empty').remove();
        }

        this.callback('removeLink');
      }

      this.saveUndoStep();

      this.hideLinkWrapper();
      this.$bttn_wrapper.show();

      if (!this.options.inlineMode || this.isLink) {
        this.hide();
      }

      this.link = false;
    }
  };

  $.Editable.prototype.createLinkHTML = function () {
    var html = '<div class="froala-popup froala-link-popup" style="display: none;">';
    html += '<h4><span data-text="true">Insert link</span><a target="_blank" title="Open Link" class="f-external-link" href="#"><i class="fa fa-external-link"></i></a><i title="Cancel" class="fa fa-times" id="f-link-close-' + this._id + '"></i></h4>';
    if (this.isLink && this.options.linkText) {
      html += '<div class="f-popup-line"><input type="text" placeholder="Text" class="f-lt" id="f-lt-' + this._id + '"></div>';
    }

    var browse_cls = '';
    if (this.options.linkList.length) {
      browse_cls = 'f-bi';
    }

    html += '<div class="f-popup-line"><input type="text" placeholder="http://www.taihuoniao.com" class="f-lu ' + browse_cls + '" id="f-lu-' + this._id + '"/>';
    if (this.options.linkList.length) {
      html += '<button class="f-browse-links" id="f-browse-links-' + this._id + '"><i class="fa fa-chevron-down"></i></button>';
      html += '<ul id="f-link-list-' + this._id + '">';

      for (var i = 0; i < this.options.linkList.length; i++) {
        var link = this.options.linkList[i];
        html += '<li class="f-choose-link" data-nofollow="' + link.nofollow + '" data-blank="' + link.blank + '" data-body="' + link.body + '" data-title="' + link.title + '" data-href="' + link.href + '">' + link.body + '</li>';
      }

      html += '</ul>';
    }
    html += '</div>';

    if (Object.keys(this.options.linkClasses).length) {
      html += '<div class="f-popup-line"><input type="text" placeholder="Choose link type" class="f-lu f-bi" id="f-luc-' + this._id + '" disabled="disabled"/>';

      html += '<button class="f-browse-links" id="f-links-class-' + this._id + '"><i class="fa fa-chevron-down"></i></button>';
      html += '<ul id="f-link-class-list-' + this._id + '">';

      for (var l_class in this.options.linkClasses) {
        var l_name = this.options.linkClasses[l_class];

        html += '<li class="f-choose-link-class" data-class="' + l_class + '">' + l_name + '</li>';
      }

      html += '</ul>';

      html += '</div>';
    }

    html += '<div class="f-popup-line"><input type="checkbox" id="f-checkbox-' + this._id + '"> <label data-text="true" for="f-checkbox-' + this._id + '">Open in new tab</label><button data-text="true" type="button" class="f-ok" id="f-ok-' + this._id + '">OK</button>';
    if (this.options.unlinkButton) {
      html += '<button type="button" data-text="true" class="f-ok f-unlink" id="f-unlink-' + this._id + '">UNLINK</button>';
    }

    html += '</div></div>';

    return html;
  }

  /**
   * Build create link.
   */
  $.Editable.prototype.buildCreateLink = function () {
    this.$link_wrapper = $(this.createLinkHTML());
    this.$popup_editor.append(this.$link_wrapper);

    var that = this;

    // Link wrapper to hidePopups listener.
    this.addListener('hidePopups', this.hideLinkWrapper);

    // Field to edit text.
    if (this.isLink && this.options.linkText) {
      this.$link_wrapper
        .on('mouseup keydown', 'input#f-lt-' + this._id, $.proxy(function (e) {
          e.stopPropagation();
          this.$link_wrapper.trigger('hideLinkList');
          this.$link_wrapper.trigger('hideLinkClassList');
        }, this));
    }

    // Set URL events.
    this.$link_wrapper
      .on('mouseup keydown', 'input#f-lu-' + this._id, $.proxy(function (e) {
        e.stopPropagation();
        this.$link_wrapper.trigger('hideLinkList');
        this.$link_wrapper.trigger('hideLinkClassList');
      }, this));

    // Blank url event.
    this.$link_wrapper.on('click', 'input#f-checkbox-' + this._id, function (e) {
      e.stopPropagation();
    });

    // OK button.
    this.$link_wrapper
      .on('touchend', 'button#f-ok-' + this._id, function (e) {
        e.stopPropagation();
      })
      .on('click', 'button#f-ok-' + this._id, $.proxy(function () {
        var text;
        var $text = this.$link_wrapper.find('input#f-lt-' + this._id);
        var $url = this.$link_wrapper.find('input#f-lu-' + this._id);
        var $lcls = this.$link_wrapper.find('input#f-luc-' + this._id);
        var $blank_url = this.$link_wrapper.find('input#f-checkbox-' + this._id);

        if ($text) {
          text = $text.val();
        }
        else {
          text = '';
        }

        var url = $url.val();
        if (this.isLink && url === '') {
          url = '#';
        }

        var cls = '';
        if ($lcls) {
          cls = $lcls.data('class');
        }

        this.writeLink(url, text, cls, $blank_url.prop('checked'));
      }, this));

    // Unlink button.
    this.$link_wrapper.on('click touch', 'button#f-unlink-' + this._id, $.proxy(function () {
      this.link = true;
      var $blank_url = this.$link_wrapper.find('input#f-checkbox-' + this._id)
      this.writeLink('', '', '', $blank_url.prop('checked'));
    }, this));

    // Predefined link list.
    if (this.options.linkList.length) {
      this.$link_wrapper
        .on('click touch', 'li.f-choose-link', function () {
          var $link_list_button = that.$link_wrapper.find('button#f-browse-links-' + that._id);
          var $text = that.$link_wrapper.find('input#f-lt-' + that._id);
          var $url = that.$link_wrapper.find('input#f-lu-' + that._id);
          var $blank_url = that.$link_wrapper.find('input#f-checkbox-' + that._id);

          if ($text) {
            $text.val($(this).data('body'));
          }

          $url.val($(this).data('href'));
          $blank_url.prop('checked', $(this).data('blank'));

          $link_list_button.click();
        })
        .on('mouseup', 'li.f-choose-link', function (e) {
          e.stopPropagation();
        })

      this.$link_wrapper
        .on('click', 'button#f-browse-links-' + this._id, function (e) {
          e.stopPropagation();
          var $link_list = that.$link_wrapper.find('ul#f-link-list-' + that._id);
          that.$link_wrapper.trigger('hideLinkClassList')
          $(this).find('i').toggleClass('fa-chevron-down')
          $(this).find('i').toggleClass('fa-chevron-up')
          $link_list.toggle();
        })
        .on('mouseup', 'button#f-browse-links-' + this._id, function (e) {
          e.stopPropagation();
        })

      this.$link_wrapper.bind('hideLinkList', function () {
        var $link_list = that.$link_wrapper.find('ul#f-link-list-' + that._id);
        var $link_list_button = that.$link_wrapper.find('button#f-browse-links-' + that._id);
        if ($link_list && $link_list.is(':visible')) {
          $link_list_button.click();
        }
      })
    }

    // Link classes.
    if (Object.keys(this.options.linkClasses).length) {
      this.$link_wrapper
        .on('mouseup keydown', 'input#f-luc-' + this._id, $.proxy(function (e) {
          e.stopPropagation();
          this.$link_wrapper.trigger('hideLinkList');
          this.$link_wrapper.trigger('hideLinkClassList');
        }, this));

      this.$link_wrapper
        .on('click touch', 'li.f-choose-link-class', function () {
          var $label = that.$link_wrapper.find('input#f-luc-' + that._id);

          $label.val($(this).text());
          $label.data('class', $(this).data('class'));

          that.$link_wrapper.trigger('hideLinkClassList');
        })
        .on('mouseup', 'li.f-choose-link-class', function (e) {
          e.stopPropagation();
        })

      this.$link_wrapper
        .on('click', 'button#f-links-class-' + this._id, function (e) {
          e.stopPropagation();
          that.$link_wrapper.trigger('hideLinkList')
          var $link_list = that.$link_wrapper.find('ul#f-link-class-list-' + that._id);
          $(this).find('i').toggleClass('fa-chevron-down')
          $(this).find('i').toggleClass('fa-chevron-up')
          $link_list.toggle();
        })
        .on('mouseup', 'button#f-links-class-' + this._id, function (e) {
          e.stopPropagation();
        })

      this.$link_wrapper.bind('hideLinkClassList', function () {
        var $link_list = that.$link_wrapper.find('ul#f-link-class-list-' + that._id);
        var $link_list_button = that.$link_wrapper.find('button#f-links-class-' + that._id);
        if ($link_list && $link_list.is(':visible')) {
          $link_list_button.click();
        }
      })
    }

    // Close button.
    this.$link_wrapper
      .on('click', 'i#f-link-close-' + this._id, $.proxy(function () {
        this.$bttn_wrapper.show();
        this.hideLinkWrapper();

        if ((!this.options.inlineMode && !this.imageMode) || this.isLink || this.options.buttons.length === 0) {
          this.hide();
        }

        if (!this.imageMode) {
          this.restoreSelection();
        } else {
          this.showImageEditor();
        }
      }, this))
  };

  /**
   * Get links from selection.
   *
   * @returns {Array}
   */
  // From: http://stackoverflow.com/questions/5605401/insert-link-in-contenteditable-element
  $.Editable.prototype.getSelectionLinks = function () {
    var selectedLinks = [];
    var range;
    var containerEl;
    var links;
    var linkRange;

    if (window.getSelection) {
      var sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        linkRange = document.createRange();
        for (var r = 0; r < sel.rangeCount; ++r) {
          range = sel.getRangeAt(r);
          containerEl = range.commonAncestorContainer;
          if (containerEl.nodeType != 1) {
            containerEl = containerEl.parentNode;
          }
          if (containerEl.nodeName.toLowerCase() == 'a') {
            selectedLinks.push(containerEl);
          } else {
            links = containerEl.getElementsByTagName('a');
            for (var i = 0; i < links.length; ++i) {
              linkRange.selectNodeContents(links[i]);
              if (linkRange.compareBoundaryPoints(range.END_TO_START, range) < 1 && linkRange.compareBoundaryPoints(range.START_TO_END, range) > -1) {
                selectedLinks.push(links[i]);
              }
            }
          }
        }
        linkRange.detach();
      }
    } else if (document.selection && document.selection.type != 'Control') {
      range = document.selection.createRange();
      containerEl = range.parentElement();
      if (containerEl.nodeName.toLowerCase() == 'a') {
        selectedLinks.push(containerEl);
      } else {
        links = containerEl.getElementsByTagName('a');
        linkRange = document.body.createTextRange();
        for (var j = 0; j < links.length; ++j) {
          linkRange.moveToElementText(links[j]);
          if (linkRange.compareEndPoints('StartToEnd', range) > -1 && linkRange.compareEndPoints('EndToStart', range) < 1) {
            selectedLinks.push(links[j]);
          }
        }
      }
    }

    return selectedLinks;
  };

})(jQuery);

(function ($) {
  $.Editable.prototype.browserFixes = function () {
    this.preBlockquoteEnter();

    this.liEnterSafari();

    this.fixBadSpan();
  }

  // Enter for PRE and BLOCKQUOTE.
  $.Editable.prototype.preBlockquoteEnter = function () {
    if (!this.isImage && !this.isLink && !this.options.editInPopup) {
      this.$element.on('keydown', $.proxy(function (e) {
        var keyCode = e.which;
        var deniedTags = ['PRE', 'BLOCKQUOTE'];
        var element = this.getSelectionElements()[0];
        if (keyCode == 13 && this.text() === '' && deniedTags.indexOf((element).tagName) >= 0) {
          if (this.getSelectionTextInfo(element).atEnd && !e.shiftKey) {
            e.preventDefault();
            var $p = $('<p><br></p>');
            $(element).after($p);
            this.setSelection($p.get(0));
          }
          else if (this.browser.webkit || this.browser.msie) {
            e.preventDefault();
            if (this.endsWith($(element).html(), '<br>') || !this.getSelectionTextInfo(element).atEnd) {
              this.insertHTML('<br>');
            }
            else {
              this.insertHTML('<br><br>');
            }
          }
        }
      }, this));
    }
  };

  $.Editable.prototype.liEnterSafari = function () {
    if (this.browser.safari) {
      if (!this.isImage && !this.isLink && !this.options.editInPopup) {
        this.$element.on('keyup', $.proxy(function (e) {
          var keyCode = e.which;

          // Break li on Safari.
          if (keyCode == 13 && this.text() === '' && !e.shiftKey) {
            var element = this.getSelectionElement();

            if ($(element).parents('li').length > 0) {
              var $li = $(element).parents('li:first');
              this.saveSelectionByMarkers();

              var first = true;
              $li.find($.Editable.VALID_NODES.join(',')).each (function (index, elem) {
                if (!first) {
                  $(elem).before('<span data-fr-verified="true" class="end-li"></span>');
                }

                first = false;
              });

              var html = $li.html();
              html = html.replace(/<span data-fr-verified=\"true\" class=\"end-li\"><\/span>/g, '</li><li>');

              $li.replaceWith('<li>' + html + '</li>');

              this.restoreSelectionByMarkers();
            }
          }
        }, this));
      }
    }
  };


  $.Editable.prototype.fixBadSpan = function () {
    this.$element.on('DOMNodeInserted', $.proxy(function (e) {
      if (e.target.tagName == 'SPAN' && !$(e.target).attr('data-fr-verified') && !this.no_verify) {
        $(e.target).before($(e.target).contents());

        $(e.target).remove();
      }

      if (e.target.tagName == 'BR') {
        var $parent = $(e.target).parent();

        // Fix double BR in list.
        if ($parent.get(0).tagName == 'LI' && $parent.find($.Editable.VALID_NODES.join(',')).length > 0) {
          $(e.target).remove();
        }

        // Fix deleting last item from list merges to the upper p, but doesn't remove the list.
        else if ($parent.get(0).tagName == 'LI' && $parent.find($.Editable.VALID_NODES.join(',')).length === 0 && $parent.text() === '' && $parent.find('img').length === 0 && $parent.parents('ul, ol').find('li').length === 1) {
          $parent.remove();
        }
      }
    }, this));
  };

})(jQuery);

// jquery.event.move
//
// 1.3.6
//
// Stephen Band
//
// Triggers 'movestart', 'move' and 'moveend' events after
// mousemoves following a mousedown cross a distance threshold,
// similar to the native 'dragstart', 'drag' and 'dragend' events.
// Move events are throttled to animation frames. Move event objects
// have the properties:
//
// pageX:
// pageY:   Page coordinates of pointer.
// startX:
// startY:  Page coordinates of pointer at movestart.
// distX:
// distY:  Distance the pointer has moved since movestart.
// deltaX:
// deltaY:  Distance the finger has moved since last event.
// velocityX:
// velocityY:  Average velocity over last few events.


(function (module) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], module);
	} else {
		// Browser globals
		module(jQuery);
	}
})(function(jQuery, undefined){

	var // Number of pixels a pressed pointer travels before movestart
	    // event is fired.
	    threshold = 6,

	    add = jQuery.event.add,

	    remove = jQuery.event.remove,

	    // Just sugar, so we can have arguments in the same order as
	    // add and remove.
	    trigger = function(node, type, data) {
	    	jQuery.event.trigger(type, data, node);
	    },

	    // Shim for requestAnimationFrame, falling back to timer. See:
	    // see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	    requestFrame = (function(){
	    	return (
	    		window.requestAnimationFrame ||
	    		window.webkitRequestAnimationFrame ||
	    		window.mozRequestAnimationFrame ||
	    		window.oRequestAnimationFrame ||
	    		window.msRequestAnimationFrame ||
	    		function(fn, element){
	    			return window.setTimeout(function(){
	    				fn();
	    			}, 25);
	    		}
	    	);
	    })(),

	    ignoreTags = {
	    	textarea: true,
	    	input: true,
	    	select: true,
	    	button: true
	    },

	    mouseevents = {
	    	move: 'mousemove',
	    	cancel: 'mouseup dragstart',
	    	end: 'mouseup'
	    },

	    touchevents = {
	    	move: 'touchmove',
	    	cancel: 'touchend',
	    	end: 'touchend'
	    };


	// Constructors

	function Timer(fn){
		var callback = fn,
		    active = false,
		    running = false;

		function trigger(time) {
			if (active){
				callback();
				requestFrame(trigger);
				running = true;
				active = false;
			}
			else {
				running = false;
			}
		}

		this.kick = function(fn) {
			active = true;
			if (!running) { trigger(); }
		};

		this.end = function(fn) {
			var cb = callback;

			if (!fn) { return; }

			// If the timer is not running, simply call the end callback.
			if (!running) {
				fn();
			}
			// If the timer is running, and has been kicked lately, then
			// queue up the current callback and the end callback, otherwise
			// just the end callback.
			else {
				callback = active ?
					function(){ cb(); fn(); } :
					fn ;

				active = true;
			}
		};
	}


	// Functions

	function returnTrue() {
		return true;
	}

	function returnFalse() {
		return false;
	}

	function preventDefault(e) {
		e.preventDefault();
	}

	function preventIgnoreTags(e) {
		// Don't prevent interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }

		e.preventDefault();
	}

	function isLeftButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey);
	}

	function identifiedTouch(touchList, id) {
		var i, l;

		if (touchList.identifiedTouch) {
			return touchList.identifiedTouch(id);
		}

		// touchList.identifiedTouch() does not exist in
		// webkit yet… we must do the search ourselves...

		i = -1;
		l = touchList.length;

		while (++i < l) {
			if (touchList[i].identifier === id) {
				return touchList[i];
			}
		}
	}

	function changedTouch(e, event) {
		var touch = identifiedTouch(e.changedTouches, event.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		// Chrome Android (at least) includes touches that have not
		// changed in e.changedTouches. That's a bit annoying. Check
		// that this touch has changed.
		if (touch.pageX === event.pageX && touch.pageY === event.pageY) { return; }

		return touch;
	}


	// Handlers that decide when the first movestart is triggered

	function mousedown(e){
		var data;

		if (!isLeftButton(e)) { return; }

		data = {
			target: e.target,
			startX: e.pageX,
			startY: e.pageY,
			timeStamp: e.timeStamp
		};

		add(document, mouseevents.move, mousemove, data);
		add(document, mouseevents.cancel, mouseend, data);
	}

	function mousemove(e){
		var data = e.data;

		checkThreshold(e, data, e, removeMouse);
	}

	function mouseend(e) {
		removeMouse();
	}

	function removeMouse() {
		remove(document, mouseevents.move, mousemove);
		remove(document, mouseevents.cancel, mouseend);
	}

	function touchstart(e) {
		var touch, template;

		// Don't get in the way of interaction with form elements.
		if (ignoreTags[ e.target.tagName.toLowerCase() ]) { return; }

		touch = e.changedTouches[0];

		// iOS live updates the touch objects whereas Android gives us copies.
		// That means we can't trust the touchstart object to stay the same,
		// so we must copy the data. This object acts as a template for
		// movestart, move and moveend event objects.
		template = {
			target: touch.target,
			startX: touch.pageX,
			startY: touch.pageY,
			timeStamp: e.timeStamp,
			identifier: touch.identifier
		};

		// Use the touch identifier as a namespace, so that we can later
		// remove handlers pertaining only to this touch.
		add(document, touchevents.move + '.' + touch.identifier, touchmove, template);
		add(document, touchevents.cancel + '.' + touch.identifier, touchend, template);
	}

	function touchmove(e){
		var data = e.data,
		    touch = changedTouch(e, data);

		if (!touch) { return; }

		checkThreshold(e, data, touch, removeTouch);
	}

	function touchend(e) {
		var template = e.data,
		    touch = identifiedTouch(e.changedTouches, template.identifier);

		if (!touch) { return; }

		removeTouch(template.identifier);
	}

	function removeTouch(identifier) {
		remove(document, '.' + identifier, touchmove);
		remove(document, '.' + identifier, touchend);
	}


	// Logic for deciding when to trigger a movestart.

	function checkThreshold(e, template, touch, fn) {
		var distX = touch.pageX - template.startX,
		    distY = touch.pageY - template.startY;

		// Do nothing if the threshold has not been crossed.
		if ((distX * distX) + (distY * distY) < (threshold * threshold)) { return; }

		triggerStart(e, template, touch, distX, distY, fn);
	}

	function handled() {
		// this._handled should return false once, and after return true.
		this._handled = returnTrue;
		return false;
	}

	function flagAsHandled(e) {
    try {
      e._handled();
    }
    catch(ex) {
      return false;
    }
	}

	function triggerStart(e, template, touch, distX, distY, fn) {
		var node = template.target,
		    touches, time;

		touches = e.targetTouches;
		time = e.timeStamp - template.timeStamp;

		// Create a movestart object with some special properties that
		// are passed only to the movestart handlers.
		template.type = 'movestart';
		template.distX = distX;
		template.distY = distY;
		template.deltaX = distX;
		template.deltaY = distY;
		template.pageX = touch.pageX;
		template.pageY = touch.pageY;
		template.velocityX = distX / time;
		template.velocityY = distY / time;
		template.targetTouches = touches;
		template.finger = touches ?
			touches.length :
			1 ;

		// The _handled method is fired to tell the default movestart
		// handler that one of the move events is bound.
		template._handled = handled;

		// Pass the touchmove event so it can be prevented if or when
		// movestart is handled.
		template._preventTouchmoveDefault = function() {
			e.preventDefault();
		};

		// Trigger the movestart event.
		trigger(template.target, template);

		// Unbind handlers that tracked the touch or mouse up till now.
		fn(template.identifier);
	}


	// Handlers that control what happens following a movestart

	function activeMousemove(e) {
		var timer = e.data.timer;

		e.data.touch = e;
		e.data.timeStamp = e.timeStamp;
		timer.kick();
	}

	function activeMouseend(e) {
		var event = e.data.event,
		    timer = e.data.timer;

		removeActiveMouse();

		endEvent(event, timer, function() {
			// Unbind the click suppressor, waiting until after mouseup
			// has been handled.
			setTimeout(function(){
				remove(event.target, 'click', returnFalse);
			}, 0);
		});
	}

	function removeActiveMouse(event) {
		remove(document, mouseevents.move, activeMousemove);
		remove(document, mouseevents.end, activeMouseend);
	}

	function activeTouchmove(e) {
		var event = e.data.event,
		    timer = e.data.timer,
		    touch = changedTouch(e, event);

		if (!touch) { return; }

		// Stop the interface from gesturing
		e.preventDefault();

		event.targetTouches = e.targetTouches;
		e.data.touch = touch;
		e.data.timeStamp = e.timeStamp;
		timer.kick();
	}

	function activeTouchend(e) {
		var event = e.data.event,
		    timer = e.data.timer,
		    touch = identifiedTouch(e.changedTouches, event.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		removeActiveTouch(event);
		endEvent(event, timer);
	}

	function removeActiveTouch(event) {
		remove(document, '.' + event.identifier, activeTouchmove);
		remove(document, '.' + event.identifier, activeTouchend);
	}


	// Logic for triggering move and moveend events

	function updateEvent(event, touch, timeStamp, timer) {
		var time = timeStamp - event.timeStamp;

		event.type = 'move';
		event.distX =  touch.pageX - event.startX;
		event.distY =  touch.pageY - event.startY;
		event.deltaX = touch.pageX - event.pageX;
		event.deltaY = touch.pageY - event.pageY;

		// Average the velocity of the last few events using a decay
		// curve to even out spurious jumps in values.
		event.velocityX = 0.3 * event.velocityX + 0.7 * event.deltaX / time;
		event.velocityY = 0.3 * event.velocityY + 0.7 * event.deltaY / time;
		event.pageX =  touch.pageX;
		event.pageY =  touch.pageY;
	}

	function endEvent(event, timer, fn) {
		timer.end(function(){
			event.type = 'moveend';

			trigger(event.target, event);

			return fn && fn();
		});
	}


	// jQuery special event definition

	function setup(data, namespaces, eventHandle) {
		// Stop the node from being dragged
		//add(this, 'dragstart.move drag.move', preventDefault);

		// Prevent text selection and touch interface scrolling
		//add(this, 'mousedown.move', preventIgnoreTags);

		// Tell movestart default handler that we've handled this
		add(this, 'movestart.move', flagAsHandled);

		// Don't bind to the DOM. For speed.
		return true;
	}

	function teardown(namespaces) {
		remove(this, 'dragstart drag', preventDefault);
		remove(this, 'mousedown touchstart', preventIgnoreTags);
		remove(this, 'movestart', flagAsHandled);

		// Don't bind to the DOM. For speed.
		return true;
	}

	function addMethod(handleObj) {
		// We're not interested in preventing defaults for handlers that
		// come from internal move or moveend bindings
		if (handleObj.namespace === "move" || handleObj.namespace === "moveend") {
			return;
		}

		// Stop the node from being dragged
		add(this, 'dragstart.' + handleObj.guid + ' drag.' + handleObj.guid, preventDefault, undefined, handleObj.selector);

		// Prevent text selection and touch interface scrolling
		add(this, 'mousedown.' + handleObj.guid, preventIgnoreTags, undefined, handleObj.selector);
	}

	function removeMethod(handleObj) {
		if (handleObj.namespace === "move" || handleObj.namespace === "moveend") {
			return;
		}

		remove(this, 'dragstart.' + handleObj.guid + ' drag.' + handleObj.guid);
		remove(this, 'mousedown.' + handleObj.guid);
	}

	jQuery.event.special.movestart = {
		setup: setup,
		teardown: teardown,
		add: addMethod,
		remove: removeMethod,

		_default: function(e) {
			var event, data;

			// If no move events were bound to any ancestors of this
			// target, high tail it out of here.
			if (!e._handled()) { return; }

			function update(time) {
				updateEvent(event, data.touch, data.timeStamp);
				trigger(e.target, event);
			}

			event = {
				target: e.target,
				startX: e.startX,
				startY: e.startY,
				pageX: e.pageX,
				pageY: e.pageY,
				distX: e.distX,
				distY: e.distY,
				deltaX: e.deltaX,
				deltaY: e.deltaY,
				velocityX: e.velocityX,
				velocityY: e.velocityY,
				timeStamp: e.timeStamp,
				identifier: e.identifier,
				targetTouches: e.targetTouches,
				finger: e.finger
			};

			data = {
				event: event,
				timer: new Timer(update),
				touch: undefined,
				timeStamp: undefined
			};

			if (e.identifier === undefined) {
				// We're dealing with a mouse
				// Stop clicks from propagating during a move
				add(e.target, 'click', returnFalse);
				add(document, mouseevents.move, activeMousemove, data);
				add(document, mouseevents.end, activeMouseend, data);
			}
			else {
				// We're dealing with a touch. Stop touchmove doing
				// anything defaulty.
				e._preventTouchmoveDefault();
				add(document, touchevents.move + '.' + e.identifier, activeTouchmove, data);
				add(document, touchevents.end + '.' + e.identifier, activeTouchend, data);
			}
		}
	};

	jQuery.event.special.move = {
		setup: function() {
			// Bind a noop to movestart. Why? It's the movestart
			// setup that decides whether other move events are fired.
			add(this, 'movestart.move', jQuery.noop);
		},

		teardown: function() {
			remove(this, 'movestart.move', jQuery.noop);
		}
	};

	jQuery.event.special.moveend = {
		setup: function() {
			// Bind a noop to movestart. Why? It's the movestart
			// setup that decides whether other move events are fired.
			add(this, 'movestart.moveend', jQuery.noop);
		},

		teardown: function() {
			remove(this, 'movestart.moveend', jQuery.noop);
		}
	};

	add(document, 'mousedown.move', mousedown);
	add(document, 'touchstart.move', touchstart);

	// Make jQuery copy touch event properties over to the jQuery event
	// object, if they are not already listed. But only do the ones we
	// really need. IE7/8 do not have Array#indexOf(), but nor do they
	// have touch events, so let's assume we can ignore them.
	if (typeof Array.prototype.indexOf === 'function') {
		(function(jQuery, undefined){
			var props = ["changedTouches", "targetTouches"],
			    l = props.length;

			while (l--) {
				if (jQuery.event.props.indexOf(props[l]) === -1) {
					jQuery.event.props.push(props[l]);
				}
			}
		})(jQuery);
	};
});

/* WYSIWYGModernizr 2.7.1 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-touch-mq-teststyles-prefixes
 */
;



window.WYSIWYGModernizr = (function( window, document, undefined ) {

    var version = '2.7.1',

    WYSIWYGModernizr = {},


    docElement = document.documentElement,

    mod = 'modernizr',
    modElem = document.createElement(mod),
    mStyle = modElem.style,

    inputElem  ,


    toString = {}.toString,

    prefixes = ' -webkit- -moz- -o- -ms- '.split(' '),



    tests = {},
    inputs = {},
    attrs = {},

    classes = [],

    slice = classes.slice,

    featureName,


    injectElementWithStyles = function( rule, callback, nodes, testnames ) {

      var style, ret, node, docOverflow,
          div = document.createElement('div'),
                body = document.body,
                fakeBody = body || document.createElement('body');

      if ( parseInt(nodes, 10) ) {
                      while ( nodes-- ) {
              node = document.createElement('div');
              node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
              div.appendChild(node);
          }
      }

                style = ['&#173;','<style id="s', mod, '">', rule, '</style>'].join('');
      div.id = mod;
          (body ? div : fakeBody).innerHTML += style;
      fakeBody.appendChild(div);
      if ( !body ) {
                fakeBody.style.background = '';
                fakeBody.style.overflow = 'hidden';
          docOverflow = docElement.style.overflow;
          docElement.style.overflow = 'hidden';
          docElement.appendChild(fakeBody);
      }

      ret = callback(div, rule);
        if ( !body ) {
          fakeBody.parentNode.removeChild(fakeBody);
          docElement.style.overflow = docOverflow;
      } else {
          div.parentNode.removeChild(div);
      }

      return !!ret;

    },

    testMediaQuery = function( mq ) {

      var matchMedia = window.matchMedia || window.msMatchMedia;
      if ( matchMedia ) {
        return matchMedia(mq).matches;
      }

      var bool;

      injectElementWithStyles('@media ' + mq + ' { #' + mod + ' { position: absolute; } }', function( node ) {
        bool = (window.getComputedStyle ?
                  getComputedStyle(node, null) :
                  node.currentStyle)['position'] == 'absolute';
      });

      return bool;

     },
    _hasOwnProperty = ({}).hasOwnProperty, hasOwnProp;

    if ( !is(_hasOwnProperty, 'undefined') && !is(_hasOwnProperty.call, 'undefined') ) {
      hasOwnProp = function (object, property) {
        return _hasOwnProperty.call(object, property);
      };
    }
    else {
      hasOwnProp = function (object, property) {
        return ((property in object) && is(object.constructor.prototype[property], 'undefined'));
      };
    }


    if (!Function.prototype.bind) {
      Function.prototype.bind = function bind(that) {

        var target = this;

        if (typeof target != "function") {
            throw new TypeError();
        }

        var args = slice.call(arguments, 1),
            bound = function () {

            if (this instanceof bound) {

              var F = function(){};
              F.prototype = target.prototype;
              var self = new F();

              var result = target.apply(
                  self,
                  args.concat(slice.call(arguments))
              );
              if (Object(result) === result) {
                  return result;
              }
              return self;

            } else {

              return target.apply(
                  that,
                  args.concat(slice.call(arguments))
              );

            }

        };

        return bound;
      };
    }

    function setCss( str ) {
        mStyle.cssText = str;
    }

    function setCssAll( str1, str2 ) {
        return setCss(prefixes.join(str1 + ';') + ( str2 || '' ));
    }

    function is( obj, type ) {
        return typeof obj === type;
    }

    function contains( str, substr ) {
        return !!~('' + str).indexOf(substr);
    }


    function testDOMProps( props, obj, elem ) {
        for ( var i in props ) {
            var item = obj[props[i]];
            if ( item !== undefined) {

                            if (elem === false) return props[i];

                            if (is(item, 'function')){
                                return item.bind(elem || obj);
                }

                            return item;
            }
        }
        return false;
    }
    tests['touch'] = function() {
        var bool;

        if(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
          bool = true;
        } else {
          injectElementWithStyles(['@media (',prefixes.join('touch-enabled),('),mod,')','{#modernizr{top:9px;position:absolute}}'].join(''), function( node ) {
            bool = node.offsetTop === 9;
          });
        }

        return bool;
    };
    for ( var feature in tests ) {
        if ( hasOwnProp(tests, feature) ) {
                                    featureName  = feature.toLowerCase();
            WYSIWYGModernizr[featureName] = tests[feature]();

            classes.push((WYSIWYGModernizr[featureName] ? '' : 'no-') + featureName);
        }
    }



     WYSIWYGModernizr.addTest = function ( feature, test ) {
       if ( typeof feature == 'object' ) {
         for ( var key in feature ) {
           if ( hasOwnProp( feature, key ) ) {
             WYSIWYGModernizr.addTest( key, feature[ key ] );
           }
         }
       } else {

         feature = feature.toLowerCase();

         if ( WYSIWYGModernizr[feature] !== undefined ) {
                                              return WYSIWYGModernizr;
         }

         test = typeof test == 'function' ? test() : test;

         if (typeof enableClasses !== "undefined" && enableClasses) {
           docElement.className += ' ' + (test ? '' : 'no-') + feature;
         }
         WYSIWYGModernizr[feature] = test;

       }

       return WYSIWYGModernizr;
     };


    setCss('');
    modElem = inputElem = null;


    WYSIWYGModernizr._version      = version;

    WYSIWYGModernizr._prefixes     = prefixes;

    WYSIWYGModernizr.mq            = testMediaQuery;
    WYSIWYGModernizr.testStyles    = injectElementWithStyles;
    return WYSIWYGModernizr;

})(this, this.document);
;
/*!
 * froala_editor v1.1.9 (http://editor.froala.com)
 * Copyright 2014-2014 Froala
 */
!function(a){a.Editable.TAG_ORDER=["table","thead","tbody","tfoot","tr","th","td","ul","ol","li","h1","h2","h3","h4","h5","h6","pre","blockquote","p","div","a","strong","em","strike","u","span","iframe"],a.Editable.SEPARATE=["th","td","li","h1","h2","h3","h4","h5","h6","pre","blockquote","p","div"],a.Editable.prototype.tagKey=function(a){return a.type+(a.attrs||[]).sort().join("|")},a.Editable.prototype.extendedKey=function(a){return this.tagKey(a)+JSON.stringify(a.style)},a.Editable.prototype.mergeStyle=function(a,b){for(var c={},d=["font_size","font_family","color","background_color"],e=0;e<d.length;e++){var f=d[e];c[f]=null!=b.style[f]?b.style[f]:a.style[f]}return c},a.Editable.prototype.mapDOM=function(b){for(var c,d,e,f,g=0,h=0,i=[],j="",k=[],l={},m={},n=0;n<b.length;n++)if(c=b.charAt(n),"<"==c){var o=b.indexOf(">",n+1);if(-1!==o){if(h++,d=b.substring(n,o+1),f=this.tagName(d),"b"==f&&(f="strong"),"i"==f&&(f="em"),this.isSelfClosingTag(d)){m[g]||(m[g]=[]),m[g].push({i:h,content:d}),n=o;continue}var p=this.isClosingTag(d),q=null,r=null,s=null,t=null,u=null,v=d.replace(/^<[\S\s]* style=("[^"]+"|'[^']+')[\S\s]*>$/gi,"$1");if(v!=d&&(v=v.substring(1,v.length-1),q=v.replace(/^[\S\s]*font-size: *([^;]+)[\S\s]*$/gi,"$1"),q==v&&(q=null),r=v.replace(/^[\S\s]*font-family: *([^;]+)[\S\s]*$/gi,"$1"),r==v&&(r=null),s=v.replace(/.*(;|^) *color: *([^;]+)[\S\s]*$/gi,"$2"),s==v&&(s=null),t=v.replace(/^[\S\s]*background-color: *([^;]+)[\S\s]*$/gi,"$1"),t==v&&(t=null)),u=d.match(/([\w\-]*)=("[^<>"]*"|'[^<>']*'|\w+)/gi))for(var w=0;w<u.length;w++)0===u[w].indexOf("style=")&&u.splice(w,1);if(p){var x=l[f].pop();g!=i[x].start||"span"!=f&&"iframe"!=f&&"a"!=f||(m[g]||(m[g]=[]),m[g].push({i:i[x].i,content:i[x].original}),m[g].push({i:h,content:d}))}else i.push({type:f,attrs:u,style:{font_size:q,font_family:r,color:s,background_color:t},start:g,i:h,original:d}),l[f]||(l[f]=[]),l[f].push(i.length-1);n=o}}else{j+=c,k[g]={};for(f in l){e=l[f];for(var y=0;y<e.length;y++){d=i[e[y]];var z=this.tagKey(d);k[g][z]?k[g][z].style=this.mergeStyle(k[g][z],d):k[g][z]=a.extend({},d)}}g++}var A=[];for(n=0;n<k.length;n++){A[n]={};for(var B in k[n])A[n][this.extendedKey(k[n][B])]=k[n][B]}return{text:j,format:A,simple_tags:m}},a.Editable.prototype.froalaDOM=function(b){for(var c,d=[],e={},f=0;f<b.length;f++){var g=b[f];for(c in e)g[c]||(e[c].end=f,d.push(a.extend({},e[c])),delete e[c]);for(var h in g)e[h]||(g[h].start=f,e[h]=g[h])}for(c in e)e[c].end=b.length,d.push(e[c]);return d},a.Editable.prototype.sortNodes=function(b,c){return a.Editable.TAG_ORDER.indexOf(b.type)>a.Editable.TAG_ORDER.indexOf(c.type)},a.Editable.prototype.sortSimpleTags=function(a,b){return a.i>b.i},a.Editable.prototype.openTag=function(a){var b="<"+a.type;if(a.attrs){a.attrs.sort();for(var c=0;c<a.attrs.length;c++)b+=" "+a.attrs[c]}var d="";for(var e in a.style)null!=a.style[e]&&(d+=e.replace("_","-")+": "+a.style[e]+";");return""!==d&&(b+=' style="'+d+'"'),b+=">"},a.Editable.prototype.cleanOutput=function(b){var c,d,e,f,g=this.mapDOM(b),h=this.froalaDOM(g.format),i=g.simple_tags,j=g.text,k={};for(d=0;d<h.length;d++)c=h[d],k[c.start]||(k[c.start]=[]),k[c.start].push(c);var l={};for(b="",d=0;d<=j.length;d++){var m=[];if(i[d])for(i[d]=i[d].sort(this.sortSimpleTags),f=0;f<i[d].length;f++)b+=i[d][f].content;if(l[d]){for(var n in l)if(n>d)for(e=0;e<l[n].length;e++){var o=l[n][e];o.start>=l[d][l[d].length-1].start&&a.Editable.TAG_ORDER.indexOf(o.type)>a.Editable.TAG_ORDER.indexOf(l[d][l[d].length-1].type)&&a.Editable.SEPARATE.indexOf(o.type)<0&&(b+="</"+o.type+">",m.push(o),l[n].splice(e,1))}for(e=0;e<l[d].length;e++)b+="</"+l[d][e].type+">"}for(k[d]||(k[d]=[]);m.length>0;){var p=m.pop();p.start=d,k[d].push(p)}if(k[d])for(k[d].sort(this.sortNodes),e=0;e<k[d].length;e++)c=k[d][e],l[c.end]||(l[c.end]=[]),l[c.end].push(c),b+=this.openTag(c);d!=j.length&&(b+=j[d])}return b},a.Editable.prototype.cleanify=function(b){var c,d="p, div, td, th, pre, li, blockquote";if(void 0===b&&(b=!0),this.no_verify=!0,this.saveSelectionByMarkers(),c=b?this.getSelectionElements():this.$element.find(d),c[0]!=this.$element.get(0))for(var e=0;e<c.length;e++){var f=a(c[e]);f.html(this.cleanOutput(f.html()))}else 0===this.$element.find(d).length&&this.$element.html(this.cleanOutput(this.$element.html()));this.restoreSelectionByMarkers(),this.$element.find("span").attr("data-fr-verified",!0),this.no_verify=!1}}(jQuery);