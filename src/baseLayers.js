// Street map plus a satellite view (Esri World Imagery, with place names on top), with a
// Map / Satellite switch in the corner. Remembers the viewer's last choice.
const KEY = 'mapView'
export function addBaseLayers(L, map, { maxZoom = 18 } = {}) {
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom })
  const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', maxZoom })
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom })
  const satellite = L.layerGroup([imagery, labels])
  let pick = 'Map'
  try { pick = localStorage.getItem(KEY) === 'Satellite' ? 'Satellite' : 'Map' } catch (e) {}
  ;(pick === 'Satellite' ? satellite : street).addTo(map)
  L.control.layers({ Map: street, Satellite: satellite }, null, { collapsed: false, position: 'topright' }).addTo(map)
  map.on('baselayerchange', e => { try { localStorage.setItem(KEY, e.name) } catch (err) {} })
}
