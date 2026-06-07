export const emissionFactors = {
  electricityLocationBased: {
    'United States': { 2025: 0.38, 2026: 0.38 },
    'United Kingdom': { 2025: 0.18, 2026: 0.18 },
    France: { 2025: 0.06, 2026: 0.06 },
    India: { 2025: 0.7, 2026: 0.7 },
  },
  countryGridDecarbonisationRates: {
    'United States': 0.02,
    'United Kingdom': 0.03,
    France: 0.01,
    India: 0.02,
  },
  fuels: {
    naturalGasTco2ePerMWh: 0.184,
    dieselTco2ePerMWh: 0.267,
    petrolTco2ePerMWh: 0.249,
  },
}
