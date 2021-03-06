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

/** @module icon */

"use strict";

let {FilterNotifier} = require("filterNotifier");

const frameOpacities =  [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
                         1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
                         0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0];
const numberOfFrames = frameOpacities.length;
const safariPlatform = require("info").platform == "safari";

let stopRequested = false;
let canUpdateIcon = true;
let notRunning = Promise.resolve();
let whitelistedState = new ext.PageMap();

function loadImage(url)
{
  return new Promise((resolve, reject) =>
  {
    let image = new Image();
    image.src = url;
    image.addEventListener("load", () =>
    {
      resolve(image);
    });
    image.addEventListener("error", () =>
    {
      reject("Failed to load image " + url);
    });
  });
};

function setIcon(page, notificationType, opacity, frames, is_hola)
{
  opacity = opacity || 0;
  let whitelisted = !!whitelistedState.get(page) && !safariPlatform;

  if (!notificationType || !frames)
  {
    if (opacity > 0.5)
      page.browserAction.setIcon("icons/hab-$size-notification-"
                                 + notificationType + ".png");
    else
      page.browserAction.setIcon("icons/hab-$size" +
                                 (whitelisted && !is_hola  ? "-whitelisted" : "") + ".png");
  }
  else
  {
    chrome.browserAction.setIcon({
      tabId: page.id,
      imageData: frames["" + opacity + whitelisted]
    });
  }
}

FilterNotifier.on("page.WhitelistingStateRevalidate", (page, filter) =>
{
  var is_hola = !!filter && filter.hola;

  whitelistedState.set(page, !!filter);
  if (canUpdateIcon)
    setIcon(page, false, 0, false, is_hola);
});

function renderFrames(notificationType)
{
  if (safariPlatform)
    return Promise.resolve(null);

  return Promise.all([
    loadImage("icons/hab-19.png"),
    loadImage("icons/hab-19-whitelisted.png"),
    loadImage("icons/hab-19-notification-" + notificationType + ".png"),
    loadImage("icons/hab-38.png"),
    loadImage("icons/hab-38-whitelisted.png"),
    loadImage("icons/hab-38-notification-" + notificationType + ".png"),
  ]).then(images =>
  {
    let images = {
      19: { base: [images[0], images[1]], overlay: images[2] },
      38: { base: [images[3], images[4]], overlay: images[5] }
    };

    let frames = {};
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    for (let whitelisted of [false, true])
    {
      for (let i = 0, opacity = 0; i <= 10; opacity = ++i / 10)
      {
        let imageData = {};
        for (let size of [19, 38])
        {
          canvas.width = size;
          canvas.height = size;
          context.globalAlpha = 1;
          context.drawImage(images[size]["base"][whitelisted | 0], 0, 0);
          context.globalAlpha = opacity;
          context.drawImage(images[size]["overlay"], 0, 0);
          imageData[size] = context.getImageData(0, 0, size, size);
        }
        frames["" + opacity + whitelisted] = imageData;
      }
    }

    return frames;
  });
}

function animateIcon(notificationType, frames)
{
  ext.pages.query({active: true}, pages =>
  {
    let animationStep = 0;
    let opacity = 0;

    let onActivated = page =>
    {
      pages.push(page);
      setIcon(page, notificationType, opacity, frames);
    };
    ext.pages.onActivated.addListener(onActivated);

    canUpdateIcon = false;
    let interval = setInterval(() =>
    {
      let oldOpacity = opacity;
      opacity = frameOpacities[animationStep++];

      if (opacity != oldOpacity)
      {
        for (let page of pages)
        {
          if (whitelistedState.has(page))
            setIcon(page, notificationType, opacity, frames);
        }
      }

      if (animationStep > numberOfFrames)
      {
        clearInterval(interval);
        ext.pages.onActivated.removeListener(onActivated);
        canUpdateIcon = true;
      }
    }, 100);
  });
}

let stopIconAnimation =
/**
 * Stops to animate the browser action icon
 * after the current interval has been finished.
 *
 * @return {Promise} A promise that is fullfilled when
 *                   the icon animation has been stopped.
 */
exports.stopIconAnimation = function()
{
  stopRequested = true;
  return notRunning.then(() =>
  {
    stopRequested = false;
  });
};

/**
 * Starts to animate the browser action icon to indicate a pending notifcation.
 * If the icon is already animated, it replaces the previous
 * animation as soon as the current interval has been finished.
 *
 * @param {string} type  The notification type (i.e: "information" or "critical")
 */
exports.startIconAnimation = function(type)
{
  notRunning = new Promise(resolve =>
  {
    Promise.all([renderFrames(type), stopIconAnimation()]).then(results =>
    {
      if (stopRequested)
      {
        resolve();
        return;
      }

      let frames = results[0];
      animateIcon(type, frames);

      let interval = setInterval(() =>
      {
        if (stopRequested)
        {
          clearInterval(interval);
          resolve();
          return;
        }

        animateIcon(type, frames);
      }, 10000);
    });
  });
};
