from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
import numpy as np

app = FastAPI(title="Cold Chain AI Service")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Omit raw input/context: non-finite floats such as NaN are not valid JSON.
    errors = [{"loc": list(error.get("loc", ())), "msg": error.get("msg", "Invalid input"),
               "type": error.get("type", "value_error")} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


class Reading(BaseModel):
    temperature: float = Field(ge=-100, le=100, allow_inf_nan=False)
    humidity: float = Field(ge=0, le=100, allow_inf_nan=False)


class Payload(BaseModel):
    readings: list[Reading] = Field(max_length=500)


@app.get("/health")
def health():
    return {"status": "ok", "model": "IsolationForest"}


@app.post("/analyze")
def analyze(payload: Payload):
    if len(payload.readings) < 5:
        return {"anomaly": False, "riskScore": 0.0, "reason": "Collecting history"}

    x = np.asarray([[r.temperature, r.humidity] for r in payload.readings], dtype=np.float64)
    if not np.isfinite(x).all():  # Defensive guard in addition to request validation.
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Readings must contain finite numeric values")

    model = IsolationForest(n_estimators=100, contamination=0.12, random_state=42)
    model.fit(x)
    score = float(-model.decision_function(x)[-1])
    pred = int(model.predict(x)[-1])
    temps = x[:, 0]
    trend = float(np.polyfit(np.arange(len(temps)), temps, 1)[0])
    anomaly = pred == -1 or trend > 0.8
    risk = (min(1.0, max(0.0, 0.5 + score + max(0, trend - 0.5) * 0.15))
            if anomaly else min(0.49, max(0.0, 0.25 + score)))
    reason = "Unusual temperature pattern detected" if anomaly else "No significant anomaly detected"
    if trend > 0.8:
        reason = "Continuous temperature increase detected"
    return {"anomaly": bool(anomaly), "riskScore": round(risk, 3), "reason": reason}
