-- 010 · FlowGarden — persist the garden map layout
--
-- The survey lets the gardener drag each zone into its real position, on the
-- explicit promise that the corrected arrangement is what gets saved. It wasn't:
-- flowgarden_zones had nowhere to put it, so the layout was discarded the moment
-- the survey was applied. These two columns are that promise made true.
--
-- 0–100 on each axis, matching the sketch grid: x left→right, y near→far from
-- where the gardener stands. Deliberately NOT metres — it is a hand-placed
-- arrangement, not a survey measurement, and storing it in real units would
-- imply a precision that isn't there.

alter table public.flowgarden_zones
  add column if not exists map_x smallint,
  add column if not exists map_y smallint;

comment on column public.flowgarden_zones.map_x is
  'Hand-placed position on the garden sketch, 0-100 left to right. Not a measurement.';
comment on column public.flowgarden_zones.map_y is
  'Hand-placed position on the garden sketch, 0-100 near to far. Not a measurement.';

alter table public.flowgarden_zones
  drop constraint if exists flowgarden_zones_map_bounds;
alter table public.flowgarden_zones
  add constraint flowgarden_zones_map_bounds
  check (
    (map_x is null or (map_x >= 0 and map_x <= 100))
    and (map_y is null or (map_y >= 0 and map_y <= 100))
  );
