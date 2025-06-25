from datetime import time
from fastapi import FastAPI, Form, File, HTTPException, UploadFile
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


@app.post("/process/")
async def process(
    input_file: Annotated[UploadFile, File()],
    output_fmt: Annotated[str, Form()],
    start: Annotated[time | None, Form()] = None,
    end: Annotated[time | None, Form()] = None,
):
    trim_options = {}
    if start is not None and end is not None:
        if end <= start:
            raise HTTPException(status_code=422, detail="end specified before start")
        trim_options = {"ss": start.isoformat()[:8], "to": end.isoformat()[:8]}

    input_path = (
        Path(input_file.filename) if input_file.filename is not None else Path()
    )
    if input_path.suffix is None:
        raise HTTPException(status_code=422, detail="Unknown File Format")

    if (invalid_fmt := input_path.suffix[1:]) not in CODEC_MAP or (
        invalid_fmt := output_fmt
    ) not in CODEC_MAP:
        raise HTTPException(
            status_code=422, detail=f"Unsupported File Format: {invalid_fmt}"
        )

    with (
        NamedTemporaryFile() as input_tmpfile,
        NamedTemporaryFile(suffix=f".{output_fmt}", delete=False) as output_file,
    ):
        try:
            input_tmpfile.write(await input_file.read())
            proc = (
                FFmpeg()
                .option("y")
                .input(input_tmpfile.name)
                .output(output_file.name, acodec=CODEC_MAP[output_fmt], **trim_options)
            )

            await proc.execute()
            return FileResponse(
                output_file.name,
                headers={
                    "Content-Disposition": f"attachment; filename=converted.{output_fmt}"
                },
                background=BackgroundTask(output_file.close),
            )
        except Exception:
            raise HTTPException(status_code=412, detail="Conversion Error")
