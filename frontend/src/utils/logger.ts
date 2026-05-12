const isProd = import.meta.env.PROD;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger = {
  log: isProd ? noop : console.log.bind(console),
  warn: isProd ? noop : console.warn.bind(console),
  error: (...args: unknown[]) => console.error(...args),
};
