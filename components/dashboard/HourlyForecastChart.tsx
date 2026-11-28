"use client";

import { MaterialCircularProgress } from "@/components/MaterialLoader";
import { getHeroRiskMeta } from "@/lib/airQuality";
import type { HourlyTimelinePoint, RiskLevel } from "@/types/airPlan";

interface HourlyForecastChartProps {
  locationName?: string;
  riskLevel?: RiskLevel;
  hourlyTimeline: HourlyTimelinePoint[];
  timelineMetric: "aqi" | "pm25";
  onChangeMetric: (metric: "aqi" | "pm25") => void;
  hoveredHourIdx: number | null;
  onHoverHour: (idx: number | null) => void;
  isLoading: boolean;
}

export default function HourlyForecastChart({
  locationName,
  riskLevel,
  hourlyTimeline,
  timelineMetric,
  onChangeMetric,
  hoveredHourIdx,
  onHoverHour,
  isLoading,
}: HourlyForecastChartProps) {
  const shortLocation = locationName ? locationName.split(",")[0] : "your location";

  return (
    <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary text-lg">
            show_chart
          </span>
          <div>
            <h3 className="text-xs font-bold text-on-surface">12-Hour Air Quality Timeline</h3>
            <p className="text-xs text-on-surface-variant">
              Live hourly forecast for {shortLocation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-surface-container rounded-full">
          <button
            type="button"
            aria-pressed={timelineMetric === "aqi"}
            onClick={() => onChangeMetric("aqi")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              timelineMetric === "aqi"
                ? "bg-surface-container-lowest text-primary shadow-2xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            US AQI
          </button>
          <button
            type="button"
            aria-pressed={timelineMetric === "pm25"}
            onClick={() => onChangeMetric("pm25")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              timelineMetric === "pm25"
                ? "bg-surface-container-lowest text-primary shadow-2xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            PM2.5 (µg/m³)
          </button>
        </div>
      </div>

      {isLoading && hourlyTimeline.length === 0 ? (
        <div className="h-44 rounded-2xl bg-surface-container-low flex items-center justify-center gap-2 text-xs text-on-surface-variant">
          <MaterialCircularProgress size={18} strokeWidth={5} />
          <span>Loading 12-hour forecast...</span>
        </div>
      ) : hourlyTimeline.length > 0 ? (
        (() => {
          const values = hourlyTimeline.map((pt) =>
            timelineMetric === "aqi" ? pt.aqi : pt.pm25
          );
          const maxVal = Math.max(...values, timelineMetric === "aqi" ? 150 : 60);
          const minVal = Math.max(0, Math.min(...values) - maxVal * 0.15);
          const range = Math.max(1, maxVal - minVal);
          const width = 640;
          const height = 160;
          const padX = 24;
          const padY = 20;
          const chartW = width - padX * 2;
          const chartH = height - padY * 2;

          const coords = hourlyTimeline.map((pt, i) => {
            const val = timelineMetric === "aqi" ? pt.aqi : pt.pm25;
            const x = padX + (i / Math.max(1, hourlyTimeline.length - 1)) * chartW;
            const y = padY + chartH - ((val - minVal) / range) * chartH;
            return { x, y, val, pt };
          });

          const linePath = coords.reduce((acc, point, i, arr) => {
            if (i === 0) return `M ${point.x} ${point.y}`;
            const prev = arr[i - 1];
            const cx = (prev.x + point.x) / 2;
            return `${acc} C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
          }, "");

          const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;
          const activePoint =
            hoveredHourIdx != null && coords[hoveredHourIdx] ? coords[hoveredHourIdx] : coords[0];

          const getPointColor = (aqiVal: number, isNow?: boolean) =>
            isNow && riskLevel
              ? getHeroRiskMeta(riskLevel, aqiVal).hexColor
              : getHeroRiskMeta(undefined, aqiVal).hexColor;

          const bestHour = hourlyTimeline.reduce(
            (best, cur) => (cur.aqi < best.aqi ? cur : best),
            hourlyTimeline[0]
          );
          const peakHour = hourlyTimeline.reduce(
            (peak, cur) => (cur.aqi > peak.aqi ? cur : peak),
            hourlyTimeline[0]
          );
          const ptRisk = getHeroRiskMeta(
            activePoint.pt.isNow ? riskLevel : undefined,
            activePoint.pt.aqi
          );

          return (
            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/70 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: getPointColor(activePoint.pt.aqi, activePoint.pt.isNow),
                    }}
                  />
                  <span className="font-bold text-on-surface">{activePoint.pt.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ptRisk.badgeBg} ${ptRisk.badgeText} ${ptRisk.badgeBorder}`}
                  >
                    {ptRisk.label}
                  </span>
                  <span aria-hidden="true" className="text-on-surface-variant">•</span>
                  <span className="font-semibold text-primary">AQI {activePoint.pt.aqi}</span>
                  <span aria-hidden="true" className="text-on-surface-variant">•</span>
                  <span className="text-on-surface-variant font-medium">
                    PM2.5: {activePoint.pt.pm25} µg/m³
                  </span>
                  <span aria-hidden="true" className="text-on-surface-variant hidden sm:inline">•</span>
                  <span className="text-on-surface-variant font-medium hidden sm:inline">
                    PM10: {activePoint.pt.pm10} µg/m³
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                    Best: {bestHour.label} ({bestHour.aqi})
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-semibold">
                    Peak: {peakHour.label} ({peakHour.aqi})
                  </span>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <svg
                  role="img"
                  aria-label={`12-hour air quality forecast for ${shortLocation}. Best hour is ${bestHour.label} at AQI ${bestHour.aqi}, and peak hour is ${peakHour.label} at AQI ${peakHour.aqi}.`}
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-40 overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="aqTimelineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {[0, 0.5, 1].map((ratio, gIdx) => {
                    const gy = padY + ratio * chartH;
                    const gVal = Math.round(maxVal - ratio * range);
                    return (
                      <g key={gIdx}>
                        <line
                          x1={padX}
                          y1={gy}
                          x2={width - padX}
                          y2={gy}
                          stroke="var(--color-outline-variant)"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={padX - 6}
                          y={gy + 3}
                          textAnchor="end"
                          className="fill-on-surface-variant text-xs"
                        >
                          {gVal}
                        </text>
                      </g>
                    );
                  })}

                  <path d={areaPath} fill="url(#aqTimelineGradient)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {coords.map((c, idx) => {
                    const isHovered = hoveredHourIdx === idx;
                    const dotColor = getPointColor(c.pt.aqi, c.pt.isNow);
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => onHoverHour(idx)}
                        onMouseLeave={() => onHoverHour(null)}
                      >
                        <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                        {isHovered && (
                          <line
                            x1={c.x}
                            y1={padY}
                            x2={c.x}
                            y2={height - padY}
                            stroke="var(--color-primary)"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                            opacity="0.5"
                          />
                        )}
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={isHovered ? 5.5 : 3.5}
                          fill="var(--color-surface-container-lowest)"
                          stroke={dotColor}
                          strokeWidth={isHovered ? 3 : 2}
                          className="transition-all duration-150"
                        />
                        <text
                          x={c.x}
                          y={height - 2}
                          textAnchor="middle"
                          className={`text-xs ${
                            isHovered ? "fill-primary font-bold" : "fill-on-surface-variant"
                          }`}
                        >
                          {idx % 2 === 0 || isHovered ? c.pt.label : ""}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="h-32 rounded-2xl bg-surface-container-low flex items-center justify-center text-xs text-on-surface-variant">
          12-hour forecast unavailable right now.
        </div>
      )}
    </div>
  );
}
