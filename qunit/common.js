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


importAll("filterClasses", this);
importAll("subscriptionClasses", this);
importAll("matcher", this);
importAll("filterStorage", this);
importAll("filterNotifier", this);
importAll("elemHide", this);
importAll("prefs", this);
importAll("utils", this);

function prepareFilterComponents(keepListeners)
{
  FilterStorage.subscriptions = [];
  FilterStorage.knownSubscriptions = Object.create(null);
  Subscription.knownSubscriptions = Object.create(null);
  Filter.knownFilters = Object.create(null);

  defaultMatcher.clear();
  ElemHide.clear();
}

function restoreFilterComponents()
{
}

function preparePrefs()
{
  this._pbackup = Object.create(null);
  for (var pref in Prefs)
  {
    var value = Prefs[pref];
    this._pbackup[pref] = value;
  }
  Prefs.enabled = true;
}

function restorePrefs()
{
  for (var pref in this._pbackup)
    Prefs[pref] = this._pbackup[pref];
}

function executeFirstRunActions()
{
}
