import React from 'react';

interface SparklineChartProps {
  data: Array<{ latency: number; status: string }>;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <span className="text-[10px] text-zinc-600 font-mono tracking-wider">NO TELEMETRY</span>;
  }

  const width = 130;
  const height = 28;
  const latencies = data.map((d) => d.latency);
  const max = Math.max(...latencies, 400);
  const min = Math.min(...latencies, 0);

  // Generate points for SVG path
  const points = data.map((d, idx) => {
    const x = (idx / (data.length - 1 || 1)) * width;
    const y = height - ((d.latency - min) / (max - min || 1)) * (height - 4) - 2;
    return { x, y };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ') 
    : '';

  const areaPathD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z` 
    : '';

  const isDegraded = data.some((d) => d.status === 'DEGRADED');
  const isDown = data.some((d) => d.status === 'DOWN');
  const strokeColor = isDown ? '#f43f5e' : isDegraded ? '#d97706' : '#10b981';
  
  // Random gradient ID to prevent collisions on multiple cards
  const gradientId = React.useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, [data]);

  return (
    <div className="flex items-center select-none">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Closed path area gradient fill */}
        {areaPathD && (
          <path d={areaPathD} fill={`url(#${gradientId})`} className="transition-all duration-300" />
        )}

        {/* Outer polyline path */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}
        
        {/* Last data point glowing dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2"
            fill={strokeColor}
            className="transition-all duration-300"
          />
        )}
      </svg>
    </div>
  );
};
export default SparklineChart;
