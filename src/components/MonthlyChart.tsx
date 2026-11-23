import { useState } from 'react';

export interface MonthlyChartDatum {
  monthKey: string;
  label: string;
  fullLabel: string;
  borrowRecordsCount: number;
  borrowedCopiesCount: number;
  returnedCopiesCount: number;
}

interface MonthlyChartProps {
  data: MonthlyChartDatum[];
  title?: string;
  subtitle?: string;
}

export function MonthlyChart({
  data,
  title = 'Biểu đồ lượt mượn theo tháng',
  subtitle = 'Số phiếu mượn và tổng bản sao được mượn qua từng tháng',
}: MonthlyChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(
    4,
    ...data.map((d) => Math.max(d.borrowedCopiesCount, d.borrowRecordsCount))
  );

  // Nice rounded top tick divisible by 4
  const yMax = Math.ceil(maxVal / 4) * 4;
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const chartHeight = 220;
  const padTop = 18;
  const padBottom = 34;
  const padLeft = 38;
  const padRight = 16;
  const plotHeight = chartHeight - padTop - padBottom;
  const svgWidth = 640;
  const plotWidth = svgWidth - padLeft - padRight;
  const groupWidth = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(26, Math.max(12, groupWidth * 0.28));

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-5 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
            <span>Phiếu mượn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-300" />
            <span>Bản sao mượn</span>
          </div>
        </div>
      </div>

      {/* Hover summary strip (always fixed height, zero layout shift) */}
      <div className="mt-4 flex min-h-7 items-center justify-between border-b border-slate-100 pb-2 text-xs">
        {hoveredItem ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700">
            <span className="font-semibold text-slate-900">{hoveredItem.fullLabel}</span>
            <span className="tabular-nums">
              Phiếu mượn: <strong className="text-blue-700">{hoveredItem.borrowRecordsCount}</strong>
            </span>
            <span className="tabular-nums">
              Bản sao mượn: <strong className="text-blue-600">{hoveredItem.borrowedCopiesCount}</strong>
            </span>
            <span className="tabular-nums">
              Bản sao đã trả: <strong className="text-emerald-700">{hoveredItem.returnedCopiesCount}</strong>
            </span>
          </div>
        ) : (
          <span className="text-slate-400">
            Di chuột vào từng cột tháng để xem số liệu chi tiết
          </span>
        )}
      </div>

      <div className="mt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight}`}
          className="h-56 w-full min-w-[460px] select-none"
          role="img"
          aria-label={title}
        >
          {/* Horizontal gridlines */}
          {ticks.map((t) => {
            const y = padTop + plotHeight - (t / yMax) * plotHeight;
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-mono tabular-nums"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Bars per month */}
          {data.map((d, i) => {
            const centerX = padLeft + groupWidth * i + groupWidth / 2;
            const recH = (d.borrowRecordsCount / yMax) * plotHeight;
            const copyH = (d.borrowedCopiesCount / yMax) * plotHeight;
            const recY = padTop + plotHeight - recH;
            const copyY = padTop + plotHeight - copyH;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.monthKey}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Invisible hover hit area */}
                <rect
                  x={padLeft + groupWidth * i}
                  y={padTop}
                  width={groupWidth}
                  height={plotHeight + padBottom}
                  fill={isHovered ? '#f8fafc' : 'transparent'}
                />

                {/* Borrow records bar */}
                {d.borrowRecordsCount > 0 && (
                  <rect
                    x={centerX - barWidth - 2}
                    y={recY}
                    width={barWidth}
                    height={Math.max(4, recH)}
                    rx={3}
                    fill={isHovered ? '#1d4ed8' : '#2563eb'}
                  />
                )}

                {/* Borrowed copies bar */}
                {d.borrowedCopiesCount > 0 && (
                  <rect
                    x={centerX + 2}
                    y={copyY}
                    width={barWidth}
                    height={Math.max(4, copyH)}
                    rx={3}
                    fill={isHovered ? '#60a5fa' : '#93c5fd'}
                  />
                )}

                {/* Value labels on top when > 0 */}
                {d.borrowRecordsCount > 0 && (
                  <text
                    x={centerX - barWidth / 2 - 2}
                    y={recY - 5}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-mono font-medium tabular-nums"
                  >
                    {d.borrowRecordsCount}
                  </text>
                )}
                {d.borrowedCopiesCount > 0 && (
                  <text
                    x={centerX + barWidth / 2 + 2}
                    y={copyY - 5}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-mono font-medium tabular-nums"
                  >
                    {d.borrowedCopiesCount}
                  </text>
                )}

                {/* X axis label */}
                <text
                  x={centerX}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className={`text-[11px] ${
                    isHovered ? 'fill-blue-700 font-semibold' : 'fill-slate-500'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
