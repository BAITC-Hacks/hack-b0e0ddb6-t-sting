import type { Plan, Scenario } from '../../api/contracts';
import { DistrictHeatmap } from '../../components/DistrictHeatmap';
import { Catalog } from './Catalog';
import { PlanPanel } from './PlanPanel';
import './builder.css';
export function Builder({
  scenario,
  plan,
  onChange,
  onReview,
}: {
  scenario: Scenario;
  plan: Plan;
  onChange: (plan: Plan) => void;
  onReview: () => void;
}) {
  return (
    <div className="workspace-grid">
      <DistrictHeatmap scenario={scenario} plan={plan} />
      <aside className="builder-sidebar">
        <PlanPanel
          scenario={scenario}
          plan={plan}
          onChange={onChange}
          onReview={onReview}
        />
        <Catalog
          scenario={scenario}
          plan={plan}
          onAdd={(item) => onChange([...plan, item])}
        />
      </aside>
    </div>
  );
}
