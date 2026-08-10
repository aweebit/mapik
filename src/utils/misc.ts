export const getOwnKeys = (input: unknown) => [
  ...Object.getOwnPropertyNames(input),
  ...Object.getOwnPropertySymbols(input),
];
