const scopeLabels = {
  scope1: 'Scope 1',
  scope2: 'Scope 2',
  scope3: 'Scope 3',
}

const horizonLabels = {
  near_term: 'Near-term',
  long_term: 'Long-term',
}

const horizonOrder = {
  near_term: 1,
  long_term: 2,
}

function interpolate(year, startYear, startValue, endYear, endValue) {
  if (year <= startYear) return startValue
  if (year >= endYear) return endValue
  const progress = (year - startYear) / (endYear - startYear)
  return startValue + (endValue - startValue) * progress
}

function clampReduction(value) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
}

function sumTargets(targets, key) {
  return targets.reduce((sum, target) => sum + (target[key] ?? 0), 0)
}

function makeLegacyScopeTargets(targetSettings) {
  const baseline = targetSettings.baselineEmissionsTco2e ?? 0
  const scope1Baseline = Math.round(baseline * 0.073)
  const scope2Baseline = Math.max(0, baseline - scope1Baseline)
  const nearTermTarget =
    targetSettings.targetEmissionsTco2e ?? calculateTargetEmissions(targetSettings)
  const scope1NearTarget = Math.round(scope1Baseline * (nearTermTarget / Math.max(1, baseline)))
  const scope2NearTarget = Math.max(0, nearTermTarget - scope1NearTarget)
  const longTermTarget = targetSettings.longTermTargetEmissionsTco2e ?? 0
  const scope1LongTarget = Math.round(scope1Baseline * (longTermTarget / Math.max(1, baseline)))
  const scope2LongTarget = Math.max(0, longTermTarget - scope1LongTarget)

  return [
    {
      id: 'scope1-2030',
      scope: 'scope1',
      horizon: 'near_term',
      baselineYear: targetSettings.baselineYear ?? 2023,
      baselineEmissionsTco2e: scope1Baseline,
      targetYear: targetSettings.targetYear ?? 2030,
      reductionPercent: targetSettings.reductionPercent ?? 50,
      targetEmissionsTco2e: scope1NearTarget,
      modeled: true,
    },
    {
      id: 'scope2-2030',
      scope: 'scope2',
      horizon: 'near_term',
      baselineYear: targetSettings.baselineYear ?? 2023,
      baselineEmissionsTco2e: scope2Baseline,
      targetYear: targetSettings.targetYear ?? 2030,
      reductionPercent: targetSettings.reductionPercent ?? 50,
      targetEmissionsTco2e: scope2NearTarget,
      modeled: true,
    },
    {
      id: 'scope3-2030',
      scope: 'scope3',
      horizon: 'near_term',
      baselineYear: targetSettings.baselineYear ?? 2023,
      baselineEmissionsTco2e: 0,
      targetYear: targetSettings.targetYear ?? 2030,
      reductionPercent: 0,
      targetEmissionsTco2e: 0,
      modeled: false,
    },
    {
      id: 'scope1-2050',
      scope: 'scope1',
      horizon: 'long_term',
      baselineYear: targetSettings.baselineYear ?? 2023,
      baselineEmissionsTco2e: scope1Baseline,
      targetYear: targetSettings.longTermTargetYear ?? 2050,
      reductionPercent: longTermTarget > 0 ? Math.round((1 - scope1LongTarget / Math.max(1, scope1Baseline)) * 1000) / 10 : 100,
      targetEmissionsTco2e: scope1LongTarget,
      modeled: true,
    },
    {
      id: 'scope2-2050',
      scope: 'scope2',
      horizon: 'long_term',
      baselineYear: targetSettings.baselineYear ?? 2023,
      baselineEmissionsTco2e: scope2Baseline,
      targetYear: targetSettings.longTermTargetYear ?? 2050,
      reductionPercent: longTermTarget > 0 ? Math.round((1 - scope2LongTarget / Math.max(1, scope2Baseline)) * 1000) / 10 : 100,
      targetEmissionsTco2e: scope2LongTarget,
      modeled: true,
    },
    {
      id: 'scope3-2050',
      scope: 'scope3',
      horizon: 'long_term',
      baselineYear: targetSettings.baselineYear ?? 2023,
      baselineEmissionsTco2e: 0,
      targetYear: targetSettings.longTermTargetYear ?? 2050,
      reductionPercent: 0,
      targetEmissionsTco2e: 0,
      modeled: false,
    },
  ]
}

export function calculateTargetEmissions(targetSettings) {
  return (
    (targetSettings.baselineEmissionsTco2e ?? 0) *
    (1 - clampReduction(targetSettings.reductionPercent) / 100)
  )
}

export function normaliseScopeTargets(targetSettings) {
  const source =
    Array.isArray(targetSettings.scopeTargets) && targetSettings.scopeTargets.length > 0
      ? targetSettings.scopeTargets
      : makeLegacyScopeTargets(targetSettings)

  return source
    .map((target) => {
      const targetEmissionsTco2e =
        target.targetEmissionsTco2e ?? calculateTargetEmissions(target)
      return {
        ...target,
        scopeLabel: target.scopeLabel ?? scopeLabels[target.scope] ?? target.scope,
        horizonLabel: target.horizonLabel ?? horizonLabels[target.horizon] ?? target.horizon,
        baselineYear: target.baselineYear ?? targetSettings.baselineYear ?? 2023,
        baselineEmissionsTco2e: target.baselineEmissionsTco2e ?? 0,
        targetYear: target.targetYear ?? targetSettings.targetYear ?? 2030,
        reductionPercent: clampReduction(target.reductionPercent),
        targetEmissionsTco2e,
        modeled: target.modeled !== false,
      }
    })
    .sort((a, b) => {
      const horizonDiff = (horizonOrder[a.horizon] ?? 9) - (horizonOrder[b.horizon] ?? 9)
      if (horizonDiff !== 0) return horizonDiff
      return a.scope.localeCompare(b.scope)
    })
}

export function normaliseTargetSettings(targetSettings) {
  const scopeTargets = normaliseScopeTargets(targetSettings)
  const modeledTargets = scopeTargets.filter((target) => target.modeled !== false)
  const nearTermTargets = modeledTargets.filter((target) => target.horizon === 'near_term')
  const longTermTargets = modeledTargets.filter((target) => target.horizon === 'long_term')
  const aggregateNearTerm = nearTermTargets.length > 0 ? nearTermTargets : modeledTargets
  const aggregateLongTerm = longTermTargets.length > 0 ? longTermTargets : aggregateNearTerm
  const baselineEmissionsTco2e = sumTargets(aggregateNearTerm, 'baselineEmissionsTco2e')
  const targetEmissionsTco2e = sumTargets(aggregateNearTerm, 'targetEmissionsTco2e')
  const longTermTargetEmissionsTco2e = sumTargets(aggregateLongTerm, 'targetEmissionsTco2e')
  const targetYear = aggregateNearTerm[0]?.targetYear ?? targetSettings.targetYear ?? 2030
  const longTermTargetYear =
    aggregateLongTerm[0]?.targetYear ?? targetSettings.longTermTargetYear ?? 2050

  return {
    ...targetSettings,
    scopeTargets,
    baselineYear: aggregateNearTerm[0]?.baselineYear ?? targetSettings.baselineYear ?? 2023,
    baselineEmissionsTco2e,
    targetYear,
    reductionPercent:
      baselineEmissionsTco2e > 0
        ? Math.round((1 - targetEmissionsTco2e / baselineEmissionsTco2e) * 1000) / 10
        : targetSettings.reductionPercent ?? 0,
    targetEmissionsTco2e,
    showLongTermPlanningLine: targetSettings.showLongTermPlanningLine ?? true,
    longTermTargetYear,
    longTermTargetEmissionsTco2e,
  }
}

function calculateScopePathway(scopeTargets, year) {
  const sortedTargets = [...scopeTargets].sort((a, b) => a.targetYear - b.targetYear)
  const firstTarget = sortedTargets[0]
  const milestones = [
    {
      year: firstTarget.baselineYear,
      value: firstTarget.baselineEmissionsTco2e,
    },
    ...sortedTargets.map((target) => ({
      year: target.targetYear,
      value: target.targetEmissionsTco2e,
    })),
  ].sort((a, b) => a.year - b.year)

  for (let index = 0; index < milestones.length - 1; index += 1) {
    const start = milestones[index]
    const end = milestones[index + 1]
    if (year <= end.year) {
      return Math.max(0, interpolate(year, start.year, start.value, end.year, end.value))
    }
  }

  return Math.max(0, milestones.at(-1)?.value ?? 0)
}

export function calculateTargetPathway(targetSettings, years) {
  const normalisedTarget = normaliseTargetSettings(targetSettings)
  const modeledTargets = normalisedTarget.scopeTargets.filter((target) => target.modeled !== false)
  const targetsByScope = modeledTargets.reduce((map, target) => {
    if (!map.has(target.scope)) map.set(target.scope, [])
    map.get(target.scope).push(target)
    return map
  }, new Map())

  return years.map((year) => {
    const scopeValues = {}
    for (const [scope, scopeTargets] of targetsByScope.entries()) {
      scopeValues[`${scope}TargetTco2e`] = calculateScopePathway(scopeTargets, year)
    }

    return {
      year,
      scope1TargetTco2e: scopeValues.scope1TargetTco2e ?? 0,
      scope2TargetTco2e: scopeValues.scope2TargetTco2e ?? 0,
      scope3TargetTco2e: scopeValues.scope3TargetTco2e ?? 0,
      targetTco2e: Object.values(scopeValues).reduce((sum, value) => sum + value, 0),
    }
  })
}

export function calculateGapToTarget(scenarioYearly, targetPathway, year) {
  const scenarioPoint = scenarioYearly.find((point) => point.year === year)
  const targetPoint = targetPathway.find((point) => point.year === year)
  return (scenarioPoint?.totalEmissionsTco2e ?? 0) - (targetPoint?.targetTco2e ?? 0)
}
