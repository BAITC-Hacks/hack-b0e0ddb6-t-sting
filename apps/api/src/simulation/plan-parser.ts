import { BadRequestException } from '@nestjs/common';
import type { DistrictId, MeasureId, Plan } from './engine/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Shape errors are HTTP 400; unknown IDs remain domain violations (HTTP 422 on review). */
export function parsePlan(body: unknown): Plan {
  if (!isRecord(body) || !Array.isArray(body.plan))
    throw new BadRequestException('Передайте объект с массивом plan.');
  return body.plan.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.measureId !== 'string' ||
      item.measureId.length === 0
    )
      throw new BadRequestException(
        'Каждая мера должна содержать строковый measureId.',
      );
    if (
      item.districtId !== undefined &&
      (typeof item.districtId !== 'string' || item.districtId.length === 0)
    )
      throw new BadRequestException('districtId должен быть непустой строкой.');
    const measureId = item.measureId as MeasureId;
    return item.districtId === undefined
      ? { measureId }
      : { measureId, districtId: item.districtId as DistrictId };
  });
}
