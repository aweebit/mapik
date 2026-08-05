type Test<A, B extends A> = A extends unknown
  ? B extends unknown
    ? Test2<A, B>
    : never
  : never;

type TX = Test<0 | 1, 0 | 1>;

type Test2<A, B extends A> = [A, B] & {};
