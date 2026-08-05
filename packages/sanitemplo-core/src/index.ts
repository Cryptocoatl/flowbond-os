/**
 * SANI TEMPLO · core
 * Fuente única de verdad (config) + motor de precio (pricing).
 * Se importa igual desde el navegador, el Worker y (vía port plpgsql) el RPC.
 */
export * from "./config";
export * from "./pricing";
