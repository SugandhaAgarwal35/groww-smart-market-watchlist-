import React from "react";

interface MiniSparklineProps {
  data: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  isPositive,
  width = 96,
  height = 32,
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="opacity-20" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 3;
  const usableHeight = height - padding * 2;
  const usableWidth = width - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * usableWidth;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  const strokeColor = isPositive ? "#00D09C" : "#EB5B3C";
  const gradId = `spark-${isPositive ? "up" : "down"}-${Math.floor(Math.random() * 100000)}`;

  const lastPoint = points[points.length - 1]!.split(",");
  const lastX = Number(lastPoint[0]);
  const lastY = Number(lastPoint[1]);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      {/* Gradient Fill */}
      <path d={areaD} fill={`url(#${gradId})`} />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Real-time Ticking Head Pulse */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={strokeColor} />
      <circle
        cx={lastX}
        cy={lastY}
        r="4.5"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1"
        className="animate-ping"
        style={{ transformOrigin: `${lastX}px ${lastY}px` }}
      />
    </svg>
  );
};
