const consoleLog = console.log;
const consoleWarn = console.warn;
const consoleError = console.error;

function noConsole() {
  // This check will be disabled in the new gts
  /* eslint-disable @typescript-eslint/no-empty-function */
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

function restoreConsole() {
  console.error = consoleError;
  console.warn = consoleWarn;
  console.log = consoleLog;
}

export async function suppressConsole(func: Function) {
  noConsole();
  await func().catch((err: Error) => {
    restoreConsole();
    throw err;
  });
  restoreConsole();
}
