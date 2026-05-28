DELETE FROM public.quiz a USING public.quiz b
WHERE a.phase_number = 19 AND b.phase_number = 19
  AND a.level_number = b.level_number
  AND a.mode = b.mode
  AND a.id > b.id;