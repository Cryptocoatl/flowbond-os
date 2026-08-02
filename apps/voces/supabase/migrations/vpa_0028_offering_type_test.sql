-- vpa_0028 — Nueva categoría de producto: "Test"
-- Punto 5 del pedido de Mónica (2026-07-31): el Test de Temperamentos no es libro
-- ni eBook. Se agrega como tipo propio para ella y para cualquier otra voz.
-- Va SOLA en su migración: Postgres no deja USAR un valor de enum en la misma
-- transacción en que se agrega.

alter type vpa_offering_type add value if not exists 'test';
