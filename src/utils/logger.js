const { createLogger, format, transports } = require('winston');

const customFormat = format.printf(({ timestamp, level, message }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

const logger = createLogger({
  level: 'info',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
  },
  format: format.combine(
    format.timestamp(),
    customFormat
  ),
  transports: [
    new transports.Console()
  ]
});

module.exports = logger;
