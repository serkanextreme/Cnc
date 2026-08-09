"""
Talas — CNC Kesme Parametreleri | Referans API

Uygulama tamamen offline calisir (tum hesaplar ve veriler cihazda tutulur).
Bu backend, ayni dogrulanmis hesap motorunu ve malzeme katalogunu HTTP uzerinden
sunan bir REFERANS/DOGRULAMA API'sidir. Uygulamanin calismasi icin ZORUNLU DEGILDIR.
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

import calc_engine as ce

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'talas')]

with open(ROOT_DIR / 'materials.json', encoding='utf-8') as fh:
    CATALOG = json.load(fh)

with open(ROOT_DIR / 'threads.json', encoding='utf-8') as fh:
    THREADS = json.load(fh)

MATERIALS: List[dict] = CATALOG['materials']
MATERIAL_BY_ID: Dict[str, dict] = {m['id']: m for m in MATERIALS}
PRESETS: Dict[str, dict] = CATALOG['machinePresets']

app = FastAPI(title="Talas CNC API", version="1.0.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ modeller
class Limits(BaseModel):
    model_config = ConfigDict(extra="ignore")
    maxRpm: Optional[float] = None
    maxFeed: Optional[float] = None
    powerKw: Optional[float] = None


class MillingRequest(BaseModel):
    vc: float = Field(..., gt=0, description="Kesme hizi m/dk")
    d: float = Field(..., gt=0, description="Takim capi mm")
    z: int = Field(..., ge=1, description="Agiz sayisi")
    fz: float = Field(..., gt=0, description="Dis basina ilerleme mm/dis")
    ap: float = Field(..., gt=0, description="Eksenel derinlik mm")
    ae: float = Field(..., gt=0, description="Radyal genislik mm")
    kc: float = Field(2100, gt=0, description="Ozgul kesme kuvveti N/mm2")
    eta: float = Field(0.8, gt=0, le=1)
    limits: Optional[Limits] = None


class TurningRequest(BaseModel):
    vc: float = Field(..., gt=0)
    d: float = Field(..., gt=0, description="Is parcasi capi mm")
    f: float = Field(..., gt=0, description="Ilerleme mm/dev")
    ap: float = Field(..., gt=0, description="Talas derinligi mm")
    noseR: float = Field(0.8, gt=0, description="Uc radyusu mm")
    kc: float = Field(2100, gt=0)
    eta: float = Field(0.8, gt=0, le=1)
    targetRa: Optional[float] = Field(None, gt=0, description="Hedef Ra um")
    limits: Optional[Limits] = None


class DrillingRequest(BaseModel):
    vc: float = Field(..., gt=0)
    d: float = Field(..., gt=0, description="Matkap capi mm")
    f: float = Field(..., gt=0, description="Ilerleme mm/dev")
    depth: float = Field(..., gt=0, description="Delik derinligi mm")
    kc: float = Field(2100, gt=0)
    eta: float = Field(0.8, gt=0, le=1)
    peck: int = Field(0, ge=0)
    limits: Optional[Limits] = None


def _limits(payload: Optional[Limits]) -> dict:
    if not payload:
        return {}
    return {k: v for k, v in payload.model_dump().items() if v}


# ------------------------------------------------------------------ rotalar
@api_router.get("/")
async def root():
    return {
        "app": "Talas — CNC Kesme Parametreleri",
        "mode": "offline-first (bu API referans amaclidir)",
        "materials": len(MATERIALS),
        "endpoints": ["/api/health", "/api/catalog", "/api/materials",
                      "/api/materials/{id}", "/api/machine-presets",
                      "/api/calc/freze", "/api/calc/torna", "/api/calc/matkap",
                      "/api/threads", "/api/calc/kilavuz", "/api/calc/dis-frezesi",
                      "/api/calc/dis-torna", "/api/tool-life"],
    }


@api_router.get("/health")
async def health():
    mongo_ok = True
    try:
        await client.admin.command('ping')
    except Exception as exc:  # pragma: no cover
        logger.warning("mongo ping failed: %s", exc)
        mongo_ok = False
    return {"status": "ok", "mongo": mongo_ok, "materials": len(MATERIALS)}


@api_router.get("/catalog")
async def catalog():
    """Frontend'in de kullandigi tam katalog (gruplar, presetler, malzemeler)."""
    return CATALOG


@api_router.get("/materials")
async def list_materials(q: Optional[str] = None, group: Optional[str] = None,
                         machinability: Optional[str] = None):
    items = MATERIALS
    if group:
        items = [m for m in items if m['group'] == group]
    if machinability:
        items = [m for m in items if m['machinability'] == machinability]
    if q:
        needle = q.strip().lower()
        items = [m for m in items
                 if needle in m['code'].lower()
                 or needle in m['name'].lower()
                 or needle in m.get('subtitle', '').lower()]
    return {"count": len(items), "items": items}


@api_router.get("/materials/{material_id}")
async def get_material(material_id: str):
    mat = MATERIAL_BY_ID.get(material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Malzeme bulunamadi")
    return mat


@api_router.get("/machine-presets")
async def machine_presets():
    return {"presets": PRESETS, "auto": CATALOG['autoPreset']}


@api_router.post("/calc/freze")
async def calc_freze(req: MillingRequest):
    try:
        res = ce.calc_milling(req.vc, req.d, req.z, req.fz, req.ap, req.ae,
                              req.kc, req.eta, _limits(req.limits))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    res["formulas"] = ["n = (1000 × Vc) / (π × D)", "Vf = fz × z × n",
                       "Q = ap × ae × Vf", "Pc = Q × kc / 60000 / η",
                       "M = 30000 × Pc / (π × n)"]
    return res


@api_router.post("/calc/torna")
async def calc_torna(req: TurningRequest):
    try:
        res = ce.calc_turning(req.vc, req.d, req.f, req.ap, req.noseR,
                              req.kc, req.eta, _limits(req.limits), req.targetRa)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    res["formulas"] = ["n = (1000 × Vc) / (π × D)", "Vf = f × n",
                       "Q = ap × f × Vc", "Ra = f² / (32 × rε)",
                       "f = √(32 × Ra × rε)"]
    return res


class TappingRequest(BaseModel):
    vc: float = Field(..., gt=0)
    d: float = Field(..., gt=0, description="Dis nominal capi mm")
    pitch: float = Field(..., gt=0, description="Adim mm")
    depth: float = Field(..., gt=0, description="Dis derinligi mm")
    kc: float = Field(2100, gt=0)
    tensile: float = Field(900, gt=0)
    tapType: str = Field("kesici")
    engagement: float = Field(75, ge=50, le=100)
    eta: float = Field(0.8, gt=0, le=1)
    limits: Optional[Limits] = None


class ThreadMillRequest(BaseModel):
    vc: float = Field(..., gt=0)
    toolD: float = Field(..., gt=0)
    threadD: float = Field(..., gt=0)
    pitch: float = Field(..., gt=0)
    z: int = Field(3, ge=1)
    fz: float = Field(..., gt=0)
    threadLength: float = Field(..., gt=0)
    kc: float = Field(2100, gt=0)
    internal: bool = True
    eta: float = Field(0.8, gt=0, le=1)
    limits: Optional[Limits] = None


class ThreadTurnRequest(BaseModel):
    vc: float = Field(..., gt=0)
    d: float = Field(..., gt=0)
    pitch: float = Field(..., gt=0)
    length: float = Field(..., gt=0)
    kc: float = Field(2100, gt=0)
    machinability: str = Field("orta")
    angle: int = Field(60)
    internal: bool = False
    eta: float = Field(0.8, gt=0, le=1)
    passes: Optional[int] = None
    limits: Optional[Limits] = None


class ToolLifeRequest(BaseModel):
    vc: float = Field(..., gt=0)
    vcRef: float = Field(..., gt=0)
    tool: str = Field("karbur")
    refLife: float = Field(15, gt=0)
    coolant: str = Field("sivi")
    toolPrice: float = Field(0, ge=0)
    edges: int = Field(1, ge=1)
    partMinutes: float = Field(1, gt=0)
    hourlyRate: float = Field(0, ge=0)
    targetLife: Optional[float] = None


@api_router.get("/threads")
async def thread_tables(series: Optional[str] = None):
    rows = THREADS["threads"]
    if series:
        rows = [r for r in rows if r[1] == series]
    return {"series": THREADS["series"], "count": len(rows), "threads": rows,
            "tapTypes": THREADS["tapTypes"], "engagementOptions": THREADS["engagementOptions"]}


@api_router.post("/calc/kilavuz")
async def calc_kilavuz(req: TappingRequest):
    try:
        res = ce.calc_tapping(req.vc, req.d, req.pitch, req.depth, req.kc, req.tensile,
                              req.tapType, req.engagement, req.eta, _limits(req.limits))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    res["formulas"] = ["n = (1000 × Vc) / (π × D)", "Vf = adım × n",
                       "M = kc × P × d / 8000", "Matkap = d − (%dis × P) / 76,98"]
    return res


@api_router.post("/calc/dis-frezesi")
async def calc_dis_frezesi(req: ThreadMillRequest):
    try:
        res = ce.calc_thread_milling(req.vc, req.toolD, req.threadD, req.pitch, req.z, req.fz,
                                     req.threadLength, req.kc, req.internal, req.eta,
                                     _limits(req.limits))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    res["formulas"] = ["n = (1000 × Vc) / (π × Dt)", "Vf(çevre) = fz × z × n",
                       "Vf(merkez) = Vf × (Ddiş − Dt) / Ddiş"]
    return res


@api_router.post("/calc/dis-torna")
async def calc_dis_torna(req: ThreadTurnRequest):
    try:
        res = ce.calc_thread_turning(req.vc, req.d, req.pitch, req.length, req.kc,
                                     req.machinability, req.angle, req.internal, req.eta,
                                     _limits(req.limits), 2.0, req.passes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    res["formulas"] = ["n = (1000 × Vc) / (π × D)", "Vf = adım × n",
                       "h = 0,6134 × P", "ap(i) = h × (√(i/N) − √((i−1)/N))"]
    return res


@api_router.post("/tool-life")
async def tool_life(req: ToolLifeRequest):
    life = ce.tool_life_minutes(req.vc, req.vcRef, req.tool, req.refLife, req.coolant)
    cost = ce.tool_cost(req.toolPrice, req.edges, life, req.partMinutes, req.hourlyRate)
    out = {
        "lifeMinutes": life,
        "status": ce.wear_status(life),
        "cost": cost,
        "formula": "Vc × T^n = C  →  T = T_ref × (Vc_ref / Vc)^(1/n)",
        "nExponent": ce.TAYLOR_N.get(req.tool, 0.25),
    }
    if req.targetLife:
        out["vcForTargetLife"] = ce.vc_for_target_life(req.targetLife, req.vcRef, req.tool,
                                                       req.refLife, req.coolant)
    return out


@api_router.post("/calc/matkap")
async def calc_matkap(req: DrillingRequest):
    try:
        res = ce.calc_drilling(req.vc, req.d, req.f, req.depth,
                               req.kc, req.eta, _limits(req.limits), req.peck)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    res["formulas"] = ["n = (1000 × Vc) / (π × D)", "Vf = f × n",
                       "Q = (π × D² / 4) × Vf", "t = derinlik / Vf"]
    return res


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
