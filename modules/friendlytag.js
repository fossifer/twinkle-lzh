//<nowiki>
// vim: set noet sts=0 sw=8:


(function($) {


/*
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles;
 *                         all redirects
 * Config directives in:   FriendlyConfig
 */

Twinkle.tag = function friendlytag() {
	// article/draft tagging
	if( !Morebits.wiki.isPageRedirect() && ( ( mw.config.get('wgNamespaceNumber') === 0 || mw.config.get('wgNamespaceNumber') === 118 ) && mw.config.get('wgCurRevisionId') ) || ( Morebits.pageNameNorm === '維基大典:沙盒' ) ) {
		Twinkle.addPortletLink( Twinkle.tag.callback, "標", "friendly-tag", "標記條目" );
	}
};

Twinkle.tag.callback = function friendlytagCallback() {
	var Window = new Morebits.simpleWindow( 630, 500 );
	Window.setScriptName( "Twinkle" );

	var form = new Morebits.quickForm( Twinkle.tag.callback.evaluate );

	if (document.getElementsByClassName("patrollink").length) {
		form.append( {
			type: 'checkbox',
			list: [
				{
					label: '標記頁面為已巡查',
					value: 'patrolPage',
					name: 'patrolPage',
					checked: Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled')
				}
			]
		} );
	}

	Window.setTitle( "條目維護標記" );

	form.append({ type: 'header', label: '常因' });

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: "{{" + tag + "}}: " + description };
		if (Twinkle.tag.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}
		switch (tag) {
			case "併":
				checkbox.subgroup = [
					{
						name: 'mergeTarget',
						type: 'input',
						label: '目標：',
					}
				];
				if (mw.config.get('wgNamespaceNumber') === 0) {
					checkbox.subgroup.push({
						name: 'mergeReason',
						type: 'textarea',
						label: '合併理由（會附在條目的討論頁）：',
						tooltip: '請填寫理由。'
					});
				}
				break;
			case "遷":
				checkbox.subgroup = [
					{
						name: 'moveTarget',
						type: 'input',
						label: '目標：',
					}
				];
				if (mw.config.get('wgNamespaceNumber') === 0) {
					checkbox.subgroup.push({
						name: 'moveReason',
						type: 'textarea',
						label: '移動理由（會附在條目的討論頁）：',
						tooltip: '請填寫理由。'
					});
				}
				break;
			case "文未準":
				var disputes = [];
				for (var reason in Twinkle.tag.article.dispute) {
					disputes.push({
						value: reason,
						label: reason + '：' + Twinkle.tag.article.dispute[reason]
					});
				}
				checkbox.subgroup = [
					{
						name: 'disputeReason',
						type: 'checkbox',
						list: disputes
					},
					{
						name: 'disputeCustomReason',
						type: 'input',
						label: '其他原因：'
					}
				];

				break;
			default:
				break;
		}
		return checkbox;
	};

	var checkboxes = [];
	$.each(Twinkle.tag.article.tags, function(tag, description) {
		checkboxes.push(makeCheckbox(tag, description));
	});
	form.append({
		type: "checkbox",
		name: "articleTags",
		list: checkboxes
	});

	// append any custom tags
	if (Twinkle.getFriendlyPref('customTagList').length) {
		form.append({ type: 'header', label: '自定義模板' });
		form.append({ type: 'checkbox', name: 'articleTags', list: Twinkle.getFriendlyPref('customTagList') });
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// fake a change event on the sort dropdown, to initialize the tag list
	var evt = document.createEvent("Event");
	evt.initEvent("change", true, true);
};

Twinkle.tag.checkedTags = [];

// Tags for ARTICLES start here

Twinkle.tag.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.tag.article.tags = {
	'文白相雜': '文白相雜',
	'繁簡相雜': '繁簡相雜',
	'無據': '文章沒有任何參考來源',
	'文過短': '文章非常短，主題和內容極不完整',
	'殘章': '文章對主題有了基本介紹，但是仍然沒寫完',
	'文未準': '文章存在一些問題，需要修正。必須指出具體原因。選中此條後會顯示一些常用原因，另外也可以填寫自己的理由。',
	'遷': '請求移動條目。請記得給出目標名稱和移動原因。',
	'併': '請求與其他條目合併。請記得給出合併目標和原因。'
};

Twinkle.tag.article.tagaliases = {
	'殘章': ['stub', '芻文'],
	'文白相雜': ['NotClassicalChinese'],
	'繁簡相雜': ['簡體'],
	'無據': ['Unreferenced'],
	'文未準': ['Disputed'],
	'遷': ['Move'],
	'併': ['Mergeto'],
	'文過短': ['substub']
};

Twinkle.tag.article.dispute = {
	'引據不全': '引據不能覆蓋全文',
	'引據未準，須細審讀': '引用的準確性無法核實',
	'需纂以維基碼': '需要維基化',
	'是文存疑，須辨真偽': '真實性存疑',
	'文中存纂者己見': '包含編者個人想法、原創研究等',
	'非大典文辭': '非百科全書語氣',
	'非中立': '中立性有問題。注意：請仔細解釋原因否則標記可能無效。',
	'分段、分節過於零碎': '[[:zh:Wikipedia:Jessechi]]愛做的事情。'
};

Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = '增',
		    tags = [], i, totalTags;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");

		var addTag = function friendlytagAddTag( tagIndex, tagName ) {
			var currentTag = "";

			switch (tagName) {
				case '文白相雜':
				case '文過短':
					currentTag += '{{' + tagName + '|~~~~~}}\n';
					break;

				case '文未準':
					currentTag += '{{文未準|';
					currentTag += params.tagParameters.disputeReason.join('；');

					if (params.tagParameters.disputeCustomReason) {
						if (params.tagParameters.disputeReason.length > 0) {
							currentTag += '；';
						}
						currentTag += params.tagParameters.disputeCustomReason;
					}
					currentTag += '}}\n';
					break;

				case '遷':
					if (params.tagParameters.moveTarget) {
						currentTag += '{{遷|';
						// normalize the merge target for now and later
						params.tagParameters.moveTarget = Morebits.string.toUpperCaseFirstChar(params.tagParameters.moveTarget.replace(/_/g, ' '));
						currentTag += params.tagParameters.moveTarget + '}}\n';
					}
					break;

				case '併':
					if (params.tagParameters.mergeTarget) {
						currentTag += '{{併|';
						// normalize the merge target for now and later
						params.tagParameters.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.tagParameters.mergeTarget.replace(/_/g, ' '));
						currentTag += params.tagParameters.mergeTarget + '}}\n';
					}
					break;

				case '殘章':
					pageText = pageText + '\n{{殘章}}';
					break;

				default:
					currentTag += '{{' + tagName + '}}\n';
					break;
			}
			tagText += currentTag;

			if ( tagIndex > 0 ) {
				if( tagIndex === (totalTags - 1) ) {
					summaryText += '與';
				} else if ( tagIndex < (totalTags - 1) ) {
					summaryText += '、';
				}
			}

			summaryText += '{{[[';
			summaryText += (tagName.indexOf(":") !== -1 ? tagName : ("T:" + tagName + "|" + tagName));
			summaryText += ']]}}';
		};

		// Check for preexisting tags and separate tags into groupable and non-groupable arrays
		for (i = 0; i < params.tags.length; i++) {
			var found = false;

			tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\})|\\|\\s*' + params.tags[i] + '\\s*=[a-z ]+\\d+)', 'im' );
			if (tagRe.exec(pageText)) {
				found = true;
			}

			if (Twinkle.tag.article.tagaliases) {
				var aliases = Twinkle.tag.article.tagaliases[params.tags[i]];
				for (var j=0; j<aliases.length; j++) {
					tagRe = new RegExp( '(\\{\\{' + aliases[j] + '(\\||\\}\\})|\\|\\s*' + aliases[j] + '\\s*=[a-z ]+\\d+)', 'im' );
					if (tagRe.exec(pageText)) {
						found = true;
						break;
					}
				}
			}

			if (!found) {
				tags = tags.concat( params.tags[i] );
			} else {
				Morebits.status.warn( '信息', '在頁面上找到{{' + params.tags[i] +
					'}}…跳过' );
				// don't do anything else with merge tags
				if (params.tags[i] === "併") {
					params.tagParameters.mergeTarget = params.tagParameters.mergeReason = false;
				}
				if (params.tags[i] === "遷") {
					params.tagParameters.moveTarget = params.tagParameters.moveReason = false;
				}
			}
		}

		tags.sort();
		totalTags = tags.length;
		$.each(tags, addTag);

		// smartly insert the new tags after any hatnotes. Regex is a bit more
		// complicated than it'd need to be, to allow templates as parameters,
		// and to handle whitespace properly.
		pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:外語不入題|非漢字不入題|釋義|釋義二|disambig|消歧義|otheruses)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				"$1" + tagText);

		summaryText += ( tags.length > 0 ? '模' : '' ) +
			'至文內';

		// avoid truncated summaries
		if (summaryText.length > (254 - Twinkle.getPref('summaryAd').length)) {
			summaryText = summaryText.replace(/\[\[[^\|]+\|([^\]]+)\]\]/g, "$1");
		}

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(function() {
			var talkpageText;
			var talkpage;
			// special functions for merge tags
			if (params.tagParameters.mergeReason) {
				// post the rationale on the talk page (only operates in main namespace)
				talkpageText = "\n== 議併至[[" + params.tagParameters.mergeTarget + "]] ==\n";
				talkpageText += params.tagParameters.mergeReason.trim() + "--~~~~";

				talkpage = new Morebits.wiki.page("Talk:" + mw.config.get('wgTitle'), "將理由貼进討論頁");
				talkpage.setAppendText(talkpageText);
				talkpage.setEditSummary('議將[[' + mw.config.get('wgTitle') + ']]' +
					'併至' + '[[' + params.tagParameters.mergeTarget + ']]' +
					Twinkle.getPref('summaryAd'));
				talkpage.setWatchlist(Twinkle.getFriendlyPref('watchMergeDiscussions'));
				talkpage.setCreateOption('recreate');
				talkpage.append();
			}
			if (params.tagParameters.moveReason) {
				// post the rationale on the talk page (only operates in main namespace)
				talkpageText = "\n== 議遷至[[" + params.tagParameters.moveTarget + "]] ==\n";
				talkpageText += params.tagParameters.moveReason.trim() + "--~~~~";

				talkpage = new Morebits.wiki.page("Talk:" + mw.config.get('wgTitle'), "將理由貼进討論頁");
				talkpage.setAppendText(talkpageText);
				talkpage.setEditSummary('議將[[' + mw.config.get('wgTitle') + ']]' +
					'遷至' + '[[' + params.tagParameters.moveTarget + ']]' +
					Twinkle.getPref('summaryAd'));
				talkpage.setWatchlist(Twinkle.getFriendlyPref('watchMergeDiscussions'));
				talkpage.setCreateOption('recreate');
				talkpage.append();
			}
		});

		if( params.patrol ) {
			pageobj.patrol();
		}
	}
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;

	var params = {};
	if (form.patrolPage) {
		params.patrol = form.patrolPage.checked;
	}

	params.tags = form.getChecked( 'articleTags' );
	params.tagParameters = {
		moveTarget: form['articleTags.moveTarget'] ? form['articleTags.moveTarget'].value : null,
		moveReason: form['articleTags.moveReason'] ? form['articleTags.moveReason'].value : null,
		mergeTarget: form['articleTags.mergeTarget'] ? form['articleTags.mergeTarget'].value : null,
		mergeReason: form['articleTags.mergeReason'] ? form['articleTags.mergeReason'].value : null,
		disputeReason: form.getChecked('articleTags.disputeReason'),
		disputeCustomReason: form['articleTags.disputeCustomReason'] ? form['articleTags.disputeCustomReason'].value : null,
	};

	// form validation
	if( !params.tags.length ) {
		alert( '必須選擇至少一個標記！' );
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = "標記完成，在几秒內重新載入頁面";

	var wikipedia_page = new Morebits.wiki.page(Morebits.pageNameNorm, "正在標記條目");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.tag.callbacks.main);
};
})(jQuery);


//</nowiki>
