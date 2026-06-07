export const measureStatusOptions = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'planned', label: 'Planned' },
  { value: 'validation_requested', label: 'Submitted for validation' },
  { value: 'approved', label: 'Approved and assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'implemented', label: 'Implemented' },
]

const statusLabels = new Map(measureStatusOptions.map((status) => [status.value, status.label]))

const defaultProgressByStatus = {
  proposed: 0,
  planned: 10,
  validation_requested: 25,
  approved: 40,
  in_progress: 70,
  implemented: 100,
}

export function getMeasureStatusLabel(status) {
  return statusLabels.get(status) ?? status?.replaceAll('_', ' ') ?? 'Proposed'
}

export function getMeasureProgress(measure) {
  if (Number.isFinite(measure.progressPercent)) return Math.max(0, Math.min(100, measure.progressPercent))
  return defaultProgressByStatus[measure.status] ?? 0
}

export function getResponsiblePerson(measure) {
  return measure.responsiblePerson || measure.assignedTo || measure.owner || 'Unassigned'
}

export function canSubmitForValidation(measure) {
  return ['proposed', 'planned'].includes(measure.status)
}

export function canValidateMeasure(measure) {
  return measure.status === 'validation_requested'
}
