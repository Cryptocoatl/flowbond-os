-- vpa_0043 · Masterclass, paso 1: el valor del enum.
-- Va SOLO en su propia migración porque Postgres no deja usar un valor de enum
-- recién agregado dentro de la misma transacción que lo agregó.
alter type vpa_offering_type add value if not exists 'masterclass';
