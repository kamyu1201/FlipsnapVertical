/**
 * flipsnap.js
 *
 * @version  0.5.3
 * @url http://pxgrid.github.com/js-flipsnap/
 *
 * Copyright 2011 PixelGrid, Inc.
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 */


/**
 * flipsnapVertical.js
 * 
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 */



(function(window, document, undefined) {

var div = document.createElement('div');
var prefix = ['webkit', 'moz', 'o', 'ms'];
var saveProp = {};
var support = FlipsnapVertical.support = {};
var gestureStart = false;

support.transform3d = hasProp([
  'perspectiveProperty',
  'WebkitPerspective',
  'MozPerspective',
  'OPerspective',
  'msPerspective'
]);

support.transform = hasProp([
  'transformProperty',
  'WebkitTransform',
  'MozTransform',
  'OTransform',
  'msTransform'
]);

support.transition = hasProp([
  'transitionProperty',
  'WebkitTransitionProperty',
  'MozTransitionProperty',
  'OTransitionProperty',
  'msTransitionProperty'
]);

support.addEventListener = 'addEventListener' in window;
support.mspointer = window.navigator.msPointerEnabled;

support.cssAnimation = (support.transform3d || support.transform) && support.transition;

var eventTypes = ['touch', 'mouse', 'pointer'];
var events = {
  start: {
    touch: 'touchstart',
    mouse: 'mousedown',
    pointer: 'MSPointerDown'
  },
  move: {
    touch: 'touchmove',
    mouse: 'mousemove',
    pointer: 'MSPointerMove'
  },
  end: {
    touch: 'touchend',
    mouse: 'mouseup',
    pointer: 'MSPointerUp'
  }
};

if (support.addEventListener) {
  document.addEventListener('gesturestart', function() {
    gestureStart = true;
  });

  document.addEventListener('gestureend', function() {
    gestureStart = false;
  });
}

function FlipsnapVertical(element, opts) {
  return (this instanceof FlipsnapVertical)
    ? this.init(element, opts)
    : new FlipsnapVertical(element, opts);
}

FlipsnapVertical.prototype.init = function(element, opts) {
  var self = this;

  // set element
  self.element = element;
  if (typeof element === 'string') {
    self.element = document.querySelector(element);
  }

  if (!self.element) {
    throw new Error('element not found');
  }

  if (support.mspointer) {
    self.element.style.msTouchAction = 'none';
  }

  // set opts
  opts = opts || {};
  self.distance = opts.distance;
  self.maxPoint = opts.maxPoint;
  self.disableTouch = (opts.disableTouch === undefined) ? false : opts.disableTouch;
  self.disable3d = (opts.disable3d === undefined) ? false : opts.disable3d;
  self.transitionDuration = (opts.transitionDuration === undefined) ? '350ms' : opts.transitionDuration + 'ms';

  // set property
  self.currentPoint = 0;
  self.currentY = 0;
  self.animation = false;
  self.use3d = support.transform3d;
  if (self.disable3d === true) {
    self.use3d = false;
  }

  // set default style
  if (support.cssAnimation) {
    self._setStyle({
      transitionProperty: getCSSVal('transform'),
      transitionTimingFunction: 'cubic-bezier(0,0,0.25,1)',
      transitionDuration: '0ms',
      transform: self._getTranslate(0)
    });
  }
  else {
    self._setStyle({
      position: 'relative',
      top: '0px'
    });
  }

  // initilize
  self.refresh();

  eventTypes.forEach(function(type) {
    self.element.addEventListener(events.start[type], self, false);
  });

  return self;
};

FlipsnapVertical.prototype.handleEvent = function(event) {
  var self = this;

  switch (event.type) {
    case events.start.touch:
    case events.start.mouse:
    case events.start.pointer:
      self._touchStart(event);
      break;
    case events.move.touch:
    case events.move.mouse:
    case events.move.pointer:
      self._touchMove(event);
      break;
    case events.end.touch:
    case events.end.mouse:
    case events.end.pointer:
      self._touchEnd(event);
      break;
    case 'click':
      self._click(event);
      break;
  }
};

FlipsnapVertical.prototype.refresh = function() {
  var self = this;

  // setting max point
  self._maxPoint = (self.maxPoint === undefined) ? (function() {
    var childNodes = self.element.childNodes,
      itemLength = 0,
      i = 0,
      len = childNodes.length,
      node;
    for(; i < len; i++) {
      node = childNodes[i];
      if (node.nodeType === 1) {
        itemLength++;
      }
    }
    if (itemLength > 0) {
      itemLength--;
    }

    return itemLength;
  })() : self.maxPoint;

  // setting distance
  self._distance = (self.distance === undefined)
          ? self.element.scrollHeight / (self._maxPoint + 1)
          : self.distance;

  // setting maxY
  self._maxY = -self._distance * self._maxPoint;

  self.moveToPoint();
};

FlipsnapVertical.prototype.hasNext = function() {
  var self = this;

  return self.currentPoint < self._maxPoint;
};

FlipsnapVertical.prototype.hasPrev = function() {
  var self = this;

  return self.currentPoint > 0;
};

FlipsnapVertical.prototype.toNext = function(transitionDuration) {
  var self = this;

  if (!self.hasNext()) {
    return;
  }

  self.moveToPoint(self.currentPoint + 1, transitionDuration);
};

FlipsnapVertical.prototype.toPrev = function(transitionDuration) {
  var self = this;

  if (!self.hasPrev()) {
    return;
  }

  self.moveToPoint(self.currentPoint - 1, transitionDuration);
};

FlipsnapVertical.prototype.moveToPoint = function(point, transitionDuration) {
  var self = this;
  
  transitionDuration = transitionDuration === undefined
    ? self.transitionDuration : transitionDuration + 'ms';

  var beforePoint = self.currentPoint;

  // not called from `refresh()`
  if (point === undefined) {
    point = self.currentPoint;
  }

  if (point < 0) {
    self.currentPoint = 0;
  }
  else if (point > self._maxPoint) {
    self.currentPoint = self._maxPoint;
  }
  else {
    self.currentPoint = parseInt(point, 10);
  }

  if (support.cssAnimation) {
    self._setStyle({ transitionDuration: transitionDuration });
  }
  else {
    self.animation = true;
  }
  self._setY(- self.currentPoint * self._distance, transitionDuration);

  if (beforePoint !== self.currentPoint) { // is move?
    self._triggerEvent('fspointmove', true, false);
  }
};

FlipsnapVertical.prototype._setY = function(y, transitionDuration) {
  var self = this;

  self.currentY = y;
  if (support.cssAnimation) {
    self.element.style[ saveProp.transform ] = self._getTranslate(y);
  }
  else {
    if (self.animation) {
      self._animate(y, transitionDuration || self.transitionDuration);
    }
    else {
      self.element.style.top = y + 'px';
    }
  }
};

FlipsnapVertical.prototype._touchStart = function(event) {
  var self = this;

  if (self.disableTouch || self._eventType || gestureStart) {
    return;
  }

  some(eventTypes, function(type) {
    if (event.type === events.start[type]) {
      self._eventType = type;
      return true;
    }
  });

  self.element.addEventListener(events.move[self._eventType], self, false);
  document.addEventListener(events.end[self._eventType], self, false);

  if (self._eventType === 'mouse') {
    event.preventDefault();
  }

  if (support.cssAnimation) {
    self._setStyle({ transitionDuration: '0ms' });
  }
  else {
    self.animation = false;
  }
  self.scrolling = true;
  self.moveReady = false;
  self.startPageX = getPage(event, 'pageX');
  self.startPageY = getPage(event, 'pageY');
  self.basePageY = self.startPageY;
  self.directionY = 0;
  self.startTime = event.timeStamp;
  self._triggerEvent('fstouchstart', true, false);
};

FlipsnapVertical.prototype._touchMove = function(event) {
  var self = this;

  if (!self.scrolling || gestureStart) {
    return;
  }

  var pageX = getPage(event, 'pageX'),
    pageY = getPage(event, 'pageY'),
    distY,
    newY,
    deltaX,
    deltaY;

  if (self.moveReady) {
    event.preventDefault();
    event.stopPropagation();

    distY = pageY - self.basePageY;
    newY = self.currentY + distY;
    if (newY >= 0 || newY < self._maxY) {
      newY = Math.round(self.currentY + distY / 3);
    }

    // When distX is 0, use one previous value.
    // For android firefox. When touchend fired, touchmove also
    // fired and distX is certainly set to 0. 
    self.directionY =
      distY === 0 ? self.directionY :
      distY > 0 ? -1 : 1;

    // if they prevent us then stop it
    var isPrevent = !self._triggerEvent('fstouchmove', true, true, {
      delta: distY,
      direction: self.directionY
    });

    if (isPrevent) {
      self._touchAfter({
        moved: false,
        originalPoint: self.currentPoint,
        newPoint: self.currentPoint,
        cancelled: true
      });
    } else {
      self._setY(newY);
    }
  }
  else {
    deltaX = Math.abs(pageX - self.startPageX);
    deltaY = Math.abs(pageY - self.startPageY);
    if (deltaY > 5) {
      event.preventDefault();
      event.stopPropagation();
      self.moveReady = true;
      self.element.addEventListener('click', self, true);
    }
    else if (deltaX > 5) {
      self.scrolling = false;
    }
  }

  self.basePageY = pageY;
};

FlipsnapVertical.prototype._touchEnd = function(event) {
  var self = this;

  self.element.removeEventListener(events.move[self._eventType], self, false);
  document.removeEventListener(events.end[self._eventType], self, false);
  self._eventType = null;

  if (!self.scrolling) {
    return;
  }

  var newPoint = -self.currentY / self._distance;
  newPoint =
    (self.directionY > 0) ? Math.ceil(newPoint) :
    (self.directionY < 0) ? Math.floor(newPoint) :
    Math.round(newPoint);

  if (newPoint < 0) {
    newPoint = 0;
  }
  else if (newPoint > self._maxPoint) {
    newPoint = self._maxPoint;
  }

  self._touchAfter({
    moved: newPoint !== self.currentPoint,
    originalPoint: self.currentPoint,
    newPoint: newPoint,
    cancelled: false
  });

  self.moveToPoint(newPoint);
};

FlipsnapVertical.prototype._click = function(event) {
  var self = this;

  event.stopPropagation();
  event.preventDefault();
};

FlipsnapVertical.prototype._touchAfter = function(params) {
  var self = this;

  self.scrolling = false;
  self.moveReady = false;

  setTimeout(function() {
    self.element.removeEventListener('click', self, true);
  }, 200);

  self._triggerEvent('fstouchend', true, false, params);
};

FlipsnapVertical.prototype._setStyle = function(styles) {
  var self = this;
  var style = self.element.style;

  for (var prop in styles) {
    setStyle(style, prop, styles[prop]);
  }
};

FlipsnapVertical.prototype._animate = function(y, transitionDuration) {
  var self = this;

  var elem = self.element;
  var begin = +new Date();
  var from = parseInt(elem.style.top, 10);
  var to = y;
  var duration = parseInt(transitionDuration, 10);
  var easing = function(time, duration) {
    return -(time /= duration) * (time - 2);
  };
  var timer = setInterval(function() {
    var time = new Date() - begin;
    var pos, now;
    if (time > duration) {
      clearInterval(timer);
      now = to;
    }
    else {
      pos = easing(time, duration);
      now = pos * (to - from) + from;
    }
    elem.style.top = now + "px";
  }, 10);
};

FlipsnapVertical.prototype.destroy = function() {
  var self = this;

  eventTypes.forEach(function(type) {
    self.element.removeEventListener(events.start[type], self, false);
  });
};

FlipsnapVertical.prototype._getTranslate = function(y) {
  var self = this;

  return self.use3d
    ? 'translate3d(0,' + y + 'px,  0)'
    : 'translate(0,' + y + 'px)';
};

FlipsnapVertical.prototype._triggerEvent = function(type, bubbles, cancelable, data) {
  var self = this;

  var ev = document.createEvent('Event');
  ev.initEvent(type, bubbles, cancelable);

  if (data) {
    for (var d in data) {
      ev[d] = data[d];
    }
  }

  return self.element.dispatchEvent(ev);
};

function getPage(event, page) {
  return event.changedTouches ? event.changedTouches[0][page] : event[page];
}

function hasProp(props) {
  return some(props, function(prop) {
    return div.style[ prop ] !== undefined;
  });
}

function setStyle(style, prop, val) {
  var _saveProp = saveProp[ prop ];
  if (_saveProp) {
    style[ _saveProp ] = val;
  }
  else if (style[ prop ] !== undefined) {
    saveProp[ prop ] = prop;
    style[ prop ] = val;
  }
  else {
    some(prefix, function(_prefix) {
      var _prop = ucFirst(_prefix) + ucFirst(prop);
      if (style[ _prop ] !== undefined) {
        saveProp[ prop ] = _prop;
        style[ _prop ] = val;
        return true;
      }
    });
  }
}

function getCSSVal(prop) {
  if (div.style[ prop ] !== undefined) {
    return prop;
  }
  else {
    var ret;
    some(prefix, function(_prefix) {
      var _prop = ucFirst(_prefix) + ucFirst(prop);
      if (div.style[ _prop ] !== undefined) {
        ret = '-' + _prefix + '-' + prop;
        return true;
      }
    });
    return ret;
  }
}

function ucFirst(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

function some(ary, callback) {
  for (var i = 0, len = ary.length; i < len; i++) {
    if (callback(ary[i], i)) {
      return true;
    }
  }
  return false;
}

window.FlipsnapVertical = FlipsnapVertical;

})(window, window.document);
