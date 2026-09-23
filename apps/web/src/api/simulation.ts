import { matches, type Schema } from './schema';
import {
  analysisSchema,
  reviewSchema,
  scenarioSchema,
  submissionSchema,
  validationSchema,
} from './contracts';
import type {
  Analysis,
  Plan,
  Review,
  Scenario,
  Submission,
  Validation,
} from './contracts';

class ResponseError extends Error {}

async function request<T>(
  path: string,
  schema: Schema,
  body?: unknown,
  timeout = 8000,
): Promise<T> {
  try {
    const response = await fetch(`/api/${path}`, {
      signal: AbortSignal.timeout(timeout),
      ...(body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
    if (!response.ok)
      throw new ResponseError(
        response.status === 422
          ? 'План не прошёл проверку. Вернитесь в конструктор и проверьте правила.'
          : 'Сервис временно недоступен. Попробуйте ещё раз.',
      );
    const value: unknown = await response.json();
    if (!matches(value, schema))
      throw new ResponseError(
        'Сервис вернул некорректный ответ. Попробуйте ещё раз.',
      );
    return value as T;
  } catch (error) {
    if (error instanceof ResponseError) throw error;
    throw new Error(
      'Не удалось получить ответ сервера. Проверьте соединение и повторите попытку.',
      { cause: error },
    );
  }
}
export const getScenario = () => request<Scenario>('scenario', scenarioSchema);
export const validatePlan = (plan: Plan) =>
  request<Validation>('plans/validate', validationSchema, { plan });
export const reviewPlan = (plan: Plan) =>
  request<Review>('plans/review', reviewSchema, { plan });
export const analyzePlan = (plan: Plan) =>
  request<Analysis>('plans/analysis', analysisSchema, { plan }, 30000);
export const getSubmissions = () =>
  request<Submission[]>('submissions', { array: submissionSchema });
export const submitPlan = (teamName: string, plan: Plan) =>
  request<Submission>('submissions', submissionSchema, { teamName, plan });
