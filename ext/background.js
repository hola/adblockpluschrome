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
  var nonEmptyPageMaps = Object.create(null);
  var pageMapCounter = 0;

  var PageMap = ext.PageMap = function()
  {
    this._map = Object.create(null);
    this._id = ++pageMapCounter;
  };
  PageMap.prototype = {
    _delete: function(id)
    {
      delete this._map[id];

      if (Object.keys(this._map).length == 0)
        delete nonEmptyPageMaps[this._id];
    },
    keys: function()
    {
      return Object.keys(this._map).map(ext.getPage);
    },
    get: function(page)
    {
      return this._map[page.id];
    },
    set: function(page, value)
    {
      this._map[page.id] = value;
      nonEmptyPageMaps[this._id] = this;
    },
    has: function(page)
    {
      return page.id in this._map;
    },
    clear: function()
    {
      for (var id in this._map)
        this._delete(id);
    },
    delete: function(page)
    {
      this._delete(page.id);
    }
  };

  ext._removeFromAllPageMaps = function(pageId)
  {
    for (var pageMapId in nonEmptyPageMaps)
      nonEmptyPageMaps[pageMapId]._delete(pageId);
  };
})();
