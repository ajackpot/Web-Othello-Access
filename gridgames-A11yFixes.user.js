	// ==UserScript==
// @name gridgames.app/reversi Accessibility Fixes
// @description    Improves the accessibility of ridgames.app/reversi
// @author         ajackpot
// @copyright 2019-2022 Mozilla Corporation, Derek Riemer
// @license Mozilla Public License version 2.0
// @version        2019.1
// @include https://gridgames.app/reversi/*
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
	setInterval(() => {
	applyTweaks(document, LOAD_TWEAKS, false);
	applyTweaks(document, DYNAMIC_TWEAKS, false);
	}, 134);
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
const DYNAMIC_TWEAK_ATTRIBS = ['class'];

// Tweaks that must be applied whenever an element is added/changed.
const DYNAMIC_TWEAKS = [
	{selector: 'div._message_4w5pu_13',
		tweak: e => {
			e.setAttribute('role', 'heading');
			e.setAttribute('aria-level', '3');
			if (!e.hasAttribute('data-axS-heading-focused')) forceFocus(e);
			e.setAttribute('data-axS-heading-focused', 'true');
		},
	},
	{selector: 'div._popupTitle_1hbp5_35',
		tweak: e => {
			e.setAttribute('role', 'heading');
			e.setAttribute('aria-level', '3');
			if (!e.hasAttribute('data-axS-heading-focused')) forceFocus(e);
			e.setAttribute('data-axS-heading-focused', 'true');
		},
	},
	{selector: 'div._gameNameTitle_1q3s8_505',
		tweak: e => {
			e.setAttribute('role', 'heading');
			e.setAttribute('aria-level', '3');
			if (!e.hasAttribute('data-axS-heading-focused')) forceFocus(e);
			e.setAttribute('data-axS-heading-focused', 'true');
		},
	},
	{selector: 'button._settingsButton_hxftu_48',
		tweak: e => {
			e.setAttribute('aria-label', 'settings');
		},
	},
	{selector: 'button._infoButton_hxftu_27',
		tweak: e => {
			e.setAttribute('aria-label', 'info');
		},
	},
	{selector: '._board_1q3s8_30',
		tweak: [makeRegion, '오델로 보드']},
	{selector: '._board_1q3s8_30>._cell_1q3s8_64:empty',
		tweak: e => {
			e.setAttribute('role', 'button');
			e.setAttribute('tabindex', '0');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = (siblings.indexOf(e));
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-description', colNumber + rowNumber);
			e.setAttribute('aria-label', '');
			e.removeAttribute('data-axS-placed-cell' );
		},
	},
	{selector: '._board_1q3s8_30>._cell_1q3s8_64>._available_1q3s8_87',
		tweak: inner => {
			let e = inner.parentNode;
			e.setAttribute('role', 'button');
			e.setAttribute('tabindex', '0');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = (siblings.indexOf(e));
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-description', colNumber + rowNumber);
			e.setAttribute('aria-label', '착수 가능');
			e.removeAttribute('data-axS-placed-cell' );
		},
	},
	{selector: '._board_1q3s8_30>._cell_1q3s8_64>._disk_1q3s8_152>._black_1q3s8_97',
		tweak: inner => {
			let e = inner.parentNode.parentNode;
			e.setAttribute('role', 'button');
			e.setAttribute('tabindex', '0');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = (siblings.indexOf(e));
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-description', colNumber + rowNumber);
			if (e.getAttribute('class') == '_cell_1q3s8_64 _lastMove_1q3s8_75') 			e.setAttribute('aria-label', '흑 착수됨');
			else e.setAttribute('aria-label', '흑');
			if (!e.hasAttribute('data-axS-placed-cell')) announce('흑 ' + e.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
			e.setAttribute('data-axS-placed-cell', 'true');
		},
	},
	{selector: '._board_1q3s8_30>._cell_1q3s8_64>._disk_1q3s8_152>._white_1q3s8_94',
		tweak: inner => {
			let e = inner.parentNode.parentNode;
			e.setAttribute('role', 'button');
			e.setAttribute('tabindex', '0');
			let siblings = [].slice.call(e.parentNode.children);
			let stoneNumber = (siblings.indexOf(e));
			let rowNumber = Math.floor(stoneNumber / 8) + 1;
			let colNumber = String.fromCharCode((stoneNumber % 8) + 97);
			e.setAttribute('aria-description', colNumber + rowNumber);
			if (e.getAttribute('class') == '_cell_1q3s8_64 _lastMove_1q3s8_75') 			e.setAttribute('aria-label', '백 착수됨');
			else e.setAttribute('aria-label', '백');
			if (!e.hasAttribute('data-axS-placed-cell')) announce('백 ' + e.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
			e.setAttribute('data-axS-placed-cell', 'true');
		},
	},
];

/** add your specific initialization here, so that if you ever update the framework from new skeleton your inits are not overridden. */
function userInit(){}

/*** Lights, camera, action! ***/
init();
userInit();
