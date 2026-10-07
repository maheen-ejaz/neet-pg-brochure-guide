/// <reference types="vite/client" />

declare module "virtual:brochures" {
  const entries: { key: string; raw: unknown }[];
  export default entries;
}

declare module "virtual:schedules" {
  const entries: { key: string; raw: unknown }[];
  export default entries;
}
