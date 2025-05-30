import pino from "pino";

const logLevel = "info";

export const logger = pino({
  level: logLevel,
});

export const createLogger = (context: string) => {
  return logger.child({ context });
};
