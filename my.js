#!/usr/bin/env node

const { exec, execSync, spawn } = require('child_process');
const { resolve } = require('path');

const program = require('commander');
const emoji = require('node-emoji');
const csv = require('csvtojson');

const e = emoji.get;

// ***************** HIGHLIGHT *************************** //

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

// ********************** SERVE *************************** //

program
  .command('serve <dir>')
  .description('Serve the contents of a directory')
  .action(directory => {
    spawn(resolve(__dirname, 'node_modules/.bin/http-server'), [directory], {
      stdio: 'inherit',
    });
  });

// ********************** BACKUP *************************** //

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

// ********************** EXPENSES *************************** //

const parseFile = filePath =>
  new Promise(resolve => {
    const expenses = [];

    csv()
      .fromFile(filePath)
      .on('json', ({ Timestamp, Amount, Category }) => {
        expenses.push({
          timestamp: Timestamp,
          amount: Number(Amount),
          category: Category,
        });
      })
      .on('done', error => {
        resolve(expenses);
      });
  });

const flatten = arr => [].concat.apply([], arr);

const groupByMonth = expenses =>
  expenses.reduce((months, expense) => {
    const month = new Date(expense.timestamp).toLocaleDateString('en-US', {
      month: 'long',
    });

    const monthsExpenses = months.hasOwnProperty(month)
      ? months[month].concat(expense)
      : [expense];

    return Object.assign({}, months, { [month]: monthsExpenses });
  }, {});

const groups = {
  Hotel: 'travel',
  'Local Transportation': 'travel',
  'Business Meals': 'food',
  'Airfare & Upgrades': 'travel',
  Telephone: 'bills',
  'Benefits (Transit)': 'public transit',
  Other: 'other',
};
const getGroup = category => {
  if (!groups.hasOwnProperty(category)) {
    throw new Error(
      `Unidentified expense category: "${category}". Add it to the \`groups\` mapping and try again.`
    );
  }

  return groups[category];
};

const sumExpensesByGroup = expenses =>
  expenses.reduce((groups, expense) => {
    const group = getGroup(expense.category);

    const total = groups.hasOwnProperty(group)
      ? groups[group] + expense.amount
      : expense.amount;

    return Object.assign({}, groups, { [group]: total });
  }, {});

const sumAllExpenses = expenses =>
  expenses.reduce((sum, expense) => sum + expense.amount, 0);

program
  .command('expenses <files...>')
  .description('Calculate expense amounts by category')
  .action(files => {
    Promise.all(files.map(parseFile))
      .then(expensesList => {
        const expenses = flatten(expensesList);

        const expensesByMonth = groupByMonth(expenses);

        const totalsByMonth = Object.keys(expensesByMonth).reduce(
          (totalsByMonth, month) => {
            const monthsExpenses = expensesByMonth[month];

            const totalsByGroup = sumExpensesByGroup(monthsExpenses);

            return Object.assign({}, totalsByMonth, { [month]: totalsByGroup });
          },
          {}
        );

        console.log(JSON.stringify(totalsByMonth, null, 2));
        console.log(
          `\n${e('moneybag')} Total reimbursed: ${new Intl.NumberFormat(
            'en-US',
            {
              style: 'currency',
              currency: 'USD',
            }
          ).format(sumAllExpenses(expenses))}`
        );
      })
      .catch(error => {
        console.error(error);
      });
  });

program.parse(process.argv);
