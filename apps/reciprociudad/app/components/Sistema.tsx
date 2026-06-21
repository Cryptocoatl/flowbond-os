export default function Sistema() {
  return (
    <section className="section" id="sistema">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">El sistema</span>
          <h2 className="display-md">
            Tres fuerzas que esta ciudad <em className="agua">ya conocía</em>.
          </h2>
          <p className="sub">
            Reciprociudad no inventa nada nuevo. Reactiva lo que el lago hacía: intercambiar,
            regenerar y sostener en comunidad.
          </p>
        </div>
        <div className="sistema">
          <div className="force f1 reveal">
            <span className="nahuatl">Tianguis · el mercado</span>
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3l4 4-4 4" />
                <path d="M21 7H7a4 4 0 0 0-4 4" />
                <path d="M7 21l-4-4 4-4" />
                <path d="M3 17h14a4 4 0 0 0 4-4" />
              </svg>
            </div>
            <h3>Reciprocidad</h3>
            <p>
              Trueque, intercambio y apoyo mutuo. Lo que sobra de un lado le falta a otro: la red
              cierra el círculo.
            </p>
          </div>
          <div className="force f2 reveal">
            <span className="nahuatl">Chinampa · la tierra fértil</span>
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8 6 8 11 12 13c4-2 4-7 0-11z" />
                <path d="M12 13v9" />
                <path d="M12 18c-3 0-6-1-7-4 3-1 6 0 7 4z" />
                <path d="M12 18c3 0 6-1 7-4-3-1-6 0-7 4z" />
              </svg>
            </div>
            <h3>Economía regenerativa</h3>
            <p>
              Circular por diseño. Recursos, tiempo y dinero que regresan al ciclo y vuelven más
              fértiles.
            </p>
          </div>
          <div className="force f3 reveal">
            <span className="nahuatl">Calpulli · la comunidad</span>
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
            <h3>Cultura viva</h3>
            <p>
              La comunidad que sostiene y celebra el territorio: eventos, talleres y proyectos en la
              calle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
