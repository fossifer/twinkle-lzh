//<nowiki>
// vim: set noet sts=0 sw=8:


(function ($) {


/*
 ****************************************
 *** twinklexfd.js: XFD module
 ****************************************
 * Mode of invocation:     Tab ("XFD")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

Twinkle.xfd = function twinklexfd() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if ( mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect()))) ) {
		return;
	}
	Twinkle.addPortletLink( Twinkle.xfd.callback, "議刪", "tw-xfd", "提交刪除討論" );
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		Morebits.status.printUserText(Twinkle.xfd.currentRationale, "您的理由已在下方提供，如果您想重新提交，請將其複製到一新視窗中：");
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( "議刪" );
	Window.setScriptName( "Twinkle" );

	var form = new Morebits.quickForm( Twinkle.xfd.callback.evaluate );

	form.append({
		type: 'checkbox',
		list: [
			{
				label: '如可能，通知頁面建立者',
				value: 'notify',
				name: 'notify',
				tooltip: "在頁面建立者對話頁上放置一通知模板。",
				checked: true
			}
		]
	});
	var work_area = form.append({
		type: 'field',
		label:'工作區',
		name: 'work_area'
	});

	work_area.append({
		type: 'checkbox',
		list: [
			{
				label: '使用<noinclude>包裹模板',
				value: 'noinclude',
				name: 'noinclude',
				checked: mw.config.get('wgNamespaceNumber') === 10, // Template namespace
				tooltip: '使其不會在被包含時出現。'
			}
		]
	});

	work_area.append({
		type: 'textarea',
		name: 'xfdreason',
		label: '理由：',
		value: '',
		tooltip: '您可以使用維基格式，Twinkle將自動為您加入簽名。'
	});


	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
};

Twinkle.xfd.previousNotify = true;

Twinkle.xfd.callbacks = {
	main: function(pageobj) {
		// this is coming in from lookupCreator...!
		var params = pageobj.getCallbackParameters();

		// Adding discussion
		var wikipedia_page = new Morebits.wiki.page(params.logpage, "添加討論");
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.xfd.callbacks.todaysList);

		// Notification to first contributor
		if (params.usertalk) {
			var initialContrib = pageobj.getCreator();

			// Disallow warning yourself
			if (initialContrib === mw.config.get('wgUserName')) {
				pageobj.getStatusElement().warn("您（" + initialContrib + "）建立了該頁，跳過通知");
				return;
			}

			var talkPageName = 'User talk:' + initialContrib;

			var usertalkpage = new Morebits.wiki.page(talkPageName, "通知頁面建立者（" + initialContrib + "）");
			var notifytext = "\n{{subst:AFDNote|" + Morebits.pageNameNorm + "}}--~~~~";
			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary("議刪[[" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			usertalkpage.setCreateOption('recreate');
			switch (Twinkle.getPref('xfdWatchUser')) {
				case 'yes':
					usertalkpage.setWatchlist(true);
					break;
				case 'no':
					usertalkpage.setWatchlistFromPreferences(false);
					break;
				default:
					usertalkpage.setWatchlistFromPreferences(true);
					break;
			}
			usertalkpage.setFollowRedirect(true);
			usertalkpage.append();
		}
	},
	taggingArticle: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var tag = '{{議刪|' + Morebits.string.formatReasonText(params.reason);

		tag += '}}';
		if ( params.noinclude ) {
			tag = '<noinclude>' + tag + '</noinclude>';
		} else {
			tag += '\n';
		}

		// Then, test if there are speedy deletion-related templates on the article.
		var textNoSd = text.replace(/\{\{\s*(d|delete|刪)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");
		if (text !== textNoSd && confirm("在頁面上找到快速刪除模板，要移除嗎？")) {
			text = textNoSd;
		}

		// Mark the page as patrolled, if wanted
		if (Twinkle.getPref('markXfdPagesAsPatrolled')) {
			pageobj.patrol();
		}

		pageobj.setPageText(tag + text);
		pageobj.setEditSummary("議刪：[[" + params.logpage + "#" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
		switch (Twinkle.getPref('xfdWatchPage')) {
			case 'yes':
				pageobj.setWatchlist(true);
				break;
			case 'no':
				pageobj.setWatchlistFromPreferences(false);
				break;
			default:
				pageobj.setWatchlistFromPreferences(true);
				break;
		}
		// pageobj.setCreateOption('recreate');
		pageobj.save();

		if( Twinkle.getPref('markXfdPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	},
	todaysList: function(pageobj) {
		var params = pageobj.getCallbackParameters();

		pageobj.setAppendText("\n== [[:" + Morebits.pageNameNorm + ']]' + " ==\n{{去}}，由：" + Morebits.string.formatReasonText(params.reason) + " --~~~~");
		pageobj.setEditSummary("增[[" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
		switch (Twinkle.getPref('xfdWatchDiscussion')) {
			case 'yes':
				pageobj.setWatchlist(true);
				break;
			case 'no':
				pageobj.setWatchlistFromPreferences(false);
				break;
			default:
				pageobj.setWatchlistFromPreferences(true);
				break;
		}
		pageobj.setCreateOption('recreate');
		pageobj.append();
		Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
	},
	tryTagging: function (pageobj) {
		var statelem = pageobj.getStatusElement();
		if (!pageobj.exists()) {
			statelem.error("頁面不存在，可能已被刪除");
			return;
		}

		var text = pageobj.getPageText();

		var xfd = /(?:\{\{(afd|議刪)[^{}]*?\}\})/i.exec( text );
		if ( xfd && !confirm( "刪除相关模板{{" + xfd[1] + "}}已置於頁面中，您是否仍想繼續提報？" ) ) {
			statelem.error( '頁面已被提交至存廢討論。' );
			return;
		}

		Twinkle.xfd.callbacks.taggingArticle(pageobj);

		// Notification to first contributor
		var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
		wikipedia_page.setCallbackParameters(pageobj.getCallbackParameters());
		wikipedia_page.lookupCreator(Twinkle.xfd.callbacks.main);
	}
};

Twinkle.xfd.callback.evaluate = function(e) {
	var usertalk = e.target.notify.checked;
	var reason = e.target.xfdreason.value;
	var noinclude = e.target.noinclude.checked;

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Twinkle.xfd.currentRationale = reason;
	Morebits.status.onError(Twinkle.xfd.printRationale);

	if (!reason) {
		alert('錯誤：請輸入理由！');
		Morebits.status.error( '錯誤', '未輸入理由' );
		return;
	}

	var wikipedia_page, logpage, params;

	logpage = '維基大典:議刪';
	params = { usertalk: usertalk, noinclude: noinclude, reason: reason, logpage: logpage };

	Morebits.wiki.addCheckpoint();
	// Updating data for the action completed event
	Morebits.wiki.actionCompleted.redirect = logpage;
	Morebits.wiki.actionCompleted.notice = "提名完成，重定向到討論頁";

	// Tagging file
	wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "添加存廢討論模板到頁面");
	wikipedia_page.setFollowRedirect(false);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.xfd.callbacks.tryTagging);

	Morebits.wiki.removeCheckpoint();
};
})(jQuery);


//</nowiki>
