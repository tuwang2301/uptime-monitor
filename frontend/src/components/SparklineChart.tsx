import React from 'react';

interface SparklineChartProps {
  data: Array<{ latency: number; status: string }>;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <span className="text-xs text-gray-500 font-mono">No telemetry data</span>;
  }

  const width = 140;
  const height = 32;
  const latencies = data.map((d) => d.latency);
  const max = Math.max(...latencies, 500);
  const min = Math.min(...latencies, 0);

  const points = data
    .map((d, idx) => {
      const x = (idx / (data.length - 1 || 1)) * width;
      const y = height - ((d.latency - min) / (max - min || 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const isDegraded = data.some((d) => d.status === 'DEGRADED');
  const isDown = data.some((d) => d.status === 'DOWN');
  const strokeColor = isDown ? '#f43f5e' : isDegraded ? '#f59e0b' : '#10b981';

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((d, idx) => {
          const x = (idx / (data.length - 1 || 1)) * width;
          const y = height - ((d.latency - min) / (max - min || 1)) * (height - 6) - 3;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2"
              fill={strokeColor}
              className="hover:r-4 transition-all"
            >
              <title>{`${d.latency}ms (${d.status})`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
};
