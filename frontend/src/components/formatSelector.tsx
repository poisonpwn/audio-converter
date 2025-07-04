import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FormatSelectorProps = {
    format?: string | undefined,
    onFormatChange?: (value: string) => void,
    label: string,
};

export function FormatSelector({ label, format, onFormatChange }: FormatSelectorProps) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={format} onValueChange={onFormatChange} >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="aac">AAC</SelectItem>
                    <SelectItem value="mp3">MP3</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="ogg">OGG</SelectItem>
                    <SelectItem value="flac">FLAC</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
