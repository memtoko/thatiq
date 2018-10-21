import {defineCommand as runServerCommand} from './cli/runserver';


/**
 *
 * @param {Command} program
 */
export function defineCliProgram(program) {
  [runServerCommand].forEach(define => define(program));
}
