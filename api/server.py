import os
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi_clerk_auth import (  # type: ignore
    ClerkConfig,
    ClerkHTTPBearer,
    HTTPAuthorizationCredentials,
)
from groq import Groq
from pydantic import BaseModel
from svix.webhooks import Webhook, WebhookVerificationError

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)


class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str


SYSTEM_PROMPT = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.
Reply in professional markdown with short paragraphs and bullet points where useful.
Reply with exactly three sections and these exact headings:
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language

Formatting rules:
- Keep each section concise and readable.
- Under "Next steps", use a numbered list.
- In the email section, include a "Subject:" line.
- End the email with this exact closing:
Best regards,
MediNotes Pro
"""


def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""


def is_active_subscription(data: dict[str, Any]) -> bool:
    status = str(data.get("status", "")).lower()
    return status in {"active", "trialing", "past_due"}


def extract_plan_key(data: dict[str, Any]) -> Optional[str]:
    direct_key = data.get("plan_key")
    if isinstance(direct_key, str) and direct_key:
        return direct_key

    plan = data.get("plan")
    if isinstance(plan, dict):
        for key in ("key", "slug", "name"):
            value = plan.get(key)
            if isinstance(value, str) and value:
                return value

    items = data.get("items")
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            item_plan = item.get("plan")
            if isinstance(item_plan, dict):
                for key in ("key", "slug", "name"):
                    value = item_plan.get(key)
                    if isinstance(value, str) and value:
                        return value
    return None


def update_user_plan_metadata(user_id: str, plan_key: Optional[str]) -> None:
    clerk_secret_key = os.getenv("CLERK_SECRET_KEY")
    if not clerk_secret_key:
        raise HTTPException(status_code=500, detail="Missing CLERK_SECRET_KEY")

    url = f"https://api.clerk.com/v1/users/{user_id}/metadata"
    headers = {
        "Authorization": f"Bearer {clerk_secret_key}",
        "Content-Type": "application/json",
    }
    payload = {"public_metadata": {"planKey": plan_key}}

    with httpx.Client(timeout=15.0) as client:
        response = client.patch(url, headers=headers, json=payload)
        response.raise_for_status()


@app.post("/api/consultation")
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    _user_id = creds.decoded["sub"]
    print("consultation request received")
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEY")

    client = Groq(api_key=groq_api_key)

    try:
        stream = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt_for(visit)},
            ],
            stream=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Groq request failed: {exc}"
        ) from exc

    def event_stream():
        try:
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if not text:
                    continue
                yield f"data: {text}\n\n"
        except Exception as exc:
            yield f"data: Error while streaming response: {exc}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/webhooks/clerk")
async def clerk_webhook(
    request: Request,
    svix_id: Optional[str] = Header(default=None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(default=None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(default=None, alias="svix-signature"),
):
    webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Missing CLERK_WEBHOOK_SECRET")
    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(status_code=400, detail="Missing Svix headers")

    payload = await request.body()
    headers = {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
    }

    try:
        event = Webhook(webhook_secret).verify(payload, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature") from exc

    event_type = str(event.get("type", ""))
    if not event_type.startswith("subscription."):
        return {"ok": True, "ignored": event_type}

    data = event.get("data", {})
    if not isinstance(data, dict):
        return {"ok": True, "ignored": "invalid_data_shape"}

    user_id = data.get("user_id") or data.get("userId")
    if not isinstance(user_id, str) or not user_id:
        return {"ok": True, "ignored": "missing_user_id"}

    if is_active_subscription(data):
        plan_key = extract_plan_key(data)
    else:
        plan_key = None

    # Keep access scoped to the premium plan gate used by the frontend.
    effective_plan = plan_key if plan_key == "premium_subscription" else None
    update_user_plan_metadata(user_id=user_id, plan_key=effective_plan)

    return {
        "ok": True,
        "event": event_type,
        "user_id": user_id,
        "plan_key": effective_plan,
    }


@app.get("/health")
@app.head("/health")
def health_check():
    return {"status": "healthy"}


static_path = Path("static")
if static_path.exists():
    next_assets = static_path / "_next"
    if next_assets.exists():
        app.mount("/_next", StaticFiles(directory=next_assets), name="next-assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_static_pages(full_path: str):
        if full_path in {"", "/"}:
            return FileResponse(static_path / "index.html")

        if full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404, detail="Not found")

        # Clerk account UI uses nested subpaths like /account/billing.
        # Serve the account page for any nested account route.
        if full_path.startswith("account/"):
            account_html = static_path / "account.html"
            if account_html.exists():
                return FileResponse(account_html)

        requested = static_path / full_path
        html_file = static_path / f"{full_path}.html"
        nested_index = static_path / full_path / "index.html"

        if requested.is_file():
            return FileResponse(requested)
        if html_file.exists():
            return FileResponse(html_file)
        if nested_index.exists():
            return FileResponse(nested_index)

        not_found = static_path / "404.html"
        if not_found.exists():
            return FileResponse(not_found, status_code=404)
        raise HTTPException(status_code=404, detail="Page not found")
