import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIService } from '../ai/ai.service';

type StructuredExtractionResult = {
  data: Record<string, unknown>;
  engine: 'llm' | 'heuristic';
};

@Injectable()
export class DocumentIntelligenceService {
  private readonly logger = new Logger(DocumentIntelligenceService.name);
  private readonly maxTextChars: number;

  constructor(
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {
    const rawLimit = Number(
      this.configService.get<string>('DOCUMENT_EXTRACTION_MAX_TEXT_CHARS') ||
        16_000,
    );
    this.maxTextChars =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 16_000;
  }

  async extractStructuredClinicalData(
    text: string,
  ): Promise<StructuredExtractionResult> {
    const normalized = this.normalizeText(text).slice(0, this.maxTextChars);
    const heuristic = this.extractHeuristic(normalized);

    if (!normalized) {
      return {
        data: heuristic,
        engine: 'heuristic',
      };
    }

    try {
      const ai = await this.aiService.chat([
        {
          role: 'system',
          content:
            'You are a strict clinical report extractor. Return only valid JSON with keys: reportType, patientName, reportDate, provider, facility, diagnoses, medications, vitals, labResults, procedures, recommendations, followUpPlan, criticalFlags, summary. Use arrays for diagnoses/medications/vitals/labResults/procedures/recommendations/criticalFlags.',
        },
        {
          role: 'user',
          content: normalized,
        },
      ]);

      const parsed = this.extractJsonObject(ai.content);
      if (parsed) {
        return {
          data: this.normalizeStructuredExtraction({
            ...heuristic,
            ...parsed,
          }),
          engine: 'llm',
        };
      }
    } catch (error) {
      this.logger.warn(
        `LLM structured extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      data: heuristic,
      engine: 'heuristic',
    };
  }

  private normalizeText(input: string): string {
    return String(input || '')
      .split('\0')
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private extractHeuristic(text: string): Record<string, unknown> {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const diagnoses = this.extractKeywordLineValues(lines, [
      'diagnosis',
      'assessment',
      'impression',
      'finding',
    ]);
    const medications = this.extractKeywordLineValues(lines, [
      'medication',
      'medicine',
      'drug',
      'prescribed',
      'rx',
    ]);
    const procedures = this.extractKeywordLineValues(lines, [
      'procedure',
      'intervention',
      'operation',
      'surgery',
    ]);
    const recommendations = this.extractKeywordLineValues(lines, [
      'recommendation',
      'advice',
      'plan',
      'follow up',
    ]);

    const criticalFlags = this.findAlertFlags(text);
    const vitals = this.extractVitals(text);
    const labResults = this.extractLabValues(lines);

    return this.normalizeStructuredExtraction({
      reportType: this.guessReportType(text),
      diagnoses,
      medications,
      vitals,
      labResults,
      procedures,
      recommendations,
      followUpPlan: recommendations[0] || null,
      criticalFlags,
      summary: this.buildSummary(lines),
    });
  }

  private extractKeywordLineValues(lines: string[], keywords: string[]) {
    const matches = lines
      .filter((line) =>
        keywords.some((keyword) => line.toLowerCase().includes(keyword)),
      )
      .flatMap((line) =>
        line
          .replace(/^[-*]\s*/, '')
          .split(/[:;|-]/)
          .map((token) => token.trim()),
      )
      .filter((value) => value.length >= 3)
      .slice(0, 12);

    return Array.from(new Set(matches));
  }

  private findAlertFlags(text: string) {
    const flags: string[] = [];
    const lowered = text.toLowerCase();

    if (/\bcritical\b/.test(lowered)) flags.push('Critical mention');
    if (/\burgent\b/.test(lowered)) flags.push('Urgent mention');
    if (/\babnormal\b/.test(lowered)) flags.push('Abnormal finding');
    if (/\bhigh risk\b/.test(lowered)) flags.push('High risk');
    if (/\bemergency\b/.test(lowered)) flags.push('Emergency note');

    return flags;
  }

  private extractVitals(text: string) {
    const vitals: Array<Record<string, unknown>> = [];
    const addVital = (
      label: string,
      regex: RegExp,
      unit?: string,
      formatter?: (value: string) => string,
    ) => {
      const match = regex.exec(text);
      if (!match?.[1]) return;
      vitals.push({
        name: label,
        value: formatter ? formatter(match[1]) : match[1],
        unit: unit || null,
      });
    };

    addVital(
      'Blood Pressure',
      /\b(?:bp|blood pressure)\s*[:-]?\s*(\d{2,3}\/\d{2,3})/i,
    );
    addVital(
      'Heart Rate',
      /\b(?:hr|heart rate|pulse)\s*[:-]?\s*(\d{2,3})\b/i,
      'bpm',
    );
    addVital(
      'Temperature',
      /\b(?:temp|temperature)\s*[:-]?\s*(\d{2,3}(?:\.\d)?)\b/i,
      'F/C',
    );
    addVital(
      'Respiratory Rate',
      /\b(?:rr|resp(?:iratory)? rate)\s*[:-]?\s*(\d{1,2})\b/i,
      'breaths/min',
    );
    addVital(
      'SpO2',
      /\b(?:spo2|oxygen saturation)\s*[:-]?\s*(\d{2,3})\s*%?/i,
      '%',
    );

    return vitals.slice(0, 12);
  }

  private extractLabValues(lines: string[]) {
    const results = lines
      .filter((line) => /[:=]/.test(line) && /\d/.test(line))
      .slice(0, 24)
      .map((line) => {
        const [left, right] = line.split(/[:=]/, 2);
        return {
          name: (left || '').trim().slice(0, 80),
          value: (right || '').trim().slice(0, 80),
        };
      })
      .filter((item) => item.name.length >= 2 && item.value.length >= 1);

    return results;
  }

  private guessReportType(text: string) {
    const lowered = text.toLowerCase();
    if (lowered.includes('discharge')) return 'DISCHARGE_SUMMARY';
    if (lowered.includes('prescription')) return 'PRESCRIPTION';
    if (lowered.includes('lab')) return 'LAB_REPORT';
    if (
      lowered.includes('radiology') ||
      lowered.includes('x-ray') ||
      lowered.includes('ct')
    ) {
      return 'IMAGING_REPORT';
    }
    return 'CLINICAL_REPORT';
  }

  private buildSummary(lines: string[]) {
    if (lines.length === 0) return '';
    return lines.slice(0, 3).join(' ').slice(0, 320);
  }

  private normalizeStructuredExtraction(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    const asString = (input: unknown) =>
      typeof input === 'string' ? input.trim() : '';
    const asArray = (input: unknown) =>
      Array.isArray(input)
        ? input
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => item.length > 0)
            .slice(0, 25)
        : [];

    const safeObjectArray = (input: unknown) =>
      Array.isArray(input)
        ? input
            .filter((row) => row && typeof row === 'object')
            .slice(0, 25)
            .map((row) => row as Record<string, unknown>)
        : [];

    return {
      reportType: asString(value.reportType) || 'CLINICAL_REPORT',
      patientName: asString(value.patientName) || null,
      reportDate: asString(value.reportDate) || null,
      provider: asString(value.provider) || null,
      facility: asString(value.facility) || null,
      diagnoses: asArray(value.diagnoses),
      medications: asArray(value.medications),
      vitals: safeObjectArray(value.vitals),
      labResults: safeObjectArray(value.labResults),
      procedures: asArray(value.procedures),
      recommendations: asArray(value.recommendations),
      followUpPlan: asString(value.followUpPlan) || null,
      criticalFlags: asArray(value.criticalFlags),
      summary: asString(value.summary),
    };
  }

  private extractJsonObject(raw: string): Record<string, unknown> | null {
    const content = String(raw || '').trim();
    if (!content) return null;

    const attempts = [content];
    const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) attempts.push(fencedMatch[1].trim());

    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) attempts.push(objectMatch[0].trim());

    for (const candidate of attempts) {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Continue trying with the next candidate.
      }
    }

    return null;
  }
}
