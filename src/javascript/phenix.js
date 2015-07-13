/*
 * phenix base js 
 */

var phenix = {
	    // 当前访问者用户信息
	    visitor: {},
		url : {},
		redirect: function(url,delay) {
	        setTimeout(function(){
				window.location = url;
			},delay);
	    },
	    show_error_note: function(msg,delay) {
			msg = '<div class="content"><i class="remove sign icon"></i>'+ msg +'</div>';
	    	phenix.show_notify_bar(msg,'error',delay);
	    },
	    show_ok_note:function(msg,delay) {
			msg = '<div class="content"><i class="checkmark icon"></i>'+ msg +'</div>';
	    	phenix.show_notify_bar(msg,'ok', delay);
	    },
	    show_notify_bar: function(msg,type,delay) {
            var class_name;
	        if(!type || type == 'ok'){
	        	type = 'ok';
				class_name = 'success';
	        }else{
				type = 'error';
				class_name = 'error';
	        }
			
			$.gritter.add({
				title: '',
				text: msg,
				time: delay,
				class_name: class_name,
			});
      //让显示框可以显示在弹出层之上
      $('#gritter-notice-wrapper').css({'z-index':1000});
	    }
};

phenix.show_error_message = function(errors, ele) {
	var html = '<ul class="list">';
  	if ($.isArray(errors)) {
	  	$.each(errors, function(index, value) {
	    	html += '<li>' + value + '</li>';
	  	});
  	} else {
  		html += '<li>' + errors + '</li>';
  	}
  	html += '</ul>';
  	
	$('<div/>')
		.addClass('ui danger message')
		.html(html)
		.prependTo(ele);
};

phenix.show_ok_message = function(msg, ele) {  	
	alert(msg);
};

phenix.before_submit = function() {
	$('.ui.submit.button').addClass('loading');
	$('.ui.error.message').remove();
	return true;
};

phenix.after_submit = function() {
	$('.ui.submit.button').removeClass('loading');
	return true;
};

/*
 * 初始化,设置常用的ajax hook
 */
phenix.initial = function(){
	/*
	var shrink_header = 50;
	var get_current_scroll = function(){
		return window.pageYOffset || document.documentElement.scrollTop;
	}
	
	$(window).scroll(function(){
		var scroll = get_current_scroll();
		if (scroll >= shrink_header) {
			$('header.main').addClass('shrink');
		} else {
			$('header.main').removeClass('shrink');
		}
	});*/
	
	/* 此类为确认后执行的ajax操作 */
	$('a.confirm-request').livequery(function(){
		$(this).click(function(){
			if(confirm('确认执行这个操作吗?')){
	        	$.get($(this).attr('href'));
	        }
	        return false;
		});
	});	
    
    /* 此类为ajax链接 */
	$('a.ajax').livequery(function(){
		$(this).click(function(){
			var res_url = $(this).attr('href');
			// 所有ajax请求，验证是否登录
			if (!phenix.visitor.is_login){
				phenix.show_login_box(res_url);
				return false;
			}
			// 发送ajax请求
			$.get(res_url);
			
	        return false;
		});
	});
	
	// 消息框
	$('.ui.message .close').livequery(function(){
		$(this).on('click', function() {
			$(this).closest('.ui.message').fadeOut('slow');
		});
	});
	
	// 购物车
	$('.ui.basket.button').livequery(function(){
		$(this).on('click', function() {
			var url = $(this).data('url');
			phenix.redirect(url);
		});
	});
	
	// 从购物车删除
	$('#shopping-basket .ui.close.button').livequery(function(){
		$(this).bind('click', function(){
			var sku = $(this).data('sku');
			$.get(phenix.url.domain+'/shopping/remove', {sku: sku});
			return false;
		});
	});
	
	$('#searchbar i.search.icon').click(function(){
		$('#searchbar').submit();
	});
	
	// 取消并返回上一步
	$('.ui.cancel.button').bind('click', function(){
		window.location.href = document.referrer;
	});
	
	$('.ui.pop').popup();
	
	$('.ui.checkbox').checkbox();
	
	$('.ui.selection.dropdown').dropdown();
	
	$('.ui.dropdown').dropdown({
		on  : 'hover'
	});
	
	// 显示微信二维码
	$('.ui.wechat.button').click(function(){
		$('.ui.wechat.modal').modal('show');
		return false;
	});
	
	$('.ui.accordion').accordion();
	
	$.scrollUp({
        scrollText: '<i class="angle up icon"></i>',
		className: 'ui circular topup button',
        scrollTitle: false
    });
	
	phenix.showbox();

	$('.promo .close-promo').click(function(){
		$('.promo').slideUp('slow');
		return false;
	});
};

// 显示登录弹出框
phenix.show_login_box = function(next_res_url) {
    /* 登录表单验证 */
	$('#loginbox-form').form({
		account: {
			identifier  : 'account',
			rules: [
				{
					type   : 'empty',
					prompt : '输入你注册时填写的邮件或手机号码'
				}
			]
		},
		password: {
			identifier  : 'password',
			rules: [
				{
					type   : 'empty',
					prompt : '输入正确的登录密码'
				},
				{
					type   : 'length[6]',
					prompt : '登录密码为必须6位以上字符'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(this).ajaxSubmit({
				dataType: 'json',
				beforeSubmit: function(){
					phenix.before_submit();
				},
				success: function(result){
					phenix.after_submit();
					
					if(result.is_error){
						$(event.target).addClass('error');
						phenix.show_error_note(result.message);
					}else{
						$('.ui.loginbox.modal').modal('hide');
						phenix.visitor = result.data;
						// 登录成功后，自动发送ajax请求
						if (next_res_url) {
							$.get(next_res_url);
						}
					}
				}
			});
		}
	});
	
	// 显示登录框
	$('.ui.loginbox.modal').modal('show');
}

// wap显示登录弹出框
phenix.wap_show_sign_box = function(next_res_url, type) {

  $('.two.fields .field').tab();
  $('.two.fields .field .fluid').tab();
    /* 登录表单验证 */
	$('#login-form').form({
		account: {
			identifier  : 'account',
			rules: [
				{
					type   : 'empty',
					prompt : '输入你注册时填写的手机号码'
				}
			]
		},
		password: {
			identifier  : 'password',
			rules: [
				{
					type   : 'empty',
					prompt : '输入正确的登录密码'
				},
				{
					type   : 'length[6]',
					prompt : '登录密码为必须6位以上字符'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(this).ajaxSubmit({
				dataType: 'json',
				beforeSubmit: function(){
					phenix.before_submit();
				},
				success: function(result){
					phenix.after_submit();
					
					if(result.is_error){
						$(event.target).addClass('error');
						phenix.show_error_note(result.message);
					}else{
						$('.ui.sign-box.modal').modal('hide');
						phenix.visitor = result.data;
						// 登录成功后，自动发送ajax请求
						if (next_res_url) {
              if(type==1){
                phenix.redirect(next_res_url);
              }else if(type==2){
 							  $.get(next_res_url);             
              }
						}
					}
				}
			});
		}
	});

  /*注册表单验证*/
	$('#register-form').form({
		account: {
			identifier  : 'account',
			rules: [
				{
					type   : 'empty',
					prompt : '手机号不能为空'
				}
			]
		},
		verify_code: {
			identifier  : 'verify_code',
			rules: [
				{
					type   : 'empty',
					prompt : '验证码不能为空'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(event.target).ajaxSubmit({
				dataType: 'json',
				beforeSubmit: function(){
					phenix.before_submit();
				},
				success: function(result){
					phenix.after_submit();
					if(result.is_error){
						$(event.target).addClass('error');
						phenix.show_error_note(result.message);
					}else{
						$('.ui.sign-box.modal').modal('hide');
						phenix.visitor = result.data;
            alert('您的默认密码为当前手机号后6位,为了您的账户安全,请尽快去个人中心修改密码!');
						// 注册成功后，自动发送ajax请求
						if (next_res_url) {
              if(type==1){
                phenix.redirect(next_res_url);
              }else if(type==2){
 							  $.get(next_res_url);             
              }
						}
					}
					
				}
			});
		}
	});

  //注册时获取验证码
	var wait = 60,can_send=true;
	var limitime = function(){
		if(wait == 0){
			can_send = true;
			wait = 60;
			$('#fetch-verify-code').removeClass('active').text('获取验证码');
		}else{
			can_send = false;
			
			wait--;
			$('#fetch-verify-code').addClass('active').text('重新发送('+wait+')');
			setTimeout(function(){
				limitime();
			}, 1000);
		}
	}
		
	$('#fetch-verify-code').click(function(){
		var phone = $('#account').val();
		if(!can_send){
		    return false;
		}
		if(phone){
      //验证手机是否注册过
      var check_phone_url = '/app/site/auth/check_account';
      $.get(check_phone_url, {phone: phone}, function(r){
        if(r == 1){
          phenix.show_error_note('手机号已存在！');
          return false;     
        }else{
          // 添加发送频率
          limitime();
      
          $this = $('#fetch-verify-code');
          $.getJSON('/app/site/auth/verify_code', {'phone': phone}, function(result){
            if(result.errorCode == 200){
              $this.removeClass('disabled').text('获取验证码');
            }
          });            
        }
      });
		}else{
			phenix.show_error_note('请正确填写手机号码！');
		}
	});
}

/*
 * 显示/隐藏区块
 */
phenix.showbox = function() {
    $('.showbox').livequery(function(){
		$(this).click(function(){
	        var el =  this.hash && this.hash.substr(1);
			$('#'+el).toggle();
	        return false;
		});
    });
};

/*
 * 计数
 */
phenix.doit = function(eid, n, step){
	var el = $('#'+eid),i;
	var now = el.html();
	if (typeof(step) === "undefined"){
		step = 1;
	}
	if (parseInt(now) == n){
		now = 0;
	}
	i = parseInt(now) + step;
	if (isNaN(i)) {
		i = 0;
	}
	if (i < n) {
		el.html(i.toString());
		setTimeout('phenix.doit(\''+eid+'\','+n+','+step+')', 1);
	} else {
		el.html(n.toString());
	}
};

/*
 * 登录,注册页 
 */
phenix.build_auth_page = function() {
    /* 登录表单验证 */
	$('#login-form').form({
		account: {
			identifier  : 'account',
			rules: [
				{
					type   : 'empty',
					prompt : '请输入您注册时填写的邮件或手机号码'
				}
			]
		},
		password: {
			identifier  : 'password',
			rules: [
				{
					type   : 'empty',
					prompt : '请输入正确的登录密码'
				},
				{
					type   : 'length[6]',
					prompt : '登录密码为必须6位以上字符'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(this).ajaxSubmit({
				dataType: 'json',
				beforeSubmit: function(){
					phenix.before_submit();
				},
				success: function(data){
					phenix.after_submit();
					
					if(data.is_error){
						phenix.show_error_note(data.message, 5000);
					}else{
						phenix.redirect(data.redirect_url);
					}
					
				}
			});
		}
	});
    
    /*注册表单验证*/
	$('#register-form').form({
		account: {
			identifier  : 'account',
			rules: [
				{
					type   : 'empty',
					prompt : '账户名称不能为空'
				}
			]
		},
		verify_code: {
			identifier  : 'verify_code',
			rules: [
				{
					type   : 'empty',
					prompt : '验证码不能为空'
				}
			]
		},
		password: {
			identifier  : 'password',
			rules: [
				{
					type   : 'empty',
					prompt : '请输入正确的登录密码'
				},
				{
					type   : 'length[6]',
					prompt : '登录密码必须6位以上字符'
				}
			]
		},
		password_confirm: {
			identifier  : 'password_confirm',
			rules: [
				{
					type   : 'empty',
					prompt : '请输入正确的确认密码'
				},
				{
					type   : 'match[password]',
					prompt : '两次输入密码不一致'
				}
			]
		},
		//terms
		terms: {
			identifier  : 'terms',
			rules: [
				{
					type   : 'checked',
					prompt : '请先阅读并同意我们的条款'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(event.target).ajaxSubmit({
				dataType: 'json',
				beforeSubmit: function(){
					phenix.before_submit();
				},
				success: function(data){
					phenix.after_submit();
					
					if(data.is_error){
						phenix.show_error_note(data.message, 5000);
					}else{
						phenix.redirect(data.redirect_url);
					}
					
				}
			});
		}
	});
};

// 产品话题
phenix.hook_product_topic = function(){
	$('#topic-form').form({
		title: {
			identifier  : 'title',
			rules: [
				{
					type   : 'empty',
					prompt : '标题不能为空'
				},
				{
					type   : 'maxLength[40]',
					prompt : '内容不超过40字符'
				}
			]
		},
		description: {
			identifier  : 'description',
			rules: [
				{
					type   : 'empty',
					prompt : '评论内容不能为空'
				},
				{
					type   : 'maxLength[140]',
					prompt : '评论内容不超过140字符'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(event.target).ajaxSubmit();
		}
	});
};

// hook 评论行为
phenix.hook_comment_page = function(){	
	$('#comment-form').form({
		content: {
			identifier  : 'content',
			rules: [
				{
					type   : 'empty',
					prompt : '评论内容不能为空'
				},
				{
					type   : 'maxLength[140]',
					prompt : '评论内容不超过140字符'
				}
			]
		}
	}, {
		inline : true,
		onSuccess: function(event){
			event.preventDefault();
			$(event.target).ajaxSubmit();
		}
	})
	.find('.submit.button')
	.ajaxStart(function(){
		$('.ui.submit.button').addClass('loading');
	})
	.ajaxSuccess(function(){
		$('.ui.submit.button').removeClass('loading');
	});
	
  $('.ui.reply.form').livequery(function(){
    $(this).form({
      content: {
        identifier  : 'content',
        rules: [
          {
            type   : 'empty',
            prompt : '评论内容不能为空'
          },
          {
            type   : 'maxLength[1400]',
            prompt : '评论内容不超过1400字符'
          }
        ]
      }
    }, {
      inline : true,
      onSuccess: function(event){
        event.preventDefault();
        $(event.target).ajaxSubmit();
      }
    });
  });
};

// 处理批量附件
phenix.rebuild_batch_assets = function(id){
	var batch_assets = $('#batch_assets').val();
	if (batch_assets){
		var asset_ids = batch_assets.split(',');
		if ($.inArray(id, asset_ids) == -1){
			asset_ids.push(id);
			
			$('#batch_assets').val(asset_ids.join(','));
		}
	}else{
		$('#batch_assets').val(id);
	}
};

// 社会化分享
phenix.bind_share_list = function(pic_url) {
	// 链接，标题，网站名称，子窗口别称，网站链接
	var link = encodeURIComponent(document.location),title = encodeURIComponent(document.title.substring(0,100));
	var source = encodeURIComponent('太火鸟'), windowName = 'tShare', site = 'http://www.taihuoniao.com/';
	
	var getParamsOfShareWindow = function(width, height) {
		return ['toolbar=0,status=0,resizable=1,width=' + width + ',height=' + height + ',left=',(screen.width-width)/2,',top=',(screen.height-height)/2].join('');
	}
	
	$('#wechat-share').click(function() {
		$('.ui.qrcode.modal').modal('show');
		return false;
	});
	
	$('#sina-share').click(function() {
		var url = 'http://v.t.sina.com.cn/share/share.php?url=' + link + '&title=' + title + '&pic=' + pic_url;
		var params = getParamsOfShareWindow(607, 523);
		window.open(url, windowName, params);
		return false;
	});
	// 同一个页面出现2个
	$('#o-share-weibo').click(function() {
		var url = 'http://v.t.sina.com.cn/share/share.php?url=' + link + '&title=' + title + '&pic=' + pic_url;
		var params = getParamsOfShareWindow(607, 523);
		window.open(url, windowName, params);
		return false;
	});
	$('#tencent-share').click(function() {
		var url = 'http://v.t.qq.com/share/share.php?title=' + title + '&url=' + link + '&site=' + site + '&pic=' + pic_url;
		var params = getParamsOfShareWindow(634, 668);
		window.open(url, windowName, params);
		return false;
	});
	$('#douban-share').click(function() {
		var url = 'http://www.douban.com/recommend/?url=' + link + '&title=' + title + '&pic=' + pic_url;
		var params = getParamsOfShareWindow(450, 350);
		window.open(url, windowName, params);
		return false;
	});
	$('#renren-share').click(function() {
		var url = 'http://share.renren.com/share/buttonshare?link=' + link + '&title=' + title + '&pic=' + pic_url;
		var params = getParamsOfShareWindow(626, 436);
		window.open(url, windowName, params);
		return false;
	});
	$('#kaixin001-share').click(function() {
		var url = 'http://www.kaixin001.com/repaste/share.php?rurl=' + link + '&rcontent=' + link + '&rtitle=' + title + '&pic=' + pic_url;
		var params = getParamsOfShareWindow(540, 342);
		window.open(url, windowName, params);
		return false;
	});
	
	$('#netease-share').click(function() {
		var url = 'http://t.163.com/article/user/checkLogin.do?link=' + link + 'source=' + source + '&info='+ title + ' ' + link;
		var params = getParamsOfShareWindow(642, 468);
		window.open(url, windowName, params);
		return false;
	});
	
	$('#facebook-share').click(function() {
		var url = 'http://facebook.com/share.php?u=' + link + '&t=' + title;
		var params = getParamsOfShareWindow(626, 436);
		window.open(url, windowName, params);
		return false;
	});
 
	$('#twitter-share').click(function() {
		var url = 'http://twitter.com/share?url=' + link + '&text=' + title;
		var params = getParamsOfShareWindow(500, 375);
		window.open(url, windowName, params);
		return false;
	});
 
	$('#delicious-share').click(function() {
		var url = 'http://delicious.com/post?url=' + link + '&title=' + title;
		var params = getParamsOfShareWindow(550, 550);
		window.open(url, windowName, params);
		return false;
	});
 
};

/**
 * 设置cookie，用于区别PC与Mobile。
 */
phenix.create_cookie = function(name, value, days, domain, path){
	var expires = '';
	if (days) {
		var d = new Date();
		d.setTime(d.getTime() + (days*24*60*60*1000));
		expires = '; expires=' + d.toGMTString();
	}
	domain = domain ? '; domain=' + domain : '';
	path = '; path=' + (path ? path : '/');
	document.cookie = name + '=' + value + expires + path + domain;
}

/**
 * 读取cookie
 */
phenix.read_cookie = function(name){
	var n = name + '=';
	var cookies = document.cookie.split(';');
	for (var i = 0; i < cookies.length; i++) {
		var c = cookies[i].replace(/^\s+/, '');
		if (c.indexOf(n) == 0) {
			return c.substring(n.length);
		}
	}
	return null;
}

/**
 * 清除cookie
 */
phenix.erase_cookie = function(name, domain, path){
	create_cookie(name, '', -1, domain, path);
}

/**
 * 全局变量声明
 */
var wps_width=0, wps_height=0, wps_ratio=1;
var scale_width=480, scale_height=0;
var crop_width=0, crop_height=0;

/**
 * hook image area select
 */
phenix.hook_imgarea_select = function(){
	scale_height = parseInt(wps_height*scale_width/wps_width);
	ias = $('img#avatar-photo').imgAreaSelect({
		aspectRatio: '1:1',
		x1: 0, 
		y1: 0, 
		x2: 300, 
		y2: 300,
		handles: true,
		parent: '#select-area',
		fadeSpeed: 200,
		instance: true,
		onSelectChange: phenix.preview,
		onSelectEnd: phenix.updateAreaSelect
	});
};

/**
 * 追加ID值
 */
phenix.record_asset_id = function(name, id){
    var ids = $('#'+name).val();
    if (ids.length == 0){
        ids = id;
    }else{
        if (ids.indexOf(id) == -1){
            ids += ','+id;
        }
    }
    $('#'+name).val(ids);
};

//移除id值
phenix.remove_asset_id = function(name, id){
    var ids = $('#'+name).val();
    var ids_arr = ids.split(',');
    var is_index_key = phenix.in_array(ids_arr,id);
    ids_arr.splice(is_index_key,1);
    ids = ids_arr.join(',');
    $('#'+name).val(ids);
};

//查看字符串是否在数组中存在
phenix.in_array = function(arr, val) {
    var i;
    for (i = 0; i < arr.length; i++) {
        if (val === arr[i]) {
            return i;
        }
    }
    return -1;
}; // 返回-1表示没找到，返回其他值表示找到的索引

phenix.preview = function(img, selection) {
	if (!selection.width || !selection.height){
		return;
	}
	$('#x1').val(selection.x1);
	$('#y1').val(selection.y1);
	$('#x2').val(selection.x2);
	$('#y2').val(selection.y2);
	$('#w').val(selection.width);
	$('#h').val(selection.height);
};

phenix.updateAreaSelect = function() {
	// todo
};
/**
 * imgAreaSelect settings
 */
$.extend($.imgAreaSelect.prototype, {
    animateSelection: function (x1, y1, x2, y2, duration) {
        var fx = $.extend($('<div/>')[0], {
            ias: this,
            start: this.getSelection(),
            end: { x1: x1, y1: y1, x2: x2, y2: y2 }
        });
		
        $(fx).animate({
            cur: 1
        },
        {
            duration: duration,
            step: function (now, fx) {
                var start = fx.elem.start, end = fx.elem.end,
                    curX1 = Math.round(start.x1 + (end.x1 - start.x1) * now),
                    curY1 = Math.round(start.y1 + (end.y1 - start.y1) * now),
                    curX2 = Math.round(start.x2 + (end.x2 - start.x2) * now),
                    curY2 = Math.round(start.y2 + (end.y2 - start.y2) * now);
                fx.elem.ias.setSelection(curX1, curY1, curX2, curY2);
                fx.elem.ias.update();
            }
        });
    }
});

// Simplified Chinese
jQuery.extend( jQuery.fn.pickadate.defaults, {
    monthsFull: [ '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月' ],
    monthsShort: [ '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二' ],
    weekdaysFull: [ '星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六' ],
    weekdaysShort: [ '日', '一', '二', '三', '四', '五', '六' ],
    today: '今天',
    clear: '清除',
    firstDay: 1,
    format: 'yyyy-mm-dd',
    formatSubmit: 'yyyy-mm-dd'
});

(function($){
	$.fn.extend({
		insertAtCaret: function(myValue){
			var $t=$(this)[0];
			if (document.selection) {
				this.focus();
				sel = document.selection.createRange();
				sel.text = myValue;
				this.focus();
			}
			else 
				if ($t.selectionStart || $t.selectionStart == '0') {
					var startPos = $t.selectionStart;
					var endPos = $t.selectionEnd;
					var scrollTop = $t.scrollTop;
					$t.value = $t.value.substring(0, startPos) + myValue + $t.value.substring(endPos, $t.value.length);
					this.focus();
					$t.selectionStart = startPos + myValue.length;
					$t.selectionEnd = startPos + myValue.length;
					$t.scrollTop = scrollTop;
				}
				else {
					this.value += myValue;
					this.focus();
				}
		}
	})	
})(jQuery);
