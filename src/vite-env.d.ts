/// <reference types="vite/client" />

declare module "virtual:brochures" {
  const entries: { key: string; raw: unknown }[];
  export default entries;
}
