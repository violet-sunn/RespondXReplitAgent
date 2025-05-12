import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LanguageSelectorProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  size = 'md', 
  showLabel = true 
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      // Send request to update language setting
      await apiRequest('PATCH', '/api/settings/language', {
        defaultLanguage: newLanguage
      });
      
      // Update language in context
      setLanguage(newLanguage);
      
      // Invalidate settings cache
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: t('settings.language.updated'),
        description: t('settings.language.updateSuccess'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to update language:', error);
      toast({
        title: t('common.error'),
        description: t('settings.language.updateError'),
        variant: 'destructive',
      });
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  return (
    <div className="flex flex-col gap-2">
      {showLabel && (
        <label className="text-sm font-medium">
          {t('settings.selectLanguage')}
        </label>
      )}
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className={sizeClasses[size]}>
          <SelectValue placeholder={t('settings.selectLanguage')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t('settings.language')}</SelectLabel>
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;