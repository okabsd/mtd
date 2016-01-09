// mtd.js
// Colin 'Oka' Hall-Coates, <yo@oka.io>
// MIT, 2016

var ARGS = require('minimist');

function MTD (options) {
  this.options = ARGS(process.argv.slice(2), options);
  this.argv = this.options._;

  this.settings = {
    reruns: true,
    multi: true
  };

  this.tracks = {};
  this.radio = {};

  this._before = [];
  this._default = null;
  this._after = [];
}

MTD.prototype.configure = function (conf) {
  var settings = this.settings;

  for (var key in config)
    if (config.hasOwnProperty(key) && settings.hasOwnProperty(key))
      settings[key] = config[key];

  return this;
};

MTD.prototype.halt = function (track, failures) {
  console.warn('Required option(s) not found for [ %s ]:', track);

  failures.forEach(function (failure) {
    console.warn('\t%s', failure);
  });
};

var isFunction = function (object) {
  return typeof object === 'function';
};

var parse = function (block) {
  var args = block.length && /\(\s*([^)]+?)\s*\)/.exec(block.toString());
  return args ? args[1].split(/\s*,\s*/) : [];
};

MTD.prototype.track = function (name, requirements, block) {
  var jump;

  if (isFunction(requirements)) {
    block = requirements;
    requirements = parse(block);
    jump = true;
  } else if (!isFunction(block))
    block = requirements.pop();

  if (jump || isFunction(block))
    this.tracks[name] = {
      requirements: requirements,
      block: block
    };
  else console.warn('No block given for [ %s ].', name);

  return this;
};

MTD.prototype.default = function (name, requirements, block) {
  if (typeof name !== 'string') {
    block = requirements;
    requirements = name;
    name = 'MTD_DEFAULT';
  }

  if (!requirements || this.track(name, requirements, block))
    this._default = name;

  return this;
};

MTD.prototype.before = function (name, requirements, block) {
  var before = this._before;

  if (typeof name !== 'string') {
    block = requirements;
    requirements = name;
    name = 'MTD_BEFORE_' + before.length;
  }

  if (!requirements || this.track(name, requirements, block))
    before.push(name);

  return this;
};

MTD.prototype.after = function (name, requirements, block) {
  var after = this._after;

  if (typeof name !== 'string') {
    block = requirements;
    requirements = name;
    name = 'MTD_BEFORE_' + after.length;
  }

  if (!requirements || this.track(name, requirements, block))
    after.push(name);

  return this;
};

MTD.prototype.dispatch = function (track) {
  var
  tracks = this.tracks,
  settings, options, context, bindings, failures;

  if (tracks.hasOwnProperty(track))
    context = tracks[track];
  else return console.warn('Track [ %s ] not found.', track);

  settings = this.settings;

  if (context.departed && !settings.reruns)
    return console.warn('Refusing to rerun [ %s ].', track);

  options = this.options;
  bindings = context.requirements.map(function (requirement) {
    if (options.hasOwnProperty(requirement))
      return options[requirement];
    else if (failures) failures.push(requirement);
    else failures = [requirement];
  });

  if (failures) return this.halt(track, failures);

  context.departed = true;
  context.result = context.block.apply(this, bindings);
};

var dispatcher = function (track) {
  this.dispatch(track);
};

MTD.prototype.embark = function () {
  var
  argv = this.argv,
  before = this._before,
  after = this._after,
  def;

  if (before.length)
    before.forEach(dispatcher, this);

  if (argv.length) {
    if (this.settings.multi) argv.forEach(dispatcher, this);
    else this.dispatch(argv[0]);
  } else if ((def = this._default))
    this.dispatch(def);

  if (after.length)
    after.forEach(dispatcher, this);
};

module.exports = function barrier (options) {
  return new MTD(options);
};
