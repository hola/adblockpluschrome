/*
 * This file is part of Hola ad blocker <https://adblockplus.org/>,
 * Copyright (C) 2006-2016 Eyeo GmbH
 *
 * Hola ad blocker is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Hola ad blocker is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Hola ad blocker.  If not, see <http://www.gnu.org/licenses/>.
 */

/** @module whitelisting */

"use strict";

let {defaultMatcher} = require("matcher");
let {RegExpFilter} = require("filterClasses");
let {DownloadableSubscription} = require("subscriptionClasses");
let {FilterNotifier} = require("filterNotifier");
let {stringifyURL, getDecodedHostname, extractHostFromFrame, isThirdParty} = require("url");
let {port} = require("messaging");
let devtools = require("devtools");
let {Prefs} = require("prefs");
let sitekeys = new ext.PageMap();

function match(page, url, typeMask, docDomain, sitekey)
{
  let thirdParty = !!docDomain && isThirdParty(url, docDomain);
  let urlString = stringifyURL(url);

  if (!docDomain)
    docDomain = getDecodedHostname(url);
  
  if(Prefs.hola_whitelist.indexOf(docDomain) > -1){
    return {hola: true};
  }

  let filter = defaultMatcher.whitelist.matchesAny(
    urlString, typeMask, docDomain, thirdParty, sitekey
  );

  if (filter && devtools)
    devtools.logWhitelistedDocument(
      page, urlString, typeMask, docDomain, filter
    );

  return filter;
}

let checkWhitelisted =
/**
 * Gets the active whitelisting filter for the document associated
 * with the given page/frame, or null if it's not whitelisted.
 *
 * @param {Page}   page
 * @param {Frame}  [frame]
 * @param {number} [typeMask=RegExpFilter.typeMap.DOCUMENT]
 * @return {?WhitelistFilter}
 */
exports.checkWhitelisted = function(page, frame, typeMask)
{
  if (typeof typeMask == "undefined")
    typeMask = RegExpFilter.typeMap.DOCUMENT;

  if (frame)
  {
    let filter = null;

    while (frame && !filter)
    {
      let parent = frame.parent;
      let docDomain = extractHostFromFrame(parent);
      let sitekey = getKey(page, frame);
      filter = match(page, frame.url, typeMask, docDomain, sitekey);
      frame = parent;
    }

    return filter;
  }

  return match(page, page.url, typeMask);
};

port.on("filters.isPageWhitelisted", (message, sender) =>
{
  return !!checkWhitelisted(sender.page);
});

function revalidateWhitelistingState(page)
{
  FilterNotifier.emit(
    "page.WhitelistingStateRevalidate",
    page, checkWhitelisted(page)
  );
}

FilterNotifier.on("filter.behaviorChanged", () =>
{
  ext.pages.query({}, pages =>
  {
    for (let page of pages)
      revalidateWhitelistingState(page);
  });
});

ext.pages.onLoading.addListener(revalidateWhitelistingState);

let getKey =
/**
 * Gets the public key, previously recorded for the given page
 * and frame, to be considered for the $sitekey filter option.
 *
 * @param {Page}  page
 * @param {Frame} frame
 * @return {string}
 */
exports.getKey = function(page, frame)
{
  let keys = sitekeys.get(page);
  if (!keys)
    return null;

  for (; frame != null; frame = frame.parent)
  {
    let key = keys[stringifyURL(frame.url)];
    if (key)
      return key;
  }

  return null;
};

function recordKey(token, page, url)
{
  let parts = token.split("_");
  if (parts.length < 2)
    return;

  let key = parts[0].replace(/=/g, "");
  let signature = parts[1];
  let data = url.pathname + url.search + "\0" +
             url.host + "\0" +
             window.navigator.userAgent;
  if (!verifySignature(key, signature, data))
    return;

  let keys = sitekeys.get(page);
  if (!keys)
  {
    keys = Object.create(null);
    sitekeys.set(page, keys);
  }
  keys[stringifyURL(url)] = key;
}

port.on("filters.addKey", (message, sender) =>
{
  recordKey(message.token, sender.page, sender.frame.url);
});

function onHeadersReceived(details)
{
  let page = new ext.Page({id: details.tabId});

  for (let header of details.responseHeaders)
    if (header.name.toLowerCase() == "x-adblock-key" && header.value)
      recordKey(header.value, page, new URL(details.url));
}

if (typeof chrome == "object")
  chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceived,
    {
      urls: ["http://*/*", "https://*/*"],
      types: ["main_frame", "sub_frame"]
    },
    ["responseHeaders"]
  );
