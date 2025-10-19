import { Scissors } from 'lucide-react';

interface LogoProps {
  size?: 'small' | 'large';
  className?: string;
}

export function Logo({ size = 'large', className = '' }: LogoProps) {
  const isLarge = size === 'large';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <span 
          className={`${isLarge ? 'text-5xl md:text-6xl' : 'text-2xl'} tracking-tight`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          IMPERIAL<span className="text-accent">cut</span>
        </span>
        <Scissors 
          className={`${isLarge ? 'w-5 h-5 md:w-6 md:h-6' : 'w-4 h-4'} text-accent absolute -top-2 -right-6 rotate-45`}
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}
