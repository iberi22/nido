import type { Property } from '../domain/property';

export const DEMO_PROPERTIES: Property[] = [
  {
    id: 'casa-campestre-pance',
    name: 'Casa Campestre - Pance',
    type: 'house',
    location: {
      city: 'Cali',
      comuna: 'Comuna 22',
      estrato: 6,
      geohash: 'd0ybf5g2'
    },
    norms: {
      NSR10_stairs: {
        minWidth_m: 0.9,
        tread_min_mm: 280,
        riser_min_mm: 100,
        riser_max_mm: 180,
        formula: '2R + H = 620-640mm'
      },
      POT_garage: {
        minWidth_m: 2.6,
        minDepth_m: 5.0,
        accessWidth_independent_m: 3.2
      }
    },
    config: {
      wallThickness: 0.15,
      scale: 50,
      plot: {
        width: 15,
        height: 20,
        margin: 100
      },
      colors: {
        blueprint_bg: '#0f172a',
        blueprint_line: '#1e293b',
        blueprint_text: '#f8fafc',
        accent: '#06b6d4',
        accent_muted: 'rgba(6, 182, 212, 0.15)',
        highlight: '#f97316',
        wall_fill: 'rgba(6, 182, 212, 0.25)',
        zone_fill: 'rgba(6, 182, 212, 0.06)',
        selection: '#f97316',
        danger: '#ef4444'
      }
    },
    floors: [
      {
        id: 'campestre-f1',
        name: 'PRIMER PISO (ZONA SOCIAL)',
        height_m: 3.0,
        zones: [
          {
            id: 'zone-garage',
            name: 'GARAJE',
            x: 0,
            y: 0,
            width: 6,
            height: 5,
            type: 'garage',
            color: 'rgba(59, 130, 246, 0.08)'
          },
          {
            id: 'zone-living',
            name: 'SALA Y COMEDOR',
            x: 6,
            y: 0,
            width: 8,
            height: 6,
            type: 'social',
            color: 'rgba(99, 102, 241, 0.08)'
          },
          {
            id: 'zone-kitchen',
            name: 'COCINA INTEGRAL',
            x: 6,
            y: 6,
            width: 4,
            height: 4,
            type: 'utility',
            color: 'rgba(16, 185, 129, 0.08)'
          }
        ],
        walls: [
          {
            id: 'wall-garage-living',
            x1: 6,
            y1: 0,
            x2: 6,
            y2: 5,
            note: 'Divisor Garaje/Sala'
          }
        ],
        stairs: {
          type: 'U',
          totalSteps: 18,
          riser_mm: 166,
          tread_mm: 280,
          totalRise_m: 3.0,
          components: [
            {
              id: 'stair-run1',
              x: 12.0,
              y: 4.0,
              width: 1.0,
              height: 2.0,
              steps: 9,
              orientation: 'vertical',
              arrowDir: 'up',
              label: 'Ascenso 1'
            }
          ]
        },
        elements: [
          {
            type: 'door',
            x: 6.0,
            y: 2.0,
            width: 0.9,
            note: 'Puerta Principal'
          }
        ]
      },
      {
        id: 'campestre-f2',
        name: 'SEGUNDO PISO (ZONA PRIVADA)',
        height_m: 2.8,
        zones: [
          {
            id: 'zone-bedroom1',
            name: 'SUITE PRINCIPAL',
            x: 0,
            y: 0,
            width: 5,
            height: 5,
            type: 'room',
            color: 'rgba(236, 72, 153, 0.08)'
          },
          {
            id: 'zone-bedroom2',
            name: 'HABITACION AUXILIAR',
            x: 5,
            y: 0,
            width: 4,
            height: 4,
            type: 'room',
            color: 'rgba(168, 85, 247, 0.08)'
          },
          {
            id: 'zone-studio',
            name: 'ESTUDIO/OFICINA',
            x: 0,
            y: 5,
            width: 4,
            height: 3,
            type: 'social',
            color: 'rgba(234, 179, 8, 0.08)'
          }
        ]
      }
    ],
    rooms: [
      {
        id: 'room-garage',
        floorId: 'campestre-f1',
        zoneId: 'zone-garage',
        name: 'Garaje Cubierto',
        area_m2: 30,
        items: []
      },
      {
        id: 'room-living',
        floorId: 'campestre-f1',
        zoneId: 'zone-living',
        name: 'Sala y Comedor',
        area_m2: 48,
        items: []
      },
      {
        id: 'room-kitchen',
        floorId: 'campestre-f1',
        zoneId: 'zone-kitchen',
        name: 'Cocina Integral',
        area_m2: 16,
        items: []
      },
      {
        id: 'room-bedroom1',
        floorId: 'campestre-f2',
        zoneId: 'zone-bedroom1',
        name: 'Suite Principal',
        area_m2: 25,
        items: []
      },
      {
        id: 'room-bedroom2',
        floorId: 'campestre-f2',
        zoneId: 'zone-bedroom2',
        name: 'Habitación de Huéspedes',
        area_m2: 16,
        items: []
      },
      {
        id: 'room-studio',
        floorId: 'campestre-f2',
        zoneId: 'zone-studio',
        name: 'Estudio/Oficina',
        area_m2: 12,
        items: []
      }
    ],
    items: [
      {
        id: 'item-electric-door',
        roomId: 'room-garage',
        name: 'Puerta de Garaje Eléctrica',
        category: 'infrastructure',
        value: 4500000,
        warrantyUntil: '2028-06-30'
      },
      {
        id: 'item-ev-charger',
        roomId: 'room-garage',
        name: 'Cargador de Vehículo Eléctrico',
        category: 'electronics',
        value: 2500000,
        warrantyUntil: '2027-08-12'
      },
      {
        id: 'item-smart-tv',
        roomId: 'room-living',
        name: 'Smart TV OLED 65"',
        category: 'electronics',
        value: 3800000,
        warrantyUntil: '2027-12-15'
      },
      {
        id: 'item-leather-sofa',
        roomId: 'room-living',
        name: 'Sofá Seccional Cuero',
        category: 'furniture',
        value: 6500000
      },
      {
        id: 'item-refrigerator',
        roomId: 'room-kitchen',
        name: 'Nevera Nevecon LG',
        category: 'appliances',
        value: 5200000,
        warrantyUntil: '2029-01-10'
      },
      {
        id: 'item-microwave',
        roomId: 'room-kitchen',
        name: 'Horno Microondas Empotrado',
        category: 'appliances',
        value: 950000,
        warrantyUntil: '2026-11-20'
      },
      {
        id: 'item-ac-unit1',
        roomId: 'room-bedroom1',
        name: 'Aire Acondicionado Inverter 12k',
        category: 'appliances',
        value: 2100000,
        warrantyUntil: '2027-04-18'
      },
      {
        id: 'item-ac-unit2',
        roomId: 'room-bedroom2',
        name: 'Aire Acondicionado MiniSplit',
        category: 'appliances',
        value: 1800000,
        warrantyUntil: '2026-09-05'
      },
      {
        id: 'item-desk',
        roomId: 'room-studio',
        name: 'Escritorio de Madera Ergonómico',
        category: 'furniture',
        value: 1200000
      },
      {
        id: 'item-water-heater',
        roomId: 'room-kitchen',
        name: 'Calentador de Agua a Gas',
        category: 'infrastructure',
        value: 1400000,
        warrantyUntil: '2028-03-25'
      }
    ],
    maintenance: [
      {
        id: 'maint-fridge',
        itemId: 'item-refrigerator',
        type: 'Limpieza Filtro Nevera',
        interval_days: 180,
        lastDone: '2026-01-10',
        nextDue: '2026-07-09'
      },
      {
        id: 'maint-ac-1',
        itemId: 'item-ac-unit1',
        type: 'Mantenimiento Aire Acondicionado',
        interval_days: 90,
        lastDone: '2026-04-01',
        nextDue: '2026-06-30'
      },
      {
        id: 'maint-heater',
        itemId: 'item-water-heater',
        type: 'Revisión Técnica Calentador',
        interval_days: 365,
        lastDone: '2026-02-15',
        nextDue: '2027-02-15'
      },
      {
        id: 'maint-garage',
        itemId: 'item-electric-door',
        type: 'Lubricación Motores Garaje',
        interval_days: 365,
        lastDone: '2025-12-01',
        nextDue: '2026-12-01'
      }
    ],
    utilities: [
      {
        id: 'util-campestre-water',
        type: 'water',
        provider: 'EMCALI',
        account: '123-water-campestre',
        dueDay: 10,
        budget: 120000
      },
      {
        id: 'util-campestre-energy',
        type: 'energy',
        provider: 'EMCALI',
        account: '456-energy-campestre',
        dueDay: 12,
        budget: 250000
      },
      {
        id: 'util-campestre-gas',
        type: 'gas',
        provider: 'Gases de Occidente',
        account: '789-gas-campestre',
        dueDay: 15,
        budget: 40000
      }
    ],
    taxes: {
      predial: {
        jurisdiction: 'Cali',
        avaluo: 450000000,
        rate_pct: 0.009,
        installments: 4,
        dueDates: ['2026-03-31', '2026-06-30', '2026-09-30', '2026-12-31']
      }
    },
    leases: [
      {
        id: 'lease-campestre-1',
        tenantName: 'Andrés Felipe Mendoza',
        rentAmount: 4200000,
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }
    ]
  },
  {
    id: 'apto-duplex-granada',
    name: 'Apartamento Duplex Granada',
    type: 'apartment',
    location: {
      city: 'Cali',
      comuna: 'Comuna 2',
      estrato: 5,
      geohash: 'd0ybf9v3'
    },
    norms: {
      NSR10_stairs: {
        minWidth_m: 0.9,
        tread_min_mm: 280,
        riser_min_mm: 100,
        riser_max_mm: 180,
        formula: '2R + H = 620-640mm'
      }
    },
    config: {
      wallThickness: 0.15,
      scale: 50,
      plot: {
        width: 10,
        height: 12,
        margin: 100
      },
      colors: {
        blueprint_bg: '#0f172a',
        blueprint_line: '#1e293b',
        blueprint_text: '#f8fafc',
        accent: '#06b6d4',
        accent_muted: 'rgba(6, 182, 212, 0.15)',
        highlight: '#f97316',
        wall_fill: 'rgba(6, 182, 212, 0.25)',
        zone_fill: 'rgba(6, 182, 212, 0.06)',
        selection: '#f97316',
        danger: '#ef4444'
      }
    },
    floors: [
      {
        id: 'duplex-f1',
        name: 'PISO PRINCIPAL',
        height_m: 2.7,
        zones: [
          {
            id: 'zone-duplex-living',
            name: 'SALA-COMEDOR',
            x: 0,
            y: 0,
            width: 5,
            height: 6,
            type: 'social',
            color: 'rgba(99, 102, 241, 0.08)'
          },
          {
            id: 'zone-duplex-kitchen',
            name: 'COCINA AMERICANA',
            x: 5,
            y: 0,
            width: 3,
            height: 4,
            type: 'utility',
            color: 'rgba(16, 185, 129, 0.08)'
          }
        ]
      },
      {
        id: 'duplex-f2',
        name: 'MEZZANINE',
        height_m: 2.5,
        zones: [
          {
            id: 'zone-duplex-bedroom',
            name: 'HABITACIÓN PRINCIPAL',
            x: 0,
            y: 0,
            width: 5,
            height: 5,
            type: 'room',
            color: 'rgba(236, 72, 153, 0.08)'
          }
        ]
      }
    ],
    rooms: [
      {
        id: 'room-duplex-living',
        floorId: 'duplex-f1',
        zoneId: 'zone-duplex-living',
        name: 'Área Social',
        area_m2: 30,
        items: []
      },
      {
        id: 'room-duplex-kitchen',
        floorId: 'duplex-f1',
        zoneId: 'zone-duplex-kitchen',
        name: 'Cocina Integral Abierta',
        area_m2: 12,
        items: []
      },
      {
        id: 'room-duplex-bedroom',
        floorId: 'duplex-f2',
        zoneId: 'zone-duplex-bedroom',
        name: 'Dormitorio Principal',
        area_m2: 25,
        items: []
      }
    ],
    items: [
      {
        id: 'item-duplex-tv',
        roomId: 'room-duplex-living',
        name: 'Televisor Smart 4K 55"',
        category: 'electronics',
        value: 1800000,
        warrantyUntil: '2027-05-10'
      },
      {
        id: 'item-duplex-sound',
        roomId: 'room-duplex-living',
        name: 'Equipo de Sonido Bluetooth',
        category: 'electronics',
        value: 800000
      },
      {
        id: 'item-duplex-fridge',
        roomId: 'room-duplex-kitchen',
        name: 'Nevera No Frost Whirlpool',
        category: 'appliances',
        value: 3200000,
        warrantyUntil: '2028-11-15'
      },
      {
        id: 'item-duplex-cooktop',
        roomId: 'room-duplex-kitchen',
        name: 'Cubierta Empotrada Gas',
        category: 'appliances',
        value: 600000,
        warrantyUntil: '2026-12-01'
      },
      {
        id: 'item-duplex-ac',
        roomId: 'room-duplex-bedroom',
        name: 'Aire Acondicionado 9k BTU',
        category: 'appliances',
        value: 1500000,
        warrantyUntil: '2027-10-01'
      },
      {
        id: 'item-duplex-bed',
        roomId: 'room-duplex-bedroom',
        name: 'Cama Queen Ergonómica',
        category: 'furniture',
        value: 2500000
      },
      {
        id: 'item-duplex-sofa',
        roomId: 'room-duplex-living',
        name: 'Sofá Cama Gris',
        category: 'furniture',
        value: 1800000
      },
      {
        id: 'item-duplex-oven',
        roomId: 'room-duplex-kitchen',
        name: 'Horno de Convección',
        category: 'appliances',
        value: 1100000
      },
      {
        id: 'item-duplex-lock',
        roomId: 'room-duplex-living',
        name: 'Cerradura Inteligente Yale',
        category: 'security',
        value: 950000,
        warrantyUntil: '2028-01-20'
      },
      {
        id: 'item-duplex-safe',
        roomId: 'room-duplex-bedroom',
        name: 'Caja Fuerte Digital',
        category: 'security',
        value: 450000
      }
    ],
    maintenance: [
      {
        id: 'maint-duplex-fridge',
        itemId: 'item-duplex-fridge',
        type: 'Limpieza Condensador Nevera',
        interval_days: 365,
        lastDone: '2026-01-20',
        nextDue: '2027-01-20'
      },
      {
        id: 'maint-duplex-ac',
        itemId: 'item-duplex-ac',
        type: 'Limpieza Filtros Aire',
        interval_days: 90,
        lastDone: '2026-03-10',
        nextDue: '2026-06-08'
      },
      {
        id: 'maint-duplex-lock',
        itemId: 'item-duplex-lock',
        type: 'Cambio Baterías Cerradura',
        interval_days: 180,
        lastDone: '2025-11-15',
        nextDue: '2026-05-14'
      },
      {
        id: 'maint-duplex-cooktop',
        itemId: 'item-duplex-cooktop',
        type: 'Mantenimiento Quemadores Gas',
        interval_days: 365,
        lastDone: '2025-10-01',
        nextDue: '2026-10-01'
      }
    ],
    utilities: [
      {
        id: 'util-duplex-water',
        type: 'water',
        provider: 'EMCALI',
        account: '999-water-duplex',
        dueDay: 15,
        budget: 75000
      },
      {
        id: 'util-duplex-energy',
        type: 'energy',
        provider: 'EMCALI',
        account: '888-energy-duplex',
        dueDay: 18,
        budget: 160000
      },
      {
        id: 'util-duplex-internet',
        type: 'internet',
        provider: 'Claro',
        account: '777-internet-duplex',
        dueDay: 5,
        budget: 110000
      }
    ],
    taxes: {
      predial: {
        jurisdiction: 'Cali',
        avaluo: 250000000,
        rate_pct: 0.008,
        installments: 2,
        dueDates: ['2026-03-31', '2026-09-30']
      }
    },
    leases: [
      {
        id: 'lease-duplex-1',
        tenantName: 'Camila Gómez',
        rentAmount: 2200000,
        startDate: '2026-02-01',
        endDate: '2027-01-31'
      }
    ]
  }
];

export function loadDemoProperty(id?: string): Property {
  if (!id) return DEMO_PROPERTIES[0];
  const found = DEMO_PROPERTIES.find((p) => p.id === id);
  return found || DEMO_PROPERTIES[0];
}
