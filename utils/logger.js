"use strict";

const { createLogger, format, transports } = require("winston");

const level = process.env.LOG_LEVEL || "info";

const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(({ timestamp, level: lvl, message, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${lvl}] ${message}${metaString}`;
  })
);

const logger = createLogger({
  level,
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
  ],
});

module.exports = logger;
