declare module "vitest-axe/matchers" {
  export function toHaveNoViolations(received: unknown): {
    pass: boolean;
    message: () => string;
  };
}
