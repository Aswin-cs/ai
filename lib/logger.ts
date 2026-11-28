const isProd = process.env.NODE_ENV === "production";

export const logger = {
  info(message: string, ...args: unknown[]) {
    if (!isProd) {
      console.info(message, ...args);
    }
  },
  warn(message: string, ...args: unknown[]) {
    if (!isProd) {
      console.warn(message, ...args);
    }
  },
  error(message: string, ...args: unknown[]) {
    console.error(message, ...args);
  },
};
