'use strict';
const {spawn} = require('child_process');
const Helper = require('../../../helpers');

exports.run = function (command, continueOnError) {
  return new Promise((resolve, reject) => {
      Helper.debug(`${command.cmd} ${command.args} in cwd: ${command.cwd || process.cwd()}`);
      const cmd = spawn(quoteIfNecessary(command.cmd), command.args, {shell: true, stdio: 'pipe', cwd: command.cwd || process.cwd()});
      let commandeResult;
      cmd.stdout.on('data', (data) => {
        commandeResult = `${data}`;
        Helper.debug(`${data}`);
      });
      cmd.stderr.on('data', (data) => {
        Helper.error(`${data}`);
      });
      cmd.on('close', code => {
        if (code !== 0 && !continueOnError) {
          return reject(new Error(`"${command.cmd}" exited with non-zero code ${code}`));
        }
        resolve(commandeResult);
      });
    });
  //});
};

function quoteIfNecessary(command) {
  return /\s+/.test(command) ? `"${command}"` : command;
}


/*exports.run = function (command) {
  return new Promise((resolve, reject) => {
    which(command.cmd, (err, cmdpath) => {
      if (err) {
        return reject(new Error(`Can't install! "${command.cmd}" doesn't seem to be installed.`));
      }
      console.time("install");
      const cmd = spawn(quoteIfNecessary(command.cmd), command.args, {shell: true, stdio: 'inherit', cwd: command.cwd || process.cwd()});
      cmd.on('close', code => {
        console.timeEnd("install");
        if (code !== 0) {
          return reject(new Error(`"${command.cmd}" exited with non-zero code ${code}`));
        }
        resolve();
      });
    });
  });
};*/
