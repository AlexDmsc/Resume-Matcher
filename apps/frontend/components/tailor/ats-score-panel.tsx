'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronRight, Target, AlertTriangle } from 'lucide-react';
import { analyzeATS, type ATSAnalysisResult, type ATSKeywordResult } from '@/lib/api/resume';
import { extractKeywords, calculateMatchStats } from '@/lib/utils/keyword-matcher';
import type { ResumeData } from '@/components/dashboard/resume-component';
import { useTranslations } from '@/lib/i18n';

interface ATSScorePanelProps {
  resumeId: string;
  /** jobId if already uploaded, or null if upload is needed first */
  jobId: string | null;
  /** Called when jobId is null — should upload the JD and return the new jobId */
  onGetJobId?: () => Promise<string | null>;
  /** Called after a successful analysis so parent can update its stored result */
  onAnalysisComplete?: (result: ATSAnalysisResult) => void;
  /** Fallback: resume data + JD text for client-side keyword scoring when LLM unavailable */
  fallbackResumeData?: ResumeData | null;
  fallbackJobDescription?: string;
  isLlmConfigured: boolean;
}

export function ATSScorePanel({
  resumeId,
  jobId,
  onGetJobId,
  onAnalysisComplete,
  fallbackResumeData,
  fallbackJobDescription,
  isLlmConfigured,
}: ATSScorePanelProps) {
  const { t } = useTranslations();
  const [result, setResult] = useState<ATSAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeywords, setShowKeywords] = useState(true);

  const fallbackScore = (() => {
    if (!fallbackResumeData || !fallbackJobDescription) return null;
    const parts: string[] = [];
    if (fallbackResumeData.summary) parts.push(fallbackResumeData.summary);
    fallbackResumeData.workExperience?.forEach((e) => {
      if (e.title) parts.push(e.title);
      e.description?.forEach((d) => parts.push(d));
    });
    fallbackResumeData.additional?.technicalSkills?.forEach((s) => parts.push(s));
    const resumeText = parts.join(' ');
    const jdKeywords = extractKeywords(fallbackJobDescription);
    return calculateMatchStats(resumeText, jdKeywords);
  })();

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let resolvedJobId = jobId;
      if (!resolvedJobId) {
        if (!onGetJobId) {
          setError(t('ats.errors.noJobId'));
          return;
        }
        resolvedJobId = await onGetJobId();
        if (!resolvedJobId) {
          setError(t('ats.errors.uploadFailed'));
          return;
        }
      }
      const data = await analyzeATS(resumeId, resolvedJobId);
      setResult(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      console.error(err);
      setError(t('ats.errors.analysisFailedRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-[#15803D]';
    if (score >= 60) return 'text-[#1D4ED8]';
    if (score >= 40) return 'text-[#F97316]';
    return 'text-[#DC2626]';
  };

  const scoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-[#15803D]';
    if (score >= 60) return 'bg-[#1D4ED8]';
    if (score >= 40) return 'bg-[#F97316]';
    return 'bg-[#DC2626]';
  };

  const impactColors: Record<string, string> = {
    critical: 'text-[#DC2626] border-[#DC2626] bg-[#FEF2F2]',
    high: 'text-[#F97316] border-[#F97316] bg-[#FFF7ED]',
    medium: 'text-[#1D4ED8] border-[#1D4ED8] bg-[#EFF6FF]',
  };

  const categoryLabel = (cat: ATSKeywordResult['category']) => {
    const labels: Record<string, string> = {
      required: t('ats.categories.required'),
      preferred: t('ats.categories.preferred'),
      technical: t('ats.categories.technical'),
      action_verb: t('ats.categories.actionVerb'),
      soft_skill: t('ats.categories.softSkill'),
    };
    return labels[cat] ?? cat;
  };

  // Not yet analyzed — show button
  if (!result && !isLoading) {
    return (
      <div className="border border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1D4ED8]" />
            <span className="font-mono text-sm font-bold uppercase tracking-wider">
              {t('ats.title')}
            </span>
          </div>
          {!isLlmConfigured && fallbackScore !== null && (
            <span
              className={`font-mono text-lg font-bold ${scoreColor(fallbackScore.matchPercentage)}`}
            >
              {fallbackScore.matchPercentage}%
              <span className="text-xs text-gray-400 ml-1 font-normal normal-case tracking-normal">
                {t('ats.fallbackLabel')}
              </span>
            </span>
          )}
        </div>

        {isLlmConfigured ? (
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={handleAnalyze} className="gap-2">
              <Target className="w-4 h-4" />
              {t('ats.analyzeButton')}
            </Button>
            <p className="font-mono text-xs text-gray-500">{t('ats.analyzeDescription')}</p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="font-mono text-xs text-gray-500">
              {'// '}
              {t('ats.noLlmMessage')}
            </p>
            {fallbackScore !== null && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-gray-500">{t('ats.keywordMatch')}</span>
                  <span className="font-mono text-xs text-gray-500">
                    {fallbackScore.matchCount}/{fallbackScore.totalKeywords} {t('ats.keywords')}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 border border-black">
                  <div
                    className={`h-full ${scoreBarColor(fallbackScore.matchPercentage)} transition-all`}
                    style={{ width: `${fallbackScore.matchPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-2 font-mono text-xs text-[#DC2626] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="border border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" />
          <span className="font-mono text-sm text-gray-600">{t('ats.analyzing')}</span>
        </div>
      </div>
    );
  }

  // Results
  if (!result) return null;

  const presentKeywords = result.keywords.filter((k) => k.found);
  const missingKeywords = result.keywords.filter((k) => !k.found);

  return (
    <div className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
      {/* Header with score */}
      <div className="p-4 border-b border-black">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1D4ED8]" />
            <span className="font-mono text-sm font-bold uppercase tracking-wider">
              {t('ats.title')}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="font-mono text-xs"
          >
            {t('ats.reanalyzeButton')}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className={`font-serif text-5xl font-bold ${scoreColor(result.score)}`}>
            {result.score}%
          </span>
          <div className="flex-1">
            <div className="w-full h-3 bg-gray-200 border border-black mb-1">
              <div
                className={`h-full ${scoreBarColor(result.score)} transition-all`}
                style={{ width: `${result.score}%` }}
              />
            </div>
            <p className="font-mono text-xs text-gray-500">
              {result.score >= 80
                ? t('ats.scoreGood')
                : result.score >= 60
                  ? t('ats.scoreOk')
                  : t('ats.scoreLow')}
            </p>
          </div>
        </div>
      </div>

      {/* Keywords */}
      {result.keywords.length > 0 && (
        <div className="border-b border-black">
          <button
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            onClick={() => setShowKeywords(!showKeywords)}
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider">
              {t('ats.keywords')} — {presentKeywords.length}/{result.keywords.length}{' '}
              {t('ats.matched')}
            </span>
            {showKeywords ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {showKeywords && (
            <div className="px-4 pb-4 space-y-3">
              {presentKeywords.length > 0 && (
                <div>
                  <p className="font-mono text-xs text-[#15803D] font-bold uppercase mb-2">
                    ✓ {t('ats.present')} ({presentKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {presentKeywords.map((k, i) => (
                      <span
                        key={i}
                        className="font-mono text-xs px-2 py-0.5 border border-[#15803D] bg-[#F0FDF4] text-[#15803D]"
                        title={categoryLabel(k.category)}
                      >
                        {k.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missingKeywords.length > 0 && (
                <div>
                  <p className="font-mono text-xs text-[#DC2626] font-bold uppercase mb-2">
                    ✗ {t('ats.missing')} ({missingKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {missingKeywords.map((k, i) => (
                      <span
                        key={i}
                        className="font-mono text-xs px-2 py-0.5 border border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]"
                        title={categoryLabel(k.category)}
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
      )}

      {/* Priority actions */}
      {result.priority_actions.length > 0 && (
        <div className="p-4">
          <p className="font-mono text-xs font-bold uppercase tracking-wider mb-3">
            {t('ats.priorityActions')}
          </p>
          <ol className="space-y-2">
            {result.priority_actions.map((action, i) => (
              <li
                key={i}
                className={`border p-3 flex items-start gap-3 ${impactColors[action.impact] ?? impactColors.medium}`}
              >
                <span className="font-mono text-xs font-bold shrink-0 mt-0.5">
                  {action.priority}.
                </span>
                <p className="font-mono text-xs flex-1">{action.action}</p>
                <span className="font-mono text-xs font-bold uppercase shrink-0">
                  {t(`ats.impact.${action.impact}`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
