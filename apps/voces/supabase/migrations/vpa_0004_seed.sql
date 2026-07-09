-- =====================================================================
-- VOCES PARA EL ALMA — Migracion 0004 — seed (contenido aprobado del index.html)
-- Idempotente: cada bloque solo siembra si la tabla esta vacia.
-- photo_url / cover_url / avatar_url guardan el TOKEN de Unsplash (photo-xxxx);
-- el front lo envuelve con el helper PHOTO().
-- =====================================================================

-- ---------- CATEGORIES ----------
insert into app_vpa_categories (slug, icon, name_es, name_en, desc_es, desc_en, sort_order, status)
select * from (values
  ('neuro','<path d="M12 4a4 4 0 0 0-4 4 3 3 0 0 0-1 5.8V16a3 3 0 0 0 6 0V4Z"/><path d="M12 4a4 4 0 0 1 4 4 3 3 0 0 1 1 5.8V16a3 3 0 0 1-6 0"/>','Neurociencias y Mente','Neuroscience & Mind','Comprende tu cerebro para transformar tu vida.','Understand your brain to transform your life.',1,'published'::vpa_pub_status),
  ('emocional','<path d="M12 22s-8-4.5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-8 11-8 11Z"/>','Inteligencia Emocional','Emotional Intelligence','Reconoce, regula y habita tus emociones.','Recognize, regulate and inhabit your emotions.',2,'published'),
  ('integral','<path d="M12 2v6m0 8v6M2 12h6m8 0h6"/><circle cx="12" cy="12" r="4"/>','Bienestar y Salud Integral','Integral Wellbeing & Health','Cuerpo, mente y energia en equilibrio.','Body, mind and energy in balance.',3,'published'),
  ('filosofias','<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>','Filosofias y Tradiciones','Philosophies & Traditions','Mindfulness y sabiduria aplicada, sin afiliacion religiosa.','Mindfulness and applied wisdom, with no religious affiliation.',4,'published'),
  ('liderazgo','<path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6Z"/>','Liderazgo y Desarrollo','Leadership & Development','Crece como persona y como profesional.','Grow as a person and as a professional.',5,'published'),
  ('sanacion','<path d="M12 21s-7-4-9-9a5 5 0 0 1 9-2 5 5 0 0 1 9 2c-2 5-9 9-9 9Z"/><path d="m9 11 2 2 4-4"/>','Sanacion de Heridas','Healing Emotional Wounds','Libera el peso del pasado y sana de raiz.','Release the weight of the past and heal at the root.',6,'published'),
  ('familia','<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2.5 1.5-4.5 4-4.5"/>','Familia y Relaciones','Family & Relationships','Construye vinculos sanos y duraderos.','Build healthy, lasting bonds.',7,'published'),
  ('proposito','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 3v3m0 12v3m9-9h-3M6 12H3"/>','Proposito y Proyecto de Vida','Purpose & Life Project','Encuentra tu direccion y dale sentido a tu camino.','Find your direction and give meaning to your path.',8,'published')
) as v(slug,icon,name_es,name_en,desc_es,desc_en,sort_order,status)
where not exists (select 1 from app_vpa_categories);

-- ---------- SPECIALISTS (contacto = placeholder de plataforma hasta que cada uno lo edite) ----------
insert into app_vpa_specialists
  (category_id, name, role_es, role_en, bio_es, bio_en, focus_es, focus_en, certs_es, certs_en,
   photo_url, langs, modalities, available_now, contact_email, contact_phone, contact_web, status, sort_order)
select c.id, x.name, x.role_es, x.role_en, x.bio_es, x.bio_en, x.focus_es, x.focus_en, x.certs_es, x.certs_en,
       x.photo_url, x.langs, x.modalities, x.available_now,
       'contacto@vocesparaelalma.com','+52 55 0000 0000','https://vocesparaelalma.com','published'::vpa_spec_status, x.sort_order
from (values
  ('neuro','Dra. Mariana Solis','Neuropsicologa clinica','Clinical neuropsychologist',
    'Une neurociencia y compasion para ayudarte a reentrenar patrones mentales que ya no te sirven.',
    'Blends neuroscience and compassion to help you retrain mental patterns that no longer serve you.',
    array['Ansiedad','Habitos','Neuroplasticidad'], array['Anxiety','Habits','Neuroplasticity'],
    'Doctorado en Neurociencia Cognitiva, UNAM - Certificacion en TCC','PhD in Cognitive Neuroscience, UNAM - CBT Certified',
    'photo-1559839734-2b71ea197ec2', array['es','en'], array['online','hibrido']::vpa_modality[], true, 1),
  ('emocional','Lucia Fernandez','Coach en inteligencia emocional','Emotional intelligence coach',
    'Te acompana a nombrar lo que sientes y a convertir la emocion en informacion, no en obstaculo.',
    'Guides you to name what you feel and turn emotion into information, not an obstacle.',
    array['Autoconocimiento','Regulacion','Comunicacion'], array['Self-awareness','Regulation','Communication'],
    'Certificacion internacional ICF - Especialista en gestion emocional','ICF International Certification - Emotional management specialist',
    'photo-1573497019940-1c28c88b4f3e', array['es','en'], array['presencial','online']::vpa_modality[], true, 2),
  ('integral','Tomas Aguilar','Terapeuta de salud integral','Integral health therapist',
    'Integra movimiento, respiracion y nutricion consciente para devolverte energia y claridad.',
    'Integrates movement, breath and conscious nutrition to restore your energy and clarity.',
    array['Respiracion','Sueno','Energia'], array['Breathwork','Sleep','Energy'],
    'Certificacion en Medicina Integrativa - Instructor de respiracion','Integrative Medicine Certification - Breathwork instructor',
    'photo-1594824476967-48c8b964273f', array['es'], array['presencial','hibrido']::vpa_modality[], false, 3),
  ('filosofias','Ananda Reyes','Maestra de mindfulness','Mindfulness teacher',
    'Traduce la sabiduria contemplativa a herramientas practicas para la vida moderna, sin dogmas.',
    'Translates contemplative wisdom into practical tools for modern life, free of dogma.',
    array['Meditacion','Atencion plena','Calma'], array['Meditation','Mindfulness','Calm'],
    'Formacion MBSR - 12 anos de practica contemplativa','MBSR Training - 12 years of contemplative practice',
    'photo-1545205597-3d9d02c29597', array['es','en'], array['online']::vpa_modality[], true, 4),
  ('liderazgo','Ricardo Mendez','Coach de liderazgo consciente','Conscious leadership coach',
    'Acompana a lideres a crecer sin perderse: claridad, proposito y decisiones alineadas.',
    'Helps leaders grow without losing themselves: clarity, purpose and aligned decisions.',
    array['Proposito','Equipos','Decisiones'], array['Purpose','Teams','Decisions'],
    'MBA - Executive Coach certificado - 15 anos acompanando lideres','MBA - Certified Executive Coach - 15 years coaching leaders',
    'photo-1560250097-0b93528c311a', array['es','en'], array['online','hibrido']::vpa_modality[], true, 5),
  ('sanacion','Valentina Cruz','Terapeuta en sanacion emocional','Emotional healing therapist',
    'Crea un espacio seguro para soltar el peso del pasado y reescribir tu historia desde la raiz.',
    'Creates a safe space to release the weight of the past and rewrite your story from its roots.',
    array['Duelo','Trauma','Autoestima'], array['Grief','Trauma','Self-esteem'],
    'Psicologia clinica - Especialidad en trauma y EMDR','Clinical Psychology - Trauma & EMDR specialty',
    'photo-1571019613454-1cb2f99b2d8b', array['es'], array['presencial','online']::vpa_modality[], false, 6),
  ('familia','Sofia Herrera','Terapeuta familiar y de pareja','Family & couples therapist',
    'Ayuda a familias y parejas a transformar el conflicto en comprension y vinculos mas fuertes.',
    'Helps families and couples turn conflict into understanding and stronger bonds.',
    array['Pareja','Crianza','Comunicacion'], array['Couples','Parenting','Communication'],
    'Maestria en Terapia Familiar Sistemica - Mediadora certificada','MA in Systemic Family Therapy - Certified mediator',
    'photo-1607990281513-2c110a25bd8c', array['es','en'], array['online','presencial']::vpa_modality[], true, 7),
  ('proposito','Daniel Ortega','Mentor de proposito de vida','Life purpose mentor',
    'Te ayuda a conectar tus dones con una direccion clara para vivir con sentido y coherencia.',
    'Helps you connect your gifts to a clear direction so you can live with meaning and coherence.',
    array['Vocacion','Claridad','Transicion'], array['Vocation','Clarity','Transition'],
    'Coach de vida certificado - Diseno de vida (metodo Stanford)','Certified life coach - Designing Your Life (Stanford method)',
    'photo-1639149888905-fb39731f2e6c', array['es','en'], array['online','hibrido']::vpa_modality[], true, 8)
) as x(cat,name,role_es,role_en,bio_es,bio_en,focus_es,focus_en,certs_es,certs_en,photo_url,langs,modalities,available_now,sort_order)
join app_vpa_categories c on c.slug = x.cat
where not exists (select 1 from app_vpa_specialists);

-- ---------- WORKSHOPS ----------
insert into app_vpa_workshops (specialist_id, title_es, title_en, starts_at, modality, price_cents, currency, status)
select s.id, x.title_es, x.title_en, x.starts_at, x.modality, x.price_cents, 'MXN', 'published'::vpa_pub_status
from (values
  ('Dra. Mariana Solis','Reentrena tu mente ansiosa','Retrain your anxious mind', timestamptz '2026-03-14 18:00-06','online'::vpa_modality, 68000),
  ('Ananda Reyes','Retiro de mindfulness de un dia','One-day mindfulness retreat', timestamptz '2026-03-22 09:00-06','presencial', 95000),
  ('Sofia Herrera','Comunicacion que sana en pareja','Communication that heals couples', timestamptz '2026-04-05 11:00-06','hibrido', 54000),
  ('Daniel Ortega','Disena tu proyecto de vida','Design your life project', timestamptz '2026-04-19 17:00-06','online', 72000)
) as x(by,title_es,title_en,starts_at,modality,price_cents)
join app_vpa_specialists s on s.name = x.by
where not exists (select 1 from app_vpa_workshops);

-- ---------- PRODUCTS (tienda de plataforma) ----------
insert into app_vpa_products (title_es, title_en, desc_es, desc_en, type_es, type_en, price_cents, currency, cover_url, status)
select * from (values
  ('El arte de soltar','The art of letting go','Una guia para liberar lo que ya cumplio su proposito en tu vida.','A guide to release what has already served its purpose in your life.','Ebook','Ebook',18900,'MXN','photo-1544716278-ca5e3f4abd8c','published'::vpa_pub_status),
  ('Meditaciones para dormir','Meditations for sleep','7 practicas guiadas para un descanso profundo y reparador.','7 guided practices for deep, restorative rest.','Audio','Audio',9900,'MXN','photo-1506126613408-eca07ce68773','published'),
  ('Fundamentos de la calma','Foundations of calm','Curso grabado de 6 modulos sobre regulacion emocional.','6-module recorded course on emotional regulation.','Curso','Course',129000,'MXN','photo-1499209974431-9dddcece7f88','published'),
  ('Habitos que nutren','Habits that nourish','Un sistema descargable para construir rutinas que sostienen tu bienestar.','A downloadable system to build routines that sustain your wellbeing.','Guia','Guide',14900,'MXN','photo-1490750967868-88aa4486c946','published'),
  ('Respira y vuelve a ti','Breathe and return to yourself','Coleccion de ejercicios de respiracion para momentos de tension.','A collection of breathing exercises for tense moments.','Audio','Audio',12900,'MXN','photo-1518531933037-91b2f5f229cc','published'),
  ('Cartas a mi yo del futuro','Letters to my future self','Un diario guiado para reconectar con tu proposito y tu direccion.','A guided journal to reconnect with your purpose and direction.','Ebook','Ebook',25900,'MXN','photo-1512820790803-83ca734da794','published')
) as v(title_es,title_en,desc_es,desc_en,type_es,type_en,price_cents,currency,cover_url,status)
where not exists (select 1 from app_vpa_products);

-- ---------- TESTIMONIALS ----------
insert into app_vpa_testimonials (quote_es, quote_en, author, loc_es, loc_en, avatar_url, sort_order, status)
select * from (values
  ('Encontre a la terapeuta indicada en minutos. Hoy duermo, respiro y vuelvo a sentir.','I found the right therapist in minutes. Today I sleep, I breathe, and I feel again.','Carolina M.','Ciudad de Mexico','Mexico City','photo-1438761681033-6461ffad8d80',1,'published'::vpa_pub_status),
  ('El taller de proposito me dio claridad despues de anos perdido. Una guia honesta.','The purpose workshop gave me clarity after years of feeling lost. An honest guide.','Andres P.','Bogota','Bogota','photo-1507003211169-0a1dd7228f2d',2,'published'),
  ('Como especialista, por fin tengo un lugar profesional y calido para que me encuentren.','As a specialist, I finally have a professional, warm place where people can find me.','Lucia F.','Especialista - Coach emocional','Specialist - Emotional coach','photo-1494790108377-be9c29b29330',3,'published')
) as v(quote_es,quote_en,author,loc_es,loc_en,avatar_url,sort_order,status)
where not exists (select 1 from app_vpa_testimonials);

-- ---------- SETTINGS (copy / redes editables; el front puede leerlos en Fase 2) ----------
insert into app_vpa_settings (key, value) values
  ('contact', jsonb_build_object('email','hola@vocesparaelalma.com','whatsapp','+52 55 0000 0000','attention_es','Mexico - LATAM - Comunidad global en linea','attention_en','Mexico - LATAM - Global online community')),
  ('socials', jsonb_build_object('instagram','','facebook','','youtube','','spotify',''))
on conflict (key) do nothing;
