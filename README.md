# carta
carta online

## Simulador Pokémon todos contra todos

Se agregó el script `pokemon_battle_sim.js` para simular batallas **1 vs 1** con motor oficial de reglas de combate de Pokémon Showdown.

### Qué hace
- Toma la Pokédex Nacional (sin formas alternas) en orden numérico.
- Pone a todos los Pokémon a **nivel 25**.
- Usa IVs máximos y EVs máximos para priorizar las mejores estadísticas posibles.
- Selecciona movimientos legales del Pokémon (preferencia por movimientos por nivel hasta 25).
- Ejecuta todos los cruces pedidos: `01vs01`, `01vs02`, ..., `02vs01`, etc.
- Guarda victorias por Pokémon y genera un ranking final en JSON.

### Instalación
```bash
npm install
```

### Uso
```bash
node pokemon_battle_sim.js --output pokemon_ranking.json
```

Opciones útiles:
- `--max-pokemon N` limita la simulación a los primeros `N` Pokémon (ideal para pruebas rápidas).
- `--output archivo.json` define el archivo de salida.

Ejemplo de prueba rápida:
```bash
node pokemon_battle_sim.js --max-pokemon 10 --output ranking_top10.json
```
