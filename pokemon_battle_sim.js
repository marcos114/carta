const fs = require('node:fs');
const path = require('node:path');
const {Dex, Teams, BattleStream, getPlayerStreams} = require('pokemon-showdown');
const {RandomPlayerAI} = require('pokemon-showdown/dist/sim/tools/random-player-ai');

const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = argv.indexOf(name);
  if (idx === -1 || idx + 1 >= argv.length) return fallback;
  return argv[idx + 1];
};

const maxPokemon = Number(getArg('--max-pokemon', '0')) || 0;
const outputFile = getArg('--output', 'pokemon_ranking.json');

function getNationalDexSpecies() {
  return Dex.species
    .all()
    .filter((s) => s.exists && s.num > 0 && !s.forme && !s.isNonstandard)
    .sort((a, b) => a.num - b.num);
}

function chooseNature(species) {
  if (species.baseStats.spe >= 100 && species.baseStats.atk >= species.baseStats.spa) return 'Jolly';
  if (species.baseStats.spe >= 100 && species.baseStats.spa > species.baseStats.atk) return 'Timid';
  if (species.baseStats.atk >= species.baseStats.spa) return 'Adamant';
  return 'Modest';
}

function scoreMove(move, speciesTypes) {
  if (!move.exists || move.category === 'Status') return -1;
  const stab = speciesTypes.includes(move.type) ? 1.5 : 1;
  const accuracy = typeof move.accuracy === 'number' ? move.accuracy / 100 : 1;
  const priorityBonus = move.priority > 0 ? 15 : 0;
  return move.basePower * stab * accuracy + priorityBonus;
}

function parseLearnMethod(method) {
  const levelMatch = method.match(/L(\d+)/i);
  if (!levelMatch) return null;
  return Number(levelMatch[1]);
}

function getLearnableMoves(species, maxLevel = 25) {
  const data = Dex.species.getLearnsetData(species.id);
  const learnset = data.learnset || {};

  const levelUpMoves = [];
  const anyMoves = [];

  for (const [moveId, methods] of Object.entries(learnset)) {
    const move = Dex.moves.get(moveId);
    if (!move.exists) continue;

    anyMoves.push(moveId);
    const hasLevelMethod = methods.some((m) => {
      const level = parseLearnMethod(m);
      return level !== null && level <= maxLevel;
    });

    if (hasLevelMethod) levelUpMoves.push(moveId);
  }

  return levelUpMoves.length ? levelUpMoves : anyMoves;
}

function pickMoves(species) {
  const candidates = new Set(getLearnableMoves(species, 25));
  const scored = [...candidates]
    .map((id) => Dex.moves.get(id))
    .filter((m) => m.exists)
    .sort((a, b) => scoreMove(b, species.types) - scoreMove(a, species.types));

  const selected = [];
  for (const move of scored) {
    if (selected.length === 4) break;
    if (!selected.includes(move.id)) selected.push(move.id);
  }

  if (selected.length === 0) selected.push('struggle');
  while (selected.length < 4) selected.push(selected[selected.length - 1]);
  return selected;
}

function pickAbility(species) {
  const abilities = Object.values(species.abilities || {}).filter(Boolean);
  return abilities[0] || 'No Ability';
}

function pickItem(species) {
  return 'Life Orb';
}

function buildSet(species) {
  return {
    name: species.name,
    species: species.name,
    gender: species.gender || '',
    item: pickItem(species),
    ability: pickAbility(species),
    moves: pickMoves(species),
    nature: chooseNature(species),
    evs: {hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
    level: 25,
    happiness: 255,
    shiny: false,
  };
}

async function runBattle(species1, species2) {
  const p1Set = buildSet(species1);
  const p2Set = buildSet(species2);

  const streams = getPlayerStreams(new BattleStream());
  const p1Team = Teams.pack([p1Set]);
  const p2Team = Teams.pack([p2Set]);

  const p1 = new RandomPlayerAI(streams.p1, {seed: [species1.num, species2.num, 1, 1], move: 1});
  const p2 = new RandomPlayerAI(streams.p2, {seed: [species2.num, species1.num, 2, 2], move: 1});

  void p1.start();
  void p2.start();

  streams.omniscient.write(`>start ${JSON.stringify({formatid: 'gen9customgame'})}
>player p1 ${JSON.stringify({name: species1.name, team: p1Team})}
>player p2 ${JSON.stringify({name: species2.name, team: p2Team})}`);

  for await (const chunk of streams.omniscient) {
    const lines = chunk.split('\\n').filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('|win|')) {
        const winner = line.slice('|win|'.length).trim();
        if (winner === species1.name) return 1;
        if (winner === species2.name) return 2;
        return 0;
      }
      if (line.startsWith('|tie|')) return 0;
    }
  }

  return 0;
}

async function main() {
  const speciesList = getNationalDexSpecies();
  const pool = maxPokemon > 0 ? speciesList.slice(0, maxPokemon) : speciesList;
  const ranking = new Map(pool.map((s) => [s.name, 0]));

  const totalBattles = pool.length * pool.length;
  let completed = 0;

  for (const p1 of pool) {
    for (const p2 of pool) {
      const result = await runBattle(p1, p2);
      if (result === 1) ranking.set(p1.name, ranking.get(p1.name) + 1);
      if (result === 2) ranking.set(p2.name, ranking.get(p2.name) + 1);
      completed += 1;
      if (completed % 100 === 0 || completed === totalBattles) {
        process.stdout.write(`Progreso: ${completed}/${totalBattles}\r`);
      }
    }
  }

  const leaderboard = [...ranking.entries()]
    .map(([pokemon, wins]) => ({pokemon, wins}))
    .sort((a, b) => b.wins - a.wins || a.pokemon.localeCompare(b.pokemon));

  const payload = {
    generatedAt: new Date().toISOString(),
    pokemonCount: pool.length,
    totalBattles,
    level: 25,
    rulesEngine: 'pokemon-showdown gen9customgame',
    leaderboard,
  };

  fs.writeFileSync(path.resolve(outputFile), JSON.stringify(payload, null, 2), 'utf8');
  process.stdout.write('\n');
  console.log(`Ranking guardado en: ${outputFile}`);
}

main().catch((error) => {
  console.error('Error en la simulación:', error);
  process.exit(1);
});
