import { richKey } from '@/lib/rich';
import type { Iniciativa } from '@/lib/site-content';

type Props = { copy: Record<string, string>; iniciativas: Iniciativa[] };

export default function Iniciativas({ copy, iniciativas }: Props) {
  return (
    <section className="section" id="iniciativas">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">{copy['iniciativas.eyebrow']}</span>
          <h2 className="display-md">{richKey(copy, 'iniciativas.title')}</h2>
          <p className="sub">{richKey(copy, 'iniciativas.sub')}</p>
        </div>
        <div className="inits">
          {iniciativas.map((it) => (
            <div className={`plot k${it.slot} reveal`} key={it.id}>
              <span className="k">{it.k}</span>
              <div>
                <h3>{it.title}</h3>
                <p>{it.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
