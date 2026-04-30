// Vitest stub for the `server-only` package. The real package throws on
// import to enforce that a module is never bundled into a Client Component.
// Tests bypass that guard by aliasing the import to this no-op.
export {};
