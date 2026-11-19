import json

EVENTOS_DESTACADOS = [
    {
        "id": "torneo-cartas-oct26",
        "tipo": "torneo",
        "emoji": "⚔️",
        "titulo": "Torneo de Cartas: Batalla Final",
        "subtitulo": "Modo 1vs1 · Eliminación directa",
        "descripcion": "El torneo de cartas más épico del año. 8 participantes, 3 rondas y un único campeón. ¿Tienes lo que hace falta?",
        "fecha": "18/10/2026",
        "hora": "20:00 hrs",
        "estado": "proximo",
        "badge": "PRÓXIMO",
        "badgeColor": "#f5c518",
        "premio": "🏆 Juego de mesa a elección",
        "inscritos": 5,
        "maxInscritos": 8,
        "organizador": "BlackBot",
        "linkInscripcion": "#"
    },
    {
        "id": "quedada-mesa-nov26",
        "tipo": "quedada",
        "emoji": "🎲",
        "titulo": "Quedada Presencial: Noche de Mesa",
        "subtitulo": "Partida especial · Juegos variados",
        "descripcion": "Noche de juegos de mesa en casa de Lord Cachas. Traéis vuestros juegos favoritos y el BlackBot gestiona los turnos. Cupos muy limitados.",
        "fecha": "25/10/2026",
        "hora": "19:30 hrs",
        "estado": "proximo",
        "badge": "CUPOS LIMITADOS",
        "badgeColor": "#ec4899",
        "premio": "🍕 Pizza incluida",
        "inscritos": 7,
        "maxInscritos": 10,
        "organizador": "Lord Cachas",
        "linkInscripcion": "#"
    },
    {
        "id": "triviaverso-especial",
        "tipo": "duelo",
        "emoji": "🧠",
        "titulo": "Triviaverso Especial Halloween",
        "subtitulo": "Categoría temática · Terror & Cine",
        "descripcion": "Una edición especial del Triviaverso con temática de Halloween. Preguntas de cine de terror, juegos de miedo y más. El ganador obtiene el título de 'Maestro del Terror'.",
        "fecha": "31/10/2026",
        "hora": "22:00 hrs",
        "estado": "proximo",
        "badge": "🎃 HALLOWEEN",
        "badgeColor": "#ff6b35",
        "premio": "👑 Título especial de temporada",
        "inscritos": 0,
        "maxInscritos": 20,
        "organizador": "BlackBot",
        "linkInscripcion": "#"
    },
    {
        "id": "geekstories-oct",
        "tipo": "concurso",
        "emoji": "📖",
        "titulo": "Geekstories: El Relato del Mes",
        "subtitulo": "Concurso de escritura · Votación grupal",
        "descripcion": "Comparte tu historia más épica de mesa en 300 palabras o menos. El grupo vota el ganador. ¡La imaginación es el único límite!",
        "fecha": "28/10/2026",
        "hora": "Todo el día",
        "estado": "activo",
        "badge": "ACTIVO",
        "badgeColor": "#22c55e",
        "premio": "⭐ +50 PTS de bonus + mención especial",
        "inscritos": 3,
        "maxInscritos": 999,
        "organizador": "El Matagigantes",
        "linkInscripcion": "#"
    }
]

with open('amigosjugones_sin_bot/datos.json', encoding='utf-8') as f:
    d = json.load(f)

# Eliminar claves obsoletas
for key in ['faq_clubes', 'clubes', 'catalogo']:
    if key in d:
        del d[key]
        print(f'  ✅ Eliminada clave: {key}')

# Poblar eventos_destacados
d['eventos_destacados'] = EVENTOS_DESTACADOS
print(f'  ✅ eventos_destacados poblado con {len(EVENTOS_DESTACADOS)} eventos')

with open('amigosjugones_sin_bot/datos.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print('  ✅ datos.json guardado correctamente')
print('  Keys restantes:', list(d.keys()))
