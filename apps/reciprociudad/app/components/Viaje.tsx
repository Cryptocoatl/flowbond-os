import { richKey } from '@/lib/rich';

type Props = { copy: Record<string, string> };

const STEPS = [1, 2, 3, 4, 5, 6];

export default function Viaje({ copy }: Props) {
  return (
    <section className="section" id="viaje">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">{copy['viaje.eyebrow']}</span>
          <h2 className="display-md">{richKey(copy, 'viaje.title')}</h2>
          <p className="sub">{richKey(copy, 'viaje.sub')}</p>
        </div>
        <div className="pasos">
          {STEPS.map((i) => (
            <div className={`paso p${i} reveal`} key={i}>
              <span className="num">{String(i).padStart(2, '0')}</span>
              <h3>{copy[`viaje.p${i}.title`]}</h3>
              <p>{richKey(copy, `viaje.p${i}.body`)}</p>
              <span className="tag">{copy[`viaje.p${i}.tag`]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
