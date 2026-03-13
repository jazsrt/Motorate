export const VEHICLE_TRIMS: Record<string, Record<string, Record<number, string[]>>> = {
  'Toyota': {
    'Camry': {
      2024: ['LE', 'SE', 'SE Nightshade', 'XLE', 'XSE', 'TRD'],
      2023: ['LE', 'SE', 'SE Nightshade', 'XLE', 'XSE', 'TRD'],
      2022: ['LE', 'SE', 'SE Nightshade', 'XLE', 'XSE', 'TRD'],
    },
    'Corolla': {
      2024: ['L', 'LE', 'SE', 'XLE', 'XSE', 'Hybrid LE', 'Hybrid SE'],
      2023: ['L', 'LE', 'SE', 'XLE', 'XSE', 'Hybrid LE', 'Hybrid SE'],
      2022: ['L', 'LE', 'SE', 'XLE', 'XSE', 'Hybrid LE', 'Hybrid SE'],
    },
    'RAV4': {
      2024: ['LE', 'XLE', 'XLE Premium', 'Adventure', 'TRD Off-Road', 'Limited', 'Prime SE', 'Prime XSE'],
      2023: ['LE', 'XLE', 'XLE Premium', 'Adventure', 'TRD Off-Road', 'Limited', 'Prime SE', 'Prime XSE'],
      2022: ['LE', 'XLE', 'XLE Premium', 'Adventure', 'TRD Off-Road', 'Limited', 'Prime SE', 'Prime XSE'],
    },
    'Tacoma': {
      2024: ['SR', 'SR5', 'TRD Sport', 'TRD Off-Road', 'Limited', 'TRD Pro'],
      2023: ['SR', 'SR5', 'TRD Sport', 'TRD Off-Road', 'Limited', 'TRD Pro'],
      2022: ['SR', 'SR5', 'TRD Sport', 'TRD Off-Road', 'Limited', 'TRD Pro'],
    },
  },
  'Honda': {
    'Civic': {
      2024: ['LX', 'Sport', 'EX', 'Touring', 'Si', 'Type R'],
      2023: ['LX', 'Sport', 'EX', 'Touring', 'Si', 'Type R'],
      2022: ['LX', 'Sport', 'EX', 'Touring', 'Si'],
    },
    'Accord': {
      2024: ['LX', 'Sport', 'EX-L', 'Touring', 'Hybrid Sport', 'Hybrid EX-L'],
      2023: ['LX', 'Sport', 'EX-L', 'Touring', 'Hybrid Sport', 'Hybrid EX-L'],
      2022: ['LX', 'Sport', 'EX-L', 'Touring', 'Hybrid EX-L'],
    },
    'CR-V': {
      2024: ['LX', 'EX', 'EX-L', 'Sport', 'Sport Touring', 'Hybrid Sport', 'Hybrid Sport Touring'],
      2023: ['LX', 'EX', 'EX-L', 'Sport', 'Sport Touring', 'Hybrid Sport', 'Hybrid Sport Touring'],
      2022: ['LX', 'EX', 'EX-L', 'Touring', 'Hybrid EX', 'Hybrid EX-L', 'Hybrid Touring'],
    },
  },
  'Ford': {
    'F-150': {
      2024: ['XL', 'STX', 'XLT', 'Lariat', 'King Ranch', 'Platinum', 'Limited', 'Tremor', 'Raptor'],
      2023: ['XL', 'STX', 'XLT', 'Lariat', 'King Ranch', 'Platinum', 'Limited', 'Tremor', 'Raptor'],
      2022: ['XL', 'STX', 'XLT', 'Lariat', 'King Ranch', 'Platinum', 'Limited', 'Tremor', 'Raptor'],
    },
    'Mustang': {
      2024: ['EcoBoost', 'EcoBoost Premium', 'GT', 'GT Premium', 'Mach 1', 'Dark Horse'],
      2023: ['EcoBoost', 'EcoBoost Premium', 'GT', 'GT Premium', 'Mach 1'],
      2022: ['EcoBoost', 'EcoBoost Premium', 'GT', 'GT Premium', 'Mach 1'],
    },
    'Explorer': {
      2024: ['Base', 'XLT', 'Limited', 'ST', 'Platinum', 'King Ranch'],
      2023: ['Base', 'XLT', 'Limited', 'ST', 'Platinum', 'King Ranch'],
      2022: ['Base', 'XLT', 'Limited', 'ST', 'Platinum', 'King Ranch'],
    },
  },
  'Chevrolet': {
    'Silverado': {
      2024: ['WT', 'Custom', 'LT', 'RST', 'LTZ', 'High Country', 'ZR2'],
      2023: ['WT', 'Custom', 'LT', 'RST', 'LTZ', 'High Country', 'ZR2'],
      2022: ['WT', 'Custom', 'LT', 'RST', 'LTZ', 'High Country'],
    },
    'Camaro': {
      2024: ['1LT', '2LT', '3LT', '1SS', '2SS', 'ZL1'],
      2023: ['1LT', '2LT', '3LT', '1SS', '2SS', 'ZL1'],
      2022: ['1LT', '2LT', '3LT', '1SS', '2SS', 'ZL1'],
    },
    'Tahoe': {
      2024: ['LS', 'LT', 'RST', 'Z71', 'Premier', 'High Country'],
      2023: ['LS', 'LT', 'RST', 'Z71', 'Premier', 'High Country'],
      2022: ['LS', 'LT', 'RST', 'Z71', 'Premier', 'High Country'],
    },
  },
};

export function getTrimsForVehicle(make: string, model: string, year: number): string[] {
  const makeTrims = VEHICLE_TRIMS[make];
  if (makeTrims) {
    const modelTrims = makeTrims[model];
    if (modelTrims) {
      const yearTrims = modelTrims[year];
      if (yearTrims) {
        return yearTrims;
      }
    }
  }
  return ['Base', 'Standard', 'Sport', 'Premium', 'Limited', 'Luxury', 'Platinum', 'Custom'];
}

export function getAvailableYears(make: string, model: string): number[] {
  const makeTrims = VEHICLE_TRIMS[make];
  if (!makeTrims) return [];
  const modelTrims = makeTrims[model];
  if (!modelTrims) return [];
  return Object.keys(modelTrims).map(Number).sort((a, b) => b - a);
}
