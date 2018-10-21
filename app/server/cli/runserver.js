import {launchTask} from '@jonggrang/task';

import {startServer} from '../bootstrap';


export function defineCommand(program) {
  program
    .command('runserver <config>')
    .alias('rs')
    .description('run server using specied config file')
    .action((config) => {
      launchTask(startServer(config));
    });
}
