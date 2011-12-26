// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      case '%%': return '%';
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


exports.print = function() {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    process.stdout.write(String(arguments[i]));
  }
};


exports.puts = function() {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    process.stdout.write(arguments[i] + '\n');
  }
};


exports.debug = function(x) {
  process.stderr.write('DEBUG: ' + x + '\n');
};


var error = exports.error = function(x) {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    process.stderr.write(arguments[i] + '\n');
  }
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 * @param {Boolean} resolveGetters Attempt to resolve getters to their value.
 *    If an error is thrown the value is set to the error. Default is false.
 */

function inspect(obj, showHidden, depth, colors) {
  var settings = {
    showHidden: showHidden,          // show non-enumerables
    style: colors ? color : noColor,
    seen: []
  };

  // cache formatted brackets
  settings.square = [
    settings.style('[', 'Square'),
    settings.style(']', 'Square')
  ];
  settings.curly =  [
    settings.style('{',  'Curly'),
    settings.style('}',  'Curly')
  ];

  return formatValue(obj, depth || 2, settings);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
var ansi = {
  black       : [  '30',    '39'],
  red         : [  '31',    '39'],
  green       : [  '32',    '39'],
  yellow      : [  '33',    '39'],
  blue        : [  '34',    '39'],
  magenta     : [  '35',    '39'],
  cyan        : [  '36',    '39'],
  white       : [  '37',    '39'],
  boldblack   : ['1;30', '22;39'],
  boldred     : ['1;31', '22;39'],
  boldgreen   : ['1;32', '22;39'],
  boldyellow  : ['1;33', '22;39'],
  boldblue    : ['1;34', '22;39'],
  boldmagenta : ['1;35', '22;39'],
  boldcyan    : ['1;36', '22;39'],
  boldwhite   : ['1;37', '22;39']
};


// map types to a color
var styles = {
  // falsey
  Undefined   : 'boldblack',
  Null        : 'boldblack',
  // constructor functions
  Constructor : 'boldyellow',
  // normal types
  Function    : 'boldmagenta',
  Boolean     : 'boldyellow',
  Date        : 'boldred',
  Error       : 'boldred',
  Number      : 'yellow',
  RegExp      : 'boldred',
  // proprty names and strings
  HString     : 'green',
  String      : 'boldgreen',
  HConstant   : 'cyan',
  Constant    : 'boldcyan',
  HName       : 'boldblack',
  Name        : 'boldwhite',
  // meta-labels
  More        : 'red',
  Accessor    : 'magenta',
  Circular    : 'red',
  // brackets
  Square      : 'white',
  Curly       : 'white'
};


// callbind parameterizes `this`
var callbind = Function.prototype.call.bind.bind(Function.prototype.call);
var errorToString = callbind(Error.prototype.toString);

// formatter for functions shared with constructor formatter
function functionLabel(fn, isCtor) {
  var type = isCtor ? 'Constructor' : 'Function',
      label = fn.name ? ': ' + fn.name : '';
  return '[' + type + label + ']';
}


// most formatting determined by internal [[class]]
var formatters = {
  Boolean     : String,
  Constructor : function(f){ return functionLabel(f, true); },
  Date        : callbind(Date.prototype.toString),
  Error       : function(e){ return '[' + errorToString(e) + ']'; },
  Function    : function(f){ return functionLabel(f, false); },
  Null        : String,
  Number      : String,
  RegExp      : callbind(RegExp.prototype.toString),
  String      : quotes,
  Undefined   : String
};


// wrap a string with ansi escapes for coloring
function color(str, style, special) {
  var out = special ? '\u00AB' + str + '\u00BB' : str;
  if (styles[style]) {
    out = '\033[' + ansi[styles[style]][0] + 'm' + out +
          '\033[' + ansi[styles[style]][1] + 'm';
  }
  return out;
}


// return without ansi colors
function noColor(str, style, special) {
  return special ? '\u00AB' + str + '\u00BB' : str;
}


var numeric = /^\d+$/;
var q = ['"', "'"];
var qMatch = [/(')/g, /(")/g];

// quote string preferably with quote type not found in the string
// then escape slashes and opposite quotes if string had both types
function quotes(s) {
  s = String(s).replace(/\\/g, '\\\\');
  var qWith = +(s.match(qMatch[0]) === null);
  return q[qWith] + s.replace(qMatch[1-qWith], '\\$1') + q[qWith];
}


function formatValue(value, depth, settings) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    return value.inspect(depth);
  }

  var base = '';
  var type = isConstructor(value) ? 'Constructor' : getClass(value);
  var array = isArray(value);
  var braces = array ? settings.square : settings.curly;

  if (type in formatters) {
    // types can be formatted by matching their internal class
    base = settings.style(formatters[type](value), type);
  }

  // prevent deeper inspection for primitives and regexps
  if (isPrimitive(value) ||
      !settings.showHidden && type === 'RegExp') {
    return base;
  }

  // depth limit reached
  if (depth < 0) {
    return settings.style('More', 'More', true);
  }

  if (!settings.showHidden) {
    var properties = Object.keys(value);
  } else {
    var properties = Object.getOwnPropertyNames(value);

    if (typeof value === 'function') {
      properties = properties.filter(function(key) {
        // hide useless properties every function has
        return !(key in Function);
      });
      // show prototype last for constructors
      if (type === 'Constructor') {
        properties.push('prototype');
      }
    }
  }

  if (properties.length === 0) {
    // no properties so return '[]' or '{}'
    if (base) {
      return base;
    }
    if (!array || value.length === 0) {
      return braces.join('');
    }
  }


  settings.seen.push(value);

  var output = [];

  // iterate array indexes first
  if (array) {
    for (var i = 0, len = value.length; i < len; i++) {
      if (typeof value[i] === 'undefined') {
        output.push('');
      } else {
        output.push(formatProperty(value, i, depth, settings, array));
      }
    }
  }

  // properties on objects and named array properties
  properties.forEach(function(key) {
    if (!array || !numeric.test(key)) {
      var prop = formatProperty(value, key, depth, settings, array);
      if (prop.length) {
        output.push(prop);
      }
    }
  });

  return combine(output, base, braces);
}

function formatProperty(value, key, depth, settings, array) {
  // str starts as an array, val is a property descriptor
  var str = [];
  var val = Object.getOwnPropertyDescriptor(value, key);

  // V8 c++ accessors like process.env that don't correctly
  // work with Object.getOwnPropertyDescriptor
  if (typeof val === 'undefined') {
    val = {
      value: value[key],
      enumerable: true,
      writable: true
    };
  }

  // check for accessors
  val.get && str.push('Getter');
  val.set && str.push('Setter');

  // combine Getter/Setter, or evaluate to empty for data descriptors
  str = str.join('/');
  if (str) {
    // accessor descriptor
    str = settings.style(str, 'Accessor', true);
  } else {
    // data descriptor
    if (~settings.seen.indexOf(val.value)) {
      // already seen
      if (key !== 'constructor') {
        str = settings.style('Circular', 'Circular', true);
      } else {
        // hide redundent constructor reference
        return '';
      }

    } else {
      // recurse to subproperties
      depth = depth === null ? null : depth - 1;
      str = formatValue(val.value, depth, settings);

      // prepend indentation for multiple lines
      if (~str.indexOf('\n')) {
        str = indent(str);
        // trim the edges
        str = array ? str.substring(2) : '\n' + str;
      }
    }
  }

  // array indexes don't display their name
  if (array && numeric.test(key)) {
    return str;
  }

  var nameFormat;

  if (/^[a-zA-Z_\$][a-zA-Z0-9_\$]*$/.test(key)) {
    // valid JavaScript name not requiring quotes

    if (val.value && !val.writable) {
      // color non-writable differently
      nameFormat = 'Constant';
    } else {
      // regular name
      nameFormat = 'Name';
    }
  } else {
    // name requires quoting
    nameFormat = 'String';
    key = quotes(key);
  }

  if (!val.enumerable) {
    if (settings.style.name !== 'color') {
      // add brackets if colors are disabled
      key = '[' + key + ']';
    } else {
      // use different coloring otherwise
      nameFormat = 'H' + nameFormat;
    }
  }

  return settings.style(key, nameFormat) + ': ' + str;
}

function indent(str){
  return str.split('\n')
            .map(function(line) { return '  ' + line; })
            .join('\n');
}

function combine(output, base, braces) {
  var lines = 0;
  // last line's length
  var length = output.reduce(function(prev, cur) {
    // number of lines
    lines += 1 + !!~cur.indexOf('\n');
    return prev + cur.length + 1;
  }, 0);

  if (base.length) {
    // if given base make it so that it's not too long
    if (length > 60) {
      base = ' ' + base;
      output.unshift(lines > 1 ? '' : ' ');
    } else {
      base = ' ' + base + ' ';
    }
  } else {
    base = ' ';
  }

  // combine lines with commas and pad as needed
  base += output.join(',' + (length > 60 ? '\n ' : '') + ' ') + ' ';

  // wrap in appropriate braces
  return braces[0] + base + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}
exports.isArray = isArray;


function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;


function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;


function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}
exports.isError = isError;


function objectToString(o) {
  return Object.prototype.toString.call(o);
}

// slice '[object Class]' to 'Class' for use in dict lookups
function getClass(o) {
  return objectToString(o).slice(8, -1);
}


// returns true for strings, numbers, booleans, null, undefined, NaN
function isPrimitive(o) {
  return Object(o) !== o;
}
exports.isPrimitive = isPrimitive;


// returns true if a function has properties besides `constructor` in its prototype
// and gracefully handles any input including undefined and undefined prototypes
function isConstructor(o){
  return typeof o === 'function' &&
         Object(o.prototype) === o.prototype &&
         Object.getOwnPropertyNames(o.prototype).length >
         ('constructor' in o.prototype);
}
exports.isConstructor = isConstructor;


var pWarning;

exports.p = function() {
  if (!pWarning) {
    pWarning = 'util.p will be removed in future versions of Node. ' +
               'Use util.puts(util.inspect()) instead.\n';
    exports.error(pWarning);
  }
  for (var i = 0, len = arguments.length; i < len; ++i) {
    error(exports.inspect(arguments[i]));
  }
};


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


exports.log = function(msg) {
  exports.puts(timestamp() + ' - ' + msg.toString());
};


var execWarning;
exports.exec = function() {
  if (!execWarning) {
    execWarning = 'util.exec has moved to the "child_process" module.' +
                  ' Please update your source code.';
    error(execWarning);
  }
  return require('child_process').exec.apply(this, arguments);
};


exports.pump = function(readStream, writeStream, callback) {
  var callbackCalled = false;

  function call(a, b, c) {
    if (callback && !callbackCalled) {
      callback(a, b, c);
      callbackCalled = true;
    }
  }

  readStream.addListener('data', function(chunk) {
    if (writeStream.write(chunk) === false) readStream.pause();
  });

  writeStream.addListener('drain', function() {
    readStream.resume();
  });

  readStream.addListener('end', function() {
    writeStream.end();
  });

  readStream.addListener('close', function() {
    call();
  });

  readStream.addListener('error', function(err) {
    writeStream.end();
    call(err);
  });

  writeStream.addListener('error', function(err) {
    readStream.destroy();
    call(err);
  });
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be revritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var deprecationWarnings;

exports._deprecationWarning = function(moduleId, message) {
  if (!deprecationWarnings)
    deprecationWarnings = {};
  else if (message in deprecationWarnings)
    return;

  deprecationWarnings[message] = true;

  if ((new RegExp('\\b' + moduleId + '\\b')).test(process.env.NODE_DEBUG))
    console.trace(message);
  else
    console.error(message);
};