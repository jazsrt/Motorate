export interface VehicleSpecs {
  horsepower?: number;
  engine?: string;
  displacement?: string;
  cylinders?: number;
  drivetrain?: string;
  transmission?: string;
  fuelType?: string;
}

/**
 * Parse decoded NHTSA specs from vin_raw_data JSONB column.
 * vin_raw_data is a flat Record<string, string> of NHTSA variable names to values.
 * Returns null if no useful data found.
 */
export function parseVehicleSpecs(vinRawData: unknown): VehicleSpecs | null {
  if (!vinRawData || typeof vinRawData !== 'object') return null;

  const data = vinRawData as Record<string, string>;

  function clean(key: string): string | undefined {
    const val = data[key];
    if (!val || val === 'Not Applicable' || val.trim() === '' || val === 'null' || val === '0') return undefined;
    return val.trim();
  }

  const displacementRaw = clean('DisplacementL');
  const cylindersRaw = clean('EngineCylinders');
  const hpRaw = clean('EngineHP');
  const config = clean('EngineConfiguration');

  const specs: VehicleSpecs = {};

  if (hpRaw) {
    const hp = Math.round(parseFloat(hpRaw));
    if (hp > 0) specs.horsepower = hp;
  }

  if (cylindersRaw) {
    const cyl = parseInt(cylindersRaw, 10);
    if (cyl > 0) specs.cylinders = cyl;
  }

  if (displacementRaw) {
    const disp = parseFloat(displacementRaw);
    if (disp > 0) specs.displacement = `${disp.toFixed(1)}L`;
  }

  // Build engine string: "1.8L 4-Cyl 132hp" or "5.0L V8 460hp"
  const engineParts: string[] = [];
  if (specs.displacement) engineParts.push(specs.displacement);
  if (specs.cylinders) {
    engineParts.push(config ? `${config}${specs.cylinders}` : `${specs.cylinders}-Cyl`);
  }
  if (specs.horsepower) engineParts.push(`${specs.horsepower}hp`);
  if (engineParts.length > 0) specs.engine = engineParts.join(' ');

  const drivetrain = clean('DriveType');
  if (drivetrain) specs.drivetrain = drivetrain;

  const transmission = clean('TransmissionStyle');
  if (transmission) specs.transmission = transmission;

  const fuelType = clean('FuelTypePrimary');
  if (fuelType) specs.fuelType = fuelType;

  const fieldCount = Object.keys(specs).filter(k => k !== 'engine').length;
  return fieldCount >= 1 ? specs : null;
}
