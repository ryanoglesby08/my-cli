#!/usr/bin/env node

const { exec, execSync, spawn } = require('child_process');
const { resolve } = require('path');

const program = require('commander');
const emoji = require('node-emoji');

const e = emoji.get;

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
        `${e('lower_left_crayon')}  Code highlighted and in your clipboard!`
      );
      console.log(
        `${e(
          'point_right'
        )} I recommend you copy code snippets out of Visual Studio Code for better highlighting though. ${e(
          'point_left'
        )}`
      );
    });
  });

program
  .command('serve <dir>')
  .description('Serve the contents of a directory')
  .action(directory => {
    spawn(resolve(__dirname, 'node_modules/.bin/http-server'), [directory], {
      stdio: 'inherit',
    });
  });

program
  .command('backup')
  .description('Backup important files to an external hard drive')
  .action(() => {
    exec('ls /Volumes | grep RhinoDrive', (error, stdout) => {
      if (!stdout) {
        console.error(
          `${e('minidisc')} Connect the external hard drive and try again.`
        );
        return;
      }

      const sources = [
        `${process.env.HOME}/Projects`,
        `${process.env.HOME}/Documents`,
      ];
      const dest = '/Volumes/RhinoDrive/Backup/';

      sources.forEach(source => {
        const sync = spawn(
          'rsync',
          [
            '--archive',
            '--verbose',
            '--delete',
            '--delete-excluded',
            '--exclude-from=backup-excludes',
            source,
            dest,
          ],
          {
            stdio: 'inherit',
          }
        );

        sync.on('close', code => {
          if (code === 0) {
            console.log(`${e('white_check_mark')} ${source} copied to ${dest}`);
          } else {
            console.error(
              `${e(
                'skull_and_crossbones'
              )} Error: ${source} was not copied to ${dest}`
            );
          }

          console.log(`rsync exited with code ${code}`);
        });
      });
    });
  });

program.parse(process.argv);
