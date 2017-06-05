//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklebatchundelete.js: Batch undelete module
 ****************************************
 * Mode of invocation:     Tab ("Und-batch")
 * Active on:              Existing user and project pages
 * Config directives in:   TwinkleConfig
 */


Twinkle.batchundelete = function twinklebatchundelete() {
	if( ( mw.config.get("wgNamespaceNumber") !== mw.config.get("wgNamespaceIds").user &&
		mw.config.get("wgNamespaceNumber") !== mw.config.get("wgNamespaceIds").project ) ||
		!mw.config.get("wgArticleId") ) {
		return;
	}
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		Twinkle.addPortletLink( Twinkle.batchundelete.callback, "批復", "tw-batch-undel", "反刪除頁面" );
	}
};

Twinkle.batchundelete.callback = function twinklebatchundeleteCallback() {
	var Window = new Morebits.simpleWindow( 600, 400 );
	Window.setScriptName("Twinkle");
	Window.setTitle("批量反刪除");

	var form = new Morebits.quickForm( Twinkle.batchundelete.callback.evaluate );
	form.append( {
			type: 'input',
			name: 'reason',
			label: '理由：',
			size: 60
		} );

	var statusdiv = document.createElement( 'div' );
	statusdiv.style.padding = '15px';  // just so it doesn't look broken
	Window.setContent(statusdiv);
	Morebits.status.init(statusdiv);
	Window.display();

	var query = {
		'action': 'query',
		'generator': 'links',
		'titles': mw.config.get("wgPageName"),
		'gpllimit' : Twinkle.getPref('batchMax') // the max for sysops
	};
	var statelem = new Morebits.status("抓取頁面清單");
	var wikipedia_api = new Morebits.wiki.api( "載入中…", query, function( apiobj ) {
			var xml = apiobj.responseXML;
			var $pages = $(xml).find('page[missing]');
			var list = [];
			$pages.each(function(index, page) {
				var $page = $(page);
				var title = $page.attr('title');
				list.push({ label: title, value: title, checked: true });
			});
			apiobj.params.form.append({ type: 'header', label: '待恢復頁面' });
			apiobj.params.form.append({
					type: 'button',
					label: "全選",
					event: function(e) {
						$(Morebits.quickForm.getElements(e.target.form, 'pages')).prop('checked', true);
					}
				});
			apiobj.params.form.append({
					type: 'button',
					label: "全不選",
					event: function(e) {
						$(Morebits.quickForm.getElements(e.target.form, 'pages')).prop('checked', false);
					}
				});
			apiobj.params.form.append( {
					type: 'checkbox',
					name: 'pages',
					list: list
				});
			apiobj.params.form.append( { type:'submit' } );

			var result = apiobj.params.form.render();
			apiobj.params.Window.setContent( result );

			Morebits.checkboxShiftClickSupport(Morebits.quickForm.getElements(result, 'pages'));
		}, statelem );
	wikipedia_api.params = { form:form, Window:Window };
	wikipedia_api.post();
};

Twinkle.batchundelete.callback.evaluate = function( event ) {
	Morebits.wiki.actionCompleted.notice = '狀態';
	Morebits.wiki.actionCompleted.postfix = '反刪除已完成';

	var pages = event.target.getChecked( 'pages' );
	var reason = event.target.reason.value;
	if( ! reason ) {
		alert("您需要指定理由。");
		return;
	}
	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init( event.target );

	if( !pages ) {
		Morebits.status.error( '錯誤', '沒什麼要反刪除的，取消操作' );
		return;
	}

	var batchOperation = new Morebits.batchOperation("反刪除頁面");
	batchOperation.setOption("chunkSize", Twinkle.getPref('batchUndeleteChunks'));
	batchOperation.setOption("preserveIndividualStatusLines", true);
	batchOperation.setPageList(pages);
	batchOperation.run(function(pageName) {
		var query = {
			'token': mw.user.tokens.get().editToken,
			'title': pageName,
			'action': 'undelete',
			'reason': reason + Twinkle.getPref('deletionSummaryAd')
		};
		var wikipedia_api = new Morebits.wiki.api( "反刪除頁面" + pageName, query,
			batchOperation.workerSuccess, null, batchOperation.workerFailure );
		wikipedia_api.statelem.status("反刪除中…");
		wikipedia_api.pageName = pageName;
		wikipedia_api.post();
	});
};

})(jQuery);


//</nowiki>
