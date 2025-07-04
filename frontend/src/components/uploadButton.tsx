import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

export function UploadButton({ className, ...props }: Omit<React.ComponentProps<"button">, "type" | "variant">) {
    return (
        <Button
            type="button"
            variant="outline"
            className={cn("flex-shrink-0", className)}
            {...props}
        >
            <Upload className="w-4 h-4 mr-1" />
            Upload
        </Button>
    );
}
