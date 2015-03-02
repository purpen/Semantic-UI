;(function($) {
	$.notifybar = {};
	$.alert_count = 1;
	$.show_notify_bar = function(options) {
		var opts = $.extend({}, $.notifybar.defaults, options);
		var jbar = 'jbar_'+$.alert_count;
		
		timeout = setTimeout('$.remove_notify_bar('+ jbar.toString() +')', opts.time);
		
		var _wrap_bar = $(document.createElement('div')).addClass('ui message').addClass(opts.class_name);
         _wrap_bar.attr('id', jbar);
		 
		if(opts.removebutton){
			var _remove_cross = $('<i class="flat close icon"></i>');
			_remove_cross.click(function(e){$.remove_notify_bar(jbar);});
		}
		else{
			_wrap_bar.css({"cursor"	: "pointer"});
			_wrap_bar.click(function(e){$.remove_notify_bar(jbar);});
		}
		
		var $container = opts.container ? $(opts.container) : $('#gritter-notice-wrapper');
		_wrap_bar.html(opts.message)
			.prepend(_remove_cross).hide()
			.prependTo($container)
			.fadeIn('fast');
			
		$.alert_count += 1;
	};
	var timeout;
	$.remove_notify_bar = function(eid) {
		console.log(eid);
		if($('#'+eid).length){
			clearTimeout(timeout);
			$('#'+eid).fadeOut('fast',function(){
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