//<nowiki>
// vim: set noet sts=0 sw=8:


(function ($) {


/*
 ****************************************
 *** twinkleclose.js: XFD closing module
 ****************************************
 * Mode of invocation:     Links after section heading
 * Active on:              AfD dated archive pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.close = function twinkleclose() {
	if ( !Morebits.userIsInGroup('sysop') || mw.config.get('wgPageName') !== '維基大典:議刪' ) {
		return;
	}

	var spanTag = function( color, content ) {
		var span = document.createElement( 'span' );
		span.style.color = color;
		span.appendChild( document.createTextNode( content ) );
		return span;
	};

	// 把section序号直接标在h1、h2和h3上以免在用某些编辑器时不正常
	$('h1:has(.mw-headline),h2:has(.mw-headline),h3:has(.mw-headline)', '#bodyContent').each(function (index, current) {
		current.setAttribute('data-section', index + 1);
	});

	var selector = ':has(.mw-headline a:only-of-type):not(:has(+ div.discussion-archived))';
	var titles = $('#bodyContent').find('h2' + selector + ':not(:has(+ p + h3)), h3' + selector); // really needs to work on

	var delNode = document.createElement('strong');
	var delLink = document.createElement('a');
	delLink.appendChild( spanTag( 'Black', '[' ) );
	delLink.appendChild( spanTag( 'Red', '結案' ) );
	delLink.appendChild( spanTag( 'Black', ']' ) );
	delNode.appendChild(delLink);

	titles.each(function(key, current) {
		var headlinehref = $(current).find('.mw-headline a').attr('href');
		var title;
		if (headlinehref.indexOf('redlink=1') === -1) {
			title = headlinehref.slice(6);
		}
		else {
			title = headlinehref.slice(19, -22);
		}
		title = decodeURIComponent(title);
		var pagenotexist = $(current).find('.mw-headline a').hasClass('new');
		var section = current.getAttribute('data-section');
		var node = current.getElementsByClassName('mw-headline')[0];
		node.appendChild( document.createTextNode(' ') );
		var tmpNode = delNode.cloneNode( true );
		tmpNode.firstChild.href = '#' + section;
		$(tmpNode.firstChild).click(function() {
			Twinkle.close.callback(title, section, pagenotexist);
			return false;
		});
		node.appendChild( tmpNode );
	});
};

// Keep this synchronized with {{delh}}
Twinkle.close.codes = {
	'無效': {
		'請求無效': {
			label: '請求無效',
			action: 'keep'
		},
		'重複請求': {
			label: '重複請求，無效',
			action: 'keep'
		},
		'尋無此頁': {
			label: '尋無此頁，無效',
			action: 'keep'
		},
	},
	'留': {
		'留': {
			label: '留',
			action: 'keep'
		},
		'速留': {
			label: '速留',
			action: 'keep'
		},
		'暫留': {
			label: '暫留',
			action: 'keep'
		},
	},
	'刪': {
		'刪': {
			label: '刪',
			action: 'del',
			selected: true
		},
		'速刪': {
			label: '速刪',
			action: 'del'
		},
	},
	'移至他山': {
	},
	'其他': {
		'移至他山': {
			label: '移至他山',
			action: 'noop'
		},
		'立渡': {
			label: '立渡',
			action: 'noop'
		},
		'遷': {
			label: '遷',
			action: 'noop'
		},
		'併': {
			label: '併',
			action: 'noop'
		},
		'無共識': {
			label: '無共識',
			action: 'keep'
		}
	}
};

Twinkle.close.callback = function twinklecloseCallback(title, section, noop) {
	var Window = new Morebits.simpleWindow( 400, 150 );
	Window.setTitle( "議刪結案 \u00B7 " + title );
	Window.setScriptName( "Twinkle" );

	var form = new Morebits.quickForm( Twinkle.close.callback.evaluate );

	form.append( {
		type: 'select',
		label: '處理結果：',
		name: 'sub_group',
		event: Twinkle.close.callback.change_code
	} );

	form.append( {
			type: 'input',
			name: 'remark',
			label: '補充說明：'
	} );

	form.append( {
		type: 'checkbox',
		list: [
			{
				label: '只關閉討論，不進行其他操作',
				value: 'noop',
				name: 'noop',
				checked: noop
			}
		]
	} );

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	var sub_group = result.getElementsByTagName('select')[0]; // hack

	var resultData = {
		title: title,
		section: parseInt(section),
		noop: noop
	};
	$(result).data("resultData", resultData);
	// worker function to create the combo box entries
	var createEntries = function( contents, container ) {
		$.each( contents, function( itemKey, itemProperties ) {
			var key = (typeof itemKey === "string") ? itemKey : itemProperties.value;

			var elem = new Morebits.quickForm.element( {
				type: 'option',
				label: key + '：' + itemProperties.label,
				value: key,
				selected: itemProperties.selected
			} );
			var elemRendered = container.appendChild( elem.render() );
			$(elemRendered).data("messageData", itemProperties);
		} );
	};

	$.each( Twinkle.close.codes, function( groupLabel, groupContents ) {
		var optgroup = new Morebits.quickForm.element( {
			type: 'optgroup',
			label: groupLabel
		} );
		optgroup = optgroup.render();
		sub_group.appendChild( optgroup );
		// create the options
		createEntries( groupContents, optgroup );
	} );

	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.sub_group.dispatchEvent( evt );
};

Twinkle.close.callback.change_code = function twinklecloseCallbackChangeCode(e) {
	var resultData = $(e.target.form).data("resultData");
	var messageData = $(e.target).find('option[value="' + e.target.value + '"]').data("messageData");
	var noop = e.target.form.noop;
	if (resultData.noop || messageData.action === 'noop') {
		noop.checked = true;
		noop.disabled = true;
	}
	else {
		noop.checked = false;
		noop.disabled = false;
	}
};

Twinkle.close.callback.evaluate = function twinklecloseCallbackEvaluate(e) {
	var code = e.target.sub_group.value;
	var resultData = $(e.target).data('resultData');
	var messageData = $(e.target.sub_group).find('option[value="' + code + '"]').data("messageData");
	var noop = e.target.noop.checked;
	var params = {
		title: resultData.title,
		code: code,
		remark: e.target.remark.value,
		section: resultData.section,
		messageData: messageData
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.notice = "操作完成";

	if (noop || messageData.action === 'noop') {
		Twinkle.close.callbacks.talkend( params );
	}
	else {
		switch (messageData.action) {
			case 'del':
				Twinkle.close.callbacks.del(params);
				break;
			case 'keep':
				var wikipedia_page = new Morebits.wiki.page( params.title, '移除議刪模板' );
				wikipedia_page.setCallbackParameters( params );
				wikipedia_page.load( Twinkle.close.callbacks.keep );
				break;
			default:
				alert("Twinkle.close：未定義 " + code);
				return;
		}
	}
};

Twinkle.close.callbacks = {
	del: function (params) {
		Morebits.wiki.addCheckpoint();

		var page = new Morebits.wiki.page( params.title, "刪除頁面" );

		page.setEditSummary( '議刪通過' + Twinkle.getPref('deletionSummaryAd') );
		page.deletePage(function() {
			page.getStatusElement().info("完成");
			Twinkle.close.callbacks.talkend( params );
		});
		Morebits.wiki.removeCheckpoint();
	},
	keep: function (pageobj) {
		var statelem = pageobj.getStatusElement();

		if (!pageobj.exists()) {
			statelem.error( "頁面不存在，可能已經刪除" );
			return;
		}

		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var newtext = text.replace(/<noinclude>\s*\{\{(afd|議刪)\|[^{}]*?\}\}\s*<\/noinclude>\s*/gi, '');
		newtext = newtext.replace(/\{\{(afd|議刪)\|[^{}]*?\}\}\s*/gi, '');

		if (newtext === text) {
			statelem.warn("未找到議刪模板，可能已經移除");
			Twinkle.close.callbacks.talkend( params );
			return;
		}
		var editsummary = '議刪結案';

		pageobj.setPageText(newtext);
		pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.close.callbacks.keepComplete);
	},
	keepComplete: function (pageobj) {
		var params = pageobj.getCallbackParameters();
		Twinkle.close.callbacks.talkend( params );
	},

	talkend: function (params) {
		var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), '結案');
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setPageSection(params.section);
		wikipedia_page.load(Twinkle.close.callbacks.saveTalk);
	},
	saveTalk: function (pageobj) {
		var statelem = pageobj.getStatusElement();
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		if (text.indexOf('{{結案') !== -1) {
			statelem.error( "討論已經關閉" );
			return;
		}

		var split = text.split('\n');

		text = split[0] + '\n{{結案-首|' + params.code;
		if (params.remark) {
			text += '：' + params.remark;
		} else {
			text += '。';
		}

		text = text + '--~~~~}}\n' + split.slice(1).join('\n') + '\n{{結案-尾}}';

		pageobj.setPageText(text);
		pageobj.setEditSummary('/* ' + params.title + ' */ ' + params.messageData.label + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.close.callbacks.disableLink);
	},

	disableLink: function (pageobj) {
		var params = pageobj.getCallbackParameters();
		$('strong a[href=#' + params.section + '] span').css('color', 'grey');
	}
};

})(jQuery);


//</nowiki>
