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

/** @module uninstall */

let info = require("info");
let {Prefs} = require("prefs");
let {Utils} = require("utils");

function setUninstallURL()
{
  let search = [];
  let keys = ["addonName", "addonVersion", "application", "applicationVersion",
              "platform", "platformVersion"];
  for (let key of keys)
    search.push(key + "=" + encodeURIComponent(info[key]));

  let downlCount = Prefs.notificationdata.downloadCount || 0;

  if (downlCount > 4)
  {
    if (downlCount < 8)
      downlCount = "5-7";
    else if (downlCount < 30)
      downlCount = "8-29";
    else if (downlCount < 90)
      downlCount = "30-89";
    else if (downlCount < 180)
      downlCount = "90-179";
    else
      downlCount = "180+";
  }

  search.push("notificationDownloadCount=" + encodeURIComponent(downlCount));
  var uninstall_url = Prefs.hola_uninstall;

  if (!uninstall_url)
      uninstall_url = Utils.getDocLink("uninstalled")+"&"+search.join("&");

  chrome.runtime.setUninstallURL(uninstall_url);
}

// The uninstall URL contains the notification download count as a parameter,
// therefore we must wait for preferences to be loaded before generating the
// URL and we need to re-generate it each time the notification data changes.
if ("setUninstallURL" in chrome.runtime)
{
  Prefs.untilLoaded.then(setUninstallURL);
  Prefs.on("notificationdata", setUninstallURL);
}
