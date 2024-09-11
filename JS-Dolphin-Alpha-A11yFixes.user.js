// ==UserScript==
// @name hp.vector.co.jp Accessibility Fixes
// @description    Improves the accessibility of hp.vector.co.jp
// @author         James Teh, ajackpot
// @copyright 2019-2022 Mozilla Corporation, Derek Riemer
// @license Mozilla Public License version 2.0
// @version        2019.1
// @include https://hp.vector.co.jp/authors/VA015468/platina/*
// ==/UserScript==

/*** Functions for common tweaks. ***/

/**
 * Adds text to the given live region, and clears it a second later so it's no
 * longer perceivable.
 * @param {string} regionid an id of a region.
 */
function announce(text, regionId) {
	getLiveRegion(regionId)
		.then((region) => {
			region.innerText = text;
			setTimeout(() => {
				region.innerText = '';
			}, 1000);
		});
}

/**
 * create or fetch a live region that can be used with announce(). Returns a promise with the region.
 * @param {string} id the name of the new live region. This is an html id.
 * @return {!Promise<HTMLElement>} a div that contains the live region. This can typically be ignored, this exists to aid in chaining creation of non-existant regions.
 */
function getLiveRegion(id) {
	const updatePromise = new Promise((resolve, reject) => {
		if (!id) {
			reject('Need a valid id!');
			return;
		}
		const existingRegion = document.getElementById(id);
		if (existingRegion) {
			resolve(existingRegion);
			return;
		}
		const region = document.createElement('div');
		region.id = id;
		region.setAttribute('aria-live', 'polite');
		region.setAttribute('aria-atomic', 'true');
		region.style.position = 'absolute';
		region.style.width = '50px';
		region.style.height = '50px';
		region.style.opasity = 0;
		document.body.appendChild(region);
		// we need to delay a little to get the new region to actually read contents.
		// A11y APIs probably don't treat the relevant changes as "additions" until
		//an annimation frame has passed. It may, in reality be more like 2-4
		// annimation frames, so delay 134 ms to be safe.
		setTimeout(() => {
			resolve(region);
		}, 134);
	});
	return updatePromise;
}

function makeHeading(el, level) {
	el.setAttribute("role", "heading");
	el.setAttribute("aria-level", level);
}

function makeRegion(el, label) {
	el.setAttribute("role", "region");
	el.setAttribute("aria-label", label);
}

function makeButton(el, label) {
	el.setAttribute("role", "button");
	if (label) {
		el.setAttribute("aria-label", label);
		el.setAttribute("tabindex", "0");
	}
}

function makePresentational(el) {
	el.setAttribute("role", "presentation");
}

function setLabel(el, label) {
	el.setAttribute("aria-label", label);
}

function makeHidden(el) {
	el.setAttribute("aria-hidden", "true");
}

function setExpanded(el, expanded) {
	el.setAttribute("aria-expanded", expanded ? "true" : "false");
}

var idCounter = 0;
// Get a node's id. If it doesn't have one, make and set one first.
function setAriaIdIfNecessary(elem) {
	if (!elem.id) {
		elem.setAttribute("id", "axsg-" + idCounter++);
	}
	return elem.id;
}

function makeElementOwn(parentElement, listOfNodes) {
	ids = [];
	for (let node of listOfNodes) {
		ids.push(setAriaIdIfNecessary(node));
	}
	parentElement.setAttribute("aria-owns", ids.join(" "));
}

// Focus something even if it wasn't made focusable by the author.
function forceFocus(el) {
	let focusable = el.hasAttribute("tabindex");
	if (focusable) {
		el.focus();
		return;
	}
	el.setAttribute("tabindex", "-1");
	el.focus();
}

/*** Code to apply the tweaks when appropriate. ***/

function applyTweak(el, tweak) {
	if (Array.isArray(tweak.tweak)) {
		let [func, ...args] = tweak.tweak;
		func(el, ...args);
	} else {
		tweak.tweak(el);
	}
}

function applyTweaks(root, tweaks, checkRoot, forAttrChange = false) {
	for (let tweak of tweaks) {
		if (!forAttrChange || tweak.whenAttrChangedOnAncestor !== false) {
			for (let el of root.querySelectorAll(tweak.selector)) {
				try {
					applyTweak(el, tweak);
				} catch (e) {
					console.log("Exception while applying tweak for '" + tweak.selector + "': " + e);
				}
			}
		}
		if (checkRoot && root.matches(tweak.selector)) {
			try {
				applyTweak(root, tweak);
			} catch (e) {
				console.log("Exception while applying tweak for '" + tweak.selector + "': " + e);
			}
		}
	}
}

let observer = new MutationObserver(function (mutations) {
	for (let mutation of mutations) {
		try {
			if (mutation.type === "childList") {
				for (let node of mutation.addedNodes) {
					if (node.nodeType != Node.ELEMENT_NODE) {
						continue;
					}
					applyTweaks(node, DYNAMIC_TWEAKS, true);
				}
			} else if (mutation.type === "attributes") {
				applyTweaks(mutation.target, DYNAMIC_TWEAKS, true, true);
			}
		} catch (e) {
			// Catch exceptions for individual mutations so other mutations are still handled.
			console.log("Exception while handling mutation: " + e);
		}
	}
});

function init() {
	applyTweaks(document, LOAD_TWEAKS, false);
	applyTweaks(document, DYNAMIC_TWEAKS, false);
	options = { childList: true, subtree: true };
	if (DYNAMIC_TWEAK_ATTRIBS.length > 0) {
		options.attributes = true;
		options.attributeFilter = DYNAMIC_TWEAK_ATTRIBS;
	}
	observer.observe(document, options);
}

/*** Define the actual tweaks. ***/

// Tweaks that only need to be applied on load.
const LOAD_TWEAKS = [
];

// Attributes that should be watched for changes and cause dynamic tweaks to be
// applied.
const DYNAMIC_TWEAK_ATTRIBS = ['style', 'class'];

// Tweaks that must be applied whenever an element is added/changed.
const DYNAMIC_TWEAKS = [
	{selector: '.reversiSquareLabelTop',
		tweak: makeHidden},
	{selector: '.reversiSquareLabelLeft',
		tweak: makeHidden},
	{selector: '.reversiTitleLabelColor',
		tweak: e => {
			e.setAttribute('role', 'heading');
			e.setAttribute('aria-level', '2');
			e.setAttribute('aria-label', '색상 선택');
		},
	},
	{selector: '.reversiTitleLabelLevel',
		tweak: e => {
			e.setAttribute('role', 'heading');
			e.setAttribute('aria-level', '2');
			e.setAttribute('aria-label', '레벨 선택');
		},
	},
	{selector: 'div[id^="reversiSquare_"]',
		tweak: e => {
			e.setAttribute('role', 'button');
			e.setAttribute('tabindex', '0');
			let colNumber = String.fromCharCode(Number(e.id.substr(14, 1)) + 97);
			let rowNumber = Number(e.id.substr(16, 1)) + 1;
			e.setAttribute('aria-description', colNumber + rowNumber);
		},
	},
	{selector: 'img[style^="width: 0px"]',
		tweak: e => {
			e.setAttribute('aria-hidden', 'true');
				e.parentNode.setAttribute('data-axS-empty-cell', 'true');
		},
	},
	{selector: 'img[style^="width: 100%"]',
		tweak: e => {
			let stoneName = (Number(e.id.substr(16)) === 1 ? '흑' : '백');
			e.setAttribute('aria-hidden', 'false');
			e.setAttribute('aria-label', stoneName);
			if (e.parentNode.hasAttribute('data-axS-empty-cell')) {
				e.parentNode.removeAttribute('data-axS-empty-cell');
				announce(stoneName + ' ' + e.parentNode.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
			}
		},
	},
	{selector: 'img',
		tweak: e => {
			e.setAttribute('alt', '');
		},
	},
	{selector: 'div[class^="reversiTitleLevel"]',
		tweak: e => {
			e.setAttribute('aria-description', '레벨');
			e.setAttribute('tabindex', '0');
		},
	},
	{selector: '#reversiDiskCountWhite',
		tweak: e => {
			e.setAttribute('aria-description', '백 개수');
		},
	},
	{selector: '#reversiDiskCountBlack',
		tweak: e => {
			e.setAttribute('aria-description', '흑 개수');
		},
	},
	{selector: '#reversiTitleBlack',
		tweak: [makeButton, '플레이어 흑 선택하기']},
	{selector: '#reversiTitleWhite',
		tweak: [makeButton, '플레이어 백 선택하기']},
	{selector: '#reversiTitleStartButton',
		tweak: [setLabel, '게임 시작']},
	{selector: '#reversiShowTitle',
		tweak: [setLabel, '메인 화면으로 가기']},
	{selector: '#reversiBoard',
		tweak: [makeRegion, '오델로 보드']},
];

/** add your specific initialization here, so that if you ever update the framework from new skeleton your inits are not overridden. */
function userInit(){}

/*** Lights, camera, action! ***/
init();
userInit();
