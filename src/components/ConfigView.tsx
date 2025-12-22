'use client';

import { useAppStore } from '@/store';
import { Settings, Zap, Clock, Globe, Sparkles, AlertTriangle, Plus, X, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { AI_MODELS, AIModel } from '@/types';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`toggle ${enabled ? 'active' : ''}`}
        role="switch"
        aria-checked={enabled}
      />
    </div>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  suffix?: string;
}

function NumberInput({ value, onChange, label, description, min = 1, max = 24, suffix }: NumberInputProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? min}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          min={min}
          max={max}
          className="input input-mono w-20 text-center text-sm"
        />
        {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label: string;
  description?: string;
}

function TagInput({ tags, onChange, label, description }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    if (inputValue.trim() && !tags.includes(inputValue.trim())) {
      onChange([...tags, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="py-3">
      <div className="mb-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <motion.span
            key={tag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-mono"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-[var(--red)] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Agregar keyword..."
          className="input input-mono text-sm flex-1"
        />
        <button onClick={addTag} className="btn btn-ghost">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ConfigView() {
  const { config, updateConfig, isScrapingActive, setScrapingActive } = useAppStore();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="pl-14 md:pl-6 pr-4 md:pr-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <h1 className="text-base md:text-xl font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent)] flex-shrink-0" />
          <span>Configuración</span>
        </h1>
        <p className="text-[11px] md:text-sm text-[var(--text-muted)] mt-1">
          Ajustes del sistema
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
          {/* System Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="font-semibold">Estado del Sistema</h2>
                <p className="text-xs text-[var(--text-muted)]">Control principal del scraping</p>
              </div>
            </div>
            <Toggle
              enabled={isScrapingActive}
              onChange={setScrapingActive}
              label="Sistema activo"
              description="Activa o pausa todo el scraping y publicación automática"
            />
          </motion.div>

          {/* Scraping Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--yellow-dim)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--yellow)]" />
              </div>
              <div>
                <h2 className="font-semibold">Scraping</h2>
                <p className="text-xs text-[var(--text-muted)]">Configuración de captura de tweets</p>
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              <NumberInput
                value={config.tweetsPerScrape}
                onChange={(v) => updateConfig({ tweetsPerScrape: v })}
                label="Tweets por scraping"
                description="Cantidad de tweets a obtener en cada scraping"
                min={10}
                max={200}
                suffix="tweets"
              />
              <NumberInput
                value={config.maxTweetAgeDays}
                onChange={(v) => updateConfig({ maxTweetAgeDays: v })}
                label="Antigüedad máxima"
                description="Solo procesar tweets de los últimos X días"
                min={1}
                max={7}
                suffix="días"
              />
              <NumberInput
                value={config.autoDeleteAfterDays}
                onChange={(v) => updateConfig({ autoDeleteAfterDays: v })}
                label="Auto-eliminar después de"
                description="Eliminar tweets rechazados/publicados después de X días"
                min={1}
                max={30}
                suffix="días"
              />
              <Toggle
                enabled={config.checkSimilarContent}
                onChange={(v) => updateConfig({ checkSimilarContent: v })}
                label="Detectar contenido similar"
                description="Evita publicar el mismo tema dos veces"
              />
              <NumberInput
                value={config.scrapeIntervalHours}
                onChange={(v) => updateConfig({ scrapeIntervalHours: v })}
                label="Intervalo de scraping"
                description="Cada cuántas horas buscar nuevos tweets (mínimo 1h para evitar ban)"
                min={1}
                max={24}
                suffix="horas"
              />
              <NumberInput
                value={config.publishIntervalMinutes}
                onChange={(v) => updateConfig({ publishIntervalMinutes: v })}
                label="Intervalo entre tweets"
                description="Minutos de espera entre cada publicación"
                min={1}
                max={120}
                suffix="min"
              />
              <NumberInput
                value={config.minRelevanceScore}
                onChange={(v) => updateConfig({ minRelevanceScore: v })}
                label="Score mínimo de relevancia"
                description="Solo mostrar tweets con este score o mayor"
                min={1}
                max={10}
              />
            </div>
          </motion.div>

          {/* AI Model Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--purple-dim)] flex items-center justify-center">
                <Bot className="w-5 h-5 text-[var(--purple)]" />
              </div>
              <div>
                <h2 className="font-semibold">Modelo de IA</h2>
                <p className="text-xs text-[var(--text-muted)]">Modelo para análisis de tweets</p>
              </div>
            </div>
            <div className="py-3">
              <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                Seleccionar modelo
              </label>
              <select
                value={config.aiModel || 'llama-3.3-70b-versatile'}
                onChange={(e) => updateConfig({ aiModel: e.target.value as AIModel })}
                className="input"
              >
                <optgroup label="Groq (Gratuito)">
                  {AI_MODELS.filter(m => m.provider === 'groq').map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Gemini (Google)">
                  {AI_MODELS.filter(m => m.provider === 'gemini').map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="OpenRouter (Gratuito)">
                  {AI_MODELS.filter(m => m.provider === 'openrouter').map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </motion.div>

          {/* Language Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--cyan-dim)] flex items-center justify-center">
                <Globe className="w-5 h-5 text-[var(--cyan)]" />
              </div>
              <div>
                <h2 className="font-semibold">Idioma</h2>
                <p className="text-xs text-[var(--text-muted)]">Configuración de traducción</p>
              </div>
            </div>
            <div className="py-3">
              <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                Idioma de destino
              </label>
              <select
                value={config.targetLanguage}
                onChange={(e) => updateConfig({ targetLanguage: e.target.value })}
                className="input"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </motion.div>

          {/* Automation Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--green-dim)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--green)]" />
              </div>
              <div>
                <h2 className="font-semibold">Automatización</h2>
                <p className="text-xs text-[var(--text-muted)]">Publicación automática</p>
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              <Toggle
                enabled={config.autoPublishEnabled}
                onChange={(v) => updateConfig({ autoPublishEnabled: v })}
                label="Auto-publicar tweets"
                description="Publicar automáticamente tweets con score alto"
              />
              {config.autoPublishEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <NumberInput
                    value={config.autoPublishMinScore}
                    onChange={(v) => updateConfig({ autoPublishMinScore: v })}
                    label="Score mínimo para auto-publicar"
                    description="Solo auto-publicar tweets con este score o mayor"
                    min={7}
                    max={10}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* AI Prompt Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="font-semibold">Prompt de AI</h2>
                <p className="text-xs text-[var(--text-muted)]">Personaliza cómo el AI procesa los tweets</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                  System Prompt
                </label>
                <textarea
                  value={config.aiSystemPrompt}
                  onChange={(e) => updateConfig({ aiSystemPrompt: e.target.value })}
                  className="textarea"
                  rows={10}
                />
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Variables disponibles: {'{tweet_content}'}, {'{idioma_config}'}
                </p>
              </div>
              <TagInput
                tags={config.rejectedPatterns}
                onChange={(tags) => updateConfig({ rejectedPatterns: tags })}
                label="Patrones a rechazar"
                description="Tweets que contengan estas frases serán rechazados automáticamente"
              />
            </div>
          </motion.div>

          {/* Warning Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card p-4 border-[var(--yellow)] border-opacity-30 bg-[var(--yellow-dim)]/20"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--yellow)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-[var(--yellow)] text-sm">Nota importante</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Los cambios en la configuración se aplican inmediatamente.
                  Usa una cuenta secundaria de Twitter para evitar restricciones.
                  El scraping excesivo puede resultar en limitaciones temporales.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
