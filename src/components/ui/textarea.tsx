import * as React from "react";

import { cn } from "./utils";

function Textarea({
    className,
    style,
    ...props
}: React.ComponentProps<"textarea">) {
    // default dark input background to mirror the behavior in `Input`
    const defaultStyle: React.CSSProperties = {
        backgroundColor: "rgba(0,0,0,0.6)",
    };

    const mergedStyle = { ...defaultStyle, ...(style as React.CSSProperties) };

    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className
            )}
            style={mergedStyle}
            {...props}
        />
    );
}

export { Textarea };
