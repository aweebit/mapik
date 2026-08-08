export type IdentityMap<K extends PropertyKey> = { [P in K]: P } & {};

export const identityMap = <const Ks extends readonly PropertyKey[]>(
  keys: Ks,
) => {
  return Object.fromEntries(keys.map((key) => [key, key])) as IdentityMap<
    (typeof keys)[number]
  >;
};
