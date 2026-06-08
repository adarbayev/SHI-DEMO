export const measureWorkflowColumns = [
  { value: 'draft', label: 'Draft', shortLabel: 'Draft' },
  { value: 'proposed', label: 'Proposed', shortLabel: 'Proposed' },
  {
    value: 'validation_requested',
    label: 'Submitted for validation',
    shortLabel: 'Validation',
  },
  { value: 'validated', label: 'Validated', shortLabel: 'Validated' },
  { value: 'in_progress', label: 'In progress', shortLabel: 'In progress' },
  { value: 'completed', label: 'Completed', shortLabel: 'Completed' },
]

export const measureStatusOptions = measureWorkflowColumns

const legacyStatusMap = {
  planned: 'proposed',
  approved: 'validated',
  implemented: 'completed',
}

const statusLabels = new Map(measureWorkflowColumns.map((status) => [status.value, status.label]))

const defaultProgressByStatus = {
  draft: 0,
  proposed: 10,
  validation_requested: 30,
  validated: 45,
  in_progress: 75,
  completed: 100,
}

const workflowAdvanceByStatus = {
  draft: {
    nextStatus: 'proposed',
    actionLabel: 'Propose',
    validationStage: 'Ready for validation pack',
    nextAction: 'Submit for sustainability validation',
  },
  proposed: {
    nextStatus: 'validation_requested',
    actionLabel: 'Submit for validation',
    validationStage: 'Awaiting sustainability validation',
    nextAction: 'Sustainability review and finance sign-off',
  },
  validation_requested: {
    nextStatus: 'validated',
    actionLabel: 'Validate',
    validationStage: 'Validated and assigned',
    nextAction: 'Responsible owner to confirm implementation plan',
  },
  validated: {
    nextStatus: 'in_progress',
    actionLabel: 'Start',
    validationStage: 'Implementation in progress',
    nextAction: 'Track delivery milestones and update progress',
  },
  in_progress: {
    nextStatus: 'completed',
    actionLabel: 'Complete',
    validationStage: 'Completed and ready for impact tracking',
    nextAction: 'Confirm measured savings and archive evidence',
  },
}

export function normaliseMeasureStatus(status) {
  const mapped = legacyStatusMap[status] ?? status
  return statusLabels.has(mapped) ? mapped : 'proposed'
}

export function getMeasureStatusLabel(status) {
  return statusLabels.get(normaliseMeasureStatus(status))
}

export function getMeasureProgress(measure) {
  if (Number.isFinite(measure.progressPercent)) {
    return Math.max(0, Math.min(100, measure.progressPercent))
  }
  return defaultProgressByStatus[normaliseMeasureStatus(measure.status)] ?? 0
}

export function getPersonById(people = [], personId) {
  return people.find((person) => person.id === personId) ?? null
}

function getDefaultResponsiblePerson(people = [], measure = {}) {
  return (
    people.find((person) => person.siteIds?.includes(measure.siteId) && person.team !== 'Sustainability') ??
    people.find((person) => person.team === 'Facilities') ??
    people[0] ??
    null
  )
}

function getDefaultValidatorPerson(people = []) {
  return people.find((person) => person.team === 'Sustainability') ?? people[0] ?? null
}

export function getResponsiblePerson(measure, people = []) {
  const person = getPersonById(people, measure.responsiblePersonId)
  return person?.name || measure.responsiblePerson || measure.assignedTo || measure.owner || 'Unassigned'
}

export function getValidatorPerson(measure, people = []) {
  const person = getPersonById(people, measure.validatorPersonId)
  return person?.name || measure.validatorPerson || 'Not assigned'
}

export function getNextWorkflowAction(measure) {
  return workflowAdvanceByStatus[normaliseMeasureStatus(measure.status)] ?? null
}

export function canAdvanceMeasure(measure) {
  return Boolean(getNextWorkflowAction(measure))
}

export function advanceMeasureWorkflow(measure, people = []) {
  const currentStatus = normaliseMeasureStatus(measure.status)
  const action = workflowAdvanceByStatus[currentStatus]
  if (!action) return { ...measure, status: currentStatus }

  const nextStatus = action.nextStatus
  const responsiblePerson =
    getPersonById(people, measure.responsiblePersonId) ??
    getDefaultResponsiblePerson(people, measure)
  const validatorPerson =
    getPersonById(people, measure.validatorPersonId) ??
    getDefaultValidatorPerson(people)

  return {
    ...measure,
    status: nextStatus,
    validationStage: action.validationStage,
    progressPercent: Math.max(getMeasureProgress(measure), defaultProgressByStatus[nextStatus]),
    responsiblePersonId: measure.responsiblePersonId || responsiblePerson?.id,
    responsiblePerson: responsiblePerson?.name ?? getResponsiblePerson(measure, people),
    validatorPersonId: measure.validatorPersonId || validatorPerson?.id,
    validatorPerson: validatorPerson?.name ?? getValidatorPerson(measure, people),
    nextAction: action.nextAction,
  }
}

export function groupMeasuresByStatus(measures) {
  const groups = new Map(measureWorkflowColumns.map((column) => [column.value, []]))
  for (const measure of measures) {
    const status = normaliseMeasureStatus(measure.status)
    if (!groups.has(status)) groups.set(status, [])
    groups.get(status).push({ ...measure, status })
  }
  return groups
}
