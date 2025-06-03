from fastapi import BackgroundTasks, FastAPI, Form, File, HTTPException, UploadFile
from typing import Annotated
from pathlib import Path
from tempfile import NamedTemporaryFile
from fastapi.responses import FileResponse
from ffmpeg_asyncio import FFmpeg
from starlette.background import BackgroundTask


app = FastAPI()
CODEC_MAP = {
    "mp3": "libmp3lame",
    "wav": "pcm_s16le",
    "ogg": "libvorbis",
    "flac": "flac",
    "aac": "aac",
}


@app.post("/convert/")
async def convert(
    output_format: Annotated[str, Form()], file: Annotated[UploadFile, File()]
):
    input_path = Path(file.filename) if file.filename is not None else Path()
    if input_path.suffix is None:
        raise HTTPException(status_code=422, detail=f"Unknown File Format")

    if output_format not in CODEC_MAP or input_path.suffix[1:] not in CODEC_MAP:
        raise HTTPException(
            status_code=422, detail=f"Unsupported File Format: {input_path.suffix}"
        )

    # the output file needs to be deleted as a background task, otherwise the file streaming cuts off.
    with (
        NamedTemporaryFile() as input_file,
        NamedTemporaryFile(delete=False, suffix=f".{output_format}") as output_file,
    ):
        try:
            input_file.write(await file.read())

            proc = (
                FFmpeg()
                .option("y")
                .input(input_file.name)
                .output(
                    output_file.name,
                    format=output_format,
                    acodec=CODEC_MAP[output_format],
                )
            )

            await proc.execute()
        except Exception:
            return HTTPException(status_code=422, detail="Conversion Error")

        return FileResponse(
            output_file.name,
            headers={
                "Content-Disposition": f"attachment; filename=converted.{output_format}"
            },
            background=BackgroundTask(output_file.close),
        )
