import { baselineEnergy2026 } from './seedEnergy'
import { emissionFactors } from './seedEmissionFactors'
import { defaultMeasures } from './seedMeasures'
import { defaultBauAssumptions, scenarios } from './seedScenarios'
import { sites, legalEntities } from './seedSites'
import { defaultTarget } from './seedTargets'

export function createInitialState() {
  return structuredClone({
    demoDataVersion: 9,
    bauAssumptions: defaultBauAssumptions,
    targetSettings: defaultTarget,
    internalCarbonPriceUsdPerTco2e: 75,
    discountRate: 0.08,
    selectedScenarioId: 'low_effort',
    maccView: 'gross',
    sites,
    legalEntities,
    baselineEnergy: baselineEnergy2026,
    emissionFactors,
    measures: defaultMeasures,
    scenarios,
  })
}
