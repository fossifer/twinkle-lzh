//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 * Config directives in:   TwinkleConfig
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, add it to the appropriate places at the top of
 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
 *   in twinkle.js, and add your new criterion to those if you think it would be
 *   good.
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * Flow pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink( Twinkle.speedy.callback, "速刪", "tw-csd", Morebits.userIsInGroup('sysop') ? "快速刪除" : "請求快速刪除" );
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(Morebits.userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

// Used by unlink feature
Twinkle.speedy.dialog = null;

// The speedy criteria list can be in one of several modes
Twinkle.speedy.mode = {
	sysopSingleSubmit: 1,  // radio buttons, no subgroups, submit when "Submit" button is clicked
	sysopRadioClick: 2,  // radio buttons, no subgroups, submit when a radio button is clicked
	sysopMultipleSubmit: 3, // check boxes, subgroups, "Submit" button already present
	sysopMultipleRadioClick: 4, // check boxes, subgroups, need to add a "Submit" button
	userMultipleSubmit: 5,  // check boxes, subgroups, "Submit" button already pressent
	userMultipleRadioClick: 6,  // check boxes, subgroups, need to add a "Submit" button
	userSingleSubmit: 7,  // radio buttons, subgroups, submit when "Submit" button is clicked
	userSingleRadioClick: 8,  // radio buttons, subgroups, submit when a radio button is clicked

	// are we in "delete page" mode?
	// (sysops can access both "delete page" [sysop] and "tag page only" [user] modes)
	isSysop: function twinklespeedyModeIsSysop(mode) {
		return mode === Twinkle.speedy.mode.sysopSingleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleSubmit ||
			mode === Twinkle.speedy.mode.sysopRadioClick ||
			mode === Twinkle.speedy.mode.sysopMultipleRadioClick;
	},
	// do we have a "Submit" button once the form is created?
	hasSubmitButton: function twinklespeedyModeHasSubmitButton(mode) {
		return mode === Twinkle.speedy.mode.sysopSingleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userSingleSubmit;
	},
	// is db-multiple the outcome here?
	isMultiple: function twinklespeedyModeIsMultiple(mode) {
		return mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.sysopMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.sysopMultipleRadioClick;
	},
};

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	var dialog;
	Twinkle.speedy.dialog = new Morebits.simpleWindow( Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight') );
	dialog = Twinkle.speedy.dialog;
	dialog.setTitle( "選擇快速刪除理由" );
	dialog.setScriptName( "Twinkle" );

	var form = new Morebits.quickForm( callbackfunc, (Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null) );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '只標記，不刪除',
						value: 'tag_only',
						name: 'tag_only',
						tooltip: '如果您只想標記此頁面而不是刪除',
						checked : Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							var cForm = event.target.form;
							var cChecked = event.target.checked;
							// enable/disable talk page checkbox
							if (cForm.talkpage) {
								cForm.talkpage.disabled = cChecked;
								cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable/disable redirects checkbox
							cForm.redirects.disabled = cChecked;
							cForm.redirects.checked = !cChecked;
							// enable/disable delete multiple
							cForm.delmultiple.disabled = cChecked;
							cForm.delmultiple.checked = false;
							// enable/disable open talk page checkbox
							cForm.openusertalk.disabled = cChecked;
							cForm.openusertalk.checked = false;

							// enable/disable notify checkbox
							cForm.notify.disabled = !cChecked;
							cForm.notify.checked = cChecked;
							// enable/disable multiple
							cForm.multiple.disabled = !cChecked;
							cForm.multiple.checked = false;

							Twinkle.speedy.callback.modeChanged(cForm);

							event.stopPropagation();
						}
					}
				]
			} );

		var deleteOptions = form.append( {
				type: 'div',
				name: 'delete_options'
			} );
		deleteOptions.append( {
				type: 'header',
				label: '刪除相關选項'
			} );
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) {  // hide option for user pages, to avoid accidentally deleting user talk page
			deleteOptions.append( {
				type: 'checkbox',
				list: [
					{
						label: '刪除討論頁',
						value: 'talkpage',
						name: 'talkpage',
						tooltip: "刪除時附带刪除此頁面的討論頁。",
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		}
        deleteOptions.append( {
                type: 'checkbox',
                list: [
                    {
                        label: '不刪除，而是移動到「稿」',
                        value: 'movetodraft',
                        name: 'movetodraft',
                        tooltip: "不刪除頁面，而是將其移動到「稿」名字空間。",
                        checked: false,
                        disabled: (mw.config.get('wgNamespaceNumber') === 106 || mw.config.get('wgNamespaceNumber') === 107),
                        event: function( event ) {
                            event.stopPropagation();
                        }
                    }
                ]
            } );

		deleteOptions.append( {
				type: 'checkbox',
				list: [
					{
						label: '刪除重定向',
						value: 'redirects',
						name: 'redirects',
						tooltip: "刪除到此頁的重定向。",
						checked: Twinkle.getPref('deleteRedirectsOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		deleteOptions.append( {
			type: 'checkbox',
			list: [
				{
					label: '應用多個理由刪除',
					value: 'delmultiple',
					name: 'delmultiple',
					tooltip: "您可選擇應用於該頁的多個理由。",
					event: function( event ) {
						Twinkle.speedy.callback.modeChanged( event.target.form );
						event.stopPropagation();
					}
				}
			]
		} );
		deleteOptions.append( {
				type: 'checkbox',
				list: [
					{
						label: '開啟用戶對話頁',
						value: 'openusertalk',
						name: 'openusertalk',
						tooltip: '此項的預設值為您的開啟對話頁設定。在您選擇應用多條理由刪除時此項將保持不變。',
						checked : false
					}
				]
			} );
	}

	var tagOptions = form.append( {
			type: 'div',
			name: 'tag_options'
		} );

	if( Morebits.userIsInGroup( 'sysop' ) ) {
		tagOptions.append( {
				type: 'header',
				label: '標記相關选項'
			} );
	}

	tagOptions.append( {
			type: 'checkbox',
			list: [
				{
					label: '如可能，通知建立者',
					value: 'notify',
					name: 'notify',
					tooltip: "如果您啟用了該理據的通知，一個通知模板將會加入到建立者的對話頁。",
					checked: !Morebits.userIsInGroup( 'sysop' ) || Twinkle.getPref('deleteSysopDefaultToTag'),
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						event.stopPropagation();
					}
				}
			]
		} );
	tagOptions.append( {
			type: 'checkbox',
			list: [
				{
					label: '應用多個理由',
					value: 'multiple',
					name: 'multiple',
					tooltip: "您可選擇應用於該頁的多個理由。",
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						Twinkle.speedy.callback.modeChanged( event.target.form );
						event.stopPropagation();
					}
				}
			]
		} );

	form.append( {
			type: 'div',
			name: 'work_area',
			label: '初始化CSD模組失敗，請重試，或將這報告給Twinkle開發者。'
		} );

	if( Twinkle.getPref( 'speedySelectionStyle' ) !== 'radioClick' ) {
		form.append( { type: 'submit' } );
	}

	var result = form.render();
	dialog.setContent( result );
	dialog.display();

	Twinkle.speedy.callback.modeChanged( result );

	// if sysop, check if CSD is already on the page and fill in custom rationale
	if (Morebits.userIsInGroup('sysop') && $("#delete-reason").length) {
		var customOption = $("input[name=csd][value=reason]")[0];

		if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
			// force listeners to re-init
			customOption.click();
			customOption.parentNode.appendChild(customOption.subgroup);
		}

		customOption.subgroup.querySelector('input').value = decodeURIComponent($("#delete-reason").text()).replace(/\+/g, ' ');
	}
};

Twinkle.speedy.callback.getMode = function twinklespeedyCallbackGetMode(form) {
	var mode = Twinkle.speedy.mode.userSingleSubmit;
	if (form.tag_only && !form.tag_only.checked) {
		if (form.delmultiple.checked) {
			mode = Twinkle.speedy.mode.sysopMultipleSubmit;
		} else {
			mode = Twinkle.speedy.mode.sysopSingleSubmit;
		}
	} else {
		if (form.multiple.checked) {
			mode = Twinkle.speedy.mode.userMultipleSubmit;
		} else {
			mode = Twinkle.speedy.mode.userSingleSubmit;
		}
	}
	if (Twinkle.getPref('speedySelectionStyle') === 'radioClick') {
		mode++;
	}

	return mode;
};

Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
	var namespace = mw.config.get('wgNamespaceNumber');

	// first figure out what mode we're in
	var mode = Twinkle.speedy.callback.getMode(form);

	if (Twinkle.speedy.mode.isSysop(mode)) {
		$("[name=delete_options]").show();
		$("[name=tag_options]").hide();
	} else {
		$("[name=delete_options]").hide();
		$("[name=tag_options]").show();
	}

	var work_area = new Morebits.quickForm.element( {
			type: 'div',
			name: 'work_area'
		} );

	if (mode === Twinkle.speedy.mode.userMultipleRadioClick || mode === Twinkle.speedy.mode.sysopMultipleRadioClick) {
		var evaluateType = Twinkle.speedy.mode.isSysop(mode) ? 'evaluateSysop' : 'evaluateUser';

		work_area.append( {
				type: 'div',
				label: '當選擇完成後，點選：'
			} );
		work_area.append( {
				type: 'button',
				name: 'submit-multiple',
				label: '提交',
				event: function( event ) {
					Twinkle.speedy.callback[evaluateType]( event );
					event.stopPropagation();
				}
			} );
	}

	var radioOrCheckbox = (Twinkle.speedy.mode.isMultiple(mode) ? 'checkbox' : 'radio');

	// if (Twinkle.speedy.mode.isSysop(mode) && !Twinkle.speedy.mode.isMultiple(mode)) {
		work_area.append( { type: 'header', label: '自定義理由' } );
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.customRationale, mode) } );
	// }

	switch (namespace) {
		case 0:  // article
			work_area.append( { type: 'header', label: '條目' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.articleList, mode) } );
			break;

/*
		case 2:  // user
		case 3:  // user talk
			work_area.append( { type: 'header', label: '用戶頁' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.userList, mode) } );
			break;
*/

		case 14:  // category
			work_area.append( { type: 'header', label: '分類' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.categoryList, mode) } );
			break;

		default:
			break;
	}

	// custom rationale lives under general criteria when tagging
	var generalCriteria = Twinkle.speedy.generalList;
	// if (!Twinkle.speedy.mode.isSysop(mode)) {
	//     generalCriteria = Twinkle.speedy.customRationale.concat(generalCriteria);
	// }
	work_area.append( { type: 'header', label: '常規' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(generalCriteria, mode) });

	if (mw.config.get('wgIsRedirect') || Morebits.userIsInGroup('sysop')) {
		work_area.append( { type: 'header', label: '重定向' } );
		if (namespace === 0 || namespace === 118) {
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.redirectArticleList, mode) } );
		}
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.redirectList, mode) } );
	}

	var old_area = Morebits.quickForm.getElements(form, "work_area")[0];
	form.replaceChild(work_area.render(), old_area);
};

Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {
	// mode switches
	var isSysop = Twinkle.speedy.mode.isSysop(mode);
	var multiple = Twinkle.speedy.mode.isMultiple(mode);
	var hasSubmitButton = Twinkle.speedy.mode.hasSubmitButton(mode);

	var openSubgroupHandler = function(e) {
		$(e.target.form).find('input').prop('disabled', true);
		$(e.target.form).children().css('color', 'gray');
		$(e.target).parent().css('color', 'black').find('input').prop('disabled', false);
		$(e.target).parent().find('input:text')[0].focus();
		e.stopPropagation();
	};
	var submitSubgroupHandler = function(e) {
		var evaluateType = Twinkle.speedy.mode.isSysop(mode) ? 'evaluateSysop' : 'evaluateUser';
		Twinkle.speedy.callback[evaluateType](e);
		e.stopPropagation();
	};

	return $.map(list, function(critElement) {
		var criterion = $.extend({}, critElement);

		if (multiple) {
			if (criterion.hideWhenMultiple) {
				return null;
			}
			if (criterion.hideSubgroupWhenMultiple) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenSingle) {
				return null;
			}
			if (criterion.hideSubgroupWhenSingle) {
				criterion.subgroup = null;
			}
		}

		if (isSysop) {
			if (criterion.hideWhenSysop) {
				return null;
			}
			if (criterion.hideSubgroupWhenSysop) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenUser) {
				return null;
			}
			if (criterion.hideSubgroupWhenUser) {
				criterion.subgroup = null;
			}
		}

		if (mw.config.get('wgIsRedirect') && criterion.hideWhenRedirect) {
			return null;
		}

		if (criterion.subgroup && !hasSubmitButton) {
			if ($.isArray(criterion.subgroup)) {
				criterion.subgroup.push({
					type: 'button',
					name: 'submit',
					label: '提交',
					event: submitSubgroupHandler
				});
			} else {
				criterion.subgroup = [
					criterion.subgroup,
					{
						type: 'button',
						name: 'submit',  // ends up being called "csd.submit" so this is OK
						label: '提交',
						event: submitSubgroupHandler
					}
				];
			}
			// FIXME: does this do anything?
			criterion.event = openSubgroupHandler;
		}

		if ( isSysop ) {
			var originalEvent = criterion.event;
			criterion.event = function(e) {
				if (multiple) return originalEvent(e);

				var normalizedCriterion = Twinkle.speedy.normalizeHash[e.target.value];
				$('[name=openusertalk]').prop('checked',
						Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf(normalizedCriterion) !== -1
					);
				if ( originalEvent ) {
					return originalEvent(e);
				}
			};
		}

		return criterion;
	});
};

Twinkle.speedy.customRationale = [
	{
		label: '自定義理由' + (Morebits.userIsInGroup('sysop') ? '（自定義刪除理由）' : ''),
		value: 'reason',
		tooltip: '這不是萬能的刪除理由，只適用於該頁及其歷史版本均明顯不應存在於維基大典的情況。',
		subgroup: {
			name: 'reason_1',
			type: 'input',
			label: '理由：',
			size: 60
		},
	}
];

Twinkle.speedy.articleList = [
	{
		label: '非文言',
		value: 'a1',
		tooltip: '條目根本不是文言文，只有完全重寫才能解決問題。文白相雜請改用{{文白相雜|~~~~~}}。如果作者有改善意願，建議移至草稿。'
	},
	{
		label: '極短且不知所云',
		value: 'a2',
		tooltip: '只用於非常短，而且明顯看不出主題的條目。'
	},
	{
		label: '文白相雜且未斧正',
		value: 'a3',
		tooltip: '條目文白相雜，等了一個月之後內容仍未改善。建議將這種頁面移到草稿而不是刪除。',
		hideWhenUser: true
	},
	{
		label: '生不立傳',
		value: 'a4'
	},
];

Twinkle.speedy.categoryList = [
	{
		label: '空類',
		value: 'c1',
		tooltip: '不適用於維護大典性質的分類。'
	}
];

Twinkle.speedy.generalList = [
	{
		label: '作者請求 / 去己齋',
		value: 'g1',
		tooltip: '注意：應該只用於頁面作者唯一或實質貢獻者唯一的情況，因此用戶討論頁通常不適用刪除。'
	},
	{
		label: '毀我大典',
		value: 'g3',
	},
	{
		label: '廣告宣傳',
		value: 'g4',
		tooltip: '明顯的廣告宣傳，唯有全部重寫才能改善內容，或者無法按大典要求重寫。'
	},
	{
		label: '試筆',
		value: 'g5',
		tooltip: '測試性質的頁面',
	},
	{
		label: '孤頁',
		value: 'g7',
		tooltip: '例如以下几种類型：1. 没有對應檔案的檔案頁面；2. 没有對應母頁面的子頁面，用戶頁子頁面除外；3. 指向不存在頁面的重定向；4. 没有對應内容頁面的討論頁，討論頁存档和用戶討論頁除外；5. 不存在注册用戶的用戶頁及用戶頁子頁面，随用戶更名产生的用戶頁重定向除外。請在刪除時注意有无將内容移至他处的必要。不包括在主頁面挂有{{CSD Placeholder}}模板的討論頁。'
	},
	{
		label: '大典維護',
		value: 'g8',
		tooltip: '例如解封用戶而刪除{{永禁}}、刪除MediaWiki頁面、因移動而刪除等。',
		hideWhenUser: true
	},
];

Twinkle.speedy.redirectArticleList = [
	{
		label: '條目渡至非條目',
		value: 'r3',
		tooltip: '由條目的名字空间重定向至非條目名字空间，或將用戶頁移出條目名字空间時遗留的重定向。'
	},
	{
		label: '簡化字文題',
		value: 'r4',
		tooltip: '條目以簡化字為題。如果不是重定向頁，需先移動到合適的標題然後再提刪。'
	}
];

Twinkle.speedy.redirectList = [
	{
		label: '斷渡或窮渡',
		value: 'r1',
	},
	{
		label: '筆誤',
		value: 'r2',
		tooltip: '非一眼能看出的拼寫錯誤和翻譯或標题用字的爭議應交由議刪處理。',
	},
];

Twinkle.speedy.normalizeHash = {
	'reason': 'db',
	'multiple': 'multiple',
	'multiple-finish': 'multiple-finish',
	'g1': 'g1',
	'g3': 'g3',
	'g4': 'g4',
	'g5': 'g5',
	'g7': 'g7',
	'g8': 'g8',
	'a1': 'a1',
	'a2': 'a2',
	'a3': 'a3',
	'a4': 'a4',
    'r1': 'r1',
    'r2': 'r2',
    'r3': 'r3',
    'r4': 'r4',
	'c1': 'c1',
};

// keep this synched with [[MediaWiki:Deletereason-dropdown]]
Twinkle.speedy.reasonHash = {
	'reason': '',
// General
	'g1': '作者請求',
	'g3': '毀我大典',
	'g4': '廣告宣傳',
	'g5': '試筆',
	'g7': '孤頁',
	'g8': '大典維護',
// Articles
	'a1': '非文言',
	'a2': '極短且不知所云',
	'a3': '文白相雜且未斧正',
	'a4': '生不立傳',
// Redirects
	'r1': '斷渡或窮渡',
	'r2': '筆誤',
	'r3': '條目渡至非條目',
	'r4': '簡化字文題',
// Categories
	'c1': '空類'
// Templates
// Portals
};

Twinkle.speedy.callbacks = {
	getTemplateCodeAndParams: function(params) {
		var code = "{{刪|";
		var reasons = Twinkle.speedy.callbacks.getReasons(params);
		params.utparams = {};
		$.each(params.normalizeds, function(index, norm) {
			$.extend(params.utparams, Twinkle.speedy.getUserTalkParameters(norm, params.templateParams[index] || []));
		});
		code += reasons.join('；') + "}}";

		return [code, params.utparams];
	},

	getReasons: function (params) {
		var reasons = [];
		var parameters;
		$.each(params.normalizeds, function(index, norm) {
			if (Twinkle.speedy.reasonHash[norm]) {
				reasons.push(Twinkle.speedy.reasonHash[norm]);
			} else {
				parameters = params.templateParams[index] || [];
				for (var i=0; i<parameters.length; i++) {
					if (typeof parameters[i] === 'string') {
						reasons.push(parameters[i]);
					}
				}
			}
		});
		return reasons;
	},

	sysop: {
		main: function( params ) {
			var reason;

			if (!params.normalizeds.length && params.normalizeds[0] === 'db') {
				reason = prompt("输入刪除理由：", "");
				Twinkle.speedy.callbacks.sysop.deletePage( reason, params );
			} else {
				Twinkle.speedy.callbacks.sysop.deletePage(Twinkle.speedy.callbacks.getReasons(params).join('；'), params);
			}
		},
		deletePage: function( reason, params ) {
			var thispage = new Morebits.wiki.page( mw.config.get('wgPageName'), "刪除頁面" );

			if (reason === null) {
				return Morebits.status.error("詢問理由", "用戶取消操作。");
			} else if (!reason || !reason.replace(/^\s*/, "").replace(/\s*$/, "")) {
				return Morebits.status.error("詢問理由", "你不給我理由…我就…不管了…");
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );

            if (params.movetodraft) {
                thispage.setMoveTalkPage(true);
                thispage.setMoveSuppressRedirect(true);
                thispage.setMoveDestination('稿:' + mw.config.get('wgPageName'));
                thispage.move(function() {
                    thispage.getStatusElement().info("完成");
                    Twinkle.speedy.callbacks.sysop.deleteRedirects( params );
                });
            } else {
                thispage.deletePage(function() {
                    thispage.getStatusElement().info("完成");
                    Twinkle.speedy.callbacks.sysop.deleteTalk( params );
                });
            }


			// look up initial contributor. If prompting user for deletion reason, just display a link.
			// Otherwise open the talk page directly
			if( params.openUserTalk ) {
				thispage.setCallbackParameters( params );
				thispage.lookupCreator( Twinkle.speedy.callbacks.sysop.openUserTalkPage );
			}
		},
		deleteTalk: function( params ) {
			// delete talk page
			if (params.deleteTalkPage &&
					params.normalized !== 'g1' &&
					document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Morebits.wiki.page( Morebits.wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "刪除討論頁" );
				talkpage.setEditSummary('孤頁：已刪「' + Morebits.pageNameNorm + "」，去其議論頁" + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
				// this is ugly, but because of the architecture of wiki.api, it is needed
				// (otherwise success/failure messages for the previous action would be suppressed)
				window.setTimeout(function() { Twinkle.speedy.callbacks.sysop.deleteRedirects( params ); }, 1800);
			} else {
				Twinkle.speedy.callbacks.sysop.deleteRedirects( params );
			}
		},
		deleteRedirects: function( params ) {
			// delete redirects
			if (params.deleteRedirects) {
				var query = {
					'action': 'query',
					'titles': mw.config.get('wgPageName'),
					'prop': 'redirects',
					'rdlimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				var wikipedia_api = new Morebits.wiki.api( '取得重定向清單…', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.status( '刪除重定向' ) );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}

			// promote Unlink tool
			var $link, $bigtext;

			$link = $('<a/>', {
				'href': '#',
				'text': '點選這里前往反連工具',
				'css': { 'fontWeight': 'bold' },
				'click': function(){
					Morebits.wiki.actionCompleted.redirect = null;
					Twinkle.speedy.dialog.close();
					Twinkle.unlink.callback("取消對已刪除頁面 " + Morebits.pageNameNorm + " 的連結");
				}
			});
			$bigtext = $('<span/>', {
				'text': '取消對已刪除頁面的連結',
				'css': { 'fontWeight': 'bold' }
			});
			Morebits.status.info($bigtext[0], $link[0]);
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var params = pageobj.getCallbackParameters();

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': Morebits.pageNameNorm
			};

			if (params.normalized === 'db' || Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
				// provide a link to the user talk page
				var $link, $bigtext;
				$link = $('<a/>', {
					'href': mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
					'text': '點此打開User talk:' + user,
					'target': '_blank',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				$bigtext = $('<span/>', {
					'text': '通知頁面建立者',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else {
				// open the initial contributor's talk page
				var statusIndicator = new Morebits.status('打開用戶' + user + '對話頁編輯表单', '打開中…');

				switch( Twinkle.getPref('userTalkPageMode') ) {
				case 'tab':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank' );
					break;
				case 'blank':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				case 'window':
					/* falls through */
				default:
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
						( window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow' ),
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				}

				statusIndicator.info( '完成' );
			}
		},
		deleteRedirectsMain: function( apiobj ) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('redirects rd');
			var total = $snapshot.length;
			var statusIndicator = apiobj.statelem;

			if( !total ) {
				statusIndicator.status("未發现重定向");
				return;
			}

			statusIndicator.status("0%");

			var current = 0;
			var onsuccess = function( apiobjInner ) {
				var now = parseInt( 100 * (++current)/total, 10 ) + '%';
				statusIndicator.update( now );
				apiobjInner.statelem.unlink();
				if( current >= total ) {
					statusIndicator.info( now + '（完成）' );
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.page(title, '刪除重定向 "' + title + '"');
				page.setEditSummary('孤頁：渡至已刪頁「' + Morebits.pageNameNorm + "」" + Twinkle.getPref('deletionSummaryAd'));
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			var statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error( "頁面不存在，可能已被刪除" );
				return;
			}

			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			statelem.status( '檢查頁面已有標記…' );

			// check for existing deletion tags
			var tag = /(?:\{\{\s*(d|delete|刪)(?:\s*\||\s*\}\}))/i.exec( text );
			if ( tag ) {
				statelem.error( [ Morebits.htmlNode( 'strong', tag[1] ) , " 已置於頁面中。" ] );
				return;
			}

			var xfd = /(?:\{\{\s*(afd|議刪)[^{}]*?\}\})/i.exec( text );
			if ( xfd && !confirm( "刪除相關模板{{" + xfd[1] + "}}已被置於頁面中，您是否仍想添加一個快速刪除模板？" ) ) {
				statelem.error( '頁面已被提交至存废討論。' );
				return;
			}

			// given the params, builds the template and also adds the user talk page parameters to the params that were passed in
			// returns => [<string> wikitext, <object> utparams]
			var buildData = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params),
				code = buildData[0];
			params.utparams = buildData[1];

			var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if( Twinkle.getPref('markSpeedyPagesAsPatrolled') ) {
				thispage.patrol();
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = "<noinclude>" + code + "</noinclude>";
			}

			// Generate edit summary for edit
			var editsummary = '提速刪：' + Twinkle.speedy.callbacks.getReasons(params);

			pageobj.setPageText(code + "\n" + text);
			pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
			pageobj.setWatchlist(params.watch);
			pageobj.setCreateOption('nocreate');
			pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
		},

		tagComplete: function(pageobj) {
			var params = pageobj.getCallbackParameters();

			// Notification to first contributor
			if (params.usertalk) {
				var callback = function(pageobj) {
					var initialContrib = pageobj.getCreator();

					// disallow warning yourself
					if (initialContrib === mw.config.get('wgUserName')) {
						Morebits.status.warn("您（" + initialContrib + "）建立了該頁，跳過通知");

					// don't notify users when their user talk page is nominated
					} else if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.status.warn("通知頁面建立者：用戶建立了自己的對話頁");

					} else {
						var talkPageName = 'User talk:' + initialContrib;
						var usertalkpage = new Morebits.wiki.page(talkPageName, "通知頁面建立者（" + initialContrib + "）"),
								notifytext, i;

						notifytext = "\n{{subst:db-notice|target=" + Morebits.pageNameNorm;
						notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}}--~~~~";

						var editsummary = "頁[[" + Morebits.pageNameNorm + "]]將刪";

						usertalkpage.setAppendText(notifytext);
						usertalkpage.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
						usertalkpage.setCreateOption('recreate');
						usertalkpage.setFollowRedirect(true);
						usertalkpage.append();
					}

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.page(Morebits.pageNameNorm);
				thispage.lookupCreator(callback);
			}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for CSD: params.values, params.normalizeds  (note: normalizeds is an array)
		//   for DI: params.fromDI = true, params.templatename, params.normalized  (note: normalized is a string)
		addToLog: function(params, initialContrib) {
			var wikipedia_page = new Morebits.wiki.page("User:" + mw.config.get('wgUserName') + "/" + Twinkle.getPref('speedyLogPageName'), "添加項目到用戶日誌");
			params.logInitialContrib = initialContrib;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.speedy.callbacks.user.saveLog);
		},

		saveLog: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			var appendText = "";

			// add blurb if log page doesn't exist
			if (!pageobj.exists()) {
				appendText +=
					"這是該用戶使用[[WP:TW|Twinkle]]的速刪模組做出的速刪提名清單。\n\n" +
					"如果您不再想保留此日誌，請在[[Wikipedia:Twinkle/偏好設定|偏好設定]]中關掉，並" +
					"提交速刪。\n";
				if (Morebits.userIsInGroup("sysop")) {
					appendText += "\n此日誌并不記录用Twinkle直接执行的刪除。\n";
				}
			}

			// create monthly header
			var date = new Date();
			var headerRe = new RegExp("^==+\\s*" + date.getUTCFullYear() + "\\s*年\\s*" + (date.getUTCMonth() + 1) + "\\s*月\\s*==+", "m");
			if (!headerRe.exec(text)) {
				appendText += "\n\n=== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 ===";
			}

			appendText += "\n# [[:" + Morebits.pageNameNorm + "]]: ";
			appendText += Twinkle.speedy.callbacks.getReasons(params);

			if (params.logInitialContrib) {
				appendText += "；通知{{user|" + params.logInitialContrib + "}}";
			}
			appendText += " ~~~~~\n";

			pageobj.setAppendText(appendText);
			pageobj.setEditSummary("錄速刪誌：[[" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			pageobj.setCreateOption("recreate");
			pageobj.append();
		}
	}
};

// validate subgroups in the form passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
	var parameters = [];

	$.each(values, function(index, value) {
		var currentParams = [];
		switch (value) {
			case 'reason':
				if (form["csd.reason_1"]) {
					var dbrationale = form["csd.reason_1"].value;
					if (!dbrationale || !dbrationale.trim()) {
						alert( '自定義理由：請指定理由。' );
						parameters = null;
						return false;
					}
					currentParams["1"] = dbrationale;
				}
				break;

			default:
				break;
		}
		parameters.push(currentParams);
	});
	return parameters;
};

// function for processing talk page notification template parameters
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) {
	var utparams = [];
	switch (normalized) {
		default:
			break;
	}
	return utparams;
};


Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
	var values = (e.target.form ? e.target.form : e.target).getChecked('csd');
	if (values.length === 0) {
		alert( "請選擇一個理據！" );
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox" || e.target.type === "text" ||
			e.target.type === "select") {
		return;
	}

	var tag_only = form.tag_only;
	if( tag_only && tag_only.checked ) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}

	var normalizeds = values.map(function(value) {
		return Twinkle.speedy.normalizeHash[ value ];
	});

	// analyse each criterion to determine whether to watch the page, prompt for summary, or open user talk page
	var watchPage, promptForSummary;
	normalizeds.forEach(function(norm) {
		if (Twinkle.getPref("watchSpeedyPages").indexOf(norm) !== -1) {
			watchPage = true;
		}
		if (Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(norm) !== -1) {
			promptForSummary = true;
		}
	});

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked,
        movetodraft: form.movetodraft.checked,
		openUserTalk: form.openusertalk.checked,
		promptForSummary: promptForSummary,
		templateParams: Twinkle.speedy.getParameters( form, values )
	};
	if(!params.templateParams) {
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Twinkle.speedy.callbacks.sysop.main( params );
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox" || e.target.type === "text" ||
			e.target.type === "select") {
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	//var multiple = form.multiple.checked;
	var normalizeds = [];
	$.each(values, function(index, value) {
		var norm = Twinkle.speedy.normalizeHash[ value ];

		normalizeds.push(norm);
	});

	// analyse each criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	$.each(normalizeds, function(index, norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = true;
			return false;  // break
		}
	});

	var notifyuser = false;
	if (form.notify.checked) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(norm) !== -1) {
				notifyuser = true;
				return false;  // break
			}
		});
	}

	var welcomeuser = false;
	if (notifyuser) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(norm) !== -1) {
				welcomeuser = true;
				return false;  // break
			}
		});
	}

	var csdlog = false;
	if (Twinkle.getPref('logSpeedyNominations')) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('noLogOnSpeedyNomination').indexOf(norm) === -1) {
				csdlog = true;
				return false;  // break
			}
		});
	}

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog,
		templateParams: Twinkle.speedy.getParameters( form, values )
	};
	if (!params.templateParams) {
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "標記完成";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "標記頁面");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};
})(jQuery);


//</nowiki>
