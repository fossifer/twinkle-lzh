//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklewarn.js: Warn module
 ****************************************
 * Mode of invocation:     Tab ("Warn")
 * Active on:              User talk pages
 * Config directives in:   TwinkleConfig
 */


Twinkle.warn = function twinklewarn() {
	if ( Morebits.wiki.flow.relevantUserName() ) {
		Twinkle.addPortletLink( Twinkle.warn.callback, "警告", "tw-warn", "警告或提醒用戶" );
	}

	// modify URL of talk page on rollback success pages
	if( mw.config.get('wgAction') === 'rollback' ) {
		var $vandalTalkLink = $("#mw-rollback-success").find(".mw-usertoollinks a").first();
		if ( $vandalTalkLink.length ) {
			$vandalTalkLink.css("font-weight", "bold");
			$vandalTalkLink.wrapInner($("<span/>").attr("title", "如果合適，您可以用Twinkle在該用戶對話頁上做出警告。"));

			var extraParam = "vanarticle=" + mw.util.rawurlencode(Morebits.pageNameNorm);
			var href = $vandalTalkLink.attr("href");
			if (href.indexOf("?") === -1) {
				$vandalTalkLink.attr("href", href + "?" + extraParam);
			} else {
				$vandalTalkLink.attr("href", href + "&" + extraParam);
			}
		}
	}
};

Twinkle.warn.callback = function twinklewarnCallback() {
	if( Morebits.wiki.flow.relevantUserName() === mw.config.get( 'wgUserName' ) &&
			!confirm( '您將要警告自己！您確定要繼續嗎？' ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 440 );
	Window.setTitle( "警告、通知用戶" );
	Window.setScriptName( "Twinkle" );

	var form = new Morebits.quickForm( Twinkle.warn.callback.evaluate );
	var main_select = form.append( {
			type: 'field',
			label: '選擇警告或通知類別',
			tooltip: '選擇具體的警告模板。'
		} );

	main_select.append( { type: 'select', name: 'sub_group', list: Twinkle.warn.callback.create_list() } );

	form.append( {
		type: 'input',
		name: 'article',
		label: '條目連結',
		value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
		tooltip: '給模板中加入一個條目連結，可留空。'
	} );

	var more = form.append( { type: 'field', name: 'reasonGroup', label: '警告信息' } );
	more.append( { type: 'textarea', label: '可選信息：', name: 'reason', tooltip: '理由或是附加信息' } );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.warn.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = '預覽';
	more.append( { type: 'div', id: 'warningpreview', label: [ previewlink ] } );
	more.append( { type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' } );

	more.append( { type: 'submit', label: '提交' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
	result.previewer = new Morebits.wiki.preview($(result).find('div#twinklewarn-previewbox').last()[0]);
};

// This is all the messages that might be dispatched by the code
Twinkle.warn.messages = {
	'非建設編輯': {
		'uw-vandalism1': '毀文觀（提醒）',
		'uw-vandalism2': '毀文觀（警告）',
		'uw-vandalism3': '毀文觀（最後警告）',
	},
	'文法': {
		'uw-lzh1': '非文言',
		'uw-lzh2': '非文言（最後警告）',
		'uw-lzh-en': '非文言（英文警告）',
		'uw-lzh-en-2': '非文言（英文最後警告）',
		'uw-simp': '簡體字',
		'uw-blp': '生不立傳',
	},
	'態度': {
		'uw-sign': '沒有簽名',
		'uw-civil1': '不文明（提醒）',
		'uw-civil2': '不文明（警告）',
		'uw-editwar': '編輯戰',
		'uw-politicaluserpage': '政治、宗教用戶頁'
	},
};
Twinkle.warn.summary = {
	'uw-vandalism1': '提醒：毀文觀',
	'uw-vandalism2': '警告：毀文觀',
	'uw-vandalism3': '最後警告：毀文觀',
	'uw-lzh1': '非文言',
	'uw-lzh2': '最後警告：非文言',
	'uw-lzh-en': 'Warning: Not Classical Chinese / 警告：非文言',
	'uw-lzh-en-2': 'FINAL Warning: Not Classical Chinese / 最後警告：非文言',
	'uw-simp': '提醒：莫用簡體字',
	'uw-blp': '提醒：生不立傳',
	'uw-sign': '提醒：請簽名',
	'uw-civil1': '提醒：不文明',
	'uw-civil2': '警告：不文明',
	'uw-editwar': '警告：編輯戰',
	'uw-politicaluserpage': '提醒：禁止政治、宗教用戶頁'
};
Twinkle.warn.heading = {
	'*': '提醒',
	'uw-vandalism2': '警示',
	'uw-vandalism3': '末示！',
	'uw-lzh2': '警示',
	'uw-lzh-en': 'Warning',
	'uw-lzh-en-2': 'Final warning',
	'uw-civil2': '警示',
	'uw-editwar': '警示',
};

Twinkle.warn.prev_article = null;
Twinkle.warn.prev_reason = null;

Twinkle.warn.callback.create_list = function () {
	var result = [];
	for (var category in Twinkle.warn.messages) {
		var sublist = [];
		var templates = Twinkle.warn.messages[category];
		for (var name in templates) {
			sublist.push({
				label: '{{' + name + '}}: ' + templates[name],
				value: name
			});
		}
		result.push({
			label: category,
			list: sublist
		});
	}

	var customWarningList = Twinkle.getPref("customWarningList");
	if (customWarningList && customWarningList.length > 0) {
		result.push({
			label: '自定義警告',
			list: customWarningList
		});
	}

	return result;
};

Twinkle.warn.callbacks = {
	getWarningWikitext: function(templateName, article, reason) {
		var text = "{{subst:" + templateName;

		if (article) {
			// add linked article for user warnings
			text += '|1=' + article;
		}

		if (reason) {
			// we assume that custom warnings lack a {{{2}}} parameter
			text += "|2=" + reason;
		}
		text += '|subst=subst:}}';

		return text;
	},
	preview: function(form) {
		var templatename = form.sub_group.value;
		var linkedarticle = form.article.value;
		var templatetext;

		templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle,
			form.reason.value);

		form.previewer.beginRender(templatetext);
	},
	main: function( pageobj ) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var heading = Twinkle.warn.heading[params.sub_group] || Twinkle.warn.heading['*'];

		if( text.length > 0 ) {
			text += "\n\n";
		}

		text += "== " + heading + " ==\n";
		text += Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
			params.reason) + "--~~~~";

		if ( Twinkle.getPref('showSharedIPNotice') && Morebits.isIPAddress( mw.config.get('wgTitle') ) ) {
			Morebits.status.info( '信息', '加入共享IP說明' );
			text +=  "\n{{subst:SharedIPAdvice}}";
		}

		// build the edit summary
		var summary;

		summary = Twinkle.warn.summary[params.sub_group] || '';
		if ( params.article ) {
			summary += "，於[[" + params.article + "]]";
		}

		summary += Twinkle.getPref("summaryAd");

		pageobj.setPageText( text );
		pageobj.setEditSummary( summary );
		pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
		pageobj.save();
	},
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {
	var userTalkPage = 'User_talk:' + Morebits.wiki.flow.relevantUserName();

	// Then, grab all the values provided by the form
	var params = {
		reason: e.target.reason.value,
		sub_group: e.target.sub_group.value,
		article: e.target.article.value,  // .replace( /^(Image|Category):/i, ':$1:' ),  -- apparently no longer needed...
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = "警告完成，將在幾秒後重新載入";

	var wikipedia_page = new Morebits.wiki.page( userTalkPage, '用戶對話頁修改' );
	wikipedia_page.setCallbackParameters( params );
	wikipedia_page.setFollowRedirect( true );
	wikipedia_page.load( Twinkle.warn.callbacks.main );

};
})(jQuery);


//</nowiki>
