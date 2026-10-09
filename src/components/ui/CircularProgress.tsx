import React from 'react';

export interface CircularProgressProps {
  remainingMs: number;
  totalMs: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  isBreak?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  remainingMs,
  totalMs,
  size = 160,
  strokeWidth = 8,
  className = '',
  label,
  isBreak = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const validTotal = Math.max(1, totalMs);
  const validRemaining = Math.max(0, Math.min(validTotal, remainingMs));
  const progress = (validTotal - validRemaining) / validTotal;
  const strokeDashoffset = circumference - progress * circumference;

  const totalSecs = Math.ceil(validRemaining / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const formattedTime =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const strokeColor = isBreak ? '#10b981' : '#6366f1';

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#27272a"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center select-none">
        <span className="font-mono text-2xl font-bold tracking-tight text-white">
          {formattedTime}
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
