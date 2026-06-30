const STATIONS = [
  {
    n: '01',
    title: 'Únete',
    body: 'Crea tu cuenta y entra a la red en menos de un minuto. Una sola identidad para todo lo que sigue.',
    tag: 'Identidad · FBID',
  },
  {
    n: '02',
    title: 'Tu chinampa',
    body: 'Tu perfil vivo: di qué siembras y qué buscas. La red lee tus señales y te conecta con quien encaja.',
    tag: 'Oferta · Demanda',
  },
  {
    n: '03',
    title: 'Iniciativas',
    body: 'Descubre y suma proyectos que regeneran tu colonia: huertos, compostaje, bancos de tiempo y más.',
    tag: 'Explorar · Sumarte',
  },
  {
    n: '04',
    title: 'Eventos',
    body: 'La agenda viva de la ciudad: encuentros, talleres y ferias de intercambio en tu zona.',
    tag: 'Agenda · Asistir',
  },
  {
    n: '05',
    title: 'Servicios',
    body: 'Ofrece y encuentra servicios dentro de la comunidad. Confianza de barrio, no de extraños.',
    tag: 'Ofrecer · Contratar',
  },
  {
    n: '06',
    title: 'Proyectos y donaciones',
    body: 'Aporta tiempo, recursos o dinero a las causas que sostienen la ciudad. Cada aporte queda visible y trazable.',
    tag: 'Aportar · Donar',
  },
];

export default function Viaje() {
  return (
    <section className="section" id="viaje">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Tu viaje</span>
          <h2 className="display-md">
            Un camino <em className="coral">por los canales</em>.
          </h2>
          <p className="sub">
            Empieza por entrar. De ahí la red se abre, canal por canal: tu lugar, las iniciativas,
            los eventos, los servicios y las causas que mueven tu barrio.
          </p>
        </div>
        <div className="journey">
          {STATIONS.map((s) => (
            <div className="station reveal" key={s.n}>
              <div className="marker">
                <span>{s.n}</span>
              </div>
              <div className="body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <span className="tag">{s.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
