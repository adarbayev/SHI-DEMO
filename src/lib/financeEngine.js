export function calculateAvoidedEnergyCost(energyReductionMWh, unitCostUsdPerMWh) {
  return energyReductionMWh * unitCostUsdPerMWh
}

export function calculateCarbonPriceValue(emissionsReductionTco2e, carbonPriceUsdPerTco2e) {
  return emissionsReductionTco2e * carbonPriceUsdPerTco2e
}

export function calculateAnnualNetBenefit(avoidedEnergyCostUsd, carbonPriceValueUsd, annualOpexChangeUsd) {
  return avoidedEnergyCostUsd + carbonPriceValueUsd - annualOpexChangeUsd
}

export function calculatePayback(capexUsd, annualNetBenefitUsd) {
  if (annualNetBenefitUsd <= 0) return null
  return capexUsd / annualNetBenefitUsd
}

export function capitalRecoveryFactor(discountRate, usefulLifeYears) {
  if (usefulLifeYears <= 0) return 0
  if (discountRate === 0) return 1 / usefulLifeYears
  const r = discountRate
  const n = usefulLifeYears
  return (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function calculateAnnualisedCapex(capexUsd, discountRate, usefulLifeYears) {
  return capexUsd * capitalRecoveryFactor(discountRate, usefulLifeYears)
}

export function calculatePresentValue(amountUsd, discountRate, yearOffset) {
  return amountUsd / Math.pow(1 + discountRate, yearOffset)
}
