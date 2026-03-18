'use client';

import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { PersonalInfo } from '@/components/dashboard/resume-component';
import { useTranslations } from '@/lib/i18n';

interface PhotoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

export const PhotoForm: React.FC<PhotoFormProps> = ({ data, onChange }) => {
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...data, photo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange({ ...data, photo: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.stopPropagation();
  };

  return (
    <div className="space-y-2">
      <Label className="font-mono text-xs uppercase tracking-wider text-gray-500">
        {t('resume.personalInfo.photo')}
      </Label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className="w-20 h-20 border border-black flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label={t('builder.photoForm.upload')}
        >
          {data.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photo} alt="Photo" className="w-full h-full object-cover" />
          ) : (
            <span className="font-mono text-[10px] text-gray-400 text-center px-1 leading-tight">
              {t('builder.photoForm.clickToUpload')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-xs uppercase tracking-wider border border-black px-3 py-1.5 bg-white hover:bg-black hover:text-white transition-colors"
          >
            {data.photo ? t('builder.photoForm.change') : t('builder.photoForm.upload')}
          </button>
          {data.photo && (
            <button
              type="button"
              onClick={handleRemove}
              className="font-mono text-xs uppercase tracking-wider border border-black px-3 py-1.5 bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
            >
              {t('builder.photoForm.remove')}
            </button>
          )}
          <span className="font-mono text-[10px] text-gray-400">{t('builder.photoForm.hint')}</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        onKeyDown={handleKeyDown}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};
