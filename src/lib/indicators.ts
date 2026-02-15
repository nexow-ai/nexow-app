/**
 * Technical indicator calculations (pure functions, no dependencies).
 */

export interface OhlcData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

/**
 * Exponential Moving Average.
 */
export function calcEMA(data: OhlcData[], period: number): LinePoint[] {
  if (data.length < period) return [];

  const k = 2 / (period + 1);
  const result: LinePoint[] = [];

  // SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: ema });
  }

  return result;
}

/**
 * Bollinger Bands (SMA-based with standard deviation).
 */
export function calcBollingerBands(
  data: OhlcData[],
  period: number = 20,
  stdDev: number = 2
): { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } {
  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  if (data.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    const sma = sum / period;

    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (data[j].close - sma) ** 2;
    }
    const sd = Math.sqrt(sqSum / period);

    const t = data[i].time;
    upper.push({ time: t, value: sma + stdDev * sd });
    middle.push({ time: t, value: sma });
    lower.push({ time: t, value: sma - stdDev * sd });
  }

  return { upper, middle, lower };
}

/**
 * Relative Strength Index.
 */
export function calcRSI(data: OhlcData[], period: number = 14): LinePoint[] {
  if (data.length < period + 1) return [];

  const result: LinePoint[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  result.push({ time: data[period].time, value: rsi });

  // Smoothed RSI
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const smoothedRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const smoothedRsi = 100 - 100 / (1 + smoothedRs);
    result.push({ time: data[i].time, value: smoothedRsi });
  }

  return result;
}
