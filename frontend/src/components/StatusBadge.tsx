import React from 'react';

interface StatusBadgeProps {
  status: 'ONLINE' | 'DEGRADED' | 'DOWN' | 'PENDING' | 'PAUSED';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyles = () => {
    switch (status) {
      case 'ONLINE':
        return {
          dotBg: 'bg-emerald-500',
          pingBg: 'bg-emerald-400',
          text: 'ONLINE',
          textColor: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5'
        };
      case 'DEGRADED':
        return {
          dotBg: 'bg-amber-500',
          pingBg: 'bg-amber-400',
          text: 'DEGRADED',
          textColor: 'text-amber-400 border-amber-500/10 bg-amber-500/5'
        };
      case 'DOWN':
        return {
          dotBg: 'bg-rose-500',
          pingBg: 'bg-rose-400',
          text: 'DOWN',
          textColor: 'text-rose-400 border-rose-500/10 bg-rose-500/5 animate-pulse'
        };
      case 'PAUSED':
        return {
          dotBg: 'bg-zinc-500',
          pingBg: 'bg-zinc-400',
          text: 'PAUSED',
          textColor: 'text-zinc-400 border-zinc-800 bg-zinc-900/40'
        };
      default:
        return {
          dotBg: 'bg-zinc-600',
          pingBg: 'bg-zinc-500',
          text: 'PENDING',
          textColor: 'text-zinc-500 border-zinc-800 bg-zinc-900/40'
        };
    }
  };

  const styles = getBadgeStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border select-none ${styles.textColor}`}>
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'PAUSED' && status !== 'PENDING' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.pingBg}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dotBg}`}></span>
      </span>
      {styles.text}
    </span>
  );
};
export default StatusBadge;
