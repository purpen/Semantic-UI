/*!
 * froala_editor v1.1.9 (http://editor.froala.com)
 * Copyright 2014-2014 Froala
 */

(function ($) {
  $.Editable.VIDEO_PROVIDERS = [
    {
      test_regex: /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,
      url_regex: /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/)?(.+)/g,
      url_text: '//www.youtube.com/embed/$1',
      html: '<iframe width="640" height="360" src="{url}" frameborder="0" allowfullscreen></iframe>'
    },
    {
      test_regex: /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/,
      url_regex: /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/(?:channels\/[A-z]+\/|groups\/[A-z]+\/videos\/)?(.+)/g,
      url_text: '//player.vimeo.com/video/$1',
      html: '<iframe width="640" height="360" src="{url}" frameborder="0" allowfullscreen></iframe>'
    },
    {
      test_regex: /^.+(dailymotion.com|dai.ly)\/(video|hub)?\/?([^_]+)[^#]*(#video=([^_&]+))?/,
      url_regex: /(?:https?:\/\/)?(?:www\.)?(?:dailymotion\.com|dai\.ly)\/(?:video|hub)?\/?(.+)/g,
      url_text: '//www.dailymotion.com/embed/video/$1',
      html: '<iframe width="640" height="360" src="{url}" frameborder="0" allowfullscreen></iframe>'
    },
    {
      test_regex: /^.+(screen.yahoo.com)\/(videos-for-you|popular)?\/[^_&]+/,
      url_regex: '',
      url_text: '',
      html: '<iframe width="640" height="360" src="{url}?format=embed" frameborder="0" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true" allowtransparency="true"></iframe>'
    }
  ];

  $.Editable.video_commands = {
    floatVideoLeft: {
      title: 'Float Left',
      icon: {
        type: 'font',
        value: 'fa fa-align-left'
      }
    },

    floatVideoNone: {
      title: 'Float None',
      icon: {
        type: 'font',
        value: 'fa fa-align-justify'
      }
    },

    floatVideoRight: {
      title: 'Float Right',
      icon: {
        type: 'font',
        value: 'fa fa-align-right'
      }
    },

    removeVideo: {
      title: 'Remove Video',
      icon: {
        type: 'font',
        value: 'fa fa-trash-o'
      }
    }
  };

  $.Editable.DEFAULTS = $.extend($.Editable.DEFAULTS, {
    videoButtons: ['floatVideoLeft', 'floatVideoNone', 'floatVideoRight', 'removeVideo']
  })

  $.Editable.commands = $.extend($.Editable.commands, {
    insertVideo: {
      title: 'Insert Video',
      icon: 'fa fa-video-camera'
    }
  });

  $.Editable.prototype.execCommand = $.extend($.Editable.prototype.execCommand, {
    insertVideo: function () {
      this.insertVideo();
    }
  })

  $.Editable.prototype.command_dispatcher = $.extend($.Editable.prototype.command_dispatcher, {
    insertVideo: function (command) {
      var btn = this.buildDefaultButton(command);
      this.$bttn_wrapper.append(btn);
      this.buildInsertVideo();
    }
  });

  /**
   * Insert video.
   */
  $.Editable.prototype.insertVideo = function () {
    this.closeImageMode();
    this.imageMode = false;

    this.showInsertVideo();

    this.saveSelection();

    if (!this.options.inlineMode) {
      this.positionPopup('insertVideo');
    }

    this.$video_wrapper.find('textarea').val('');
  };


  $.Editable.prototype.insertVideoHTML = function () {
    var html = '<div class="froala-popup froala-video-popup" style="display: block;"><h4><span data-text="true">Insert video</span><i title="Cancel" class="fa fa-times" id="f-video-close-' + this._id + '"></i></h4><div class="f-popup-line"><textarea placeholder="Embedded code" id="f-video-textarea-' + this._id + '"></textarea></div><p class="or">or</p><div class="f-popup-line"><input type="text" placeholder="http://taihuoniao.com/" id="f-video-input-' + this._id + '"/><button data-text="true" class="f-ok" id="f-video-ok-' + this._id + '">OK</button></div></div>';

    return html;
  }

  $.Editable.prototype.buildInsertVideo = function () {
    this.$video_wrapper = $(this.insertVideoHTML());
    this.$popup_editor.append(this.$video_wrapper);

    this.addListener('hidePopups', this.hideVideoWrapper);

    this.$video_wrapper.on('mouseup keydown', 'input#f-video-input-' + this._id + ', textarea#f-video-textarea-' + this._id, $.proxy(function (e) {
      e.stopPropagation();
    }, this));

    var that = this;
    this.$video_wrapper.on('change', 'input#f-video-input-' + this._id + ', textarea#f-video-textarea-' + this._id, function () {
      if (this.tagName == 'INPUT') {
        that.$video_wrapper.find('textarea#f-video-textarea-' + that._id).val('');
      } else if (this.tagName == 'TEXTAREA') {
        that.$video_wrapper.find('input#f-video-input-' + that._id).val('');
      }
    });

    this.$video_wrapper.on('click', 'button#f-video-ok-' + this._id, $.proxy(function () {
      var $input = this.$video_wrapper.find('input#f-video-input-' + this._id)
      var $textarea = this.$video_wrapper.find('textarea#f-video-textarea-' + this._id)
      if ($input.val() !== '') {
        this.writeVideo($input.val(), false);
      } else if ($textarea.val() !== '') {
        this.writeVideo($textarea.val(), true);
      }
    }, this))

    this.$video_wrapper.on('click', 'i#f-video-close-' + this._id, $.proxy(function () {
      this.$bttn_wrapper.show();
      this.hideVideoWrapper();

      if (this.options.inlineMode && !this.imageMode && this.options.buttons.length === 0) {
        this.hide();
      }

      this.restoreSelection();

      if (!this.options.inlineMode) {
        this.hide();
      }
    }, this))

    this.$video_wrapper.on('click', function (e) {
      e.stopPropagation();
    })

    this.$video_wrapper.on('click', '*', function (e) {
      e.stopPropagation();
    })

    this.addVideoControls();
  };
  $.Editable.prototype.hideVideoEditorPopup = function () {
    if (this.$video_editor) {
      this.$video_editor.hide();
      $('span.f-video-editor').removeClass('active');

      this.$element.removeClass('f-non-selectable');
      if (!this.editableDisabled && !this.isHTML) {
        this.$element.attr('contenteditable', true);
      }
    }
  };

  $.Editable.prototype.showVideoEditorPopup = function () {
    if (this.$video_editor) {
      this.$video_editor.show();
    }

    this.$element.removeAttr('contenteditable');
  };

  $.Editable.prototype.addVideoControlsHTML = function () {
    this.$video_editor = $('<div class="froala-popup froala-video-editor-popup" style="display: none">');

    var $buttons = $('<div class="f-popup-line">').appendTo(this.$video_editor);

    for (var i = 0; i < this.options.videoButtons.length; i++) {
      var cmd = this.options.videoButtons[i];
      if ($.Editable.video_commands[cmd] === undefined) {
        continue;
      }
      var button = $.Editable.video_commands[cmd];

      var btn = '<button class="fr-bttn" data-cmd="' + cmd + '" title="' + button.title + '">';

      if (this.options.icons[cmd] !== undefined) {
        btn += this.prepareIcon(this.options.icons[cmd], button.title);
      } else {
        btn += this.prepareIcon(button.icon, button.title);
      }

      btn += '</button>';

      $buttons.append(btn);
    }

    var that = this;

    this.$video_editor.find('button').click(function (e) {
      e.stopPropagation();
      that[$(this).attr('data-cmd')]();
    });

    this.addListener('hidePopups', this.hideVideoEditorPopup);

    this.$popup_editor.append(this.$video_editor);
  };

  $.Editable.prototype.floatVideoLeft = function () {
    $('span.f-video-editor.active').attr('class', 'f-video-editor active fr-fvl');

    this.saveUndoStep();
    this.callback('floatVideoLeft');

    $('span.f-video-editor.active').click();
  };

  $.Editable.prototype.floatVideoRight = function () {
    $('span.f-video-editor.active').attr('class', 'f-video-editor active fr-fvr');

    this.saveUndoStep();
    this.callback('floatVideoRight');

    $('span.f-video-editor.active').click();
  };

  $.Editable.prototype.floatVideoNone = function () {
    $('span.f-video-editor.active').attr('class', 'f-video-editor active fr-fvn');

    this.saveUndoStep();
    this.callback('floatVideoNone');

    $('span.f-video-editor.active').click();
  };

  $.Editable.prototype.removeVideo = function () {
    $('span.f-video-editor.active').remove();

    this.hide();

    this.saveUndoStep();
    this.callback('removeVideo');

    this.focus();
  };

  $.Editable.prototype.refreshVideo = function () {
    this.$element.find('iframe').each (function (index, iframe) {
      var $iframe = $(iframe);

      for (var i = 0; i < $.Editable.VIDEO_PROVIDERS.length; i++) {
        var vp = $.Editable.VIDEO_PROVIDERS[i];

        if (vp.test_regex.test($iframe.attr('src'))) {
          if ($iframe.parent('.f-video-editor').length === 0) {
            $iframe.wrap('<span class="f-video-editor fr-fvn" data-fr-verified="true">');
          }

          break;
        }
      }
    })
  }

  $.Editable.prototype.addVideoControls = function () {
    this.addVideoControlsHTML();

    this.addListener('sync', this.refreshVideo);

    this.$element.on('click touchend', 'span.f-video-editor', $.proxy(function (e) {
      e.preventDefault();
      e.stopPropagation();

      var target = e.currentTarget;

      this.clearSelection();

      $(target).addClass('active');
      this.showByCoordinates($(target).offset().left + $(target).width() / 2, $(target).offset().top + $(target).height());

      this.showVideoEditorPopup();
    }, this));
  };

  $.Editable.prototype.writeVideo = function (video_obj, embeded) {
    var video = null;

    if (!embeded) {
      for (var i = 0; i < $.Editable.VIDEO_PROVIDERS.length; i++) {
        var vp = $.Editable.VIDEO_PROVIDERS[i];
        if (vp.test_regex.test(video_obj)) {
          video_obj = video_obj.replace(vp.url_regex, vp.url_text);
          video = vp.html.replace(/\{url\}/, video_obj);
          break;
        }
      }
    } else {
      video = this.clean(video_obj, true, false, ['iframe', 'object', 'param'], ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'webkitallowfullscreen', 'mozallowfullscreen', 'href', 'target']);
	}

    if (video) {
      this.restoreSelection();
      this.$element.focus();
	  
      this.insertHTML('<span class="f-video-editor fr-fvn" data-fr-verified="true">' + video + '</span>');

      this.saveUndoStep();
      this.$bttn_wrapper.show();
      this.hideVideoWrapper();
      this.hide();

      // call with (video)
      this.callback('insertVideo', [video]);
    } else {
      // call with ([])
      this.callback('insertVideoError');
    }
  };

  $.Editable.prototype.showVideoWrapper = function () {
    if (this.$video_wrapper) {
      this.$video_wrapper.show();
      this.$video_wrapper.find('.f-popup-line input').val('')
    }
  };

  $.Editable.prototype.hideVideoWrapper = function () {
    if (this.$video_wrapper) {
      this.$video_wrapper.hide();
    }
  };

  $.Editable.prototype.showInsertVideo = function () {
    this.hidePopups();

    this.showVideoWrapper();
  };

})(jQuery);
