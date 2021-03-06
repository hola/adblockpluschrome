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

/** @module stats */

let {Prefs} = require("prefs");
let {BlockingFilter} = require("filterClasses");
let {FilterNotifier} = require("filterNotifier");

let badgeColor = "#646464";
let blockedPerPage = new ext.PageMap();

/**
 * Gets the number of requests blocked on the given page.
 *
 * @param  {Page} page
 * @return {Number}
 */
exports.getBlockedPerPage = function(page)
{
  return blockedPerPage.get(page) || 0;
};

FilterNotifier.on("filter.hitCount", (filter, newValue, oldValue, page) =>
{
  if (!(filter instanceof BlockingFilter) || !page)
    return;

  Prefs.blocked_total++;

  let blocked = blockedPerPage.get(page) || 0;
  blockedPerPage.set(page, ++blocked);

  // Update number in icon
  if (Prefs.show_statsinicon)
  {
    page.browserAction.setBadge({
      color: badgeColor,
      number: blocked
    });
  }
});

Prefs.on("show_statsinicon", () =>
{
  ext.pages.query({}, function(pages)
  {
    for (var i = 0; i < pages.length; i++)
    {
      let page = pages[i];
      let badge = null;

      if (Prefs.show_statsinicon)
      {
        let blocked = blockedPerPage.get(page);
        if (blocked)
        {
          badge = {
            color: badgeColor,
            number: blocked
          };
        }
      }

      page.browserAction.setBadge(badge);
    }
  });
});
