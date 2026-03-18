"""Pydantic models for ATS (Applicant Tracking System) analysis."""

from pydantic import BaseModel, Field


class ATSKeywordResult(BaseModel):
    """A single keyword from the job description with match status."""

    keyword: str = Field(description="The keyword or phrase")
    category: str = Field(
        description="Category: required, preferred, action_verb, soft_skill, or technical"
    )
    found: bool = Field(description="Whether the keyword was found in the resume")


class ATSPriorityAction(BaseModel):
    """A recommended action to improve the ATS score."""

    priority: int = Field(ge=1, description="Priority order (1 = highest)")
    action: str = Field(description="Concrete action to take")
    impact: str = Field(description="Impact level: critical, high, or medium")


class ATSAnalysisResult(BaseModel):
    """Complete ATS analysis result for a resume vs job description."""

    score: int = Field(ge=0, le=100, description="Overall ATS match score (0-100)")
    keywords: list[ATSKeywordResult] = Field(
        default_factory=list, description="All extracted JD keywords with match status"
    )
    priority_actions: list[ATSPriorityAction] = Field(
        default_factory=list, description="Ordered list of recommended improvements"
    )
    analysis_language: str = Field(
        default="en", description="Language of the job description (ISO 639-1)"
    )


class ATSAnalysisRequest(BaseModel):
    """Request body for ATS analysis endpoint."""

    resume_id: str = Field(description="ID of the resume to analyze")
    job_id: str = Field(description="ID of the job description to compare against")
