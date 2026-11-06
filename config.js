// Configuration data for Resonant blade configurator
// All prices, weights and layer names are samples, editable in admin.

export const config = {
  modelName: 'PALIS Flared',
  subtitle: 'Built from your Flared.step file and your photographs. Prices, weights and layer names are samples, editable in admin.',
  sampleNotice: 'Prices, weights and layer names are samples',

  // Blade models
  models: [
    { id: 'opus1', name: 'OPUS 1', available: false, lockReason: 'Needs your Fusion 360 file' },
    { id: 'palis', name: 'PALIS', available: true, desc: 'Sample base price', price: 150, weight: 72 },
    { id: 'wavec', name: 'WAVE C', available: false, lockReason: 'Needs your Fusion 360 file' },
    { id: 'pulsec', name: 'PULSE C', available: false, lockReason: 'Needs your Fusion 360 file' }
  ],
  defaultModel: 'palis',

  // Handle shapes
  shapes: [
    { id: 'flared', name: 'Flared', available: true },
    { id: 'straight', name: 'Straight', available: false, lockReason: 'Needs your Fusion 360 file' },
    { id: 'anatomical', name: 'Anatomical', available: false, lockReason: 'Needs your Fusion 360 file' },
    { id: 'penhold', name: 'Penhold', available: false, lockReason: 'Needs your Fusion 360 file' }
  ],
  defaultShape: 'flared',

  // Handle designs
  designs: [
    {
      id: 1,
      name: 'Handle 1',
      desc: 'Dark wood, PALIS / OFF label',
      price: 25,
      weight: 12,
      swatchClass: 'swatch-h1',
      photo: 'assets/photo-handle1.jpg'
    },
    {
      id: 2,
      name: 'Handle 2',
      desc: 'Padauk with light stripes, oak end cap',
      price: 40,
      weight: 14,
      swatchClass: 'swatch-h2',
      photo: 'assets/photo-handle2.jpg'
    }
  ],
  defaultDesign: 1,

  // Internal structures
  structures: [
    { id: 'solid', name: 'Solid', desc: 'Heavy', price: 0, weight: 8 },
    { id: 'partial', name: 'Partly hollow', desc: 'Medium', price: 15, weight: 4 },
    { id: 'max', name: 'Max hollow', desc: 'Light', price: 30, weight: 0 }
  ],
  defaultStructure: 'solid',

  // Surface finishes
  finishes: [
    { id: 'oiled', name: 'Oiled', price: 10, weight: 1 },
    { id: 'untreated', name: 'Untreated', price: 0, weight: 0 }
  ],
  defaultFinish: 'oiled',

  // National flag inlay on handle
  flags: [
    { id: 'ch', name: 'Switzerland', file: 'assets/flag-ch.svg' },
    { id: 'br', name: 'Brazil', file: 'assets/flag-br.svg' },
    { id: 'de', name: 'Germany', file: 'assets/flag-de.svg' },
    { id: 'fr', name: 'France', file: 'assets/flag-fr.svg' },
    { id: 'it', name: 'Italy', file: 'assets/flag-it.svg' }
  ],
  flagPrice: 8,
  flagWeight: 0,
  defaultFlag: 'br',

  // Model-name plate
  platePrice: 6,
  plateWeight: 0,
  defaultPlate: true,

  // Custom serial engraving
  engravingPrice: 12,
  engravingWeight: 0,
  engravingMaxLength: 12,
  defaultEngraving: '',

  // Sample blade layers for exploded view
  layers: [
    { name: 'Face veneer', mm: 0.6 },
    { name: 'Inner veneer', mm: 0.8 },
    { name: 'Core', mm: 3.2 },
    { name: 'Inner veneer', mm: 0.8 },
    { name: 'Face veneer', mm: 0.6 }
  ],

  // Weight tolerance
  weightTolerance: '± 5 g',

  // Steps definition for the ring rail
  steps: [
    { id: 'blade', name: 'Blade' },
    { id: 'handle', name: 'Handle' },
    { id: 'inside', name: 'Inside' },
    { id: 'finish', name: 'Finish' },
    { id: 'personal', name: 'Personal' },
    { id: 'build', name: 'Your blade' }
  ],

  // Camera views
  views: [
    { id: 'three', label: '3/4' },
    { id: 'front', label: 'Front' },
    { id: 'back', label: 'Back' },
    { id: 'edge', label: 'Edge' },
    { id: 'handle', label: 'Handle' },
    { id: 'butt', label: 'Handle end' },
    { id: 'layers', label: 'Layers', isToggle: true },
    { id: 'spin', label: 'Spin', isToggle: true }
  ],

  // Snapshot options
  snapshotSizes: [2048, 4096],
  snapshotBackgrounds: [
    { id: 'transparent', label: 'Transparent' },
    { id: 'white', label: 'White' }
  ]
};

// State factory
export function getDefaultState() {
  return {
    model: config.defaultModel,
    shape: config.defaultShape,
    handle: config.defaultDesign,
    structure: config.defaultStructure,
    finish: config.defaultFinish,
    flag: config.defaultFlag,
    plate: config.defaultPlate,
    engraving: config.defaultEngraving
  };
}

// Compatibility rules
export const rules = {
  isStructureDisabled(structureId, state) {
    if (structureId === 'max' && state.handle === 2) {
      return 'Not available with Handle 2 (sample rule)';
    }
    return null;
  },

  normalize(state) {
    let warning = null;
    const nextState = { ...state };

    if (nextState.handle === 2 && nextState.structure === 'max') {
      nextState.structure = 'partial';
      warning = 'Max hollow is not available with Handle 2. Moved to Partly hollow (sample rule).';
    }

    return { state: nextState, warning };
  }
};

// Calculations
export function calculateTotals(state) {
  let price = 0;
  let weight = 0;
  const items = [];

  // Blade model
  const model = config.models.find(m => m.id === state.model) || config.models.find(m => m.id === 'palis');
  price += model.price || 150;
  weight += model.weight || 72;
  items.push({
    label: `${model.name} Blade`,
    desc: 'Sample base price',
    price: model.price || 150,
    weight: model.weight || 72
  });

  // Handle design
  const design = config.designs.find(d => d.id === state.handle) || config.designs[0];
  price += design.price;
  weight += design.weight;
  items.push({
    label: design.name,
    desc: design.desc,
    price: design.price,
    weight: design.weight
  });

  // Internal structure
  const structure = config.structures.find(s => s.id === state.structure) || config.structures[0];
  price += structure.price;
  weight += structure.weight;
  items.push({
    label: `${structure.name} structure`,
    desc: structure.desc,
    price: structure.price,
    weight: structure.weight
  });

  // Finish
  const finish = config.finishes.find(f => f.id === state.finish) || config.finishes[0];
  price += finish.price;
  weight += finish.weight;
  items.push({
    label: `${finish.name} finish`,
    desc: '',
    price: finish.price,
    weight: finish.weight
  });

  // Plate
  if (state.plate) {
    price += config.platePrice;
    weight += config.plateWeight;
    items.push({
      label: 'Model-name plate',
      desc: '',
      price: config.platePrice,
      weight: config.plateWeight
    });
  }

  // Flag
  if (state.flag) {
    const flagObj = config.flags.find(f => f.id === state.flag);
    const flagName = flagObj ? flagObj.name : state.flag.toUpperCase();
    price += config.flagPrice;
    weight += config.flagWeight;
    items.push({
      label: 'Flag on the handle',
      desc: flagName,
      price: config.flagPrice,
      weight: config.flagWeight
    });
  }

  // Engraving
  if (state.engraving && state.engraving.trim().length > 0) {
    price += config.engravingPrice;
    weight += config.engravingWeight;
    items.push({
      label: 'Engraving in the serial-number area',
      desc: `"${state.engraving.trim()}"`,
      price: config.engravingPrice,
      weight: config.engravingWeight
    });
  }

  return { price, weight, items };
}
