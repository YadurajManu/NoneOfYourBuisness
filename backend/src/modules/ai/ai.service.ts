import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type {
  ChatMessage,
  ChatResponse,
  LlmApiResponse,
} from '../../types/jwt.types';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly endpoint: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.endpoint =
      this.configService.get<string>('LLM_ENDPOINT') ||
      'http://localhost:1234/v1';
    this.model = this.configService.get<string>('LLM_MODEL') || 'local-model';
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      this.logger.log(`Sending request to LLM: ${this.endpoint}`);
      const response = await axios.post<LlmApiResponse>(
        `${this.endpoint}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.7,
        },
      );

      return response.data.choices[0].message;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`LLM Request failed: ${message}`);
      throw new Error(`AI Service Unavailable: ${message}`);
    }
  }

  async generateClinicalSummary(
    patientData: Record<string, unknown>,
  ): Promise<ChatResponse> {
    const prompt = `You are a clinical assistant. Summarize the following patient record in plain terms for a family member: ${JSON.stringify(patientData)}`;
    return this.chat([{ role: 'user', content: prompt }]);
  }
}
