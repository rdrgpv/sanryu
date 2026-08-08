export default function Card({ title, value, hint, icon }) {
  return (
    <div className={`card ${icon ? 'card--icon' : ''}`}>
      {icon && <span className="card__icon">{icon}</span>}
      <div>
        <p className="card__title">{title}</p>
        <p className="card__value">{value}</p>
        {hint && <p className="card__hint">{hint}</p>}
      </div>
    </div>
  );
}
