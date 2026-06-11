# api/routes/pipeline.py — /run-pipeline endpoint

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
import json

from core.config import COLUMN_MAPPING
from services.formatter import run_format
from services.mapper import run_mapper
from services.ranker import run_ranking
from utils.file_utils import read_bytes, save_upload, temp_workspace, workspace_path

router = APIRouter()

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

@router.get("/column-mapping")
async def get_column_mapping():
    return COLUMN_MAPPING

@router.post("/run-pipeline")
async def run_pipeline(
    query_results: UploadFile = Form(...),
    industry_mapping: UploadFile = File(...),
    kpi_library: UploadFile = File(...),
    mapping_json: str = File(...),
) -> Response:
    
    with temp_workspace() as tmpdir:
        try:
            list_of_mappings = json.loads(mapping_json)
            dynamic_mapping = {k: v for d in list_of_mappings for k, v in d.items()}

            # ── Save uploads ──────────────────────────────────────────────────
            query_path   = workspace_path(tmpdir, "query-results.csv")
            mapping_path = workspace_path(tmpdir, "industry-mapping.xlsx")
            kpi_path     = workspace_path(tmpdir, "KPI_Library.xlsx")

            save_upload(query_results,    query_path)
            save_upload(industry_mapping, mapping_path)
            save_upload(kpi_library,      kpi_path)

            # ── Stage 1: Format ───────────────────────────────────────────────
            formatted_path = workspace_path(tmpdir, "Formatted_Data.xlsx")
            run_format(query_path, formatted_path, dynamic_mapping)

            # ── Stage 2: Map industries ───────────────────────────────────────
            mapped_path = workspace_path(tmpdir, "Mapped_query-results.csv")
            run_mapper(formatted_path, mapping_path, mapped_path)

            # ── Stage 3: Rank ─────────────────────────────────────────────────
            output_path = workspace_path(tmpdir, "Final_Ranked_Report.xlsx")
            run_ranking(mapped_path, kpi_path, output_path)

            # Read bytes NOW, while the temp dir still exists
            file_bytes = read_bytes(output_path)

        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    # temp dir is deleted here — safe because we already have the bytes
    return Response(
        content=file_bytes,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="Final_Ranked_Report.xlsx"'},
    )
