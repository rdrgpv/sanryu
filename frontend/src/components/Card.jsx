export default function Card({ title, value, hint }) {
  return (
    <div className="card">
      <p className="card__title">{title}</p>
      <p className="card__value">{value}</p>
      {hint && <p className="card__hint">{hint}</p>}
    </div>
  );
}
