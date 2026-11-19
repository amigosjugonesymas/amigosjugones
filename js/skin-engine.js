/**
 * AMIGOS JUGONES — SKIN ENGINE v2.0 (DISTINCTIVE VISUAL SUITE)
 * Motor de skins estacionales con transformación integral de identidad:
 * - Cursores personalizados SVG por tema (flecha con corazón, daga gótica, 8-bit arcade, etc.)
 * - Micro-ráfagas de partículas temáticas al hacer clic (corazones, murciélagos, copos, monedas)
 * - Capa ambiental continua de elementos flotantes dinámicos (#skin-ambient-layer)
 * - Mutación temática de los iconos y títulos de navegación en Sidebar y Topbar
 * - Resplandor, efectos hover y personalización de tarjetas
 * - Selector interactivo de prueba en vivo en 1 clic
 */

(function () {
  'use strict';

  const SKINS_URL = 'skins.json';
  const LS_OVERRIDE_KEY = 'aj_skin_override';

  // Catálogo maestro de skins
  const SKIN_CATALOG = {
    default:         { emoji: '🎲', label: 'Arcade Default',      banner: '',                                         colors: ['#7c3aed','#ec4899','#06b6d4','#080814'], dates: 'Todo el año' },
    halloween:       { emoji: '🎃', label: 'Halloween',            banner: '¡Trick or Roll! 🕷️',                      colors: ['#d35400','#6c3483','#00e676','#070409'], dates: '20 Oct – 1 Nov' },
    navidad:         { emoji: '🎄', label: 'Navidad',              banner: '¡Feliz Navidad, Amigos Jugones! 🎅',       colors: ['#c0392b','#27ae60','#f1c40f','#04100a'], dates: '15 Dic – 6 Ene' },
    'año_nuevo':     { emoji: '🎆', label: 'Año Nuevo',            banner: '¡Feliz Año Nuevo! 🥂',                    colors: ['#f1c40f','#e74c3c','#3498db','#050510'], dates: '31 Dic – 3 Ene' },
    san_valentin:    { emoji: '💝', label: 'San Valentín',         banner: '¡Por el amor al juego! 💕',               colors: ['#e91e63','#c62828','#ff80ab','#0d0508'], dates: '10 Feb – 15 Feb' },
    fiestas_patrias: { emoji: '⭐', label: 'Fiestas Patrias 🇨🇱', banner: '¡Viva Chile, Jugadores! 🇨🇱',            colors: ['#c0392b','#1a5276','#f1c40f','#08050d'], dates: '15 Sep – 19 Sep' },
    aniversario:     { emoji: '🏆', label: 'Aniversario',          banner: '¡Aniversario de Amigos Jugones! 🎉',       colors: ['#d4af37','#9b59b6','#1abc9c','#06050a'], dates: 'Fecha del grupo' },
    verano:          { emoji: '🌊', label: 'Verano',               banner: '¡A jugar este verano! 🌞',                colors: ['#00acc1','#ff7043','#aeea00','#030d14'], dates: '15 Dic – 15 Mar' },
    invierno:        { emoji: '❄️', label: 'Invierno',             banner: '¡Juegos de invierno! ⛄',                 colors: ['#1565c0','#00bcd4','#b3e5fc','#040810'], dates: '21 Jun – 21 Sep' },
    pascua:          { emoji: '🐣', label: 'Pascua',               banner: '¡Felices Pascuas, Amigos! 🌸',            colors: ['#7b1fa2','#388e3c','#ffd54f','#080d06'], dates: 'Semana Santa' },
    dia_del_juego:   { emoji: '🕹️', label: 'Día del Videojuego',  banner: '¡Happy World Gaming Day! 🎮',              colors: ['#00ff41','#ff00ff','#00ffff','#000000'], dates: '29 Jul' },
    dia_del_amigo:   { emoji: '👫', label: 'Día del Amigo',        banner: '¡Por la amistad y los dados! 🎲',         colors: ['#ff6f00','#ffb300','#ad1457','#0a0605'], dates: '20 Jul' },
    luditon:         { emoji: '❤️', label: 'Luditón — Teletón',    banner: '¡Jugamos con todo el corazón! ❤️🎲',  colors: ['#e50027','#ffd100','#38bdf8','#060c18'], dates: 'Evento Luditón' },
    ludaton:         { emoji: '❤️', label: 'Luditón — Teletón',    banner: '¡Jugamos con todo el corazón! ❤️🎲',  colors: ['#e50027','#ffd100','#38bdf8','#060c18'], dates: 'Evento Luditón' }
  };

  // Iconos y etiquetas temáticas para la navegación según cada skin
  const SKIN_NAV_ICONS = {
    halloween: {
      inicio: { icon: '🎃', label: 'Cuartel del Terror' },
      juegos: { icon: '🕹️', label: 'Arcade Maldito' },
      eventos: { icon: '🦇', label: 'Aquelarre Geek' },
      concursos: { icon: '⚰️', label: 'Duelos Siniestros' },
      juntas: { icon: '🕷️', label: 'Mesas Embrujadas' },
      torneos: { icon: '🧙‍♀️', label: 'Torneo del Más Allá' },
      calendario: { icon: '🕯️', label: 'Calendario Oculto' },
      radar: { icon: '🔮', label: 'Radar Espectral' },
      encuestas: { icon: '👁️', label: 'Votación Oscura' },
      miembros: { icon: '🧟', label: 'Monstruos Ilustres' },
      ranking: { icon: '🩸', label: 'Rankings Siniestros' },
      'sala-de-la-fama': { icon: '⚰️', label: 'Cripta de la Fama' },
      mercado: { icon: '🧪', label: 'Mercado Negro' },
      instagram: { icon: '📸', label: 'Sombras en IG' },
      documentos: { icon: '📜', label: 'Grimorios' },
      formularios: { icon: '🩸', label: 'Pactos & Forms' },
      realeza: { icon: '👑', label: 'Cónclave Vampírico' },
      'admin-skins': { icon: '🎨', label: 'Portal de Skins' }
    },
    navidad: {
      inicio: { icon: '🎅', label: 'Polo Norte' },
      juegos: { icon: '🎁', label: 'Arcade de Regalos' },
      eventos: { icon: '⭐', label: 'Nochebuena Festiva' },
      concursos: { icon: '🧝', label: 'Desafíos Élficos' },
      juntas: { icon: '🍪', label: 'Mesas Navideñas' },
      torneos: { icon: '🔔', label: 'Torneos de Invierno' },
      calendario: { icon: '📅', label: 'Calendario Adviento' },
      radar: { icon: '🦌', label: 'Radar Rodolfo' },
      encuestas: { icon: '💌', label: 'Carta a Santa' },
      miembros: { icon: '🌟', label: 'Duendes Ilustres' },
      ranking: { icon: '📊', label: 'Tabla de los Buenos' },
      'sala-de-la-fama': { icon: '🌟', label: 'Salón de la Estrella' },
      mercado: { icon: '🛍️', label: 'Mercado Navideño' },
      instagram: { icon: '📸', label: 'Postales Festivas' },
      documentos: { icon: '📜', label: 'Decretos del Polo' },
      formularios: { icon: '📝', label: 'Lista de Deseos' },
      realeza: { icon: '👑', label: 'Trono de Reyes' },
      'admin-skins': { icon: '🎨', label: 'Taller de Skins' }
    },
    san_valentin: {
      inicio: { icon: '💘', label: 'Nido Jugón' },
      juegos: { icon: '💌', label: 'Arcade Romántico' },
      eventos: { icon: '🌹', label: 'Citas & Eventos' },
      concursos: { icon: '💍', label: 'Duelos en Pareja' },
      juntas: { icon: '🍷', label: 'Juntas con Amor' },
      torneos: { icon: '💖', label: 'Copa de Corazones' },
      calendario: { icon: '📅', label: 'Agenda de Citas' },
      radar: { icon: '🎯', label: 'Flecha de Cupido' },
      encuestas: { icon: '🗳️', label: 'Test del Amor' },
      miembros: { icon: '🥰', label: 'Crushes del Mes' },
      ranking: { icon: '📊', label: 'Rankings del Amor' },
      'sala-de-la-fama': { icon: '💖', label: 'Muro de Leyendas' },
      mercado: { icon: '🛍️', label: 'Bazar de Regalos' },
      instagram: { icon: '📸', label: 'Fotos Enamoradas' },
      documentos: { icon: '📜', label: 'Cartas de Amor' },
      formularios: { icon: '📝', label: 'Confesionario' },
      realeza: { icon: '👑', label: 'Corte de Afrodita' },
      'admin-skins': { icon: '🎨', label: 'Estudio de Amor' }
    },
    año_nuevo: {
      inicio: { icon: '🍾', label: 'Gala de Medianoche' },
      juegos: { icon: '🎇', label: 'Arcade Neón 365' },
      eventos: { icon: '🥂', label: 'Fiestas de Gala' },
      concursos: { icon: '🥇', label: 'Copas de Oro' },
      juntas: { icon: '🎲', label: 'Partidas de Fin de Año' },
      torneos: { icon: '🎆', label: 'Gran Torneo Dorado' },
      calendario: { icon: '📅', label: 'Conteo Regresivo' },
      radar: { icon: '🎯', label: 'Radar Año Nuevo' },
      encuestas: { icon: '🗳️', label: 'Propósitos Jugones' },
      miembros: { icon: '⭐', label: 'Estrellas del Año' },
      ranking: { icon: '📊', label: 'Top 365 de Oro' },
      'sala-de-la-fama': { icon: '🥂', label: 'Gala de Campeones' },
      mercado: { icon: '🛍️', label: 'Feria de Estreno' },
      instagram: { icon: '📸', label: 'Brindis en IG' },
      documentos: { icon: '📜', label: 'Resoluciones' },
      formularios: { icon: '📝', label: 'Metas Anuales' },
      realeza: { icon: '👑', label: 'Brindis Real' },
      'admin-skins': { icon: '🎨', label: 'Panel Dorado' }
    },
    fiestas_patrias: {
      inicio: { icon: '🇨🇱', label: 'La Fonda Jugona' },
      juegos: { icon: '🥟', label: 'Rayuela & Arcade' },
      eventos: { icon: '🪁', label: 'Ramadas Oficiales' },
      concursos: { icon: '🥩', label: 'Torneo Dieciochero' },
      juntas: { icon: '🎸', label: 'Juntas Criollas' },
      torneos: { icon: '🤠', label: 'Rodeo en BGA' },
      calendario: { icon: '📅', label: 'Calendario Huaso' },
      radar: { icon: '🎯', label: 'Radar Guachaca' },
      encuestas: { icon: '🗳️', label: 'La Gran Consulta' },
      miembros: { icon: '⭐', label: 'Huasos Bravos' },
      ranking: { icon: '📊', label: 'Ránking Dieciochero' },
      'sala-de-la-fama': { icon: '🤠', label: 'Salón del Huaso Campeón' },
      mercado: { icon: '🛍️', label: 'Comercio Popular' },
      instagram: { icon: '📸', label: 'Zapateo en IG' },
      documentos: { icon: '📜', label: 'Reglamento Criollo' },
      formularios: { icon: '📝', label: 'Trámites Huasos' },
      realeza: { icon: '👑', label: 'Mesa Patronal' },
      'admin-skins': { icon: '🎨', label: 'Pintura Tricolor' }
    },
    dia_del_juego: {
      inicio: { icon: '👾', label: 'Spawn Point' },
      juegos: { icon: '🕹️', label: 'Main Arcade Room' },
      eventos: { icon: '🎮', label: 'LAN Party & Raids' },
      concursos: { icon: '🏆', label: 'Speedrun Contests' },
      juntas: { icon: '🎲', label: 'Tabletop Session' },
      torneos: { icon: '📺', label: 'Esports Championship' },
      calendario: { icon: '📅', label: 'Release Roadmap' },
      radar: { icon: '📡', label: 'Player Radar' },
      encuestas: { icon: '🗳️', label: 'GOTY Voting' },
      miembros: { icon: '⭐', label: 'Pro Gamers' },
      ranking: { icon: '📊', label: 'Leaderboard Global' },
      'sala-de-la-fama': { icon: '🏆', label: 'Hall of Fame Retro' },
      mercado: { icon: '🛍️', label: 'Loot & Gear Market' },
      instagram: { icon: '📸', label: 'Highlights & Clips' },
      documentos: { icon: '💾', label: 'Manuals & Lore' },
      formularios: { icon: '📝', label: 'Patch Submissions' },
      realeza: { icon: '👑', label: 'Game Masters' },
      'admin-skins': { icon: '🎨', label: 'Palette Config' }
    },
    verano: {
      inicio: { icon: '🏖️', label: 'Playa Jugona' },
      juegos: { icon: '🏄', label: 'Arcade Veraniego' },
      eventos: { icon: '🕶️', label: 'Sunset Parties' },
      concursos: { icon: '🏆', label: 'Copas de Verano' },
      juntas: { icon: '🍹', label: 'Tardes de Piscina' },
      torneos: { icon: '🌊', label: 'Torneo Splash' },
      calendario: { icon: '☀️', label: 'Verano 90 Días' },
      radar: { icon: '🎯', label: 'Radar de Vacaciones' },
      encuestas: { icon: '🗳️', label: 'Voto Playero' },
      miembros: { icon: '⭐', label: 'Reyes de la Ola' },
      ranking: { icon: '📊', label: 'Ránking de la Ola' },
      'sala-de-la-fama': { icon: '🏄', label: 'Paseo de la Fama' },
      mercado: { icon: '🛍️', label: 'Bazar Veraniego' },
      instagram: { icon: '📸', label: 'Fotos al Sol' },
      documentos: { icon: '📄', label: 'Guías de Verano' },
      formularios: { icon: '📝', label: 'Inscripciones' },
      realeza: { icon: '👑', label: 'Chiringuito Real' },
      'admin-skins': { icon: '🎨', label: 'Colores de Verano' }
    },
    invierno: {
      inicio: { icon: '🏔️', label: 'Refugio Invernal' },
      juegos: { icon: '🧤', label: 'Arcade Bajo Cero' },
      eventos: { icon: '🎿', label: 'Fogatas & Juegos' },
      concursos: { icon: '🏆', label: 'Duelos Gélidos' },
      juntas: { icon: '☕', label: 'Tardes de Chocolate' },
      torneos: { icon: '❄️', label: 'Copa Blizzard' },
      calendario: { icon: '📅', label: 'Temporada Fría' },
      radar: { icon: '🎯', label: 'Radar de Refugio' },
      encuestas: { icon: '🗳️', label: 'Voto del Hielo' },
      miembros: { icon: '⭐', label: 'Montañeses Ilustres' },
      ranking: { icon: '📊', label: 'Ránking de la Cumbre' },
      'sala-de-la-fama': { icon: '❄️', label: 'Pabellón de Hielo' },
      mercado: { icon: '🛍️', label: 'Mercado de Abrigo' },
      instagram: { icon: '📸', label: 'Fotos de Nieve' },
      documentos: { icon: '📄', label: 'Crónicas del Frío' },
      formularios: { icon: '📝', label: 'Formularios' },
      realeza: { icon: '👑', label: 'Trono de Hielo' },
      'admin-skins': { icon: '🎨', label: 'Estudio Polar' }
    },
    aniversario: {
      inicio: { icon: '🏆', label: 'Salón Aniversario' },
      juegos: { icon: '💎', label: 'Arcade Joya' },
      eventos: { icon: '🎉', label: 'Gala Cumpleaños' },
      concursos: { icon: '👑', label: 'Torneo Aniversario' },
      juntas: { icon: '🎂', label: 'Partida con Pastel' },
      torneos: { icon: '🥇', label: 'Copa Cumpleaños' },
      calendario: { icon: '📅', label: 'Semana de Fiesta' },
      radar: { icon: '🎯', label: 'Radar Aniversario' },
      encuestas: { icon: '🗳️', label: 'Mejores Momentos' },
      miembros: { icon: '🌟', label: 'Fundadores' },
      ranking: { icon: '📊', label: 'Ránking Histórico' },
      'sala-de-la-fama': { icon: '👑', label: 'Gran Salón de la Fama' },
      mercado: { icon: '🛍️', label: 'Mercado Colección' },
      instagram: { icon: '📸', label: 'Recuerdos Históricos' },
      documentos: { icon: '📜', label: 'Libro de Oro' },
      formularios: { icon: '📝', label: 'Felicitaciones' },
      realeza: { icon: '👑', label: 'Alta Corte' },
      'admin-skins': { icon: '🎨', label: 'Pincel Dorado' }
    },
    pascua: {
      inicio: { icon: '🐣', label: 'Pradera de Pascua' },
      juegos: { icon: '🐰', label: 'Arcade Conejo' },
      eventos: { icon: '🌸', label: 'Caza de Huevos' },
      concursos: { icon: '🥚', label: 'Torneo Dorado' },
      juntas: { icon: '🌷', label: 'Tardes de Chocolate' },
      torneos: { icon: '🏆', label: 'Copa de Pascua' },
      calendario: { icon: '📅', label: 'Semana Santa' },
      radar: { icon: '🎯', label: 'Radar Conejos' },
      encuestas: { icon: '🗳️', label: 'Consulta Pascual' },
      miembros: { icon: '⭐', label: 'Cazadores TOP' },
      ranking: { icon: '📊', label: 'Top Canasta Dorada' },
      'sala-de-la-fama': { icon: '🥚', label: 'Salón del Huevo de Oro' },
      mercado: { icon: '🛍️', label: 'Canasta de Pascua' },
      instagram: { icon: '📸', label: 'Huevos en IG' },
      documentos: { icon: '📄', label: 'Mapas de Caza' },
      formularios: { icon: '📝', label: 'Pistas' },
      realeza: { icon: '👑', label: 'Madriguera Real' },
      'admin-skins': { icon: '🎨', label: 'Pintura Pascua' }
    },
    dia_del_amigo: {
      inicio: { icon: '👫', label: 'Club de Amigos' },
      juegos: { icon: '🤝', label: 'Arcade Cooperativo' },
      eventos: { icon: '🍻', label: 'Noche de Amigos' },
      concursos: { icon: '🏆', label: 'Torneo de Amistad' },
      juntas: { icon: '🎲', label: 'Mesas Compartidas' },
      torneos: { icon: '⭐', label: 'Copa Fraternal' },
      calendario: { icon: '📅', label: 'Día del Amigo' },
      radar: { icon: '🎯', label: 'Radar de Panas' },
      encuestas: { icon: '🗳️', label: 'El Más Apañador' },
      miembros: { icon: '❤️', label: 'Mejores Amigos' },
      ranking: { icon: '📊', label: 'Ránking Fraternal' },
      'sala-de-la-fama': { icon: '🤝', label: 'Salón de la Hermandad' },
      mercado: { icon: '🛍️', label: 'Trueque & Regalos' },
      instagram: { icon: '📸', label: 'Fotos de Amistad' },
      documentos: { icon: '📜', label: 'Pacto de Amigos' },
      formularios: { icon: '📝', label: 'Dedicatorias' },
      realeza: { icon: '👑', label: 'Círculo Fraterno' },
      'admin-skins': { icon: '🎨', label: 'Paleta Fraternal' }
    },
    luditon: {
      inicio: { icon: '❤️', label: 'Cuartel del Amor' },
      juegos: { icon: '🎲', label: 'Amor por los Juegos' },
      eventos: { icon: '✨', label: 'Encuentros con Amor' },
      concursos: { icon: '⭐', label: 'Retos con Pasión' },
      juntas: { icon: '🤝', label: 'Mesas de Amistad' },
      torneos: { icon: '🏆', label: 'Torneos de Corazón' },
      calendario: { icon: '📅', label: 'Agenda del Abrazo' },
      radar: { icon: '🎯', label: 'Radar de Amigos' },
      encuestas: { icon: '🗳️', label: 'Voz del Corazón' },
      miembros: { icon: '⭐', label: 'Gente de Corazón' },
      mercado: { icon: '🛍️', label: 'Bazar de Amigos' },
      ranking: { icon: '📊', label: 'Rankings con Pasión' },
      'sala-de-la-fama': { icon: '❤️', label: 'Salón del Corazón' },
      instagram: { icon: '📸', label: 'Momentos & Sonrisas' },
      documentos: { icon: '📜', label: 'Guías & Reglas' },
      formularios: { icon: '📝', label: 'Registro de Jugador' },
      realeza: { icon: '👑', label: 'Salón del Afecto' },
      'admin-skins': { icon: '🎨', label: 'Paleta del Amor' }
    }
  };
  SKIN_NAV_ICONS.ludaton = SKIN_NAV_ICONS.luditon;

  // Asegurar alias bidireccionales entre 'sala-de-la-fama' y 'salon-de-la-fama'
  // y asegurar mapping temático para 'salon-de-honor'
  Object.values(SKIN_NAV_ICONS).forEach(dict => {
    if (dict['sala-de-la-fama'] && !dict['salon-de-la-fama']) {
      dict['salon-de-la-fama'] = dict['sala-de-la-fama'];
    } else if (dict['salon-de-la-fama'] && !dict['sala-de-la-fama']) {
      dict['sala-de-la-fama'] = dict['salon-de-la-fama'];
    }
    if (!dict['salon-de-honor']) {
      dict['salon-de-honor'] = { icon: '🎖️', label: 'Salón de Honor' };
    }
  });

  // Cabeceras temáticas para los grupos de categoría del Sidebar (Comunidad)
  const SKIN_CAT_GROUPS = {
    halloween: {
      competencia: { icon: '🧙‍♀️', title: 'Torneos del Más Allá' },
      agenda:      { icon: '🕯️', title: 'Agenda Oculta' },
      social:      { icon: '🔮', title: 'Aquelarre & Sombras' }
    },
    navidad: {
      competencia: { icon: '🔔', title: 'Torneos Festivos' },
      agenda:      { icon: '🎄', title: 'Agenda Navideña' },
      social:      { icon: '🌟', title: 'Duendes & Comunidad' }
    },
    san_valentin: {
      competencia: { icon: '💖', title: 'Copas de Enamorados' },
      agenda:      { icon: '🌹', title: 'Agenda de Citas' },
      social:      { icon: '🥰', title: 'Comunidad & Amor' }
    },
    'año_nuevo': {
      competencia: { icon: '🎆', title: 'Torneos de Oro' },
      agenda:      { icon: '🥂', title: 'Agenda de Gala' },
      social:      { icon: '🍾', title: 'Comunidad 365' }
    },
    fiestas_patrias: {
      competencia: { icon: '🤠', title: 'Torneos Criollos' },
      agenda:      { icon: '🪁', title: 'Agenda Dieciochera' },
      social:      { icon: '🇨🇱', title: 'Comunidad Huasa' }
    },
    dia_del_juego: {
      competencia: { icon: '📺', title: 'Esports & Raids' },
      agenda:      { icon: '🕹️', title: 'Roadmap & Sesiones' },
      social:      { icon: '👾', title: 'Guild & Gamers' }
    },
    verano: {
      competencia: { icon: '🌊', title: 'Torneos Splash' },
      agenda:      { icon: '☀️', title: 'Agenda de Verano' },
      social:      { icon: '🍹', title: 'Comunidad Playera' }
    },
    invierno: {
      competencia: { icon: '❄️', title: 'Copas Blizzard' },
      agenda:      { icon: '☕', title: 'Refugio & Agenda' },
      social:      { icon: '🧤', title: 'Comunidad del Hielo' }
    },
    aniversario: {
      competencia: { icon: '👑', title: 'Torneos de Corona' },
      agenda:      { icon: '🎉', title: 'Agenda Cumpleaños' },
      social:      { icon: '💎', title: 'Comunidad de Gala' }
    },
    pascua: {
      competencia: { icon: '🥚', title: 'Torneos de Pascua' },
      agenda:      { icon: '🌸', title: 'Agenda Primaveral' },
      social:      { icon: '🐰', title: 'Comunidad Conejos' }
    },
    dia_del_amigo: {
      competencia: { icon: '⭐', title: 'Torneos Fraternales' },
      agenda:      { icon: '🍻', title: 'Agenda con Panas' },
      social:      { icon: '🤝', title: 'Círculo de Amigos' }
    },
    luditon: {
      competencia: { icon: '❤️', title: 'Torneos con Amor' },
      agenda:      { icon: '📅', title: 'Agenda del Abrazo' },
      social:      { icon: '🤗', title: 'Comunidad & Afecto' }
    },
    ludaton: {
      competencia: { icon: '❤️', title: 'Torneos con Amor' },
      agenda:      { icon: '📅', title: 'Agenda del Abrazo' },
      social:      { icon: '🤗', title: 'Comunidad & Afecto' }
    },
    default: {
      competencia: { icon: '🏆', title: 'Torneos & Competencia' },
      agenda:      { icon: '📅', title: 'Actividades & Agenda' },
      social:      { icon: '👥', title: 'Comunidad & Social' }
    }
  };

  // Partículas disparadas al hacer clic en pantalla
  const CLICK_PARTICLES = {
    san_valentin:    ['💖', '💕', '❤️', '💘', '💗', '✨', '🌹'],
    halloween:       ['🦇', '🕷️', '🎃', '💀', '🕯️', '🔥', '🍬'],
    navidad:         ['❄️', '✨', '🎁', '⭐', '🎄', '🍪', '🔔'],
    'año_nuevo':     ['🎆', '✨', '🥂', '⭐', '🎉', '🍾', '🎇'],
    fiestas_patrias: ['🇨🇱', '🥟', '⭐', '🪁', '🍷', '🎸', '🥩'],
    dia_del_juego:   ['👾', '🪙', '🎮', '⚡', '🕹️', '+1UP', '👾'],
    verano:          ['☀️', '🌊', '🌴', '🕶️', '🍹', '🏄', '🥥'],
    invierno:        ['❄️', '⛄', '🌨️', '🧊', '☕', '🧤', '🎿'],
    pascua:          ['🐣', '🥚', '🌸', '🐰', '🌷', '🍫', '🐥'],
    aniversario:     ['🏆', '👑', '💎', '✨', '🎉', '🎂', '🥇'],
    dia_del_amigo:   ['🤝', '🎲', '🍻', '⭐', '🤗', '❤️', '🍕'],
    luditon:         ['❤️', '⭐', '🎲', '🎗️', '🏅', '✨', '❤️'],
    ludaton:         ['❤️', '⭐', '🎲', '🎗️', '🏅', '✨', '❤️'],
    default:         ['✦', '★', '▲', '✨', '🎲', '🪙']
  };

  const isLocalHost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname) || window.location.protocol === 'file:';

  let currentSkin = 'default';
  let serverDefaultSkin = 'default';
  let serverData = null;

  /* ── 1. APLICACIÓN INMEDIATA (anti-flicker FOUC) ── */
  const savedOverride = localStorage.getItem(LS_OVERRIDE_KEY);
  if (savedOverride && savedOverride !== 'null') {
    currentSkin = savedOverride;
    document.documentElement.setAttribute('data-skin', currentSkin);
  }

  /* ── 2. CARGA ASÍNCRONA DE SKINS.JSON ── */
  fetch(`${SKINS_URL}?v=${Date.now()}`)
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(data => {
      serverData = data;
      serverDefaultSkin = (data && data.active) ? data.active : 'default';

      var serverActivatedTime = (data && data.activatedAt) ? new Date(data.activatedAt).getTime() : 0;
      var userOverrideTime = parseInt(localStorage.getItem('aj_skin_override_time') || '0', 10);

      // Si el administrador actualizó la skin oficial global después del override local del usuario
      // o el override es heredado sin timestamp, prevalece la skin del servidor
      if (savedOverride && serverActivatedTime > userOverrideTime) {
        try {
          localStorage.removeItem(LS_OVERRIDE_KEY);
          localStorage.removeItem('aj_skin_override_time');
        } catch(e) {}
        currentSkin = serverDefaultSkin;
        document.documentElement.setAttribute('data-skin', currentSkin);
      } else if (!savedOverride) {
        currentSkin = serverDefaultSkin;
        document.documentElement.setAttribute('data-skin', currentSkin);
      }

      updateAllSkinBadges();
      applyThematicNav(currentSkin);
      renderAmbientEffects(currentSkin);

      // Banner estacional
      const meta = SKIN_CATALOG[currentSkin];
      if (meta && meta.banner && currentSkin !== 'default') {
        const lsDismissKey = `aj_skin_banner_dismissed_${currentSkin}`;
        if (!localStorage.getItem(lsDismissKey)) {
          const runBanner = () => _injectBanner(meta, lsDismissKey, currentSkin);
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runBanner);
          } else {
            runBanner();
          }
        }
      }
    });

  /* ── 3. OBJETO GLOBAL AJSkinEngine ── */
  window.AJSkinEngine = {
    catalog: SKIN_CATALOG,
    navCatalog: SKIN_NAV_ICONS,
    get current() { return currentSkin; },
    get serverDefault() { return serverDefaultSkin; },

    // Cambiar skin en vivo (1 clic instantáneo)
    setSkin: function (skinId, persistToServer) {
      if (!SKIN_CATALOG[skinId]) return;
      currentSkin = skinId;
      document.documentElement.setAttribute('data-skin', skinId);
      try {
        localStorage.setItem(LS_OVERRIDE_KEY, skinId);
        localStorage.setItem('aj_skin_override_time', Date.now().toString());
      } catch(e) {}

      updateAllSkinBadges();
      applyThematicNav(skinId);
      renderAmbientEffects(skinId);
      _showToast(`✨ Skin activado: ${SKIN_CATALOG[skinId].emoji} ${SKIN_CATALOG[skinId].label}`);

      _updateModalSelection(skinId);

      if (persistToServer) {
        this.saveToServer(skinId);
      }
    },

    saveToServer: async function (skinId) {
      const targetSkin = skinId || currentSkin;
      const meta = SKIN_CATALOG[targetSkin];
      const payload = {
        active: targetSkin,
        activatedAt: new Date().toISOString(),
        activatedBy: 'admin-local-tester',
        availableSkins: Object.keys(SKIN_CATALOG),
        skinMeta: Object.fromEntries(
          Object.entries(SKIN_CATALOG).map(([k, v]) => [k, { emoji: v.emoji, label: v.label, banner: v.banner }])
        )
      };

      try {
        const headers = (window.AJ_CONFIG && window.AJ_CONFIG.getHeaders) ? 
          window.AJ_CONFIG.getHeaders() : { 'Content-Type': 'application/json' };
        const saveUrl = (window.AJ_CONFIG && window.AJ_CONFIG.apiUrl) ?
          window.AJ_CONFIG.apiUrl('/save-json') : '/save-json';

        const res = await fetch(saveUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ file: 'skins.json', data: payload })
        });
        if (res.ok) {
          serverDefaultSkin = targetSkin;
          _showToast(`💾 ¡Guardado en skins.json como activo global!`);
        } else {
          _showToast(`⚠️ No se pudo escribir skins.json.`);
        }
      } catch (e) {
        _showToast(`⚠️ Servidor no disponible. Guardado en navegador local.`);
      }
    },

    resetDefault: function () {
      try {
        localStorage.removeItem(LS_OVERRIDE_KEY);
        localStorage.removeItem('aj_skin_override_time');
      } catch(e) {}
      currentSkin = serverDefaultSkin;
      document.documentElement.setAttribute('data-skin', currentSkin);
      updateAllSkinBadges();
      applyThematicNav(currentSkin);
      renderAmbientEffects(currentSkin);
      _updateModalSelection(currentSkin);
      _showToast(`🔄 Restablecido al skin oficial: ${SKIN_CATALOG[currentSkin]?.emoji || '🎲'} ${SKIN_CATALOG[currentSkin]?.label || 'Default'}`);
    },

    applyNav: function () {
      applyThematicNav(currentSkin);
    },

    getNavCustom: function (secId) {
      const catalog = SKIN_NAV_ICONS[currentSkin] || {};
      return catalog[secId] || null;
    },

    openModal: function () {
      _openModal();
    },

    closeModal: function () {
      _closeModal();
    }
  };

  /* ── 4. MUTACIÓN DINÁMICA DE ICONOS Y TEXTOS EN NAVEGACIÓN ── */
  function applyThematicNav(skinId) {
    const catalog = SKIN_NAV_ICONS[skinId] || {};

    // 1. Sidebar Nav Items
    document.querySelectorAll('#sidebar .nav-item[data-section]').forEach(item => {
      const secId = item.getAttribute('data-section');
      const custom = catalog[secId];
      const iconSpan = item.querySelector('.nav-icon');
      const labelSpan = item.querySelector('span:not(.nav-icon):not(.nav-badge)');

      if (custom) {
        if (iconSpan && custom.icon) iconSpan.textContent = custom.icon;
        if (labelSpan && custom.label) labelSpan.textContent = custom.label;
      } else if (typeof NAV_ITEMS !== 'undefined') {
        const def = NAV_ITEMS.find(n => n.id === secId);
        if (def) {
          if (iconSpan) iconSpan.textContent = def.icon;
          if (labelSpan) labelSpan.textContent = def.label;
        }
      }
    });

    // 2. Topbar Section Title
    const topbarTitle = document.getElementById('topbar-section-title');
    if (topbarTitle) {
      const currentPageId = (typeof getCurrentPageId === 'function') ? getCurrentPageId() : 'inicio';
      const custom = catalog[currentPageId];
      if (custom) {
        topbarTitle.textContent = `${custom.icon} ${custom.label}`;
      } else if (typeof NAV_ITEMS !== 'undefined') {
        const def = NAV_ITEMS.find(n => n.id === currentPageId);
        if (def) topbarTitle.textContent = `${def.icon} ${def.label}`;
      }
    }

    // 3. Subtítulo del Logo en el Sidebar
    const brandSub = document.querySelector('.sidebar-brand-text .brand-sub');
    if (brandSub) {
      const subtitles = {
        halloween: '🎃 Edición Halloween de Terror',
        navidad: '🎄 Especial de Navidad',
        san_valentin: '💝 Edición San Valentín',
        'año_nuevo': '🎆 Gala Año Nuevo 365',
        fiestas_patrias: '🇨🇱 ¡Viva Chile Jugones!',
        dia_del_juego: '🕹️ 100% Gamer Arcade',
        verano: '🌊 Verano Jugón',
        invierno: '❄️ Refugio Invernal',
        pascua: '🐣 Especial de Pascua',
        aniversario: '🏆 Gran Aniversario',
        dia_del_amigo: '👫 Especial Día del Amigo',
        luditon: '❤️ Jugamos de Corazón',
        ludaton: '❤️ Jugamos de Corazón',
        default: 'Comunidad Gamer'
      };
      brandSub.textContent = subtitles[skinId] || 'Comunidad Gamer';
    }

    // 4. Cabeceras de Categorías en el Sidebar (Comunidad)
    const defCats = SKIN_CAT_GROUPS.default;
    const skinCats = SKIN_CAT_GROUPS[skinId] || defCats;

    ['competencia', 'agenda', 'social'].forEach(catId => {
      const hdr = document.getElementById('catgroup-hdr-' + catId);
      if (!hdr) return;
      const data = skinCats[catId] || defCats[catId];
      const iconEl = hdr.querySelector('.cg-big-icon');
      const titleEl = hdr.querySelector('.cg-title');
      if (iconEl && data.icon) iconEl.textContent = data.icon;
      if (titleEl && data.title) titleEl.textContent = data.title;
    });

    // 5. Botón de Administración en el Footer del Sidebar
    const adminBtn = document.querySelector('.sidebar-admin-btn');
    if (adminBtn) {
      const realezaCustom = catalog['realeza'];
      const iconEl = adminBtn.querySelector('.sidebar-admin-icon');
      const labelEl = adminBtn.querySelector('.sidebar-admin-label');
      if (realezaCustom) {
        if (iconEl && realezaCustom.icon) iconEl.textContent = realezaCustom.icon;
        if (labelEl && realezaCustom.label) labelEl.textContent = realezaCustom.label;
      } else {
        if (iconEl) iconEl.textContent = '👑';
        if (labelEl) labelEl.textContent = 'Administración';
      }
    }

    // 6. Título en cabecera y loading de la Sala de la Fama si están presentes en el DOM
    const famaHeaderTitle = document.getElementById('sala-fama-header-title');
    const famaCustom = catalog['sala-de-la-fama'] || catalog['salon-de-la-fama'];
    if (famaHeaderTitle) {
      if (famaCustom) {
        famaHeaderTitle.textContent = `${famaCustom.icon} ${famaCustom.label}`;
      } else {
        famaHeaderTitle.textContent = '🏆 Sala de la Fama';
      }
    }
    const loadFamaIcon = document.getElementById('loading-fama-icon');
    const loadFamaTitle = document.getElementById('loading-fama-title');
    if (loadFamaIcon) loadFamaIcon.textContent = (famaCustom && famaCustom.icon) ? famaCustom.icon : '🏆';
    if (loadFamaTitle) loadFamaTitle.textContent = (famaCustom && famaCustom.label) ? famaCustom.label : 'Sala de la Fama';

    // 7. Sincronizar document.title cuando se está en la página de Sala de la Fama
    if (window.location.pathname.includes('sala-de-la-fama')) {
      const famaCustom = catalog['sala-de-la-fama'] || catalog['salon-de-la-fama'];
      if (famaCustom) {
        document.title = `${famaCustom.label} ${famaCustom.icon} — Amigos Jugones`;
      } else {
        document.title = 'Sala de la Fama 🏆 — Amigos Jugones';
      }
    }
  }

  /* ── 5. CAPA DE ELEMENTOS FLOTANTES AMBIENTALES ── */
  function renderAmbientEffects(skinId) {
    let layer = document.getElementById('skin-ambient-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'skin-ambient-layer';
      document.body.appendChild(layer);
    }
    layer.innerHTML = '';

    // Si es default, no inyectamos elementos flotantes
    if (skinId === 'default') return;

    const ambientTemplates = {
      san_valentin: {
        type: 'float-up',
        items: ['💖', '💕', '❤️', '💗', '💓', '💝', '🌹', '✨', '💘'],
        count: 14
      },
      halloween: {
        type: 'float-diagonal',
        items: ['🦇', '🦇', '🦇', '🎃', '🕷️', '👻', '🕯️'],
        count: 10
      },
      navidad: {
        type: 'float-down',
        items: ['❄️', '✨', '⭐', '❄️', '🎁', '🔔', '🎄'],
        count: 18
      },
      'año_nuevo': {
        type: 'float-down',
        items: ['✨', '🎉', '🥂', '🍾', '⭐', '🎆', '🎊'],
        count: 16
      },
      fiestas_patrias: {
        type: 'float-diagonal',
        items: ['🪁', '⭐', '🇨🇱', '🥟', '🍷', '🎸'],
        count: 10
      },
      dia_del_juego: {
        type: 'float-up',
        items: ['👾', '🕹️', '🪙', '⚡', '🎮', '▲', '■'],
        count: 12
      },
      verano: {
        type: 'float-up',
        items: ['☀️', '🫧', '🌊', '🌴', '🍹', '🕶️', '🫧'],
        count: 14
      },
      invierno: {
        type: 'float-down',
        items: ['❄️', '⛄', '🌨️', '🧊', '☕', '✨'],
        count: 16
      },
      pascua: {
        type: 'float-up',
        items: ['🐣', '🌸', '🥚', '🐰', '🌷', '✨'],
        count: 12
      },
      aniversario: {
        type: 'float-up',
        items: ['🏆', '👑', '💎', '✨', '🎉', '🎂'],
        count: 14
      },
      dia_del_amigo: {
        type: 'float-up',
        items: ['🤝', '🎲', '🍻', '⭐', '❤️', '🍕'],
        count: 12
      },
      luditon: {
        type: 'float-up',
        items: ['❤️', '⭐', '🎲', '🎗️', '🏅', '✨', '❤️'],
        count: 14
      },
      ludaton: {
        type: 'float-up',
        items: ['❤️', '⭐', '🎲', '🎗️', '🏅', '✨', '❤️'],
        count: 14
      }
    };

    const cfg = ambientTemplates[skinId];
    if (!cfg) return;

    for (let i = 0; i < cfg.count; i++) {
      const el = document.createElement('div');
      el.className = `skin-ambient-item skin-ambient--${cfg.type}`;
      el.textContent = cfg.items[i % cfg.items.length];

      // Randomizar posiciones, duraciones y delays para apariencia natural
      const left = Math.floor(Math.random() * 92) + 4; // 4% a 96%
      const dur = (Math.random() * 6 + 7).toFixed(1); // 7s a 13s
      const del = (Math.random() * 8).toFixed(1); // 0s a 8s
      const size = Math.floor(Math.random() * 16) + 18; // 18px a 34px
      const op = (Math.random() * 0.22 + 0.16).toFixed(2); // 0.16 a 0.38
      const drift = (Math.random() * 80 - 40).toFixed(0); // -40px a +40px
      const rot = (Math.random() * 60 - 30).toFixed(0);

      el.style.setProperty('--left', `${left}%`);
      el.style.setProperty('--dur', `${dur}s`);
      el.style.setProperty('--del', `-${del}s`);
      el.style.setProperty('--size', `${size}px`);
      el.style.setProperty('--op', op);
      el.style.setProperty('--drift', `${drift}px`);
      el.style.setProperty('--rot', `${rot}deg`);
      if (cfg.type === 'float-diagonal') {
        el.style.setProperty('--top', `${Math.floor(Math.random() * 70) + 10}%`);
      }

      layer.appendChild(el);
    }
  }

  /* ── 6. RÁFAGAS DE MICRO-PARTÍCULAS AL HACER CLIC ── */
  function setupClickBurst() {
    document.addEventListener('click', (e) => {
      // Evitar spawns excesivos dentro del modal si se hace clic muy rápido en botones
      const list = CLICK_PARTICLES[currentSkin] || CLICK_PARTICLES.default;
      const count = 5;

      for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'skin-click-particle';
        p.textContent = list[Math.floor(Math.random() * list.length)];

        // Dispersión radial hacia arriba
        const angle = (Math.random() * Math.PI) - (Math.PI * 0.9); // ángulo abanico hacia arriba
        const dist = Math.random() * 70 + 40;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 30; // elevación
        const rot = (Math.random() * 80 - 40).toFixed(0) + 'deg';
        const scale = (Math.random() * 0.5 + 0.9).toFixed(2);

        p.style.left = `${e.clientX}px`;
        p.style.top = `${e.clientY}px`;
        p.style.setProperty('--dx', `${dx.toFixed(0)}px`);
        p.style.setProperty('--dy', `${dy.toFixed(0)}px`);
        p.style.setProperty('--rot', rot);
        p.style.setProperty('--scale', scale);

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 750);
      }
    }, { capture: true, passive: true });
  }

  /* ── 7. ACTUALIZACIÓN DE CONTROLES EN PANTALLA ── */
  function updateAllSkinBadges() {
    const meta = SKIN_CATALOG[currentSkin] || SKIN_CATALOG.default;

    // FAB Flotante
    const fabEmoji = document.getElementById('skin-fab-emoji');
    const fabBadge = document.getElementById('skin-fab-badge');
    if (fabEmoji) fabEmoji.textContent = meta.emoji;
    if (fabBadge) fabBadge.textContent = meta.label;

    // Sidebar
    const sideEmoji = document.getElementById('skin-sidebar-emoji');
    const sideBadge = document.getElementById('skin-sidebar-badge');
    if (sideEmoji) sideEmoji.textContent = meta.emoji;
    if (sideBadge) sideBadge.textContent = `${meta.emoji} ${meta.label}`;

    // Topbar
    const topEmoji = document.getElementById('skin-topbar-emoji');
    if (topEmoji) topEmoji.textContent = meta.emoji;
  }

  function _injectFloatingButton() {
    if (document.getElementById('skin-tester-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'skin-tester-fab';
    fab.className = 'skin-tester-fab';
    fab.title = 'Haga clic para probar skins estacionales en tiempo real';
    fab.onclick = () => window.AJSkinEngine.openModal();

    const meta = SKIN_CATALOG[currentSkin] || SKIN_CATALOG.default;
    fab.innerHTML = `
      <span class="skin-tester-fab__emoji" id="skin-fab-emoji">${meta.emoji}</span>
      <span style="letter-spacing:0.2px;">Probar Skins</span>
      <span class="skin-tester-fab__badge" id="skin-fab-badge">${meta.label}</span>
    `;

    document.body.appendChild(fab);
  }

  /* ── 8. MODAL INTERACTIVO DE PRUEBA ── */
  function _openModal() {
    let overlay = document.getElementById('skin-tester-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'skin-tester-modal';
      overlay.className = 'skin-modal-overlay';
      overlay.onclick = (e) => {
        if (e.target === overlay) _closeModal();
      };
      document.body.appendChild(overlay);
    }

    const meta = SKIN_CATALOG[currentSkin] || SKIN_CATALOG.default;

    overlay.innerHTML = `
      <div class="skin-modal-card">
        <div class="skin-modal-header">
          <div class="skin-modal-title">
            <span style="font-size:1.4rem;">🎨</span>
            <div>
              <div style="line-height:1.2;">Probador de Skins Estacionales</div>
              <div style="font-size:0.75rem; color:var(--text-dim); font-weight:500;">
                Cambio integral en vivo: Iconos, cursores, partículas y ambientación
              </div>
            </div>
          </div>
          <button class="skin-modal-close" onclick="window.AJSkinEngine.closeModal()" title="Cerrar">✕</button>
        </div>

        <div class="skin-modal-body">
          <div class="skin-status-banner">
            <div class="skin-status-banner__left">
              <span id="skin-modal-current-emoji" style="font-size:1.8rem;">${meta.emoji}</span>
              <div>
                <div style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase; font-weight:700;">Tema visual activo:</div>
                <div id="skin-modal-current-name" style="font-weight:800; font-size:1.05rem; color:var(--primary-light);">${meta.label}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.72rem; padding:4px 10px; border-radius:12px; background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#34d399; font-weight:700;">
                ● Vista en Vivo (1-Clic)
              </span>
            </div>
          </div>

          <div class="skin-compact-grid" id="skin-modal-grid">
            ${Object.entries(SKIN_CATALOG).map(([id, s]) => {
              const isActive = (id === currentSkin);
              return `
                <div class="skin-compact-card ${isActive ? 'is-active' : ''}" data-skin-id="${id}" onclick="window.AJSkinEngine.setSkin('${id}')">
                  <div class="skin-compact-top">
                    <span class="skin-compact-emoji">${s.emoji}</span>
                    <span class="skin-compact-name">${s.label}</span>
                  </div>
                  <div class="skin-compact-dates">📅 ${s.dates}</div>
                  <div class="skin-compact-palette">
                    ${s.colors.map(c => `<span class="skin-palette-dot" style="background:${c};" title="${c}"></span>`).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="skin-modal-footer">
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button class="skin-btn-action skin-btn-save" onclick="window.AJSkinEngine.saveToServer()" title="Guardar en skins.json para que sea el predeterminado de la web">
              <span>💾</span> Guardar como Predeterminado Global
            </button>
            <button class="skin-btn-action skin-btn-revert" onclick="window.AJSkinEngine.resetDefault()" title="Restablecer al skin configurado en el servidor">
              <span>🔄</span> Revertir
            </button>
          </div>
          <div>
            <a href="admin-skins.html" class="skin-btn-action skin-btn-admin">
              <span>⚙️</span> Abrir Panel Admin Completo ↗
            </a>
          </div>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
  }

  function _closeModal() {
    const overlay = document.getElementById('skin-tester-modal');
    if (overlay) overlay.style.display = 'none';
  }

  function _updateModalSelection(skinId) {
    const meta = SKIN_CATALOG[skinId];
    if (!meta) return;

    const currentEmoji = document.getElementById('skin-modal-current-emoji');
    const currentName = document.getElementById('skin-modal-current-name');
    if (currentEmoji) currentEmoji.textContent = meta.emoji;
    if (currentName) currentName.textContent = meta.label;

    document.querySelectorAll('.skin-compact-card').forEach(card => {
      if (card.getAttribute('data-skin-id') === skinId) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });
  }

  /* ── 9. TOAST NOTIFICATION ── */
  let _toastTimer = null;
  function _showToast(text) {
    let toast = document.getElementById('skin-live-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'skin-live-toast';
      toast.className = 'skin-live-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.display = 'flex';

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 2800);
  }

  /* ── 10. BANNER ESTACIONAL EN CABECERA ── */
  function _injectBanner(meta, lsKey, skin) {
    if (document.getElementById('skin-banner')) return;
    if (skin === 'default') return;

    const banner = document.createElement('div');
    banner.id = 'skin-banner';
    banner.className = `skin-banner skin-banner--${skin}`;
    banner.innerHTML = `
      <span class="skin-banner__icon">${meta.emoji || '🎨'}</span>
      <span class="skin-banner__text">${meta.banner}</span>
      <button class="skin-banner__close" id="skin-banner-close" aria-label="Cerrar banner">✕</button>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    const closeBtn = document.getElementById('skin-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.classList.add('skin-banner--hiding');
        setTimeout(() => banner.remove(), 400);
        localStorage.setItem(lsKey, '1');
      });
    }

    setTimeout(() => {
      if (document.getElementById('skin-banner')) {
        banner.classList.add('skin-banner--hiding');
        setTimeout(() => banner.remove(), 400);
      }
    }, 8000);
  }

  /* ── 11. INICIALIZACIÓN TRAS CARGAR EL DOM ── */
  function onDOMLoaded() {
    updateAllSkinBadges();
    applyThematicNav(currentSkin);
    renderAmbientEffects(currentSkin);
    setupClickBurst();

    // NOTA: Probador visual de skins retirado de la interfaz pública.
    // La activación de skins se administra exclusivamente desde el Panel de Administración.
    // if (isLocalHost || localStorage.getItem('aj_skin_show_fab') === '1') {
    //   _injectFloatingButton();
    // }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDOMLoaded);
  } else {
    onDOMLoaded();
  }

})();
