"use client";

import { cn } from "./utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
    children: ReactNode;
    showRadialGradient?: boolean;
}

export const AuroraBackground = ({
    className,
    children,
    showRadialGradient = true,
    ...props
}: AuroraBackgroundProps) => {
    return (
        <main>
            <style>{`
        .aurora-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .aurora-layer > .aurora-inner {
          position: absolute;
          inset: -10px;
          opacity: 0.5;
          filter: blur(10px) invert(1);
          background-image:
            repeating-linear-gradient(100deg, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 7%, transparent 10%, transparent 12%, rgba(255,255,255,1) 16%),
            repeating-linear-gradient(100deg, #3b82f6 10%, #a78bfa 15%, #60a5fa 20%, #c7b2ff 25%, #60a5fa 30%);
          background-size: 300% 200%, 300% 200%;
          background-position: 50% 50%, 50% 50%;
          mix-blend-mode: difference;
          will-change: transform;
          animation: aurora 60s linear infinite;
        }
        .aurora-layer.masked > .aurora-inner {
          mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
        }
        @keyframes aurora {
          from { background-position: 50% 50%, 50% 50%; }
          to { background-position: 350% 50%, 350% 50%; }
        }
      `}</style>
            <div
                className={cn(
                    "relative flex flex-col  h-[100vh] items-center justify-center bg-zinc-50 dark:bg-zinc-900  text-slate-950 transition-bg",
                    className
                )}
                {...props}>
                <div
                    className={cn(
                        "absolute inset-0 overflow-hidden aurora-layer",
                        showRadialGradient ? "masked" : ""
                    )}>
                    <div className="aurora-inner" />
                </div>
                {children}
            </div>
        </main>
    );
};
