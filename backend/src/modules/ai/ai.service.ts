import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { IncomingMessage } from 'http';
import type {
  ChatMessage,
  ChatResponse,
  LlmApiResponse,
} from '../../types/jwt.types';

export type AssistantRole =
  | 'ADMIN'
  | 'CARE_COORDINATOR'
  | 'DOCTOR'
  | 'SPECIALIST'
  | 'PATIENT'
  | 'FAMILY_MEMBER';

const BASE_GUARDRAILS = [
  'You are the MediLifecycle AI Assistant, embedded inside a patient lifecycle management platform.',
  'Ground every answer ONLY in the patient context provided below and the conversation. Never invent labs, medications, diagnoses, dates, or events that are not present in the context.',
  'If the information needed to answer is not in the context, say clearly that it is not available in the record and suggest who to ask.',
  'You do not replace professional clinical judgment. Never give a definitive diagnosis or emergency medical instructions. For anything urgent or life-threatening, tell the user to contact the care team immediately or call local emergency services.',
  'Be concise and well-structured. Use short paragraphs or bullet points. Do not fabricate citations.',
].join(' ');

const ROLE_INSTRUCTIONS: Record<AssistantRole, string> = {
  DOCTOR:
    'The user is the PRIMARY DOCTOR. Communicate with clinical precision and appropriate medical terminology. Surface trends, risks, medication interactions, overdue orders, and abnormal findings from the context. Be direct and efficient — this is a clinician who wants signal, not filler.',
  SPECIALIST:
    'The user is a SPECIALIST. Provide focused, domain-relevant clinical depth. Highlight the findings, orders, and history most relevant to specialist review, and note gaps that need the primary team.',
  CARE_COORDINATOR:
    'The user is a CARE COORDINATOR. Focus on coordination and logistics: open tasks, orders due, pending prior-auth/referrals, lifecycle stage progression, and what needs to happen next to keep the patient moving through their journey.',
  ADMIN:
    'The user is an ADMINISTRATOR. Focus on operational status, workflow bottlenecks, task/alert load, and coordination gaps. Avoid deep clinical interpretation unless it is operationally relevant.',
  PATIENT:
    'The user is the PATIENT themselves. Use warm, plain, everyday language — no jargon (or explain any term you must use). Help them understand their own care journey, medications, and upcoming steps. Be encouraging and reassuring, and always remind them they can ask their care team for anything you cannot answer.',
  FAMILY_MEMBER:
    'The user is a FAMILY MEMBER of the patient who has been granted consent-based access. Be warm, gentle, and reassuring, and use plain non-clinical language. When they ask emotional questions like "is my mom okay?", answer kindly using what the record shows — acknowledge feelings, share what is going well and what the team is watching, without alarming them or overstepping. Never speculate beyond the record; defer specific medical decisions to the care team.',
};

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly endpoint: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor(private configService: ConfigService) {
    this.endpoint =
      this.configService.get<string>('LLM_ENDPOINT') ||
      'http://localhost:1234/v1';
    this.model = this.configService.get<string>('LLM_MODEL') || 'local-model';
    const t = Number(this.configService.get<string>('LLM_TEMPERATURE'));
    this.temperature = Number.isFinite(t) ? t : 0.5;
  }

  buildSystemPrompt(
    role: AssistantRole,
    patientContext: string | null,
    patientName?: string | null,
  ): string {
    const parts = [BASE_GUARDRAILS, ROLE_INSTRUCTIONS[role]];
    if (patientContext && patientContext.trim()) {
      parts.push(
        `\n=== PATIENT CONTEXT${
          patientName ? ` — ${patientName}` : ''
        } (live from the record) ===\n${patientContext}\n=== END PATIENT CONTEXT ===`,
      );
    } else {
      parts.push(
        'No specific patient is currently in context. Answer general platform and care-navigation questions, and ask the user to open a patient if they need record-specific help.',
      );
    }
    return parts.join('\n\n');
  }

  /** Non-streaming completion. Used by document intelligence and as a fallback. */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      const response = await axios.post<LlmApiResponse>(
        `${this.endpoint}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: this.temperature,
        },
      );
      return response.data.choices[0].message;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`LLM Request failed: ${message}`);
      throw new Error(`AI Service Unavailable: ${message}`);
    }
  }

  /**
   * Streaming completion. Invokes onToken for each content delta and resolves
   * with the full assembled text. Throws if the LLM endpoint is unreachable.
   */
  async streamChat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
  ): Promise<string> {
    let response;
    try {
      response = await axios.post<IncomingMessage>(
        `${this.endpoint}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: this.temperature,
          stream: true,
        },
        { responseType: 'stream' },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`LLM stream request failed: ${message}`);
      throw new Error(`AI Service Unavailable: ${message}`);
    }

    const stream = response.data;
    let buffer = '';
    let full = '';

    return new Promise<string>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf('\n');

          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              full += token;
              onToken(token);
            }
          } catch {
            // Ignore keep-alive / non-JSON lines.
          }
        }
      });

      stream.on('end', () => resolve(full));
      stream.on('error', (err: Error) => {
        this.logger.error(`LLM stream error: ${err.message}`);
        reject(new Error(`AI Service stream error: ${err.message}`));
      });
    });
  }

  async generateClinicalSummary(
    patientData: Record<string, unknown>,
  ): Promise<ChatResponse> {
    const prompt = `You are a clinical assistant. Summarize the following patient record in plain terms for a family member: ${JSON.stringify(
      patientData,
    )}`;
    return this.chat([{ role: 'user', content: prompt }]);
  }
}
