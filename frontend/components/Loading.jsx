

export default function Loading({ text = 'Loading...' }) {
  return (
    <div className="d-flex justify-content-center align-items-center gap-2 py-5">
      <div className="spinner-border spinner-border-sm text-primary" role="status" />
      <span className="text-secondary">{text}</span>
    </div>
  );
}


