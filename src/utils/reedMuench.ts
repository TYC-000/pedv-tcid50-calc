
export interface DilutionData {
  dilution: string; // e.g., "10^-4", "1:10000", "10-4"
  positiveWells: number;
  totalWells: number;
}

export interface CalculationResult {
  tcid50PerMl: number | null;
  logTcid50PerMl: number | null;
  error?: string;
  details?: {
    pd: number;
    dilutionAbove50: number;
    percentAbove50: number;
    percentBelow50: number;
  };
}

// Helper to parse dilution string to log10 value (e.g., "10^-4" -> -4)
function parseDilution(dilution: string): number | null {
  // Remove spaces
  const clean = dilution.replace(/\s/g, '').toLowerCase();
  
  // Handle "10^-4", "10-4", "10e-4"
  const tenPowerMatch = clean.match(/10\^?(-?\d+)/);
  if (tenPowerMatch) return parseInt(tenPowerMatch[1], 10);

  // Handle "1:1000"
  const ratioMatch = clean.match(/1:(\d+)/);
  if (ratioMatch) return -Math.log10(parseInt(ratioMatch[1], 10));

  // Handle just numbers like "-4"
  if (/^-?\d+$/.test(clean)) return parseInt(clean, 10);

  return null;
}

export function calculateReedMuench(data: DilutionData[], inoculumVolumeMl: number = 0.1): CalculationResult {
  // 1. Sort data by dilution (most concentrated to least concentrated, i.e., -1, -2, -3...)
  const parsedData = data.map(d => ({
    ...d,
    logDilution: parseDilution(d.dilution)
  })).filter(d => d.logDilution !== null) as (DilutionData & { logDilution: number })[];

  if (parsedData.length < 2) {
    return { tcid50PerMl: null, logTcid50PerMl: null, error: "Insufficient data points. Need at least 2 dilutions." };
  }

  // Sort descending (e.g., -3, -4, -5) - higher concentration first
  parsedData.sort((a, b) => b.logDilution - a.logDilution);

  // 2. Calculate accumulated values
  // Accumulate positives from bottom (highest dilution/lowest conc) to top
  // Accumulate negatives from top (lowest dilution/highest conc) to bottom
  
  const n = parsedData.length;
  const accumulatedPositives = new Array(n).fill(0);
  const accumulatedNegatives = new Array(n).fill(0);

  // Accumulate Positives (from most dilute to least dilute)
  let accPos = 0;
  for (let i = n - 1; i >= 0; i--) {
    accPos += parsedData[i].positiveWells;
    accumulatedPositives[i] = accPos;
  }

  // Accumulate Negatives (from least dilute to most dilute)
  let accNeg = 0;
  for (let i = 0; i < n; i++) {
    const negatives = parsedData[i].totalWells - parsedData[i].positiveWells;
    accNeg += negatives;
    accumulatedNegatives[i] = accNeg;
  }

  // 3. Calculate Percent Infected
  const percentInfected = parsedData.map((_, i) => {
    const total = accumulatedPositives[i] + accumulatedNegatives[i];
    return total === 0 ? 0 : (accumulatedPositives[i] / total) * 100;
  });

  // 4. Check for endpoints (100% and 0%)
  // Ideally, we need a point >= 50% and a point < 50%
  let indexAbove50 = -1;
  let indexBelow50 = -1;

  for (let i = 0; i < n - 1; i++) {
    if (percentInfected[i] >= 50 && percentInfected[i+1] < 50) {
      indexAbove50 = i;
      indexBelow50 = i + 1;
      break;
    }
  }

  if (indexAbove50 === -1) {
    return { 
      tcid50PerMl: null, 
      logTcid50PerMl: null, 
      error: "Data does not cross the 50% endpoint. Ensure you have dilutions with >50% and <50% infection rates." 
    };
  }

  // 5. Calculate Proportionate Distance (PD)
  const pctAbove = percentInfected[indexAbove50];
  const pctBelow = percentInfected[indexBelow50];
  
  // PD = (% positive above 50% - 50%) / (% positive above 50% - % positive below 50%)
  const pd = (pctAbove - 50) / (pctAbove - pctBelow);

  // 6. Calculate TCID50
  // LogID50 = (Log dilution above 50%) - (PD * Log dilution factor)
  // Dilution factor is the difference between log dilutions (usually 1 for 10-fold)
  // Since we sorted descending (-3, -4), the factor is positive distance?
  // Formula: Endpoint = Dilution_above_50% - (PD * log_dilution_factor)
  // Example: Above is 10^-3, Below is 10^-4. Factor is 1 (log10).
  // Endpoint = -3 - (PD * 1)
  
  const logDilutionAbove = parsedData[indexAbove50].logDilution;
  const logDilutionBelow = parsedData[indexBelow50].logDilution;
  const dilutionFactor = Math.abs(logDilutionAbove - logDilutionBelow); // Should be 1 for 10-fold

  // The formula usually subtracts because we are going towards the lower concentration (more negative log)
  // If we are at -3 (100%) and go towards -4 (0%), we are subtracting.
  const logTcid50Endpoint = logDilutionAbove - (pd * dilutionFactor);

  // Convert to TCID50 per mL
  // The calculated endpoint is the dilution that gives 50% infection in the inoculum volume.
  // Titer = 1 / Endpoint
  // Titer per volume = 10^(-logEndpoint)
  // Titer per mL = Titer per volume / volume_mL
  
  // Example: Endpoint is 10^-4.5. Titer is 10^4.5 per 0.1 mL.
  // Per mL = 10^4.5 * (1/0.1) = 10^4.5 * 10 = 10^5.5
  
  const logTiterPerVolume = -logTcid50Endpoint;
  const logVolumeFactor = -Math.log10(inoculumVolumeMl); // e.g. -log10(0.1) = -(-1) = 1
  const logTcid50PerMl = logTiterPerVolume + logVolumeFactor;
  
  const tcid50PerMl = Math.pow(10, logTcid50PerMl);

  return {
    tcid50PerMl,
    logTcid50PerMl,
    details: {
      pd,
      dilutionAbove50: logDilutionAbove,
      percentAbove50: pctAbove,
      percentBelow50: pctBelow
    }
  };
}
