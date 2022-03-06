import { dynamic } from './utils';

const chalk = dynamic('next/dist/compiled/chalk');

const prefixes = {
  wait: `${chalk.cyan('wait')}  -`,
  error: `${chalk.red('error')} -`,
  warn: `${chalk.yellow('warn')}  -`,
  ready: `${chalk.green('ready')} -`,
  info: `${chalk.cyan('info')}  -`,
  event: `${chalk.magenta('event')} -`
};

export const log = {
  wait(message: string) {
    console.log(prefixes.wait, message);
  },
  error(message: string) {
    console.error(prefixes.error, message);
  },
  warn(message: string) {
    console.warn(prefixes.warn, message);
  },
  ready(message: string) {
    console.log(prefixes.ready, message);
  },
  info(message: string) {
    console.info(prefixes.info, message);
  },
  event(message: string) {
    console.log(prefixes.event, message);
  }
};
