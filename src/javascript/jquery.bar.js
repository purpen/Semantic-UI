;(function($) {
	$.notifybar = {};
	$.show_notify_bar = function(options) {
		var opts = $.extend({}, $.notifybar.defaults, options);
		if(!$('.jbar').length){
			timeout = setTimeout('$.remove_notify_bar()',opts.time);
			var _wrap_bar = $(document.createElement('div')).addClass('ui jbar message').addClass(opts.class_name);
            // _wrap_bar.attr('id','jbar');
			if(opts.removebutton){
				var _remove_cross = $('<i class="flat close icon"></i>');
				_remove_cross.click(function(e){$.remove_notify_bar();});
			}
			else{
				_wrap_bar.css({"cursor"	: "pointer"});
				_wrap_bar.click(function(e){$.remove_notify_bar();});
			}
			var $container = opts.container ? $(opts.container) : $('body');
			_wrap_bar.html(opts.message)
				.prepend(_remove_cross).hide()
				.prependTo($container)
				.fadeIn('fast');
		}
	};
	var timeout;
	$.remove_notify_bar = function() {
		if($('.jbar').length){
			clearTimeout(timeout);
			$('.jbar').fadeOut('fast',function(){
				$(this).remove();
			});
		}
	};
	$.notifybar.defaults = {
		position		 	: 'top',
		removebutton     	: false,
		time			 	: 5000,
		class_name 	        : 'warning'
	};
})(jQuery);