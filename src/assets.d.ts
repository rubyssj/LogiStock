/**
 * `assets.d.ts`
 *
 * TypeScript por defecto no sabe qué tipo devolver cuando importás archivos
 * estáticos (por ejemplo `import logo from "./logo.png"`). En apps con Vite,
 * el bundler transforma esos imports en una URL (string) al asset compilado.
 *
 * Estas declaraciones le dicen a TypeScript: "si importan *.png/*.jpg/*.svg,
 * tratá el resultado como `string`", evitando errores del tipo:
 * "Cannot find module '...png' or its corresponding type declarations."
 */

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

