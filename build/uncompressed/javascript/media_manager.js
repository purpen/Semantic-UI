/*!
 * froala_editor v1.1.9 (http://editor.froala.com)
 * Copyright 2014-2014 Froala
 */

(function ($) {
  $.Editable.DEFAULTS = $.extend($.Editable.DEFAULTS, {
    mediaManager: true
  })

  $.Editable.prototype.showMediaManager = function () {
    this.$image_modal.show();
    this.$overlay.show();
    this.loadImages();
    $('body').css('overflow','hidden');
  }

  $.Editable.prototype.hideMediaManager = function () {
    this.$image_modal.hide();
    this.$overlay.hide();
    $('body').css('overflow','');
  }

  $.Editable.prototype.mediaModalHTML = function () {
    var html = '<div class="froala-modal"><div class="f-modal-wrapper"><h4><span data-text="true">Manage images</span><i title="Cancel" class="fa fa-times" id="f-modal-close-' + this._id + '"></i></h4>'

    html += '<img class="f-preloader" id="f-preloader-' + this._id + '" alt="Loading..." src="' + this.options.preloaderSrc + '" style="display: none;">';

    if (WYSIWYGModernizr.touch) {
      html += '<div class="f-image-list f-touch" id="f-image-list-' + this._id + '"></div>';
    } else {
      html += '<div class="f-image-list" id="f-image-list-' + this._id + '"></div>';
    }

    html += '</div></div>';

    return html;
  }

  $.Editable.prototype.buildMediaManager = function () {
    this.$image_modal = $(this.mediaModalHTML()).appendTo('body');
    this.$preloader = this.$image_modal.find('#f-preloader-' + this._id);
    this.$media_images = this.$image_modal.find('#f-image-list-' + this._id);
    this.$overlay = $('<div class="froala-overlay">').appendTo('body');

    // Close button.
    this.$image_modal.find('i#f-modal-close-' + this._id)
      .click($.proxy(function () {
        this.hideMediaManager();
      }, this))

    // Select image.
    this.$media_images.on('click touch', 'img', $.proxy(function (e) {
      e.stopPropagation();
      var img = e.currentTarget;
      this.writeImage($(img).attr('src'))
      this.hideMediaManager();
    }, this));

    // Delete image.
    this.$media_images.on('click touchend', '.f-delete-img', $.proxy(function (e) {
      e.stopPropagation();
      var img = $(e.currentTarget).prev();
      var message = 'Are you sure? Image will be deleted.';
      if ($.Editable.LANGS[this.options.language]) {
        message = $.Editable.LANGS[this.options.language].translation[message];
      }

      // Ask for confirmation.
      if (confirm(message)) {
        if (this.callback('beforeDeleteImage', [$(img)], false) !== false) {
          $(img).parent().addClass('f-img-deleting');
          this.deleteImage($(img));
        }
      }
    }, this));

    // Add button for media manager to image.
    if (this.options.mediaManager) {
      this.$image_wrapper
        .on('click', '#f-browser-' + this._id, $.proxy(function () {
          this.showMediaManager();
        }, this))
        .on('click', '#f-browser-' + this._id + ' i', $.proxy(function () {
          this.showMediaManager();
        }, this))

      this.$image_wrapper.find('#f-browser-' + this._id).show();
    }

    this.hideMediaManager();
  };

  // Process loaded images.
  $.Editable.prototype.processLoadedImages = function (data) {
    try {
      var images = data;
      this.$media_images.empty();
      for (var i = 0; i < images.length; i++) {
        if (images[i].src) {
          this.loadImage(images[i].src, images[i].info);
        }
        else {
          this.loadImage(images[i]);
        }
      }
    } catch (ex) {
      this.throwImageError(4);
    }
  };

  // Load images from server.
  $.Editable.prototype.loadImages = function () {
    this.$preloader.show();
    this.$media_images.empty();

    if (this.options.imagesLoadURL) {
      $.support.cors = true;
      $.getJSON(this.options.imagesLoadURL, this.options.imagesLoadParams, $.proxy(function (data) {
        // data
        this.callback('imagesLoaded', [data], false);
        this.processLoadedImages(data);
        this.$preloader.hide();
      }, this))
        .fail($.proxy(function () {
          // (error)
          this.callback('imagesLoadError', ['Load request failed.'], false);
          this.$preloader.hide();
        }, this));
    }
    else {
      this.callback('imagesLoadError', ['Missing imagesLoadURL option.'], false);
      this.$preloader.hide();
    }
  };

  $.Editable.prototype.loadImage = function (src, info) {
    var img = new Image();
    var $li = $('<div>').addClass('f-empty');
    img.onload = $.proxy(function () {
      var delete_msg = 'Delete';
      if ($.Editable.LANGS[this.options.language]) {
        delete_msg = $.Editable.LANGS[this.options.language].translation[delete_msg];
      }

      var $img = $('<img src="' + src + '"/>');
      for (var k in info) {
        $img.attr('data-' + k, info[k]);
      }

      $li.append($img).append('<a class="f-delete-img"><span data-text="true">' + delete_msg + '</span></a>');
      $li.removeClass('f-empty');
      this.$media_images.hide();
      this.$media_images.show();
      this.callback('imageLoaded', [src], false);
    }, this);

    img.onerror = $.proxy(function () {
      $li.remove();
      this.throwImageError(1);
    }, this)

    img.src = src;
    this.$media_images.append($li);
  };

})(jQuery);
