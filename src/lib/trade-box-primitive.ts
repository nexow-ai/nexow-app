/**
 * lightweight-charts v5 Series Primitive that draws trade boxes
 * (entry→exit range with SL/TP dashed lines) directly on the canvas.
 *
 * One primitive handles ALL trades — no extra series needed.
 */

import type {
  ISeriesPrimitive,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  PrimitivePaneViewZOrder,
  SeriesAttachedParameter,
  Time,
  IChartApiBase,
  ISeriesApi,
  SeriesType,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

// ── Trade shape ─────────────────────────────────────────────────────

export interface TradeBox {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  direction: "buy" | "sell";
  isWin: boolean;
}

// ── Renderer ────────────────────────────────────────────────────────

interface RenderItem {
  x1: number;
  x2: number;
  yEntry: number;
  ySL: number;
  yTP: number;
  direction: "buy" | "sell";
  isWin: boolean;
}

class TradeBoxRenderer implements IPrimitivePaneRenderer {
  private _items: RenderItem[];
  constructor(items: RenderItem[]) {
    this._items = items;
  }

  draw(target: CanvasRenderingTarget2D): void {
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const t of this._items) {
        const x1 = Math.min(t.x1, t.x2);
        const x2 = Math.max(t.x1, t.x2);
        const w = x2 - x1;
        if (w < 1) continue;

        const yTop = Math.min(t.ySL, t.yTP);
        const yBot = Math.max(t.ySL, t.yTP);

        // Filled background from SL to TP
        ctx.fillStyle = t.isWin
          ? "rgba(16, 185, 129, 0.06)"
          : "rgba(239, 68, 68, 0.06)";
        ctx.fillRect(x1, yTop, w, yBot - yTop);

        // Entry line (solid, thicker)
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.strokeStyle = t.direction === "buy" ? "rgba(59, 130, 246, 0.6)" : "rgba(249, 115, 22, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(x1, t.yEntry);
        ctx.lineTo(x2, t.yEntry);
        ctx.stroke();

        // SL line (dashed red)
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 1;
        ctx.moveTo(x1, t.ySL);
        ctx.lineTo(x2, t.ySL);
        ctx.stroke();

        // TP line (dashed green)
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
        ctx.lineWidth = 1;
        ctx.moveTo(x1, t.yTP);
        ctx.lineTo(x2, t.yTP);
        ctx.stroke();

        ctx.setLineDash([]);
      }
    });
  }
}

// ── PaneView ────────────────────────────────────────────────────────

class TradeBoxPaneView implements IPrimitivePaneView {
  private _source: TradeBoxPrimitive;
  private _items: RenderItem[] = [];

  constructor(source: TradeBoxPrimitive) {
    this._source = source;
  }

  zOrder(): PrimitivePaneViewZOrder {
    return "bottom";
  }

  update(): void {
    const { chart, series, trades } = this._source;
    if (!chart || !series) { this._items = []; return; }

    const timeScale = chart.timeScale();
    const items: RenderItem[] = [];

    for (const t of trades) {
      const x1 = timeScale.timeToCoordinate(t.entryTime as unknown as Time);
      const x2 = timeScale.timeToCoordinate(t.exitTime as unknown as Time);
      if (x1 === null || x2 === null) continue;

      const yEntry = series.priceToCoordinate(t.entryPrice);
      const ySL = series.priceToCoordinate(t.slPrice);
      const yTP = series.priceToCoordinate(t.tpPrice);
      if (yEntry === null || ySL === null || yTP === null) continue;

      items.push({ x1, x2, yEntry, ySL, yTP, direction: t.direction, isWin: t.isWin });
    }

    this._items = items;
  }

  renderer(): IPrimitivePaneRenderer | null {
    return this._items.length > 0 ? new TradeBoxRenderer(this._items) : null;
  }
}

// ── Primitive ───────────────────────────────────────────────────────

export class TradeBoxPrimitive implements ISeriesPrimitive<Time> {
  chart: IChartApiBase<Time> | null = null;
  series: ISeriesApi<SeriesType, Time> | null = null;
  trades: TradeBox[] = [];

  private _requestUpdate: (() => void) | null = null;
  private _paneView: TradeBoxPaneView;

  constructor(trades: TradeBox[] = []) {
    this.trades = trades;
    this._paneView = new TradeBoxPaneView(this);
  }

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this.chart = param.chart;
    this.series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
    this._requestUpdate = null;
  }

  updateAllViews(): void {
    this._paneView.update();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView];
  }

  setTrades(trades: TradeBox[]): void {
    this.trades = trades;
    this._requestUpdate?.();
  }
}
