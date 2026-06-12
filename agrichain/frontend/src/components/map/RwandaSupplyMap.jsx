import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { DivIcon } from 'leaflet'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'

/* Fit the map to Rwanda's exact geographic bounds on first load */
function FitRwanda() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(
      [[-2.84, 28.86], [-1.05, 30.90]],
      { padding: [10, 10], animate: false }
    )
  }, [map])
  return null
}

/* System colour palette only */
const RISK = {
  low:    { dot: '#228b52', pulse: 'rgba(34,139,82,0.30)'  },  // primary-500
  medium: { dot: '#C55A11', pulse: 'rgba(197,90,17,0.30)' },   // warning-500
  high:   { dot: '#C00000', pulse: 'rgba(192,0,0,0.30)'   },   // danger-500
}

/* Real lat/lng — all 30 Rwanda districts */
const DISTRICTS = [
  // Kigali Province
  { name:'Kigali City',  lat:-1.9441, lng:30.0619, loss:3.2,  batches:142, risk:'low',    crop:'Mixed produce' },
  // Northern Province
  { name:'Musanze',      lat:-1.4996, lng:29.6340, loss:8.1,  batches:67,  risk:'medium', crop:'Potato'  },
  { name:'Gicumbi',      lat:-1.5799, lng:30.0628, loss:7.1,  batches:48,  risk:'medium', crop:'Wheat'   },
  { name:'Burera',       lat:-1.4575, lng:29.8568, loss:5.6,  batches:39,  risk:'low',    crop:'Potato'  },
  { name:'Gakenke',      lat:-1.7003, lng:29.7897, loss:6.4,  batches:33,  risk:'medium', crop:'Banana'  },
  { name:'Rulindo',      lat:-1.7252, lng:30.0512, loss:4.9,  batches:41,  risk:'low',    crop:'Vegetables' },
  // Southern Province
  { name:'Huye',         lat:-2.5967, lng:29.7375, loss:7.8,  batches:38,  risk:'medium', crop:'Beans'   },
  { name:'Muhanga',      lat:-2.0769, lng:29.7571, loss:6.9,  batches:44,  risk:'medium', crop:'Potato'  },
  { name:'Nyanza',       lat:-2.3514, lng:29.7393, loss:5.3,  batches:37,  risk:'low',    crop:'Sorghum' },
  { name:'Gisagara',     lat:-2.6163, lng:29.8305, loss:8.9,  batches:28,  risk:'medium', crop:'Beans'   },
  { name:'Kamonyi',      lat:-2.1197, lng:29.8826, loss:4.8,  batches:51,  risk:'low',    crop:'Maize'   },
  { name:'Nyaruguru',    lat:-2.7565, lng:29.5287, loss:9.4,  batches:22,  risk:'medium', crop:'Tea'     },
  { name:'Nyamagabe',    lat:-2.4798, lng:29.4825, loss:7.2,  batches:31,  risk:'medium', crop:'Tea'     },
  { name:'Ruhango',      lat:-2.2273, lng:29.7813, loss:5.9,  batches:34,  risk:'low',    crop:'Cassava' },
  // Eastern Province
  { name:'Rwamagana',    lat:-1.9480, lng:30.4346, loss:4.7,  batches:55,  risk:'low',    crop:'Maize'   },
  { name:'Nyagatare',    lat:-1.2952, lng:30.3260, loss:5.1,  batches:72,  risk:'low',    crop:'Maize'   },
  { name:'Bugesera',     lat:-2.1724, lng:30.2480, loss:4.2,  batches:61,  risk:'low',    crop:'Cassava' },
  { name:'Ngoma',        lat:-2.1645, lng:30.5024, loss:5.8,  batches:36,  risk:'low',    crop:'Sorghum' },
  { name:'Gatsibo',      lat:-1.5933, lng:30.4728, loss:6.3,  batches:43,  risk:'medium', crop:'Maize'   },
  { name:'Kirehe',       lat:-2.2897, lng:30.6814, loss:7.5,  batches:29,  risk:'medium', crop:'Cassava' },
  { name:'Kayonza',      lat:-1.8806, lng:30.6453, loss:5.5,  batches:48,  risk:'low',    crop:'Maize'   },
  // Western Province
  { name:'Rubavu',       lat:-1.6817, lng:29.3547, loss:12.4, batches:43,  risk:'high',   crop:'Tomato'  },
  { name:'Rusizi',       lat:-2.4718, lng:28.9070, loss:14.2, batches:31,  risk:'high',   crop:'Banana'  },
  { name:'Karongi',      lat:-2.0717, lng:29.3676, loss:9.3,  batches:29,  risk:'medium', crop:'Banana'  },
  { name:'Rutsiro',      lat:-1.9452, lng:29.4289, loss:8.6,  batches:26,  risk:'medium', crop:'Cassava' },
  { name:'Ngororero',    lat:-1.8538, lng:29.5697, loss:7.4,  batches:32,  risk:'medium', crop:'Beans'   },
  { name:'Nyabihu',      lat:-1.6667, lng:29.5000, loss:9.1,  batches:27,  risk:'medium', crop:'Potato'  },
  { name:'Nyamasheke',   lat:-2.3167, lng:29.1333, loss:10.8, batches:24,  risk:'high',   crop:'Coffee'  },
  { name:'Rubirizi',     lat:-2.2667, lng:29.2667, loss:8.3,  batches:21,  risk:'medium', crop:'Banana'  },
  { name:'Nyamagabe W',  lat:-2.4500, lng:29.2000, loss:7.9,  batches:19,  risk:'medium', crop:'Tea'     },
]

/* Supply-chain routes with waypoints following Rwanda's main roads */
const ROUTES = [
  { coords:[[-1.4996,29.6340],[-1.6500,29.7200],[-1.7600,29.8500],[-1.9441,30.0619]], risk:'low'    }, // Musanze → Kigali (RN2)
  { coords:[[-1.6817,29.3547],[-1.7200,29.5000],[-1.8500,29.7500],[-1.9441,30.0619]], risk:'high'   }, // Rubavu → Kigali (RN1)
  { coords:[[-1.2952,30.3260],[-1.5000,30.2500],[-1.7000,30.1500],[-1.9441,30.0619]], risk:'low'    }, // Nyagatare → Kigali (RN3)
  { coords:[[-2.5967,29.7375],[-2.3500,29.7500],[-2.1000,29.8000],[-2.0769,29.7571],[-1.9441,30.0619]], risk:'medium' }, // Huye → Kigali (RN1)
  { coords:[[-2.4718,28.9070],[-2.3500,29.1000],[-2.2000,29.5000],[-2.0769,29.7571]], risk:'high'   }, // Rusizi → Muhanga
  { coords:[[-2.1724,30.2480],[-2.0500,30.1500],[-1.9441,30.0619]], risk:'low'    }, // Bugesera → Kigali
  { coords:[[-1.9480,30.4346],[-1.9500,30.2500],[-1.9441,30.0619]], risk:'low'    }, // Rwamagana → Kigali
  { coords:[[-2.0717,29.3676],[-2.0500,29.5500],[-2.0769,29.7571]], risk:'medium' }, // Karongi → Muhanga
]

function makeIcon(risk) {
  const { dot, pulse } = RISK[risk]
  return new DivIcon({
    html: `<div class="cs-marker" style="width:32px;height:32px">
             <div class="cs-pulse" style="background:${pulse};border:1.5px solid ${dot}66"></div>
             <div class="cs-dot" style="width:10px;height:10px;background:${dot}"></div>
           </div>`,
    className: '',
    iconSize:      [32, 32],
    iconAnchor:    [16, 16],
    tooltipAnchor: [0, -18],
  })
}

export default function RwandaSupplyMap() {
  return (
    <MapContainer
      center={[-1.94, 29.87]}
      zoom={9}
      minZoom={8}
      maxZoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
      dragging={true}
      doubleClickZoom={false}
      attributionControl={false}
      maxBounds={[[-3.2, 28.3], [-0.7, 31.4]]}
      maxBoundsViscosity={0.9}
    >
      {/* Fit to Rwanda's exact borders on load */}
      <FitRwanda />

      {/* CartoDB Dark Matter — dark base shows Rwanda clearly */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO &copy; OpenStreetMap contributors'
      />

      {/* Animated supply routes */}
      {ROUTES.map((r, i) => (
        <Polyline key={i} positions={r.coords}
          pathOptions={{
            color:   RISK[r.risk].dot,
            weight:  r.risk === 'high' ? 2.5 : 2,
            opacity: 0.70,
            className: 'cs-route',
          }}
        />
      ))}

      {/* Pulsing district markers */}
      {DISTRICTS.map(d => (
        <Marker key={d.name} position={[d.lat, d.lng]} icon={makeIcon(d.risk)}>
          <Tooltip direction="top" offset={[0, -20]} className="cs-tooltip">
            <p className="text-xs font-bold text-gray-900">{d.name}</p>
            <p className="text-xs text-gray-500">{d.crop}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold" style={{ color: RISK[d.risk].dot }}>{d.loss}% loss</span>
              <span className="text-xs text-gray-400">· {d.batches} batches</span>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}
