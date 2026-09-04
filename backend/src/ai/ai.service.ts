import { BadGatewayException, Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common'
import OpenAI from 'openai'
import { CreateAiResponseDto, type AiResponseFormat } from './dto'

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const DEFAULT_MODEL = 'qwen3.8-flash'
const DEFAULT_TIMEOUT_MS = 60_000

const normalizeBaseUrl = (value?: string) => {
  const baseURL = (value?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  // Keep deployments using the old template working after a restart.
  return baseURL.replace(/\/api\/v2\/apps\/protocols\/compatible-mode\/v1$/, '/compatible-mode/v1')
}

type DashScopeChatCompletionParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
  enable_thinking?: boolean
  thinking_budget?: number
}

export interface AiResponseResult {
  id: string
  model: string
  text: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly client?: OpenAI
  private readonly model: string
  private readonly enableThinking: boolean

  constructor() {
    const apiKey = process.env.DASHSCOPE_API_KEY?.trim()
    this.model = process.env.DASHSCOPE_MODEL?.trim() || DEFAULT_MODEL
    this.enableThinking = process.env.DASHSCOPE_ENABLE_THINKING !== 'false'

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: normalizeBaseUrl(process.env.DASHSCOPE_BASE_URL),
        timeout: this.parseTimeout(process.env.AI_TIMEOUT_MS),
        maxRetries: 1
      })
    }
  }

  async createResponse(input: CreateAiResponseDto, userId: string): Promise<AiResponseResult> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI 服务尚未配置，请检查 DASHSCOPE_API_KEY')
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...(input.instructions?.trim() ? [{ role: 'system' as const, content: input.instructions.trim() }] : []),
      { role: 'user', content: input.input.trim() }
    ]
    const model = input.model?.trim() || this.model
    const enableThinking = input.enableThinking ?? this.enableThinking
    const requestBody = {
      model,
      messages,
      ...(input.responseFormat ? { response_format: input.responseFormat as AiResponseFormat } : {}),
      // DashScope recommends leaving max_tokens unset when response_format is enabled.
      ...(!input.responseFormat && input.maxOutputTokens !== undefined ? { max_tokens: input.maxOutputTokens } : {}),
      ...(input.topP === undefined ? {} : { top_p: input.topP }),
      ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
      ...(input.stop === undefined ? {} : { stop: input.stop }),
      ...(input.thinkingBudget === undefined || !enableThinking ? {} : { thinking_budget: input.thinkingBudget }),
      enable_thinking: enableThinking
    }

    let response: OpenAI.Chat.Completions.ChatCompletion
    try {
      // DashScope exposes enable_thinking as a compatible-mode extension.
      response = await this.client.chat.completions.create(requestBody as DashScopeChatCompletionParams)
    } catch (error) {
      this.logger.error(`AI provider request failed for user ${userId}`, this.providerError(error))
      throw new InternalServerErrorException('AI 服务调用失败，请稍后重试')
    }

    const text = this.responseText(response)
    if (!text) {
      this.logger.warn(`AI provider returned no text for user ${userId}`)
      throw new BadGatewayException('AI 未返回有效内容，请稍后重试')
    }

    return {
      id: response.id,
      model: response.model || model,
      text,
      ...(response.usage ? {
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        }
      } : {})
    }
  }

  private responseText(response: OpenAI.Chat.Completions.ChatCompletion) {
    return response.choices[0]?.message?.content?.trim() || ''
  }

  private parseTimeout(value?: string) {
    const timeout = Number(value)
    return Number.isInteger(timeout) && timeout >= 1000 ? timeout : DEFAULT_TIMEOUT_MS
  }

  private providerError(error: unknown) {
    if (error instanceof Error) {
      const code = 'code' in error && typeof error.code === 'string' ? ` [${error.code}]` : ''
      const cause = 'cause' in error && error.cause instanceof Error ? ` cause=${error.cause.message}` : ''
      return `${error.name}${code}: ${error.message}${cause}`.slice(0, 500)
    }
    return 'unknown provider error'
  }
}
