/*
 * This file is part of Hola adblock <https://adblockplus.org/>,
 * Copyright (C) 2006-2016 Eyeo GmbH
 *
 * Hola adblock is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Hola adblock is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Hola adblock.  If not, see <http://www.gnu.org/licenses/>.
 */

with(require("filterClasses"))
{
  this.RegExpFilter = RegExpFilter;
  this.WhitelistFilter = WhitelistFilter;
}
var FilterStorage = require("filterStorage").FilterStorage;
var SpecialSubscription = require("subscriptionClasses").SpecialSubscription;
var ElemHide = require("elemHide").ElemHide;
var checkWhitelisted = require("whitelisting").checkWhitelisted;
var extractHostFromFrame = require("url").extractHostFromFrame;
var port = require("messaging").port;
var devtools = require("devtools");

// This is a hack to speedup loading of the options page on Safari.
// Once we replaced the background page proxy with message passing
// this global function should removed.
function getUserFilters()
{
  var filters = [];
  var exceptions = [];

  for (var i = 0; i < FilterStorage.subscriptions.length; i++)
  {
    var subscription = FilterStorage.subscriptions[i];
    if (!(subscription instanceof SpecialSubscription))
      continue;

    for (var j = 0; j < subscription.filters.length; j++)
    {
      var filter = subscription.filters[j];
      if (filter instanceof WhitelistFilter &&  /^@@\|\|([^\/:]+)\^\$document$/.test(filter.text))
        exceptions.push(RegExp.$1);
      else
        filters.push(filter.text);
    }
  }

  return {filters: filters, exceptions: exceptions};
}

port.on("get-selectors", function(msg, sender)
{
  var selectors;
  var trace = devtools && devtools.hasPanel(sender.page);

  if (!checkWhitelisted(sender.page, sender.frame,
                        RegExpFilter.typeMap.DOCUMENT |
                        RegExpFilter.typeMap.ELEMHIDE))
    selectors = ElemHide.getSelectorsForDomain(
      extractHostFromFrame(sender.frame),
      checkWhitelisted(sender.page, sender.frame,
                       RegExpFilter.typeMap.GENERICHIDE)
    );
  else
    selectors = [];

  return {selectors: selectors, trace: trace};
});

port.on("forward", function(msg, sender)
{
  var targetPage;
  if (msg.targetPageId)
    targetPage = ext.getPage(msg.targetPageId);
  else
    targetPage = sender.page;

  if (targetPage)
  {
    msg.payload.sender = sender.page.id;
    if (msg.expectsResponse)
      return new Promise(targetPage.sendMessage.bind(targetPage, msg.payload));
    targetPage.sendMessage(msg.payload);
  }
});
