export interface BusRoute {
  id: string
  name: string
  description: string
  url: string
  stops: string[]
  /** Longitude, latitude. Route 19 uses stops with a road-aligned Highbury Grove section; others use route geometry. */
  points: [number, number][]
  color: string
}

export const BUS_ROUTES_VERIFIED_DATE = '21 September 2026'

// TfL Unified API /Line/{id}/Route/Sequence/outbound, retrieved 2026-09-21.
// Route 19 uses primary stop coordinates: the API lineString follows a different variant.
// Routes 30/43 use a single lineString, clipped then simplified to about 12 m tolerance.
// Alternative variants are never joined. See docs/research-buses.md for the mismatch.
// Decorative buses on these paths are illustrative, never live vehicle locations.
export const busRoutes: BusRoute[] = [
  {
    id: "19",
    name: "Finsbury Park → Battersea Bridge",
    description: "Through Highbury Barn, Highbury Corner and Angel; useful for exploring Highbury Fields. The Highbury Grove section follows mapped road geometry; the wider route links published stops.",
    url: "https://tfl.gov.uk/bus/route/19/",
    stops: ["Finsbury Park Interchange", "Highbury Barn", "Highbury Grove School / Aberdeen Park", "Highbury Corner", "Angel Station", "Sadler's Wells Theatre"],
    points: [
      [-0.10569, 51.56469],
      [-0.10295, 51.56402],
      [-0.09856, 51.56054],
      [-0.09852, 51.55846],
      [-0.09807, 51.55505],
      [-0.0984083, 51.5531344],
      [-0.0983768, 51.552854],
      [-0.0983425, 51.5525478],
      [-0.098335, 51.5524808],
      [-0.0982903, 51.552083],
      [-0.0982616, 51.5518511],
      [-0.0982174, 51.5514348],
      [-0.0982135, 51.5513986],
      [-0.0982045, 51.5513252],
      [-0.0981992, 51.5512807],
      [-0.0981579, 51.5509312],
      [-0.098146, 51.5507975],
      [-0.0981355, 51.5507035],
      [-0.0981251, 51.5506174],
      [-0.0980926, 51.5503298],
      [-0.0980273, 51.5498801],
      [-0.0980211, 51.5498447],
      [-0.0980084, 51.5497791],
      [-0.0979915, 51.5496945],
      [-0.0979742, 51.5495522],
      [-0.09797, 51.5494978],
      [-0.0979685, 51.5494269],
      [-0.0979816, 51.549302],
      [-0.0980033, 51.5491506],
      [-0.0980112, 51.5490955],
      [-0.0980179, 51.5490607],
      [-0.0980291, 51.5490017],
      [-0.0980314, 51.5489897],
      [-0.0980674, 51.5487806],
      [-0.0981153, 51.5485685],
      [-0.0981192, 51.5485499],
      [-0.098168, 51.5483279],
      [-0.0982103, 51.5481139],
      [-0.0982264, 51.5480425],
      [-0.0982612, 51.5478862],
      [-0.0982847, 51.5477982],
      [-0.098394, 51.5473922],
      [-0.098396, 51.5473848],
      [-0.0984472, 51.5471523],
      [-0.0984653, 51.5470762],
      [-0.098505, 51.5469416],
      [-0.09929, 51.54652],
      [-0.10153, 51.54611],
      [-0.10322, 51.54427],
      [-0.10296, 51.54219],
      [-0.10229, 51.53828],
      [-0.10358, 51.53609],
      [-0.10546, 51.53374],
      [-0.10594, 51.531],
      [-0.10604, 51.52911],
      [-0.10807, 51.52711],
      [-0.11044, 51.52541],
      [-0.11166, 51.52264],
      [-0.11405, 51.52135],
      [-0.11838, 51.52012],
      [-0.12172, 51.5186],
      [-0.1246, 51.51741],
      [-0.12812, 51.51668],
      [-0.12995, 51.51539],
    ],
    color: "#be594e",
  },
  {
    id: "30",
    name: "Euston → Hackney Wick",
    description: "Connects King’s Cross, Angel and Highbury Corner, then continues through Canonbury and Dalston.",
    url: "https://tfl.gov.uk/bus/route/30/",
    stops: ["King's Cross Station", "Angel Station", "Highbury Corner", "St Paul's Road / Highbury Corner", "Highbury Grove", "Mildmay Park / Southgate Road"],
    points: [
      [-0.132289, 51.527687],
      [-0.130226, 51.528291],
      [-0.129687, 51.527734],
      [-0.121991, 51.530831],
      [-0.109176, 51.531812],
      [-0.109251, 51.532793],
      [-0.106167, 51.532761],
      [-0.106104, 51.533219],
      [-0.10379, 51.535834],
      [-0.102359, 51.538347],
      [-0.103367, 51.544604],
      [-0.102986, 51.546154],
      [-0.102255, 51.546034],
      [-0.100557, 51.546294],
      [-0.096534, 51.547299],
      [-0.09217, 51.547165],
      [-0.087153, 51.546609],
      [-0.083929, 51.546608],
      [-0.076711, 51.546077],
      [-0.075519, 51.546242],
      [-0.070082, 51.546283],
    ],
    color: "#ba824b",
  },
  {
    id: "43",
    name: "Friern Barnet → London Bridge",
    description: "The Holloway Road and Upper Street connection, via Archway, Highbury & Islington, Angel and Old Street.",
    url: "https://tfl.gov.uk/bus/route/43/",
    stops: ["Archway Station / Holloway Road", "Upper Holloway Station", "Holloway / Nags Head", "Holloway Road Station", "Highbury & Islington Station", "Angel Station", "Old Street Station"],
    points: [
      [-0.144862, 51.589564],
      [-0.145521, 51.589341],
      [-0.146903, 51.588014],
      [-0.147019, 51.584437],
      [-0.146265, 51.582393],
      [-0.147496, 51.578743],
      [-0.14735, 51.577734],
      [-0.143889, 51.576249],
      [-0.143413, 51.575891],
      [-0.136958, 51.569269],
      [-0.1348, 51.566645],
      [-0.133735, 51.566233],
      [-0.134085, 51.565789],
      [-0.133648, 51.565188],
      [-0.128874, 51.563718],
      [-0.125181, 51.56196],
      [-0.123439, 51.560466],
      [-0.113086, 51.553376],
      [-0.106932, 51.54844],
      [-0.103301, 51.546195],
      [-0.103193, 51.545672],
      [-0.102952, 51.545569],
      [-0.103247, 51.545412],
      [-0.103361, 51.544766],
      [-0.103269, 51.543506],
      [-0.102361, 51.538341],
      [-0.103997, 51.535361],
      [-0.106024, 51.532991],
      [-0.106274, 51.5319],
      [-0.101647, 51.530836],
      [-0.088886, 51.527529],
      [-0.088559, 51.527314],
      [-0.08784, 51.526233],
      [-0.088083, 51.525598],
      [-0.087607, 51.525266],
      [-0.087014, 51.521875],
      [-0.0877, 51.519261],
      [-0.084169, 51.518148],
      [-0.085483, 51.516806],
      [-0.081703, 51.516186],
      [-0.082038, 51.515751],
    ],
    color: "#7a7894",
  },
]

// TfL route sequence snapshot, 25 September 2026; one contiguous local section.
busRoutes.push({
  "id": "139",
  "name": "Marylebone \u2192 Oxford Circus",
  "description": "A selected section via Selfridges for a walk to Wigmore Sports.",
  "url": "https://tfl.gov.uk/bus/route/139/",
  "stops": [
    "Baker Street Station",
    "Orchard Street / Selfridges",
    "Oxford Circus Station"
  ],
  "color": "#ad6353",
  "points": [
    [
      -0.159394,
      51.524652
    ],
    [
      -0.158503,
      51.524243
    ],
    [
      -0.15402,
      51.514359
    ]
  ]
});

// TfL route sequence snapshot, 25 September 2026; one contiguous local section.
busRoutes.push({
  "id": "393",
  "name": "Clissold Park \u2192 Highbury & Islington",
  "description": "Connects the Clissold Road side of the park with Highbury Corner. Walk through the park to the tennis shop.",
  "url": "https://tfl.gov.uk/bus/route/393/",
  "stops": [
    "Clissold Road",
    "Green Lanes / Stoke Newington Church St",
    "Highbury Corner",
    "Highbury & Islington Station"
  ],
  "color": "#ad6353",
  "points": [
    [
      -0.080349,
      51.562089
    ],
    [
      -0.082946,
      51.561208
    ],
    [
      -0.084719,
      51.561099
    ],
    [
      -0.086364,
      51.560056
    ],
    [
      -0.087217,
      51.559333
    ],
    [
      -0.089448,
      51.558092
    ],
    [
      -0.090431,
      51.557685
    ],
    [
      -0.091012,
      51.558981
    ],
    [
      -0.091606,
      51.559953
    ],
    [
      -0.091984,
      51.559869
    ],
    [
      -0.092513,
      51.555165
    ],
    [
      -0.092366,
      51.553841
    ],
    [
      -0.091713,
      51.551564
    ],
    [
      -0.091776,
      51.551124
    ],
    [
      -0.092297,
      51.550508
    ],
    [
      -0.095033,
      51.549748
    ],
    [
      -0.095799,
      51.549374
    ],
    [
      -0.096368,
      51.548861
    ],
    [
      -0.096266,
      51.548545
    ],
    [
      -0.098263,
      51.548029
    ],
    [
      -0.098532,
      51.546774
    ],
    [
      -0.100557,
      51.546294
    ],
    [
      -0.102468,
      51.546118
    ],
    [
      -0.103184,
      51.546247
    ],
    [
      -0.104593,
      51.546914
    ],
    [
      -0.106887,
      51.548402
    ],
    [
      -0.109343,
      51.550402
    ],
    [
      -0.112441,
      51.552679
    ],
    [
      -0.113648,
      51.553736
    ],
    [
      -0.117113,
      51.556111
    ],
    [
      -0.117684,
      51.555904
    ],
    [
      -0.117912,
      51.555611
    ],
    [
      -0.118005,
      51.550218
    ],
    [
      -0.118183,
      51.550021
    ],
    [
      -0.119266,
      51.549725
    ]
  ]
});
