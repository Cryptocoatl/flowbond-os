import { richKey } from '@/lib/rich';

type Props = { copy: Record<string, string> };

export default function Sistema({ copy }: Props) {
  return (
    <section className="section" id="sistema">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">{copy['sistema.eyebrow']}</span>
          <h2 className="display-md">{richKey(copy, 'sistema.title')}</h2>
          <p className="sub">{richKey(copy, 'sistema.sub')}</p>
        </div>
        <div className="sistema">
          <div className="force f1 reveal">
            <span className="nahuatl">{copy['sistema.f1.nahuatl']}</span>
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3l4 4-4 4" />
                <path d="M21 7H7a4 4 0 0 0-4 4" />
                <path d="M7 21l-4-4 4-4" />
                <path d="M3 17h14a4 4 0 0 0 4-4" />
              </svg>
            </div>
            <h3>{copy['sistema.f1.title']}</h3>
            <p>{richKey(copy, 'sistema.f1.body')}</p>
          </div>
          <div className="force f2 reveal">
            <span className="nahuatl">{copy['sistema.f2.nahuatl']}</span>
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8 6 8 11 12 13c4-2 4-7 0-11z" />
                <path d="M12 13v9" />
                <path d="M12 18c-3 0-6-1-7-4 3-1 6 0 7 4z" />
                <path d="M12 18c3 0 6-1 7-4-3-1-6 0-7 4z" />
              </svg>
            </div>
            <h3>{copy['sistema.f2.title']}</h3>
            <p>{richKey(copy, 'sistema.f2.body')}</p>
          </div>
          <div className="force f3 reveal">
            <span className="nahuatl">{copy['sistema.f3.nahuatl']}</span>
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3" />
                <circle cx="5" cy="16" r="2.5" />
                <circle cx="19" cy="16" r="2.5" />
                <path d="M12 11v3" />
                <path d="M9.5 13l-2 1.5" />
                <path d="M14.5 13l2 1.5" />
              </svg>
            </div>
            <h3>{copy['sistema.f3.title']}</h3>
            <p>{richKey(copy, 'sistema.f3.body')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
