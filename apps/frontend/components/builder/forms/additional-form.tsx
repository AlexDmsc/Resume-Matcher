'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdditionalInfo } from '@/components/dashboard/resume-component';
import { useTranslations } from '@/lib/i18n';

interface AdditionalFormProps {
  data: AdditionalInfo;
  onChange: (data: AdditionalInfo) => void;
}

const formatArray = (arr?: string[]) => arr?.join('\n') || '';

export const AdditionalForm: React.FC<AdditionalFormProps> = ({ data, onChange }) => {
  const { t } = useTranslations();

  // Local text state preserves trailing newlines so cursor doesn't jump when pressing Enter.
  // Controlled value derived from the array would strip the trailing newline on every
  // onChange, resetting the cursor position back before the new line.
  const [text, setText] = React.useState({
    technicalSkills: formatArray(data.technicalSkills),
    languages: formatArray(data.languages),
    certificationsTraining: formatArray(data.certificationsTraining),
    awards: formatArray(data.awards),
  });

  const handleChange = (field: keyof typeof text, value: string) => {
    setText((prev) => ({ ...prev, [field]: value }));
    const items = value.split('\n').filter((item) => item.trim() !== '');
    onChange({ ...data, [field]: items });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') e.stopPropagation();
  };

  return (
    <div className="space-y-6">
      <p className="font-mono text-xs text-blue-700 border-l-2 border-blue-700 pl-3">
        {t('builder.additionalForm.instructions')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="technicalSkills"
            className="font-mono text-xs uppercase tracking-wider text-gray-500"
          >
            {t('resume.additional.technicalSkills')}
          </Label>
          <Textarea
            id="technicalSkills"
            value={text.technicalSkills}
            onChange={(e) => handleChange('technicalSkills', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('builder.additionalForm.placeholders.technicalSkills')}
            className="min-h-[120px] text-black rounded-none border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-700"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="languages"
            className="font-mono text-xs uppercase tracking-wider text-gray-500"
          >
            {t('resume.sections.languages')}
          </Label>
          <Textarea
            id="languages"
            value={text.languages}
            onChange={(e) => handleChange('languages', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('builder.additionalForm.placeholders.languages')}
            className="min-h-[120px] text-black rounded-none border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-700"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="certifications"
            className="font-mono text-xs uppercase tracking-wider text-gray-500"
          >
            {t('resume.sections.certifications')}
          </Label>
          <Textarea
            id="certifications"
            value={text.certificationsTraining}
            onChange={(e) => handleChange('certificationsTraining', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('builder.additionalForm.placeholders.certifications')}
            className="min-h-[120px] text-black rounded-none border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-700"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="awards"
            className="font-mono text-xs uppercase tracking-wider text-gray-500"
          >
            {t('resume.sections.awards')}
          </Label>
          <Textarea
            id="awards"
            value={text.awards}
            onChange={(e) => handleChange('awards', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('builder.additionalForm.placeholders.awards')}
            className="min-h-[120px] text-black rounded-none border-black bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-700"
          />
        </div>
      </div>
    </div>
  );
};
