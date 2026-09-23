import type { AnalystReport } from './contracts';

export type ReportText = Omit<AnalystReport, 'source' | 'trace'>;
const fields = [
  'summary',
  'strengths',
  'risks',
  'consequences',
  'recommendations',
];

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000)
    throw new Error('Invalid report text');
  return value.trim();
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12)
    throw new Error('Invalid report list');
  return value.map(text);
}

/** Reject extra keys and incomplete JSON; provenance and trace are server-owned. */
export function parseReport(raw: string): ReportText {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid report');
  const report = value as Record<string, unknown>;
  if (
    Object.keys(report).length !== fields.length ||
    Object.keys(report).some((key) => !fields.includes(key))
  )
    throw new Error('Invalid report fields');
  return {
    summary: text(report.summary),
    strengths: textList(report.strengths),
    risks: textList(report.risks),
    consequences: textList(report.consequences),
    recommendations: textList(report.recommendations),
  };
}
