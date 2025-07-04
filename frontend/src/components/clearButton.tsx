import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { X } from "lucide-react";


export function ClearButton({ className, ...props }: Omit<React.ComponentProps<"button">, "size" | "variant" | "type" | "aria-label">) {
    return (
        <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Clear input"
            className={cn("ml-1", className)}
            {...props}
        >
            <X className="w-4 h-4" />
        </Button>
    );
}
