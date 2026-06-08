import { useEffect, useMemo, useReducer, useState } from 'react'
import DataAssumptionsView from './components/DataAssumptionsView'
import MaccFinanceView from './components/MaccFinanceView'
import MeasurePlannerView from './components/MeasurePlannerView'
import OperationalDashboardView from './components/OperationalDashboardView'
import ScenarioSetupView from './components/ScenarioSetupView'
import TopNav from './components/TopNav'
import { createInitialState } from './data/initialState'
import { calculateBauProjection } from './lib/projectionEngine'
import { applyMeasuresToProjection } from './lib/measureEngine'
import { calculateMeasureFinanceRows } from './lib/maccEngine'
import { getResponsiblePerson } from './lib/measureWorkflow'
import { calculateTargetEmissions, calculateTargetPathway, normaliseTargetSettings } from './lib/targetEngine'
import { clearStoredState, loadStoredState, saveStoredState } from './lib/storage'

function makeMeasureId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36)
  return `measure-${slug || 'custom'}-${Date.now()}`
}

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_BAU_ASSUMPTION':
      return {
        ...state,
        bauAssumptions: {
          ...state.bauAssumptions,
          [action.key]: action.value,
        },
      }
    case 'UPDATE_TARGET': {
      const nextTarget = {
        ...state.targetSettings,
        [action.key]: action.value,
      }
      if (action.key === 'baselineEmissionsTco2e' || action.key === 'reductionPercent') {
        nextTarget.targetEmissionsTco2e = calculateTargetEmissions(nextTarget)
      }
      return { ...state, targetSettings: normaliseTargetSettings(nextTarget) }
    }
    case 'SELECT_SCENARIO':
      return { ...state, selectedScenarioId: action.scenarioId }
    case 'UPDATE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.map((scenario) =>
          scenario.id === action.scenario.id ? action.scenario : scenario,
        ),
      }
    case 'SET_INTERNAL_CARBON_PRICE':
      return { ...state, internalCarbonPriceUsdPerTco2e: Math.max(0, action.value) }
    case 'SET_DISCOUNT_RATE':
      return { ...state, discountRate: Math.max(0, action.value) }
    case 'SET_MACC_VIEW':
      return { ...state, maccView: action.value }
    case 'ADD_MEASURE': {
      const measure = {
        ...action.measure,
        id: makeMeasureId(action.measure.name),
      }
      return { ...state, measures: [...state.measures, measure] }
    }
    case 'UPDATE_MEASURE':
      return {
        ...state,
        measures: state.measures.map((measure) =>
          measure.id === action.measure.id ? action.measure : measure,
        ),
      }
    case 'DELETE_MEASURE':
      return {
        ...state,
        measures: state.measures.filter((measure) => measure.id !== action.measureId),
      }
    case 'DUPLICATE_MEASURE': {
      const source = state.measures.find((measure) => measure.id === action.measureId)
      if (!source) return state
      const copy = {
        ...source,
        id: makeMeasureId(`${source.name} copy`),
        name: `${source.name} copy`,
        status: 'proposed',
        validationStage: 'Not submitted',
        progressPercent: 0,
        responsiblePerson: source.owner ?? 'Unassigned',
        nextAction: 'Prepare validation pack',
      }
      return { ...state, measures: [...state.measures, copy] }
    }
    case 'SUBMIT_MEASURE_FOR_VALIDATION':
      return {
        ...state,
        measures: state.measures.map((measure) =>
          measure.id === action.measureId
            ? {
                ...measure,
                status: 'validation_requested',
                validationStage: 'Awaiting sustainability validation',
                progressPercent: Math.max(measure.progressPercent ?? 0, 25),
                nextAction: measure.nextAction || 'Sustainability review and finance sign-off',
              }
            : measure,
        ),
      }
    case 'VALIDATE_MEASURE':
      return {
        ...state,
        measures: state.measures.map((measure) =>
          measure.id === action.measureId
            ? {
                ...measure,
                status: 'approved',
                validationStage: 'Validated and assigned',
                responsiblePerson: getResponsiblePerson(measure),
                progressPercent: Math.max(measure.progressPercent ?? 0, 40),
                nextAction: measure.nextAction || 'Owner to confirm implementation plan',
              }
            : measure,
        ),
      }
    case 'RESET_DEMO_DATA':
      return createInitialState()
    default:
      return state
  }
}

function initialiseState() {
  const initial = createInitialState()
  const stored = loadStoredState()
  if (!stored) return initial
  if (stored.demoDataVersion !== initial.demoDataVersion) return initial
  const storedScenarioById = new Map((stored.scenarios ?? []).map((scenario) => [scenario.id, scenario]))
  return {
    ...initial,
    ...stored,
    sites: initial.sites,
    legalEntities: initial.legalEntities,
    baselineEnergy: initial.baselineEnergy,
    operationalMonthlyData: initial.operationalMonthlyData,
    emissionFactors: initial.emissionFactors,
    targetSettings: normaliseTargetSettings({
      ...initial.targetSettings,
      ...(stored.targetSettings ?? {}),
    }),
    scenarios: initial.scenarios.map((scenario) => ({
      ...scenario,
      ...(storedScenarioById.get(scenario.id) ?? {}),
    })),
  }
}

function yearPoint(projection, year) {
  return projection.yearly.find((point) => point.year === year) ?? projection.yearly.at(-1) ?? {}
}

export default function App() {
  const [activeTab, setActiveTab] = useState('scenario')
  const [state, dispatch] = useReducer(reducer, undefined, initialiseState)

  useEffect(() => {
    saveStoredState(state)
  }, [state])

  const bauProjection = useMemo(
    () =>
      calculateBauProjection({
        sites: state.sites,
        baselineEnergy: state.baselineEnergy,
        assumptions: state.bauAssumptions,
        emissionFactors: state.emissionFactors,
      }),
    [state.sites, state.baselineEnergy, state.bauAssumptions, state.emissionFactors],
  )

  const projections = useMemo(() => {
    const entries = state.scenarios.map((scenario) => [
      scenario.id,
      applyMeasuresToProjection({
        bauProjection,
        measures: state.measures,
        scenario,
        assumptions: state.bauAssumptions,
        emissionFactors: state.emissionFactors,
      }),
    ])
    return Object.fromEntries(entries)
  }, [bauProjection, state.scenarios, state.measures, state.bauAssumptions, state.emissionFactors])

  const targetPathway = useMemo(
    () => calculateTargetPathway(state.targetSettings, bauProjection.years),
    [state.targetSettings, bauProjection.years],
  )

  const financeRowsByScenario = useMemo(() => {
    const entries = state.scenarios
      .filter((scenario) => scenario.id !== 'bau')
      .map((scenario) => [
        scenario.id,
        calculateMeasureFinanceRows({
          measures: state.measures,
          scenarioProjection: projections[scenario.id],
          internalCarbonPriceUsdPerTco2e: state.internalCarbonPriceUsdPerTco2e,
          discountRate: state.discountRate,
        }),
      ])
    return Object.fromEntries(entries)
  }, [
    state.scenarios,
    state.measures,
    state.internalCarbonPriceUsdPerTco2e,
    state.discountRate,
    projections,
  ])

  const selectedFinanceRows = financeRowsByScenario[state.selectedScenarioId] ?? []

  const trajectoryData = useMemo(
    () =>
      bauProjection.years.map((year) => ({
        year,
        bau: yearPoint(projections.bau, year).totalEmissionsTco2e ?? 0,
        low_effort: yearPoint(projections.low_effort, year).totalEmissionsTco2e ?? 0,
        high_investment: yearPoint(projections.high_investment, year).totalEmissionsTco2e ?? 0,
        target: targetPathway.find((point) => point.year === year)?.targetTco2e ?? 0,
      })),
    [bauProjection.years, projections, targetPathway],
  )

  const costData = useMemo(
    () =>
      bauProjection.years.map((year) => ({
        year,
        bau: yearPoint(projections.bau, year).energyCostUsd ?? 0,
        low_effort: yearPoint(projections.low_effort, year).energyCostUsd ?? 0,
        high_investment: yearPoint(projections.high_investment, year).energyCostUsd ?? 0,
      })),
    [bauProjection.years, projections],
  )

  const scenarioComparisons = useMemo(() => {
    const bau2030 = yearPoint(projections.bau, 2030)
    return state.scenarios.map((scenario) => {
      const projection = projections[scenario.id]
      const point2030 = yearPoint(projection, 2030)
      const point2050 = yearPoint(projection, 2050)
      const scenarioMeasures = state.measures.filter((measure) => measure.scenarioId === scenario.id)
      return {
        id: scenario.id,
        name: scenario.name,
        emissions2030: point2030.totalEmissionsTco2e ?? 0,
        emissions2050: point2050.totalEmissionsTco2e ?? 0,
        cost2030: point2030.energyCostUsd ?? 0,
        capexUsd: scenarioMeasures.reduce((sum, measure) => sum + measure.capexUsd, 0),
        annualReduction2030: Math.max(
          0,
          (bau2030.totalEmissionsTco2e ?? 0) - (point2030.totalEmissionsTco2e ?? 0),
        ),
      }
    })
  }, [state.scenarios, state.measures, projections])

  const baselineRowsWithEmissions = useMemo(
    () => bauProjection.siteYearRows.filter((row) => row.year === state.bauAssumptions.startYear),
    [bauProjection.siteYearRows, state.bauAssumptions.startYear],
  )

  function resetDemoData() {
    clearStoredState()
    dispatch({ type: 'RESET_DEMO_DATA' })
    setActiveTab('scenario')
  }

  const viewProps = {
    state,
    projections,
    targetPathway,
    selectedFinanceRows,
    onSelectScenario: (scenarioId) => dispatch({ type: 'SELECT_SCENARIO', scenarioId }),
  }

  return (
    <div className="app-shell">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} onReset={resetDemoData} />
      <main className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
        {activeTab === 'scenario' ? (
          <ScenarioSetupView
            {...viewProps}
            trajectoryData={trajectoryData}
            costData={costData}
            financeRowsByScenario={financeRowsByScenario}
            onUpdateBau={(key, value) =>
              dispatch({ type: 'UPDATE_BAU_ASSUMPTION', key, value })
            }
            onUpdateTarget={(key, value) => dispatch({ type: 'UPDATE_TARGET', key, value })}
            onUpdateScenario={(scenario) => dispatch({ type: 'UPDATE_SCENARIO', scenario })}
          />
        ) : null}
        {activeTab === 'operations' ? <OperationalDashboardView state={state} /> : null}
        {activeTab === 'measures' ? (
          <MeasurePlannerView
            state={state}
            financeRowsByScenario={financeRowsByScenario}
            onSelectScenario={(scenarioId) => dispatch({ type: 'SELECT_SCENARIO', scenarioId })}
            onAddMeasure={(measure) => dispatch({ type: 'ADD_MEASURE', measure })}
            onUpdateMeasure={(measure) => dispatch({ type: 'UPDATE_MEASURE', measure })}
            onDuplicateMeasure={(measureId) => dispatch({ type: 'DUPLICATE_MEASURE', measureId })}
            onDeleteMeasure={(measureId) => dispatch({ type: 'DELETE_MEASURE', measureId })}
            onSubmitForValidation={(measureId) =>
              dispatch({ type: 'SUBMIT_MEASURE_FOR_VALIDATION', measureId })
            }
            onValidateMeasure={(measureId) => dispatch({ type: 'VALIDATE_MEASURE', measureId })}
          />
        ) : null}
        {activeTab === 'finance' ? (
          <MaccFinanceView
            state={state}
            financeRows={selectedFinanceRows}
            scenarioComparisons={scenarioComparisons}
            onSelectScenario={(scenarioId) => dispatch({ type: 'SELECT_SCENARIO', scenarioId })}
            onUpdateCarbonPrice={(value) =>
              dispatch({ type: 'SET_INTERNAL_CARBON_PRICE', value })
            }
            onUpdateDiscountRate={(value) => dispatch({ type: 'SET_DISCOUNT_RATE', value })}
            onUpdateMaccView={(value) => dispatch({ type: 'SET_MACC_VIEW', value })}
          />
        ) : null}
        {activeTab === 'data' ? (
          <DataAssumptionsView
            state={state}
            baselineRowsWithEmissions={baselineRowsWithEmissions}
          />
        ) : null}
      </main>
    </div>
  )
}
