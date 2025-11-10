"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch@1.1.3";

import { cn } from "./utils";

function Switch({
    className,
    ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    const [checked, setChecked] = React.useState(props.checked || false);

    React.useEffect(() => {
        setChecked(props.checked || false);
    }, [props.checked]);

    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            {...props}
            style={{
                position: "relative",
                display: "inline-flex",
                height: "18px",
                width: "38px",
                flexShrink: 0,
                alignItems: "center",
                borderRadius: "9px",
                transition: "background-color 0.2s",
                outline: "none",
                cursor: "pointer",
                backgroundColor: checked ? "#2663EB" : "#D1D5DB",
                padding: "2px",
            }}
            className={cn(
                "focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}>
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                style={{
                    display: "block",
                    height: "14px",
                    width: "14px",
                    borderRadius: "7px",
                    backgroundColor: "white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    transition: "transform 0.2s ease-in-out",
                    transform: checked ? "translateX(20px)" : "translateX(0px)",
                }}
            />
        </SwitchPrimitive.Root>
    );
}

export { Switch };
