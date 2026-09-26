export const STAGES = Object.freeze([
  {
    number: 1,
    name: 'Warm Up',
    unlockAt: 0,
    weights: Object.freeze({ walker: 8 }),
  },
  {
    number: 2,
    name: 'Gremlin Trouble',
    unlockAt: 12,
    weights: Object.freeze({ walker: 6, jumper: 3 }),
  },
  {
    number: 3,
    name: 'Llama Skies',
    unlockAt: 28,
    weights: Object.freeze({ walker: 5, jumper: 3, hoverbat: 2 }),
  },
  {
    number: 4,
    name: 'Milo Mayhem',
    unlockAt: 48,
    weights: Object.freeze({ walker: 4, jumper: 3, hoverbat: 3, bullrush: 1 }),
  },
  {
    number: 5,
    name: 'Chaos Run',
    unlockAt: 72,
    weights: Object.freeze({ walker: 4, jumper: 3, hoverbat: 3, bullrush: 2 }),
  },
  {
    number: 6,
    name: 'Full Send',
    unlockAt: 105,
    weights: Object.freeze({ walker: 3, jumper: 3, hoverbat: 4, bullrush: 3 }),
  },
]);

export function getStageForSpawnCount(totalSpawns) {
  let stage = STAGES[0];
  for (const candidate of STAGES) {
    if (totalSpawns >= candidate.unlockAt) stage = candidate;
    else break;
  }
  return stage;
}

export function getFirstStageForEnemy(type) {
  return STAGES.find((stage) => Object.hasOwn(stage.weights, type)) ?? STAGES[0];
}

export function getNewEnemyTypesForStage(stageNumber) {
  const index = STAGES.findIndex((stage) => stage.number === stageNumber);
  if (index < 0) return [];

  const current = Object.keys(STAGES[index].weights);
  const previous = index > 0 ? Object.keys(STAGES[index - 1].weights) : [];
  return current.filter((type) => !previous.includes(type));
}
