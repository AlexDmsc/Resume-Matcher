"""ATS (Applicant Tracking System) analysis service."""

import json
import logging
import re

from app.database import db
from app.llm import complete_json
from app.prompts.ats import ATS_ANALYSIS_PROMPT
from app.schemas.ats import ATSAnalysisResult, ATSKeywordResult, ATSPriorityAction

logger = logging.getLogger(__name__)

# LLM-011: Prompt injection patterns to sanitize
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?above",
    r"forget\s+(everything|all)",
    r"new\s+instructions?:",
    r"system\s*:",
    r"<\s*/?\s*system\s*>",
    r"\[\s*INST\s*\]",
    r"\[\s*/\s*INST\s*\]",
]


def _sanitize_input(text: str) -> str:
    """LLM-011: Sanitize user input to prevent prompt injection."""
    sanitized = text
    for pattern in _INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[REDACTED]", sanitized, flags=re.IGNORECASE)
    return sanitized


def _resume_to_text(resume_data: dict) -> str:
    """Flatten structured resume data into plain text for LLM analysis."""
    parts: list[str] = []

    if info := resume_data.get("personalInfo"):
        if title := info.get("title"):
            parts.append(title)

    if summary := resume_data.get("summary"):
        parts.append(summary)

    for exp in resume_data.get("workExperience", []):
        if title := exp.get("title"):
            parts.append(title)
        if company := exp.get("company"):
            parts.append(company)
        for desc in exp.get("description", []):
            parts.append(desc)

    for edu in resume_data.get("education", []):
        if degree := edu.get("degree"):
            parts.append(degree)
        if institution := edu.get("institution"):
            parts.append(institution)

    for proj in resume_data.get("personalProjects", []):
        if name := proj.get("name"):
            parts.append(name)
        if role := proj.get("role"):
            parts.append(role)
        for desc in proj.get("description", []):
            parts.append(desc)

    if additional := resume_data.get("additional"):
        for skill in additional.get("technicalSkills", []):
            parts.append(skill)
        for lang in additional.get("languages", []):
            parts.append(lang)
        for cert in additional.get("certificationsTraining", []):
            parts.append(cert)

    for section in resume_data.get("customSections", []):
        for item in section.get("items", []):
            if title := item.get("title"):
                parts.append(title)
            if subtitle := item.get("subtitle"):
                parts.append(subtitle)
            for desc in item.get("description", []):
                parts.append(desc)

    return "\n".join(parts)


def _parse_llm_response(raw: dict) -> ATSAnalysisResult:
    """Parse and validate the LLM response into ATSAnalysisResult."""
    score = int(raw.get("score", 0))
    score = max(0, min(100, score))

    keywords = [
        ATSKeywordResult(
            keyword=str(k.get("keyword", "")),
            category=str(k.get("category", "required")),
            found=bool(k.get("found", False)),
        )
        for k in raw.get("keywords", [])
        if k.get("keyword")
    ]

    priority_actions = [
        ATSPriorityAction(
            priority=int(a.get("priority", idx + 1)),
            action=str(a.get("action", "")),
            impact=str(a.get("impact", "medium")),
        )
        for idx, a in enumerate(raw.get("priority_actions", []))
        if a.get("action")
    ]

    return ATSAnalysisResult(
        score=score,
        keywords=keywords,
        priority_actions=priority_actions,
        analysis_language=str(raw.get("analysis_language", "en")),
    )


async def analyze_ats(resume_id: str, job_id: str) -> ATSAnalysisResult:
    """Analyze resume against job description for ATS compatibility.

    Args:
        resume_id: ID of the resume to analyze
        job_id: ID of the job description to compare against

    Returns:
        ATSAnalysisResult with score, keywords, and priority actions

    Raises:
        ValueError: If resume or job description not found
        RuntimeError: If LLM analysis fails
    """
    resume = db.get_resume(resume_id)
    if not resume:
        raise ValueError(f"Resume {resume_id!r} not found")

    job = db.get_job(job_id)
    if not job:
        raise ValueError(f"Job {job_id!r} not found")

    job_description = job.get("content", "")
    if not job_description.strip():
        raise ValueError("Job description is empty")

    # Use processed structured data if available, otherwise fallback to raw content
    resume_data = resume.get("processed_data")
    if resume_data and isinstance(resume_data, dict):
        resume_text = _resume_to_text(resume_data)
    else:
        resume_text = resume.get("content", "")

    if not resume_text.strip():
        raise ValueError("Resume has no content")

    sanitized_jd = _sanitize_input(job_description)
    sanitized_resume = _sanitize_input(resume_text)

    prompt = ATS_ANALYSIS_PROMPT.format(
        job_description=sanitized_jd,
        resume_text=sanitized_resume,
    )

    try:
        raw = await complete_json(prompt)
    except Exception as e:
        logger.error(f"ATS analysis LLM call failed: {e}")
        raise RuntimeError("ATS analysis failed. Please try again.") from e

    if not isinstance(raw, dict):
        logger.error(f"ATS analysis returned non-dict: {type(raw)}")
        raise RuntimeError("ATS analysis returned an unexpected response.")

    try:
        result = _parse_llm_response(raw)
    except Exception as e:
        logger.error(f"Failed to parse ATS analysis response: {e} | raw={json.dumps(raw)[:500]}")
        raise RuntimeError("Failed to parse ATS analysis response.") from e

    # Persist result in the resume record so it can be loaded without re-running the LLM
    try:
        db.update_resume(resume_id, {"ats_result": result.model_dump()})
    except Exception as e:
        logger.warning(f"Could not persist ATS result for resume {resume_id!r}: {e}")

    return result
