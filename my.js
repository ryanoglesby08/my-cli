#!/usr/bin/env node

const { exec, execSync, spawn } = require('child_process');
const program = require('commander');
const emoji = require('node-emoji');

const withIO = process => {
  process.stdout.on('data', data => {
    console.log(String(data));
  });

  process.stderr.on('data', data => {
    console.error(String(data));
  });

  return process;
};

program
  .command('highlight <syntax>')
  .description('Apply syntax highlighting to a copied code snippet')
  .action(syntax => {
    exec('which highlight', error => {
      if (error) {
        console.error(
          "You don't seem to have `highlight` installed. Install it with `brew install highlight` then try again."
        );
        return;
      }

      execSync(
        `pbpaste | highlight -O rtf --syntax=${syntax} --style=github --font-size=24 --font=Inconsolata | pbcopy`
      );

      console.log(
        `${emoji.get(
          'lower_left_crayon'
        )}  Code highlighted and in your clipboard!`
      );
      console.log(
        `${emoji.get(
          'point_right'
        )} I recommend you copy code snippets out of Visual Studio Code for better highlighting though. ${emoji.get(
          'point_left'
        )}`
      );
    });
  });

program
  .command('serve <dir>')
  .description('serve the contents of a directory')
  .option('-p, --port', 'port')
  .action((directory, command) => {
    const port = command.port || 8080;

    const httpServer = withIO(
      spawn('./node_modules/.bin/http-server', [directory, '-p', port])
    );

    httpServer.on('close', code => {
      console.log(`HTTP server exited with code ${code}`);
    });
  });

program
  .command('backup')
  .description('backup important files to an external hard drive')
  .action(() => {
    exec('ls /Volumes | grep RhinoDrive', (error, stdout, stderr) => {
      if (!stdout) {
        console.error('Connect the external hard drive and try again.');
        return;
      }

      const sources = [
        `${process.env.HOME}/Projects`,
        `${process.env.HOME}/Documents`,
      ];
      const dest = '/Volumes/RhinoDrive/Backup/';

      sources.forEach(source => {
        const sync = withIO(
          spawn('rsync', [
            '--archive',
            '--verbose',
            '--delete',
            '--delete-excluded',
            '--exclude-from=backup-excludes',
            source,
            dest,
          ])
        );

        sync.on('close', code => {
          if (code === 0) {
            console.log(`${source} copied to ${dest}`);
          } else {
            console.error(`Error: ${source} was not copied to ${dest}`);
          }

          console.log(`rsync exited with code ${code}`);
        });
      });
    });
  });

program.parse(process.argv);
