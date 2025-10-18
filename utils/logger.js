"use strict";

const { createLogger, format, transports } = require("winston");

const level = process.env.LOG_LEVEL || "info";

const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({
    format: () => kstFormatter.format(new Date()),
  }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(({ timestamp, level: lvl, message, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp} KST] [${lvl}] ${message}${metaString}`;
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
