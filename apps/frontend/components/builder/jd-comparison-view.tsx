'use client';

import { useMemo, useState } from 'react';
import { type ResumeData } from '@/components/dashboard/resume-component';
import { extractKeywords, calculateMatchStats } from '@/lib/utils/keyword-matcher';
import { JDDisplay } from './jd-display';
import { HighlightedResumeView } from './highlighted-resume-view';
import { CheckCircle, Target, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import type { ATSAnalysisResult } from '@/lib/api/resume';

interface JDComparisonViewProps {
  jobDescription: string;
  resumeData: ResumeData;
  atsResult?: ATSAnalysisResult | null;
}

/**
 * Split view comparing job description with resume.
 * Left: JD (read-only)
 * Right: Resume with matching keywords highlighted
 * Stats bar: AI ATS score (if available) or keyword match fallback
 */
export function JDComparisonView({ jobDescription, resumeData, atsResult }: JDComparisonViewProps) {
  const { t } = useTranslations();
  const [showReasons, setShowReasons] = useState(false);

  // Extract keywords from JD
  const keywords = useMemo(() => extractKeywords(jobDescription), [jobDescription]);

  // Build full resume text for stats calculation (fallback only)
  const resumeText = useMemo(() => {
    const parts: string[] = [];
    if (resumeData.summary) parts.push(resumeData.summary);
    resumeData.workExperience?.forEach((exp) => {
      if (exp.title) parts.push(exp.title);
      if (exp.company) parts.push(exp.company);
      exp.description?.forEach((d) => parts.push(d));
    });
    resumeData.education?.forEach((edu) => {
      if (edu.degree) parts.push(edu.degree);
      if (edu.institution) parts.push(edu.institution);
    });
    resumeData.personalProjects?.forEach((proj) => {
      if (proj.name) parts.push(proj.name);
      if (proj.role) parts.push(proj.role);
      proj.description?.forEach((d) => parts.push(d));
    });
    if (resumeData.additional) {
      resumeData.additional.technicalSkills?.forEach((s) => parts.push(s));
      resumeData.additional.languages?.forEach((l) => parts.push(l));
      resumeData.additional.certificationsTraining?.forEach((c) => parts.push(c));
    }
    return parts.join(' ');
  }, [resumeData]);

  // Keyword fallback stats
  const fallbackStats = useMemo(
    () => calculateMatchStats(resumeText, keywords),
    [resumeText, keywords]
  );

  const aiScore = atsResult?.score ?? null;
  const scoreToShow = aiScore ?? fallbackStats.matchPercentage;
  const isAiScore = aiScore !== null;

  const scoreColor =
    scoreToShow >= 80
      ? 'text-[#15803D]'
      : scoreToShow >= 60
        ? 'text-[#1D4ED8]'
        : scoreToShow >= 40
          ? 'text-[#F97316]'
          : 'text-[#DC2626]';

  const impactColors: Record<string, string> = {
    critical: 'bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]',
    high: 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]',
    medium: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#1D4ED8]',
  };

  const missingKeywords = atsResult?.keywords.filter((k) => !k.found) ?? [];
  const presentKeywords = atsResult?.keywords.filter((k) => k.found) ?? [];
  const hasReasons =
    isAiScore && ((atsResult?.priority_actions?.length ?? 0) > 0 || missingKeywords.length > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-mono">
                {t('builder.jdMatch.stats.keywordsExtracted', { count: keywords.size })}
              </span>
            </div>
            {isAiScore ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-mono">
                  {presentKeywords.length}/{atsResult!.keywords.length} {t('ats.matched')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-mono">
                  {t('builder.jdMatch.stats.matchesFound', { count: fallbackStats.matchCount })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-600">
              {t('builder.jdMatch.stats.matchRateLabel')}
            </span>
            <span className={`text-lg font-bold font-mono ${scoreColor}`}>{scoreToShow}%</span>
            {isAiScore && (
              <span className="text-xs font-mono text-[#1D4ED8] uppercase font-bold">AI</span>
            )}
            {hasReasons && (
              <button
                onClick={() => setShowReasons(!showReasons)}
                className="flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-gray-800 ml-1"
              >
                {showReasons ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {t('ats.reasons')}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible reasons panel */}
        {showReasons && isAiScore && (
          <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-[#F9F9F6]">
            {/* Priority actions */}
            {(atsResult?.priority_actions?.length ?? 0) > 0 && (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  {t('ats.priorityActions')}
                </p>
                <ol className="space-y-1">
                  {atsResult!.priority_actions.map((action, i) => (
                    <li
                      key={i}
                      className={`border px-3 py-2 flex items-start gap-2 text-xs font-mono ${impactColors[action.impact] ?? impactColors.medium}`}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="flex-1">{action.action}</span>
                      <span className="font-bold uppercase shrink-0">
                        {t(`ats.impact.${action.impact}`)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Missing keywords */}
            {missingKeywords.length > 0 && (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#DC2626] mb-2">
                  ✗ {t('ats.missing')} ({missingKeywords.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {missingKeywords.map((k, i) => (
                    <span
                      key={i}
                      className="font-mono text-xs px-2 py-0.5 border border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]"
                    >
                      {k.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Split View */}
      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* Left: JD */}
        <div className="border-r border-gray-200 overflow-hidden">
          <JDDisplay content={jobDescription} />
        </div>

        {/* Right: Resume with highlights */}
        <div className="overflow-hidden">
          <HighlightedResumeView resumeData={resumeData} keywords={keywords} />
        </div>
      </div>
    </div>
  );
}
