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

(function()
{
  /* Message passing */

  ext.onMessage = new ext._EventTarget();


  /* Background page */

  ext.backgroundPage = {
    sendMessage: chrome.runtime.sendMessage,
    getWindow: function()
    {
      return chrome.extension.getBackgroundPage();
    }
  };


  /* Utils */

  ext.getURL = chrome.extension.getURL;
  ext.i18n = chrome.i18n;
})();
