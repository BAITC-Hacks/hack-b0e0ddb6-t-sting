import type { Review } from '../../api/contracts';
import { number } from '../../components/format';

export function ScoreHistogram({ review }: { review: Review }) {
  const minimum = Math.min(review.baselineScore, review.histogram[0].from);
  const maximum = Math.max(
    review.optimum.score,
    review.histogram[review.histogram.length - 1].to,
  );
  const span = Math.max(1, maximum - minimum);
  const maxCount = Math.max(1, ...review.histogram.map((bin) => bin.count));
  const x = (score: number) => 20 + ((score - minimum) / span) * 660;
  const markers = [
    {
      label: 'ничего не делать',
      value: review.baselineScore,
      className: 'baseline',
    },
    { label: 'вы здесь', value: review.evaluation.score, className: 'current' },
    { label: 'оптимум', value: review.optimum.score, className: 'optimum' },
  ];
  return (
    <section className="histogram">
      <h2># пространство допустимых планов</h2>
      <svg
        viewBox="0 0 700 180"
        role="img"
        aria-label={`Распределение ${number(review.totalPlans)} планов. Ваш Score ${number(review.evaluation.score)}`}
      >
        {review.histogram.map((bin) => (
          <rect
            key={bin.from}
            x={x(bin.from)}
            y={145 - (bin.count / maxCount) * 110}
            width={Math.max(1, x(bin.to) - x(bin.from) - 1)}
            height={(bin.count / maxCount) * 110}
            fill="#3A3D41"
          >
            <title>
              {number(bin.from)}–{number(bin.to)}: {number(bin.count)} планов
            </title>
          </rect>
        ))}
        {markers.map((marker, index) => (
          <g key={marker.label} className={marker.className}>
            <line
              x1={x(marker.value)}
              x2={x(marker.value)}
              y1={10 + index * 8}
              y2="149"
            />
            <text
              x={x(marker.value)}
              y={164 + (index % 2) * 14}
              textAnchor="middle"
            >
              {number(marker.value)}
            </text>
          </g>
        ))}
      </svg>
      <div className="histogram-legend">
        {markers.map((marker) => (
          <span key={marker.label} className={marker.className}>
            {marker.label} · {number(marker.value)}
          </span>
        ))}
      </div>
    </section>
  );
}
