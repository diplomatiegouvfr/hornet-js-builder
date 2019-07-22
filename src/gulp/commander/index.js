'use strict';
const path = require('path');
const through2 = require('through2');
const dargs = require('dargs');
const groupBy = require('lodash.groupby');
const PQueue = require('p-queue');
const commandRunner = require('./lib/command-runner');
const Helper = require('../../helpers');

const defaultCommands = {
  npm: ['install'],
};

const defaultFileToCommand = {
  'package.json': 'npm',
};

const noop = () => {};

module.exports = {
  gulpPlugin: function (opts = {}, done = noop) {
    if (typeof opts === 'function') {
      done = opts;
      opts = {};
    }
    const fileToCommand = Object.assign(
      {},
      defaultFileToCommand,
      opts.commands
    );
    const toRun = [];

    return through2(
      {objectMode: true},
      function (file, enc, cb) {
        if (!file.path) {
          return cb();
        }
        console.log("getRemainingArgs :", Helper.getRemainingArgs());
        let commander = opts.command || fileToCommand[path.basename(file.path)];

        if (commander) {
          const cmd = {
            cmd: commander,
            args: (opts.args || Helper.getRemainingArgs() || defaultCommands[commander] || []).slice()
          };

          if (opts.args) {
            cmd.args = cmd.args.concat(opts.args).map(arg => arg.toString());
          }
          if (Array.isArray(opts[cmd.cmd])) {
            cmd.args = cmd.args.concat(opts[cmd.cmd].map(arg => arg.toString()));
          } else if (typeof opts[cmd.cmd] === 'object') {
            cmd.args = cmd.args.concat(dargs(opts[cmd.cmd]));
          } else if (opts[cmd.cmd]) {
            cmd.args = cmd.args.concat(opts[cmd.cmd].toString());
          }

          cmd.cwd = path.dirname(file.path);
          toRun.push(cmd);
        }
        this.push(file);
        cb();
      },
      cb => {
        if (toRun.length === 0) {
          return cb();
        }

        const groupedCommands = groupBy(toRun, 'cmd');
        return Promise.all(Object.keys(groupedCommands).map(cmd => {
          const commands = groupedCommands[cmd];
          const queue = new PQueue({concurrency: 1});
          return Promise.all(commands.map(command => queue.add(() => commandRunner.run(command))));
        }))
        .then(() => done())
        .then(() => cb(), cb);
      }
    );
  },
  toPromise: function (opts, continueOnError) {

    return new Promise((resolve, reject) => {

      if(!opts.cmd) {
        reject(new Error("no command in option."));
      }

      const cmd = {
        cmd: opts.cmd,
        args: opts.args || [],
        cwd: opts.cwd
      };

      return commandRunner.run(cmd, continueOnError).then((data) => {
        resolve(data);
      }).catch(e => {});

    });
  }
}
