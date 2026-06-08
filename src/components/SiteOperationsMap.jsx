import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatCompactCurrency, formatEmissions, formatMwh, formatPercent } from '../lib/formatters'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function markerColor(row, isSelected) {
  if (isSelected) return '#1C64A5'
  if (row.rank <= 2) return '#FF6D15'
  if (row.rank <= 4) return '#06B2B1'
  return '#B1DF00'
}

function popupHtml(row, isSelected) {
  return `
    <div class="space-y-2 text-sm">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(row.hotspotTier)} hotspot${isSelected ? ' | selected' : ''}</p>
        <p class="text-base font-semibold text-shi-blue">${escapeHtml(row.siteName)}</p>
        <p class="text-xs text-slate-500">${escapeHtml(row.country)} | ${escapeHtml(row.archetype)}</p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <span><b>${formatMwh(row.totalEnergyMWh)}</b><br><small>Total energy</small></span>
        <span><b>${formatEmissions(row.totalEmissionsTco2e)}</b><br><small>Emissions</small></span>
        <span><b>${formatPercent(row.electricityShare)}</b><br><small>Electricity share</small></span>
        <span><b>${formatPercent(row.yoyEnergyChange)}</b><br><small>YoY energy</small></span>
      </div>
      <p class="text-xs text-slate-500">Annual cost ${formatCompactCurrency(row.energyCostUsd)}</p>
    </div>
  `
}

export default function SiteOperationsMap({ siteRows, selectedSiteId, onSelectSite }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const fittedSitesRef = useRef('')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const map = L.map(containerRef.current, {
      attributionControl: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      touchZoom: true,
      wheelDebounceTime: 20,
      wheelPxPerZoomLevel: 70,
      worldCopyJump: true,
    }).setView([31, 0], 2)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = layer

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)
    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const maxEnergy = Math.max(...siteRows.map((row) => row.totalEnergyMWh), 1)
    const bounds = []

    for (const row of siteRows) {
      if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) continue
      const isSelected = row.siteId === selectedSiteId
      const radius = 8 + Math.sqrt(row.totalEnergyMWh / maxEnergy) * 18
      const marker = L.circleMarker([row.latitude, row.longitude], {
        radius,
        color: markerColor(row, isSelected),
        fillColor: markerColor(row, isSelected),
        fillOpacity: isSelected ? 0.9 : 0.68,
        opacity: isSelected ? 1 : 0.78,
        weight: isSelected ? 3 : 2,
      })

      marker.bindTooltip(row.mapLabel, {
        direction: 'top',
        offset: [0, -4],
        opacity: 0.92,
      })
      marker.bindPopup(popupHtml(row, isSelected), { maxWidth: 300 })
      marker.on('click', () => onSelectSite(row.siteId))
      marker.addTo(layer)
      bounds.push([row.latitude, row.longitude])
    }

    const boundsKey = siteRows.map((row) => row.siteId).join('|')
    if (bounds.length > 0 && boundsKey !== fittedSitesRef.current) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 4 })
      fittedSitesRef.current = boundsKey
      setTimeout(() => map.invalidateSize(), 0)
    }
  }, [siteRows, selectedSiteId, onSelectSite])

  return <div ref={containerRef} className="operations-map h-[340px] min-h-[320px] w-full rounded-md sm:h-[360px]" />
}
