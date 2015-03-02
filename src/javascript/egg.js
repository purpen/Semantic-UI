/*! Copyright (c) 2015 Taihuoniao (http://www.taihuoniao.com)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Version: 3.1.9
 *
 * Requires: jQuery 1.2.2+
 */
phenix.birdegg = {
	init: function(){
		var _this = this;
		_this.pageIndex = 1;
		_this.loadPage();
		
		$('.ui.more').click(function(){
			$.fn.fullpage.moveTo(2);
		});

		$('#eggPage').fullpage({
			menu: '#eggmenu',
		    anchors: ['topbanner', 'instro', 'specially', 'guest', 'process', 'stuffs', 'partners', 'contact'],
			scrollingSpeed: 1000,
			onLeave: function(index, nextIndex, direction){
				phenix.birdegg.hideHeader();
				if(index == 1 && direction == 'down'){
					phenix.birdegg.showTabox();
				}else if(index == 2 && direction == 'up'){
					phenix.birdegg.hideTabox();
				}
				console.log('index:'+ index + '; nextIndex: '+ nextIndex);
				if(nextIndex == 2){
					TweenLite.from('#instro-text', 2, {
						transform: 'translateX(-200px)',
						opacity: 0,
                    });
				}else if(nextIndex == 3){
					TweenLite.from('#specialer01', 2, {
						transform: 'translateY(200px)',
						opacity: 0,
                    });
					TweenLite.from('#specialer02', 2, {
						transform: 'translateY(400px)',
						opacity: 0,
                    });
				}
			},
			afterLoad: function(anchorLink, index){}
		});
		
		$.fn.fullpage.moveTo(1);

		$('body').on('mousewheel', function(e, delta){
			if (e.preventDefault() || window.mousewheelStart === true){
				 return false;
			}
			window.mousewheelStart = true;
			_this.listenMousewheeEvent();
	
			var g = delta > 0 ? true : false,
			h = 0 > delta ? true : false;
			if(1 === _this.pageIndex){
				if(g){
					_this.showHeader();
				}else if(h && window.headerIsShow){
					return _this.hideHeader();
				}
			}
		});
	},
	loadPage: function(){
		var eggboxHeight = function(){
			var h = $(window).height();
			$('#eggBox').height(h);
		}

		eggboxHeight();

		$(window).on('resize', function(){
			eggboxHeight();
		});

		this.hideHeader();
	},
	showTabox: function(){
		$('.ui.tabox').addClass('fxd');
	},
	hideTabox: function(){
		$('.ui.tabox').removeClass('fxd');
	},
	hideHeader: function(){
		$('.header.main').addClass('fp-easing').css({'margin-top': '-130px'});
		window.headerIsShow = false;
	},
	showHeader: function(){
		$('.header.main').css({'margin-top': '0'});
		window.headerIsShow = true;
	},
	listenMousewheeEvent: function(){
		window.listenMousewheel && clearTimeout(window.listenMousewheel),
		window.listenMousewheel = setTimeout(function(){
			window.mousewheelStart = false;
		}, 1500);
	},
};