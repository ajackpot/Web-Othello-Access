// ==UserScript==
// @name www.onlinespiele-sammlung.de/othello Accessibility Fixes
// @description    Improves the accessibility of www.onlinespiele-sammlung.de/othello
// @author         ajackpot
// @copyright 2019-2022 Mozilla Corporation, Derek Riemer
// @license Mozilla Public License version 2.0
// @version        2019.1
// @include https://www.onlinespiele-sammlung.de/othello/othello-reversi-games/jean-christophe/*
// @include https://www.onlinespiele-sammlung.de/othello/othello-reversi-games/orfeon/js.html
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
const DYNAMIC_TWEAK_ATTRIBS = ['style', 'src', 'class'];

// Tweaks that must be applied whenever an element is added/changed.
const DYNAMIC_TWEAKS = [
	{selector: 'span[onmousedown^="OthelloMiniLevel_MouseDown"]',
		tweak: e => {
			let stoneNumber = Number(e.getAttribute('onmousedown').substr(27, 2));
			let rowNumber = Math.floor(stoneNumber / 9);
			let colNumber = String.fromCharCode((stoneNumber % 9) + 96);
			e.setAttribute('aria-description', colNumber + rowNumber);
		},
	},
	{selector: 'div[id^="OCase"]',
		tweak: e => {
			let stoneNumber = Number(e.id.substr(5, 2));
			let rowNumber = Math.floor(stoneNumber / 10);
			let colNumber = String.fromCharCode((stoneNumber % 10) + 96);
			e.setAttribute('aria-description', colNumber + rowNumber);
		},
	},
	{selector: 'a[href^="javascript:JoueCase"]',
		tweak: e => {
			e.setAttribute('aria-label', '');
		},
	},
	{selector: 'img[src*="blank.jpg"]',
		tweak: e => {
			e.setAttribute('aria-label', '빈칸');
			e.parentNode.setAttribute('data-axS-empty-cell', 'true');
		},
	},
	{selector: 'img[src*="black.jpg"]',
		tweak: e => {
			e.setAttribute('aria-label', '흑');
			if (e.parentNode.hasAttribute('data-axS-empty-cell')) {
				e.parentNode.removeAttribute('data-axS-empty-cell');
				announce('흑 ' + e.parentNode.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
				e.focus();
			}
		},
	},
	{selector: 'img[src*="white.jpg"]',
		tweak: e => {
			e.setAttribute('aria-label', '백');
			if (e.parentNode.hasAttribute('data-axS-empty-cell')) {
				e.parentNode.removeAttribute('data-axS-empty-cell');
				announce('백 ' + e.parentNode.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
				e.focus();
			}
		},
	},
	{selector: 'img[src*="vide.jpg"]',
		tweak: e => {
			e.setAttribute('aria-label', '빈칸');
			if (e.parentNode.parentNode.parentNode.getAttribute('data-axS-empty-cell') === 'false') announce(e.parentNode.parentNode.parentNode.getAttribute('aria-description') + ' 착수 취소됨', 'axS-announce-new-stone');
			e.parentNode.parentNode.parentNode.setAttribute('data-axS-empty-cell', 'true');
		},
	},
	{selector: 'img[src*="pionB.jpg"]',
		tweak: e => {
			e.setAttribute('aria-label', '흑');
			if (e.parentNode.parentNode.getAttribute('data-axS-empty-cell') == 'true') {
				e.parentNode.parentNode.setAttribute('data-axS-empty-cell', 'false');
				announce('흑 ' + e.parentNode.parentNode.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
				forceFocus(e);
			}
		},
	},
	{selector: 'img[src*="pionN.jpg"]',
		tweak: e => {
			e.setAttribute('aria-label', '백');
			if (e.parentNode.parentNode.getAttribute('data-axS-empty-cell') == 'true') {
				e.parentNode.parentNode.setAttribute('data-axS-empty-cell', 'false');
				announce('백 ' + e.parentNode.parentNode.getAttribute('aria-description') + '에 착수함', 'axS-announce-new-stone');
				forceFocus(e);
			}
		},
	},
	{selector: '#ODam',
		tweak: e => {
			e.setAttribute('aria-label', '오델로 보드');
			e.setAttribute('role', 'region');
		},
	},
	{selector: '.casbord',
		tweak: e => {
			e.parentNode.setAttribute('aria-hidden', 'true');
		},
	},
];

/** add your specific initialization here, so that if you ever update the framework from new skeleton your inits are not overridden. */
function userInit(){}

/*** Lights, camera, action! ***/
init();
userInit();
