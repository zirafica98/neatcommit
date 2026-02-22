declare module 'js-yaml' {
  export function load(str: string, options?: object): unknown;
  export function dump(obj: unknown, options?: object): string;
}
